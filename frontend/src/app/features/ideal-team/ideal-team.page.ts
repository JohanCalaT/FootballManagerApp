import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Location } from '@angular/common';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, sparkles } from 'ionicons/icons';

import {
  IdealTeamFormation,
  IdealTeamPlayer,
  flattenIdealTeam,
} from '../../core/models/ideal-team.model';
import { IDEAL_TEAM_MOCK } from './ideal-team.mock';

type Phase = 'form' | 'loading' | 'pack' | 'opening' | 'reveal';

/** Duration of the pack-open animation (must match the CSS keyframes). */
const PACK_OPEN_MS = 1100;

/**
 * Equipo Ideal — FUT-Champions-inspired reveal flow (design-first branch).
 *
 * State machine: form → loading (simulated) → pack (the "sobre" with the app
 * logo) → reveal (full-screen pitch deploying the 11 cards by x/y). No
 * endpoint is hit here; the eleven comes from IDEAL_TEAM_MOCK so the visual
 * shape can be squared away before wiring the real POST /api/ideal-team.
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './ideal-team.page.html',
  styleUrls: ['./ideal-team.page.scss'],
})
export class IdealTeamPage implements OnDestroy {
  private readonly location = inject(Location);

  protected readonly phase = signal<Phase>('form');
  protected readonly formation = signal<IdealTeamFormation>('4-3-3');

  /** Hardcoded eleven (design branch). Flattened GK→DEF→MID→ATT for the pitch. */
  protected readonly team = IDEAL_TEAM_MOCK;
  protected readonly eleven = computed<IdealTeamPlayer[]>(() =>
    flattenIdealTeam(this.team),
  );

  /** How many cards have flown onto the pitch so far (sequential reveal). */
  protected readonly revealedCount = signal(0);

  protected readonly formations: IdealTeamFormation[] = [
    '4-3-3',
    '4-4-2',
    '3-5-2',
    '4-2-3-1',
  ];

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    addIcons({ arrowBack, sparkles });
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

  /** Form → simulated loading → pack. */
  protected onGenerate(): void {
    this.phase.set('loading');
    this.push(
      setTimeout(() => this.phase.set('pack'), 2200),
    );
  }

  /** Pack tapped → play the 3D open + light-beam, then deploy the eleven. */
  protected onOpenPack(): void {
    if (this.phase() !== 'pack') return;
    this.phase.set('opening');
    this.push(
      setTimeout(() => {
        this.phase.set('reveal');
        this.revealedCount.set(0);
        this.eleven().forEach((_, i) => {
          this.push(
            setTimeout(
              () => this.revealedCount.update((n) => n + 1),
              180 * i + 250,
            ),
          );
        });
      }, PACK_OPEN_MS),
    );
  }

  protected isRevealed(index: number): boolean {
    return index < this.revealedCount();
  }

  protected reset(): void {
    this.clearTimers();
    this.revealedCount.set(0);
    this.phase.set('form');
  }

  /** Pitch position from normalised x/y (0..1) as CSS percentages. */
  protected styleFor(player: IdealTeamPlayer): { left: string; top: string } {
    return {
      left: `${player.x * 100}%`,
      // y 0 = own goal (bottom) → 1 = rival goal (top): invert for CSS top.
      top: `${(1 - player.y) * 100}%`,
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
