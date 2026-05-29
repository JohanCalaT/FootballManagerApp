import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let comp: LoginComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'signInWithEmail',
      'signInWithGoogle',
    ]);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    comp = fixture.componentInstance;
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  it('is created', () => {
    expect(comp).toBeTruthy();
  });

  it('signs in and navigates to /players on success', async () => {
    auth.signInWithEmail.and.resolveTo();
    comp['email'].set('a@b.com');
    comp['password'].set('secret');

    await comp['submit'](new Event('submit'));

    expect(auth.signInWithEmail).toHaveBeenCalledWith('a@b.com', 'secret');
    expect(navigate).toHaveBeenCalledWith(['/players']);
    expect(comp['loading']()).toBeFalse();
  });

  it('classifies the error and does not navigate on failure', async () => {
    auth.signInWithEmail.and.rejectWith({ code: 'auth/invalid-credential' });
    comp['email'].set('a@b.com');
    comp['password'].set('bad');

    await comp['submit'](new Event('submit'));

    expect(comp['formError']()).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('signs in with Google and navigates', async () => {
    auth.signInWithGoogle.and.resolveTo();
    await comp['signInWithGoogle']();
    expect(navigate).toHaveBeenCalledWith(['/players']);
  });

  it('goBack navigates to /players', () => {
    comp['goBack']();
    expect(navigate).toHaveBeenCalledWith(['/players']);
  });
});
