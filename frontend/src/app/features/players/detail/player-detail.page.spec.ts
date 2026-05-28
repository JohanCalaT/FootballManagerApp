import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/standalone';

import { CommentsApi } from '../../../core/api/comments.api';
import { PlayersApi } from '../../../core/api/players.api';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Comment } from '../../../core/models/comment.model';
import { Player } from '../../../core/models/player.model';
import { clearSession, setSession } from '../../../core/state/auth.signal';

import { PlayerDetailPage } from './player-detail.page';

function basePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'guid-1',
    apiFootballId: null,
    name: 'Pedri',
    firstName: 'Pedro',
    lastName: 'González',
    nationality: 'España',
    birthDate: '2002-11-25',
    birthPlace: 'Tegueste',
    birthCountry: 'España',
    height: '174 cm',
    weight: '60 kg',
    position: 'Midfielder',
    shirtNumber: 8,
    injured: false,
    imageUrl: null,
    imageSource: null,
    team: 'Barcelona',
    league: 'La Liga',
    registeredAt: '2026-01-01T00:00:00Z',
    createdByUserId: 'u-creator',
    clientGeolocation: null,
    playerGeolocation: null,
    version: 1,
    statistics: [],
    ...overrides,
  };
}

describe('PlayerDetailPage', () => {
  let fixture: ComponentFixture<PlayerDetailPage>;
  let page: PlayerDetailPage;
  let playersApi: jasmine.SpyObj<PlayersApi>;
  let commentsApi: jasmine.SpyObj<CommentsApi>;

  async function build(player: Player, comments: Comment[] = []): Promise<void> {
    playersApi = jasmine.createSpyObj<PlayersApi>('PlayersApi', ['getByIdOnce']);
    playersApi.getByIdOnce.and.resolveTo({ status: 200, data: player } as ApiResponse<Player>);

    commentsApi = jasmine.createSpyObj<CommentsApi>('CommentsApi', ['byPlayer', 'create', 'delete']);
    commentsApi.byPlayer.and.resolveTo({ status: 200, data: comments } as ApiResponse<Comment[]>);

    await TestBed.configureTestingModule({
      imports: [PlayerDetailPage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: PlayersApi, useValue: playersApi },
        { provide: CommentsApi, useValue: commentsApi },
        {
          provide: ToastController,
          useValue: {
            create: jasmine.createSpy('create').and.resolveTo({
              present: jasmine.createSpy('present').and.resolveTo(),
            }),
          },
        },
        {
          provide: AlertController,
          useValue: { create: jasmine.createSpy('create') },
        },
        {
          provide: GeolocationService,
          useValue: { requestClientPosition: () => Promise.resolve(null) },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: player.id }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerDetailPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    // Let the nested comments-section finish its initial fetch too.
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  beforeEach(() => clearSession());
  afterEach(() => clearSession());

  it('loads the player and renders the hero with team and league', async () => {
    await build(basePlayer());
    const hero = fixture.nativeElement.querySelector('[data-testid="detail-hero"]');
    expect(hero).toBeTruthy();
    expect(hero.textContent).toContain('Pedri');
    expect(hero.textContent).toContain('Barcelona');
    expect(hero.textContent).toContain('La Liga');
  });

  it('shows the imported chip when apiFootballId is set', async () => {
    await build(basePlayer({ apiFootballId: 154 }));
    const chip = fixture.nativeElement.querySelector('[data-testid="chip-imported"]');
    expect(chip).toBeTruthy();
  });

  it('hides the injured chip when the player is not injured', async () => {
    await build(basePlayer({ injured: false }));
    const chip = fixture.nativeElement.querySelector('[data-testid="chip-injured"]');
    expect(chip).toBeFalsy();
  });

  it('shows an empty stats state when the player has no statistics', async () => {
    await build(basePlayer({ statistics: [] }));
    const empty = fixture.nativeElement.querySelector('[data-testid="stats-empty"]');
    expect(empty).toBeTruthy();
  });

  it('shows the edit button only for admin users', async () => {
    await build(basePlayer());
    expect(fixture.nativeElement.querySelector('[data-testid="action-edit"]')).toBeFalsy();

    setSession({ uid: 'a', email: 'a@x.com', displayName: 'A', role: 'admin' }, 'tok');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="action-edit"]')).toBeTruthy();
  });

  it('navigates back to /players when the API returns no player', async () => {
    playersApi = jasmine.createSpyObj<PlayersApi>('PlayersApi', ['getByIdOnce']);
    playersApi.getByIdOnce.and.resolveTo({ status: 404, message: 'not found', data: null, _links: {} } as unknown as ApiResponse<Player>);
    commentsApi = jasmine.createSpyObj<CommentsApi>('CommentsApi', ['byPlayer', 'create', 'delete']);
    commentsApi.byPlayer.and.resolveTo({ status: 200, message: 'OK', data: [], _links: {} } as ApiResponse<Comment[]>);

    await TestBed.configureTestingModule({
      imports: [PlayerDetailPage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: PlayersApi, useValue: playersApi },
        { provide: CommentsApi, useValue: commentsApi },
        {
          provide: ToastController,
          useValue: {
            create: jasmine.createSpy('create').and.resolveTo({
              present: jasmine.createSpy('present').and.resolveTo(),
            }),
          },
        },
        { provide: AlertController, useValue: { create: jasmine.createSpy('create') } },
        {
          provide: GeolocationService,
          useValue: { requestClientPosition: () => Promise.resolve(null) },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'missing' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerDetailPage);
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigate).toHaveBeenCalledWith(['/players']);
  });
});
