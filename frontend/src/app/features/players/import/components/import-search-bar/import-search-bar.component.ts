import {
  ChangeDetectionStrategy,
  Component,
  model,
  output,
} from '@angular/core';

/**
 * Explicit-submit search bar.
 *
 * No per-keystroke debounce on purpose: API-Football has a 100-call daily
 * quota and the parent (import dialog) hits the proxy on each emission.
 * The search fires only when the user actively requests it — Enter on the
 * keyboard (`enterkeyhint=search` on the input nudges mobile keyboards to
 * render a 🔍 key) or a tap on the lupa icon, which doubles as a button.
 */
@Component({
  selector: 'app-import-search-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-search-bar.component.html',
  styleUrls: ['./import-search-bar.component.scss'],
})
export class ImportSearchBarComponent {
  readonly queryChange = output<string>();
  readonly draft = model<string>('');

  protected onInput(value: string): void {
    this.draft.set(value);
  }

  /** Submit on Enter (handled by the wrapping <form>) or on the lupa tap. */
  protected submit(): void {
    const value = this.draft().trim();
    if (!value) return;
    this.queryChange.emit(value);
  }

  protected clear(): void {
    if (!this.draft()) return;
    this.draft.set('');
    // Emit empty so the parent can reset its result list. Important: this
    // is the only emission that does NOT require user submit, because the
    // user explicitly asked to clear and expects results to disappear too.
    this.queryChange.emit('');
  }
}
