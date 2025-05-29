import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'teacher' | 'student') => Promise<AuthResponse>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth muss innerhalb eines AuthProviders verwendet werden');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(authService.getUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Beim ersten Laden prüfen, ob der Benutzer bereits angemeldet ist
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuthenticated = authService.isAuthenticated();
        console.log('Auth Check - isAuthenticated:', isAuthenticated);
        
        if (isAuthenticated) {
          try {
            setLoading(true);
            const profile = await authService.getProfile();
            console.log('Benutzerprofil erfolgreich geladen:', profile);
            setUser(profile);
          } catch (err) {
            console.error('Fehler beim Abrufen des Benutzerprofils:', err);
            // Bei einem Fehler (z.B. abgelaufenes Token) den Benutzer abmelden
            authService.logout();
            setUser(null);
          } finally {
            setLoading(false);
          }
        } else {
          console.log('Kein authentifizierter Benutzer gefunden');
          setUser(null);
        }
      } catch (error) {
        console.error('Fehler bei der Authentifizierungsprüfung:', error);
        setUser(null);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Anmeldung');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: 'teacher' | 'student'): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.register({ name, email, password, role });
      setUser(response.user);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Registrierung');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isTeacher: !!user && user.role === 'teacher',
    isStudent: !!user && user.role === 'student',
    login,
    register,
    logout,
    loading,
    error
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
