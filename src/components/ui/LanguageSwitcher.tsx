import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  name: string;
  flagComponent: React.ReactNode;
}

interface LanguageSwitcherProps {
  onLanguageChange?: () => void;
}

// Flaggen-Komponenten
const GermanFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="15" viewBox="0 0 5 3">
    <rect width="5" height="1" y="0" fill="#000000"/>
    <rect width="5" height="1" y="1" fill="#FF0000"/>
    <rect width="5" height="1" y="2" fill="#FFCC00"/>
  </svg>
);

const UKFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="15" viewBox="0 0 60 30">
    <clipPath id="s">
      <path d="M0,0 v30 h60 v-30 z"/>
    </clipPath>
    <clipPath id="t">
      <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/>
    </clipPath>
    <g clipPath="url(#s)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

// Französische Flagge
const FrenchFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="15" viewBox="0 0 900 600">
    <rect width="300" height="600" x="0" y="0" fill="#002395"/>
    <rect width="300" height="600" x="300" y="0" fill="#FFFFFF"/>
    <rect width="300" height="600" x="600" y="0" fill="#ED2939"/>
  </svg>
);

// Marokkanische Flagge
const MoroccanFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="15" viewBox="0 0 900 600">
    <rect width="900" height="600" fill="#c1272d"/>
    <path d="M450,225 L530.4,450 L335.1,307.5 H564.9 L369.6,450 z" fill="#006233" stroke="none"/>
  </svg>
);

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ onLanguageChange }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const languages: Language[] = [
    { code: 'de', name: 'Deutsch', flagComponent: <GermanFlag /> },
    { code: 'en', name: 'English', flagComponent: <UKFlag /> },
    { code: 'fr', name: 'Français', flagComponent: <FrenchFlag /> },
    { code: 'ar', name: 'العربية', flagComponent: <MoroccanFlag /> }
  ];
  
  const currentLanguage = languages.find(lang => lang.code === i18n.resolvedLanguage) || languages[0];
  
  const changeLanguage = (lng: string) => {
    // Sprache wechseln
    i18n.changeLanguage(lng);
    // Explizit im localStorage speichern, um sicherzustellen, dass die Einstellung erhalten bleibt
    localStorage.setItem('i18nextLng', lng);
    setIsOpen(false);
    // Wenn eine onLanguageChange-Funktion übergeben wurde, rufe sie auf
    if (onLanguageChange) {
      onLanguageChange();
    }
  };
  
  // Schließt das Dropdown, wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-primary-dark/30 hover:bg-primary-dark/50 transition-colors text-white"
      >
        <span className="mr-1">{currentLanguage.flagComponent}</span>
        <span className="text-sm font-medium">{currentLanguage.code.toUpperCase()}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg overflow-hidden z-50 border border-gray-200">
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                className={`flex items-center w-full px-4 py-2 text-sm ${i18n.resolvedLanguage === language.code ? 'bg-primary-dark/10 text-primary-dark font-medium' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <span className="mr-2">{language.flagComponent}</span>
                <span>{language.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;