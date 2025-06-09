import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Bitte füllen Sie alle Felder aus.');
      return;
    }

    try {
      await login(email, password);
      navigate('/'); // Nach erfolgreicher Anmeldung zur Startseite navigieren
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Fehler bei der Anmeldung');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md card">
      <div className="card-body">
        <h1 className="text-2xl font-bold text-center mb-6 text-primary-dark">Anmelden</h1>
        
        {errorMessage && (
          <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded mb-4" role="alert">
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-neutral-dark text-sm font-medium mb-2">
              E-Mail
            </label>
            <input
              type="email"
              id="email"
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-neutral-dark text-sm font-medium mb-2">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 rounded-md"
              disabled={loading}
            >
              {loading ? 'Anmeldung...' : 'Anmelden'}
            </button>
            <Link to="/register" className="text-primary hover:text-primary-dark font-medium text-sm transition-colors">
              Konto erstellen
            </Link>
          </div>
          
          <div className="text-center mt-6">
            <Link to="/forgot-password" className="text-sm text-neutral hover:text-primary transition-colors">
              Passwort vergessen?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
