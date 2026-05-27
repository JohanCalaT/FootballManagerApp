/// <reference types="cypress" />

import users from '../../fixtures/users.json';

describe('Auth · Register', () => {
  beforeEach(() => {
    cy.visitApp('/auth/register');
  });

  it('registers a fresh user and lands on /players with the new session', () => {
    cy.get('[data-testid=register-name-input]').type(users.fresh.displayName);
    cy.get('[data-testid=register-email-input]').type(users.fresh.email);
    cy.get('[data-testid=register-password-input]').type(users.fresh.password);
    cy.get('[data-testid=register-submit-button]').click();

    cy.location('pathname').should('eq', '/players');
    cy.get('[data-testid=auth-status-greeting]')
      .should('be.visible')
      .and('contain', users.fresh.displayName);
  });

  it('shows a field-level error when the email is already in use', () => {
    cy.seedUser(users.seeded.email, users.seeded.password, users.seeded.displayName);

    cy.get('[data-testid=register-name-input]').type('Whoever');
    cy.get('[data-testid=register-email-input]').type(users.seeded.email);
    cy.get('[data-testid=register-password-input]').type('another-pass');
    cy.get('[data-testid=register-submit-button]').click();

    cy.get('[data-testid=register-email-error]').should('be.visible');
    cy.location('pathname').should('eq', '/auth/register');
  });

  it('keeps submit disabled while the password is shorter than 6 chars', () => {
    cy.get('[data-testid=register-name-input]').type('Short Pass');
    cy.get('[data-testid=register-email-input]').type('shortpass@example.com');
    cy.get('[data-testid=register-password-input]').type('12345');

    cy.get('[data-testid=register-submit-button]').should('be.disabled');

    cy.get('[data-testid=register-password-input]').type('6');
    cy.get('[data-testid=register-submit-button]').should('not.be.disabled');
  });

  it('toggles password visibility independently of login', () => {
    cy.get('[data-testid=register-password-input]')
      .should('have.attr', 'type', 'password')
      .type('topsecret');

    cy.get('[data-testid=register-password-toggle]').click();
    cy.get('[data-testid=register-password-input]').should('have.attr', 'type', 'text');
  });

  it('navigates to /auth/login through the inline link', () => {
    cy.get('[data-testid=register-login-link]').click();
    cy.location('pathname').should('eq', '/auth/login');
    cy.get('[data-testid=login-form]').should('be.visible');
  });

  it('returns to /players via the back chip', () => {
    cy.get('[data-testid=auth-back-button]').click();
    cy.location('pathname').should('eq', '/players');
    cy.get('[data-testid=auth-status-greeting]').should('not.exist');
  });
});
