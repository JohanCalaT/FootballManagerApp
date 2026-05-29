import { Component, OnInit, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  ModalController,
  ToastController,
  type InfiniteScrollCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';

import { PlayersApi } from '../../../core/api/players.api';
import { AuthService } from '../../../core/services/auth.service';
import { PlayerListItem, PlayerSearchFilters } from '../../../core/models/player.model';
import { isAdmin, isAuthenticated } from '../../../core/state/auth.signal';
import { backendChoice } from '../../../core/state/backend-choice.signal';
import { playersListNeedsRefresh } from '../../../core/state/players-list.signal';

import { ImportPlayersDialogComponent } from '../import/import-players-dialog.component';
import { HomeGridComponent } from './components/home-grid/home-grid.component';
import { HomeHeaderComponent } from './components/home-header/home-header.component';
import { HomeHeroComponent } from './components/home-hero/home-hero.component';
import {
  FilterChipKey,
  HomeSearchComponent,
} from './components/home-search/home-search.component';
import { HomeFiltersComponent } from './components/home-filters/home-filters.component';
import { PlayersPagedStore } from './players-paged.store';

@Component({
  selector: 'app-players-list',
  standalone: true,
  imports: [
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    HomeHeaderComponent,
    HomeHeroComponent,
    HomeSearchComponent,
    HomeGridComponent,
  ],
  providers: [PlayersPagedStore],
  templateUrl: './players-list.component.html',
  styleUrls: ['./players-list.component.scss'],
})
export class PlayersListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly toastCtrl = inject(ToastController);
  private readonly api = inject(PlayersApi);
  protected readonly store = inject(PlayersPagedStore);

  protected readonly isAuthenticated = isAuthenticated;
  protected readonly canRegister = computed(() => !this.isAuthenticated());

  // Tracks the auth-fingerprint last seen so the reload effect can skip
  // the synchronous initial fire (ngOnInit already loads the list once)
  // and only react to actual login/logout/admin-claim transitions.
  private lastAuthFingerprint: string | null = null;
  private lastBackend: string | null = null;

  constructor() {
    addIcons({ addOutline });

    // HATEOAS affordances on each PlayerListItem (_links.update, .delete)
    // are baked server-side from the X-User-Admin header — which the
    // Gateway stamps from the JWT admin claim. If the user signs in
    // while this page is mounted (Firebase restores the session
    // asynchronously after splash), the cached payload still holds the
    // anonymous _links and admin buttons never appear. Reload on every
    // auth transition so the grid always reflects the current role.
    effect(() => {
      const fingerprint = `${isAuthenticated()}-${isAdmin()}`;
      if (this.lastAuthFingerprint === null) {
        this.lastAuthFingerprint = fingerprint;
        return;
      }
      if (this.lastAuthFingerprint === fingerprint) return;
      this.lastAuthFingerprint = fingerprint;
      void this.store.reload(this.store.filters());
    });

    // Switching the active backend (.NET <-> Node) swaps the whole dataset
    // (independent databases), so re-fetch the current view against it. The
    // BackendSwitchService flips `backendChoice` only after the Gateway
    // confirms the change via /config/backend.
    effect(() => {
      const backend = backendChoice();
      if (this.lastBackend === null) {
        this.lastBackend = backend;
        return;
      }
      if (this.lastBackend === backend) return;
      this.lastBackend = backend;
      void this.store.reload(this.store.filters());
    });
  }

  ngOnInit(): void {
    void this.store.reload(this.store.filters());
  }

  /**
   * Ionic lifecycle: fires every time the user navigates back into this
   * page, even when IonRouterOutlet keeps the component in its cache (so
   * ngOnInit does not re-fire). If any mutation page flipped the
   * cross-route dirty signal before navigating here, we honour it by
   * reloading the grid; otherwise we skip the network round trip.
   */
  ionViewWillEnter(): void {
    if (playersListNeedsRefresh()) {
      playersListNeedsRefresh.set(false);
      void this.store.reload(this.store.filters());
    }
  }

  protected onSearchQueryChange(name: string): void {
    const next = name || undefined;
    if (next === this.store.filters().name) return;
    void this.store.reload({ ...this.store.filters(), name: next });
  }

  /** Open the filters bottom-sheet; on apply, keep the name + replace the rest. */
  protected async openFilters(): Promise<void> {
    const f = this.store.filters();
    const modal = await this.modalCtrl.create({
      component: HomeFiltersComponent,
      componentProps: {
        team: f.team ?? '',
        league: f.league ?? '',
        from: f.from ?? '',
        to: f.to ?? '',
      },
      breakpoints: [0, 0.7, 0.95],
      initialBreakpoint: 0.7,
      cssClass: 'fma-sheet',
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<PlayerSearchFilters>();
    if (role !== 'apply' || !data) return;
    void this.store.reload({
      name: this.store.filters().name,
      team: data.team,
      league: data.league,
      from: data.from,
      to: data.to,
    });
  }

  /** Remove one chip's filter and reload (alta clears both from + to). */
  protected removeFilter(key: FilterChipKey): void {
    const f: PlayerSearchFilters = { ...this.store.filters() };
    if (key === 'alta') {
      delete f.from;
      delete f.to;
    } else {
      delete f[key];
    }
    void this.store.reload(f);
  }

  protected goToLogin(): void {
    void this.router.navigate(['/auth/login']);
  }
  protected goToRegister(): void {
    void this.router.navigate(['/auth/register']);
  }
  protected async signOut(): Promise<void> {
    await this.auth.signOut();
  }

  protected async onImport(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ImportPlayersDialogComponent,
      cssClass: 'fma-fullscreen-modal',
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ importedCount: number }>();
    if ((data?.importedCount ?? 0) > 0) {
      await this.store.reload(this.store.filters());
    }
  }
  protected onInsert(): void {
    void this.router.navigate(['/players/new']);
  }

  /** FAB "+" → action sheet with the two create paths (manual / API-Football). */
  protected async openActions(): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Añadir jugadores',
      cssClass: 'fma-action-sheet',
      buttons: [
        {
          text: 'Insertar manualmente',
          handler: () => {
            this.onInsert();
          },
        },
        {
          text: 'Importar de API-Football',
          handler: () => {
            void this.onImport();
          },
        },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  protected onPlayerSelected(player: PlayerListItem): void {
    void this.router.navigate(['/players', player.id]);
  }
  protected onEditPlayer(player: PlayerListItem): void {
    void this.router.navigate(['/players', player.id, 'edit']);
  }

  /**
   * Inline destructive flow from the home grid: AlertController with the
   * player name in the message so the admin sees exactly who they are
   * about to remove (the grid is dense — confusing one card with another
   * is a real risk). Cancel is the default role, the destructive button
   * is visually distinct via cssClass. On success: toast + remove the
   * card from the local store in-place so the grid does not have to
   * round-trip the network just to drop one row.
   */
  protected async onDeletePlayer(player: PlayerListItem): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar jugador',
      subHeader: player.name,
      message: `Vas a eliminar a ${player.name} (${player.team}). Esta acción es permanente y no se puede deshacer.`,
      cssClass: 'fma-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          cssClass: 'fma-alert-destructive',
        },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    try {
      await this.api.delete(player.id);
      this.store.removeById(player.id);
      await this.toast(`Jugador "${player.name}" eliminado.`, 'success');
    } catch {
      await this.toast('No se pudo eliminar el jugador. Inténtalo de nuevo.', 'danger');
    }
  }

  private async toast(
    message: string,
    color: 'success' | 'warning' | 'danger',
  ): Promise<void> {
    const t = await this.toastCtrl.create({
      message,
      duration: 2800,
      position: 'top',
      color,
      cssClass: 'fma-toast',
    });
    await t.present();
  }

  protected async onLoadMore(ev: InfiniteScrollCustomEvent): Promise<void> {
    await this.store.loadMore();
    await ev.target.complete();
    if (this.store.allLoaded()) {
      ev.target.disabled = true;
    }
  }

  protected onRetry(): void {
    void this.store.reload(this.store.filters());
  }
}
