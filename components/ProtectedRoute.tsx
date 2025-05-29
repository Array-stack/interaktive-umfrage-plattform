import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  requireTeacher?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requireTeacher = false }) => {
  const { isAuthenticated, isTeacher, loading } = useAuth();

  // Zeige Ladeindikator während die Authentifizierung überprüft wird
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Wenn der Benutzer nicht authentifiziert ist, zur Login-Seite umleiten
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Wenn die Route einen Lehrer erfordert, aber der Benutzer kein Lehrer ist
  if (requireTeacher && !isTeacher) {
    return <Navigate to="/" replace />;
  }

  // Der Benutzer ist authentifiziert und hat die erforderlichen Berechtigungen
  return <Outlet />;
};

export default ProtectedRoute;
