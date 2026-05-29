import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';

import { AuthService } from './auth.service';

/**
 * AuthService is a thin wrapper over the Firebase modular SDK. The SDK calls
 * (signInWithEmailAndPassword, etc.) can't be spied through ESM imports under
 * Karma, so these tests cover what does NOT delegate to a free SDK function:
 * the constructor wiring (onIdTokenChanged subscription) and refreshToken,
 * which reads `auth.currentUser` directly.
 */
describe('AuthService', () => {
  let unsubscribe: jasmine.Spy;
  let getIdToken: jasmine.Spy;
  let authMock: {
    onIdTokenChanged: jasmine.Spy;
    currentUser: { getIdToken: jasmine.Spy } | null;
  };

  beforeEach(() => {
    unsubscribe = jasmine.createSpy('unsubscribe');
    getIdToken = jasmine.createSpy('getIdToken').and.resolveTo('token');
    authMock = {
      onIdTokenChanged: jasmine.createSpy('onIdTokenChanged').and.returnValue(unsubscribe),
      currentUser: null,
    };
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: Auth, useValue: authMock }],
    });
  });

  it('subscribes to ID-token changes on creation', () => {
    const service = TestBed.inject(AuthService);
    expect(service).toBeTruthy();
    expect(authMock.onIdTokenChanged).toHaveBeenCalled();
  });

  it('refreshToken forces a token refresh on the current user', async () => {
    authMock.currentUser = { getIdToken };
    const service = TestBed.inject(AuthService);

    await service.refreshToken();

    expect(getIdToken).toHaveBeenCalledWith(true);
  });

  it('refreshToken is a no-op when there is no current user', async () => {
    authMock.currentUser = null;
    const service = TestBed.inject(AuthService);

    await expectAsync(service.refreshToken()).toBeResolved();
  });
});
