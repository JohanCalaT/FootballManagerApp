import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { of } from 'rxjs';

import { PlayersApi } from '../../../core/api/players.api';
import { CameraService } from '../../../core/services/camera.service';
import { FirebaseStorageService } from '../../../core/services/firebase-storage.service';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { PlayerImageFactory } from '../../../core/services/strategies/image/player-image.factory';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Player } from '../../../core/models/player.model';
import { setSession } from '../../../core/state/auth.signal';
import { ManualPlayerCreatePage } from './manual-player-create.page';

describe('ManualPlayerCreatePage', () => {
  let fixture: ComponentFixture<ManualPlayerCreatePage>;
  let page: ManualPlayerCreatePage;
  let api: jasmine.SpyObj<PlayersApi>;
  let geo: jasmine.SpyObj<GeolocationService>;
  let toastCtrl: jasmine.SpyObj<ToastController>;
  let router: Router;

  function fillRequired(): void {
    page['form'].controls.name.setValue('Lionel Messi');
    page['form'].controls.position.setValue('Attacker');
    page['form'].controls.team.setValue('Inter Miami');
    page['form'].controls.league.setValue('MLS');
  }

  /**
   * The form has a 400ms debounced async validator (name+team duplicate).
   * Tests that exercise submit() must wait for it to settle, otherwise the
   * submit guard sees `form.pending === true` and exits early.
   */
  async function waitForValidation(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  beforeEach(async () => {
    api = jasmine.createSpyObj<PlayersApi>('PlayersApi', [
      'create',
      'existsByNameAndTeam',
    ]);
    api.existsByNameAndTeam.and.returnValue(of(false));

    geo = jasmine.createSpyObj<GeolocationService>('GeolocationService', [
      'requestClientPosition',
    ]);
    geo.requestClientPosition.and.resolveTo(null);

    toastCtrl = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastCtrl.create.and.resolveTo({
      present: jasmine.createSpy('present').and.resolveTo(),
    } as unknown as HTMLIonToastElement);

    // Real session so the picker can mount with a non-empty ownerUid; the
    // image strategies are stubbed so the picker never touches storage.
    setSession(
      { uid: 'u1', email: 'u@x.com', displayName: 'U', role: 'user' },
      'fake-token',
    );

    const factory = jasmine.createSpyObj<PlayerImageFactory>('PlayerImageFactory', [
      'create',
      'provide',
    ]);

    await TestBed.configureTestingModule({
      imports: [ManualPlayerCreatePage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: PlayersApi, useValue: api },
        { provide: GeolocationService, useValue: geo },
        { provide: ToastController, useValue: toastCtrl },
        { provide: PlayerImageFactory, useValue: factory },
        {
          provide: CameraService,
          useValue: jasmine.createSpyObj<CameraService>('CameraService', ['pickFromFile']),
        },
        {
          provide: FirebaseStorageService,
          useValue: jasmine.createSpyObj<FirebaseStorageService>('FirebaseStorageService', [
            'upload',
            'delete',
          ]),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManualPlayerCreatePage);
    page = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture.detectChanges();
  });

  it('starts with an invalid form (required fields empty)', () => {
    expect(page['form'].invalid).toBeTrue();
    expect(page['form'].controls.name.hasError('required')).toBeTrue();
    expect(page['form'].controls.position.hasError('required')).toBeTrue();
    expect(page['form'].controls.team.hasError('required')).toBeTrue();
    expect(page['form'].controls.league.hasError('required')).toBeTrue();
  });

  it('disables the submit button while invalid', () => {
    const btn = fixture.debugElement.query(By.css('[data-testid="action-submit"]'));
    expect(btn.nativeElement.disabled).toBeTrue();
  });

  it('does not POST when the form is invalid (and marks fields touched)', async () => {
    await page.onSubmit();

    expect(api.create).not.toHaveBeenCalled();
    expect(page['form'].controls.name.touched).toBeTrue();
  });

  it('posts a normalized CreatePlayerRequest and navigates back to the list on success', async () => {
    fillRequired();
    page['form'].controls.firstName.setValue('  Lionel  ');
    page['form'].controls.shirtNumber.setValue(10);
    api.create.and.resolveTo({
      status: 201,
      data: { id: 'guid-1', name: 'Lionel Messi' } as Player,
    } as ApiResponse<Player>);
    geo.requestClientPosition.and.resolveTo({
      lat: 36.85,
      lng: -2.46,
      city: null,
      country: null,
    });

    await waitForValidation();
    await page.onSubmit();

    expect(geo.requestClientPosition).toHaveBeenCalledOnceWith({ silent: true });
    expect(api.create).toHaveBeenCalledTimes(1);
    const dto = api.create.calls.mostRecent().args[0];
    expect(dto.name).toBe('Lionel Messi');
    expect(dto.team).toBe('Inter Miami');
    expect(dto.league).toBe('MLS');
    expect(dto.position).toBe('Attacker');
    expect(dto.firstName).toBe('Lionel');
    expect(dto.shirtNumber).toBe(10);
    expect(dto.imageUrl).toBeNull();
    expect(dto.injured).toBeFalse();
    expect(dto.clientGeolocation).toEqual({
      lat: 36.85,
      lng: -2.46,
      city: null,
      country: null,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/players']);
  });

  it('surfaces a 409 from the backend as an inline duplicate warning', async () => {
    fillRequired();
    api.create.and.rejectWith(
      new HttpErrorResponse({ status: 409, statusText: 'Conflict' }),
    );

    await waitForValidation();
    await page.onSubmit();

    expect(page['form'].hasError('nameTeamDuplicate')).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('includes the player geolocation in the DTO when the user picked a pin', async () => {
    fillRequired();
    page['playerGeolocation'].set({
      lat: 36.85,
      lng: -2.46,
      city: null,
      country: null,
    });
    api.create.and.resolveTo({ status: 201, data: null } as ApiResponse<Player>);

    await waitForValidation();
    await page.onSubmit();

    expect(api.create).toHaveBeenCalledTimes(1);
    const dto = api.create.calls.mostRecent().args[0];
    expect(dto.playerGeolocation).toEqual({
      lat: 36.85,
      lng: -2.46,
      city: null,
      country: null,
    });
  });

  it('still submits when the user denies geolocation (silent → null)', async () => {
    fillRequired();
    geo.requestClientPosition.and.resolveTo(null);
    api.create.and.resolveTo({ status: 201, data: null } as ApiResponse<Player>);

    await waitForValidation();
    await page.onSubmit();

    expect(api.create).toHaveBeenCalledTimes(1);
    const dto = api.create.calls.mostRecent().args[0];
    expect(dto.clientGeolocation).toBeNull();
  });
});
