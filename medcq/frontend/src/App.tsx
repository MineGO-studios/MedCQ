// src/App.tsx

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { setupAuthInterceptor } from './services/api';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import QuizListPage from './pages/QuizListPage';
import QuizDetailPage from './pages/QuizDetailPage';
import QuizAttemptPage from './pages/QuizAttemptPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Auth interceptor setup component
const AuthInterceptorSetup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  
  useEffect(() => {
    // Set up interceptor when auth context is available
    setupAuthInterceptor(auth);
    
    // Add event listener for network status
    const handleOnline = () => {
      // When connection is restored, verify auth status
      if (auth.authState.isAuthenticated) {
        // Ping the server to check if session is still valid
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/health`, {
          credentials: 'include'
        }).catch(() => {
          // If the request fails, refresh token or redirect to login
          auth.authState.isAuthenticated && window.location.reload();
        });
      }
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [auth]);
  
  return <>{children}</>;
};

function AppContent() {
  return (
    <AuthInterceptorSetup>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                <DashboardPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quizzes" 
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                <QuizListPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quizzes/:quizId" 
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                <QuizDetailPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quizzes/:quizId/attempt" 
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                <QuizAttemptPage />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                <ProfilePage />
                </ErrorBoundary>
              </ProtectedRoute>
            } 
          />
          
          {/* Not found route */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
    </AuthInterceptorSetup>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;