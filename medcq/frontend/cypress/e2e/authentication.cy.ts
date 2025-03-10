/// <reference types="cypress" />
// cypress/e2e/authentication.cy.ts
describe('Authentication Flow', () => {
    beforeEach(() => {
      cy.visit('/');
    });
  
    it('should allow user to log in', () => {
      cy.get('a[href="/login"]').click();
      cy.url().should('include', '/login');
      
      cy.get('#email-address').type('test@example.com');
      cy.get('#password').type('testpassword');
      cy.get('button[type="submit"]').click();
      
      // Verify redirect to dashboard after login
      cy.url().should('include', '/dashboard');
      cy.get('h1').should('contain', 'Dashboard');
    });
  
    it('should allow user to register', () => {
      cy.get('a[href="/register"]').click();
      cy.url().should('include', '/register');
      
      cy.get('#email-address').type('newuser@example.com');
      cy.get('#password').type('password123');
      cy.get('#confirm-password').type('password123');
      cy.get('button[type="submit"]').click();
      
      // Verify redirect to dashboard after registration
      cy.url().should('include', '/dashboard');
    });
  });
  
  // cypress/e2e/quiz-flow.cy.ts
  describe('Quiz Taking Flow', () => {
    beforeEach(() => {
      // Login and navigate to quizzes
      cy.log('test@example.com', 'testpassword');
      cy.visit('/quizzes');
    });
  
    it('should allow user to browse and start a quiz', () => {
      // Search for quiz
      cy.get('input[placeholder*="Search"]').type('Anatomy');
      cy.contains('.card', 'Anatomy').click();
      
      // View quiz details and start
      cy.contains('button', 'Start Quiz').click();
      cy.url().should('include', '/attempt');
      
      // Answer questions
      cy.get('.question-container').should('be.visible');
      cy.get('input[type="radio"]').first().check();
      cy.contains('button', 'Next').click();
      
      // Submit quiz
      cy.get('input[type="radio"]').first().check();
      cy.contains('button', 'Submit Quiz').click();
      cy.contains('button', 'Yes, submit').click();
      
      // Verify results page
      cy.contains('Quiz Results').should('be.visible');
      cy.contains('Your Score').should('be.visible');
    });
  });