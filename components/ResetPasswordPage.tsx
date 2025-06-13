import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { useTranslation } from 'react-i18next';

// Hilfsfunktion zum Extrahieren von URL-Parametern
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ResetPasswordPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const query = useQuery();
  
  useEffect(() => {
    // Extrahiere das Token aus den URL-Parametern
    const tokenFromUrl = query.get('token');
    console.log('ResetPasswordPage - Token aus URL-Parametern:', tokenFromUrl);

    if (!tokenFromUrl) {
      console.error('Kein Token in der URL gefunden');
      setStatus('error');
      setMessage(t('auth_invalid_or_missing_link'));
      return;
    }
    
    // Token im State speichern
    setToken(tokenFromUrl);
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Submit-Button geklickt');
    
    if (!token) {
      console.error('Kein Token vorhanden');
      setStatus('error');
      setMessage(t('auth_invalid_or_expired_link'));
      return;
    }

    // Validierung der Eingaben
    if (!newPassword || !confirmPassword) {
      console.error('Nicht alle Felder ausgefüllt');
      setStatus('error');
      setMessage(t('auth_fill_all_fields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      console.error('Passwörter stimmen nicht überein');
      setStatus('error');
      setMessage(t('auth_passwords_not_match'));
      return;
    }

    if (newPassword.length < 8) {
      console.error('Passwort zu kurz');
      setStatus('error');
      setMessage(t('auth_password_min_length_8'));
      return;
    }

    try {
      console.log('Starte Passwort-Reset mit Token:', token);
      setStatus('loading');
      
      // Debug-Ausgabe der Anfrage-Daten
      const requestData = { token, newPassword };
      console.log('Sende Anfrage an den Server mit Daten:', requestData);
      
      const response = await authService.resetPassword(token, newPassword);
      console.log('Antwort vom Server erhalten:', response);
      
      if (response && response.message) {
        console.log('Passwort erfolgreich zurückgesetzt');
        setStatus('success');
        setMessage(response.message);
        
        // Nach erfolgreicher Änderung zur Login-Seite navigieren
        setTimeout(() => {
          console.log('Navigiere zur Login-Seite');
          navigate('/login', { 
            state: { 
              message: t('auth_password_reset_success_login')
            },
            replace: true // Verhindert, dass der Benutzer mit dem Zurück-Button zurückkommt
          });
        }, 3000);
      } else {
        const errorMsg = 'Ungültige Antwort vom Server';
        console.error(errorMsg, response);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('auth_unknown_error');
      console.error('Fehler beim Zurücksetzen des Passworts:', error);
      setStatus('error');
      setMessage(t('auth_error_reset_password', { error: errorMsg }));
    }
  };

  // Wenn die Seite geladen wird, aber noch kein Token gefunden wurde
  if (status === 'idle' && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('auth_checking_link')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">{t('auth_set_new_password')}</h1>
      
      {status === 'error' && !token ? (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="mb-4 text-red-600">{message}</p>
          <Link 
            to="/forgot-password" 
            className="inline-block bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors"
          >
            {t('auth_reset_password')}
          </Link>
        </div>
      ) : status === 'success' ? (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="mb-4">{message}</p>
          <button 
            onClick={() => navigate('/login')} 
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors"
          >
            {t('auth_to_login')}
          </button>
        </div>
      ) : status === 'loading' ? (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p>{t('auth_resetting_password')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth_new_password')}
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder={t('auth_new_password')}
              required
              minLength={8}
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth_confirm_password')}
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder={t('auth_confirm_password')}
              required
              minLength={8}
            />
          </div>
          
          {status === 'error' && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
              {message}
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors"
          >
            {t('auth_change_password')}
          </button>
          
          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="text-primary hover:underline font-medium"
            >
              {t('auth_back_to_login')}
            </Link>
          </div>
        </form>
      )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
