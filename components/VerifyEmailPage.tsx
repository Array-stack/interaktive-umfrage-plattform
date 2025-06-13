import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      console.log(t('auth_token_found_redirecting_reset'));
      targetUrl = `/reset-password?token=${encodeURIComponent(token)}`;
    } else if (email) {
      console.log(t('auth_email_found_redirecting_forgot'));
      targetUrl = `/forgot-password?email=${encodeURIComponent(email)}`;
    } else {
      console.error(t('auth_no_token_or_email_found'));
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('auth_please_wait')}</h2>
        <p className="text-gray-600">{t('auth_redirecting')}</p>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
