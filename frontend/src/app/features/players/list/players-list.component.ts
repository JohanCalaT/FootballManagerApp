import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { currentUser, isAuthenticated } from '../../../core/state/auth.signal';
import { BackendToggleComponent } from '../../../shared/components/backend-toggle/backend-toggle.component';

@Component({
  selector: 'app-players-list',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, BackendToggleComponent],
  templateUrl: './players-list.component.html',
  styleUrls: ['./players-list.component.scss'],
})
export class PlayersListComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly isAuthenticated = isAuthenticated;
  protected readonly greeting = computed(() => {
    const user = currentUser();
    if (!user) {
      return null;
    }
    return user.displayName?.trim() || user.email || 'jugador';
  });

  protected goToLogin(): void {
    void this.router.navigate(['/auth/login']);
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
