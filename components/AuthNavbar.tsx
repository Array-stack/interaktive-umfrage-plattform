import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthNavbar: React.FC = () => {
  const { user, isAuthenticated, isTeacher, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold">Umfrage-Plattform</Link>
            
            {/* Navigation Links */}
            <div className="hidden md:flex space-x-4">
              <Link to="/" className="hover:text-gray-200">Startseite</Link>
              
              {isTeacher && (
                <>
                  <Link to="/teacher" className="hover:text-gray-200">Meine Umfragen</Link>
                  <Link to="/teacher/create" className="hover:text-gray-200">Neue Umfrage</Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="hidden md:inline">Hallo, {user?.name}</span>
                <button 
                  onClick={handleLogout}
                  className="bg-white text-primary px-4 py-2 rounded hover:bg-gray-100"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="hover:text-gray-200"
                >
                  Anmelden
                </Link>
                <Link 
                  to="/register" 
                  className="bg-white text-primary px-4 py-2 rounded hover:bg-gray-100"
                >
                  Registrieren
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AuthNavbar;
