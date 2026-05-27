/// <reference types="cypress" />

import users from '../../fixtures/users.json';

describe('Auth · Login', () => {
  beforeEach(() => {
    cy.seedUser(users.seeded.email, users.seeded.password, users.seeded.displayName);
    cy.visitApp('/auth/login');
  });

  it('signs in with correct credentials and lands on /players', () => {
    cy.get('[data-testid=login-email-input]').type(users.seeded.email);
    cy.get('[data-testid=login-password-input]').type(users.seeded.password);
    cy.get('[data-testid=login-submit-button]').click();

    cy.location('pathname').should('eq', '/players');
    cy.get('[data-testid=home-user-greeting]')
      .should('be.visible')
      .and('contain', users.seeded.displayName);
    cy.get('[data-testid=home-logout-button]').should('be.visible');
  });

  it('shows a form-level error for invalid credentials', () => {
    cy.get('[data-testid=login-email-input]').type(users.seeded.email);
    cy.get('[data-testid=login-password-input]').type('wrong-password');
    cy.get('[data-testid=login-submit-button]').click();

    cy.get('[data-testid=login-error]').should('be.visible');
    cy.location('pathname').should('eq', '/auth/login');
  });

  it('shows a field-level error for malformed email', () => {
    cy.get('[data-testid=login-email-input]').type('not-an-email');
    cy.get('[data-testid=login-password-input]').type('whatever');
    cy.get('[data-testid=login-submit-button]').click();

    cy.get('[data-testid=login-email-error]').should('be.visible');
    cy.location('pathname').should('eq', '/auth/login');
  });

  it('clears the error when the user edits the offending field', () => {
    cy.get('[data-testid=login-email-input]').type(users.seeded.email);
    cy.get('[data-testid=login-password-input]').type('wrong-password');
    cy.get('[data-testid=login-submit-button]').click();
    cy.get('[data-testid=login-error]').should('be.visible');

    cy.get('[data-testid=login-password-input]').type('a');
    cy.get('[data-testid=login-error]').should('not.exist');
  });

  it('toggles password visibility', () => {
    cy.get('[data-testid=login-password-input]')
      .should('have.attr', 'type', 'password')
      .type('secret');

    cy.get('[data-testid=login-password-toggle]').click();
    cy.get('[data-testid=login-password-input]').should('have.attr', 'type', 'text');

    cy.get('[data-testid=login-password-toggle]').click();
    cy.get('[data-testid=login-password-input]').should('have.attr', 'type', 'password');
  });

  it('returns to /players without signing in via the back chip', () => {
    cy.get('[data-testid=auth-back-button]').click();

    cy.location('pathname').should('eq', '/players');
    cy.get('[data-testid=home-login-button]').should('be.visible');
    cy.get('[data-testid=home-user-greeting]').should('not.exist');
  });
});
