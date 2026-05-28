import { TestBed } from '@angular/core/testing';

import { ApiFootballImageSource } from './api-football-image.source';
import { ImageSourceError } from './player-image-source';

describe('ApiFootballImageSource', () => {
  let source: ApiFootballImageSource;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ApiFootballImageSource] });
    source = TestBed.inject(ApiFootballImageSource);
  });

  it('returns the API-Football URL untouched with imageSource=api', async () => {
    const result = await source.provide({
      kind: 'api',
      apiUrl: 'https://media.api-sports.io/football/players/12345.png',
    });

    expect(result.url).toBe('https://media.api-sports.io/football/players/12345.png');
    expect(result.imageSource).toBe('api');
    expect(result.storagePath).toBeUndefined();
  });

  it('rejects an empty URL', async () => {
    await expectAsync(source.provide({ kind: 'api', apiUrl: '   ' }))
      .toBeRejectedWithError(ImageSourceError, /no devolvió una URL/i);
  });

  it('rejects non-https URLs to keep mixed content out of the app', async () => {
    await expectAsync(source.provide({ kind: 'api', apiUrl: 'http://media.api-sports.io/x.png' }))
      .toBeRejectedWithError(ImageSourceError, /https/i);
  });
});
