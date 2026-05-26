import { signal } from '@angular/core';

export type BackendChoice = 'dotnet' | 'node';

export const backendChoice = signal<BackendChoice>('dotnet');

export function toggleBackend(): void {
  backendChoice.update((b) => (b === 'dotnet' ? 'node' : 'dotnet'));
}
