import { Injectable } from '@angular/core';

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

/**
 * Thin wrapper around the HTML5 file input so the rest of the app does not
 * have to build hidden `<input>` elements imperatively. Returns the chosen
 * File or `null` if the user cancelled.
 *
 * Why not `@capacitor/camera` here? On Android webview the HTML5 input with
 * `capture="environment"` opens the system camera natively, so a vanilla
 * input covers both web and packaged builds without an extra plugin in the
 * critical path. The Capacitor Camera dep stays installed for future use
 * (e.g. finer control over resolution / source selection sheet) but is not
 * required for v1 of the picker.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  pickFromFile(opts: PickFileOptions = {}): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = opts.accept ?? 'image/*';
      if (opts.capture) {
        input.setAttribute('capture', opts.capture);
      }
      // `change` fires once a file is picked; if the user cancels, no event
      // fires at all on most browsers, so we also listen on focus return as
      // a soft cancel signal (resolves null).
      let settled = false;
      const finish = (file: File | null): void => {
        if (settled) return;
        settled = true;
        resolve(file);
      };

      input.addEventListener('change', () => finish(input.files?.[0] ?? null));
      // Defer cancel detection one tick so it does not race the change event.
      window.addEventListener(
        'focus',
        () => setTimeout(() => finish(null), 300),
        { once: true },
      );

      input.click();
    });
  }
}
