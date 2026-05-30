import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { HttpErrorResponse } from '@angular/common/http';

import { PlayersApi } from '../../../core/api/players.api';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { currentUser } from '../../../core/state/auth.signal';
import { markPlayersListDirty } from '../../../core/state/players-list.signal';
import {
  CreatePlayerRequest,
  ImageSource,
  PlayerPosition,
} from '../../../core/models/player.model';
import {
  PLAYER_POSITIONS,
  positionValidator,
} from '../../../core/validators/position.validator';
import { nameTeamDuplicateValidator } from '../../../core/validators/name-team-duplicate.validator';
import { CollapsibleSectionComponent } from '../../../shared/components/collapsible-section/collapsible-section.component';
import { PlayerGeolocationPickerComponent } from '../../../shared/components/player-geolocation-picker/player-geolocation-picker.component';
import { PlayerImagePickerComponent } from '../../../shared/components/player-image-picker/player-image-picker.component';
import { ImageSourceKind } from '../../../core/services/strategies/image/player-image-source';
import { Geolocation } from '../../../core/models/geolocation.model';

/**
 * Manual player create page (DAH — formulario manual).
 *
 * Mobile-first form following Gridiron Neon (see DESIGN.md): three card
 * sections stacked in a single scrollable column with a footer CTA pinned
 * via ion-footer + glassmorphism. The order matters — Image first to set
 * expectation, then the four required identity fields, then a collapsed
 * "Más datos" block for everything optional so the cognitive load stays
 * low for the casual case.
 *
 * Submit orchestration (the part the parent owns, not the picker):
 *   1. picker.commit() if it has changes  → may upload to Firebase
 *   2. geo.requestClientPosition(silent)  → never blocks on permission
 *   3. playersApi.create(dto)             → POST /api/players
 *   4. navigate back to /players with a success toast
 * A 409 from the backend (duplicate soft-uniqueness) maps to an inline
 * warning on the Team field; everything else surfaces as a toast.
 */
