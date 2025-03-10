// cypress/support/index.d.ts
declare namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with email and password
       * @example cy.login('test@example.com', 'password')
       */
      login(email: string, password: string): Chainable<void>
    }
  }