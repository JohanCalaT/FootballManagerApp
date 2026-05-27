import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import { isAdmin } from '../../../../../core/state/auth.signal';

@Component({
  selector: 'app-home-action-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-action-bar.component.html',
  styleUrls: ['./home-action-bar.component.scss'],
})
export class HomeActionBarComponent {
  readonly importRequested = output<void>();
  readonly insertRequested = output<void>();
  readonly idealTeamRequested = output<void>();
  readonly publishNewsRequested = output<void>();

  protected readonly isAdmin = isAdmin;
}
