import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { PlayersApi } from '../../../core/api/players.api';
import {
  ApiFootballProfile,
  FREE_PLAN_SEASONS,
  ImportResult,
} from '../../../core/models/api-football.model';
import { ImportPlayerItem } from '../../../core/models/player.model';

/** State of a player checkbox while the modal is open. */
export type SelectionState =
  | { kind: 'pending' }
  | { kind: 'resolved'; season: number }
  | { kind: 'unavailable' };

export type SubmitState = 'idle' | 'submitting' | 'success' | 'partial' | 'error';

export const MAX_PLAYERS_PER_BATCH = 10;

/**
 * Feature-scoped store for the import-players modal.
 *
 * Provided at the dialog component level so each modal opening gets a fresh
 * instance and selections do not leak across sessions. Orchestrates three
 * endpoints — search-external, seasons, import — and owns the local rule
 * that turns the free-plan season constraint into an auto-pick: when a
 * player is checked, we fetch their available seasons, intersect with
 * FREE_PLAN_SEASONS and stamp the most recent overlap as the season we
 * will send on submit. No season picker UI required.
 */
@Injectable()
export class ImportFlowStore {
  private readonly api = inject(PlayersApi);

  // ── Search ───────────────────────────────────────────────────────────────
  readonly query = signal<string>('');
  readonly searchResults = signal<ApiFootballProfile[]>([]);
  readonly searchLoading = signal(false);
  readonly searchError = signal<string | null>(null);

  // ── Selection ────────────────────────────────────────────────────────────
  /** apiFootballId → state (pending / resolved season / unavailable). */
  readonly selections = signal<ReadonlyMap<number, SelectionState>>(new Map());

  /** Cache so toggling a player off and back on does not refetch seasons. */
  private readonly seasonsCache = new Map<number, readonly number[]>();

  // ── Submit ───────────────────────────────────────────────────────────────
  readonly submitState = signal<SubmitState>('idle');
  readonly result = signal<ImportResult | null>(null);
  readonly submitError = signal<string | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly selectedCount = computed(() => {
    let count = 0;
    for (const state of this.selections().values()) {
      if (state.kind === 'resolved') count += 1;
    }
    return count;
  });

  readonly pendingCount = computed(() => {
    let count = 0;
    for (const state of this.selections().values()) {
      if (state.kind === 'pending') count += 1;
    }
    return count;
  });

  readonly atCap = computed(
    () => this.selectedCount() + this.pendingCount() >= MAX_PLAYERS_PER_BATCH,
  );

  readonly canSubmit = computed(
    () => this.selectedCount() > 0 && this.submitState() !== 'submitting',
  );

  // ── Search action ────────────────────────────────────────────────────────
  async search(query: string): Promise<void> {
    const trimmed = query.trim();
    this.query.set(trimmed);
    if (!trimmed) {
      this.searchResults.set([]);
      this.searchError.set(null);
      return;
    }
    this.searchLoading.set(true);
    this.searchError.set(null);
    try {
      const response = await this.api.searchExternalOnce(trimmed);
      this.searchResults.set(response.data ?? []);
    } catch (err) {
      this.searchError.set(this.extractMessage(err, 'No se pudo buscar'));
      this.searchResults.set([]);
    } finally {
      this.searchLoading.set(false);
    }
  }

  // ── Selection actions ────────────────────────────────────────────────────
  isSelected(apiFootballId: number): boolean {
    return this.selections().has(apiFootballId);
  }

  stateOf(apiFootballId: number): SelectionState | undefined {
    return this.selections().get(apiFootballId);
  }

  async toggle(apiFootballId: number): Promise<void> {
    const current = this.selections().get(apiFootballId);

    if (current !== undefined) {
      this.removeSelection(apiFootballId);
      return;
    }

    // Block at cap. Checkbox should already be disabled in UI; this is a
    // belt-and-braces guard for programmatic callers.
    if (this.atCap()) return;

    this.setSelection(apiFootballId, { kind: 'pending' });

    const seasons = await this.loadSeasons(apiFootballId);
    const resolved = resolveDefaultSeason(seasons);

    // If the user un-checked while seasons were loading, do not overwrite.
    if (!this.selections().has(apiFootballId)) return;

    this.setSelection(
      apiFootballId,
      resolved !== null
        ? { kind: 'resolved', season: resolved }
        : { kind: 'unavailable' },
    );
  }

  clearAll(): void {
    this.selections.set(new Map());
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async submit(): Promise<void> {
    if (!this.canSubmit()) return;

    const items: ImportPlayerItem[] = [];
    for (const [apiFootballId, state] of this.selections()) {
      if (state.kind === 'resolved') {
        items.push({ apiFootballId, season: state.season });
      }
    }

    this.submitState.set('submitting');
    this.submitError.set(null);
    try {
      const response = await this.api.import(items);
      this.result.set(response.data ?? { imported: [], failed: [] });
      this.submitState.set(this.classify(response.status));
      if (this.submitState() === 'error') {
        this.submitError.set(response.message);
      }
    } catch (err) {
      this.submitError.set(this.extractMessage(err, 'No se pudo importar'));
      this.submitState.set('error');
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private async loadSeasons(apiFootballId: number): Promise<readonly number[]> {
    const cached = this.seasonsCache.get(apiFootballId);
    if (cached) return cached;
    try {
      const response = await this.api.seasonsOfOnce(apiFootballId);
      const seasons = response.data ?? [];
      this.seasonsCache.set(apiFootballId, seasons);
      return seasons;
    } catch {
      return [];
    }
  }

  private setSelection(apiFootballId: number, state: SelectionState): void {
    const next = new Map(this.selections());
    next.set(apiFootballId, state);
    this.selections.set(next);
  }

  private removeSelection(apiFootballId: number): void {
    const next = new Map(this.selections());
    next.delete(apiFootballId);
    this.selections.set(next);
  }

  private classify(status: number): SubmitState {
    if (status === 201) return 'success';
    if (status === 207) return 'partial';
    return 'error';
  }

  private extractMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string } | undefined;
      return body?.message ?? err.message ?? fallback;
    }
    return err instanceof Error ? err.message : fallback;
  }
}

/**
 * Intersect the API-Football response with the project's free-plan window
 * and return the most recent overlap, or null if there is none.
 *
 * Exported for unit tests; the store uses it internally.
 */
export function resolveDefaultSeason(
  apiSeasons: readonly number[],
): number | null {
  const overlap = apiSeasons
    .filter((s) => (FREE_PLAN_SEASONS as readonly number[]).includes(s))
    .sort((a, b) => b - a);
  return overlap[0] ?? null;
}
