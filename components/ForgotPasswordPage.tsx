import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setStatus('error');
      setMessage('Bitte geben Sie Ihre E-Mail-Adresse ein.');
      return;
    }

    try {
      setStatus('loading');
      const response = await authService.forgotPassword(email);
      setStatus('success');
      setMessage(response.message);
      if (response.emailPreviewUrl) {
        setEmailPreviewUrl(response.emailPreviewUrl);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Passwort zurücksetzen</h1>
      
      {status === 'success' && (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="mb-4">{message}</p>
          {emailPreviewUrl && (
            <div className="mb-4">
              <p className="mb-2 text-sm text-gray-600">Für Entwicklungszwecke:</p>
              <a 
                href={emailPreviewUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm"
              >
                E-Mail-Vorschau öffnen
              </a>
            </div>
          )}
          <Link 
            to="/login" 
            className="inline-block bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors"
          >
            Zurück zum Login
          </Link>
        </div>
      )}
      
      {status === 'loading' && (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p>E-Mail wird gesendet...</p>
        </div>
      )}
      
      {(status === 'idle' || status === 'error') && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Ihre E-Mail-Adresse"
              required
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
            Link zum Zurücksetzen senden
          </button>
          
          <div className="mt-4 text-center">
            <Link to="/login" className="text-primary hover:underline">
              Zurück zum Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;
