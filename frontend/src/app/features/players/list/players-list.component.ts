import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, type InfiniteScrollCustomEvent } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { ComingSoonService } from '../../../core/services/coming-soon.service';
import { PlayerListItem } from '../../../core/models/player.model';
import { isAuthenticated } from '../../../core/state/auth.signal';

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
  protected readonly store = inject(PlayersPagedStore);

  protected readonly isAuthenticated = isAuthenticated;
  protected readonly canRegister = computed(() => !this.isAuthenticated());

  ngOnInit(): void {
    void this.store.reload(this.store.query());
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

  protected onImport(): void {
    void this.comingSoon.notify('Importar jugadores');
  }
  protected onInsert(): void {
    void this.comingSoon.notify('Insertar jugador');
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
  protected onEditPlayer(_player: PlayerListItem): void {
    void this.comingSoon.notify('Editar jugador');
  }
  protected onDeletePlayer(_player: PlayerListItem): void {
    void this.comingSoon.notify('Eliminar jugador');
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
