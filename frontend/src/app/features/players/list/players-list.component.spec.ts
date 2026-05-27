import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { ComingSoonService } from '../../../core/services/coming-soon.service';
import { PlayersApi } from '../../../core/api/players.api';
import { PagedResponse } from '../../../core/models/api-response.model';
import { PlayerListItem } from '../../../core/models/player.model';
import { AuthUser } from '../../../core/models/user.model';
import { clearSession, setSession } from '../../../core/state/auth.signal';

import { PlayersListComponent } from './players-list.component';

function makePlayer(id: string): PlayerListItem {
  return {
    id,
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
  let comingSoon: jasmine.SpyObj<ComingSoonService>;

  async function setup() {
    api = jasmine.createSpyObj<PlayersApi>('PlayersApi', ['listPage', 'searchPage']);
    api.listPage.and.resolveTo(paged([makePlayer('1'), makePlayer('2')], 2));
    api.searchPage.and.resolveTo(paged([], 0));
    comingSoon = jasmine.createSpyObj<ComingSoonService>('ComingSoonService', ['notify']);
    comingSoon.notify.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [PlayersListComponent],
      providers: [
        provideRouter([]),
        { provide: PlayersApi, useValue: api },
        { provide: ComingSoonService, useValue: comingSoon },
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

  it('notifies coming-soon when a player tile is selected', async () => {
    await setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance['onPlayerSelected'](makePlayer('99'));
    expect(comingSoon.notify).toHaveBeenCalledWith('Detalle de jugador');
  });

  it('notifies coming-soon for each action-bar button', async () => {
    await setup();
    setSession({ uid: 'a', email: 'a@b.com', displayName: 'A', role: 'admin' }, 'tok');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // onImport now opens a real modal — covered by its own spec; we only
    // verify the remaining placeholder buttons still notify coming-soon.
    fixture.componentInstance['onInsert']();
    fixture.componentInstance['onIdealTeam']();
    fixture.componentInstance['onPublishNews']();
    fixture.componentInstance['onEditPlayer'](makePlayer('1'));
    fixture.componentInstance['onDeletePlayer'](makePlayer('1'));

    const calls = comingSoon.notify.calls.allArgs().map((c) => c[0]);
    expect(calls).toEqual([
      'Insertar jugador',
      'Equipo Ideal',
      'Publicar noticia',
      'Editar jugador',
      'Eliminar jugador',
    ]);
  });
});
