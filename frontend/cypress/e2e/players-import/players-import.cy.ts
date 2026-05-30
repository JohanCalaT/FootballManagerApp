/// <reference types="cypress" />

import users from '../../fixtures/users.json';

describe('Players · Import', () => {
  beforeEach(() => {
    cy.resetAuthEmulator();
    cy.intercept('GET', '**/api/players?page=1&limit=20', {
      fixture: 'players-page-1.json',
    }).as('listPage1');
    // Post-login Firebase resolves the user's claims via accounts:lookup; on a
    // cold login this lands AFTER the redirect to /players and re-settles the
    // session. Waiting for it lets the post-login bounce finish before we open
    // the import modal — otherwise the late auth churn re-navigates /players and
    // tears the modal (and its result summary) down mid-flow, which is exactly
    // the Firefox-only flake on the submit scenarios.
    cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:lookup**').as('lookup');
    // Catch every search-external request, not only `query=messi`. Typing
    // "messi" debounces through partial queries (m, me, mes…); scoping the
    // stub to the final value let the intermediate ones escape to the (dead)
    // dev proxy and made Firefox flake when the settled request raced the
    // wait. A catch-all keeps the stub deterministic across browsers.
    cy.intercept('GET', '**/api/players/search-external?**', {
      fixture: 'import/search-messi.json',
    }).as('searchExternal');
    cy.intercept('GET', '**/api/players/seasons/154', {
      fixture: 'import/seasons-154.json',
    }).as('seasons154');
    cy.intercept('GET', '**/api/players/seasons/999', {
      fixture: 'import/seasons-999.json',
    }).as('seasons999');
  });

  function signInAndOpen() {
    cy.seedUser(users.seeded.email, users.seeded.password, users.seeded.displayName);
    cy.visit('/auth/login?e2e=1', {
      onBeforeLoad(win) {
        // Cypress keeps IndexedDB between tests AND retry attempts, so a stale
        // Firebase session lingers and makes the next cold login churn — which
        // is what bounces the post-login navigation. Wipe the persisted session
        // before the app boots so every login is truly cold.
        win.indexedDB.deleteDatabase('firebaseLocalStorageDb');
      },
    });
    cy.get('[data-testid=login-email-input]').type(users.seeded.email);
    cy.get('[data-testid=login-password-input]').type(users.seeded.password);
    cy.get('[data-testid=login-submit-button]').click();
    cy.location('pathname').should('eq', '/players');
    cy.wait('@listPage1');
    cy.wait('@lookup'); // post-login claims resolution → the bounce has settled
    // Let the Ionic page transition finish before opening the modal so the late
    // auth churn cannot re-navigate /players and dismiss the modal mid-flow.
    cy.get('ion-router-outlet').should('not.have.class', 'ion-transitioning');
    // Import now lives behind the add FAB → bottom sheet on the Jugadores tab.
    cy.get('[data-testid=home-fab]').click();
    cy.get('[data-testid=add-player-import]').should('be.visible').click();
    cy.get('[data-testid=import-modal]').should('be.visible');
  }

  it('anonymous user does not see the add FAB', () => {
    cy.visitApp('/players');
    cy.wait('@listPage1');
    cy.get('[data-testid=home-fab]').should('not.exist');
  });

  it('signed user opens the modal and sees the plan-free banner', () => {
    signInAndOpen();
    cy.get('[data-testid=import-plan-free-banner]')
      .should('be.visible')
      .and('contain', '2022');
  });

  it('typing in search hits the proxy and renders results', () => {
    signInAndOpen();
    cy.get('[data-testid=import-search-input]').type('messi{enter}');
    cy.wait('@searchExternal');
    cy.get('[data-testid=import-player-card-154]').should('be.visible');
    cy.get('[data-testid=import-player-card-999]').should('be.visible');
  });

  it('selecting a player auto-resolves to season 2024 and counter increments', () => {
    signInAndOpen();
    cy.get('[data-testid=import-search-input]').type('messi{enter}');
    cy.wait('@searchExternal');
    cy.get('[data-testid=import-player-card-154]').click();
    cy.wait('@seasons154');
    cy.get('[data-testid=import-player-season-badge-154]').should('contain', '2024');
    cy.get('[data-testid=import-summary-counter]').should('contain', '1 jugador');
  });

  it('player without free-plan seasons becomes unavailable and is excluded', () => {
    signInAndOpen();
    cy.get('[data-testid=import-search-input]').type('messi{enter}');
    cy.wait('@searchExternal');
    cy.get('[data-testid=import-player-card-999]').click();
    cy.wait('@seasons999');
    cy.get('[data-testid=import-player-season-badge-999]').should('contain', 'Sin datos');
    cy.get('[data-testid=import-summary-counter]').should('contain', '0 jugadores');
  });

  it('submit success (201) renders the imported section and closes back to home', () => {
    cy.intercept('POST', '**/api/players/import', {
      fixture: 'import/import-success.json',
    }).as('import');
    signInAndOpen();
    cy.get('[data-testid=import-search-input]').type('messi{enter}');
    cy.wait('@searchExternal');
    cy.get('[data-testid=import-player-card-154]').click();
    cy.wait('@seasons154');
    // Wait for the resolved selection to commit before submitting. The season
    // request settles in a microtask after @seasons154 returns; until that CD
    // cycle runs, the footer still re-renders (inserts the "Limpiar" button,
    // counter → 1, submit button enabled). Clicking into that window detaches
    // the submit node mid-click — the Firefox-only flake. Asserting the badge
    // proves the store settled, so the footer is stable before we click.
    cy.get('[data-testid=import-player-season-badge-154]').should('contain', '2024');
    cy.get('[data-testid=import-submit-button]').click();
    cy.wait('@import');
    cy.get('[data-testid=import-result-imported]').should('contain', 'L. Messi');
    // Dismiss the modal back to the roster. The post-login auth churn re-renders
    // the page underneath, so the back button can detach mid-actionability in
    // Firefox — force the click (the result content is already asserted) so it
    // lands and dismisses. Verify the outcome by the modal being gone + the URL,
    // not by counting the background roster reload: how many list reloads fire
    // on login is non-deterministic (ngOnInit + the auth-transition effect),
    // which made a "2nd listPage1 request" assertion flake on its own.
    cy.get('[data-testid=import-result-back-button]').click({ force: true });
    cy.get('[data-testid=import-modal]').should('not.exist');
    cy.location('pathname').should('eq', '/players');
  });

  it('submit partial (207) renders both sections', () => {
    cy.intercept('POST', '**/api/players/import', {
      fixture: 'import/import-partial.json',
    }).as('import');
    signInAndOpen();
    cy.get('[data-testid=import-search-input]').type('messi{enter}');
    cy.wait('@searchExternal');
    cy.get('[data-testid=import-player-card-154]').click();
    cy.wait('@seasons154');
    cy.get('[data-testid=import-player-season-badge-154]').should('contain', '2024');
    cy.get('[data-testid=import-submit-button]').click();
    cy.wait('@import');
    cy.get('[data-testid=import-result-imported]').should('be.visible');
    cy.get('[data-testid=import-result-failed]').should('contain', 'Ya importado');
  });

  it('submit error (503 quota) shows the error banner', () => {
    cy.intercept('POST', '**/api/players/import', {
      statusCode: 503,
      fixture: 'import/import-quota.json',
    }).as('import');
    signInAndOpen();
    cy.get('[data-testid=import-search-input]').type('messi{enter}');
    cy.wait('@searchExternal');
    cy.get('[data-testid=import-player-card-154]').click();
    cy.wait('@seasons154');
    cy.get('[data-testid=import-player-season-badge-154]').should('contain', '2024');
    cy.get('[data-testid=import-submit-button]').click();
    cy.wait('@import');
    cy.get('[data-testid=import-error-banner]').should('contain', 'quota');
  });
});
