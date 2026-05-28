import { signal } from '@angular/core';

/**
 * Cross-route flag the players list reads on re-entry to decide whether to
 * reload its store. Ionic's IonRouterOutlet caches pages, so a freshly-
 * created player would otherwise not appear until the user pulled to
 * refresh — this signal closes that gap without forcing a reload on
 * every navigation.
 *
 * Producers (create / edit / delete pages) flip it to true after a
 * successful mutation, right before navigating back to /players. The
 * consumer (PlayersListComponent) reads it in `ionViewWillEnter`, clears
 * it, and reloads. Set it BEFORE `router.navigate(['/players'])` so the
 * value is visible when the list's lifecycle hook runs.
 */
export const playersListNeedsRefresh = signal(false);

export function markPlayersListDirty(): void {
  playersListNeedsRefresh.set(true);
}
