import React, { useState, useEffect } from 'react';
import Button from './Button';
import Card from './Card';
import { useTranslation } from 'react-i18next'; // Importieren Sie useTranslation
import type { TFunction } from 'i18next'; // Import TFunction from i18next

interface CookieSettings {
  marketing: boolean;
  statistics: boolean;
  preferences: boolean;
}

interface CookieConsentProps {
  onAcceptAll: () => void;
  onSaveSettings: (settings: CookieSettings) => void;
  onOpenSettings: () => void;
  t?: TFunction<"translation", undefined>; // Add this line if you need to pass t
}

export const CookieConsentBanner: React.FC<CookieConsentProps> = ({
  onAcceptAll,
  onSaveSettings,
  onOpenSettings: _onOpenSettings // Rename to indicate it's unused
}) => {
  const { t } = useTranslation(); // Verwenden Sie den t-Funktion für Übersetzungen
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<CookieSettings>({
    marketing: false,
    statistics: false,
    preferences: false
  });

  useEffect(() => {
    // Prüfen, ob bereits Einstellungen gespeichert wurden
    const savedConsent = localStorage.getItem('cookieConsent');
    if (!savedConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const allSettings: CookieSettings = {
      marketing: true,
      statistics: true,
      preferences: true
    };
    localStorage.setItem('cookieConsent', JSON.stringify(allSettings));
    setShowBanner(false);
    onAcceptAll();
  };

  const handleSaveSettings = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(settings));
    setShowBanner(false);
    setShowSettings(false);
    onSaveSettings(settings);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-neutral-light/80 backdrop-blur-sm">
      <div className="container mx-auto">
        <Card className="border-primary-light shadow-md">
          <div className="p-4 md:p-6">
            {!showSettings ? (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-primary-dark mb-2">{t('cookie_settings_title')}</h3>
                    <p className="text-neutral-dark text-sm mb-4 md:mb-0">
                      {t('cookie_settings_description')} 
                      <a href="/datenschutz" className="text-primary hover:underline">{t('privacy_policy')}</a>.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleSettings}
                      className="whitespace-nowrap"
                    >
                      {t('settings')}
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={handleAcceptAll}
                      className="whitespace-nowrap"
                    >
                      {t('accept_all')}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-primary-dark mb-4">{t('cookie_settings_customize')}</h3>
                <p className="text-neutral-dark text-sm mb-4">
                  {t('cookie_settings_customize_description')}
                </p>
                
                <div className="mb-6 space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="essential"
                        name="essential"
                        type="checkbox"
                        checked={true}
                        disabled
                        className="h-4 w-4 text-primary border-neutral-light rounded focus:ring-primary"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="essential" className="font-medium text-neutral-dark">{t('cookie_essential')}</label>
                      <p className="text-neutral">{t('cookie_essential_description')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="preferences"
                        name="preferences"
                        type="checkbox"
                        checked={settings.preferences}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary border-neutral-light rounded focus:ring-primary"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="preferences" className="font-medium text-neutral-dark">{t('cookie_preferences')}</label>
                      <p className="text-neutral">{t('cookie_preferences_description')}</p>
                    </div>
                  </div>
                  
                  {/* Weitere Cookie-Typen ähnlich anpassen */}
                  
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleSettings}
                  >
                    {t('back')}
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleSaveSettings}
                  >
                    {t('save')}
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleAcceptAll}
                  >
                    {t('accept_all')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// Komponente für den persistenten Footer-Link
export const CookieSettingsButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const { t } = useTranslation();
  return (
    <button 
      onClick={onClick}
      className="bg-primary hover:bg-primary-dark text-white hover:text-neutral-light transition-colors text-sm px-3 py-1 rounded-md"
      aria-label={t('cookie_settings')}
    >
      {t('cookie_settings')}
    </button>
  );
};

// Hook für die Cookie-Verwaltung
export const useCookieConsent = () => {
  const [cookieSettings, setCookieSettings] = useState<CookieSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Beim Laden der Komponente gespeicherte Einstellungen abrufen
    const savedConsent = localStorage.getItem('cookieConsent');
    if (savedConsent) {
      setCookieSettings(JSON.parse(savedConsent));
    }
  }, []);

  const handleAcceptAll = () => {
    const allSettings: CookieSettings = {
      marketing: true,
      statistics: true,
      preferences: true
    };
    setCookieSettings(allSettings);
    localStorage.setItem('cookieConsent', JSON.stringify(allSettings));
  };

  const handleSaveSettings = (settings: CookieSettings) => {
    setCookieSettings(settings);
    localStorage.setItem('cookieConsent', JSON.stringify(settings));
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  return {
    cookieSettings,
    showSettings,
    handleAcceptAll,
    handleSaveSettings,
    handleOpenSettings,
    handleCloseSettings
  };
};

export default {
  CookieConsentBanner,
  CookieSettingsButton,
  useCookieConsent
};