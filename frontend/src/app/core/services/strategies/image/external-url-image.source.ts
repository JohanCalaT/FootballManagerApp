import { Injectable } from '@angular/core';

import {
  IPlayerImageSource,
  ImageSourceError,
  PlayerImageResult,
  UrlImageInput,
} from './player-image-source';

/**
 * Strategy for "the user pasted a URL to an image hosted elsewhere".
 *
 * We validate format only: HTTPS scheme + URL-parseable. We do NOT perform
 * a HEAD request to confirm the resource exists / is an image — that would
 * fail on hosts that block CORS and reject legitimate URLs. If the URL ends
 * up 404 in the browser, the `<img>` `onerror` handler in the picker shows
 * a fallback. Cheap validation here, observable validation in the UI.
 */
@Injectable({ providedIn: 'root' })
export class ExternalUrlImageSource implements IPlayerImageSource<'url'> {
  readonly kind = 'url' as const;

  async provide(input: UrlImageInput): Promise<PlayerImageResult> {
    const url = (input.url ?? '').trim();
    if (!url) {
      throw new ImageSourceError('url', 'Introduce una URL de imagen.');
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ImageSourceError('url', `URL inválida: ${url}`);
    }
    if (parsed.protocol !== 'https:') {
      throw new ImageSourceError('url', 'La URL debe usar HTTPS.');
    }
    return { url: parsed.toString(), imageSource: 'url' };
  }
}
