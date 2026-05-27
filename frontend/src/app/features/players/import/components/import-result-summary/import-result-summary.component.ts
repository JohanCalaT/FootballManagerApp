import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ImportResult } from '../../../../../core/models/api-football.model';

@Component({
  selector: 'app-import-result-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-result-summary.component.html',
  styleUrls: ['./import-result-summary.component.scss'],
})
export class ImportResultSummaryComponent {
  readonly result = input.required<ImportResult>();
  readonly error = input<string | null>(null);
  readonly closeRequested = output<void>();
}
