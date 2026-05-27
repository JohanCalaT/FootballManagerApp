import { ComponentFixture, TestBed } from '@angular/core/testing';

import { clearSession, setSession } from '../../../../../core/state/auth.signal';
import { AuthUser } from '../../../../../core/models/user.model';

import { HomeActionBarComponent } from './home-action-bar.component';

const adminUser: AuthUser = {
  uid: 'a',
  email: 'a@b.com',
  displayName: 'Admin',
  role: 'admin',
};

describe('HomeActionBarComponent', () => {
  let fixture: ComponentFixture<HomeActionBarComponent>;

  beforeEach(async () => {
    clearSession();
    await TestBed.configureTestingModule({
      imports: [HomeActionBarComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeActionBarComponent);
  });

  afterEach(() => clearSession());

  it('shows 3 base buttons by default', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid=home-import-button]')).toBeTruthy();
    expect(el.querySelector('[data-testid=home-insert-button]')).toBeTruthy();
    expect(el.querySelector('[data-testid=home-ideal-team-button]')).toBeTruthy();
    expect(el.querySelector('[data-testid=home-publish-news-button]')).toBeFalsy();
  });

  it('adds the admin button when isAdmin', () => {
    setSession(adminUser, 't');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid=home-publish-news-button]')).toBeTruthy();
  });

  it('emits importRequested when import is clicked', () => {
    fixture.detectChanges();
    const spy = jasmine.createSpy();
    fixture.componentInstance.importRequested.subscribe(spy);
    (fixture.nativeElement.querySelector('[data-testid=home-import-button]') as HTMLElement).click();
    expect(spy).toHaveBeenCalled();
  });
});
