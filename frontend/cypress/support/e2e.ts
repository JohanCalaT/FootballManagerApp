// Loaded automatically before every spec. Imports the custom commands so
// they're attached to `cy`.
import './commands';

// Reset the Firebase Auth emulator state between specs so tests never leak
// users into each other. Cheap (single HTTP DELETE on the emulator REST API).
beforeEach(() => {
  cy.resetAuthEmulator();
});
