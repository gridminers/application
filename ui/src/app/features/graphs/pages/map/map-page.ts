import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { Sparte, SPARTE_LABELS, SPARTEN } from '../../../../core/models/sparte';
import { aggregateStreetSparten, ProjectData } from '../../../../core/services/project-data';
import { StreetGeocoder } from '../../../../core/services/street-geocoder';

/** Geographic center of Braunschweig. */
const BRAUNSCHWEIG_CENTER: L.LatLngTuple = [52.2689, 10.5268];
const DEFAULT_ZOOM = 13;

/**
 * Colour per division (Sparte) used to mark the work done on a street.
 * Distinct, saturated hues chosen to stay legible on the dark basemap.
 */
const STREET_COLORS: Record<Sparte, string> = {
  Strom: '#ffd400', // yellow
  Gas: '#00e639', // green
  Fernwaerme: '#ff3b30', // red
  Wasser: '#2b9bff', // blue
  Infotechnik: '#ff3bd4', // magenta
};

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
}

/** OpenStreetMap view of Braunschweig, themed to match the app. */
@Component({
  selector: 'app-map-page',
  imports: [],
  templateUrl: './map-page.html',
  styleUrl: './map-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage implements AfterViewInit, OnDestroy {
  private readonly data = inject(ProjectData);
  private readonly geocoder = inject(StreetGeocoder);

  private readonly mapContainer =
    viewChild.required<ElementRef<HTMLElement>>('mapContainer');

  /** Distinct fiscal years present in the data, ascending. */
  protected readonly years = this.data.years;

  /** Selected fiscal year, or `null` for all years (the default). */
  protected readonly selectedYear = signal<number | null>(null);

  private map?: L.Map;
  private streetLayer?: L.FeatureGroup;
  private readonly streets: LocatedStreet[] = [];
  /** Geocoded geometry per street name, cached so year changes don't refetch. */
  private readonly geometryByStreet = new Map<string, L.LatLng[][]>();
  private readonly redraw = () => this.render();

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer().nativeElement, {
      center: BRAUNSCHWEIG_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    const attribution =
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    // Dark-themed raster tiles based on OpenStreetMap data (CARTO basemap),
    // split into a label-free base and a labels-only overlay so the label
    // text can be lightened independently via CSS.
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, subdomains: 'abcd', attribution, className: 'map-base' },
    ).addTo(this.map);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, subdomains: 'abcd', className: 'map-labels' },
    ).addTo(this.map);

    this.streetLayer = L.featureGroup().addTo(this.map);
    this.map.on('zoomend', this.redraw);
    this.addLegend();

    void this.highlightManagedStreets();
  }

  ngOnDestroy(): void {
    this.map?.off('zoomend', this.redraw);
    this.map?.remove();
    this.map = undefined;
    this.streetLayer = undefined;
    this.streets.length = 0;
  }

  /** Apply the chosen year filter (empty value = all years) and redraw. */
  protected onYearChange(value: string): void {
    this.selectedYear.set(value ? Number(value) : null);
    this.rebuildStreets();
  }

  /**
   * Locate every managed street within Braunschweig and cache its geometry.
   * Streets with no confident match are skipped. Lookups run sequentially to
   * stay within the geocoder's fair-use rate limit. After each lookup the
   * drawn streets are rebuilt for the current year filter.
   */
  private async highlightManagedStreets(): Promise<void> {
    if (!this.map) {
      return;
    }

    for (const { name } of this.data.streetSparten()) {
      const geometry = await this.geocoder.geocode(name);
      // The component may have been destroyed while awaiting the lookup.
      if (!geometry || !this.map || !this.streetLayer) {
        continue;
      }
      const lines = geometryToLines(geometry);
      if (lines.length === 0) {
        continue;
      }
      this.geometryByStreet.set(name, lines);
      this.rebuildStreets();
      this.frameStreets();
    }
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

    this.streets.length = 0;
    for (const { name, sparten } of aggregateStreetSparten(projects)) {
      const lines = this.geometryByStreet.get(name);
      if (!lines) {
        continue;
      }
      this.streets.push({ name, lines, sparten });
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
      if (sideBySide && street.sparten.length > 1) {
        this.drawParallel(street);
      } else {
        this.drawStacked(street);
      }
    }
  }

  /** Lay the divisions out as parallel lines centred on the real street. */
  private drawParallel(street: LocatedStreet): void {
    const n = street.sparten.length;
    street.sparten.forEach((sparte, i) => {
      const offset = (i - (n - 1) / 2) * LINE_SPACING;
      for (const line of street.lines) {
        this.addLine(this.offsetLine(line, offset), street, {
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
  private drawStacked(street: LocatedStreet): void {
    const n = street.sparten.length;
    street.sparten.forEach((sparte, i) => {
      const style: L.PolylineOptions = { color: STREET_COLORS[sparte] };
      if (n > 1) {
        style.dashArray = `${STRIPE_DASH} ${STRIPE_DASH * (n - 1)}`;
        style.dashOffset = `${STRIPE_DASH * i}`;
      }
      for (const line of street.lines) {
        this.addLine(line, street, style);
      }
    });
  }

  /** Add one polyline with the shared base style plus the given overrides. */
  private addLine(
    latlngs: L.LatLng[],
    street: LocatedStreet,
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
      .addTo(this.streetLayer);
  }

  /** Tooltip text: the street name and the divisions marked on it. */
  private tooltip(street: LocatedStreet): string {
    const labels = street.sparten.map((s) => SPARTE_LABELS[s]).join(', ');
    return `${street.name} — ${labels}`;
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
