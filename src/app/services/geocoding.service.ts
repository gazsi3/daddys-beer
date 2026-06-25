import { Injectable } from '@angular/core';
import { LatLng } from '../models/friend';

/**
 * Geocodes free-text addresses to coordinates using the free OpenStreetMap
 * Nominatim API. Results are cached in localStorage so we hammer the public
 * endpoint as little as possible (its usage policy asks for <= 1 req/sec and
 * heavy caching). https://operations.osmfoundation.org/policies/nominatim/
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly endpoint = 'https://nominatim.openstreetmap.org/search';
  private readonly cacheKey = 'daddys-beer.geocache.v1';
  private cache: Record<string, LatLng | null> = this.loadCache();

  async geocode(address: string): Promise<LatLng | null> {
    const key = address.trim().toLowerCase();
    if (!key) return null;
    if (key in this.cache) return this.cache[key];

    try {
      const url =
        `${this.endpoint}?format=json&limit=1&q=${encodeURIComponent(address)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Array<{ lat: string; lon: string }> = await res.json();
      const result = data.length
        ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        : null;
      this.cache[key] = result;
      this.saveCache();
      return result;
    } catch (err) {
      console.warn('Geocoding failed for', address, err);
      return null;
    }
  }

  private loadCache(): Record<string, LatLng | null> {
    try {
      return JSON.parse(localStorage.getItem(this.cacheKey) ?? '{}');
    } catch {
      return {};
    }
  }

  private saveCache(): void {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
    } catch {
      /* storage full / unavailable — ignore, caching is best-effort */
    }
  }
}
