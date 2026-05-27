import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
  output,
} from '@angular/core';
import { IonPopover } from '@ionic/angular/standalone';

import { backendChoice, toggleBackend } from '../../../../../core/state/backend-choice.signal';
import { currentUser, isAdmin, isAuthenticated } from '../../../../../core/state/auth.signal';

@Component({
  selector: 'app-home-header',
  standalone: true,
  imports: [IonPopover],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-header.component.html',
  styleUrls: ['./home-header.component.scss'],
})
export class HomeHeaderComponent {
  readonly loginRequested = output<void>();
  readonly logoutRequested = output<void>();

  protected readonly isAuthenticated = isAuthenticated;
  protected readonly isAdmin = isAdmin;
  protected readonly backend = backendChoice;

  protected readonly displayName = computed(() => {
    const user = currentUser();
    if (!user) return null;
    return user.displayName?.trim() || user.email || 'jugador';
  });

  protected readonly email = computed(() => currentUser()?.email ?? null);

  protected readonly initials = computed(() => {
    const name = this.displayName();
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
    return (first + last).toUpperCase() || name[0]?.toUpperCase() || '?';
  });

  protected readonly menuOpen = signal(false);
  protected readonly menuEvent = signal<Event | undefined>(undefined);

  protected readonly avatarRef = viewChild<ElementRef<HTMLElement>>('avatarBtn');
  protected readonly cogRef = viewChild<ElementRef<HTMLElement>>('cogBtn');

  protected openMenu(ev: Event): void {
    this.menuEvent.set(ev);
    this.menuOpen.set(true);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected onLogin(): void {
    this.loginRequested.emit();
  }

  protected onLogout(): void {
    this.closeMenu();
    this.logoutRequested.emit();
  }

  protected onToggleBackend(): void {
    toggleBackend();
  }
}
