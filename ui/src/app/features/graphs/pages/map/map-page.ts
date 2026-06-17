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
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
