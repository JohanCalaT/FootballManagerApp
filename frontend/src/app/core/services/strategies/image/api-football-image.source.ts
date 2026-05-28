import { Injectable } from '@angular/core';

import {
  ApiImageInput,
  IPlayerImageSource,
  ImageSourceError,
  PlayerImageResult,
} from './player-image-source';

/**
 * Passthrough strategy for players imported from API-Football: the upstream
 * already gives us a public CDN URL (`media.api-sports.io/...`), so all we
 * do is sanity-check the input and stamp `imageSource = 'api'`.
 *
 * We do NOT proxy the image through our bucket — paying Firebase egress to
 * mirror media.api-sports.io would defeat the point of the API integration.
 */
@Injectable({ providedIn: 'root' })
export class ApiFootballImageSource implements IPlayerImageSource<'api'> {
  readonly kind = 'api' as const;

  async provide(input: ApiImageInput): Promise<PlayerImageResult> {
    const url = (input.apiUrl ?? '').trim();
    if (!url) {
      throw new ImageSourceError('api', 'API-Football no devolvió una URL de foto.');
    }
    if (!url.startsWith('https://')) {
      throw new ImageSourceError(
        'api',
        `URL de API-Football no segura (se esperaba https): ${url}`,
      );
    }
    return { url, imageSource: 'api' };
  }
}
