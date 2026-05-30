import { computed, signal } from '@angular/core';
import { AuthUser } from '../models/user.model';

export const currentUser = signal<AuthUser | null>(null);
export const authToken = signal<string | null>(null);

export const isAuthenticated = computed(() => currentUser() !== null);
export const isAdmin = computed(() => currentUser()?.role === 'admin');

export function setSession(user: AuthUser, token: string): void {
  currentUser.set(user);
  authToken.set(token);
}

export function clearSession(): void {
  currentUser.set(null);
  authToken.set(null);
}
