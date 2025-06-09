import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from './ui/Loader';

const DashboardRedirect = () => {
  const { isAuthenticated, isTeacher, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else if (isTeacher) {
        navigate('/teacher');
      } else {
        navigate('/student');
      }
    }
  }, [isAuthenticated, isTeacher, loading, navigate]);

  return <LoadingSpinner text="Leite weiter..." />;
};

export default DashboardRedirect;