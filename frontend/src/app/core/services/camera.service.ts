import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface PickFileOptions {
  /** MIME filter for the file input. Defaults to `image/*`. */
  readonly accept?: string;
  /**
   * `capture` hint passed to the input element:
   *   - 'environment' → suggest the rear camera (typical for player photos)
   *   - 'user'        → suggest the front camera (selfie)
   * Browsers and webviews are free to ignore this and just open a picker.
   */
  readonly capture?: 'user' | 'environment';
}

export type CameraSourceKind = 'camera' | 'gallery';

/**
 * Image-input wrapper. Two paths:
 *
 *   - `pickFromCamera()`  → opens the device camera via `@capacitor/camera`.
 *                            On Android packaged build → native intent. On
 *                            web (Ionic serve / staging) → `@ionic/pwa-elements`
 *                            renders an in-browser capture UI (registered in
 *                            main.ts via `definePwaElements`).
 *   - `pickFromGallery()` → opens the platform photo picker via Capacitor.
 *   - `pickFromFile()`    → legacy fallback that uses a hidden file input.
 *                            Used by tests and as the bottom escape hatch.
 *
 * All three resolve with a `File` (or `null` if the user cancelled) so the
 * caller chain stays the same.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  async pickFromCamera(): Promise<File | null> {
    return this.getPhoto(CameraSource.Camera);
  }

  async pickFromGallery(): Promise<File | null> {
    return this.getPhoto(CameraSource.Photos);
  }

  pickFromFile(opts: PickFileOptions = {}): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = opts.accept ?? 'image/*';
      if (opts.capture) {
        input.setAttribute('capture', opts.capture);
      }
      let settled = false;
      const finish = (file: File | null): void => {
        if (settled) return;
        settled = true;
        resolve(file);
      };

      input.addEventListener('change', () => finish(input.files?.[0] ?? null));
      window.addEventListener(
        'focus',
        () => setTimeout(() => finish(null), 300),
        { once: true },
      );

      input.click();
    });
  }

  private async getPhoto(source: CameraSource): Promise<File | null> {
    try {
      const photo = await Camera.getPhoto({
        source,
        resultType: CameraResultType.Uri,
        quality: 85,
        allowEditing: false,
      });
      if (!photo.webPath) return null;

      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const ext = photo.format || blob.type.split('/')[1] || 'jpeg';
      const mime = blob.type || `image/${ext}`;
      return new File(
        [blob],
        `${source === CameraSource.Camera ? 'capture' : 'photo'}-${Date.now()}.${ext}`,
        { type: mime },
      );
    } catch (err) {
      // Capacitor throws when the user cancels the prompt or denies the
      // permission. We treat both as "no file chosen" rather than as errors,
      // since the caller (the picker) just needs to know nothing was picked.
      // eslint-disable-next-line no-console
      console.debug('[CameraService] cancelled or denied:', err);
      return null;
    }
  }
}
