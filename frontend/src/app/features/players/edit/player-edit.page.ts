import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AlertController,
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
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';

import { PlayersApi } from '../../../core/api/players.api';
import { GeolocationService } from '../../../core/services/geolocation.service';
import { currentUser } from '../../../core/state/auth.signal';
import { markPlayersListDirty } from '../../../core/state/players-list.signal';
import { Geolocation } from '../../../core/models/geolocation.model';
import {
  ImageSource,
  ManualStatistic,
  Player,
  PlayerPosition,
  UpdatePlayerRequest,
} from '../../../core/models/player.model';
import {
  PLAYER_POSITIONS,
  positionValidator,
} from '../../../core/validators/position.validator';
import { CollapsibleSectionComponent } from '../../../shared/components/collapsible-section/collapsible-section.component';
import { PlayerGeolocationPickerComponent } from '../../../shared/components/player-geolocation-picker/player-geolocation-picker.component';
import { PlayerImagePickerComponent } from '../../../shared/components/player-image-picker/player-image-picker.component';
import { ImageSourceKind, PlayerImageResult } from '../../../core/services/strategies/image/player-image-source';

/**
 * Admin-only edit page for a player. Mirrors the create form layout but
 * surfaces three things specific to editing:
 *
 *   1. Origin banner — chip telling whether this player was imported from
 *      API-Football or created manually. Imported = some biographical
 *      fields are locked (the backend ignores them on PUT and the form
 *      disables their inputs so the admin gets immediate feedback).
 *   2. "Estado del día" block elevated to the top — the Injured toggle,
 *      shirt number, and player map pin are what an admin will touch most
 *      frequently in the day-to-day, so they sit above the long-form
 *      identity block.
 *   3. Optimistic concurrency — captures `version` on GET, replays it via
 *      If-Match on PUT; 412 surfaces as a "the player changed elsewhere,
 *      reload" toast that does not destroy the in-progress draft.
 */
