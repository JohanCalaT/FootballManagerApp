import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { adminGuard } from './admin.guard';
import { clearSession, setSession } from '../state/auth.signal';
import { AuthUser } from '../models/user.model';

const admin: AuthUser = { uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' };
const regular: AuthUser = { uid: 'u', email: 'u@b.com', displayName: 'U', role: 'user' };

function run() {
  return TestBed.runInInjectionContext(() =>
    adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

describe('adminGuard', () => {
  beforeEach(() => {
    clearSession();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => clearSession());

  it('redirects anonymous users to /auth/login', () => {
    const result = run();
    expect((result as UrlTree).toString()).toBe('/auth/login');
  });

  it('redirects authenticated non-admins to /players', () => {
    setSession(regular, 'tok');
    const result = run();
    expect((result as UrlTree).toString()).toBe('/players');
  });

  it('allows activation for admins', () => {
    setSession(admin, 'tok');
    expect(run()).toBeTrue();
  });
});
