import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

/** Geographic center of Braunschweig. */
const BRAUNSCHWEIG_CENTER: L.LatLngTuple = [52.2689, 10.5268];
const DEFAULT_ZOOM = 13;

/** OpenStreetMap view of Braunschweig, themed to match the app. */
@Component({
  selector: 'app-map-page',
  imports: [],
  templateUrl: './map-page.html',
  styleUrl: './map-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPage implements AfterViewInit, OnDestroy {
  private readonly mapContainer =
    viewChild.required<ElementRef<HTMLElement>>('mapContainer');

  private map?: L.Map;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer().nativeElement, {
      center: BRAUNSCHWEIG_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark-themed raster tiles based on OpenStreetMap data (CARTO basemap).
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    ).addTo(this.map);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
