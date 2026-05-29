import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let comp: ForgotPasswordComponent;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['sendPasswordReset']);
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    comp = fixture.componentInstance;
  });

  it('is created', () => {
    expect(comp).toBeTruthy();
  });

  it('rejects an empty email without calling the API', async () => {
    comp['email'].set('   ');
    await comp['submit'](new Event('submit'));
    expect(auth.sendPasswordReset).not.toHaveBeenCalled();
    expect(comp['emailError']()).toBeTruthy();
  });

  it('sends the reset and flips the sent flag on success', async () => {
    auth.sendPasswordReset.and.resolveTo();
    comp['email'].set('a@b.com');

    await comp['submit'](new Event('submit'));

    expect(auth.sendPasswordReset).toHaveBeenCalledWith('a@b.com');
    expect(comp['sent']()).toBeTrue();
  });

  it('classifies an error and keeps sent false', async () => {
    auth.sendPasswordReset.and.rejectWith({ code: 'auth/invalid-email' });
    comp['email'].set('nope');

    await comp['submit'](new Event('submit'));

    expect(comp['emailError']()).toBeTruthy();
    expect(comp['sent']()).toBeFalse();
  });
});
