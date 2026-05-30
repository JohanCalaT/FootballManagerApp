/// <reference types="cypress" />

import users from '../../fixtures/users.json';

// Rubric scenario — CRUD de comentarios (éxito + error), multi-browser.
//
// The .NET / Node backends are NOT running in E2E, so every /api/* call is
// stubbed with cy.intercept:
//   - GET  /api/players/:id            → the detail the comments hang off
//   - GET  /api/comments/player/:id    → the embedded comment list
//   - POST /api/comments/player/:id    → create (201 success / 4xx error)
//   - DELETE /api/comments/:id         → admin delete (204)
//   - GET  /api/players?page=1&limit=20 → the list shown after login / on Back
//
// Auth uses the Firebase Auth Emulator (?e2e=1). Persistence is the SDK default
// (IndexedDB), so after a single sign-in we can deep-link to the detail and the
// session is restored — which is also why the comment form / admin delete show
// up on a freshly visited URL. seedAdmin stamps the `admin: true` custom claim
// so adminGuard / isAdmin() pass without a real Firebase project.

const PLAYER_ID = '11111111-1111-1111-1111-111111111111';
const DETAIL_URL = `/players/${PLAYER_ID}`;
const COMMENTS_URL = `**/api/comments/player/${PLAYER_ID}`;

const emptyComments = {
  status: 200,
  message: 'Sin comentarios',
  data: [] as unknown[],
  _links: {},
};

// Deny geolocation instantly so the submit's silent requestClientPosition()
// resolves to null without waiting on the 8s GPS timeout.
function denyGeolocation(win: Window): void {
  if (win.navigator.geolocation) {
    cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake(
      (_success, error?: PositionErrorCallback) =>
        error?.({ code: 1, message: 'denied' } as GeolocationPositionError),
    );
  }
}

function signIn(email: string, password: string): void {
  cy.visit('/auth/login?e2e=1', { onBeforeLoad: denyGeolocation });
  cy.get('[data-testid=login-email-input]').type(email);
  cy.get('[data-testid=login-password-input]').type(password);
  cy.get('[data-testid=login-submit-button]').click();
  cy.location('pathname').should('eq', '/players');
  cy.wait('@list');
}

// Deep-link straight to the detail. The Firebase session (IndexedDB) is
// restored on this fresh load, so the auth-gated comment form appears.
function openDetail(): void {
  cy.visit(`${DETAIL_URL}?e2e=1`, { onBeforeLoad: denyGeolocation });
  cy.wait('@detail');
}

