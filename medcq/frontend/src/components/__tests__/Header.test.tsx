// frontend/src/components/__tests__/Header.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, test, expect } from 'vitest';
import Header from '../Header';
import { AuthContext } from '../../context/AuthContext';

// Mock the useNavigate hook
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('Header Component', () => {
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

  // Define a type for the context to allow user to be null or an object
  type AuthContextType = Omit<typeof mockAuthContext, 'authState'> & {
    authState: {
      user: null | { id: string; email: string; name?: string };
      isAuthenticated: boolean;
      isLoading: boolean;
      error: null;
    }
  };

  const renderWithRouter = (ui: React.ReactElement, context: AuthContextType = mockAuthContext) => {
    return render(
      <BrowserRouter>
        <AuthContext.Provider value={context}>
          {ui}
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  test('renders logo and navigation links', () => {
    renderWithRouter(<Header />);
    
    // Check if logo exists
    expect(screen.getByText('MedCQ')).toBeInTheDocument();
    
    // Check if Quizzes link exists
    expect(screen.getByText('Quizzes')).toBeInTheDocument();
  });

  test('shows sign in and sign up buttons when not authenticated', () => {
    renderWithRouter(<Header />);
    
    // Check if sign in button exists
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    
    // Check if sign up button exists
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    
    // Dashboard link should not exist
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  test('shows user info and profile links when authenticated', () => {
    const authenticatedContext = {
      ...mockAuthContext,
      authState: {
        isAuthenticated: true,
        user: { 
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User'
        },
        isLoading: false,
        error: null,
      },
    };
    
    renderWithRouter(<Header />, authenticatedContext);
    
    // User name should be displayed
    expect(screen.getByText('Test User')).toBeInTheDocument();
    
    // Profile and Sign Out buttons should exist
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    
    // Dashboard link should exist for authenticated users
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('calls signOut when sign out button is clicked', () => {
    const authenticatedContext = {
      ...mockAuthContext,
      authState: {
        isAuthenticated: true,
        user: { 
          id: 'test-user-id',
          email: 'test@example.com' 
        },
        isLoading: false,
        error: null,
      },
    };
    
    renderWithRouter(<Header />, authenticatedContext);
    
    // Click sign out button
    fireEvent.click(screen.getByText('Sign Out'));
    
    // Check if signOut function was called
    expect(authenticatedContext.signOut).toHaveBeenCalled();
  });
});