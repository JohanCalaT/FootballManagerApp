/// <reference types="cypress" />

import users from '../../fixtures/users.json';

// Rubric scenario 3 — "Inserción de jugador desde formulario" (éxito + error).
//
// The form at /players/new is behind authGuard, so we sign in first (Firebase
// Auth Emulator). The .NET/Node backends are NOT running in E2E, so every
// /api/* call is stubbed with cy.intercept:
//   - GET /api/players        → home grid after login / after a successful save
//   - GET /api/players/search → the async name+team duplicate validator
//   - POST /api/players       → the actual create (409 conflict / 201 success)
//
// Both paths (error then success) live in ONE test on purpose: signing in
// twice would leave a persisted Firebase session in IndexedDB (Cypress test
// isolation does not clear it), and re-authenticating on top of it churns the
// auth state and bounces the /players/new navigation. One login = deterministic.
//
// Geolocation is stubbed to deny instantly so the submit's silent
// requestClientPosition() resolves to null without waiting on the 8s GPS timeout.

const emptySearch = {
  status: 200,
  message: 'ok',
  data: [],
  page: 1,
  limit: 1,
  total: 0,
  _links: {},
};

function openInsertForm(attempt = 0): void {
  // Insert now lives behind the add FAB → action sheet on the Jugadores tab.
  cy.get('[data-testid=home-fab]').click();
  cy.contains('Insertar manualmente').click();
  cy.location('pathname').then((path) => {
    if (path !== '/players/new' && attempt < 4) {
      cy.wait(400);
      openInsertForm(attempt + 1);
    }
  });
}

describe('Players · Insert from form', () => {
  beforeEach(() => {
    cy.seedUser(users.seeded.email, users.seeded.password, users.seeded.displayName);

    cy.intercept('GET', '**/api/players?page=1&limit=20', {
      fixture: 'players-page-1.json',
    }).as('list');
    cy.intercept('GET', '**/api/players/search?**', {
      statusCode: 200,
      body: emptySearch,
    }).as('dupCheck');
    // Firebase resolves the signed-in user's claims via accounts:lookup right
    // after sign-in. On a cold login this lands AFTER the redirect to /players
    // and updates the session again; if we navigate to the form before it
    // settles, that late update bounces us back to /players. Wait for it.
    cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:lookup**').as('lookup');

    cy.visit('/auth/login?e2e=1', {
      onBeforeLoad(win) {
        if (win.navigator.geolocation) {
          cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake(
            (_success, error?: PositionErrorCallback) =>
              error?.({ code: 1, message: 'denied' } as GeolocationPositionError),
          );
        }
      },
    });

    cy.get('[data-testid=login-email-input]').type(users.seeded.email);
    cy.get('[data-testid=login-password-input]').type(users.seeded.password);
    cy.get('[data-testid=login-submit-button]').click();

    cy.location('pathname').should('eq', '/players');
    cy.wait('@list');
    cy.wait('@lookup'); // post-login claims resolution finished → auth settled
    cy.get('[data-testid=home-user-menu-trigger]').should('be.visible');
    cy.get('[data-testid=home-fab]').should('be.visible');

    // The first programmatic navigation right after a fresh sign-in can be
    // bounced back to /players; retry the open until the form actually mounts.
    openInsertForm();
    cy.get('[data-testid=manual-form]', { timeout: 10000 }).should('be.visible');
    cy.location('pathname').should('eq', '/players/new');
  });

  it('flags a duplicate on 409, then creates the player on 201', () => {
    // The testid sits on the <ion-input> host; type into its inner native
    // input (shadow DOM) so Ionic propagates the value to the reactive form.
    cy.get('[data-testid=field-name]').find('input').type('Lionel E2E');
    cy.get('[data-testid=pos-Attacker]').click();
    cy.get('[data-testid=field-team]').find('input').type('Inter Miami');
    cy.get('[data-testid=field-league]').find('input').type('MLS');
    cy.wait('@dupCheck'); // debounced name+team validator settles (no duplicate)

    // --- ERROR path: backend rejects as duplicate ---
    cy.intercept('POST', '**/api/players', {
      statusCode: 409,
      body: { status: 409, message: 'Ya existe', data: null, _links: {} },
    }).as('createConflict');

    cy.get('[data-testid=action-submit]').should('not.be.disabled').click();
    cy.wait('@createConflict');
    cy.location('pathname').should('eq', '/players/new');
    cy.get('[data-testid=error-duplicate]').should('be.visible');

    // --- SUCCESS path: edit the team to clear the duplicate flag, then 201 ---
    cy.intercept('POST', '**/api/players', {
      statusCode: 201,
      body: {
        status: 201,
        message: 'Creado',
        data: {
          id: 'e2e-new-1',
          name: 'Lionel E2E',
          team: 'Inter Miami CF',
          league: 'MLS',
          position: 'Attacker',
        },
        _links: {},
      },
    }).as('create');

    cy.get('[data-testid=field-team]').find('input').clear().type('Inter Miami CF');
    cy.wait('@dupCheck'); // re-validate the new name+team → still no duplicate

    cy.get('[data-testid=action-submit]').should('not.be.disabled').click();
    cy.wait('@create');
    cy.location('pathname').should('eq', '/players');
    cy.contains('creado').should('exist'); // success toast
  });
});
