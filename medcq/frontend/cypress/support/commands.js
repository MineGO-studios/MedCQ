// cypress/support/commands.ts
Cypress.Commands.add('login', (email: string, password: string) => {
    // Implement your login logic here
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type(email);
    cy.get('[data-cy=password-input]').type(password);
    cy.get('[data-cy=login-button]').click();
  });