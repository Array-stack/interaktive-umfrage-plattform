import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import surveyService from "../services/surveyService";
import Button from "../components/ui/Button";
import Loader from '../components/ui/Loader';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

interface RecommendedSurvey {
  id: string;
  title: string;
  description: string;
  ownerName: string;
  totalQuestions: number;
  responseCount: number;
  createdAt: string;
}

const HomePage: React.FC = () => {
  const { isAuthenticated, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [recommendedSurveys, setRecommendedSurveys] = useState<RecommendedSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    // Sprache auf Arabisch setzen
    i18n.changeLanguage('ar');
    fetchRecommendedSurveys();
  }, [isAuthenticated]);

  const fetchRecommendedSurveys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await surveyService.getRecommendedSurveys();
      // Überprüfe, ob die Antwort das Format { success: true, data: [...] } hat
      if (response && response.success && Array.isArray(response.data)) {
        setRecommendedSurveys(response.data);
      } else if (Array.isArray(response)) {
        // Falls die Antwort bereits ein Array ist
        setRecommendedSurveys(response);
      } else {
        // Fallback für unerwartete Antwortformate
        setRecommendedSurveys([]);
      }
    } catch (err) {
      console.error('Fehler beim Laden der empfohlenen Umfragen:', err);
      // Wenn der Fehler "Umfrage nicht gefunden" ist, setzen Sie einfach ein leeres Array
      if (err instanceof Error && err.message === 'Umfrage nicht gefunden.') {
        setRecommendedSurveys([]);
      } else {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der empfohlenen Umfragen');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSurveyClick = (surveyId: string) => {
    navigate(`/survey/${surveyId}`);
  };

  return (
    <div className="min-h-screen bg-base-100 overflow-x-hidden">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary to-primary-dark py-10 md:py-14 text-white overflow-hidden w-full rounded-lg shadow-lg mx-4 mr-8">
        <div className="container mx-auto px-4 max-w-4xl"> {/* Reduzierte maximale Breite */}
          <div className="max-w-2xl mx-auto text-center"> {/* Reduzierte maximale Breite */}
            <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white break-words"> {/* Kleinere Schriftgröße */}
              <span className="hidden md:inline">{t('hero_title_desktop')}</span>
              <span className="md:hidden">{t('hero_title_mobile')}</span>
            </h1>
            
            {/* Desktop Version */}
            <div className="mb-3"> {/* Reduzierter Abstand */}
              <div className="hidden md:flex items-center justify-center gap-2 text-lg md:text-xl font-semibold text-white/90"> {/* Kleinere Schriftgröße */}
                <span className="flex items-center">📝 {t('hero_feature_create')}</span>
                <span className="mx-1">•</span>
                <span className="flex items-center">📤 {t('hero_feature_distribute')}</span>
                <span className="mx-1">•</span>
                <span className="flex items-center">📊 {t('hero_feature_evaluate')}</span>
              </div>
              
              {/* Mobile Version */}
              <div className="md:hidden flex flex-row items-center justify-center gap-2 text-lg font-semibold text-white/90 px-4 pr-8"> {/* Padding rechts größer */}
                <span className="flex items-center text-center">📝 {t('hero_feature_create')}</span>
                <span className="flex items-center text-center">📤 {t('hero_feature_share')}</span>
                <span className="flex items-center text-center">📊 {t('hero_feature_evaluate')}</span>
              </div>
            </div>
            
            <p className="text-sm md:text-base text-white/80 mb-5 md:mb-6 max-w-full mx-auto px-3 pr-8 sm:px-0 break-words leading-tight"> {/* Anpassungen für bessere Lesbarkeit auf Mobilgeräten */}
              <span className="hidden md:inline">{t('hero_description_desktop')}</span>
              <span className="md:hidden">{t('hero_description_mobile')}</span>
            </p>
            
            {/* Verbesserte Button-Gruppe */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3 w-full max-w-sm mx-auto"> {/* Reduzierte Abstände und maximale Breite */}
              {!isAuthenticated ? (
                <>
                  <Button 
                    onClick={() => navigate('/login')} 
                    className="bg-accent text-white hover:bg-accent-dark font-extrabold shadow-md text-lg w-full sm:w-auto"
                    size="lg"
                  >
                    <span className="hidden sm:inline">{t('hero_button_start')}</span>
                    <span className="sm:hidden">{t('hero_button_start_mobile')}</span>
                  </Button>

                  <Button 
                    onClick={() => {
                      const aboutSection = document.getElementById('about-section');
                      if (aboutSection) {
                        aboutSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }} 
                    className="bg-transparent hover:bg-white/10 text-white border-2 border-white font-bold shadow-md w-full sm:w-auto"
                    size="lg"
                  >
                    <span className="hidden sm:inline">{t('hero_button_learn')}</span>
                    <span className="sm:hidden">{t('hero_button_learn_mobile')}</span>
                  </Button>
                </>
              ) : isTeacher ? (
                <>
                  <Button 
                    onClick={() => navigate('/teacher')} 
                    className="bg-neutral-light text-primary-dark hover:bg-neutral font-semibold w-full sm:w-auto"
                    size="lg"
                  >
                    {t('hero_button_teacher_dashboard')}
                  </Button>
                  <Button 
                    onClick={() => navigate('/teacher/create')} 
                    className="bg-accent text-white hover:bg-accent-dark font-semibold w-full sm:w-auto"
                    size="lg"
                  >
                    {t('hero_button_create_survey')}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => navigate('/student')} 
                  className="bg-neutral-light text-primary-dark hover:bg-neutral font-semibold w-full sm:w-auto"
                  size="lg"
                >
                  {t('hero_button_student_dashboard')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* End Hero Section */}

      {/* About Section */}
      <section id="about-section" className="py-12 mt-6 bg-white rounded-lg shadow-lg mx-4">
        <div className="container mx-auto px-4">
          <header className="text-center mb-8">
            
            <h2 className="text-3xl font-bold mb-4 text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              {t('about_title')}
            </h2>
            <p className="text-xl text-neutral mb-6 max-w-2xl mx-auto">
              <span className="hidden md:inline">{t('about_subtitle_desktop')}</span>
              <span className="md:hidden">{t('about_subtitle_mobile')}</span>
            </p>
            <div className="flex justify-center">
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-accent rounded-full"></div>
            </div>
          </header>
          
          <div className="max-w-5xl mx-auto">
            <div className="text-neutral mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md border border-neutral-light/50 mb-6 transform transition-all duration-300 hover:shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-primary flex items-center">
                  {i18n.language !== 'ar' ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="flex-grow text-left">{t('about_what_is_title')}</span>
                    </>
                  ) : (
                    <>
                      <span className="flex-grow text-right">{t('about_what_is_title')}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </>
                  )}
                </h3>
                <p className={`text-base leading-relaxed pr-9 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                  <span className="hidden md:inline">{t('about_what_is_desktop')}</span>
                  <span className="md:hidden">{t('about_what_is_mobile')}</span>
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border border-neutral-light/50 transform transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                  <h3 className="text-xl font-bold mb-4 text-primary flex items-center">
                    {i18n.language !== 'ar' ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="flex-grow text-left">
                          <span className="hidden md:inline">{t('about_features_title_desktop')}</span>
                          <span className="md:hidden">{t('about_features_title_mobile')}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex-grow text-right">
                          <span className="hidden md:inline">{t('about_features_title_desktop')}</span>
                          <span className="md:hidden">{t('about_features_title_mobile')}</span>
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </>
                    )}
                  </h3>
                  <ul className={`space-y-3 pr-9 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                    {[
                      t('about_features_desktop_1'),
                      t('about_features_desktop_2'),
                      t('about_features_desktop_3'),
                      t('about_features_desktop_4')
                    ].map((item, index) => (
                      <li key={index} className={`flex items-end hidden md:flex ${i18n.language === 'ar' ? 'justify-end w-full' : 'justify-start'}`}>
                        <span className={`${i18n.language === 'ar' ? 'w-full text-right' : ''}`}>{item}</span>
                      </li>
                    ))}
                    {[
                      t('about_features_mobile_1'),
                      t('about_features_mobile_2'),
                      t('about_features_mobile_3')
                    ].map((item, index) => (
                      <li key={index} className={`flex items-end md:hidden ${i18n.language === 'ar' ? 'justify-end w-full' : 'justify-start'}`}>
                        <span className={`${i18n.language === 'ar' ? 'w-full text-right' : ''}`}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md border border-neutral-light/50 transform transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                  <h3 className="text-xl font-bold mb-4 text-primary flex items-center">
                    {i18n.language !== 'ar' ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="flex-grow text-left">
                          <span className="hidden md:inline">{t('about_areas_title_desktop')}</span>
                          <span className="md:hidden">{t('about_areas_title_mobile')}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="flex-grow text-right">
                          <span className="hidden md:inline">{t('about_areas_title_desktop')}</span>
                          <span className="md:hidden">{t('about_areas_title_mobile')}</span>
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </>
                    )}
                  </h3>
                  <p className={`hidden md:block pr-9 mb-3 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>{t('about_areas_desktop')}</p>
                  <p className={`md:hidden pr-9 mb-3 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>{t('about_areas_mobile')}</p>
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-md border border-neutral-light/50 mt-8 transform transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                <h3 className="text-xl font-bold mb-4 text-primary flex items-center">
                  {i18n.language !== 'ar' ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="flex-grow text-left">
                        <span className="hidden md:inline">{t('about_advantages_title_desktop')}</span>
                        <span className="md:hidden">{t('about_advantages_title_mobile')}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex-grow text-right">
                        <span className="hidden md:inline">{t('about_advantages_title_desktop')}</span>
                        <span className="md:hidden">{t('about_advantages_title_mobile')}</span>
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </>
                  )}
                </h3>
                <ul className={`space-y-3 pr-9 grid md:grid-cols-3 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                  {[
                    t('about_advantages_desktop_1'),
                    t('about_advantages_desktop_2'),
                    t('about_advantages_desktop_3')
                  ].map((item, index) => (
                    <li key={index} className={`flex items-end hidden md:flex ${i18n.language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                      <span>{item}</span>
                    </li>
                  ))}
                  {[
                    t('about_advantages_mobile_1'),
                    t('about_advantages_mobile_2'),
                    t('about_advantages_mobile_3')
                  ].map((item, index) => (
                    <li key={index} className={`flex items-end md:hidden ${i18n.language === 'ar' ? 'justify-end w-full' : 'justify-start'}`}>
                      <span className={`${i18n.language === 'ar' ? 'w-full text-right' : ''}`}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Call to Action removed from here and moved to bottom */}
        </div>
      </section>

      {/* Featured Surveys Section */}
      <section className="container mx-auto px-4 py-10 bg-gradient-to-b from-base-100 to-white">
        <header className="text-center mb-8">
          <span className="inline-block px-4 py-1.5 text-sm font-semibold text-accent bg-accent/10 rounded-full mb-4">
            {t('featured_surveys_discover')}
          </span>
          <h2 className="text-3xl font-bold mb-4 text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            {t('featured_surveys_title')}
          </h2>
          <p className="text-xl text-neutral mb-6 max-w-2xl mx-auto">
            {t('featured_surveys_subtitle')}
          </p>
          <div className="flex justify-center">
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-accent rounded-full"></div>
          </div>
        </header>
        
        {loading ? (
          <div className="flex justify-center">
            <Loader variant="primary" size="lg" text={t('featured_surveys_loading')} />
          </div>
        ) : error ? (
          <div className="bg-error/10 text-error p-4 rounded-lg shadow-md border border-error/20">{error}</div>
        ) : recommendedSurveys.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-md border border-neutral-light max-w-2xl mx-auto">
            <svg className="w-20 h-20 mx-auto text-neutral/50 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl text-neutral font-medium">{t('featured_surveys_none_available')}</p>
            <p className="text-neutral/70 mt-2">{t('featured_surveys_check_later')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedSurveys.map((survey) => (
              <article 
                key={survey.id} 
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-[1.02] overflow-hidden border border-neutral-light/50 group"
                onClick={() => handleSurveyClick(survey.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-primary truncate group-hover:text-accent transition-colors duration-300">{survey.title}</h3>
                    <span className="bg-accent/10 text-accent text-xs px-3 py-1 rounded-full font-medium">
                      {survey.responseCount} {t('featured_surveys_participations')}
                    </span>
                  </div>
                  
                  <p className="text-neutral mb-6 line-clamp-2 text-base">
                    {survey.description || t('featured_surveys_no_description')}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-neutral-light/50">
                    <div className="flex justify-between text-sm text-neutral">
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {survey.ownerName}
                      </span>
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {survey.totalQuestions} {t('featured_surveys_questions')}
                      </span>
                    </div>
                    
                    <div className="mt-3 text-xs text-neutral flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      {t('featured_surveys_created_at')} {new Date(survey.createdAt).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Call to Action */}
      <div className="container mx-auto px-4 py-10">
        <div className="text-center bg-gradient-to-r from-primary/5 to-accent/5 p-8 rounded-lg border border-neutral-light/50 shadow-md">
          <p className="text-lg mb-6 font-medium text-primary text-center" dir="rtl">{t('cta_text')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              onClick={() => navigate('/register')} 
              className="bg-primary hover:bg-primary-dark text-white font-extrabold shadow-md"
              size="md"
            >
              {t('cta_create_account')}
            </Button>
            <Button 
              onClick={() => navigate('/login')} 
              className="bg-accent text-white hover:bg-accent-dark border-2 border-accent font-extrabold shadow-md"
              size="md"
            >
              {t('cta_get_access')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
