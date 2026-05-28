import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'splash',
    loadComponent: () =>
      import('./features/splash/splash.component').then((m) => m.SplashComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'players',
    loadComponent: () =>
      import('./features/players/list/players-list.component').then(
        (m) => m.PlayersListComponent,
      ),
  },
  {
    path: 'players/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/players/manual-form/manual-player-create.page').then(
        (m) => m.ManualPlayerCreatePage,
      ),
  },
  {
    path: 'players/:id/edit',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/players/edit/player-edit.page').then(
        (m) => m.PlayerEditPage,
      ),
  },
  { path: '', redirectTo: 'splash', pathMatch: 'full' },
  { path: '**', redirectTo: 'splash' },
];
