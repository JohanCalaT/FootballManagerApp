import { bootstrapApplication } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';

import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { APP_CONFIG } from './app/core/config/app-config.token';
import { AppConfig } from './app/core/config/app-config.model';

// Fetch the runtime config materialized by scripts/write-config.js (from the
// FIREBASE_* env vars injected by the Aspire AppHost). This runs once before
// the Angular app bootstraps, so the Firebase providers below receive real
// values — no build-time substitution, same bundle in dev / staging / prod.
async function main(): Promise<void> {
  const response = await fetch('/assets/config.json');
  if (!response.ok) {
    throw new Error(
      `Failed to load /assets/config.json (HTTP ${response.status}). ` +
        'Did the prestart script run? Check Aspire AppHost env injection.',
    );
  }
  const config = (await response.json()) as AppConfig;

  await bootstrapApplication(AppComponent, {
    providers: [
      ...appConfig.providers,
      { provide: APP_CONFIG, useValue: config },
      provideFirebaseApp(() => initializeApp(config.firebase)),
      provideAuth(() => getAuth()),
    ],
  });
}

main().catch((err) => console.error(err));
