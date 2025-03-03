import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quizzes" 
            element={
              <ProtectedRoute>
                <QuizListPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quizzes/:quizId" 
            element={
              <ProtectedRoute>
                <QuizDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quizzes/:quizId/attempt" 
            element={
              <ProtectedRoute>
                <QuizAttemptPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          
          {/* Not found route */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;