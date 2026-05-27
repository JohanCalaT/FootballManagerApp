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
  selector: 'app-register',
  standalone: true,
  imports: [IonContent, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['../auth-shell.scss', './register.component.scss'],
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly displayName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly errors = signal<AuthErrorBreakdown>(emptyAuthErrors());

  protected readonly nameTooShort = computed(() => this.displayName().trim().length === 0);
  protected readonly emailError = computed(() => this.errors().emailError);
  protected readonly passwordError = computed(() => this.errors().passwordError);
  protected readonly formError = computed(() => this.errors().formError);

  protected readonly canSubmit = computed(
    () =>
      !this.nameTooShort() &&
      this.email().trim().length > 0 &&
      this.password().length >= 6 &&
      !this.loading(),
  );

  protected onNameInput(event: Event): void {
    this.displayName.set((event.target as HTMLInputElement).value);
    this.clearFormError();
  }

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
    if (!this.canSubmit()) {
      return;
    }
    this.errors.set(emptyAuthErrors());
    this.loading.set(true);
    try {
      await this.auth.signUpWithEmail(
        this.email().trim(),
        this.password(),
        this.displayName().trim(),
      );
      await this.router.navigate(['/players']);
    } catch (err) {
      this.errors.set(classifyAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }

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

  private clearFormError(): void {
    if (this.errors().formError) {
      this.errors.update((e) => ({ ...e, formError: null }));
    }
  }
}
