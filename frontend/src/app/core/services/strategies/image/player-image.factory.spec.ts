import { TestBed } from '@angular/core/testing';

import { ApiFootballImageSource } from './api-football-image.source';
import { ExternalUrlImageSource } from './external-url-image.source';
import { FirebaseStorageImageSource } from './firebase-storage-image.source';
import { PlayerImageFactory } from './player-image.factory';
import { PlayerImageResult } from './player-image-source';

describe('PlayerImageFactory', () => {
  let factory: PlayerImageFactory;
  let api: jasmine.SpyObj<ApiFootballImageSource>;
  let url: jasmine.SpyObj<ExternalUrlImageSource>;
  let firebase: jasmine.SpyObj<FirebaseStorageImageSource>;

  const result = (overrides: Partial<PlayerImageResult> = {}): PlayerImageResult => ({
    url: 'https://example.com/x.png',
    imageSource: 'api',
    ...overrides,
  });

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiFootballImageSource>('Api', ['provide']);
    url = jasmine.createSpyObj<ExternalUrlImageSource>('Url', ['provide']);
    firebase = jasmine.createSpyObj<FirebaseStorageImageSource>('Firebase', ['provide']);
    (api as unknown as { kind: string }).kind = 'api';
    (url as unknown as { kind: string }).kind = 'url';
    (firebase as unknown as { kind: string }).kind = 'firebase';

    TestBed.configureTestingModule({
      providers: [
        PlayerImageFactory,
        { provide: ApiFootballImageSource, useValue: api },
        { provide: ExternalUrlImageSource, useValue: url },
        { provide: FirebaseStorageImageSource, useValue: firebase },
      ],
    });
    factory = TestBed.inject(PlayerImageFactory);
  });

  it('create(kind) returns the matching strategy instance', () => {
    expect(factory.create('api')).toBe(api as unknown as ApiFootballImageSource);
    expect(factory.create('url')).toBe(url as unknown as ExternalUrlImageSource);
    expect(factory.create('firebase')).toBe(firebase as unknown as FirebaseStorageImageSource);
  });

  it('provide(input) dispatches to the api strategy', async () => {
    api.provide.and.resolveTo(result({ imageSource: 'api' }));

    const out = await factory.provide({
      kind: 'api',
      apiUrl: 'https://media.api-sports.io/x.png',
    });

    expect(api.provide).toHaveBeenCalledOnceWith({
      kind: 'api',
      apiUrl: 'https://media.api-sports.io/x.png',
    });
    expect(url.provide).not.toHaveBeenCalled();
    expect(firebase.provide).not.toHaveBeenCalled();
    expect(out.imageSource).toBe('api');
  });

  it('provide(input) dispatches to the url strategy', async () => {
    url.provide.and.resolveTo(result({ imageSource: 'url' }));

    await factory.provide({ kind: 'url', url: 'https://example.com/y.jpg' });

    expect(url.provide).toHaveBeenCalledTimes(1);
    expect(api.provide).not.toHaveBeenCalled();
    expect(firebase.provide).not.toHaveBeenCalled();
  });

  it('provide(input) dispatches to the firebase strategy', async () => {
    firebase.provide.and.resolveTo(
      result({ imageSource: 'firebase', storagePath: 'players/u1/1-a.png' }),
    );
    const file = new File(['x'], 'p.png', { type: 'image/png' });

    const out = await factory.provide({ kind: 'firebase', ownerUid: 'u1', file });

    expect(firebase.provide).toHaveBeenCalledOnceWith({
      kind: 'firebase',
      ownerUid: 'u1',
      file,
    });
    expect(out.storagePath).toBe('players/u1/1-a.png');
  });
});
