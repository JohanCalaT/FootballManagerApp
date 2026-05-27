import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { describeAuthError } from '../auth-errors.util';

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
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly canSubmit = computed(
    () =>
      this.displayName().trim().length > 0 &&
      this.email().trim().length > 0 &&
      this.password().length >= 6 &&
      !this.loading(),
  );

  protected onNameInput(event: Event): void {
    this.displayName.set((event.target as HTMLInputElement).value);
  }

  protected onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }
    this.errorMessage.set(null);
    this.loading.set(true);
    try {
      await this.auth.signUpWithEmail(
        this.email().trim(),
        this.password(),
        this.displayName().trim(),
      );
      await this.router.navigate(['/players']);
    } catch (err) {
      this.errorMessage.set(describeAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
