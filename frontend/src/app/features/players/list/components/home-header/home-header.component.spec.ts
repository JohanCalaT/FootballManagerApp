import { ComponentFixture, TestBed } from '@angular/core/testing';

import { clearSession, setSession } from '../../../../../core/state/auth.signal';
import { backendChoice, setBackend } from '../../../../../core/state/backend-choice.signal';
import { AuthUser } from '../../../../../core/models/user.model';

import { HomeHeaderComponent } from './home-header.component';

function asUser(role: 'admin' | 'user'): AuthUser {
  return {
    uid: 'u1',
    email: 'a@b.com',
    displayName: 'Alice Cala',
    role,
  };
}

describe('HomeHeaderComponent', () => {
  let fixture: ComponentFixture<HomeHeaderComponent>;

  beforeEach(async () => {
    clearSession();
    setBackend('dotnet');
    await TestBed.configureTestingModule({
      imports: [HomeHeaderComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeHeaderComponent);
  });

  afterEach(() => clearSession());

  it('shows the single Entrar CTA + settings cog when anonymous', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid=home-login-button]')).toBeTruthy();
    expect(el.querySelector('[data-testid=home-settings-trigger]')).toBeTruthy();
    expect(el.querySelector('[data-testid=home-user-menu-trigger]')).toBeFalsy();
  });

  it('shows the avatar trigger when authenticated and hides the cog', () => {
    setSession(asUser('user'), 'tok');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid=home-user-menu-trigger]')).toBeTruthy();
    expect(el.querySelector('[data-testid=home-settings-trigger]')).toBeFalsy();
    expect(el.querySelector('[data-testid=home-login-button]')).toBeFalsy();
  });

  it('derives initials from the display name', () => {
    setSession(asUser('user'), 'tok');
    fixture.detectChanges();
    const initials = fixture.nativeElement.querySelector('[data-testid=home-user-menu-trigger]')
      ?.textContent?.trim();
    expect(initials).toBe('AC');
  });

  it('emits loginRequested when the Entrar CTA is clicked', () => {
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    fixture.componentInstance.loginRequested.subscribe(spy);
    (fixture.nativeElement.querySelector('[data-testid=home-login-button]') as HTMLElement).click();
    expect(spy).toHaveBeenCalled();
  });

  it('toggles the backend signal when the menu chip is clicked', () => {
    fixture.detectChanges();
    expect(backendChoice()).toBe('dotnet');
    fixture.componentInstance['onToggleBackend']();
    expect(backendChoice()).toBe('node');
  });

  it('emits logoutRequested when the logout row is invoked', () => {
    setSession(asUser('user'), 'tok');
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    fixture.componentInstance.logoutRequested.subscribe(spy);
    fixture.componentInstance['onLogout']();
    expect(spy).toHaveBeenCalled();
  });
});
