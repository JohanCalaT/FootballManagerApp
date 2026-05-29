import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  type InfiniteScrollCustomEvent,
} from '@ionic/angular/standalone';

import { PlayerListItem } from '../../../../../core/models/player.model';
import {
  HomeEmptyKind,
  HomeEmptyStateComponent,
} from '../home-empty-state/home-empty-state.component';

@Component({
  selector: 'app-home-grid',
  standalone: true,
  imports: [IonInfiniteScroll, IonInfiniteScrollContent, HomeEmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './home-grid.component.html',
  styleUrls: ['./home-grid.component.scss'],
})
export class HomeGridComponent {
  readonly players = input.required<PlayerListItem[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly query = input('');
  /** True when ANY search filter is active (name/team/league/alta) so an empty
   *  grid reads as "no results" rather than "no data". */
  readonly hasFilters = input(false);
  readonly allLoaded = input(false);
  readonly canRegister = input(false);

  readonly playerSelected = output<PlayerListItem>();
  readonly editRequested = output<PlayerListItem>();
  readonly deleteRequested = output<PlayerListItem>();
  readonly loadMoreRequested = output<InfiniteScrollCustomEvent>();
  readonly retryRequested = output<void>();
  readonly registerRequested = output<void>();

  /** 6 skeleton placeholders during the very first load. */
  protected readonly skeletonSlots = Array.from({ length: 6 });

  protected get emptyKind(): HomeEmptyKind | null {
    if (this.error()) return 'error';
    if (this.loading()) return null;
    if (this.players().length > 0) return null;
    return this.hasFilters() ? 'no-results' : 'no-data';
  }

  protected get isInitialLoad(): boolean {
    return this.loading() && this.players().length === 0;
  }

  protected canEdit(p: PlayerListItem): boolean {
    return hasLink(p, 'update');
  }

  protected canDelete(p: PlayerListItem): boolean {
    return hasLink(p, 'delete');
  }

  protected onCardSelected(player: PlayerListItem): void {
    this.playerSelected.emit(player);
  }

  protected onEdit(ev: Event, player: PlayerListItem): void {
    ev.stopPropagation();
    this.editRequested.emit(player);
  }

  protected onDelete(ev: Event, player: PlayerListItem): void {
    ev.stopPropagation();
    this.deleteRequested.emit(player);
  }

  protected onIonInfinite(ev: Event): void {
    this.loadMoreRequested.emit(ev as InfiniteScrollCustomEvent);
  }

  protected trackById = (_i: number, p: PlayerListItem): string => p.id;
}

/**
 * Inline helper — PlayerListItem carries an optional _links bag injected by the
 * .NET HATEOAS layer. We tolerate its absence (e.g. in unit tests that mock
 * the API without enriching) so the grid stays robust.
 */
function hasLink(p: PlayerListItem, rel: string): boolean {
  return !!p._links?.[rel];
}