describe('Comments · CRUD', () => {
  beforeEach(() => {
    cy.resetAuthEmulator();
    cy.intercept('GET', '**/api/players?page=1&limit=20', {
      fixture: 'players-page-1.json',
    }).as('list');
    cy.intercept('GET', `**/api/players/${PLAYER_ID}`, {
      fixture: 'player-detail-admin.json',
    }).as('detail');
  });

  it('anonymous user sees the sign-in prompt and no comment form', () => {
    cy.intercept('GET', COMMENTS_URL, { statusCode: 200, body: emptyComments }).as('comments');

    cy.visit(`${DETAIL_URL}?e2e=1`);
    cy.wait('@detail');

    cy.get('[data-testid=comments-signin-prompt]').should('be.visible');
    cy.get('[data-testid=comments-form]').should('not.exist');
  });

  it('registered user publishes a comment and its rating stars render — success', () => {
    cy.seedUser(users.seeded.email, users.seeded.password, users.seeded.displayName);
    cy.intercept('GET', COMMENTS_URL, { statusCode: 200, body: emptyComments }).as('comments');
    cy.intercept('POST', COMMENTS_URL, {
      statusCode: 201,
      body: {
        status: 201,
        message: 'Comentario añadido',
        data: {
          id: 'c-new-1',
          author: 'Juan E2E',
          text: 'Crack absoluto, lo da todo.',
          rating: 4,
          createdAt: '2026-05-30T10:00:00Z',
          createdByUserId: 'cypress-existing',
          clientGeolocation: null,
        },
        _links: {},
      },
    }).as('create');

    signIn(users.seeded.email, users.seeded.password);
    openDetail();

    cy.get('[data-testid=comments-form]', { timeout: 10000 }).should('be.visible');

    cy.get('[data-testid=star-4]').click();
    cy.get('[data-testid=comments-author]').find('input').clear().type('Juan E2E');
    cy.get('[data-testid=comments-text]').find('textarea').type('Crack absoluto, lo da todo.');

    cy.get('[data-testid=comments-submit]').should('not.be.disabled').click();
    cy.wait('@create');

    // The new comment is in the list with its text…
    cy.get('[data-testid=comment-c-new-1]').should('contain', 'Crack absoluto');
    // …and exactly 4 of the 5 rating stars are filled (name="star").
    cy.get('[data-testid=comment-c-new-1] .comments__item-rating ion-icon[name=star]')
      .should('have.length', 4);
  });

  it('shows an error and rolls back when the server rejects the comment — error', () => {
    cy.seedUser(users.seeded.email, users.seeded.password, users.seeded.displayName);
    cy.intercept('GET', COMMENTS_URL, { statusCode: 200, body: emptyComments }).as('comments');
    cy.intercept('POST', COMMENTS_URL, {
      statusCode: 400,
      body: { status: 400, message: 'Solicitud inválida', data: null, _links: {} },
    }).as('createError');

    signIn(users.seeded.email, users.seeded.password);
    openDetail();

    cy.get('[data-testid=comments-form]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid=star-3]').click();
    cy.get('[data-testid=comments-author]').find('input').clear().type('Juan E2E');
    cy.get('[data-testid=comments-text]').find('textarea').type('Comentario que el backend rechaza.');
    cy.get('[data-testid=comments-submit]').should('not.be.disabled').click();
    cy.wait('@createError');

    // Error toast surfaced and the optimistic row was rolled back to empty.
    cy.contains('No se pudo publicar').should('be.visible');
    cy.get('[data-testid=comments-empty]').should('be.visible');
  });

  it('admin deletes a comment behind a confirmation — success', () => {
    cy.seedAdmin(users.admin.email, users.admin.password, users.admin.displayName);
    cy.intercept('GET', COMMENTS_URL, {
      statusCode: 200,
      body: {
        status: 200,
        message: 'OK',
        data: [
          {
            id: 'c-existing-1',
            author: 'Usuario Anónimo',
            text: 'Comentario a borrar por el admin.',
            rating: 3,
            createdAt: '2026-05-29T09:00:00Z',
            createdByUserId: 'someone',
            clientGeolocation: null,
          },
        ],
        _links: {},
      },
    }).as('comments');
    cy.intercept('DELETE', '**/api/comments/c-existing-1', { statusCode: 204 }).as('delete');

    signIn(users.admin.email, users.admin.password);
    openDetail();

    cy.get('[data-testid=comment-c-existing-1]').should('be.visible');
    cy.get('[data-testid=comment-delete-c-existing-1]').should('be.visible').click();

    // Ionic AlertController confirmation — click the destructive "Eliminar".
    cy.get('ion-alert').should('be.visible');
    cy.contains('.alert-button', 'Eliminar').click();

    cy.wait('@delete');
    cy.get('[data-testid=comment-c-existing-1]').should('not.exist');
  });

  it('keeps the browser Back inside the app on a deep-linked detail', () => {
    cy.intercept('GET', COMMENTS_URL, { statusCode: 200, body: emptyComments }).as('comments');

    cy.visit(`${DETAIL_URL}?e2e=1`);
    cy.wait('@detail');

    // Pressing the browser Back on a deep-linked detail must return to the list
    // (a /players entry is seeded beneath it), not leave the app.
    cy.go('back');
    cy.location('pathname').should('eq', '/players');
    cy.wait('@list');
    cy.get('[data-testid=home-grid]').should('exist');
  });
});
