import { ChangeDetectionStrategy, Component, computed, output } from '@angular/core';

import { currentUser, isAdmin, isAuthenticated } from '../../../../../core/state/auth.signal';
import { BackendToggleComponent } from '../../../../../shared/components/backend-toggle/backend-toggle.component';

@Component({
  selector: 'app-home-header',
  standalone: true,
  imports: [BackendToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-header.component.html',
  styleUrls: ['./home-header.component.scss'],
})
export class HomeHeaderComponent {
  readonly loginRequested = output<void>();
  readonly registerRequested = output<void>();
  readonly logoutRequested = output<void>();

  protected readonly isAuthenticated = isAuthenticated;
  protected readonly isAdmin = isAdmin;
  protected readonly greeting = computed(() => {
    const user = currentUser();
    if (!user) return null;
    return user.displayName?.trim() || user.email || 'jugador';
  });

  protected onLogin(): void {
    this.loginRequested.emit();
  }
  protected onRegister(): void {
    this.registerRequested.emit();
  }
  protected onLogout(): void {
    this.logoutRequested.emit();
  }
}
