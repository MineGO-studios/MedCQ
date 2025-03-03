import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Application header with navigation and authentication controls
 */
const Header: React.FC = () => {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAuthenticated, user } = authState;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span 
                className="text-xl font-bold text-blue-600 cursor-pointer"
                onClick={() => navigate('/')}
              >
                MedCQ
              </span>
            </div>
            <nav className="ml-6 flex space-x-8">
              <a 
                href="/quizzes" 
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Quizzes
              </a>
              {isAuthenticated && (
                <a 
                  href="/dashboard" 
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                >
                  Dashboard
                </a>
              )}
            </nav>
          </div>

          {/* User profile and authentication */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {user?.name || user?.email}
                </span>
                <button
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  onClick={() => navigate('/profile')}
                >
                  Profile
                </button>
                <button
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 border-blue-600"
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <button
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 border-blue-600"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </button>
                <button
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  onClick={() => navigate('/register')}
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;