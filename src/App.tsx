import React, { useState, useEffect, createContext, useContext, useCallback, lazy, Suspense } from 'react';
import { setDocumentDirection } from './i18n';
import { useTranslation } from 'react-i18next';
import { HashRouter, Routes, Route, useParams, useNavigate, Link } from 'react-router-dom';
import { Survey, Question, QuestionType, NewSurvey, NewQuestion, SurveyResponse, NewSurveyResponse, Answer, ChartDataPoint } from './types';
import { surveyService } from './services/surveyService';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import AuthNavbar from './components/AuthNavbar';
import Loader from './components/ui/Loader';
import { CookieConsentBanner, CookieSettingsButton, useCookieConsent } from './components/ui/CookieConsent';

// Dynamische Importe für Komponenten
const LoginPage = lazy(() => import('../components/LoginPage'));
const RegisterPage = lazy(() => import('../components/RegisterPage'));
const VerifyEmailPage = lazy(() => import('../components/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('../components/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../components/ResetPasswordPage'));
const StudentDashboard = lazy(() => import('./pages/student').then(module => ({ default: module.StudentDashboard })));
const StudentManagement = lazy(() => import('./components/teacher/StudentManagement'));
const HomePage = lazy(() => import('./pages/HomePage'));
const DatenschutzPage = lazy(() => import('./pages/DatenschutzPage'));
const NutzungsbedingungenPage = lazy(() => import('./pages/NutzungsbedingungenPage'));
const ImpressumPage = lazy(() => import('./pages/ImpressumPage'));
const KontaktPage = lazy(() => import('./pages/KontaktPage'));

// Dynamischer Import für Recharts-Komponenten (nur wenn benötigt)
const ChartsComponents = lazy(() => import('recharts').then(module => ({
  default: {
    BarChart: module.BarChart,
    Bar: module.Bar,
    XAxis: module.XAxis,
    YAxis: module.YAxis,
    CartesianGrid: module.CartesianGrid,
    Tooltip: module.Tooltip,
    Legend: module.Legend,
    ResponsiveContainer: module.ResponsiveContainer,
    PieChart: module.PieChart,
    Pie: module.Pie,
    Cell: module.Cell
  }
})));

// ======== GERMAN LOCALIZATION HELPERS ======== //
const questionTypeDisplayNames: Record<QuestionType, string> = {
  [QuestionType.TEXT]: 'Text',
  [QuestionType.SINGLE_CHOICE]: 'Einfachauswahl',
  [QuestionType.MULTIPLE_CHOICE]: 'Mehrfachauswahl',
  [QuestionType.RATING_SCALE]: 'Bewertungsskala',
};

// ======== CONTEXT ======== //
interface SurveyAppContextType {
  surveys: Survey[];
  isLoading: boolean; // General context loading, primarily for fetching all surveys or creating new ones
  fetchSurveys: () => Promise<void>;
  addSurvey: (surveyData: NewSurvey) => Promise<Survey | null>;
  updateSurvey: (surveyId: string, surveyData: NewSurvey) => Promise<Survey | null>; // Update existing survey
  getSurveyById: (id: string) => Promise<Survey | null>; // Does not set global loading
  submitSurveyResponse: (responseData: NewSurveyResponse & { respondentId: string }) => Promise<SurveyResponse | null>; // Takes response data object, does not set global loading
  getResponsesBySurveyId: (surveyId: string) => Promise<SurveyResponse[]>; // Does not set global loading
}

const SurveyAppContext = createContext<SurveyAppContextType | undefined>(undefined);

const SurveyAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // For initial load and survey creation

  const fetchSurveys = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedSurveys = await surveyService.getSurveys();
      setSurveys(fetchedSurveys);
    } catch (error) {
      console.error("Failed to fetch surveys:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addSurvey = async (surveyData: NewSurvey): Promise<Survey | null> => {
    setIsLoading(true);
    try {
      const newSurvey = await surveyService.createSurvey(surveyData);
      setSurveys(prev => [...prev, newSurvey]);
      return newSurvey;
    } catch (error) {
      console.error("Failed to create survey:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateSurvey = async (surveyId: string, surveyData: NewSurvey): Promise<Survey | null> => {
    setIsLoading(true);
    try {
      const updatedSurvey = await surveyService.updateSurvey(surveyId, surveyData);
      // Aktualisiere die Umfrage im State
      setSurveys(prev => prev.map(survey => 
        survey.id === updatedSurvey.id ? updatedSurvey : survey
      ));
      return updatedSurvey;
    } catch (error) {
      console.error("Failed to update survey:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const getSurveyById = async (id: string): Promise<Survey | null> => {
    // This function no longer sets global isLoading
    try {
      const survey = await surveyService.getSurvey(id);
      return survey || null;
    } catch (error) {
      console.error("Failed to fetch survey:", error);
      return null;
    }
  };

  const submitSurveyResponse = async (responseData: NewSurveyResponse & { respondentId: string }): Promise<SurveyResponse | null> => {
    // This function no longer sets global isLoading and uses passed respondentId
    try {
      const response = await surveyService.submitResponse(responseData);
      return response;
    } catch (error) {
      console.error("Failed to submit response:", error);
      return null;
    }
  };

  const getResponsesBySurveyId = async (surveyId: string): Promise<SurveyResponse[]> => {
    // This function no longer sets global isLoading
    try {
      const responses = await surveyService.getResponsesForSurvey(surveyId);
      return responses;
    } catch (error) {
      console.error("Failed to fetch responses:", error);
      return [];
    }
  };


  useEffect(() => {
    fetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SurveyAppContext.Provider value={{ surveys, isLoading, fetchSurveys, addSurvey, updateSurvey, getSurveyById, submitSurveyResponse, getResponsesBySurveyId }}>
      {children}
    </SurveyAppContext.Provider>
  );
};

const useSurveyApp = () => {
  const context = useContext(SurveyAppContext);
  if (!context) {
    throw new Error('useSurveyApp must be used within a SurveyAppProvider');
  }
  return context;
};


// ======== UI COMPONENTS ======== //

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'; size?: 'sm' | 'md' | 'lg'; fullWidth?: boolean }> = ({ children, className, variant = 'primary', size = 'md', fullWidth = false, ...props }) => {
  const baseStyle = "font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed";
  const variantStyles = {
    primary: "bg-primary hover:bg-blue-600 text-white focus:ring-blue-400",
    secondary: "bg-secondary hover:bg-emerald-600 text-white focus:ring-emerald-400",
    danger: "bg-error hover:bg-red-600 text-white focus:ring-red-400",
    ghost: "bg-transparent hover:bg-gray-200 text-neutral focus:ring-gray-400 border border-gray-300",
    outline: "bg-white hover:bg-gray-100 text-primary border border-primary focus:ring-primary-light"
  };
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };
  const widthClass = fullWidth ? 'w-full' : '';
  return (
    <button className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${widthClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: boolean }> = ({ label, id, className, error, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input id={id} className={`block w-full px-3 py-2 border ${error ? 'border-error' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${className}`} {...props} />
    </div>
  );
};

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: boolean }> = ({ label, id, className, error, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <textarea id={id} className={`block w-full px-3 py-2 border ${error ? 'border-error' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${className}`} {...props} />
    </div>
  );
};

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[] }> = ({ label, id, options, className, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select id={id} className={`block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${className}`} {...props}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md animate-slideInUp">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-neutral">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Modal schließen">&times;</Button>
        </div>
        {children}
      </div>
    </div>
  );
};

const LoadingSpinner: React.FC<{text?: string}> = ({text = "Wird geladen..."}) => (
  <div className="flex flex-col items-center justify-center py-10">
    <svg className="animate-spin h-10 w-10 text-primary mb-3" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-neutral">{text}</p>
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white shadow-lg rounded-xl p-6 ${className}`}>
    {children}
  </div>
);

// Navbar-Komponente wurde durch AuthNavbar ersetzt

// ======== HELPER FUNCTIONS ======== //
const generateCsv = (survey: Survey, responses: SurveyResponse[]): string => {
  if (!survey || responses.length === 0) return "";

  const headers = ['Antwortende Person ID', 'Abgegeben am', ...survey.questions.map(q => q.text)];
  const rows = responses.map(response => {
    const row = [response.respondentId, new Date(response.submittedAt).toLocaleString('de-DE')];
    survey.questions.forEach(q => {
      const answer = response.answers.find(a => a.questionId === q.id);
      if (answer) {
        if (Array.isArray(answer.value)) {
          const choiceTexts = answer.value.map(val => q.choices?.find(c => c.id === val)?.text || val);
          row.push(choiceTexts.join('; '));
        } else if (q.type === QuestionType.SINGLE_CHOICE) {
           const choiceText = q.choices?.find(c => c.id === answer.value)?.text || answer.value;
           row.push(String(choiceText));
        } else {
          row.push(String(answer.value));
        }
      } else {
        row.push('');
      }
    });
    return row;
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
};

const downloadCsv = (csvString: string, filename: string) => {
  const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const processChartData = (question: Question, responses: SurveyResponse[]): ChartDataPoint[] => {
  const dataMap = new Map<string, number>();
  
  responses.forEach(response => {
    const answer = response.answers.find(a => a.questionId === question.id);
    if (!answer) return;

    if (question.type === QuestionType.TEXT && typeof answer.value === 'string') {
      dataMap.set(answer.value, (dataMap.get(answer.value) || 0) + 1);
    } else if (question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.RATING_SCALE) {
      let valueKey: string;
      if (question.type === QuestionType.SINGLE_CHOICE) {
        // Verwende options anstelle von choices
        const optionIndex = parseInt(String(answer.value), 10);
        valueKey = !isNaN(optionIndex) && question.options?.[optionIndex] !== undefined 
          ? question.options[optionIndex] 
          : String(answer.value);
      } else { 
        valueKey = `${answer.value} Stern${Number(answer.value) !== 1 ? 'e' : ''}`;
      }
      dataMap.set(valueKey, (dataMap.get(valueKey) || 0) + 1);
    } else if (question.type === QuestionType.MULTIPLE_CHOICE && Array.isArray(answer.value)) {
      (answer.value as string[]).forEach(val => {
        const optionIndex = parseInt(val, 10);
        const choiceText = !isNaN(optionIndex) && question.options?.[optionIndex] !== undefined
          ? question.options[optionIndex]
          : val;
        dataMap.set(choiceText, (dataMap.get(choiceText) || 0) + 1);
      });
    }
  });

  // Konvertiere die Map in ein Array von { name, value } Objekten und sortiere nach Häufigkeit
  return Array.from(dataMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};


const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
const TeacherDashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const navigate = useNavigate();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [surveyLink, setSurveyLink] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Neue Funktion zum Abrufen der Lehrerumfragen
  const fetchTeacherSurveys = async () => {
    setIsLoading(true);
    try {
      console.log('Versuche Lehrerumfragen abzurufen...');
      const token = localStorage.getItem('auth_token');
      console.log('Auth-Token vorhanden:', !!token);
      
      const teacherSurveys = await surveyService.getTeacherSurveys();
      console.log('Lehrerumfragen erfolgreich abgerufen:', teacherSurveys.length);
      setSurveys(teacherSurveys);
    } catch (error) {
      console.error("Fehler beim Abrufen der Lehrerumfragen:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Überprüfe Authentifizierung und lade dann Umfragen
  useEffect(() => {
    const checkAuthAndFetchSurveys = async () => {
      // Kurze Verzögerung, um sicherzustellen, dass die Authentifizierung abgeschlossen ist
      await new Promise(resolve => setTimeout(resolve, 500));
      setAuthChecked(true);
      fetchTeacherSurveys();
    };
    
    checkAuthAndFetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Erneutes Laden der Umfragen, wenn der Benutzer zurück zum Dashboard navigiert
  useEffect(() => {
    const handleFocus = () => {
      if (authChecked) {
        fetchTeacherSurveys();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked]);

  const handleShare = (surveyId: string) => {
    const currentHref = window.location.href;
    const hashIndex = currentHref.indexOf('#');
    const baseHref = hashIndex === -1 ? currentHref : currentHref.substring(0, hashIndex);
    const newSurveyPathHash = `#/survey/${surveyId}`;
    const generatedLink = baseHref + newSurveyPathHash;
    
    setSurveyLink(generatedLink);
    setShareModalOpen(true);
  };

  const handleDeleteClick = (surveyId: string) => {
    setSurveyToDelete(surveyId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!surveyToDelete) return;
    
    setIsDeleting(true);
    try {
      await surveyService.deleteSurvey(surveyToDelete);
      await fetchTeacherSurveys(); // Aktualisiere die Liste der Lehrerumfragen
    } catch (error) {
      console.error('Fehler beim Löschen der Umfrage:', error);
      alert('Fehler beim Löschen der Umfrage. Bitte versuchen Sie es erneut.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setSurveyToDelete(null);
    }
  };

  if (isLoading && surveys.length === 0) return <Loader variant="primary" size="lg" text={t('teacher_dashboard_loading')} />;

  // RTL-Unterstützung nur für Arabisch aktivieren
  const isRTL = i18n.language === 'ar';
  
  return (
    <div className="max-w-5xl mx-auto p-6 animate-fadeIn" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-primary-dark">{t('teacher_dashboard_title')}</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/teacher/students')} variant="secondary" size="md">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            {t('teacher_dashboard_student_management')}
          </Button>
          <Button onClick={() => navigate('/teacher/create')} variant="primary" size="md">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('teacher_dashboard_create_survey')}
          </Button>
        </div>
      </div>

      {surveys.length === 0 && !isLoading && (
        <div className="card">
          <div className="card-body text-center py-10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-neutral-light mx-auto mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75s.168-.75.375-.75S9.75 9.336 9.75 9.75Zm-1.875 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm4.125 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Z" />
            </svg>
            <p className="text-xl text-primary-dark">{t('teacher_dashboard_no_surveys')}</p>
            <p className="text-neutral mt-2">{t('teacher_dashboard_create_first')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {surveys.map(survey => (
          <div key={survey.id} className="card hover:shadow-lg transition-all duration-300">
            <div className="card-body flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary-dark mb-2">{survey.title}</h2>
                <p className="text-neutral text-sm mb-1">
                  {isRTL ? (
                    <>
                      {new Date(survey.createdAt).toLocaleDateString('ar-SA')} {t('teacher_dashboard_created_at')}
                    </>
                  ) : (
                    <>
                      {t('teacher_dashboard_created_at')} {new Date(survey.createdAt).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                    </>
                  )}
                </p>
                <p className="text-neutral-dark text-sm mb-4 line-clamp-2">{survey.description}</p>
              </div>
              <div className="mt-auto pt-4 border-t border-neutral-light/50 space-y-2">
                <Button 
                  onClick={() => navigate(`/teacher/results/${survey.id}`)} 
                  variant="secondary" 
                  size="sm" 
                  fullWidth
                  className={isRTL ? 'text-right' : 'text-left'}
                >
                  {t('teacher_dashboard_show_results')}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => handleShare(survey.id)} 
                    variant="outline" 
                    size="sm" 
                    fullWidth
                    className={isRTL ? 'text-right' : 'text-left'}
                  >
                    {t('teacher_dashboard_share')}
                  </Button>
                  <Button 
                    onClick={() => handleDeleteClick(survey.id)}
                    variant="danger" 
                    size="sm" 
                    fullWidth
                    disabled={isDeleting}
                    className={isRTL ? 'text-right' : 'text-left'}
                  >
                    {isDeleting && surveyToDelete === survey.id ? t('teacher_dashboard_delete') + '...' : t('teacher_dashboard_delete')}
                  </Button>
                </div>
                <Button 
                  onClick={() => navigate(`/teacher/edit/${survey.id}`)} 
                  variant="primary" 
                  size="sm" 
                  fullWidth
                  className={isRTL ? 'text-right' : 'text-left'}
                >
                  {t('teacher_dashboard_edit')}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} title={t('teacher_dashboard_share_link')}>
        <div dir={isRTL ? 'rtl' : 'ltr'}>
          <p className="text-neutral-dark mb-4">{t('teacher_dashboard_share_text')}</p>
          <Input type="text" value={surveyLink} readOnly className="mb-4 bg-neutral-light/20" style={{ direction: 'ltr' }} />
          <Button 
            onClick={() => { navigator.clipboard.writeText(surveyLink); alert(t('teacher_dashboard_link_copied')); }} 
            variant="primary" 
            fullWidth
            className={isRTL ? 'text-right' : 'text-left'}
          >
            {t('teacher_dashboard_copy_link')}
          </Button>
        </div>
      </Modal>

      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        title={t('teacher_dashboard_delete_survey')}
      >
        <div dir={isRTL ? 'rtl' : 'ltr'}>
          <p className="text-neutral-dark mb-6">{t('teacher_dashboard_delete_confirm')}</p>
          <div className={`flex justify-end ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
            <Button 
              onClick={() => setShowDeleteConfirm(false)} 
              variant="secondary"
              disabled={isDeleting}
              className={isRTL ? 'text-right' : 'text-left'}
            >
              {t('teacher_dashboard_cancel')}
            </Button>
            <Button 
              onClick={handleConfirmDelete} 
              variant="danger"
              disabled={isDeleting}
              className={isRTL ? 'text-right' : 'text-left'}
            >
              {isDeleting ? t('teacher_dashboard_delete') + '...' : t('teacher_dashboard_delete_final')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


const EditSurveyPage: React.FC = () => {
  const { getSurveyById, updateSurvey, isLoading } = useSurveyApp();
  const navigate = useNavigate();
  const { surveyId } = useParams<{ surveyId: string }>();
  
  const [surveyData, setSurveyData] = useState<{
    title: string;
    description: string;
    isPublic: boolean;
  }>({
    title: '',
    description: '',
    isPublic: true
  });
  
  const { title, description } = surveyData;
  
  const [questions, setQuestions] = useState<NewQuestion[]>([{ 
    text: '', 
    type: QuestionType.TEXT, 
    options: [],
    required: true 
  }]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSurveyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Lade die Umfragedaten beim ersten Rendern
  useEffect(() => {
    const loadSurvey = async () => {
      if (!surveyId) return;
      
      setIsPageLoading(true);
      setError(null);
      try {
        const survey = await getSurveyById(surveyId);
        if (survey) {
          // Konvertiere die Fragen in das NewQuestion-Format
          const newQuestions = survey.questions.map(q => ({
            text: q.text,
            type: q.type,
            options: q.options ? [...q.options] : [],
            required: q.required ?? true // Standardwert true, falls nicht vorhanden
          }));
          
          setSurveyData({
            title: survey.title || '',
            description: survey.description || '',
            isPublic: survey.isPublic ?? false
          });
          setQuestions(newQuestions);
        } else {
          setError('Umfrage nicht gefunden');
        }
      } catch (err) {
        console.error('Fehler beim Laden der Umfrage:', err);
        setError('Fehler beim Laden der Umfrage');
      } finally {
        setIsPageLoading(false);
      }
    };

    loadSurvey();
  // Entferne getSurveyById aus der Abhängigkeitsliste, da es sich bei jedem Rendering ändert
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId]);


  const handleAddQuestion = () => {
    setQuestions([...questions, { 
      text: '', 
      type: QuestionType.TEXT, 
      options: [],
      required: true 
    }]);
  };
  
  const handleQuestionChange = <K extends keyof NewQuestion,>(index: number, field: K, value: NewQuestion[K]) => {
    const newQuestions = [...questions];
    const updatedQuestion = { ...newQuestions[index], [field]: value };
    
    if (field === 'type') {
      if (value !== QuestionType.SINGLE_CHOICE && value !== QuestionType.MULTIPLE_CHOICE) {
        // Lösche options für nicht-auswählbare Fragetypen
        updatedQuestion.options = [];
      } else if (!updatedQuestion.options?.length) {
        // Initialisiere options für auswählbare Fragetypen
        updatedQuestion.options = ['Option 1', 'Option 2'];
      }
    }
    
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
  };

  const handleChoiceChange = (qIndex: number, cIndex: number, value: string) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options) {
      const newOptions = [...newQuestions[qIndex].options!];
      newOptions[cIndex] = value;
      newQuestions[qIndex] = {
        ...newQuestions[qIndex],
        options: newOptions
      };
      setQuestions(newQuestions);
    }
  };

  const handleAddChoice = (qIndex: number) => {
    const newQuestions = [...questions];
    const currentOptions = newQuestions[qIndex].options || [];
    newQuestions[qIndex] = {
      ...newQuestions[qIndex],
      options: [...currentOptions, `Option ${currentOptions.length + 1}`]
    };
    setQuestions(newQuestions);
  };
  
  const handleRemoveChoice = (qIndex: number, cIndex: number) => {
    const newQuestions = [...questions];
    const currentOptions = newQuestions[qIndex].options || [];
    
    if (currentOptions.length > 1) {
      const newOptions = [...currentOptions];
      newOptions.splice(cIndex, 1);
      
      newQuestions[qIndex] = {
        ...newQuestions[qIndex],
        options: newOptions
      };
      
      setQuestions(newQuestions);
    } else {
      alert("Eine Frage muss mindestens eine Antwortoption haben.");
    }
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
    } else {
      alert("Eine Umfrage muss mindestens eine Frage haben.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyId) {
      alert("Umfrage-ID fehlt.");
      return;
    }
    
    if (!title.trim() || !description.trim()) {
      alert("Titel und Beschreibung sind erforderlich.");
      return;
    }
    if (questions.length === 0) {
      alert("Mindestens eine Frage ist erforderlich.");
      return;
    }
    if (questions.some(q => !q.text.trim())) {
      alert("Alle Fragen müssen einen Text haben.");
      return;
    }
    if (questions.some(q => (q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTIPLE_CHOICE) && (!q.options || q.options.length === 0 || q.options.some((opt: string) => !opt.trim())))) {
      alert("Alle Antwortoptionen für Einfach-/Mehrfachauswahl-Fragen müssen einen Text haben.");
      return;
    }

    try {
      const newSurveyData: NewSurvey = { 
      title, 
      description, 
      isPublic: surveyData.isPublic, // Verwende den tatsächlichen Wert aus dem State
      questions: questions.map(q => {
        const question: NewQuestion = {
          text: q.text.trim(),
          type: q.type,
          required: q.required ?? true,
        };
        
        // Füge nur Optionen für die entsprechenden Fragetypen hinzu
        if (q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTIPLE_CHOICE) {
          question.options = q.options ? q.options.map(opt => opt.trim()).filter(opt => opt) : [];
          
          // Logging hinzufügen
          console.log(`Frage vom Typ ${q.type} mit ${question.options.length} Optionen:`, question.options);
          
          // Konvertiere options zu choices mit dem erwarteten Format
          question.choices = q.options ? q.options.map((opt, index) => ({ 
            id: `option-${index}`, 
            text: opt.trim() 
          })).filter(opt => opt.text) : [];
        }
        
        return question;
      })
    };
      await updateSurvey(surveyId, newSurveyData);
      alert('Umfrage erfolgreich aktualisiert!');
      navigate('/teacher');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Umfrage:', error);
      alert('Fehler beim Aktualisieren der Umfrage: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    }
  };

  if (isPageLoading) return <LoadingSpinner text="Umfrage wird geladen..." />;
  if (error) return (
    <div className="max-w-3xl mx-auto p-6 animate-fadeIn">
      <Card className="text-center py-10">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-error mx-auto mb-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <h1 className="text-2xl font-bold text-neutral mb-4">{error}</h1>
        <Button onClick={() => navigate('/teacher')} variant="primary">
          Zurück zum Dashboard
        </Button>
      </Card>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fadeIn">
      <h1 className="text-3xl font-bold text-neutral mb-8">Umfrage bearbeiten</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <Input 
            label="Umfragetitel" 
            name="title"
            value={title} 
            onChange={handleInputChange} 
            required 
            placeholder="z.B. Kurs-Feedback" 
          />
          <Textarea 
          label="Umfragebeschreibung" 
          name="description"
          value={description} 
          onChange={handleInputChange} 
          required 
          className="mt-4" 
          placeholder="z.B. Helfen Sie uns, uns zu verbessern, indem Sie Ihr Feedback geben." 
        />
        
        {/* Neue Checkbox für öffentliche Umfragen */}
        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="isPublic"
            name="isPublic"
            checked={surveyData.isPublic}
            onChange={e => setSurveyData(prev => ({ ...prev, isPublic: e.target.checked }))}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
            Öffentliche Umfrage (für alle sichtbar)
          </label>
        </div>
        </Card>

        {questions.map((q, qIndex) => (
          <Card key={`question-${qIndex}`} className="relative">
            <h3 className="text-lg font-semibold text-neutral mb-4">Frage {qIndex + 1}</h3>
            {questions.length > 1 && (
              <Button type="button" onClick={() => handleRemoveQuestion(qIndex)} variant="danger" size="sm" className="absolute top-4 right-4 !p-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
            <Textarea label="Fragetext" value={q.text} onChange={e => handleQuestionChange(qIndex, 'text', e.target.value)} required placeholder="z.B. Was hat Ihnen am besten gefallen?" />
            <Select
              label="Fragetyp"
              value={q.type}
              onChange={e => handleQuestionChange(qIndex, 'type', e.target.value as QuestionType)}
              options={Object.values(QuestionType).map(type => ({ value: type, label: questionTypeDisplayNames[type] }))}
              className="mt-4"
            />
            {(q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTIPLE_CHOICE) && q.options && (
              <div className="mt-4 space-y-3 pl-4 border-l-2 border-primary">
                <h4 className="text-sm font-medium text-gray-700">Antwortoptionen:</h4>
                {q.options.map((option, cIndex) => (
                  <div key={`option-${qIndex}-${cIndex}`} className="flex items-center space-x-2">
                    <Input 
                      type="text" 
                      value={option} 
                      onChange={e => handleChoiceChange(qIndex, cIndex, e.target.value)} 
                      placeholder={`Option ${cIndex + 1}`} 
                      className="flex-grow" 
                      required 
                    />
                    {q.options!.length > 1 && (  // Hier das Ausrufezeichen hinzugefügt
                      <Button 
                        type="button" 
                        onClick={() => handleRemoveChoice(qIndex, cIndex)} 
                        variant="ghost" 
                        size="sm" 
                        className="!p-1.5 text-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  onClick={() => handleAddChoice(qIndex)} 
                  variant="ghost" 
                  size="sm"
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Option hinzufügen
                  </span>
                </Button>
              </div>
            )}
          </Card>
        ))}
        
        <div className="flex justify-between items-center">
            <Button type="button" onClick={handleAddQuestion} variant="secondary">Weitere Frage hinzufügen</Button>
            <Button type="submit" disabled={isLoading} variant="primary" size="lg">
              {isLoading ? <LoadingSpinner text="Wird gespeichert..." /> : 'Änderungen speichern'}
            </Button>
        </div>
      </form>
    </div>
  );
};

const CreateSurveyPage: React.FC = () => {
  const { addSurvey, isLoading } = useSurveyApp(); // isLoading here is for survey creation
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [questions, setQuestions] = useState<NewQuestion[]>([{ 
    text: '', 
    type: QuestionType.TEXT, 
    options: [],
    required: true 
  }]);

  const handleAddQuestion = () => {
    setQuestions([...questions, { 
      text: `Frage ${questions.length + 1}`, 
      type: QuestionType.TEXT, 
      options: [],
      required: true 
    }]);
  };

  const handleQuestionChange = <K extends keyof NewQuestion,>(index: number, field: K, value: NewQuestion[K]) => {
    setQuestions(prevQuestions => {
      const newQuestions = [...prevQuestions];
      const updatedQuestion = { ...newQuestions[index] };
      
      // Spezielle Behandlung für Typ-Änderungen
      if (field === 'type') {
        const questionType = value as QuestionType;
        
        // Setze die Eigenschaften zurück, wenn sich der Typ ändert
        updatedQuestion.type = questionType;
        
        // Initialisiere Optionen für Single- und Multiple-Choice-Fragen
        if (questionType === QuestionType.SINGLE_CHOICE || questionType === QuestionType.MULTIPLE_CHOICE) {
          // Stelle sicher, dass options ein Array ist und mindestens eine Option enthält
          updatedQuestion.options = ['Option 1', 'Option 2'];
        } else {
          // Lösche Optionen für nicht-auswählbare Fragetypen
          delete updatedQuestion.options;
        }
        
        // Lösche veraltete choices-Eigenschaft, falls vorhanden
        if ('choices' in updatedQuestion) {
          delete updatedQuestion.choices;
        }
      } else {
        // Normale Aktualisierung für andere Felder
        updatedQuestion[field] = value;
      }
      
      newQuestions[index] = updatedQuestion;
      return newQuestions;
    });
  };

  const handleChoiceChange = (qIndex: number, cIndex: number, value: string) => {
    const newQuestions = [...questions];
    const question = { ...newQuestions[qIndex] };
    
    if (question.options && cIndex < question.options.length) {
      // Erstelle eine neue Options-Array mit der aktualisierten Option
      const newOptions = [...question.options];
      newOptions[cIndex] = value;
      
      // Aktualisiere die Frage mit den neuen Optionen
      question.options = newOptions;
      
      // Aktualisiere die Frage in der Liste
      newQuestions[qIndex] = question;
      setQuestions(newQuestions);
    }
  };

  const handleAddChoice = (qIndex: number) => {
    setQuestions(prevQuestions => {
      // Erstelle eine tiefe Kopie der Fragen
      const newQuestions = [...prevQuestions];
      
      // Erstelle eine tiefe Kopie der spezifischen Frage
      const question = { ...newQuestions[qIndex] };
      
      // Initialisiere options als leeres Array, falls nicht vorhanden
      const currentOptions = Array.isArray(question.options) ? [...question.options] : [];
      
      // Erstelle eine neue Option mit fortlaufender Nummer
      const optionNumber = currentOptions.length + 1;
      const newOption = `Option ${optionNumber}`;
      
      // Aktualisiere die Frage mit den neuen Optionen
      const updatedQuestion = {
        ...question,
        options: [...currentOptions, newOption]
      };
      
      // Aktualisiere die Frage in der Liste
      newQuestions[qIndex] = updatedQuestion;
      return newQuestions;
    });
  };

  const handleRemoveChoice = (qIndex: number, cIndex: number) => {
    const newQuestions = [...questions];
    const question = { ...newQuestions[qIndex] };
    
    if (question.options && question.options.length > 1) {
      try {
        // Erstelle eine neue Kopie des options-Arrays ohne die zu entfernende Option
        const newOptions = [...question.options];
        newOptions.splice(cIndex, 1);
        
        // Aktualisiere die Frage mit dem neuen options-Array
        question.options = newOptions;
        newQuestions[qIndex] = question;
        setQuestions(newQuestions);
      } catch (error) {
        console.error('Fehler beim Entfernen der Option:', error);
        // Falls ein Fehler auftritt, setze auf ein leeres Array mit einer Standardoption
        question.options = ['Option 1'];
        newQuestions[qIndex] = question;
        setQuestions(newQuestions);
      }
    } else {
      alert("Eine Frage muss mindestens eine Antwortoption haben.");
    }
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
    } else {
      alert("Eine Umfrage muss mindestens eine Frage haben.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
    if (!title.trim() || !description.trim()) {
      alert("Titel und Beschreibung sind erforderlich.");
      return;
    }
    
    // Überprüfe, ob alle Fragen einen Text haben
    const emptyQuestionTexts = questions.some(q => !q.text.trim());
    if (emptyQuestionTexts) {
      alert("Alle Fragen müssen einen Text haben.");
      return;
    }
    
    // Überprüfe die Antwortoptionen für Single- und Multiple-Choice-Fragen
    const invalidOptions = questions.some(q => {
      if (q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTIPLE_CHOICE) {
        return !q.options || q.options.length === 0 || q.options.some(opt => !opt.trim());
      }
      return false;
    });
    
    if (invalidOptions) {
      alert("Alle Antwortoptionen für Einfach-/Mehrfachauswahl-Fragen müssen einen Text haben.");
      return;
    }

    try {
      // Bereite die Umfragedaten vor
      const surveyData: NewSurvey = { 
        title: title.trim(), 
        description: description.trim(),
        isPublic: isPublic, // Verwende den Wert aus dem State
        questions: questions.map(q => {
          const question: NewQuestion = {
            text: q.text.trim(),
            type: q.type,
            required: q.required ?? true,
          };
          
          // Füge nur Optionen für die entsprechenden Fragetypen hinzu
          if (q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTIPLE_CHOICE) {
            question.options = q.options ? q.options.map(opt => opt.trim()).filter(opt => opt) : [];
            // Konvertiere options zu choices mit dem erwarteten Format
            question.choices = q.options ? q.options.map((opt, index) => ({
              id: `option-${index}`,
              text: opt.trim()
            })).filter(opt => opt.text) : [];
            
            // Logging hinzufügen
            console.log(`Frage vom Typ ${q.type} mit ${question.options.length} Optionen:`, question.options);
            console.log(`Konvertiert zu ${question.choices.length} choices:`, question.choices);
          }
          
          return question;
        })
      };
      
      // Sende die Umfrage an den Server
      const newSurvey = await addSurvey(surveyData);
      
      if (newSurvey) {
        alert('Umfrage erfolgreich erstellt!');
        navigate('/teacher');
      } else {
        throw new Error('Keine Daten vom Server erhalten');
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Umfrage:', error);
      alert(`Fehler beim Erstellen der Umfrage: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fadeIn">
      <h1 className="text-3xl font-bold text-neutral mb-8">Neue Umfrage erstellen</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <Input label="Umfragetitel" value={title} onChange={e => setTitle(e.target.value)} required placeholder="z.B. Kurs-Feedback" />
          <Textarea label="Umfragebeschreibung" value={description} onChange={e => setDescription(e.target.value)} required className="mt-4" placeholder="z.B. Helfen Sie uns, uns zu verbessern, indem Sie Ihr Feedback geben." />
          
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              name="isPublic"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
              Öffentliche Umfrage (für alle sichtbar)
            </label>
          </div>
        </Card>

        {questions.map((q, qIndex) => (
          <Card key={`question-${qIndex}`} className="relative">
            <h3 className="text-lg font-semibold text-neutral mb-4">Frage {qIndex + 1}</h3>
            {questions.length > 1 && (
              <Button type="button" onClick={() => handleRemoveQuestion(qIndex)} variant="danger" size="sm" className="absolute top-4 right-4 !p-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
            <Textarea label="Fragetext" value={q.text} onChange={e => handleQuestionChange(qIndex, 'text', e.target.value)} required placeholder="z.B. Was hat Ihnen am besten gefallen?" />
            <Select
              label="Fragetyp"
              value={q.type}
              onChange={e => handleQuestionChange(qIndex, 'type', e.target.value as QuestionType)}
              options={Object.values(QuestionType).map(type => ({ value: type, label: questionTypeDisplayNames[type] }))}
              className="mt-4"
            />
            {(q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTIPLE_CHOICE) && (
              <div className="mt-4 space-y-3 pl-4 border-l-2 border-primary">
                <h4 className="text-sm font-medium text-gray-700">Antwortoptionen:</h4>
                {q.options?.map((option, cIndex) => (
                  <div key={`option-${qIndex}-${cIndex}`} className="flex items-center space-x-2">
                    <Input 
                      type="text" 
                      value={option} 
                      onChange={e => handleChoiceChange(qIndex, cIndex, e.target.value)} 
                      placeholder={`Option ${cIndex + 1}`} 
                      className="flex-grow" 
                      required 
                    />
                    { (q.options?.length ?? 0) > 1 &&
                      <Button 
                        type="button" 
                        onClick={() => handleRemoveChoice(qIndex, cIndex)} 
                        variant="ghost" 
                        size="sm" 
                        className="!p-1.5 text-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </Button>
                    }
                  </div>
                ))}
                <Button type="button" onClick={() => handleAddChoice(qIndex)} variant="ghost" size="sm">Option hinzufügen</Button>
              </div>
            )}
          </Card>
        ))}
        
        <div className="flex justify-between items-center">
            <Button type="button" onClick={handleAddQuestion} variant="secondary">Weitere Frage hinzufügen</Button>
            <Button type="submit" disabled={isLoading} variant="primary" size="lg">
              {isLoading ? <LoadingSpinner text="Wird gespeichert..." /> : 'Umfrage speichern'}
            </Button>
        </div>
      </form>
    </div>
  );
};

const RESPONDENT_ID_LOCALSTORAGE_KEY = 'current_survey_respondent_id';

const TakeSurveyPage: React.FC = () => {
  const { surveyId: surveyIdParam } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const { getSurveyById, submitSurveyResponse } = useSurveyApp();
  
  // Ensure surveyId is always a string
  const surveyId = surveyIdParam || '';
  
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer['value']>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasAlreadyTaken, setHasAlreadyTaken] = useState(false);
  const [respondentId, setRespondentId] = useState<string>('');
  
  const [isSurveyLoading, setIsSurveyLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  
  // Schlüssel für das Speichern unvollständiger Antworten im localStorage
  const INCOMPLETE_ANSWERS_KEY = 'incomplete_survey_answers';

  // Funktion zum Speichern unvollständiger Antworten
  const saveIncompleteAnswers = () => {
    if (!survey || !respondentId) {
      console.log('Kann unvollständige Antworten nicht speichern: survey oder respondentId fehlt');
      return;
    }
    
    const incompleteData = {
      surveyId: survey.id,
      respondentId,
      answers,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Bestehende unvollständige Antworten laden
      const savedData = JSON.parse(localStorage.getItem(INCOMPLETE_ANSWERS_KEY) || '{}');
      console.log('Bestehende gespeicherte Daten:', savedData);
      
      // Aktualisieren oder hinzufügen
      savedData[survey.id] = incompleteData;
      
      // Zurück in localStorage speichern
      localStorage.setItem(INCOMPLETE_ANSWERS_KEY, JSON.stringify(savedData));
      console.log('Unvollständige Antworten gespeichert für Umfrage:', survey.id);
      console.log('Gespeicherte Daten:', incompleteData);
      
      // Überprüfen, ob die Daten korrekt gespeichert wurden
      const verifyData = JSON.parse(localStorage.getItem(INCOMPLETE_ANSWERS_KEY) || '{}');
      console.log('Verifizierte Daten nach dem Speichern:', verifyData[survey.id]);
    } catch (error) {
      console.error('Fehler beim Speichern unvollständiger Antworten:', error);
    }
  };

  // Funktion zum Laden unvollständiger Antworten
  const loadIncompleteAnswers = () => {
    if (!survey) return false; // Nur prüfen, ob survey existiert, nicht respondentId
    
    try {
      const savedData = JSON.parse(localStorage.getItem(INCOMPLETE_ANSWERS_KEY) || '{}');
      console.log('Gespeicherte Daten im localStorage:', savedData);
      console.log('Aktuelle Umfrage-ID:', survey.id);
      
      if (savedData[survey.id]) {
        // Wir ignorieren den respondentId-Vergleich vollständig
        console.log('Lade unvollständige Antworten:', savedData[survey.id]);
        
        // Aktuelle Antworten speichern, bevor wir sie überschreiben
        const currentAnswers = { ...answers };
        console.log('Aktuelle Antworten vor dem Laden:', currentAnswers);
        
        // Antworten aus dem localStorage setzen
        setAnswers(savedData[survey.id].answers);
        console.log('Antworten nach dem Laden:', savedData[survey.id].answers);
        
        return true; // Antworten wurden geladen
      } else {
        console.log('Keine gespeicherten Antworten für Umfrage-ID', survey.id, 'gefunden');
      }
      return false; // Keine Antworten gefunden
    } catch (error) {
      console.error('Fehler beim Laden unvollständiger Antworten:', error);
      return false;
    }
  };

  // Funktion zum Löschen unvollständiger Antworten nach erfolgreicher Übermittlung
  const clearIncompleteAnswers = () => {
    if (!survey) return;
    
    try {
      const savedData = JSON.parse(localStorage.getItem(INCOMPLETE_ANSWERS_KEY) || '{}');
      if (savedData[survey.id]) {
        delete savedData[survey.id];
        localStorage.setItem(INCOMPLETE_ANSWERS_KEY, JSON.stringify(savedData));
        console.log('Unvollständige Antworten gelöscht für Umfrage:', survey.id);
      }
    } catch (error) {
      console.error('Fehler beim Löschen unvollständiger Antworten:', error);
    }
  };

  useEffect(() => {
    // Check if we already have a respondent ID in localStorage
    const storedId = localStorage.getItem(RESPONDENT_ID_LOCALSTORAGE_KEY);
    if (storedId) {
      console.log('Using existing respondent ID from localStorage:', storedId);
      setRespondentId(storedId);
      
      // Immediately check if this respondent has already taken the survey
      const checkParticipation = async () => {
        try {
          setIsSurveyLoading(true);
          const hasTaken = await surveyService.checkIfSurveyTaken(surveyId);
          if (hasTaken) {
            console.log('User has already taken this survey (from initial check)');
            setHasAlreadyTaken(true);
          }
        } catch (error) {
          console.error('Error checking initial participation status:', error);
        } finally {
          setIsSurveyLoading(false);
        }
      };
      
      checkParticipation();
    } else {
      // Generate a new ID if none exists
      const newId = `resp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(RESPONDENT_ID_LOCALSTORAGE_KEY, newId);
      console.log('Generated and stored new respondent ID:', newId);
      setRespondentId(newId);
    }
  }, [surveyId]);

  // Load survey when component mounts or surveyId/respondentId changes
  useEffect(() => {
    const loadSurvey = async () => {
      if (!surveyId) {
        setPageError("Keine Umfrage-ID angegeben.");
        setIsSurveyLoading(false);
        return;
      }

      try {
        setIsSurveyLoading(true);
        setPageError(null);
        
        // First check if already taken to avoid unnecessary survey data loading
        try {
          const hasTaken = await surveyService.checkIfSurveyTaken(surveyId);
          if (hasTaken) {
            console.log('User has already taken this survey (from initial survey load)');
            setHasAlreadyTaken(true);
            // We still need to load the survey data to show the thank you message
            const surveyData = await getSurveyById(surveyId);
            if (surveyData) {
              setSurvey(surveyData);
            } else {
              setPageError("Umfrage konnte nicht geladen werden.");
            }
            return;
          }
        } catch (error) {
          console.error('Error in initial participation check:', error);
          // Continue loading the survey even if participation check fails
        }
        
        // If we get here, either the user hasn't taken the survey or there was an error
        const surveyData = await getSurveyById(surveyId);
        if (!surveyData) {
          setPageError("Umfrage nicht gefunden.");
          return;
        }
        
        console.log('Geladene Umfrage:', surveyData);
        
        // Process the survey data
        const processedSurvey = {
          ...surveyData,
          questions: surveyData.questions.map(question => {
            // Initialize options for single/multiple choice questions if missing
            if ((question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.MULTIPLE_CHOICE) && 
                (!question.options || question.options.length === 0)) {
              console.log(`Initialisiere Standardoptionen für Frage ${question.id} in TakeSurveyPage, da keine Optionen vorhanden sind`);
              return {
                ...question,
                options: ['Option 1', 'Option 2']
              };
            }
            
            // Wichtig: Wenn Optionen vorhanden sind, behalte sie bei und logge sie
            if (question.options && question.options.length > 0) {
              console.log(`Frage ${question.id} hat ${question.options.length} Optionen in TakeSurveyPage:`, question.options);
            }
            return question;
          })
        };
        
        setSurvey(processedSurvey);
        
        // Only check if survey has been taken if we have a respondentId
        if (respondentId) {
          try {
            const taken = await surveyService.checkIfSurveyTaken(surveyId);
            setHasAlreadyTaken(taken);
            if (taken) {
              setIsSubmitted(true);
              return;
            }
          } catch (error) {
            console.error("Error checking if survey was taken:", error);
            // Continue loading the survey even if this check fails
          }
        }
        
        // Initialize answers with default values
        const initialAnswers: Record<string, any> = {};
        processedSurvey.questions.forEach(question => {
          if (question.type === QuestionType.MULTIPLE_CHOICE) {
            initialAnswers[question.id] = [];
          } else if (question.type === QuestionType.RATING_SCALE) {
            initialAnswers[question.id] = 0;
          } else {
            initialAnswers[question.id] = '';
          }
        });
        setAnswers(initialAnswers);
        console.log('Antworten wurden initialisiert:', initialAnswers);
        // Wir laden die unvollständigen Antworten im separaten useEffect
        
      } catch (error) {
        console.error("Error loading survey:", error);
        setPageError("Fehler beim Laden der Umfrage. Bitte versuchen Sie es später erneut.");
      } finally {
        setIsSurveyLoading(false);
      }
    };
    
    loadSurvey();
  }, [surveyId, getSurveyById, respondentId]);

  // Separater useEffect für das Laden unvollständiger Antworten
  useEffect(() => {
    if (survey && !isSubmitted && !isSurveyLoading) {
      console.log('Versuche unvollständige Antworten zu laden (separater useEffect)');
      // Verzögerung hinzufügen, um sicherzustellen, dass die Antworten initialisiert wurden
      setTimeout(() => {
        const loaded = loadIncompleteAnswers();
        console.log('Unvollständige Antworten geladen (separater useEffect):', loaded);
      }, 500);
    }
  }, [survey, isSubmitted, isSurveyLoading]);

  const handleAnswerChange = (questionId: string, value: Answer['value']) => {
    console.log('Antwort geändert:', { questionId, value }); // Debug-Log
    setAnswers(prev => {
      const updatedAnswers = { ...prev, [questionId]: value };
      console.log('Aktualisierte Antworten:', updatedAnswers); // Debug-Log
      
      // Speichere unvollständige Antworten bei jeder Änderung
      setTimeout(() => saveIncompleteAnswers(), 500);
      
      return updatedAnswers;
    });
    
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Form submission already in progress');
      return;
    }
    
    if (!survey || !respondentId) {
      console.error('Survey or respondentId is missing');
      setPageError('Ein Fehler ist aufgetreten. Bitte laden Sie die Seite neu und versuchen Sie es erneut.');
      return;
    }

    console.log('Formular wird abgeschickt mit Antworten:', answers);
    
    setErrors({}); 
    setPageError(null);
    setIsSubmitting(true);
    
    const newErrors: Record<string, string> = {};

    // Überprüfe alle erforderlichen Fragen
    survey.questions.forEach(question => {
      if (!question.required) return;
      
      const answer = answers[question.id];
      const isEmpty = answer === undefined || 
                    answer === null ||
                    (typeof answer === 'string' && !answer.trim()) || 
                    (Array.isArray(answer) && answer.length === 0) ||
                    (typeof answer === 'number' && isNaN(answer));
      
      if (question.required && isEmpty) {
        newErrors[question.id] = 'Diese Frage ist erforderlich';
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    try {
      // Filtere leere Antworten heraus und formatiere sie korrekt
      const responseAnswers: Answer[] = [];
      
      // Gehe durch alle Fragen der Umfrage, um die Reihenfolge beizubehalten
      survey.questions.forEach(question => {
        const value = answers[question.id];
        
        // Überspringe, wenn die Antwort leer ist
        if (value === undefined || value === null || 
            (typeof value === 'string' && !value.trim()) || 
            (Array.isArray(value) && value.length === 0)) {
          return;
        }
        
        // Formatiere die Antwort basierend auf dem Fragetyp
        let formattedValue = value;
        
        if (question.type === QuestionType.MULTIPLE_CHOICE && Array.isArray(value)) {
          formattedValue = value.filter(Boolean);
        } else if (question.type === QuestionType.RATING_SCALE && typeof value === 'string') {
          formattedValue = parseInt(value, 10) || 0;
        } else if (question.type === QuestionType.RATING_SCALE && typeof value === 'number') {
          // Stelle sicher, dass der Wert eine Zahl ist
          formattedValue = value;
        } else if (typeof value === 'string') {
          // Entferne überflüssige Leerzeichen
          formattedValue = value.trim();
        }
        
        responseAnswers.push({
          questionId: question.id,
          value: formattedValue
        });
      });
      
      console.log('Sende Antworten an den Server:', {
        surveyId: survey.id,
        respondentId,
        answers: responseAnswers
      });
      
      const result = await submitSurveyResponse({
        surveyId: survey.id,
        answers: responseAnswers,
        respondentId: respondentId
      });
      
      if (result) {
        console.log('Umfrage erfolgreich abgeschickt:', result);
        setIsSubmitted(true);
        
        // Lösche unvollständige Antworten nach erfolgreicher Übermittlung
        clearIncompleteAnswers();
      } else {
        console.error('Failed to submit survey: No result from server');
        setPageError('Die Antwort konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.');
      }
    } catch (error: any) {
      console.error('Error submitting survey:', error);
      
      if (error?.response?.status === 409) {
        // User has already taken the survey
        console.log('Duplicate submission detected, marking as already taken');
        setHasAlreadyTaken(true);
        
        // Load the latest survey data to ensure we show the thank you message
        try {
          const surveyData = await getSurveyById(surveyId);
          if (surveyData) {
            setSurvey(surveyData);
          }
        } catch (loadError) {
          console.error('Error loading survey after duplicate detection:', loadError);
        }
        
        return;
      }
      
      let errorMessage = 'Unbekannter Fehler beim Senden der Antwort';
      
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setPageError(`Fehler: ${errorMessage}`);
      
      // If it's a network error, suggest refreshing the page
      if (error.message === 'Failed to fetch') {
        setPageError(prev => `${prev}. Bitte überprüfen Sie Ihre Internetverbindung.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSurveyLoading || !respondentId) return <LoadingSpinner text="Umfrage wird geladen..." />; // Show spinner if survey or respondentId is loading
  if (pageError) return <div className="text-center p-10 text-xl text-error">{pageError}</div>;
  if (!survey) return <div className="text-center p-10 text-xl text-error">Umfrage nicht gefunden.</div>;

  if (isSubmitted || hasAlreadyTaken) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center animate-fadeIn">
        <Card className="py-10">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-success mx-auto mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <h1 className="text-2xl font-bold text-neutral mb-4">Vielen Dank!</h1>
          <p className="text-gray-600">{hasAlreadyTaken && !isSubmitted ? "Sie haben diese Umfrage bereits abgeschlossen." : "Ihre Antwort wurde erfolgreich gespeichert."}</p>
          <Button onClick={() => navigate('/student')} variant="primary" className="mt-6">Zurück zur Startseite</Button>
        </Card>
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto p-6 animate-fadeIn">
      <Card>
        <h1 className="text-3xl font-bold text-neutral mb-2">{survey.title}</h1>
        <p className="text-gray-600 mb-4">{survey.description}</p>
        <p className="text-sm text-gray-500 mb-8"><span className="text-error font-semibold">*</span> Pflichtfeld</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {survey.questions.map((q, index) => (
            <div key={q.id} id={`question-block-${q.id}`} className="p-4 border border-gray-200 rounded-lg shadow-sm pb-6 mb-6 last:border-b-0 last:mb-0 last:pb-4">
              <label htmlFor={`question-${q.id}`} className="font-semibold text-neutral mb-3 block">
                {index + 1}. {q.text} <span className="text-error font-semibold">*</span>
              </label>
              
              {q.type === QuestionType.TEXT && (
                <Textarea 
                  id={`question-${q.id}`}
                  value={answers[q.id] as string || ''}
                  onChange={e => handleAnswerChange(q.id, e.target.value)} 
                  placeholder="Ihre Antwort..." 
                  aria-describedby={errors[q.id] ? `error-${q.id}` : undefined}
                  error={!!errors[q.id]}
                  disabled={isSubmitting}
                />
              )}
              {q.type === QuestionType.RATING_SCALE && (
                <fieldset className="mt-2" aria-labelledby={`question-block-${q.id}`}>
                  <legend className="sr-only">Bewertung für {q.text}</legend>
                  <div className="flex space-x-2 justify-center">
                    {[1, 2, 3, 4, 5].map(val => (
                      <label key={val} className={`cursor-pointer p-2 px-3 border rounded-md hover:bg-primary hover:text-white transition-colors ${answers[q.id] === val ? 'bg-primary text-white ring-2 ring-primary ring-offset-1' : 'bg-gray-100 border-gray-300'} ${errors[q.id] ? 'border-error' : ''} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input type="radio" name={q.id} value={val} onChange={() => handleAnswerChange(q.id, val)} className="sr-only" id={`question-${q.id}-val-${val}`} aria-describedby={errors[q.id] ? `error-${q.id}` : undefined} disabled={isSubmitting} />
                        {val}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {q.type === QuestionType.SINGLE_CHOICE && q.options && q.options.length > 0 && (
                <fieldset className="mt-2" aria-labelledby={`question-block-${q.id}`}>
                  <legend className="sr-only">Optionen für {q.text}</legend>
                  <div className="space-y-2">
                    {q.options.map((option, index) => (
                      <label key={`${q.id}-opt-${index}`} className={`flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${answers[q.id] === option ? 'bg-blue-50 border-primary ring-2 ring-primary' : 'border-gray-300'} ${errors[q.id] ? 'border-error' : ''} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input 
                          type="radio" 
                          name={q.id} 
                          value={option} 
                          onChange={() => handleAnswerChange(q.id, option)} 
                          className="mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300" 
                          id={`question-${q.id}-option-${index}`} 
                          aria-describedby={errors[q.id] ? `error-${q.id}` : undefined} 
                          disabled={isSubmitting} 
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {q.type === QuestionType.MULTIPLE_CHOICE && q.options && q.options.length > 0 && (
                <fieldset className="mt-2" aria-labelledby={`question-block-${q.id}`}>
                  <legend className="sr-only">Optionen für {q.text} (Mehrfachauswahl)</legend>
                  <div className="space-y-2">
                    {q.options.map((option, index) => (
                      <label key={`${q.id}-opt-${index}`} className={`flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${(answers[q.id] as string[] || []).includes(option) ? 'bg-blue-50 border-primary ring-2 ring-primary' : 'border-gray-300'} ${errors[q.id] ? 'border-error' : ''} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input 
                          type="checkbox" 
                          value={option}
                          id={`question-${q.id}-option-${index}`}
                          checked={(answers[q.id] as string[] || []).includes(option)}
                          onChange={e => {
                            const currentAnswers = (answers[q.id] as string[] || []);
                            const newAnswers = e.target.checked 
                              ? [...currentAnswers, option] 
                              : currentAnswers.filter(val => val !== option);
                            handleAnswerChange(q.id, newAnswers);
                          }}
                          className="mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          aria-describedby={errors[q.id] ? `error-${q.id}` : undefined}
                          disabled={isSubmitting}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {errors[q.id] && <p id={`error-${q.id}`} className="text-sm text-error mt-2 animate-fadeIn">{errors[q.id]}</p>}
            </div>
          ))}
          {errors.form && <p className="text-sm text-error text-center animate-fadeIn">{errors.form}</p>}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button 
              type="button" 
              onClick={() => {
                saveIncompleteAnswers();
                // Zeige kurze Bestätigung
                const saveConfirmation = document.getElementById('save-confirmation');
                if (saveConfirmation) {
                  saveConfirmation.classList.remove('opacity-0');
                  setTimeout(() => {
                    saveConfirmation.classList.add('opacity-0');
                  }, 3000);
                }
                // Nach dem Speichern zum Dashboard navigieren
                setTimeout(() => {
                  navigate('/student');
                }, 1000);
              }} 
              disabled={isSubmitting || isSurveyLoading} 
              variant="secondary" 
              size="lg" 
              className="w-full sm:w-auto"
            >
              Antworten speichern
            </Button>
            <div id="save-confirmation" className="text-sm text-green-600 opacity-0 transition-opacity duration-300 flex items-center justify-center sm:justify-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Antworten gespeichert!
            </div>
            <Button 
              type="submit" 
              disabled={isSubmitting || isSurveyLoading} 
              variant="primary" 
              size="lg" 
              className="w-full sm:w-auto"
            >
              {isSubmitting ? <LoadingSpinner text="Wird gesendet..." /> : 'Antworten absenden'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// Wrapper component to provide key to SurveyResultsPage
const SurveyResultsPageWrapper: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  
  if (!surveyId) {
    // This case should ideally be caught by a NotFoundPage route or handled upstream.
    // For robustness, we can show a spinner or a minimal message.
    console.warn("SurveyResultsPageWrapper: surveyId is undefined. This may indicate a routing issue or direct access to a malformed URL.");
    return <LoadingSpinner text="Lade Umfrage-ID..." />;
  }
  
  return <SurveyResultsPage key={surveyId} surveyIdProp={surveyId} />;
};


const SurveyResultsPage: React.FC<{ surveyIdProp: string }> = ({ surveyIdProp }) => {
  const { getSurveyById, getResponsesBySurveyId } = useSurveyApp();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsPageLoading(true);
    setSurvey(null); // Clear previous survey data
    setResponses([]); // Clear previous responses
    setError(null);   // Clear previous errors

    const loadData = async () => {
      try {
        const surveyData = await getSurveyById(surveyIdProp);
        if (surveyData) {
          setSurvey(surveyData);
          const surveyResponses = await getResponsesBySurveyId(surveyIdProp);
          setResponses(surveyResponses);
        } else {
          setError(`Umfrage mit ID "${surveyIdProp}" nicht gefunden.`);
        }
      } catch (err) {
        console.error(`Fehler beim Laden der Daten für Umfrage ${surveyIdProp}:`, err);
        setError("Ein Fehler ist beim Laden der Umfragedaten aufgetreten.");
      } finally {
        setIsPageLoading(false);
      }
    };

    if (surveyIdProp) {
        loadData();
    } else {
        // Should not happen if wrapper logic is correct and route provides surveyId
        setError("Keine Umfrage-ID angegeben. Überprüfen Sie den Link.");
        setIsPageLoading(false);
    }
  }, [surveyIdProp, getSurveyById, getResponsesBySurveyId, navigate]);

  const handleExportCsv = () => {
    if (survey && responses.length > 0) {
      const csvData = generateCsv(survey, responses);
      downloadCsv(csvData, `${survey.title.replace(/\s+/g, '_')}_Ergebnisse.csv`);
    } else {
      alert("Keine Daten zum Exportieren vorhanden oder Umfrage nicht geladen.");
    }
  };

  if (isPageLoading) return <LoadingSpinner text="Ergebnisse werden geladen..." />;
  
  if (error) {
    return (
      <Card className="text-center py-10 max-w-xl mx-auto">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-error mx-auto mb-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="text-xl text-neutral mb-2">Fehler</p>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={() => navigate('/teacher')} variant="primary">
          Zurück zum Dashboard
        </Button>
      </Card>
    );
  }

  if (!survey) { 
    // This case should be covered by the error state if survey wasn't found.
    // If it's reached, it implies an unexpected state.
    return (
         <Card className="text-center py-10 max-w-xl mx-auto">
            <p className="text-xl text-error">Umfrage konnte nicht geladen werden.</p>
             <Button onClick={() => navigate('/teacher')} variant="primary" className="mt-4">
                Zurück zum Dashboard
            </Button>
        </Card>
    );
  }
  
  const noResponsesForLoadedSurvey = !isPageLoading && survey && responses.length === 0;

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-neutral">{survey.title} - Ergebnisse</h1>
          <p className="text-gray-600">{responses.length} Antwort(en)</p>
        </div>
        <Button onClick={handleExportCsv} variant="secondary" disabled={responses.length === 0}>
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 inline">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Als CSV exportieren
        </Button>
      </div>

      {noResponsesForLoadedSurvey && (
         <Card className="text-center py-10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-gray-400 mx-auto mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 0 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <p className="text-xl text-gray-500">Noch keine Antworten für diese Umfrage.</p>
        </Card>
      )}

      {responses.length > 0 && survey.questions.map((q, index) => {
        let questionContent;
        try {
            const chartData = processChartData(q, responses);
            questionContent = (
            <>
                {q.type === QuestionType.TEXT && (
                <ul className="list-disc list-inside pl-4 max-h-60 overflow-y-auto space-y-1">
                    {responses
                      .map(r_item => ({ 
                        response_id: r_item.id, 
                        answer_value: r_item.answers.find(a => a.questionId === q.id)?.value 
                      }))
                      .filter(item => typeof item.answer_value === 'string' && item.answer_value.trim() !== "") 
                      .map((item, i) => ( 
                        <li key={`${q.id}-textanswer-${i}-${item.response_id}`} className="text-gray-700 italic">
                          "{String(item.answer_value)}"
                        </li>
                      ))}
                </ul>
                )}
                {(q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.RATING_SCALE) && chartData.length > 0 && (
                <div className="h-80 md:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                    { q.type === QuestionType.SINGLE_CHOICE ? (
                        <PieChart>
                        <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label fill="#8884d8">
                            {chartData.map((_, idx) => (
                            <Cell key={`cell-${idx}`} fill={PIE_CHART_COLORS[idx % PIE_CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                        </PieChart>
                    ) : (
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={80} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill={q.type === QuestionType.RATING_SCALE ? '#FFBB28' : '#82CA9D'} />
                        </BarChart>
                    )
                    }
                </ResponsiveContainer>
                </div>
                )}
                {(q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.RATING_SCALE) && chartData.length === 0 && (
                    <p className="text-gray-500">Keine Daten für diese Frage anzuzeigen.</p>
                )}
            </>
            );
        } catch (e) {
            console.error(`Fehler beim Rendern der Frage ${q.id} (${q.text}):`, e);
            questionContent = <p className="text-error py-4">Fehler beim Anzeigen dieser Frage.</p>;
        }
        return (
          <Card key={q.id} className="mb-8">
            <h3 className="text-xl font-semibold text-neutral mb-4">{index + 1}. {q.text}</h3>
            {questionContent}
          </Card>
        );
      })}
    </div>
  );
};

const NotFoundPage: React.FC = () => (
  <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center p-6 bg-gray-100">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-24 h-24 text-error mx-auto mb-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
    <h1 className="text-5xl font-bold text-neutral mb-4">404 - Seite nicht gefunden</h1>
    <p className="text-xl text-gray-600 mb-8">Hoppla! Die gesuchte Seite existiert nicht.</p>
    <Button onClick={() => window.location.hash = '#/'} variant="primary" size="lg">
      Zur Startseite
    </Button>
  </div>
);

// Die Hauptanwendungskomponente
function App() {
  // i18n Translation Hook
  const { t, i18n } = useTranslation();
  
  // Setze die Dokumentrichtung basierend auf der aktuellen Sprache
  useEffect(() => {
    const currentLanguage = i18n.language || localStorage.getItem('i18nextLng') || 'de';
    setDocumentDirection(currentLanguage);
    
    // Aktualisiere die Dokumentrichtung, wenn sich die Sprache ändert
    const handleLanguageChange = () => {
      setDocumentDirection(i18n.language);
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);
  
  // Cookie-Consent-Hook hinzufügen
  const { 
    cookieSettings, 
    showSettings, 
    handleAcceptAll, 
    handleSaveSettings, 
    handleOpenSettings, 
    handleCloseSettings 
  } = useCookieConsent();
  
  // Neuer State für Scroll-Position
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // Scroll-Event-Handler
  useEffect(() => {
    const handleScroll = () => {
      // Button anzeigen, wenn mehr als 800px gescrollt wurde (erhöht von 300px)
      setShowScrollButton(window.scrollY > 800);
    };
    
    // Event-Listener hinzufügen
    window.addEventListener('scroll', handleScroll);
    
    // Event-Listener entfernen beim Unmount
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  return (
    <HashRouter>
      <AuthProvider>
        <SurveyAppProvider>
          <div className="flex flex-col min-h-screen">
            <AuthNavbar />
            <main className="flex-grow container mx-auto px-2 sm:px-4 py-8">
              <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader size="large" /></div>}>
                <Routes>
                  {/* Öffentliche Routen */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/survey/:surveyId" element={<TakeSurveyPage />} />
                  
                  {/* Geschützte Routen (nur für authentifizierte Benutzer) */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/teacher/results/:surveyId" element={<SurveyResultsPageWrapper />} />
                  </Route>
                  
                  {/* Geschützte Routen für Studenten */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/student" element={<StudentDashboard />} />
                  </Route>
                  
                  {/* Geschützte Routen (nur für Lehrer) */}
                  <Route element={<ProtectedRoute requireTeacher={true} />}>
                    <Route path="/teacher" element={<TeacherDashboardPage />} />
                    <Route path="/teacher/create" element={<CreateSurveyPage />} />
                    <Route path="/teacher/edit/:surveyId" element={<EditSurveyPage />} />
                    <Route path="/teacher/students" element={<StudentManagement />} />
                  </Route>
                  
                  {/* Footer-Seiten */}
                  <Route path="/datenschutz" element={<DatenschutzPage />} />
                  <Route path="/nutzungsbedingungen" element={<NutzungsbedingungenPage />} />
                  <Route path="/impressum" element={<ImpressumPage />} />
                  <Route path="/kontakt" element={<KontaktPage />} />
                  
                  {/* 404 Seite */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </main>
            <footer className="bg-primary-dark py-8 text-center text-white text-sm border-t border-primary relative">
              <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="mb-4 md:mb-0">
                    <p className="text-neutral-light">&copy; {new Date().getFullYear()} {t('footer_copyright')}</p>
                  </div>
                  <div className="flex flex-wrap justify-center md:justify-end gap-4 md:gap-6">
                    <Link to="/datenschutz" className="text-white hover:text-neutral-light transition-colors">{t('footer_privacy')}</Link>
                    <Link to="/nutzungsbedingungen" className="text-white hover:text-neutral-light transition-colors">{t('footer_terms')}</Link>
                    <Link to="/impressum" className="text-white hover:text-neutral-light transition-colors">{t('footer_imprint')}</Link>
                    <Link to="/kontakt" className="text-white hover:text-neutral-light transition-colors">{t('footer_contact')}</Link>
                    {/* Cookie-Einstellungen-Link hinzufügen */}
                    <CookieSettingsButton onClick={handleOpenSettings} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-primary">
                  <p className="text-xs text-neutral-light">{t('footer_developed')}</p>
                </div>
              </div>
            </footer>
            
            {/* Neuer Scroll-to-Top-Button, der beim Scrollen erscheint */}
            {showScrollButton && (
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed right-8 bottom-24 bg-primary hover:bg-primary-dark text-white p-4 rounded-full shadow-xl transition-all duration-300 transform hover:scale-110 focus:outline-none z-[9999]"
                style={{ zIndex: 9999 }}
                aria-label="Zum Seitenanfang scrollen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            )}
            
            {/* Cookie-Consent-Banner */}
            {!cookieSettings && (
              <CookieConsentBanner
                onAcceptAll={handleAcceptAll}
                onSaveSettings={handleSaveSettings}
                onOpenSettings={handleOpenSettings}
              />
            )}
            
            {/* Cookie-Einstellungen-Modal */}
            {showSettings && cookieSettings && (
              <div className="fixed inset-0 bg-neutral-dark/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-primary-dark">{t('cookie_settings')}</h2>
                      <button 
                        onClick={handleCloseSettings}
                        className="text-neutral hover:text-neutral-dark"
                        aria-label={t('close')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <p className="text-neutral-dark text-sm mb-6">
                      {t('cookie_settings_customize_description')} <Link to="/datenschutz" className="text-primary hover:underline">{t('privacy_policy')}</Link>.
                    </p>
                    
                    <div className="mb-6 space-y-4">
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="modal-essential"
                            name="essential"
                            type="checkbox"
                            checked={true}
                            disabled
                            className="h-4 w-4 text-primary border-neutral-light rounded focus:ring-primary"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="modal-essential" className="font-medium text-neutral-dark">{t('cookie_essential')}</label>
                          <p className="text-neutral">{t('cookie_essential_description')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="modal-preferences"
                            name="preferences"
                            type="checkbox"
                            checked={cookieSettings.preferences}
                            onChange={(e) => handleSaveSettings({...cookieSettings, preferences: e.target.checked})}
                            className="h-4 w-4 text-primary border-neutral-light rounded focus:ring-primary"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="modal-preferences" className="font-medium text-neutral-dark">{t('cookie_preferences')}</label>
                          <p className="text-neutral">{t('cookie_preferences_description')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="modal-statistics"
                            name="statistics"
                            type="checkbox"
                            checked={cookieSettings.statistics}
                            onChange={(e) => handleSaveSettings({...cookieSettings, statistics: e.target.checked})}
                            className="h-4 w-4 text-primary border-neutral-light rounded focus:ring-primary"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="modal-statistics" className="font-medium text-neutral-dark">{t('cookie_statistics')}</label>
                          <p className="text-neutral">{t('cookie_statistics_description')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="modal-marketing"
                            name="marketing"
                            type="checkbox"
                            checked={cookieSettings.marketing}
                            onChange={(e) => handleSaveSettings({...cookieSettings, marketing: e.target.checked})}
                            className="h-4 w-4 text-primary border-neutral-light rounded focus:ring-primary"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="modal-marketing" className="font-medium text-neutral-dark">{t('cookie_marketing')}</label>
                          <p className="text-neutral">{t('cookie_marketing_description')}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCloseSettings}
                      >
                        {t('save')}
                      </Button>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => {
                          handleAcceptAll();
                          handleCloseSettings();
                        }}
                      >
                        {t('accept_all')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SurveyAppProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
