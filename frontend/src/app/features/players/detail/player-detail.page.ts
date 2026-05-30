import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';

import { PlayersApi } from '../../../core/api/players.api';
import { Player } from '../../../core/models/player.model';
import { isAdmin } from '../../../core/state/auth.signal';
import { CollapsibleSectionComponent } from '../../../shared/components/collapsible-section/collapsible-section.component';
import { CommentsSectionComponent } from './components/comments-section/comments-section.component';

/**
 * Public detail page for a player. Three blocks:
 *
 *   1. Hero — circular portrait, name in Bebas Neue, team + league chip,
 *      position pill, "Lesionado" red badge if Injured. Admin-only Edit
 *      button in the header.
 *   2. Stats — Collapsible expanded by default; if the player has any
 *      statistics, renders them as a vertical-stack of season cards
 *      (one per row in the dto). Manual players with empty stats see
 *      a helpful empty-state pointing at the edit page.
 *   3. Comments — always visible; the CommentsSection component handles
 *      its own loading + auth-gated form + admin delete confirmation.
 */
@Component({
  selector: 'app-player-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ion-page' },
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonSpinner,
    IonTitle,
    IonToolbar,
    CollapsibleSectionComponent,
    CommentsSectionComponent,
  ],
  templateUrl: './player-detail.page.html',
  styleUrls: ['./player-detail.page.scss'],
})
export class PlayerDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly api = inject(PlayersApi);
  private readonly toastCtrl = inject(ToastController);

  // True only on a real deep-link / fresh tab / refresh: there IS a router
  // navigation in flight but it has no previous navigation beneath it, so the
  // browser has no in-app history to go back to. Captured during construction
  // because getCurrentNavigation() is only populated while navigating. In unit
  // tests the component is created without a navigation, so this stays false
  // and the history seeding is skipped.
  private readonly isDeepLinkEntry = (() => {
    const nav = this.router.getCurrentNavigation();
    return !!nav && !nav.previousNavigation;
  })();

  protected readonly isAdmin = isAdmin;
  protected readonly isLoading = signal(true);
  protected readonly player = signal<Player | null>(null);
  protected readonly playerIdSignal = signal<string>('');

  protected readonly isImported = computed(() => this.player()?.apiFootballId != null);
  protected readonly hasStats = computed(
    () => (this.player()?.statistics?.length ?? 0) > 0,
  );
  protected readonly initials = computed(() => {
    const name = this.player()?.name ?? '';
    const parts = name.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (a + b).toUpperCase() || '?';
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['/players']);
      return;
    }
    this.playerIdSignal.set(id);
    this.seedBackHistoryIfDeepLinked();
    try {
      const response = await this.api.getByIdOnce(id);
      const data = response?.data ?? null;
      if (!data) {
        await this.toast('Jugador no encontrado.');
        void this.router.navigate(['/players']);
        return;
      }
      this.player.set(data);
    } catch {
      await this.toast('No se pudo cargar el jugador.');
      void this.router.navigate(['/players']);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * On a deep-linked detail (pasted URL / fresh tab / refresh) the browser has
   * no /players entry beneath this page, so the browser Back button would leave
   * the app. Insert /players under the current detail URL via Angular's
   * Location (keeps the Router in sync) so Back lands on the list instead.
   * No-op when we navigated here from within the app.
   */
  private seedBackHistoryIfDeepLinked(): void {
    if (!this.isDeepLinkEntry) return;
    const here = this.location.path(true);
    this.location.replaceState('/players');
    this.location.go(here);
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toastCtrl.create({
      message,
      duration: 2500,
      color: 'danger',
      cssClass: 'fma-toast',
      position: 'top',
    });
    await t.present();
  }
}
