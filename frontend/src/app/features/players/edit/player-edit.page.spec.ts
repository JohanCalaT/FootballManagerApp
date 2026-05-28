import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/standalone';

import { PlayersApi } from '../../../core/api/players.api';
import { CameraService } from '../../../core/services/camera.service';
import { FirebaseStorageService } from '../../../core/services/firebase-storage.service';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { PlayerImageFactory } from '../../../core/services/strategies/image/player-image.factory';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Player } from '../../../core/models/player.model';
import { setSession } from '../../../core/state/auth.signal';
import { PlayerEditPage } from './player-edit.page';

describe('PlayerEditPage', () => {
  let fixture: ComponentFixture<PlayerEditPage>;
  let page: PlayerEditPage;
  let api: jasmine.SpyObj<PlayersApi>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let alertCtrl: jasmine.SpyObj<AlertController>;
  let router: Router;

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
      version: 3,
      statistics: [],
      ...overrides,
    };
  }

  async function build(player: Player): Promise<void> {
    api = jasmine.createSpyObj<PlayersApi>('PlayersApi', [
      'getByIdOnce',
      'update',
      'delete',
    ]);
    api.getByIdOnce.and.resolveTo({ status: 200, data: player } as ApiResponse<Player>);

    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo(),
    } as unknown as HTMLIonToastElement);

    alertCtrl = jasmine.createSpyObj<AlertController>('AlertController', ['create']);

    setSession(
      { uid: 'u-admin', email: 'a@b.com', displayName: 'A', role: 'admin' },
      'fake-token',
    );

    await TestBed.configureTestingModule({
      imports: [PlayerEditPage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: PlayersApi, useValue: api },
        { provide: ToastController, useValue: toastCtrl },
        { provide: AlertController, useValue: alertCtrl },
        { provide: GeolocationService, useValue: { requestClientPosition: () => Promise.resolve(null) } },
        { provide: PlayerImageFactory, useValue: jasmine.createSpyObj('PlayerImageFactory', ['create', 'provide']) },
        { provide: CameraService, useValue: jasmine.createSpyObj('CameraService', ['pickFromFile', 'pickFromCamera', 'pickFromGallery']) },
        { provide: FirebaseStorageService, useValue: jasmine.createSpyObj('FirebaseStorageService', ['upload', 'delete']) },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: player.id }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerEditPage);
    page = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('loads the player and patches the form', async () => {
    await build(basePlayer());

    expect(api.getByIdOnce).toHaveBeenCalledOnceWith('guid-1');
    expect(page['form'].controls.name.value).toBe('Pedri');
    expect(page['form'].controls.team.value).toBe('Barcelona');
    expect(page['form'].controls.position.value).toBe('Midfielder');
    expect(page['form'].controls.shirtNumber.value).toBe(8);
  });

  it('disables biographical fields when the player is imported', async () => {
    await build(basePlayer({ apiFootballId: 154 }));

    expect(page['form'].controls.name.disabled).toBeTrue();
    expect(page['form'].controls.firstName.disabled).toBeTrue();
    expect(page['form'].controls.nationality.disabled).toBeTrue();
    expect(page['form'].controls.birthDate.disabled).toBeTrue();
    // Mutable fields stay enabled
    expect(page['form'].controls.team.enabled).toBeTrue();
    expect(page['form'].controls.shirtNumber.enabled).toBeTrue();
    expect(page['form'].controls.injured.enabled).toBeTrue();
  });

  it('keeps biographical fields editable when the player is manual', async () => {
    await build(basePlayer({ apiFootballId: null }));

    expect(page['form'].controls.name.enabled).toBeTrue();
    expect(page['form'].controls.birthDate.enabled).toBeTrue();
  });

  it('submits with the captured version as If-Match', async () => {
    await build(basePlayer({ version: 7 }));
    api.update.and.resolveTo({ status: 200, data: basePlayer() } as ApiResponse<Player>);

    await page.onSubmit();

    expect(api.update).toHaveBeenCalledTimes(1);
    const [id, dto, version] = api.update.calls.mostRecent().args;
    expect(id).toBe('guid-1');
    expect(version).toBe(7);
    expect(dto.team).toBe('Barcelona');
  });

  it('surfaces 412 from the backend as a conflict toast (does not navigate away)', async () => {
    await build(basePlayer());
    api.update.and.rejectWith(
      new HttpErrorResponse({ status: 412, statusText: 'Precondition Failed' }),
    );

    await page.onSubmit();

    expect(router.navigate).not.toHaveBeenCalledWith(['/players']);
    expect(toastCtrl.create).toHaveBeenCalled();
  });

  it('asks for confirmation before deleting and skips when user cancels', async () => {
    await build(basePlayer());
    const present = jasmine.createSpy('present').and.resolveTo();
    const onDidDismiss = jasmine.createSpy('onDidDismiss').and.resolveTo({ role: 'cancel' });
    alertCtrl.create.and.resolveTo({ present, onDidDismiss } as unknown as HTMLIonAlertElement);

    await page.onDelete();

    expect(alertCtrl.create).toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('calls DELETE and navigates back when the user confirms', async () => {
    await build(basePlayer());
    const present = jasmine.createSpy('present').and.resolveTo();
    const onDidDismiss = jasmine.createSpy('onDidDismiss').and.resolveTo({ role: 'destructive' });
    alertCtrl.create.and.resolveTo({ present, onDidDismiss } as unknown as HTMLIonAlertElement);
    api.delete.and.resolveTo();

    await page.onDelete();

    expect(api.delete).toHaveBeenCalledOnceWith('guid-1');
    expect(router.navigate).toHaveBeenCalledWith(['/players']);
  });
});
