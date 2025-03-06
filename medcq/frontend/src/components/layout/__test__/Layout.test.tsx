// src/components/layout/__tests__/Layout.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../../context/AuthContext';

// Mock the useAuth hook
const mockAuthContext = {
  authState: {
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
  },
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  register: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
};

describe('Layout Component', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          {ui}
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  test('renders children content', () => {
    renderWithRouter(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  test('renders header by default', () => {
    renderWithRouter(<Layout>Content</Layout>);
    
    // Header contains logo text
    expect(screen.getByText('MedCQ')).toBeInTheDocument();
  });

  test('hides header when hideHeader is true', () => {
    renderWithRouter(<Layout hideHeader>Content</Layout>);
    
    // Should not find the header with logo
    expect(screen.queryByText('MedCQ')).not.toBeInTheDocument();
  });

  test('updates document title when title prop is provided', () => {
    renderWithRouter(<Layout title="Test Page">Content</Layout>);
    
    expect(document.title).toBe('Test Page | MedCQ');
  });

  test('includes skip to content link for accessibility', () => {
    renderWithRouter(<Layout>Content</Layout>);
    
    const skipLink = screen.getByText('Skip to content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink.tagName).toBe('A');
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });
});