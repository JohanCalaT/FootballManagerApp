import { signal } from '@angular/core';

export type BackendChoice = 'dotnet' | 'node';

const STORAGE_KEY = 'app.backend';
const DEFAULT: BackendChoice = 'dotnet';

function readStored(): BackendChoice {
  if (typeof localStorage === 'undefined') {
    return DEFAULT;
  }
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'node' || value === 'dotnet' ? value : DEFAULT;
}

function persist(value: BackendChoice): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, value);
  }
}

export const backendChoice = signal<BackendChoice>(readStored());

export function setBackend(choice: BackendChoice): void {
  backendChoice.set(choice);
  persist(choice);
}
