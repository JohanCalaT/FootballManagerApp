import { bootstrapApplication } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import { connectStorageEmulator, getStorage, provideStorage } from '@angular/fire/storage';
import { defineCustomElements } from '@football-manager/stencil/loader';

import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { APP_CONFIG } from './app/core/config/app-config.token';
import { AppConfig } from './app/core/config/app-config.model';

// Register the Stencil-built web components (e.g. <fma-player-card>) on the
// global custom-elements registry before Angular bootstraps, so the first
// template that contains one of these tags can upgrade it immediately.
defineCustomElements(window);

// Fetch the runtime config materialized by scripts/write-config.js (from the
// FIREBASE_* env vars injected by the Aspire AppHost). This runs once before
// the Angular app bootstraps, so the Firebase providers below receive real
// values — no build-time substitution, same bundle in dev / staging / prod.
//
// When the URL carries ?e2e=1, Auth is rewired to the Firebase Auth Emulator
// at 127.0.0.1:9099 so Cypress can run against a deterministic local fake
// (see cypress.config.ts and cypress/support/commands.ts). The toggle is a
// query param — not a build flag — so the test bundle is the same one we
// ship to prod, and triggering it accidentally without an emulator running
// just fails loud at sign-in time instead of corrupting prod state.
async function main(): Promise<void> {
  const response = await fetch('/assets/config.json');
  if (!response.ok) {
    throw new Error(
      `Failed to load /assets/config.json (HTTP ${response.status}). ` +
        'Did the prestart script run? Check Aspire AppHost env injection.',
    );
  }
  const config = (await response.json()) as AppConfig;

  const useAuthEmulator = new URLSearchParams(window.location.search).get('e2e') === '1';

  await bootstrapApplication(AppComponent, {
    providers: [
      ...appConfig.providers,
      { provide: APP_CONFIG, useValue: config },
      provideFirebaseApp(() => initializeApp(config.firebase)),
      provideAuth(() => {
        const auth = getAuth();
        if (useAuthEmulator) {
          connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
            disableWarnings: true,
          });
        }
        return auth;
      }),
      provideStorage(() => {
        const storage = getStorage();
        // Same `?e2e=1` toggle as Auth: when Cypress runs against the
        // Firebase emulators, redirect Storage to localhost:9199 so tests
        // never touch the real bucket and never need network egress.
        if (useAuthEmulator) {
          connectStorageEmulator(storage, '127.0.0.1', 9199);
        }
        return storage;
      }),
    ],
  });
}

main().catch((err) => console.error(err));
