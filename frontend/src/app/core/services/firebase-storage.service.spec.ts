import { TestBed } from '@angular/core/testing';
import { Storage } from '@angular/fire/storage';

import { FirebaseStorageService } from './firebase-storage.service';

/**
 * FirebaseStorageService delegates to the Firebase Storage modular SDK
 * (ref/uploadBytes/getDownloadURL/deleteObject), which needs a real Storage
 * instance and can't be spied through ESM imports under Karma. We assert DI
 * wiring here; the upload/crop/compress paths are exercised through the image
 * picker and manual-create component specs that mock this service.
 */
describe('FirebaseStorageService', () => {
  it('is created with the injected Storage token', () => {
    TestBed.configureTestingModule({
      providers: [FirebaseStorageService, { provide: Storage, useValue: {} }],
    });
    expect(TestBed.inject(FirebaseStorageService)).toBeTruthy();
  });
});
