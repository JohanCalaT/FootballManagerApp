/// <reference types="cypress" />

import users from '../../fixtures/users.json';

describe('Players · Home', () => {
  beforeEach(() => {
    cy.resetAuthEmulator();
    cy.intercept('GET', '**/api/players?page=1&limit=20', {
      fixture: 'players-page-1.json',
    }).as('listPage1');
    cy.intercept('GET', '**/api/players/search?**', {
      fixture: 'players-search-messi.json',
    }).as('search');
  });

  it('renders the grid for an anonymous visitor and does not show the action bar', () => {
    cy.visitApp('/players');
    cy.wait('@listPage1');

    cy.get('[data-testid=home-header]').should('be.visible');
    cy.get('[data-testid=home-grid] [data-testid=player-card]').should('have.length', 2);
    cy.get('[data-testid=home-action-bar]').should('not.exist');
    cy.get('[data-testid=home-login-button]').should('be.visible');
    cy.get('[data-testid=home-settings-trigger]').should('be.visible');
    cy.get('[data-testid=home-user-menu-trigger]').should('not.exist');
  });

  it('shows the action bar after signing in', () => {
    cy.seedUser(users.seeded.email, users.seeded.password, users.seeded.displayName);
    cy.visitApp('/auth/login');
    cy.get('[data-testid=login-email-input]').type(users.seeded.email);
    cy.get('[data-testid=login-password-input]').type(users.seeded.password);
    cy.get('[data-testid=login-submit-button]').click();

    cy.location('pathname').should('eq', '/players');
    cy.wait('@listPage1');
    cy.get('[data-testid=home-action-bar]').should('be.visible');
    cy.get('[data-testid=home-import-button]').should('be.visible');
    cy.get('[data-testid=home-insert-button]').should('be.visible');
    cy.get('[data-testid=home-ideal-team-button]').should('be.visible');
    cy.get('[data-testid=home-publish-news-button]').should('not.exist');
  });

  it('filters the grid as the user types in the search box', () => {
    cy.visitApp('/players');
    cy.wait('@listPage1');
    cy.get('[data-testid=home-search-input]').type('messi');
    cy.wait('@search');
    cy.get('[data-testid=home-grid] [data-testid=player-card]').should('have.length', 1);
    cy.location('search').should('include', 'q=messi');
  });

  it('restores the full list after clearing the search input', () => {
    cy.visitApp('/players');
    cy.wait('@listPage1');
    cy.get('[data-testid=home-search-input]').type('messi');
    cy.wait('@search');
    cy.get('[data-testid=home-search-clear]').click();
    cy.wait('@listPage1');
    cy.get('[data-testid=home-grid] [data-testid=player-card]').should('have.length', 2);
    cy.location('search').should('not.include', 'q=');
  });

  // Tile-click coming-soon assertion intentionally omitted: the toast is
  // temporary scaffolding that will be replaced by real navigation to the
  // player detail page in the next iteration, and the only way to assert
  // it required clicking a shadow-DOM Stencil host whose synthetic event
  // wiring is flaky in Edge headless CI. Once the detail route ships, a
  // cy.location('pathname') assertion replaces this gap.

  it('shows the coming-soon toast for the import button when authenticated', () => {
    cy.seedUser(users.seeded.email, users.seeded.password, users.seeded.displayName);
    cy.visitApp('/auth/login');
    cy.get('[data-testid=login-email-input]').type(users.seeded.email);
    cy.get('[data-testid=login-password-input]').type(users.seeded.password);
    cy.get('[data-testid=login-submit-button]').click();
    cy.location('pathname').should('eq', '/players');
    cy.wait('@listPage1');
    cy.get('[data-testid=home-import-button]').click();
    cy.contains('Importar jugadores').should('be.visible');
  });

  it('renders an empty state when the backend returns 0 players', () => {
    cy.intercept('GET', '**/api/players?page=1&limit=20', {
      fixture: 'players-empty.json',
    }).as('listEmpty');
    cy.visitApp('/players');
    cy.wait('@listEmpty');
    cy.get('[data-testid=home-grid-empty]')
      .should('be.visible')
      .and('have.attr', 'data-kind', 'no-data');
  });

  it('renders per-card admin actions when the response carries update/delete _links', () => {
    cy.intercept('GET', '**/api/players?page=1&limit=20', {
      fixture: 'players-page-1-admin.json',
    }).as('listAdmin');
    cy.visitApp('/players');
    cy.wait('@listAdmin');
    cy.get('[data-testid=player-card-edit-button]').should('be.visible');
    cy.get('[data-testid=player-card-delete-button]').should('be.visible');
  });

  it('admin slot click does not bubble to the tile selection toast', () => {
    cy.intercept('GET', '**/api/players?page=1&limit=20', {
      fixture: 'players-page-1-admin.json',
    }).as('listAdmin');
    cy.intercept('GET', '**/api/players/11111111-1111-1111-1111-111111111111', {
      fixture: 'player-detail-admin.json',
    }).as('playerDetail');

    cy.seedAdmin(users.admin.email, users.admin.password, users.admin.displayName);
    cy.visitApp('/auth/login');
    cy.get('[data-testid=login-email-input]').type(users.admin.email);
    cy.get('[data-testid=login-password-input]').type(users.admin.password);
    cy.get('[data-testid=login-submit-button]').click();
    cy.location('pathname').should('eq', '/players');
    cy.wait('@listAdmin');

    cy.get('[data-testid=player-card-edit-button]').click();
    cy.contains('Editar jugador').should('be.visible');
    cy.contains('Detalle de jugador').should('not.exist');
  });
});
