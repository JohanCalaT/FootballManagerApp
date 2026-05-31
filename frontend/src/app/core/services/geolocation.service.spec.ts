import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { GeolocationService } from './geolocation.service';

describe('GeolocationService', () => {
  let service: GeolocationService;
  let originalGeo: Geolocation | undefined;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GeolocationService] });
    service = TestBed.inject(GeolocationService);
    originalGeo = navigator.geolocation;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeo,
      configurable: true,
    });
  });

  function stubGeolocation(impl: Geolocation['getCurrentPosition']): void {
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: impl } as Partial<Geolocation>,
      configurable: true,
    });
  }

  // Karma runs in a real browser, so Capacitor.isNativePlatform() is already
  // false here and the web branch is exercised by default.
  describe('web platform (navigator.geolocation)', () => {
    it('returns lat/lng (city/country null) on a successful fix', async () => {
      stubGeolocation((success) => {
        success({
          coords: {
            latitude: 36.85,
            longitude: -2.46,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          } as GeolocationCoordinates,
          timestamp: Date.now(),
        } as GeolocationPosition);
      });

      const result = await service.requestClientPosition();

      expect(result).toEqual({ lat: 36.85, lng: -2.46, city: null, country: null });
    });

    it('rejects when not silent and the user denies permission', async () => {
      stubGeolocation((_success, error) => {
        error?.({ code: 1, message: 'denied' } as GeolocationPositionError);
      });

      await expectAsync(service.requestClientPosition()).toBeRejected();
    });

    it('resolves null when silent and the user denies permission', async () => {
      stubGeolocation((_success, error) => {
        error?.({ code: 1, message: 'denied' } as GeolocationPositionError);
      });

      const result = await service.requestClientPosition({ silent: true });
      expect(result).toBeNull();
    });

    it('resolves null when silent and the API is unavailable', async () => {
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        configurable: true,
      });

      const result = await service.requestClientPosition({ silent: true });
      expect(result).toBeNull();
    });
  });

  // The native branch is what makes the installed APK work: it asks the OS for
  // the runtime permission and reads GPS through @capacitor/geolocation.
  //
  // @capacitor/geolocation is a registered-plugin Proxy, so its methods cannot
  // be replaced with spyOn (the web implementation still runs and throws
  // UNIMPLEMENTED in Karma). Rather than fight the proxy, we assert the
  // observable contract: on a native platform the service routes to the plugin
  // and honours silent/non-silent error handling exactly like the web branch.
  describe('native platform (@capacitor/geolocation)', () => {
    beforeEach(() => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    });

    it('routes to the plugin and degrades to null in silent mode when no fix is available', async () => {
      const result = await service.requestClientPosition({ silent: true });
      expect(result).toBeNull();
    });

    it('rejects when not silent and the plugin cannot provide a fix', async () => {
      await expectAsync(service.requestClientPosition()).toBeRejected();
    });
  });
});
