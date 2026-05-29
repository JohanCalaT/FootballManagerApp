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
    // Registered-user feature (admins included). Backend also enforces auth
    // (401 without X-User-Id); the guard stops anonymous access up front.
    path: 'ideal-team',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/ideal-team/ideal-team.page').then(
        (m) => m.IdealTeamPage,
      ),
  },
  {
    // Real-time news feed (registered users). The SSE stream itself is public,
    // but the guard keeps the page behind auth like the rest of the registered
    // surface; admins also get publish/delete affordances inside.
    path: 'news',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/news/news.page').then((m) => m.NewsPage),
  },
  {
    path: 'news/publish',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/news/news-publish.page').then((m) => m.NewsPublishPage),
  },
  {
    path: 'news/admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/news/news-admin.page').then((m) => m.NewsAdminPage),
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
  {
    // Public detail page — anonymous users can land here from the home
    // grid; the comments section gates the write action behind auth and
    // admin-only buttons appear if the JWT claim is present.
    path: 'players/:id',
    loadComponent: () =>
      import('./features/players/detail/player-detail.page').then(
        (m) => m.PlayerDetailPage,
      ),
  },
  { path: '', redirectTo: 'splash', pathMatch: 'full' },
  { path: '**', redirectTo: 'splash' },
];