@Component({
  selector: 'app-manual-player-create',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Ionic's flex layout that lets ion-footer pin to the bottom only kicks in
  // when the routed component is a direct `ion-page`. The IonRouterOutlet
  // does NOT wrap standalone components automatically — we have to opt in
  // via the host class. Without this, the footer renders but falls below
  // the visible viewport on mobile.
  host: { class: 'ion-page' },
  imports: [
    ReactiveFormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonSpinner,
    IonTitle,
    IonToolbar,
    CollapsibleSectionComponent,
    PlayerGeolocationPickerComponent,
    PlayerImagePickerComponent,
  ],
  templateUrl: './manual-player-create.page.html',
  styleUrls: ['./manual-player-create.page.scss'],
})
export class ManualPlayerCreatePage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly api = inject(PlayersApi);
  private readonly geo = inject(GeolocationService);
  private readonly toastCtrl = inject(ToastController);

  // Positions render in English on both the form and the player card —
  // keeping the two surfaces in sync avoids the "GK vs Portero" confusion
  // and matches the canonical enum value the backend persists.
  protected readonly positions = PLAYER_POSITIONS;
  protected readonly user = currentUser;
  protected readonly ownerUid = computed(() => this.user()?.uid ?? '');

  protected readonly picker = viewChild<PlayerImagePickerComponent>(PlayerImagePickerComponent);

  protected readonly isSaving = signal(false);
  /**
   * Pin chosen by the user on the map picker. Stays null if they never open
   * the collapsible — submit then sends `playerGeolocation = null` and the
   * jugador simply does not appear on the world map until edited later.
   */
  protected readonly playerGeolocation = signal<Geolocation | null>(null);
  /** Two-way bound with the map collapsible — drives `@defer` loading. */
  protected readonly mapSectionOpen = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(100)]],
      position: ['', [Validators.required, positionValidator()]],
      team: ['', [Validators.required, Validators.maxLength(100)]],
      league: ['', [Validators.required, Validators.maxLength(100)]],
      firstName: ['', Validators.maxLength(100)],
      lastName: ['', Validators.maxLength(100)],
      nationality: ['', Validators.maxLength(100)],
      birthDate: [''],
      birthPlace: ['', Validators.maxLength(100)],
      birthCountry: ['', Validators.maxLength(100)],
      height: ['', Validators.maxLength(20)],
      weight: ['', Validators.maxLength(20)],
      shirtNumber: [
        null as number | null,
        [Validators.min(1), Validators.max(99)],
      ],
    },
    {
      asyncValidators: [
        nameTeamDuplicateValidator((name, team) =>
          this.api.existsByNameAndTeam(name, team),
        ),
      ],
    },
  );

  protected readonly hasDuplicate = computed(() => {
    // Touch the dummy signal to re-evaluate after status changes — Reactive
    // Forms validity does not fire signal notifications natively, so we
    // surface it via an effect-driven mirror.
    this.statusTick();
    return this.form.hasError('nameTeamDuplicate');
  });

  private readonly statusTick = signal(0);

  constructor() {
    this.form.statusChanges.subscribe(() => this.statusTick.update((n) => n + 1));
    // Keep the picker happy: it requires ownerUid; if the user signs out
    // mid-form we just bounce them to login via the route guard on next nav.
    effect(() => {
      if (!this.user()) {
        void this.router.navigate(['/auth/login']);
      }
    });
  }

  protected selectPosition(value: PlayerPosition): void {
    this.form.controls.position.setValue(value);
    this.form.controls.position.markAsTouched();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const image = this.picker()?.hasChanges()
        ? await this.picker()!.commit()
        : null;

      const clientGeolocation = await this.geo.requestClientPosition({
        silent: true,
      });

      const dto = this.buildDto(image, clientGeolocation);
      const response = await this.api.create(dto);
      const created = response?.data ?? null;
      await this.toast(
        `Jugador "${created?.name ?? dto.name}" creado.`,
        'success',
      );
      // Flag the cached list page so its ionViewWillEnter reloads instead
      // of showing stale data — Ionic does not re-mount the route.
      markPlayersListDirty();
      void this.router.navigate(['/players']);
    } catch (err) {
      await this.handleError(err);
    } finally {
      this.isSaving.set(false);
    }
  }

  private buildDto(
    image: { url: string; imageSource: ImageSourceKind } | null,
    clientGeo: Awaited<ReturnType<GeolocationService['requestClientPosition']>>,
  ): CreatePlayerRequest {
    const raw = this.form.getRawValue();
    const trim = (s: string): string => s.trim();
    const nullable = (s: string): string | null => {
      const v = s.trim();
      return v ? v : null;
    };
    return {
      name: trim(raw.name),
      team: trim(raw.team),
      league: trim(raw.league),
      position: raw.position as PlayerPosition,
      firstName: nullable(raw.firstName),
      lastName: nullable(raw.lastName),
      nationality: nullable(raw.nationality),
      birthDate: raw.birthDate || null,
      birthPlace: nullable(raw.birthPlace),
      birthCountry: nullable(raw.birthCountry),
      height: nullable(raw.height),
      weight: nullable(raw.weight),
      shirtNumber: raw.shirtNumber,
      imageUrl: image?.url ?? null,
      imageSource: image ? toBackendImageSource(image.imageSource) : null,
      injured: false,
      clientGeolocation: clientGeo,
      playerGeolocation: this.playerGeolocation(),
    };
  }

  protected onPlayerGeolocationChange(geo: Geolocation): void {
    this.playerGeolocation.set(geo);
  }

  private async handleError(err: unknown): Promise<void> {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 409) {
        this.form.setErrors({
          ...this.form.errors,
          nameTeamDuplicate: {
            name: this.form.controls.name.value,
            team: this.form.controls.team.value,
          },
        });
        await this.toast(
          'Ya existe un jugador con ese nombre en ese equipo.',
          'warning',
        );
        return;
      }
      if (err.status === 400) {
        await this.toast('Revisa los campos del formulario.', 'warning');
        return;
      }
    }
    await this.toast('No se pudo crear el jugador. Inténtalo de nuevo.', 'danger');
  }

  private async toast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const t = await this.toastCtrl.create({
      message,
      duration: 2800,
      position: 'top',
      color,
      cssClass: 'fma-toast',
    });
    await t.present();
  }
}

/**
 * Map the picker's storage-aware `ImageSourceKind` ('firebase') to the
 * backend's legacy enum ('blob'). PR 4 widens the backend enum to accept
 * 'firebase' directly and this helper becomes the identity function /
 * disappears. Until then, the storage location ('firebase') and the
 * upload origin ('blob' = locally uploaded) are kept consistent.
 */
function toBackendImageSource(kind: ImageSourceKind): ImageSource {
  return kind === 'firebase' ? 'blob' : kind;
}
