import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  ModalController,
  type InfiniteScrollCustomEvent,
} from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { ComingSoonService } from '../../../core/services/coming-soon.service';
import { PlayerListItem } from '../../../core/models/player.model';
import { isAuthenticated } from '../../../core/state/auth.signal';
import { playersListNeedsRefresh } from '../../../core/state/players-list.signal';

import { ImportPlayersDialogComponent } from '../import/import-players-dialog.component';
import { HomeActionBarComponent } from './components/home-action-bar/home-action-bar.component';
import { HomeGridComponent } from './components/home-grid/home-grid.component';
import { HomeHeaderComponent } from './components/home-header/home-header.component';
import { HomeHeroComponent } from './components/home-hero/home-hero.component';
import { HomeSearchComponent } from './components/home-search/home-search.component';
import { PlayersPagedStore } from './players-paged.store';

@Component({
  selector: 'app-players-list',
  standalone: true,
  imports: [
    IonContent,
    HomeHeaderComponent,
    HomeHeroComponent,
    HomeActionBarComponent,
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
  private readonly comingSoon = inject(ComingSoonService);
  private readonly modalCtrl = inject(ModalController);
  protected readonly store = inject(PlayersPagedStore);

  protected readonly isAuthenticated = isAuthenticated;
  protected readonly canRegister = computed(() => !this.isAuthenticated());

  ngOnInit(): void {
    void this.store.reload(this.store.query());
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
      void this.store.reload(this.store.query());
    }
  }

  protected onSearchQueryChange(query: string): void {
    if (query === this.store.query()) return;
    void this.store.reload(query);
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
      await this.store.reload(this.store.query());
    }
  }
  protected onInsert(): void {
    void this.router.navigate(['/players/new']);
  }
  protected onIdealTeam(): void {
    void this.comingSoon.notify('Equipo Ideal');
  }
  protected onPublishNews(): void {
    void this.comingSoon.notify('Publicar noticia');
  }

  protected onPlayerSelected(_player: PlayerListItem): void {
    void this.comingSoon.notify('Detalle de jugador');
  }
  protected onEditPlayer(player: PlayerListItem): void {
    void this.router.navigate(['/players', player.id, 'edit']);
  }
  protected onDeletePlayer(player: PlayerListItem): void {
    // Delete confirmation lives in the edit page (where the full player
    // context is available, including the name to confirm). Sending the
    // admin there keeps a single destructive flow instead of two.
    void this.router.navigate(['/players', player.id, 'edit']);
  }

  protected async onLoadMore(ev: InfiniteScrollCustomEvent): Promise<void> {
    await this.store.loadMore();
    await ev.target.complete();
    if (this.store.allLoaded()) {
      ev.target.disabled = true;
    }
  }

  protected onRetry(): void {
    void this.store.reload(this.store.query());
  }
}
