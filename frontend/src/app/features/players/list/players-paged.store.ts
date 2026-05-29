import { Injectable, computed, inject, signal } from '@angular/core';

import { PlayersApi } from '../../../core/api/players.api';
import { PlayerListItem, PlayerSearchFilters } from '../../../core/models/player.model';

/**
 * Append-on-load paginated store for the players home grid.
 *
 * `httpResource` is great for replace-on-URL-change reads, but the home grid
 * needs to accumulate pages across infinite-scroll fetches and reset to page
 * one when the search filters change. That state lives here, in a feature-scoped
 * service instance the container provides.
 *
 * The active search is the full rubric filter set (name + team/league + alta
 * date range). With no filters it lists; with any filter it searches.
 */
@Injectable()
export class PlayersPagedStore {
  private readonly api = inject(PlayersApi);

  readonly players = signal<PlayerListItem[]>([]);
  readonly page = signal(1);
  readonly total = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filters = signal<PlayerSearchFilters>({});

  /** Name term — kept for the grid empty-state text and the search input. */
  readonly query = computed(() => this.filters().name ?? '');

  /** True when ANY rubric filter is active (drives the grid "no results"). */
  readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return !!(f.name || f.team || f.league || f.from || f.to);
  });

  /** Count of the sheet filters (team/league/alta) for the "Filtros" badge. */
  readonly activeFilterCount = computed(() => {
    const f = this.filters();
    return (f.team ? 1 : 0) + (f.league ? 1 : 0) + (f.from || f.to ? 1 : 0);
  });

  readonly allLoaded = computed(() => {
    const total = this.total();
    return total !== null && this.players().length >= total;
  });

  readonly isInitialLoad = computed(
    () => this.loading() && this.players().length === 0,
  );

  /** Reset state and load page 1 with the given filters ({} = full list). */
  async reload(filters: PlayerSearchFilters, limit = 20): Promise<void> {
    this.filters.set(filters);
    this.players.set([]);
    this.page.set(1);
    this.total.set(null);
    this.error.set(null);
    await this.fetch(1, limit);
  }

  /**
   * Drop a single card from the local list without re-fetching. Used after
   * a successful DELETE so the grid updates instantly — beats `reload()`
   * because it preserves the scroll position and avoids a network round
   * trip just to remove one row.
   */
  removeById(id: string): void {
    const current = this.players();
    if (!current.some((p) => p.id === id)) return;
    this.players.set(current.filter((p) => p.id !== id));
    const total = this.total();
    if (total !== null && total > 0) {
      this.total.set(total - 1);
    }
  }

  /** Fetch the next page if we haven't exhausted the total yet. */
  async loadMore(limit = 20): Promise<void> {
    if (this.loading() || this.allLoaded()) {
      return;
    }
    const next = this.page() + 1;
    await this.fetch(next, limit);
  }

  private async fetch(page: number, limit: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = this.hasActiveFilters()
        ? await this.api.searchFilteredPage(this.filters(), page, limit)
        : await this.api.listPage(page, limit);

      this.players.update((acc) => [...acc, ...(response.data ?? [])]);
      this.total.set(response.total);
      this.page.set(page);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo cargar el listado';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }
}
