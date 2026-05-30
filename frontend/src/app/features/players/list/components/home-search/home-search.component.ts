import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';

import { PlayerSearchFilters } from '../../../../../core/models/player.model';

/** Removable chip keys (alta = the from/to range as a single chip). */
export type FilterChipKey = 'team' | 'league' | 'alta';

@Component({
  selector: 'app-home-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-search.component.html',
  styleUrls: ['./home-search.component.scss'],
})
export class HomeSearchComponent implements OnInit {
  /** Debounce window in ms — exposed for tests so they can dial it down. */
  readonly debounceMs = input(350);

  readonly queryChange = output<string>();

  /** Active non-name filters (drives the chips + the badge count). */
  readonly filters = input<PlayerSearchFilters>({});
  /** Number of sheet filters active — shown as a badge on the Filtros button. */
  readonly filterCount = input(0);

  /** User tapped "Filtros" — the container opens the bottom-sheet. */
  readonly filtersRequested = output<void>();
  /** User removed a chip — the container drops that filter and reloads. */
  readonly filterRemoved = output<FilterChipKey>();

  /** Two-way bound to the input element. */
  readonly draft = model<string>('');

  protected readonly chips = computed<{ key: FilterChipKey; label: string }[]>(() => {
    const f = this.filters();
    const out: { key: FilterChipKey; label: string }[] = [];
    if (f.team) out.push({ key: 'team', label: `Equipo: ${f.team}` });
    if (f.league) out.push({ key: 'league', label: `Liga: ${f.league}` });
    if (f.from || f.to) {
      out.push({ key: 'alta', label: `Alta: ${f.from ?? '…'} – ${f.to ?? '…'}` });
    }
    return out;
  });

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly input$ = new Subject<string>();

  constructor() {
    // Seed from `?q=` so a refresh or shared link keeps the active query.
    const initial = this.route.snapshot.queryParamMap.get('q') ?? '';
    if (initial) this.draft.set(initial);

    effect(() => {
      this.input$.next(this.draft());
    });
  }

  ngOnInit(): void {
    this.input$
      .pipe(
        map((v) => v.trim()),
        debounceTime(this.debounceMs()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.queryChange.emit(value);
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { q: value || null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });

    // Emit the seeded value so the container can fetch the right page on mount.
    const seeded = this.draft().trim();
    if (seeded) queueMicrotask(() => this.queryChange.emit(seeded));
  }

  protected onInput(value: string): void {
    this.draft.set(value);
  }

  protected clear(): void {
    if (!this.draft()) return;
    this.draft.set('');
  }
}
