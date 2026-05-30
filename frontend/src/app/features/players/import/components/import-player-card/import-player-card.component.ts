import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ApiFootballProfile } from '../../../../../core/models/api-football.model';
import { SelectionState } from '../../import-flow.store';

@Component({
  selector: 'app-import-player-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-player-card.component.html',
  styleUrls: ['./import-player-card.component.scss'],
})
export class ImportPlayerCardComponent {
  readonly profile = input.required<ApiFootballProfile>();
  readonly state = input<SelectionState | undefined>(undefined);
  /** True when the global cap is reached and this card is NOT already selected. */
  readonly disabled = input(false);

  readonly toggled = output<number>();

  protected readonly isSelected = computed(() => this.state() !== undefined);
  protected readonly isPending = computed(() => this.state()?.kind === 'pending');
  protected readonly isUnavailable = computed(() => this.state()?.kind === 'unavailable');
  protected readonly resolvedSeason = computed(() => {
    const s = this.state();
    return s?.kind === 'resolved' ? s.season : null;
  });

  protected readonly initials = computed(() => {
    const name = this.profile().name;
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
    return (first + last).toUpperCase() || name[0]?.toUpperCase() || '?';
  });

  protected onClick(): void {
    if (this.disabled() && !this.isSelected()) return;
    this.toggled.emit(this.profile().apiFootballId);
  }
}
