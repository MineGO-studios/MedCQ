// cypress/support/commands.ts
/// <reference types="cypress" />
/* global Cypress, cy */

Cypress.Commands.add('login', (email, password) => {
    // Implement your login logic here
    cy.visit('/login');
    cy.get('[data-cy=email-input]').type(email);
    cy.get('[data-cy=password-input]').type(password);
    cy.get('[data-cy=login-button]').click();
  });