import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let comp: RegisterComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['signUpWithEmail']);
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(RegisterComponent);
    comp = fixture.componentInstance;
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  function fillValid(): void {
    comp['displayName'].set('Alice');
    comp['email'].set('a@b.com');
    comp['password'].set('secret1');
  }

  it('is created', () => {
    expect(comp).toBeTruthy();
  });

  it('gates canSubmit on name, email and a 6+ char password', () => {
    expect(comp['canSubmit']()).toBeFalse();
    fillValid();
    expect(comp['canSubmit']()).toBeTrue();
    comp['password'].set('123'); // too short
    expect(comp['canSubmit']()).toBeFalse();
  });

  it('registers and navigates on success', async () => {
    auth.signUpWithEmail.and.resolveTo();
    fillValid();

    await comp['submit'](new Event('submit'));

    expect(auth.signUpWithEmail).toHaveBeenCalledWith('a@b.com', 'secret1', 'Alice');
    expect(navigate).toHaveBeenCalledWith(['/players']);
  });

  it('does not submit when the form is incomplete', async () => {
    await comp['submit'](new Event('submit'));
    expect(auth.signUpWithEmail).not.toHaveBeenCalled();
  });

  it('surfaces a field error on failure', async () => {
    auth.signUpWithEmail.and.rejectWith({ code: 'auth/email-already-in-use' });
    fillValid();

    await comp['submit'](new Event('submit'));

    expect(comp['emailError']()).toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });
});
