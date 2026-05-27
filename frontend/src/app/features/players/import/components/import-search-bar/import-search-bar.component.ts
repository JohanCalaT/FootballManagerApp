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
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';

@Component({
  selector: 'app-import-search-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-search-bar.component.html',
  styleUrls: ['./import-search-bar.component.scss'],
})
export class ImportSearchBarComponent implements OnInit {
  readonly debounceMs = input(350);
  readonly queryChange = output<string>();
  readonly draft = model<string>('');

  private readonly destroyRef = inject(DestroyRef);
  private readonly input$ = new Subject<string>();

  constructor() {
    effect(() => this.input$.next(this.draft()));
  }

  ngOnInit(): void {
    this.input$
      .pipe(
        map((v) => v.trim()),
        debounceTime(this.debounceMs()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => this.queryChange.emit(value));
  }

  protected onInput(value: string): void {
    this.draft.set(value);
  }

  protected clear(): void {
    if (!this.draft()) return;
    this.draft.set('');
  }
}
