import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { authGuard } from './auth.guard';
import { clearSession, setSession } from '../state/auth.signal';
import { AuthUser } from '../models/user.model';

const user: AuthUser = { uid: 'u1', email: 'a@b.com', displayName: 'A', role: 'user' };

function run() {
  return TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

describe('authGuard', () => {
  beforeEach(() => {
    clearSession();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => clearSession());

  it('allows activation when authenticated', () => {
    setSession(user, 'tok');
    expect(run()).toBeTrue();
  });

  it('redirects to /auth/login when anonymous', () => {
    const result = run();
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/auth/login');
  });
});
