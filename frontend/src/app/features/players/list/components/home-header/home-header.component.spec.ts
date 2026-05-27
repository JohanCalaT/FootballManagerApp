import { ComponentFixture, TestBed } from '@angular/core/testing';

import { clearSession, setSession } from '../../../../../core/state/auth.signal';
import { AuthUser } from '../../../../../core/models/user.model';

import { HomeHeaderComponent } from './home-header.component';

function asUser(role: 'admin' | 'user'): AuthUser {
  return {
    uid: 'u1',
    email: 'a@b.com',
    displayName: 'Alice',
    role,
  };
}

describe('HomeHeaderComponent', () => {
  let fixture: ComponentFixture<HomeHeaderComponent>;

  beforeEach(async () => {
    clearSession();
    await TestBed.configureTestingModule({
      imports: [HomeHeaderComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeHeaderComponent);
  });

  afterEach(() => clearSession());

  it('shows login and register CTAs when anonymous', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid=home-login-button]')).toBeTruthy();
    expect(el.querySelector('[data-testid=home-register-button]')).toBeTruthy();
    expect(el.querySelector('[data-testid=home-user-greeting]')).toBeFalsy();
  });

  it('shows greeting and logout when authenticated', () => {
    setSession(asUser('user'), 'tok');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid=home-user-greeting]')?.textContent).toContain('Alice');
    expect(el.querySelector('[data-testid=home-logout-button]')).toBeTruthy();
    expect(el.querySelector('[data-testid=home-user-badge-admin]')).toBeFalsy();
    expect(el.querySelector('[data-testid=home-login-button]')).toBeFalsy();
  });

  it('shows admin badge when role is admin', () => {
    setSession(asUser('admin'), 'tok');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid=home-user-badge-admin]')).toBeTruthy();
  });

  it('emits loginRequested when login button is clicked', () => {
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    fixture.componentInstance.loginRequested.subscribe(spy);
    (fixture.nativeElement.querySelector('[data-testid=home-login-button]') as HTMLElement).click();
    expect(spy).toHaveBeenCalled();
  });

  it('emits logoutRequested when logout button is clicked', () => {
    setSession(asUser('user'), 'tok');
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    fixture.componentInstance.logoutRequested.subscribe(spy);
    (fixture.nativeElement.querySelector('[data-testid=home-logout-button]') as HTMLElement).click();
    expect(spy).toHaveBeenCalled();
  });
});
