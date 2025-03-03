/**
 * Authentication context for managing user state across the application
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthState, User } from '../types';
import { firebaseAuth } from '../services/firebase';
import { authApi } from '../services/api';

// Default auth state
const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Create context
export const AuthContext = createContext<{
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}>({
  authState: initialAuthState,
  signIn: async () => {},
  signInWithGoogle: async () => {},
  register: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
});

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  // Initialize auth state when component mounts
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Get token from Firebase
          const firebaseToken = await firebaseAuth.getIdToken();
          
          if (firebaseToken) {
            // Exchange Firebase token for our backend JWT
            const response = await authApi.loginWithFirebase(firebaseToken);
            
            if (response.data?.access_token) {
              // Store backend token
              localStorage.setItem('token', response.data.access_token);
              
              // Get user profile from backend
              const profileResponse = await authApi.getProfile();
              
              if (profileResponse.data) {
                setAuthState({
                  user: {
                    ...user,
                    ...profileResponse.data,
                  },
                  isAuthenticated: true,
                  isLoading: false,
                  error: null,
                });
                return;
              }
            }
          }
          
          // If we get here, something went wrong with the backend integration
          // But we still have the Firebase user
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Error during authentication:', error);
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Authentication failed. Please try again.',
          });
        }
      } else {
        // No user is signed in
        localStorage.removeItem('token');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await firebaseAuth.signInWithEmail(email, password);
      // Auth state will be updated by the onAuthStateChanged listener
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Invalid email or password.',
      }));
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await firebaseAuth.signInWithGoogle();
      // Auth state will be updated by the onAuthStateChanged listener
    } catch (error) {
      console.error('Google sign in error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Google sign in failed. Please try again.',
      }));
    }
  };

  // Register a new user
  const register = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await firebaseAuth.register(email, password);
      // Auth state will be updated by the onAuthStateChanged listener
    } catch (error) {
      console.error('Registration error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Registration failed. Email may already be in use.',
      }));
    }
  };

  // Sign out
  const signOut = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await firebaseAuth.signOut();
      localStorage.removeItem('token');
      // Auth state will be updated by the onAuthStateChanged listener
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Sign out failed. Please try again.',
      }));
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await firebaseAuth.sendPasswordReset(email);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Password reset error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Password reset failed. Please try again.',
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        signIn,
        signInWithGoogle,
        register,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};