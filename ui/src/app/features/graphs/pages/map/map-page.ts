import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';

import { Sparte, SPARTE_LABELS, SPARTEN } from '../../../../core/models/sparte';
import { aggregateStreetSparten, ProjectData } from '../../../../core/services/project-data';
import { projectStreet } from '../../../../core/services/project-derivations';
import { StreetGeometryStore } from '../../../../core/services/street-geometry-store';
import { STREET_COLORS } from '../../../../shared/chart-theme';
import { theme, Theme } from '../../../../core/theme/theme';
import { DataStatus } from '../../../../shared/data-status/data-status';

/** Geographic center of Braunschweig. */
const BRAUNSCHWEIG_CENTER: L.LatLngTuple = [52.2689, 10.5268];
const DEFAULT_ZOOM = 13;

/** Stroke width of a single street marking, in pixels. */
const LINE_WEIGHT = 3;

/** Gap between parallel division lines drawn on the same street, in pixels. */
const LINE_SPACING = 5;

/** Length of one colour segment in the zoomed-out striped fallback, in pixels. */
const STRIPE_DASH = 10;

/**
 * From this zoom level upward the street is wide enough on screen to lay the
 * division lines side by side. Below it the parallel lines would spill over
 * neighbouring streets, so a single interleaved (striped) line is drawn
 * instead.
 */
const PARALLEL_ZOOM_THRESHOLD = 16;

/** A located street: its merged geometry (as lines) and the divisions on it. */
interface LocatedStreet {
  name: string;
  lines: L.LatLng[][];
  sparten: Sparte[];
  /** Number of projects (items) per division on this street. */
  counts: Map<Sparte, number>;
}

