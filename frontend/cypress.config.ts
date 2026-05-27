import { defineConfig } from 'cypress';

// E2E setup notes:
//
// - Cypress drives the real Ionic dev server (no production build needed),
//   but the frontend connects to the Firebase Auth Emulator instead of the
//   live Firebase project when the URL carries ?e2e=1. See main.ts.
// - `npm run e2e` orchestrates emulator + dev-server + cypress lifecycle
//   via start-server-and-test; running Cypress directly without that wrapper
//   will fail because nothing is on :4200 / :9099.
// - Browsers wired into npm scripts: Chrome and Edge (both Chromium-based
//   for the CNSA multi-browser rubric).

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 414,
    viewportHeight: 896,
    // Ionic overlays (ion-toast, ion-popover, ion-modal) render inside a
    // shadow root, so cy.contains/cy.get need to pierce it to assert their
    // contents. Turning this on globally keeps the specs free of per-call
    // { includeShadowDom: true } noise.
    includeShadowDom: true,
    // Cypress's autoscroll lands the target at the TOP of the scrollable
    // viewport, which sits under our 56px sticky header (z-index 30). That
    // makes the action-bar buttons impossible to click. Centering the
    // target instead keeps them clear of any sticky overlay.
    scrollBehavior: 'center',
    // Disable Cypress's noisy auto-XHR logging — Firebase chats a lot.
    experimentalRunAllSpecs: true,
    env: {
      AUTH_EMULATOR_HOST: '127.0.0.1',
      AUTH_EMULATOR_PORT: 9099,
      FIREBASE_PROJECT_ID: 'master-ual-firebase',
    },
  },
});
