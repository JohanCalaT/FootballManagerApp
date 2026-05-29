import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { PlayersApi } from '../../../core/api/players.api';
import { PagedResponse } from '../../../core/models/api-response.model';
import { PlayerListItem } from '../../../core/models/player.model';
import { AuthUser } from '../../../core/models/user.model';
import { clearSession, setSession } from '../../../core/state/auth.signal';

import { PlayersListComponent } from './players-list.component';

function makePlayer(id: string): PlayerListItem {
  return {
    id,
    apiFootballId: null,
    name: `P-${id}`,
    team: 'T',
    league: 'L',
    position: null,
    imageUrl: null,
    rating: null,
    registeredAt: '2026-01-01',
  };
}

function paged(items: PlayerListItem[], total: number, page = 1): PagedResponse<PlayerListItem> {
  return { status: 200, message: 'ok', data: items, page, limit: 20, total, _links: {} };
}

describe('PlayersListComponent (home container)', () => {
  let fixture: ComponentFixture<PlayersListComponent>;
  let api: jasmine.SpyObj<PlayersApi>;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let toastCtrl: jasmine.SpyObj<ToastController>;

  async function setup() {
    api = jasmine.createSpyObj<PlayersApi>('PlayersApi', [
      'listPage',
      'searchPage',
      'delete',
    ]);
    api.listPage.and.resolveTo(paged([makePlayer('1'), makePlayer('2')], 2));
    api.searchPage.and.resolveTo(paged([], 0));
    alertCtrl = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo(),
    } as unknown as HTMLIonToastElement);

    await TestBed.configureTestingModule({
      imports: [PlayersListComponent],
      providers: [
        provideRouter([]),
        { provide: PlayersApi, useValue: api },
        { provide: AlertController, useValue: alertCtrl },
        { provide: ToastController, useValue: toastCtrl },
        {
          provide: AuthService,
          useValue: { signOut: jasmine.createSpy('signOut').and.resolveTo() },
        },
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj('ModalController', ['create', 'dismiss']),
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PlayersListComponent);
  }

  beforeEach(() => clearSession());
  afterEach(() => clearSession());

  it('loads page 1 on init and renders the header + grid', async () => {
    await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.listPage).toHaveBeenCalledOnceWith(1, 20);
    expect(fixture.nativeElement.querySelector('[data-testid=home-header]')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('[data-testid=player-card]').length).toBe(2);
  });

  it('does NOT render the action bar when anonymous', async () => {
    await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid=home-action-bar]')).toBeFalsy();
  });

  it('renders the action bar when authenticated', async () => {
    await setup();
    const user: AuthUser = { uid: 'u', email: 'a@b.com', displayName: 'A', role: 'user' };
    setSession(user, 'tok');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid=home-action-bar]')).toBeTruthy();
  });

  it('navigates to /players/:id when a player tile is selected', async () => {
    await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance['onPlayerSelected'](makePlayer('99'));

    expect(navigate).toHaveBeenCalledOnceWith(['/players', '99']);
  });

  it('navigates to /news/publish when the publish-news action fires', async () => {
    await setup();
    setSession({ uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' }, 'tok');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance['onPublishNews']();

    expect(navigate).toHaveBeenCalledOnceWith(['/news/publish']);
  });

  it('navigates to /news when the news action fires', async () => {
    await setup();
    setSession({ uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' }, 'tok');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance['onNews']();

    expect(navigate).toHaveBeenCalledOnceWith(['/news']);
  });

  it('navigates to /ideal-team when the ideal-team action fires', async () => {
    await setup();
    setSession({ uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' }, 'tok');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance['onIdealTeam']();

    expect(navigate).toHaveBeenCalledOnceWith(['/ideal-team']);
  });

  it('navigates to /players/new when the insert action fires', async () => {
    await setup();
    setSession({ uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' }, 'tok');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance['onInsert']();

    expect(navigate).toHaveBeenCalledOnceWith(['/players/new']);
  });

  it('navigates to /players/:id/edit on edit action', async () => {
    await setup();
    setSession({ uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' }, 'tok');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance['onEditPlayer'](makePlayer('42'));

    expect(navigate).toHaveBeenCalledOnceWith(['/players', '42', 'edit']);
  });

  describe('inline delete from card', () => {
    async function makeAlert(role: 'destructive' | 'cancel'): Promise<void> {
      const onDidDismiss = jasmine.createSpy('onDidDismiss').and.resolveTo({ role });
      const present = jasmine.createSpy('present').and.resolveTo();
      alertCtrl.create.and.resolveTo({ present, onDidDismiss } as unknown as HTMLIonAlertElement);
    }

    it('asks for confirmation with the player name and team in the message', async () => {
      await setup();
      setSession({ uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' }, 'tok');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      await makeAlert('cancel');

      await fixture.componentInstance['onDeletePlayer']({
        ...makePlayer('77'),
        name: 'Lionel Messi',
        team: 'Inter Miami',
      });

      const opts = alertCtrl.create.calls.mostRecent().args[0];
      expect(opts?.header).toBe('Eliminar jugador');
      expect(opts?.subHeader).toBe('Lionel Messi');
      expect(opts?.message).toContain('Lionel Messi');
      expect(opts?.message).toContain('Inter Miami');
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('does nothing when the admin cancels the alert', async () => {
      await setup();
      setSession({ uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' }, 'tok');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      await makeAlert('cancel');

      await fixture.componentInstance['onDeletePlayer'](makePlayer('1'));

      expect(api.delete).not.toHaveBeenCalled();
    });

    it('calls DELETE, drops the card locally, and toasts success on confirm', async () => {
      await setup();
      setSession({ uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' }, 'tok');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      api.delete.and.resolveTo();
      await makeAlert('destructive');

      const store = fixture.componentInstance['store'];
      expect(store.players().length).toBe(2);

      await fixture.componentInstance['onDeletePlayer'](makePlayer('1'));

      expect(api.delete).toHaveBeenCalledOnceWith('1');
      expect(store.players().some((p) => p.id === '1')).toBeFalse();
      expect(store.players().length).toBe(1);
      expect(toastCtrl.create).toHaveBeenCalled();
    });

    it('keeps the card and toasts danger when the backend rejects', async () => {
      await setup();
      setSession({ uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' }, 'tok');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      api.delete.and.rejectWith(new Error('boom'));
      await makeAlert('destructive');

      const store = fixture.componentInstance['store'];

      await fixture.componentInstance['onDeletePlayer'](makePlayer('1'));

      expect(store.players().some((p) => p.id === '1')).toBeTrue();
      expect(toastCtrl.create).toHaveBeenCalled();
      const toastOpts = toastCtrl.create.calls.mostRecent().args[0];
      expect(toastOpts?.color).toBe('danger');
    });
  });
});
