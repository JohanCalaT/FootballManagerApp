import { Injectable } from '@angular/core';

import { Geolocation } from '../models/geolocation.model';

export interface RequestPositionOptions {
  /**
   * If true, missing permission or any error resolves to `null` instead of
   * rejecting. Used on the create-player submit where we want to persist
   * `clientGeolocation = null` rather than block the save.
   */
  readonly silent?: boolean;
  /** Max age of a cached position, ms. Defaults to 30s. */
  readonly maximumAge?: number;
  /** How long to wait for the GPS fix, ms. Defaults to 8s. */
  readonly timeout?: number;
  /** Request a high-accuracy fix (slower, more battery). Defaults to false. */
  readonly enableHighAccuracy?: boolean;
}

/**
 * Wrapper over `navigator.geolocation` that returns the project's domain
 * `Geolocation` shape (with `city` / `country` left null for now — reverse
 * geocoding is intentionally NOT wired here to avoid pulling Nominatim into
 * the critical path of the form submit). The `clientGeolocation` field on
 * the player is enough with just `lat`/`lng`; backend can resolve city /
 * country later in a background job if/when we need it.
 *
 * The geolocation prompt is browser-mediated and must happen *as a
 * consequence of a user gesture* (click on Save), otherwise some browsers
 * silently deny. Always call this from inside a click/submit handler.
 */
@Injectable({ providedIn: 'root' })
export class GeolocationService {
  async requestClientPosition(opts: RequestPositionOptions = {}): Promise<Geolocation | null> {
    if (!('geolocation' in navigator)) {
      if (opts.silent) return null;
      throw new Error('Geolocalización no soportada por el navegador.');
    }

    try {
      const position = await this.getCurrentPosition({
        enableHighAccuracy: opts.enableHighAccuracy ?? false,
        timeout: opts.timeout ?? 8000,
        maximumAge: opts.maximumAge ?? 30000,
      });
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        city: null,
        country: null,
      };
    } catch (err) {
      if (opts.silent) return null;
      throw err;
    }
  }

  private getCurrentPosition(opts: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, opts);
    });
  }
}
