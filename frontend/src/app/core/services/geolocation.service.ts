import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation as CapacitorGeolocation } from '@capacitor/geolocation';

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
 * Returns the project's domain `Geolocation` shape (`city`/`country` left null;
 * reverse geocoding is intentionally NOT wired here to keep Nominatim out of
 * the form-submit critical path — the backend can resolve them later).
 *
 * Two backends, picked at runtime:
 *   - **Native (Android/iOS via Capacitor)** → `@capacitor/geolocation`. This
 *     is what makes the APK work: it asks the OS for the runtime location
 *     permission and reads GPS natively. The plain Web `navigator.geolocation`
 *     inside the Android WebView never triggers that permission dialog, which
 *     is why the installed APK silently got no location while the browser did.
 *   - **Web (browser / Ionic serve)** → `navigator.geolocation`, handled by the
 *     browser itself (its own permission prompt).
 *
 * The geolocation prompt must happen *as a consequence of a user gesture*
 * (click on Save / "usar mi ubicación"), otherwise some platforms silently
 * deny. Always call this from inside a click/submit handler.
 */
@Injectable({ providedIn: 'root' })
export class GeolocationService {
  async requestClientPosition(opts: RequestPositionOptions = {}): Promise<Geolocation | null> {
    return Capacitor.isNativePlatform()
      ? this.requestNativePosition(opts)
      : this.requestWebPosition(opts);
  }

  /** Android/iOS: ask the OS permission, then read GPS through the plugin. */
  private async requestNativePosition(
    opts: RequestPositionOptions,
  ): Promise<Geolocation | null> {
    try {
      const status = await CapacitorGeolocation.requestPermissions();
      const granted =
        status.location === 'granted' || status.coarseLocation === 'granted';
      if (!granted) {
        if (opts.silent) return null;
        throw new Error('Permiso de ubicación denegado.');
      }

      const position = await CapacitorGeolocation.getCurrentPosition({
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

  /** Browser: the Web Geolocation API handles its own permission prompt. */
  private async requestWebPosition(
    opts: RequestPositionOptions,
  ): Promise<Geolocation | null> {
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
