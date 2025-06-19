import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './ui/LanguageSwitcher';
import i18n from 'i18next';

// RTL-Sprachen definieren
const RTL_LANGUAGES = ['ar'];

const AuthNavbar: React.FC = () => {
  const { user, isAuthenticated, isTeacher, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-blue-600 text-white border-b border-primary-dark shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 overflow-visible">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center">
              <div className="flex items-center justify-center h-10 w-10 rounded-sm bg-white hover:bg-white/90 transition-all duration-200">
                <img 
                  src="/opinion-base-logo.svg" 
                  alt="OpinionBase Logo" 
                  className="h-7 w-7"
                />
              </div>
              <span className="ml-2 font-semibold text-lg text-white">OpinionBase</span>
            </Link>
            
            {/* Desktop Navigation Links */}
            <div className={`hidden md:flex ${RTL_LANGUAGES.includes(i18n.language) ? 'space-x-reverse space-x-6' : 'space-x-6'}`}>
              <Link to="/" className="text-white hover:text-neutral-light transition-colors duration-200 font-medium">{t('startseite')}</Link>
              
              {isTeacher ? (
                <>
                  <Link to="/teacher" className="text-white hover:text-neutral-light transition-colors duration-200 font-medium">{t('meine_umfragen')}</Link>
                  <Link to="/teacher/create" className="text-white hover:text-neutral-light transition-colors duration-200 font-medium">{t('neue_umfrage')}</Link>
                </>
              ) : (
                <Link to="/student" className="text-white hover:text-neutral-light transition-colors duration-200 font-medium">{t('meine_umfragen')}</Link>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <div className="text-white mr-2">{t('hallo')}, {user?.name}</div>
                  <LanguageSwitcher />
                  <button 
                    onClick={handleLogout}
                    className="bg-white text-primary-dark px-4 py-2 rounded-sm hover:bg-gray-100 transition-colors shadow-sm font-medium"
                  >
                    {t('abmelden')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <LanguageSwitcher />
                  <Link 
                    to="/login" 
                    className="text-white hover:text-neutral-light transition-colors duration-200 font-medium"
                  >
                    {t('anmelden')}
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-white text-primary-dark px-4 py-2 rounded-sm hover:bg-gray-100 transition-colors shadow-sm font-medium"
                  >
                    {t('registrieren')}
                  </Link>
                </div>
              )}
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={toggleMobileMenu}
                className="text-white p-2 focus:outline-none bg-primary-dark/50 rounded-md hover:bg-primary-dark transition-colors relative z-50"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed top-[57px] right-0 w-64 bg-primary border-t border-l border-primary-dark z-40 shadow-lg"> {/* Höhenbegrenzung entfernt */}
            <div className="flex flex-col space-y-3 pb-3 px-4 pt-3"> {/* Padding hinzugefügt */}
              <Link to="/" className="text-white hover:text-neutral-light transition-colors duration-200 font-medium" onClick={closeMobileMenu}>{t('startseite')}</Link>
              
              {isTeacher ? (
                <>
                  <Link to="/teacher" className="text-white hover:text-neutral-light transition-colors duration-200 font-medium" onClick={closeMobileMenu}>{t('meine_umfragen')}</Link>
                  <Link to="/teacher/create" className="text-white hover:text-neutral-light transition-colors duration-200 font-medium" onClick={closeMobileMenu}>{t('neue_umfrage')}</Link>
                </>
              ) : (
                <Link to="/student" className="text-white hover:text-neutral-light transition-colors duration-200 font-medium" onClick={closeMobileMenu}>{t('meine_umfragen')}</Link>
              )}
              
              {isAuthenticated ? (
                <>
                  <div className="text-white">{t('hallo')}, {user?.name}</div>
                  <button 
                    onClick={() => {
                      handleLogout();
                      closeMobileMenu();
                    }}
                    className="bg-white text-primary-dark px-4 py-2 rounded-sm hover:bg-gray-100 transition-colors shadow-sm w-full text-left font-medium"
                  >
                    {t('abmelden')}
                  </button>
                  <div className="mt-4">
                    <LanguageSwitcher onLanguageChange={closeMobileMenu} />
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="text-white hover:text-neutral-light transition-colors duration-200 font-medium"
                    onClick={closeMobileMenu}
                  >
                    {t('anmelden')}
                  </Link>
                  <Link 
                    to="/register" 
                    className="bg-white text-primary-dark px-4 py-2 rounded-sm hover:bg-gray-100 transition-colors shadow-sm block text-center font-medium"
                    onClick={closeMobileMenu}
                  >
                    {t('registrieren')}
                  </Link>
                  <div className="mt-4">
                    <LanguageSwitcher onLanguageChange={closeMobileMenu} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default AuthNavbar;
