# MedCQ Testing Guide

## Overview

This document outlines the testing approach for the MedCQ application, covering both frontend and backend testing strategies.

## Testing Principles

1. **Test Pyramid Approach**: We follow the test pyramid approach with more unit tests than integration tests, and fewer end-to-end tests.
2. **Test Coverage**: We aim for at least 80% code coverage across critical business logic.
3. **Test Independence**: Tests should be independent of each other and should not rely on external services.
4. **Test Data**: Use factories and fixtures for consistent test data generation.
5. **Test Environment**: Tests should run in an isolated environment that mimics production as closely as possible.

## Backend Testing

### Unit Tests

- **Domain Models**: Test model validation, relationships, and business rules.
- **Services**: Test business logic with mocked dependencies.
- **Repositories**: Test data access patterns with mocked database responses.
- **Utilities**: Test helper functions and shared utilities.

### Integration Tests

- **API Endpoints**: Test API request/response handling, validation, and error scenarios.
- **Database Access**: Test actual database interactions (with test database).
- **Authentication**: Test authentication flows and authorization rules.

### Test Setup

- **pytest**: We use pytest as our testing framework.
- **Fixtures**: Define fixtures in `conftest.py` for reusable test setup.
- **Mocking**: Use unittest.mock for mocking dependencies.
- **Database**: Use test database or in-memory database for integration tests.

### Running Backend Tests

```bash
# Run all tests
cd backend
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_quiz_service.py

# Run tests matching a specific name pattern
pytest -k "test_create_quiz"