@Component({
  selector: 'app-player-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Same reason as the create page — ion-footer pinning needs ion-page on host.
  host: { class: 'ion-page' },
  imports: [
    DatePipe,
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
    IonToggle,
    IonToolbar,
    CollapsibleSectionComponent,
    PlayerGeolocationPickerComponent,
    PlayerImagePickerComponent,
  ],
  templateUrl: './player-edit.page.html',
  styleUrls: ['./player-edit.page.scss'],
})
export class PlayerEditPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PlayersApi);
  private readonly geo = inject(GeolocationService);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);

  protected readonly positions = PLAYER_POSITIONS;
  protected readonly user = currentUser;
  protected readonly ownerUid = computed(() => this.user()?.uid ?? '');

  protected readonly picker = viewChild<PlayerImagePickerComponent>(PlayerImagePickerComponent);

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly player = signal<Player | null>(null);
  protected readonly playerGeolocation = signal<Geolocation | null>(null);
  protected readonly mapSectionOpen = signal(false);

  protected readonly isImported = computed(() => this.player()?.apiFootballId != null);
  protected readonly initialImage = computed<PlayerImageResult | undefined>(() => {
    const p = this.player();
    if (!p?.imageUrl || !p?.imageSource) return undefined;
    return {
      url: p.imageUrl,
      // Backend's legacy 'blob' maps to the picker's 'firebase' source.
      imageSource: (p.imageSource === 'blob' ? 'firebase' : p.imageSource) as ImageSourceKind,
    };
  });

  /** Free-tier API-Football window — matches backend validator. */
  protected readonly allowedSeasons = [2022, 2023, 2024] as const;

  protected readonly form = this.fb.nonNullable.group({
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
    shirtNumber: [null as number | null, [Validators.min(1), Validators.max(99)]],
    injured: [false],
    // Manual-stats subform. Only mounted/visible for manual players; the
    // edit-page effect below populates it from player.statistics on load.
    statistics: this.fb.array<FormGroup>([]),
  });

  protected get statisticsArray(): FormArray<FormGroup> {
    return this.form.controls.statistics as FormArray<FormGroup>;
  }

  private buildStatRow(seed?: Partial<ManualStatistic>): FormGroup {
    return this.fb.nonNullable.group({
      season: [
        seed?.season ?? this.allowedSeasons[this.allowedSeasons.length - 1],
        [Validators.required],
      ],
      teamName: [seed?.teamName ?? '', Validators.maxLength(100)],
      leagueName: [seed?.leagueName ?? '', Validators.maxLength(100)],
      position: [seed?.position ?? '', positionValidator()],
      appearances: [
        seed?.appearances ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      goals: [seed?.goals ?? 0, [Validators.required, Validators.min(0)]],
      assists: [seed?.assists ?? 0, [Validators.required, Validators.min(0)]],
      rating: [
        seed?.rating ?? null,
        [Validators.min(0), Validators.max(10)],
      ],
    });
  }

  protected addStatRow(): void {
    this.statisticsArray.push(this.buildStatRow());
  }

  protected removeStatRow(index: number): void {
    this.statisticsArray.removeAt(index);
  }

  constructor() {
    effect(() => {
      const p = this.player();
      if (!p) return;
      this.form.patchValue({
        name: p.name,
        position: p.position ?? '',
        team: p.team,
        league: p.league,
        firstName: p.firstName ?? '',
        lastName: p.lastName ?? '',
        nationality: p.nationality ?? '',
        birthDate: p.birthDate ? p.birthDate.substring(0, 10) : '',
        birthPlace: p.birthPlace ?? '',
        birthCountry: p.birthCountry ?? '',
        height: p.height ?? '',
        weight: p.weight ?? '',
        shirtNumber: p.shirtNumber,
        injured: p.injured,
      });
      this.playerGeolocation.set(p.playerGeolocation);

      // Seed the manual stats subform with whatever the player already
      // has. For imported players we still load it (read-only could be
      // useful) but the template hides the editor so changes never reach
      // the backend — and the backend also drops the field for them.
      this.statisticsArray.clear({ emitEvent: false });
      for (const s of p.statistics ?? []) {
        this.statisticsArray.push(this.buildStatRow({
          season: s.season,
          teamName: s.teamName ?? undefined,
          leagueName: s.leagueName ?? undefined,
          position: s.position ?? undefined,
          appearances: s.appearances,
          goals: s.goals,
          assists: s.assists,
          rating: s.rating ?? undefined,
        }));
      }

      // Lock biographical fields for imported players. The backend already
      // enforces this on PUT; disabling them in the UI gives the admin
      // immediate feedback instead of a silently-dropped change.
      if (this.isImported()) {
        this.form.controls.name.disable();
        this.form.controls.firstName.disable();
        this.form.controls.lastName.disable();
        this.form.controls.nationality.disable();
        this.form.controls.birthDate.disable();
        this.form.controls.birthPlace.disable();
        this.form.controls.birthCountry.disable();
      }
    });
    this.loadPlayer();
  }

  private async loadPlayer(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['/players']);
      return;
    }
    try {
      const response = await this.api.getByIdOnce(id);
      const data = response?.data ?? null;
      if (!data) {
        await this.toast('Jugador no encontrado.', 'danger');
        void this.router.navigate(['/players']);
        return;
      }
      this.player.set(data);
    } catch {
      await this.toast('No se pudo cargar el jugador.', 'danger');
      void this.router.navigate(['/players']);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected selectPosition(value: PlayerPosition): void {
    this.form.controls.position.setValue(value);
    this.form.controls.position.markAsTouched();
  }

  protected onPlayerGeolocationChange(geo: Geolocation): void {
    this.playerGeolocation.set(geo);
  }

  protected originLabel(): string {
    return this.isImported() ? 'Importado de API-Football' : 'Jugador manual';
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }
    const current = this.player();
    if (!current) return;

    this.isSaving.set(true);
    try {
      const newImage = this.picker()?.hasChanges()
        ? await this.picker()!.commit()
        : null;

      const dto = this.buildDto(current, newImage);
      const response = await this.api.update(current.id, dto, current.version);
      const updated = response?.data ?? null;
      await this.toast(`"${updated?.name ?? current.name}" actualizado.`, 'success');
      markPlayersListDirty();
      void this.router.navigate(['/players']);
    } catch (err) {
      await this.handleError(err);
    } finally {
      this.isSaving.set(false);
    }
  }

  private buildDto(
    current: Player,
    image: PlayerImageResult | null,
  ): UpdatePlayerRequest {
    const raw = this.form.getRawValue();
    const nullable = (s: string): string | null => {
      const v = s.trim();
      return v ? v : null;
    };

    return {
      name: raw.name.trim(),
      team: raw.team.trim(),
      league: raw.league.trim(),
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
      injured: raw.injured,
      imageUrl: image ? image.url : current.imageUrl,
      imageSource: image
        ? toBackendImageSource(image.imageSource)
        : current.imageSource,
      playerGeolocation: this.playerGeolocation(),
      // Manual stats only travel when this is a manual player; backend drops
      // them otherwise but we save the bandwidth.
      statistics: this.isImported() ? undefined : this.collectStats(),
    };
  }

  private collectStats(): ManualStatistic[] {
    return this.statisticsArray.controls.map((row) => {
      const v = row.value as {
        season: number;
        teamName: string; leagueName: string; position: string;
        appearances: number; goals: number; assists: number;
        rating: number | null;
      };
      return {
        season: Number(v.season),
        teamName: v.teamName?.trim() || null,
        leagueName: v.leagueName?.trim() || null,
        position: v.position || null,
        appearances: Number(v.appearances) || 0,
        goals: Number(v.goals) || 0,
        assists: Number(v.assists) || 0,
        rating: v.rating == null || v.rating === ('' as unknown) ? null : Number(v.rating),
      };
    });
  }

  private async handleError(err: unknown): Promise<void> {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 412) {
        await this.toast(
          'Otro admin modificó este jugador. Recarga para ver los cambios.',
          'warning',
        );
        return;
      }
      if (err.status === 409) {
        await this.toast(
          'Hubo un conflicto al guardar. Recarga e inténtalo de nuevo.',
          'warning',
        );
        return;
      }
      if (err.status === 404) {
        await this.toast('El jugador ya no existe.', 'danger');
        void this.router.navigate(['/players']);
        return;
      }
    }
    await this.toast('No se pudo actualizar el jugador.', 'danger');
  }

  async onDelete(): Promise<void> {
    const current = this.player();
    if (!current) return;

    const alert = await this.alertCtrl.create({
      header: 'Eliminar jugador',
      message: `¿Eliminar a "${current.name}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', cssClass: 'fma-alert-destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    this.isSaving.set(true);
    try {
      await this.api.delete(current.id);
      await this.toast(`"${current.name}" eliminado.`, 'success');
      markPlayersListDirty();
      void this.router.navigate(['/players']);
    } catch {
      await this.toast('No se pudo eliminar el jugador.', 'danger');
    } finally {
      this.isSaving.set(false);
    }
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

function toBackendImageSource(kind: ImageSourceKind): ImageSource {
  return kind === 'firebase' ? 'blob' : kind;
}
