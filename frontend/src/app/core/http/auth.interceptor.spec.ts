import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { authInterceptor } from './auth.interceptor';
import { clearSession, setSession } from '../state/auth.signal';
import { AuthUser } from '../models/user.model';

const user: AuthUser = { uid: 'u1', email: 'a@b.com', displayName: 'A', role: 'user' };

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    clearSession();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    clearSession();
  });

  it('does not add Authorization when there is no token', () => {
    http.get('/api/x').subscribe();
    const req = httpMock.expectOne('/api/x');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('adds the Bearer token when a session exists', () => {
    setSession(user, 'tok-123');
    http.get('/api/x').subscribe();
    const req = httpMock.expectOne('/api/x');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-123');
    req.flush({});
  });
});
