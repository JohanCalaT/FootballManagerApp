import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthUser } from '../../core/models/user.model';
import { clearSession, setSession } from '../../core/state/auth.signal';

import { TabsComponent } from './tabs.component';

describe('TabsComponent', () => {
  let fixture: ComponentFixture<TabsComponent>;

  const user: AuthUser = { uid: 'u', email: 'a@b.com', displayName: 'A', role: 'user' };

  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [TabsComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(TabsComponent);
  }

  beforeEach(() => clearSession());
  afterEach(() => clearSession());

  it('creates and always renders the Jugadores tab', async () => {
    await setup();
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid=tab-players]')).toBeTruthy();
  });

  it('hides the registered-only tabs when anonymous', async () => {
    await setup();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid=tab-ideal-team]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[data-testid=tab-news]')).toBeFalsy();
  });

  it('reveals the Equipo ideal and Noticias tabs once authenticated', async () => {
    await setup();
    setSession(user, 'tok');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid=tab-ideal-team]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid=tab-news]')).toBeTruthy();
  });
});
