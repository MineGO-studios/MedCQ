// cypress/e2e/visual-regression.cy.ts
/// <reference types="cypress" />
import '@percy/cypress'
describe('Visual Regression Tests', () => {
    it('should verify the appearance of the dashboard page', () => {
    // In cypress/support/commands.ts
    Cypress.Commands.add('login', (email: string, password: string) => {
        // Implement login logic here
        cy.visit('/login');
        cy.get('[data-cy=email]').type(email);
        cy.get('[data-cy=password]').type(password);
        cy.get('[data-cy=submit]').click();
    });
      cy.visit('/dashboard');
      cy.wait(1000); // Allow animations to complete
      cy.percySnapshot('Dashboard Page');
    });
  
    it('should verify the appearance of the quiz list page', () => {
      cy.login('test@example.com', 'testpassword');
      cy.visit('/quizzes');
      cy.wait(1000);
      cy.percySnapshot('Quiz List Page');
    });
  
    it('should verify the appearance of the quiz detail page', () => {
      cy.login('test@example.com', 'testpassword');
      cy.visit('/quizzes/example-quiz-id');
      cy.wait(1000);
      cy.percySnapshot('Quiz Detail Page');
    });
  });