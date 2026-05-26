import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'splash',
    loadComponent: () =>
      import('./features/splash/splash.component').then((m) => m.SplashComponent),
  },
  {
    path: 'players',
    loadComponent: () =>
      import('./features/players/list/players-list.component').then(
        (m) => m.PlayersListComponent,
      ),
  },
  { path: '', redirectTo: 'splash', pathMatch: 'full' },
  { path: '**', redirectTo: 'splash' },
];
