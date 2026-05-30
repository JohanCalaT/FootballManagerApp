import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { errorInterceptor } from './error.interceptor';
import { clearSession, isAuthenticated, setSession } from '../state/auth.signal';
import { AuthUser } from '../models/user.model';

const user: AuthUser = { uid: 'u1', email: 'a@b.com', displayName: 'A', role: 'user' };

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    clearSession();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => {
    httpMock.verify();
    clearSession();
  });

  it('clears the session and redirects on 401', () => {
    setSession(user, 'tok');
    http.get('/api/x').subscribe({ next: () => {}, error: () => {} });
    httpMock.expectOne('/api/x').flush('no', { status: 401, statusText: 'Unauthorized' });

    expect(isAuthenticated()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('leaves the session untouched on non-401 errors', () => {
    setSession(user, 'tok');
    http.get('/api/y').subscribe({ next: () => {}, error: () => {} });
    httpMock.expectOne('/api/y').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(isAuthenticated()).toBeTrue();
    expect(navigate).not.toHaveBeenCalled();
  });
});
