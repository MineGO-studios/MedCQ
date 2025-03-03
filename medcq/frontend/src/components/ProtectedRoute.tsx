import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protected route component that redirects to login if user is not authenticated
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState } = useAuth();
  const { isAuthenticated, isLoading } = authState;

  // Show loading indicator while checking authentication status
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

export default ProtectedRoute;