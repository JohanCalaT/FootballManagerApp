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

import { Player } from '../../../../../core/models/player.model';
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
  readonly players = input.required<Player[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly query = input('');
  readonly allLoaded = input(false);
  readonly canRegister = input(false);

  readonly playerSelected = output<Player>();
  readonly editRequested = output<Player>();
  readonly deleteRequested = output<Player>();
  readonly loadMoreRequested = output<InfiniteScrollCustomEvent>();
  readonly retryRequested = output<void>();
  readonly registerRequested = output<void>();

  /** 6 skeleton placeholders during the very first load. */
  protected readonly skeletonSlots = Array.from({ length: 6 });

  protected get emptyKind(): HomeEmptyKind | null {
    if (this.error()) return 'error';
    if (this.loading()) return null;
    if (this.players().length > 0) return null;
    return this.query() ? 'no-results' : 'no-data';
  }

  protected get isInitialLoad(): boolean {
    return this.loading() && this.players().length === 0;
  }

  protected canEdit(p: Player): boolean {
    return hasLink(p, 'update');
  }

  protected canDelete(p: Player): boolean {
    return hasLink(p, 'delete');
  }

  protected onCardSelected(player: Player): void {
    this.playerSelected.emit(player);
  }

  protected onEdit(ev: Event, player: Player): void {
    ev.stopPropagation();
    this.editRequested.emit(player);
  }

  protected onDelete(ev: Event, player: Player): void {
    ev.stopPropagation();
    this.deleteRequested.emit(player);
  }

  protected onIonInfinite(ev: Event): void {
    this.loadMoreRequested.emit(ev as InfiniteScrollCustomEvent);
  }

  protected trackById = (_i: number, p: Player): string => p.id;

  protected bestRating(p: Player): number | null {
    if (!p.statistics?.length) return null;
    let best: number | null = null;
    for (const s of p.statistics) {
      if (s.rating != null && (best === null || s.rating > best)) best = s.rating;
    }
    return best;
  }
}

/**
 * Inline helper — Player carries an optional _links bag injected by the
 * .NET HATEOAS layer. We tolerate its absence (e.g. in unit tests that mock
 * the API without enriching) so the grid stays robust.
 */
function hasLink(p: Player, rel: string): boolean {
  const withLinks = p as Player & { _links?: Record<string, unknown> };
  return !!withLinks._links?.[rel];
}
