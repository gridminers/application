import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { ProjectData } from '../../../../core/services/project-data';
import { StreetGeocoder } from '../../../../core/services/street-geocoder';

/** Geographic center of Braunschweig. */
const BRAUNSCHWEIG_CENTER: L.LatLngTuple = [52.2689, 10.5268];
const DEFAULT_ZOOM = 13;

/** Accent green used to highlight managed streets. */
const HIGHLIGHT_COLOR = '#00ff41';

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

  private map?: L.Map;
  private streetLayer?: L.GeoJSON;

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

    void this.highlightManagedStreets();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
    this.streetLayer = undefined;
  }

  /**
   * Draw a green line over every managed street that can be located within
   * Braunschweig. Streets with no confident match are skipped. Lookups run
   * sequentially to stay within the geocoder's fair-use rate limit.
   */
  private async highlightManagedStreets(): Promise<void> {
    if (!this.map) {
      return;
    }

    this.streetLayer = L.geoJSON(undefined, {
      style: {
        color: HIGHLIGHT_COLOR,
        weight: 4,
        opacity: 0.9,
        fillColor: HIGHLIGHT_COLOR,
        fillOpacity: 0.08,
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties?.['name'];
        if (typeof name === 'string') {
          layer.bindTooltip(name, { sticky: true });
        }
      },
    }).addTo(this.map);

    for (const street of this.data.streets()) {
      const geometry = await this.geocoder.geocode(street);
      // The component may have been destroyed while awaiting the lookup.
      if (!geometry || !this.map || !this.streetLayer) {
        continue;
      }
      const feature: GeoJSON.Feature = {
        type: 'Feature',
        geometry,
        properties: { name: street },
      };
      this.streetLayer.addData(feature);
    }

    // Frame the highlighted streets if any were found.
    if (this.map && this.streetLayer) {
      const bounds = this.streetLayer.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [32, 32], maxZoom: DEFAULT_ZOOM });
      }
    }
  }
}
