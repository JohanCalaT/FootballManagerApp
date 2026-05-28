import { TestBed } from '@angular/core/testing';

import { FirebaseStorageService } from '../../firebase-storage.service';
import { FirebaseStorageImageSource } from './firebase-storage-image.source';
import { ImageSourceError } from './player-image-source';

describe('FirebaseStorageImageSource', () => {
  let source: FirebaseStorageImageSource;
  let storage: jasmine.SpyObj<FirebaseStorageService>;

  beforeEach(() => {
    storage = jasmine.createSpyObj<FirebaseStorageService>('FirebaseStorageService', [
      'upload',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [
        FirebaseStorageImageSource,
        { provide: FirebaseStorageService, useValue: storage },
      ],
    });

    source = TestBed.inject(FirebaseStorageImageSource);
  });

  function fakeImage(name = 'photo.png', type = 'image/png', size = 1024): File {
    const blob = new Blob(['x'.repeat(size)], { type });
    return new File([blob], name, { type });
  }

  it('uploads under players/{uid}/... and returns url + storagePath + firebase tag', async () => {
    storage.upload.and.resolveTo({
      url: 'https://firebasestorage.example/players/u1/123-abc.png',
      path: 'players/u1/123-abc.png',
    });

    const result = await source.provide({
      kind: 'firebase',
      ownerUid: 'u1',
      file: fakeImage(),
    });

    expect(storage.upload).toHaveBeenCalledTimes(1);
    const [path, file] = storage.upload.calls.mostRecent().args;
    expect(path).toMatch(/^players\/u1\/\d+-[a-z0-9]+\.png$/);
    expect((file as File).name).toBe('photo.png');

    expect(result.imageSource).toBe('firebase');
    expect(result.url).toBe('https://firebasestorage.example/players/u1/123-abc.png');
    expect(result.storagePath).toBe(path);
  });

  it('rejects when ownerUid is missing (would 403 against storage.rules anyway)', async () => {
    await expectAsync(
      source.provide({ kind: 'firebase', ownerUid: '', file: fakeImage() }),
    ).toBeRejectedWithError(ImageSourceError, /uid/i);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejects an empty file', async () => {
    const empty = new File([], 'empty.png', { type: 'image/png' });
    await expectAsync(
      source.provide({ kind: 'firebase', ownerUid: 'u1', file: empty }),
    ).toBeRejectedWithError(ImageSourceError, /no se seleccionó/i);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('rejects non-image MIME types so we never push PDFs to the bucket', async () => {
    const pdf = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' });
    await expectAsync(
      source.provide({ kind: 'firebase', ownerUid: 'u1', file: pdf }),
    ).toBeRejectedWithError(ImageSourceError, /solo se permiten imágenes/i);
  });

  it('wraps unexpected storage errors into ImageSourceError', async () => {
    storage.upload.and.rejectWith(new Error('network down'));

    await expectAsync(
      source.provide({ kind: 'firebase', ownerUid: 'u1', file: fakeImage() }),
    ).toBeRejectedWithError(ImageSourceError, /no se pudo subir/i);
  });
});
