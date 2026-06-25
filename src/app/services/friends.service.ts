import { Injectable, computed, effect, signal } from '@angular/core';
import { Friend, LatLng } from '../models/friend';
import { GeocodingService } from './geocoding.service';

interface PersistedState {
  friends: Friend[];
  cheatMode: boolean;
  radiusMeters: number;
}

const STORAGE_KEY = 'daddys-beer.state.v1';

/** The starting line-up, used on first run or after a reset. */
const DEFAULT_FRIENDS: Omit<Friend, 'id'>[] = [
  { name: 'Ricsi', address: '1221 Budapest, Tompa utca 15.', weight: 100 },
  { name: 'Ámon', address: '1115 Budapest, Ildikó utca', weight: 1 },
  { name: 'Csápi', address: '1147 Budapest, Czobor utca 8.', weight: 1 },
  { name: 'Kelemen', address: '1184 Budapest, Építő utca 9b', weight: 1 },
];

@Injectable({ providedIn: 'root' })
export class FriendsService {
  /** Reactive state. */
  readonly friends = signal<Friend[]>([]);
  readonly cheatMode = signal(false);
  readonly radiusMeters = signal(2000);

  /** Friends that have been successfully geocoded. */
  readonly locatedFriends = computed(() =>
    this.friends().filter((f) => f.lat != null && f.lng != null)
  );

  /**
   * The "fair" meeting point: a weighted average of every located friend's
   * coordinates. In cheat mode each friend's `weight` is used; otherwise
   * everyone counts equally (weight 1).
   */
  readonly meetingPoint = computed<LatLng | null>(() => {
    const located = this.locatedFriends();
    if (!located.length) return null;
    const cheat = this.cheatMode();

    let sumLat = 0;
    let sumLng = 0;
    let sumW = 0;
    for (const f of located) {
      const w = cheat ? Math.max(0, f.weight) : 1;
      sumLat += f.lat! * w;
      sumLng += f.lng! * w;
      sumW += w;
    }
    if (sumW === 0) return null;
    return { lat: sumLat / sumW, lng: sumLng / sumW };
  });

  constructor(private geocoder: GeocodingService) {
    this.restore();
    // Persist on any change.
    effect(() => this.persist());
  }

  // ---- mutations -------------------------------------------------------

  addFriend(name: string, address: string, weight = 1): void {
    const friend: Friend = { id: this.uid(), name, address, weight };
    this.friends.update((list) => [...list, friend]);
    this.locate(friend.id);
  }

  updateFriend(id: string, patch: Partial<Friend>): void {
    let addressChanged = false;
    this.friends.update((list) =>
      list.map((f) => {
        if (f.id !== id) return f;
        addressChanged =
          patch.address !== undefined && patch.address !== f.address;
        const next = { ...f, ...patch };
        if (addressChanged) {
          next.lat = undefined;
          next.lng = undefined;
          next.geocodeFailed = false;
        }
        return next;
      })
    );
    if (addressChanged) this.locate(id);
  }

  removeFriend(id: string): void {
    this.friends.update((list) => list.filter((f) => f.id !== id));
  }

  setCheatMode(on: boolean): void {
    this.cheatMode.set(on);
  }

  setRadius(meters: number): void {
    this.radiusMeters.set(meters);
  }

  resetToDefaults(): void {
    this.friends.set(DEFAULT_FRIENDS.map((f) => ({ ...f, id: this.uid() })));
    this.geocodeAll();
  }

  // ---- geocoding -------------------------------------------------------

  /** Geocode every friend that doesn't have coordinates yet. */
  async geocodeAll(): Promise<void> {
    for (const f of this.friends()) {
      if (f.lat == null || f.lng == null) {
        await this.locate(f.id);
      }
    }
  }

  private async locate(id: string): Promise<void> {
    const friend = this.friends().find((f) => f.id === id);
    if (!friend) return;
    const coords = await this.geocoder.geocode(friend.address);
    this.friends.update((list) =>
      list.map((f) =>
        f.id === id
          ? coords
            ? { ...f, lat: coords.lat, lng: coords.lng, geocodeFailed: false }
            : { ...f, lat: undefined, lng: undefined, geocodeFailed: true }
          : f
      )
    );
  }

  // ---- persistence -----------------------------------------------------

  private restore(): void {
    let state: PersistedState | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) state = JSON.parse(raw);
    } catch {
      state = null;
    }

    if (state?.friends?.length) {
      this.friends.set(state.friends);
      this.cheatMode.set(!!state.cheatMode);
      this.radiusMeters.set(state.radiusMeters || 2000);
      // Fill in any coords missing from a previous session.
      this.geocodeAll();
    } else {
      this.resetToDefaults();
    }
  }

  private persist(): void {
    const state: PersistedState = {
      friends: this.friends(),
      cheatMode: this.cheatMode(),
      radiusMeters: this.radiusMeters(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }

  private uid(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}
