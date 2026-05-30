import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Exact empty path → splash. Placed before the tabs shell (which also lives
  // at '') so only the bare URL redirects; everything else falls through to
  // the tabs.
  { path: '', redirectTo: 'splash', pathMatch: 'full' },

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

  // Bottom-tab shell. URLs stay flat (/players, /ideal-team, /news, …) — the
  // shell just adds the persistent tab bar. Detail/edit/new push WITHIN the
  // Jugadores tab; publish/admin push within the Noticias tab.
  {
    path: '',
    loadComponent: () =>
      import('./features/shell/tabs.component').then((m) => m.TabsComponent),
    children: [
      {
        path: 'players',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/players/list/players-list.component').then(
                (m) => m.PlayersListComponent,
              ),
          },
          {
            path: 'new',
            canActivate: [authGuard],
            loadComponent: () =>
              import('./features/players/manual-form/manual-player-create.page').then(
                (m) => m.ManualPlayerCreatePage,
              ),
          },
          {
            path: ':id/edit',
            canActivate: [adminGuard],
            loadComponent: () =>
              import('./features/players/edit/player-edit.page').then(
                (m) => m.PlayerEditPage,
              ),
          },
          {
            // Public detail — anonymous users can land here from the grid.
            path: ':id',
            loadComponent: () =>
              import('./features/players/detail/player-detail.page').then(
                (m) => m.PlayerDetailPage,
              ),
          },
        ],
      },
      {
        // Registered-user feature; backend also enforces auth.
        path: 'ideal-team',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/ideal-team/ideal-team.page').then((m) => m.IdealTeamPage),
      },
      {
        path: 'news',
        children: [
          {
            path: '',
            canActivate: [authGuard],
            loadComponent: () =>
              import('./features/news/news.page').then((m) => m.NewsPage),
          },
          {
            path: 'publish',
            canActivate: [adminGuard],
            loadComponent: () =>
              import('./features/news/news-publish.page').then((m) => m.NewsPublishPage),
          },
          {
            path: 'admin',
            canActivate: [adminGuard],
            loadComponent: () =>
              import('./features/news/news-admin.page').then((m) => m.NewsAdminPage),
          },
        ],
      },
    ],
  },

  { path: '**', redirectTo: 'splash' },
];
