import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonModal,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, sparkles, alertCircle } from 'ionicons/icons';

import {
  IdealTeamFormation,
  IdealTeamPlayer,
  IdealTeamResponse,
} from '../../core/models/ideal-team.model';
import { IdealTeamApi } from '../../core/api/ideal-team.api';
import { HapticsService } from '../../core/services/haptics.service';
import { PlacedPlayer, placeTeam } from './ideal-team.layout';

type Phase = 'form' | 'loading' | 'pack' | 'opening' | 'reveal' | 'error';

/** Duration of the pack-open animation (must match the CSS keyframes). */
const PACK_OPEN_MS = 1100;

/**
 * Equipo Ideal — FUT-Champions-inspired reveal flow (design-first branch).
 *
 * State machine: form → loading → pack (the "sobre" with the app logo) →
 * reveal (full-screen pitch). The eleven comes from POST /api/ideal-team via
 * IdealTeamApi; on failure the machine goes to `error`. The pitch layout is
 * owned by the front (see ideal-team.layout.ts) — the backend's x/y are
 * ignored. Tapping a pitch card opens its deep-detail sheet; a footer action
 * opens the team-level AI analysis.
 */
@Component({
  selector: 'app-ideal-team',
  standalone: true,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './ideal-team.page.html',
  styleUrls: ['./ideal-team.page.scss'],
})
export class IdealTeamPage implements OnDestroy {
  private readonly location = inject(Location);
  private readonly haptics = inject(HapticsService);
  private readonly idealTeamApi = inject(IdealTeamApi);

  protected readonly phase = signal<Phase>('form');
  protected readonly formation = signal<IdealTeamFormation>('4-3-3');

  /** The eleven returned by POST /api/ideal-team (null until generated). */
  protected readonly team = signal<IdealTeamResponse | null>(null);
  /** Human-readable failure shown in the `error` phase. */
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * The eleven resolved onto the formation's pitch template (GK→DEF→MID→ATT).
   * The FRONT owns the coordinates; the backend's x/y are ignored — players
   * are matched to slots by fine position. See ideal-team.layout.ts.
   */
  protected readonly placed = computed<PlacedPlayer[]>(() => {
    const t = this.team();
    return t ? placeTeam(t, this.formation()) : [];
  });

  /** How many cards have flown onto the pitch so far (sequential reveal). */
  protected readonly revealedCount = signal(0);

  /** Player whose deep-detail sheet (bars + reason) is open (null = closed). */
  protected readonly selectedPlayer = signal<IdealTeamPlayer | null>(null);
  /** Six attributes (with GK label swap) of the player in the detail sheet. */
  protected readonly selectedAttributes = computed(() => {
    const p = this.selectedPlayer();
    return p ? this.attributesFor(p) : [];
  });
  /** Whether the team-level AI analysis sheet is open. */
  protected readonly showAnalysis = signal(false);

  protected readonly formations: IdealTeamFormation[] = [
    '4-3-3',
    '4-4-2',
    '3-5-2',
    '4-2-3-1',
  ];

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    addIcons({ arrowBack, sparkles, alertCircle });
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  protected goBack(): void {
    this.location.back();
  }

  protected onFormationChange(ev: CustomEvent): void {
    const value = ev.detail?.value as IdealTeamFormation | undefined;
    if (value) this.formation.set(value);
  }

  /** Form → loading → POST /api/ideal-team → pack (or error). */
  protected async onGenerate(): Promise<void> {
    this.haptics.light();
    this.errorMessage.set(null);
    this.phase.set('loading');
    try {
      const res = await this.idealTeamApi.generate({
        formation: this.formation(),
      });
      const data = res.data;
      if (!data) {
        this.fail(res.message || 'No se pudo generar el equipo.');
        return;
      }
      this.team.set(data);
      this.phase.set('pack');
    } catch (err) {
      this.fail(this.messageFrom(err));
    }
  }

  private fail(message: string): void {
    this.errorMessage.set(message);
    this.phase.set('error');
  }

  /** Map an HTTP failure to a user-facing message (401 is handled upstream). */
  private messageFrom(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const apiMessage = (err.error as { message?: string } | null)?.message;
      if (apiMessage) return apiMessage;
      if (err.status === 0) return 'No hay conexión con el servidor.';
      if (err.status === 503)
        return 'La IA no está disponible ahora mismo. Inténtalo de nuevo.';
    }
    return 'No se pudo generar el equipo. Inténtalo de nuevo.';
  }

  /** Pack tapped → play the 3D open + light-beam, then deploy the eleven. */
  protected onOpenPack(): void {
    if (this.phase() !== 'pack') return;
    this.phase.set('opening');
    // Heavy thud synced with the burst/flash mid-animation.
    this.push(setTimeout(() => this.haptics.heavy(), 430));
    this.push(
      setTimeout(() => {
        this.phase.set('reveal');
        this.revealedCount.set(0);
        const total = this.placed().length;
        this.placed().forEach((_, i) => {
          this.push(
            setTimeout(() => {
              this.revealedCount.update((n) => n + 1);
              // Soft tick as each card snaps in; success buzz on the last.
              if (i === total - 1) this.haptics.success();
              else this.haptics.light();
            }, 180 * i + 250),
          );
        });
      }, PACK_OPEN_MS),
    );
  }

  protected isRevealed(index: number): boolean {
    return index < this.revealedCount();
  }

  /** A pitch card was flipped — soft tactile tick. */
  protected onFlip(): void {
    this.haptics.light();
  }

  /** ⓘ tapped on a card → open its deep-detail sheet (bars + reason). */
  protected openInfo(player: IdealTeamPlayer): void {
    this.haptics.light();
    this.selectedPlayer.set(player);
  }

  protected closeInfo(): void {
    this.selectedPlayer.set(null);
  }

  /** Six FUT attributes paired with the role's label set (GK swaps labels). */
  protected attributesFor(
    player: IdealTeamPlayer,
  ): { label: string; value: number }[] {
    const isGk = player.position.trim().toUpperCase().startsWith('GK');
    const labels = isGk
      ? ['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS']
      : ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];
    const values = [
      player.pac,
      player.sho,
      player.pas,
      player.dri,
      player.def,
      player.phy,
    ];
    return labels.map((label, i) => ({ label, value: values[i] }));
  }

  protected openAnalysis(): void {
    this.showAnalysis.set(true);
  }

  protected closeAnalysis(): void {
    this.showAnalysis.set(false);
  }

  protected reset(): void {
    this.clearTimers();
    this.revealedCount.set(0);
    this.selectedPlayer.set(null);
    this.showAnalysis.set(false);
    this.team.set(null);
    this.errorMessage.set(null);
    this.phase.set('form');
  }

  /** Pitch position from the template slot (0..1) as CSS percentages. */
  protected styleFor(slot: PlacedPlayer): { left: string; top: string } {
    return {
      left: `${slot.x * 100}%`,
      // y 0 = own goal (bottom) → 1 = rival goal (top): invert for CSS top.
      top: `${(1 - slot.y) * 100}%`,
    };
  }

  private push(t: ReturnType<typeof setTimeout>): void {
    this.timers.push(t);
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
