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
  selector: 'app-login',
  standalone: true,
  imports: [IonContent, RouterLink],
  templateUrl: './login.component.html',
  // auth-shell.scss is loaded globally via angular.json (shared across the
  // three auth pages, kept out of each lazy chunk to fit the production
  // anyComponentStyle budget).
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly errors = signal<AuthErrorBreakdown>(emptyAuthErrors());

  protected readonly emailError = computed(() => this.errors().emailError);
  protected readonly passwordError = computed(() => this.errors().passwordError);
  protected readonly formError = computed(() => this.errors().formError);

  protected onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
    this.clearErrors('email');
  }

  protected onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
    this.clearErrors('password');
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  protected goBack(): void {
    void this.router.navigate(['/players']);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loading()) {
      return;
    }
    this.errors.set(emptyAuthErrors());
    this.loading.set(true);
    try {
      await this.auth.signInWithEmail(this.email().trim(), this.password());
      await this.router.navigate(['/players']);
    } catch (err) {
      this.errors.set(classifyAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async signInWithGoogle(): Promise<void> {
    if (this.loading()) {
      return;
    }
    this.errors.set(emptyAuthErrors());
    this.loading.set(true);
    try {
      await this.auth.signInWithGoogle();
      await this.router.navigate(['/players']);
    } catch (err) {
      this.errors.set(classifyAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }

  /** Clear errors that belong to the field the user just edited, plus any
   *  form-level error so the box does not linger across retries. */
  private clearErrors(field: 'email' | 'password'): void {
    const current = this.errors();
    if (!current.emailError && !current.passwordError && !current.formError) {
      return;
    }
    this.errors.set({
      emailError: field === 'email' ? null : current.emailError,
      passwordError: field === 'password' ? null : current.passwordError,
      formError: null,
    });
  }
}
