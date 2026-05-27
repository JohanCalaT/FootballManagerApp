/// <reference types="cypress" />

// Custom commands that hide the Firebase Auth Emulator REST API behind a
// readable name. Specs stay focused on user behavior, not infrastructure.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Wipe every user from the Auth emulator. */
      resetAuthEmulator(): Chainable<void>;
      /** Pre-create a user in the emulator so a login spec has something to log in as. */
      seedUser(email: string, password: string, displayName?: string): Chainable<void>;
      /** Visit a path, automatically appending ?e2e=1 so the app wires the emulator. */
      visitApp(path: string): Chainable<void>;
    }
  }
}

const projectId = (): string => Cypress.env('FIREBASE_PROJECT_ID') as string;
const host = (): string => Cypress.env('AUTH_EMULATOR_HOST') as string;
const port = (): number => Cypress.env('AUTH_EMULATOR_PORT') as number;
const emulatorBase = (): string => `http://${host()}:${port()}`;

Cypress.Commands.add('resetAuthEmulator', () => {
  cy.request({
    method: 'DELETE',
    url: `${emulatorBase()}/emulator/v1/projects/${projectId()}/accounts`,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('seedUser', (email, password, displayName) => {
  // The emulator implements the Identity Toolkit REST API; signUp on it
  // creates a verified user immediately, no email confirmation needed.
  cy.request({
    method: 'POST',
    url: `${emulatorBase()}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    body: { email, password, displayName, returnSecureToken: true },
  });
});

Cypress.Commands.add('visitApp', (path) => {
  const separator = path.includes('?') ? '&' : '?';
  cy.visit(`${path}${separator}e2e=1`);
});

// Required when this file has no top-level imports/exports; ensures TS sees
// it as a module so the global declaration merges correctly.
export {};
