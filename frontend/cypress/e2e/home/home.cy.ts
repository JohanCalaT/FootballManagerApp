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

  it('shows the coming-soon toast when a tile is clicked', () => {
    cy.visitApp('/players');
    cy.wait('@listPage1');
    // Mirror what a real user does: click the tile. We layer three guards
    // because <fma-player-card> is a lazy-loaded Stencil custom element and
    // Edge headless takes a microtask longer than Chrome to wire the host
    // onClick handler:
    //   - should('be.visible')                  → the chunk is painted
    //   - should('have.attr', 'role', 'button') → Stencil's render ran with
    //                                              interactive=true (so the
    //                                              onClick handler is on)
    //   - click({ force: true })                → skip Cypress's actionability
    //                                              quirks for shadow-DOM
    //                                              hosts that vary subtly
    //                                              between Chrome and Edge
    //                                              headless
    // Once the host onClick fires, Stencil emits the playerSelected
    // CustomEvent, Angular's (playerSelected) listener on home-grid catches
    // it via Renderer2.listen, the grid re-emits through its output() to
    // the container, and onPlayerSelected calls comingSoon.notify which
    // creates the ion-toast.
    cy.get('[data-testid=player-card]')
      .first()
      .should('be.visible')
      .should('have.attr', 'role', 'button')
      .click({ force: true });
    cy.contains('Detalle de jugador').should('be.visible');
  });

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
    cy.visitApp('/players');
    cy.wait('@listAdmin');

    cy.get('[data-testid=player-card-edit-button]').click();
    cy.contains('Editar jugador').should('be.visible');
    cy.contains('Detalle de jugador').should('not.exist');
  });
});
