// src/context/AuthContext.tsx

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthState, User } from '../types';
import { firebaseAuth } from '../services/firebase';
import { authApi } from '../services/api';

// Default authentication state
const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Create context with type definitions
interface AuthContextType {
  authState: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
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
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Function to start token refresh timer
  const startRefreshTimer = useCallback((expiresIn: number) => {
    // Refresh 5 minutes before expiration or halfway through if less than 10 minutes
    const refreshTime = Math.min(expiresIn - 5 * 60, expiresIn / 2) * 1000;
    
    // Clear existing timer if any
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    
    // Set new timer
    const timer = setTimeout(async () => {
      try {
        const response = await authApi.refreshToken();
        
        if (response.data?.expires_in) {
          // Restart timer with new expiration
          startRefreshTimer(response.data.expires_in);
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Handle refresh failure - logout user
        await signOut();
      }
    }, Math.max(refreshTime, 1000)); // Ensure at least 1 second delay
    
    setRefreshTimer(timer);
  }, [refreshTimer]);

  // Initialize auth state when component mounts
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Get token from Firebase
          const firebaseToken = await user.getIdToken();
          
          if (firebaseToken) {
            // Exchange Firebase token for our backend JWT
            const response = await authApi.loginWithFirebase(firebaseToken);
            
            if (response.data?.expires_in) {
              // Start refresh timer
              startRefreshTimer(response.data.expires_in);
              
              // Get user profile from backend
              const profileResponse = await authApi.getProfile();
              
              if (profileResponse.data) {
                setAuthState({
                  user: {
                    id: user.uid,
                    email: user.email || '',
                    name: profileResponse.data.name || user.displayName || undefined,
                    photoUrl: profileResponse.data.photo_url || user.photoURL || undefined,
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
            user: {
              id: user.uid,
              email: user.email || '',
              name: user.displayName || undefined,
              photoUrl: user.photoURL || undefined,
            },
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
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    });

    // Cleanup subscription and timer
    return () => {
      unsubscribe();
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [startRefreshTimer]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const userCredential = await firebaseAuth.signInWithEmail(email, password);
      const firebaseToken = await userCredential.user.getIdToken();
      
      // Exchange for backend token
      await authApi.loginWithFirebase(firebaseToken);
      
      // Auth state will be updated by the onAuthStateChanged listener
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      let errorMessage = 'Invalid email or password.';
      
      // Handle specific Firebase error codes
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      }
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const userCredential = await firebaseAuth.signInWithGoogle();
      const firebaseToken = await userCredential.user.getIdToken();
      
      // Exchange for backend token
      await authApi.loginWithFirebase(firebaseToken);
      
      // Auth state will be updated by the onAuthStateChanged listener
    } catch (error: any) {
      console.error('Google sign in error:', error);
      
      let errorMessage = 'Google sign in failed. Please try again.';
      
      // Handle specific error cases
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign in was cancelled. Please try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address but different sign-in credentials.';
      }
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  // Register a new user
  const register = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const userCredential = await firebaseAuth.register(email, password);
      const firebaseToken = await userCredential.user.getIdToken();
      
      // Exchange for backend token and create user profile
      await authApi.loginWithFirebase(firebaseToken);
      
      // Auth state will be updated by the onAuthStateChanged listener
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      // Handle specific Firebase error codes
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      }
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  // Sign out
  const signOut = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Clear refresh timer
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        setRefreshTimer(null);
      }
      
      // Call backend logout endpoint to clear cookies
      await authApi.logout();
      
      // Sign out from Firebase
      await firebaseAuth.signOut();
      
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
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Password reset failed. Please try again.';
      
      // Handle specific Firebase error codes
      if (error.code === 'auth/user-not-found') {
        // For security reasons, don't reveal if the email exists
        // Instead, treat it as success to prevent enumeration attacks
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
        return;
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      }
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
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