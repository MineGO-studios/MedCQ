/**
 * Firebase service configuration and utility functions
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
  UserCredential,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { User } from '../types';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Convert Firebase user to application User type
 */
export const mapFirebaseUser = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || undefined,
    photoUrl: firebaseUser.photoURL || undefined,
  };
};

/**
 * Firebase authentication service
 */
export const firebaseAuth = {
  /**
   * Sign in with email and password
   */
  signInWithEmail: async (email: string, password: string): Promise<UserCredential> => {
    return signInWithEmailAndPassword(auth, email, password);
  },

  /**
   * Sign in with Google
   */
  signInWithGoogle: async (): Promise<UserCredential> => {
    return signInWithPopup(auth, googleProvider);
  },

  /**
   * Register a new user with email and password
   */
  register: async (email: string, password: string): Promise<UserCredential> => {
    return createUserWithEmailAndPassword(auth, email, password);
  },

  /**
   * Sign out the current user
   */
  signOut: async (): Promise<void> => {
    return signOut(auth);
  },

  /**
   * Send password reset email
   */
  sendPasswordReset: async (email: string): Promise<void> => {
    return sendPasswordResetEmail(auth, email);
  },

  /**
   * Get the current user's Firebase token
   */
  getIdToken: async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChanged: (callback: (user: User | null) => void): (() => void) => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      callback(firebaseUser ? mapFirebaseUser(firebaseUser) : null);
    });
  },

  /**
   * Get the current user
   */
  getCurrentUser: (): User | null => {
    const firebaseUser = auth.currentUser;
    return firebaseUser ? mapFirebaseUser(firebaseUser) : null;
  },
};

export default app;