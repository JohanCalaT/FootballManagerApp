/// <reference types="cypress" />

import users from '../../fixtures/users.json';

describe('Players · Import', () => {
  beforeEach(() => {
    cy.resetAuthEmulator();
    cy.intercept('GET', '**/api/players?page=1&limit=20', {
      fixture: 'players-page-1.json',
    }).as('listPage1');
    cy.intercept('GET', '**/api/players/search-external?**search=messi**', {
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
    cy.visitApp('/auth/login');
    cy.get('[data-testid=login-email-input]').type(users.seeded.email);
    cy.get('[data-testid=login-password-input]').type(users.seeded.password);
    cy.get('[data-testid=login-submit-button]').click();
    cy.location('pathname').should('eq', '/players');
    cy.wait('@listPage1');
    cy.get('[data-testid=home-import-button]').click();
    cy.get('[data-testid=import-modal]').should('be.visible');
  }

  it('anonymous user does not see the import button', () => {
    cy.visitApp('/players');
    cy.wait('@listPage1');
    cy.get('[data-testid=home-import-button]').should('not.exist');
  });

  it('signed user opens the modal and sees the plan-free banner', () => {
    signInAndOpen();
    cy.get('[data-testid=import-plan-free-banner]')
      .should('be.visible')
      .and('contain', '2022');
  });

  it('typing in search hits the proxy and renders results', () => {
    signInAndOpen();
    cy.get('[data-testid=import-search-input]').type('messi');
    cy.wait('@searchExternal');
    cy.get('[data-testid=import-player-card-154]').should('be.visible');
    cy.get('[data-testid=import-player-card-999]').should('be.visible');
  });

  it('selecting a player auto-resolves to season 2024 and counter increments', () => {
    signInAndOpen();
    cy.get('[data-testid=import-search-input]').type('messi');
    cy.wait('@searchExternal');
    cy.get('[data-testid=import-player-card-154]').click();
    cy.wait('@seasons154');
    cy.get('[data-testid=import-player-season-badge-154]').should('contain', '2024');
    cy.get('[data-testid=import-summary-counter]').should('contain', '1 jugador');
  });

  it('player without free-plan seasons becomes unavailable and is excluded', () => {
    signInAndOpen();
    cy.get('[data-testid=import-search-input]').type('messi');
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
    cy.get('[data-testid=import-search-input]').type('messi');
    cy.wait('@searchExternal');
    cy.get('[data-testid=import-player-card-154]').click();
    cy.wait('@seasons154');
    cy.get('[data-testid=import-submit-button]').click();
    cy.wait('@import');
    cy.get('[data-testid=import-result-imported]').should('contain', 'L. Messi');
    cy.get('[data-testid=import-result-back-button]').click();
    cy.location('pathname').should('eq', '/players');
    cy.wait('@listPage1');
  });

  it('submit partial (207) renders both sections', () => {
    cy.intercept('POST', '**/api/players/import', {
      fixture: 'import/import-partial.json',
    }).as('import');
    signInAndOpen();
    cy.get('[data-testid=import-search-input]').type('messi');
    cy.wait('@searchExternal');
    cy.get('[data-testid=import-player-card-154]').click();
    cy.wait('@seasons154');
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
    cy.get('[data-testid=import-search-input]').type('messi');
    cy.wait('@searchExternal');
    cy.get('[data-testid=import-player-card-154]').click();
    cy.wait('@seasons154');
    cy.get('[data-testid=import-submit-button]').click();
    cy.wait('@import');
    cy.get('[data-testid=import-error-banner]').should('contain', 'quota');
  });
});
