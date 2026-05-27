import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { AuthService } from '../../../core/services/auth.service';
import { describeAuthError } from '../auth-errors.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonContent, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['../auth-shell.scss', './login.component.scss'],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected onEmailInput(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected onPasswordInput(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loading()) {
      return;
    }
    this.errorMessage.set(null);
    this.loading.set(true);
    try {
      await this.auth.signInWithEmail(this.email().trim(), this.password());
      await this.router.navigate(['/players']);
    } catch (err) {
      this.errorMessage.set(describeAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async signInWithGoogle(): Promise<void> {
    if (this.loading()) {
      return;
    }
    this.errorMessage.set(null);
    this.loading.set(true);
    try {
      await this.auth.signInWithGoogle();
      await this.router.navigate(['/players']);
    } catch (err) {
      this.errorMessage.set(describeAuthError(err));
    } finally {
      this.loading.set(false);
    }
  }
}
