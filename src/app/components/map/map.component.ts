import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import * as L from 'leaflet';
import { FriendsService } from '../../services/friends.service';

@Component({
  selector: 'app-map',
  standalone: true,
  template: `<div #mapEl class="map"></div>`,
  styles: [
    `
      :host,
      .map {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private friendsService = inject(FriendsService);
  private map?: L.Map;
  private markerLayer = L.layerGroup();
  private centerMarker?: L.Marker;
  private radiusCircle?: L.Circle;
  private didInitialFit = false;

  // Custom icons (Leaflet's default image paths break under bundlers, so we
  // point them at the assets copied into /leaflet by angular.json).
  private friendIcon = L.icon({
    iconUrl: 'leaflet/marker-icon.png',
    iconRetinaUrl: 'leaflet/marker-icon-2x.png',
    shadowUrl: 'leaflet/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  private meetingIcon = L.divIcon({
    className: 'meeting-pin',
    html: '🍺',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

  constructor() {
    // Re-render whenever friends, the meeting point or the radius change.
    effect(() => {
      this.friendsService.locatedFriends();
      this.friendsService.meetingPoint();
      this.friendsService.radiusMeters();
      this.render();
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      center: [47.4979, 19.0402], // Budapest
      zoom: 12,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);
    this.markerLayer.addTo(this.map);
    this.render();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private render(): void {
    if (!this.map) return;

    // Friend markers.
    this.markerLayer.clearLayers();
    const located = this.friendsService.locatedFriends();
    const cheat = this.friendsService.cheatMode();
    for (const f of located) {
      const weightLabel = cheat ? ` · weight ${f.weight}` : '';
      L.marker([f.lat!, f.lng!], { icon: this.friendIcon })
        .bindPopup(`<b>${f.name}</b><br>${f.address}${weightLabel}`)
        .addTo(this.markerLayer);
    }

    // Meeting point + radius.
    const center = this.friendsService.meetingPoint();
    if (center) {
      const latlng: L.LatLngExpression = [center.lat, center.lng];
      if (this.centerMarker) {
        this.centerMarker.setLatLng(latlng);
      } else {
        this.centerMarker = L.marker(latlng, { icon: this.meetingIcon })
          .bindPopup('<b>Fair meeting point</b>')
          .addTo(this.map);
      }

      const radius = this.friendsService.radiusMeters();
      if (this.radiusCircle) {
        this.radiusCircle.setLatLng(latlng).setRadius(radius);
      } else {
        this.radiusCircle = L.circle(latlng, {
          radius,
          color: '#d97706',
          fillColor: '#f59e0b',
          fillOpacity: 0.12,
          weight: 2,
        }).addTo(this.map);
      }
    } else {
      this.centerMarker?.remove();
      this.centerMarker = undefined;
      this.radiusCircle?.remove();
      this.radiusCircle = undefined;
    }

    // Fit to everything once, the first time we have points.
    if (!this.didInitialFit && located.length) {
      const points = located.map(
        (f) => [f.lat!, f.lng!] as L.LatLngTuple
      );
      this.map.fitBounds(L.latLngBounds(points).pad(0.3));
      this.didInitialFit = true;
    }
  }
}
