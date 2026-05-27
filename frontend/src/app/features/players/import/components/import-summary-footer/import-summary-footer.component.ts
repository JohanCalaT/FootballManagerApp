import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-import-summary-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-summary-footer.component.html',
  styleUrls: ['./import-summary-footer.component.scss'],
})
export class ImportSummaryFooterComponent {
  readonly selectedCount = input.required<number>();
  readonly submitting = input(false);
  readonly canSubmit = input(false);

  readonly submitRequested = output<void>();
  readonly clearRequested = output<void>();
}
