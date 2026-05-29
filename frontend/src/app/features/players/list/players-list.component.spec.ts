import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { BackendSwitchService } from '../../../core/services/backend-switch.service';
import { setBackend } from '../../../core/state/backend-choice.signal';
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
      'searchFilteredPage',
      'delete',
    ]);
    api.listPage.and.resolveTo(paged([makePlayer('1'), makePlayer('2')], 2));
    api.searchPage.and.resolveTo(paged([], 0));
    api.searchFilteredPage.and.resolveTo(paged([], 0));
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
          provide: ActionSheetController,
          useValue: jasmine.createSpyObj('ActionSheetController', ['create']),
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        {
          provide: BackendSwitchService,
          useValue: jasmine.createSpyObj('BackendSwitchService', [
            'toggle',
            'sync',
            'switchTo',
          ]),
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PlayersListComponent);
  }

  beforeEach(() => {
    clearSession();
    setBackend('dotnet');
  });
  afterEach(() => {
    clearSession();
    setBackend('dotnet');
  });

  it('loads page 1 on init and renders the header + grid', async () => {
    await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.listPage).toHaveBeenCalledOnceWith(1, 20);
    expect(fixture.nativeElement.querySelector('[data-testid=home-header]')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('[data-testid=player-card]').length).toBe(2);
  });

  it('does NOT render the add FAB when anonymous', async () => {
    await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid=home-fab]')).toBeFalsy();
  });

  it('renders the add FAB when authenticated', async () => {
    await setup();
    const user: AuthUser = { uid: 'u', email: 'a@b.com', displayName: 'A', role: 'user' };
    setSession(user, 'tok');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid=home-fab]')).toBeTruthy();
  });

  it('reloads the grid when the active backend changes', async () => {
    await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const before = api.listPage.calls.count();
    setBackend('node');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.listPage.calls.count()).toBeGreaterThan(before);
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

  it('searches by name via the full filter endpoint', async () => {
    await setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['onSearchQueryChange']('messi');
    await fixture.whenStable();

    expect(api.searchFilteredPage).toHaveBeenCalledWith({ name: 'messi' }, 1, 20);
    expect(fixture.componentInstance['store'].filters().name).toBe('messi');
  });

  it('removes a filter chip and reloads without it', async () => {
    await setup();
    fixture.detectChanges();
    await fixture.whenStable();

    await fixture.componentInstance['store'].reload({ name: 'messi', team: 'Barça' });
    expect(fixture.componentInstance['store'].activeFilterCount()).toBe(1);

    fixture.componentInstance['removeFilter']('team');
    await fixture.whenStable();

    expect(fixture.componentInstance['store'].filters()).toEqual({ name: 'messi' });
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
