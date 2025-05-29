import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Extrahiere Parameter aus der URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('email');
    
    console.log('VerifyEmailPage - Aktuelle URL:', window.location.href);
    console.log('Token aus URL:', token);
    console.log('Email aus URL:', email);

    // Erstelle die Ziel-URL basierend auf den Parametern
    let targetUrl = '/';
    
    if (token) {
      console.log('Token gefunden, leite zur Passwort-Reset-Seite weiter');
      targetUrl = `/reset-password?token=${encodeURIComponent(token)}`;
    } else if (email) {
      console.log('E-Mail gefunden, leite zur Passwort-Vergessen-Seite weiter');
      targetUrl = `/forgot-password?email=${encodeURIComponent(email)}`;
    } else {
      console.error('Kein Token oder E-Mail in der URL gefunden');
      targetUrl = '/';
    }
    
    // Verwende die navigate-Funktion von react-router für saubere Navigation
    navigate(targetUrl, { replace: true });
  }, [navigate]);

  // Ladeanzeige während der Weiterleitung
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <div className="flex justify-center mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Bitte warten Sie</h2>
        <p className="text-gray-600">Sie werden weitergeleitet...</p>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
