import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';

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

  /** Two-way bound to the input element. */
  readonly draft = model<string>('');

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
