import { TestBed } from '@angular/core/testing';

import { ExternalUrlImageSource } from './external-url-image.source';
import { ImageSourceError } from './player-image-source';

describe('ExternalUrlImageSource', () => {
  let source: ExternalUrlImageSource;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ExternalUrlImageSource] });
    source = TestBed.inject(ExternalUrlImageSource);
  });

  it('accepts a well-formed HTTPS URL and tags imageSource=url', async () => {
    const result = await source.provide({
      kind: 'url',
      url: 'https://example.com/photo.jpg',
    });

    expect(result.url).toBe('https://example.com/photo.jpg');
    expect(result.imageSource).toBe('url');
  });

  it('rejects an empty URL', async () => {
    await expectAsync(source.provide({ kind: 'url', url: '' }))
      .toBeRejectedWithError(ImageSourceError, /introduce una url/i);
  });

  it('rejects an unparseable URL', async () => {
    await expectAsync(source.provide({ kind: 'url', url: 'not a url' }))
      .toBeRejectedWithError(ImageSourceError, /url inválida/i);
  });

  it('rejects http URLs (must be https)', async () => {
    await expectAsync(source.provide({ kind: 'url', url: 'http://example.com/x.jpg' }))
      .toBeRejectedWithError(ImageSourceError, /https/i);
  });
});
