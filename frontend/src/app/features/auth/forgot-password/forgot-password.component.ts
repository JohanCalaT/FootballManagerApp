import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import {
  AuthErrorBreakdown,
  classifyAuthError,
  emptyAuthErrors,
} from '../auth-errors.util';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [IonContent, RouterLink],
  templateUrl: './forgot-password.component.html',
  // auth-shell.scss is loaded globally via angular.json (shared across the
  // three auth pages, kept out of each lazy chunk to fit the production
  // anyComponentStyle budget).
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly errors = signal<AuthErrorBreakdown>(emptyAuthErrors());

  protected readonly emailError = computed(() => this.errors().emailError);
  protected readonly formError = computed(() => this.errors().formError);

  protected goBack(): void {
    void this.router.navigate(['/players']);
  }

  protected onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
    if (this.errors().emailError || this.errors().formError) {
      this.errors.set(emptyAuthErrors());
    }
    if (this.sent()) {
      this.sent.set(false);
    }
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loading()) {
      return;
    }
    const trimmed = this.email().trim();
    if (trimmed.length === 0) {
      this.errors.set({
        ...emptyAuthErrors(),
        emailError: 'Introduce tu correo.',
      });
      return;
    }
    this.errors.set(emptyAuthErrors());
    this.loading.set(true);
    try {
      await this.auth.sendPasswordReset(trimmed);
      this.sent.set(true);
    } catch (err) {
      this.errors.set(classifyAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
