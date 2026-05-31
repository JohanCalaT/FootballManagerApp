import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';

import { Geolocation } from '../../../core/models/geolocation.model';
import { GeolocationService } from '../../../core/services/geolocation.service';

// Imported through dynamic import so the ~40KB Leaflet bundle stays out of
// the initial chunk; this component is meant to be used inside an `@defer`
// block in the parent template so the import only fires when the user
// actually expands the "Marcar en mapa" section.
type LeafletNs = typeof import('leaflet');
type LeafletMap = import('leaflet').Map;
type LeafletMarker = import('leaflet').Marker;

const FALLBACK_CENTER = { lat: 40.4168, lng: -3.7038 }; // Madrid centroid
const DEFAULT_ZOOM = 13;

// Inline SVG pin matching the Gridiron Neon primary (#00ff87). Using a
// DivIcon means we never have to ship Leaflet's PNG marker assets, which
// break under Angular's asset hashing.
const PIN_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" fill="none">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#00ff87"/>
    <circle cx="16" cy="16" r="6" fill="#003919"/>
  </svg>
`;

/**
 * Interactive map for editing a player's geolocation.
 *
 * Behaviour:
 *   - Initial marker comes from `[initial]`. If absent, the map centres on a
 *     reasonable fallback (Madrid) without dropping a marker.
 *   - Tap/click anywhere on the map drops the marker there.
 *   - The marker is draggable for fine adjustment.
 *   - "Usar mi ubicación actual" calls the existing GeolocationService.
 *   - Each change emits `changed` with `{lat, lng, city: null, country: null}`
 *     — reverse-geocoding deliberately out of scope (would need Nominatim
 *     and a CORS proxy; backend can do it later in a background job).
 *
 * Wrapped under `@defer (when sectionOpen)` in the parent template so the
 * Leaflet bundle and its CSS only download when the section is actually
 * expanded. Designed for mobile-first dark UI — see DESIGN.md.
 */
@Component({
  selector: 'app-player-geolocation-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon, IonSpinner],
  templateUrl: './player-geolocation-picker.component.html',
  styleUrls: ['./player-geolocation-picker.component.scss'],
})
export class PlayerGeolocationPickerComponent implements AfterViewInit {
  private readonly geo = inject(GeolocationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly initial = input<Geolocation | null>(null);
  readonly changed = output<Geolocation>();

  /** Lets tests skip the actual Leaflet boot when no real DOM is available. */
  @Input() autoInit = true;

  protected readonly mapHost = viewChild.required<ElementRef<HTMLDivElement>>('mapHost');
  protected readonly isLocating = signal(false);
  protected readonly error = signal<string | null>(null);

  private leaflet: LeafletNs | null = null;
  private map: LeafletMap | null = null;
  private marker: LeafletMarker | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // Keep the marker in sync if the parent patches `initial` after mount —
    // common when an edit page loads the player asynchronously.
    effect(() => {
      const value = this.initial();
      if (this.leaflet && value) {
        this.setMarker(value.lat, value.lng, { emit: false, pan: true });
      }
    });

    this.destroyRef.onDestroy(() => this.disposeMap());
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.autoInit) return;
    try {
      await this.bootMap();
    } catch (err) {
      // Surface boot failures instead of dying as an unhandled rejection
      // (the map silently failing was indistinguishable from a black canvas).
      // eslint-disable-next-line no-console
      console.error('[GeoPicker] map boot failed', err);
      this.error.set('No se pudo cargar el mapa.');
    }
  }

  protected async onUseMyLocation(): Promise<void> {
    this.isLocating.set(true);
    this.error.set(null);
    try {
      const pos = await this.geo.requestClientPosition();
      if (!pos) return;
      this.setMarker(pos.lat, pos.lng, { emit: true, pan: true });
    } catch {
      this.error.set('No se pudo obtener tu ubicación.');
    } finally {
      this.isLocating.set(false);
    }
  }

  private async bootMap(): Promise<void> {
    // Dynamic import keeps Leaflet out of the eager bundle. Leaflet is a
    // CommonJS module: in the optimized production build `await import('leaflet')`
    // resolves to a namespace whose API lives under `.default`, so
    // `this.leaflet.map` was undefined ONLY in deploy (the dev build exposed it
    // directly) → "this.leaflet.map is not a function" and a black map. Normalize
    // to the real module object so it works in both dev and prod.
    const mod = await import('leaflet');
    this.leaflet = ((mod as { default?: LeafletNs }).default ?? mod) as LeafletNs;

    const initial = this.initial();
    const center = initial ?? FALLBACK_CENTER;

    this.map = this.leaflet.map(this.mapHost().nativeElement, {
      center: [center.lat, center.lng],
      zoom: initial ? DEFAULT_ZOOM : 5,
      zoomControl: true,
      attributionControl: true,
    });

    this.leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      })
      .addTo(this.map);

    if (initial) {
      this.setMarker(initial.lat, initial.lng, { emit: false, pan: false });
    }

    // Tap/click anywhere drops or moves the marker.
    this.map.on('click', (event) => {
      const { lat, lng } = event.latlng;
      this.setMarker(lat, lng, { emit: true, pan: false });
    });

    // The map boots inside an @defer + collapsible-section that is still
    // animating open, so the host is 0-sized at this point. The old single
    // invalidateSize() on the next frame fired BEFORE layout settled in
    // production, so Leaflet laid out tiles for a 0px viewport and the canvas
    // stayed on its dark background (the "black map" only seen in deploy, not
    // locally where the timing happened to work). A ResizeObserver invalidates
    // the moment the host actually has a non-zero size and keeps it correct on
    // later resizes (rotation, window). This is the canonical fix for a Leaflet
    // map mounted in a hidden/animating container — no library swap needed.
    this.observeResize();
  }

  private setMarker(
    lat: number,
    lng: number,
    opts: { emit: boolean; pan: boolean },
  ): void {
    if (!this.leaflet || !this.map) return;

    if (!this.marker) {
      const icon = this.leaflet.divIcon({
        className: 'fma-map-pin',
        html: PIN_SVG,
        iconSize: [32, 40],
        iconAnchor: [16, 38],
      });
      this.marker = this.leaflet
        .marker([lat, lng], { icon, draggable: true })
        .addTo(this.map);
      this.marker.on('dragend', () => {
        const { lat: dLat, lng: dLng } = this.marker!.getLatLng();
        this.emit(dLat, dLng);
      });
    } else {
      this.marker.setLatLng([lat, lng]);
    }

    if (opts.pan) {
      this.map.setView([lat, lng], Math.max(this.map.getZoom(), DEFAULT_ZOOM));
    }
    if (opts.emit) this.emit(lat, lng);
  }

  private emit(lat: number, lng: number): void {
    this.changed.emit({ lat, lng, city: null, country: null });
  }

  /**
   * Keep the Leaflet canvas in sync with the host size. The map is created
   * while its collapsible is still opening (size 0), so we invalidate as soon
   * as the host has a real size and on every later resize. Falls back to a
   * single rAF invalidate where ResizeObserver is unavailable (old webviews).
   */
  private observeResize(): void {
    if (typeof ResizeObserver === 'undefined') {
      requestAnimationFrame(() => this.map?.invalidateSize());
      return;
    }
    this.resizeObserver = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box && box.width > 0 && box.height > 0) {
        this.map?.invalidateSize();
      }
    });
    this.resizeObserver.observe(this.mapHost().nativeElement);
  }

  private disposeMap(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.marker = null;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
