export interface Friend {
  id: string;
  name: string;
  address: string;
  /** Geocoded coordinates (filled in lazily by the GeocodingService). */
  lat?: number;
  lng?: number;
  /** Weight used only in cheat mode. Defaults to 1. */
  weight: number;
  /** Set when geocoding failed so the UI can flag it. */
  geocodeFailed?: boolean;
}

export interface LatLng {
  lat: number;
  lng: number;
}