/** OpenStreetMap view of Braunschweig, themed to match the app. */
@Component({
  selector: 'app-map-page',
  imports: [DataStatus],
  templateUrl: './map-page.html',
  styleUrl: './map-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage implements AfterViewInit, OnDestroy {
  private readonly data = inject(ProjectData);
  private readonly geometry = inject(StreetGeometryStore);
  private readonly router = inject(Router);

  private readonly mapContainer =
    viewChild.required<ElementRef<HTMLElement>>('mapContainer');

  /** Distinct fiscal years present in the data, ascending. */
  protected readonly years = this.data.years;

  /** Selected fiscal year, or `null` for all years (the default). */
  protected readonly selectedYear = signal<number | null>(null);

  private map?: L.Map;
  private streetLayer?: L.FeatureGroup;
  /** Label-free base tiles; swapped when the theme changes. */
  private mapBase?: L.TileLayer;
  /** Labels-only overlay tiles; swapped when the theme changes. */
  private mapLabels?: L.TileLayer;
  private readonly streets: LocatedStreet[] = [];
  /** Geocoded geometry per street name, cached so year changes don't refetch. */
  private readonly geometryByStreet = new Map<string, L.LatLng[][]>();
  private readonly redraw = () => this.render();

  /** Swap the CARTO basemap to match the active theme once the map exists. */
  private readonly basemapEffect = effect(() => {
    const active = theme();
    if (this.map) {
      this.applyBasemap(active);
    }
  });

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer().nativeElement, {
      center: BRAUNSCHWEIG_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    // Raster tiles based on OpenStreetMap data (CARTO basemap), split into a
    // label-free base and a labels-only overlay so the label text can be tuned
    // independently via CSS. The dark/light variant follows the app theme.
    this.applyBasemap(theme());

    this.streetLayer = L.featureGroup().addTo(this.map);
    this.map.on('zoomend', this.redraw);
    this.addLegend();

    void this.highlightManagedStreets();
  }

  /**
   * (Re)load the CARTO basemap tiles for the given theme. Tiles live in the
   * tile pane, always below the street overlays, so swapping them never hides
   * the markings.
   */
  private applyBasemap(active: Theme): void {
    if (!this.map) {
      return;
    }
    this.mapBase?.remove();
    this.mapLabels?.remove();

    const variant = active === 'light' ? 'light' : 'dark';
    const attribution =
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    this.mapBase = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/${variant}_nolabels/{z}/{x}/{y}{r}.png`,
      { maxZoom: 19, subdomains: 'abcd', attribution, className: 'map-base' },
    ).addTo(this.map);

    this.mapLabels = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/${variant}_only_labels/{z}/{x}/{y}{r}.png`,
      { maxZoom: 19, subdomains: 'abcd', className: 'map-labels' },
    ).addTo(this.map);
  }

  ngOnDestroy(): void {
    this.map?.off('zoomend', this.redraw);
    this.map?.remove();
    this.map = undefined;
    this.streetLayer = undefined;
    this.mapBase = undefined;
    this.mapLabels = undefined;
    this.streets.length = 0;
  }

  /** Apply the chosen year filter (empty value = all years) and redraw. */
  protected onYearChange(value: string): void {
    this.selectedYear.set(value ? Number(value) : null);
    this.rebuildStreets();
  }

  /**
   * Locate every managed street within Braunschweig and cache its geometry.
   * Geometry comes from a precomputed static asset (loaded once), so no live
   * geocoding requests are made. Streets with no precomputed match are skipped.
   */
  private async highlightManagedStreets(): Promise<void> {
    if (!this.map) {
      return;
    }

    await this.geometry.load();
    // The component may have been destroyed while loading the asset.
    if (!this.map || !this.streetLayer) {
      return;
    }

    for (const { name } of this.data.streetSparten()) {
      const geometry = this.geometry.geometry(name);
      if (!geometry) {
        console.warn(`No precomputed geometry for street "${name}"; skipping.`);
        continue;
      }
      const lines = geometryToLines(geometry);
      if (lines.length === 0) {
        continue;
      }
      this.geometryByStreet.set(name, lines);
    }

    this.rebuildStreets();
    this.frameStreets();
  }

  /**
   * Rebuild the list of streets to draw from the cached geometry, limited to
   * the projects of the selected year (all years when none is selected). Only
   * streets that have been geocoded so far are included.
   */
  private rebuildStreets(): void {
    if (!this.map || !this.streetLayer) {
      return;
    }
    const year = this.selectedYear();
    const projects =
      year === null
        ? this.data.projects()
        : this.data.projects().filter((p) => p.geschaeftsjahr === year);

    // Count projects (items) per division for every street in one pass.
    const countsByStreet = new Map<string, Map<Sparte, number>>();
    for (const p of projects) {
      const street = projectStreet(p);
      let counts = countsByStreet.get(street);
      if (!counts) {
        counts = new Map<Sparte, number>();
        countsByStreet.set(street, counts);
      }
      counts.set(p.sparte, (counts.get(p.sparte) ?? 0) + 1);
    }

    this.streets.length = 0;
    for (const { name, sparten } of aggregateStreetSparten(projects)) {
      const lines = this.geometryByStreet.get(name);
      if (!lines) {
        continue;
      }
      this.streets.push({
        name,
        lines,
        sparten,
        counts: countsByStreet.get(name) ?? new Map<Sparte, number>(),
      });
    }
    this.render();
  }

  /** Fit the view to all located streets (only meaningfully zooms in once). */
  private frameStreets(): void {
    if (!this.map || !this.streetLayer) {
      return;
    }
    const bounds = this.streetLayer.getBounds();
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [32, 32], maxZoom: DEFAULT_ZOOM });
    }
  }

  /** (Re)draw all street markings for the current zoom level. */
  private render(): void {
    if (!this.map || !this.streetLayer) {
      return;
    }
    this.streetLayer.clearLayers();
    const sideBySide = this.map.getZoom() >= PARALLEL_ZOOM_THRESHOLD;
    for (const street of this.streets) {
      // One shared popup element per street, reused across its lines (only one
      // popup is ever open at a time).
      const popup = this.buildStreetPopup(street);
      if (sideBySide && street.sparten.length > 1) {
        this.drawParallel(street, popup);
      } else {
        this.drawStacked(street, popup);
      }
    }
  }

  /** Lay the divisions out as parallel lines centred on the real street. */
  private drawParallel(street: LocatedStreet, popup: HTMLElement): void {
    const n = street.sparten.length;
    street.sparten.forEach((sparte, i) => {
      const offset = (i - (n - 1) / 2) * LINE_SPACING;
      for (const line of street.lines) {
        this.addLine(this.offsetLine(line, offset), street, popup, {
          color: STREET_COLORS[sparte],
        });
      }
    });
  }

  /**
   * Draw all divisions on the exact street geometry. A single division is a
   * solid line; several are interleaved as a multi-colour dashed line so every
   * colour stays visible even when the street is only a few pixels wide.
   */
  private drawStacked(street: LocatedStreet, popup: HTMLElement): void {
    const n = street.sparten.length;
    street.sparten.forEach((sparte, i) => {
      const style: L.PolylineOptions = { color: STREET_COLORS[sparte] };
      if (n > 1) {
        style.dashArray = `${STRIPE_DASH} ${STRIPE_DASH * (n - 1)}`;
        style.dashOffset = `${STRIPE_DASH * i}`;
      }
      for (const line of street.lines) {
        this.addLine(line, street, popup, style);
      }
    });
  }

  /** Add one polyline with the shared base style plus the given overrides. */
  private addLine(
    latlngs: L.LatLng[],
    street: LocatedStreet,
    popup: HTMLElement,
    style: L.PolylineOptions,
  ): void {
    if (!this.streetLayer) {
      return;
    }
    L.polyline(latlngs, {
      weight: LINE_WEIGHT,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      ...style,
    })
      .bindTooltip(this.tooltip(street), { sticky: true })
      .bindPopup(popup, { className: 'street-popup-wrapper', minWidth: 200 })
      .addTo(this.streetLayer);
  }

  /** Tooltip text: the street name and the divisions marked on it. */
  private tooltip(street: LocatedStreet): string {
    const labels = street.sparten.map((s) => SPARTE_LABELS[s]).join(', ');
    return `${street.name} — ${labels}`;
  }

  /**
   * Build the click popup for a street: the per-division item counts and a
   * button that opens the full Straßendetails view for the street. Rendered as
   * a native Leaflet popup (no separate Angular overlay).
   */
  private buildStreetPopup(street: LocatedStreet): HTMLElement {
    const root = L.DomUtil.create('div', 'street-popup');

    const title = L.DomUtil.create('h3', 'street-popup__title', root);
    title.textContent = street.name;

    const list = L.DomUtil.create('ul', 'street-popup__list', root);
    list.setAttribute('role', 'list');
    for (const sparte of street.sparten) {
      const item = L.DomUtil.create('li', 'street-popup__item', list);

      const swatch = L.DomUtil.create('span', 'street-popup__swatch', item);
      swatch.style.background = STREET_COLORS[sparte];
      swatch.setAttribute('aria-hidden', 'true');

      const label = L.DomUtil.create('span', 'street-popup__label', item);
      label.textContent = SPARTE_LABELS[sparte];

      const count = L.DomUtil.create('span', 'street-popup__count', item);
      const n = street.counts.get(sparte) ?? 0;
      count.textContent = String(n);
      count.setAttribute(
        'aria-label',
        `${n} ${n === 1 ? 'Projekt' : 'Projekte'} ${SPARTE_LABELS[sparte]}`,
      );
    }

    const button = L.DomUtil.create('button', 'street-popup__button', root);
    button.type = 'button';
    button.textContent = 'Straßendetails öffnen';
    // Keep the click from reaching the map (pan/zoom) and navigate to the
    // street-details page with the street pre-selected.
    L.DomEvent.on(button, 'click', (event) => {
      L.DomEvent.stop(event);
      void this.router.navigate(['/strassen'], {
        queryParams: { strasse: street.name },
      });
    });

    return root;
  }

  /**
   * Shift a line perpendicular to its direction by `pixels` screen pixels at
   * the current zoom. Works in layer (pixel) space so the spacing between
   * parallel division lines stays constant regardless of zoom.
   */
  private offsetLine(latlngs: L.LatLng[], pixels: number): L.LatLng[] {
    if (!this.map || pixels === 0 || latlngs.length < 2) {
      return latlngs;
    }
    const map = this.map;
    const pts = latlngs.map((ll) => map.latLngToLayerPoint(ll));
    const n = pts.length;

    // Unit normal of each segment.
    const normals: L.Point[] = [];
    for (let i = 0; i < n - 1; i++) {
      const dx = pts[i + 1].x - pts[i].x;
      const dy = pts[i + 1].y - pts[i].y;
      const len = Math.hypot(dx, dy) || 1;
      normals.push(L.point(-dy / len, dx / len));
    }

    return pts.map((pt, i) => {
      let nx: number;
      let ny: number;
      if (i === 0) {
        nx = normals[0].x;
        ny = normals[0].y;
      } else if (i === n - 1) {
        nx = normals[n - 2].x;
        ny = normals[n - 2].y;
      } else {
        // Average the adjacent segment normals to round off corners.
        nx = normals[i - 1].x + normals[i].x;
        ny = normals[i - 1].y + normals[i].y;
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;
      }
      return map.layerPointToLatLng(L.point(pt.x + nx * pixels, pt.y + ny * pixels));
    });
  }

  /** Persistent legend mapping each colour to its division. */
  private addLegend(): void {
    if (!this.map) {
      return;
    }
    const legend = new L.Control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      div.setAttribute('role', 'list');
      div.setAttribute('aria-label', 'Legende: Farben der Sparten');
      div.innerHTML = SPARTEN.map(
        (s) =>
          `<span class="map-legend__item" role="listitem">` +
          `<span class="map-legend__swatch" style="background:${STREET_COLORS[s]}" aria-hidden="true"></span>` +
          `${SPARTE_LABELS[s]}` +
          `</span>`,
      ).join('');
      return div;
    };
    legend.addTo(this.map);
  }
}

/** Flatten any line/area GeoJSON geometry into a list of coordinate paths. */
function geometryToLines(geometry: GeoJSON.Geometry): L.LatLng[][] {
  const toLatLngs = (coords: GeoJSON.Position[]): L.LatLng[] =>
    coords.map((c) => L.latLng(c[1], c[0]));
  switch (geometry.type) {
    case 'LineString':
      return [toLatLngs(geometry.coordinates)];
    case 'MultiLineString':
    case 'Polygon':
      return geometry.coordinates.map(toLatLngs);
    case 'MultiPolygon':
      return geometry.coordinates.flatMap((poly) => poly.map(toLatLngs));
    default:
      return [];
  }
}
