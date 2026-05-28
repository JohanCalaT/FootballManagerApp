import { Injectable, computed, inject, signal } from '@angular/core';

import { PlayersApi } from '../../../core/api/players.api';
import { PlayerListItem } from '../../../core/models/player.model';

/**
 * Append-on-load paginated store for the players home grid.
 *
 * `httpResource` is great for replace-on-URL-change reads, but the home grid
 * needs to accumulate pages across infinite-scroll fetches and reset to page
 * one when the search query changes. That state lives here, in a feature-scoped
 * service instance the container provides.
 */
@Injectable()
export class PlayersPagedStore {
  private readonly api = inject(PlayersApi);

  readonly players = signal<PlayerListItem[]>([]);
  readonly page = signal(1);
  readonly total = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly query = signal<string>('');

  readonly allLoaded = computed(() => {
    const total = this.total();
    return total !== null && this.players().length >= total;
  });

  readonly isInitialLoad = computed(
    () => this.loading() && this.players().length === 0,
  );

  /** Reset state and load page 1 with the given query ('' = full list). */
  async reload(query: string, limit = 20): Promise<void> {
    this.query.set(query);
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
      const q = this.query();
      const response = q
        ? await this.api.searchPage(q, page, limit)
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
