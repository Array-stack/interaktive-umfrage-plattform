import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Survey, Question, Choice, QuestionType, NewSurvey, NewQuestion, SurveyResponse, Answer, ChartDataPoint, NewSurveyResponse } from './types';
import { surveyService } from './services/surveyService';

// Importiere die Seitenkomponenten
import HomePage from './pages/HomePage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import CreateSurveyPage from './pages/CreateSurveyPage';
import TakeSurveyPage from './pages/TakeSurveyPage';
import SurveyResultsPage from './pages/SurveyResultsPage';
import EditSurveyPage from './components/EditSurveyPage';

// ======== TYPES ======== //

interface SurveyFormData {
  title: string;
  description: string;
  questions: Question[];
}

// ======== PAGE COMPONENTS ======== //

const HomePage = () => {
  const [surveyIdInput, setSurveyIdInput] = useState('');
  const navigate = useNavigate();

  const handleTakeSurvey = () => {
    if (surveyIdInput.trim()) {
      navigate(`/survey/${surveyIdInput}`);
    }
  };

  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-8">Willkommen bei der Umfrage-Plattform</h1>
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Umfrage-ID eingeben"
            value={surveyIdInput}
            onChange={(e) => setSurveyIdInput(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <button
          onClick={handleTakeSurvey}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Zur Umfrage
        </button>
      </div>
    </div>
  );
};

const TeacherDashboardPage = () => {
  const { surveys, isLoading, fetchSurveys } = useSurveyApp();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  if (isLoading) {
    return <div>Lade Umfragen...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Meine Umfragen</h1>
      <button
        onClick={() => navigate('/teacher/create')}
        className="bg-green-500 text-white px-4 py-2 rounded mb-4"
      >
        Neue Umfrage erstellen
      </button>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {surveys.map((survey) => (
          <div key={survey.id} className="border p-4 rounded">
            <h2 className="text-xl font-semibold">{survey.title}</h2>
            <p>{survey.description}</p>
            <button
              onClick={() => navigate(`/teacher/surveys/${survey.id}/edit`)}
              className="bg-blue-500 text-white px-3 py-1 rounded mt-2"
            >
              Bearbeiten
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const CreateSurveyPage = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Neue Umfrage erstellen</h1>
      {/* Formular zum Erstellen einer neuen Umfrage */}
    </div>
  );
};

const TakeSurveyPage = () => {
  return (
    <div>
      <h1>Umfrage</h1>
      {/* Komponente zum Ausfüllen der Umfrage */}
    </div>
  );
};

const SurveyResultsPage = () => {
  return (
    <div>
      <h1>Umfrageergebnisse</h1>
      {/* Komponente zur Anzeige der Ergebnisse */}
    </div>
  );
};

const NotFoundPage = () => (
  <div className="text-center py-10">
    <h1 className="text-4xl font-bold text-red-500 mb-4">404 - Seite nicht gefunden</h1>
    <p>Die angeforderte Seite existiert nicht.</p>
    <Link to="/" className="text-blue-500 hover:underline mt-4 inline-block">
      Zurück zur Startseite
    </Link>
  </div>
);

// ======== CONTEXT ======== //

interface SurveyAppContextType {
  surveys: Survey[];
  isLoading: boolean;
  fetchSurveys: () => Promise<void>;
  addSurvey: (surveyData: any) => Promise<Survey | null>;
  getSurveyById: (id: string) => Promise<Survey | null>;
  submitSurveyResponse: (surveyId: string, answers: Answer[], respondentId: string) => Promise<SurveyResponse | null>;
  getResponsesBySurveyId: (surveyId: string) => Promise<SurveyResponse[]>;
}

const SurveyAppContext = createContext<SurveyAppContextType | undefined>(undefined);

// ======== PROVIDER ======== //
const SurveyAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSurveys = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await surveyService.getSurveys();
      setSurveys(data);
    } catch (error) {
      console.error('Fehler beim Laden der Umfragen:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSurveyById = useCallback(async (id: string) => {
    try {
      const response = await surveyService.getSurvey(id);
      return response || null;
    } catch (error) {
      console.error('Fehler beim Laden der Umfrage:', error);
      return null;
    }
  }, []);

  const addSurvey = useCallback(async (surveyData: any) => {
    try {
      const newSurvey = await surveyService.createSurvey(surveyData);
      await fetchSurveys();
      return newSurvey;
    } catch (error) {
      console.error('Fehler beim Erstellen der Umfrage:', error);
      return null;
    }
  }, [fetchSurveys]);

  const submitSurveyResponse = useCallback(async (surveyId: string, answers: Answer[], respondentId: string) => {
    try {
      const response = await surveyService.submitResponse(surveyId, { answers, respondentId });
      return response || null;
    } catch (error) {
      console.error('Fehler beim Speichern der Antworten:', error);
      return null;
    }
  }, []);

  const getResponsesBySurveyId = useCallback(async (surveyId: string) => {
    try {
      const responses = await surveyService.getResponses(surveyId);
      return responses || [];
    } catch (error) {
      console.error('Fehler beim Laden der Antworten:', error);
      return [];
    }
  }, []);

  return (
    <SurveyAppContext.Provider
      value={{
        surveys,
        isLoading,
        fetchSurveys,
        addSurvey,
        getSurveyById,
        submitSurveyResponse,
        getResponsesBySurveyId,
      }}
    >
      {children}
    </SurveyAppContext.Provider>
  );
};

const useSurveyApp = () => {
  const context = useContext(SurveyAppContext);
  if (!context) {
    throw new Error('useSurveyApp muss innerhalb eines SurveyAppProvider verwendet werden');
  }
  return context;
};
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
  getSurveyById: (id: string) => Promise<Survey | null>; // Does not set global loading
  submitSurveyResponse: (surveyId: string, answers: Answer[], respondentId: string) => Promise<SurveyResponse | null>; // Takes respondentId, does not set global loading
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

  const submitSurveyResponse = async (surveyId: string, answers: Answer[], respondentId: string): Promise<SurveyResponse | null> => {
    // This function no longer sets global isLoading and uses passed respondentId
    try {
      const response = await surveyService.submitResponse({ surveyId, answers, respondentId });
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
    <SurveyAppContext.Provider value={{ surveys, isLoading, fetchSurveys, addSurvey, getSurveyById, submitSurveyResponse, getResponsesBySurveyId }}>
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

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md' | 'lg' }> = ({ children, className, variant = 'primary', size = 'md', ...props }) => {
  const baseStyle = "font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed";
  const variantStyles = {
    primary: "bg-primary hover:bg-blue-600 text-white focus:ring-blue-400",
    secondary: "bg-secondary hover:bg-emerald-600 text-white focus:ring-emerald-400",
    danger: "bg-error hover:bg-red-600 text-white focus:ring-red-400",
    ghost: "bg-transparent hover:bg-gray-200 text-neutral focus:ring-gray-400 border border-gray-300"
  };
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };
  return (
    <button className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`} {...props}>
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

const Navbar: React.FC = () => {
  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex-shrink-0">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <span className="ml-2 text-2xl font-bold text-primary">Umfrage-Plattform</span>
            </div>
          </Link>
          <div className="flex items-center">
            <Link to="/teacher" className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium">Lehrerbereich</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

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
    
    if (!answer || typeof answer.value === 'undefined' || answer.value === null) {
      return; 
    }

    if (question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.RATING_SCALE) {
      let valueKey: string;
      if (question.type === QuestionType.SINGLE_CHOICE) {
        valueKey = question.choices?.find(c => c.id === answer.value)?.text || String(answer.value);
      } else { 
        valueKey = `${answer.value} Stern${Number(answer.value) !== 1 ? 'e' : ''}`;
      }
      dataMap.set(valueKey, (dataMap.get(valueKey) || 0) + 1);
    } else if (question.type === QuestionType.MULTIPLE_CHOICE && Array.isArray(answer.value)) {
      (answer.value as string[]).forEach(val => {
        const choiceText = question.choices?.find(c => c.id === val)?.text || val;
        dataMap.set(choiceText, (dataMap.get(choiceText) || 0) + 1);
      });
    }
  });
  return Array.from(dataMap, ([name, count]) => ({ name, count }));
};


const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// ======== PAGE COMPONENTS ======== //
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [surveyIdInput, setSurveyIdInput] = useState('');

  const handleTakeSurvey = () => {
    if (surveyIdInput.trim()) {
      navigate(`/survey/${surveyIdInput.trim()}`);
    } else {
      alert("Bitte geben Sie eine Umfrage-ID ein.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary to-secondary animate-fadeIn">
      <Card className="w-full max-w-lg text-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-20 h-20 text-primary mx-auto mb-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <h1 className="text-4xl font-bold text-neutral mb-6">Willkommen zur Umfrage-Plattform</h1>
        <p className="text-gray-600 mb-8">Erstellen, teilen und analysieren Sie Umfragen mühelos.</p>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-neutral mb-3">Für Lehrkräfte</h2>
            <Button onClick={() => navigate('/teacher')} variant="primary" size="lg" className="w-full">
              Zum Lehrer-Dashboard
            </Button>
          </div>
          
          <hr className="my-8 border-gray-300"/>

          <div>
            <h2 className="text-2xl font-semibold text-neutral mb-3">Für Teilnehmer</h2>
            <div className="flex space-x-2">
              <Input 
                type="text" 
                placeholder="Umfrage-ID eingeben" 
                value={surveyIdInput}
                onChange={(e) => setSurveyIdInput(e.target.value)}
                aria-label="Umfrage-ID"
                className="flex-grow"
              />
              <Button onClick={handleTakeSurvey} variant="secondary" size="md">
                Umfrage teilnehmen
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

const TeacherDashboardPage: React.FC = () => {
  const { surveys, isLoading, fetchSurveys } = useSurveyApp();
  const navigate = useNavigate();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [surveyLink, setSurveyLink] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      await fetchSurveys(); // Aktualisiere die Liste der Umfragen
    } catch (error) {
      console.error('Fehler beim Löschen der Umfrage:', error);
      alert('Fehler beim Löschen der Umfrage. Bitte versuchen Sie es erneut.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setSurveyToDelete(null);
    }
  };

  const handleEditClick = (survey: Survey) => {
    // Navigiere zur Bearbeitungsseite mit der Umfrage-ID
    navigate(`/teacher/surveys/${survey.id}/edit`, { 
      state: { survey } // Übergib die Umfragedaten an die Bearbeitungsseite
    });
  };

  if (isLoading && surveys.length === 0) return <LoadingSpinner text="Umfragen werden abgerufen..."/>;

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-neutral">Lehrer-Dashboard</h1>
        <Button onClick={() => navigate('/teacher/create')} variant="primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 inline">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Neue Umfrage erstellen
        </Button>
      </div>

      {surveys.length === 0 && !isLoading && (
        <Card className="text-center py-10">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-gray-400 mx-auto mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75s.168-.75.375-.75S9.75 9.336 9.75 9.75Zm-1.875 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm4.125 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Z" />
          </svg>
          <p className="text-xl text-gray-500">Noch keine Umfragen erstellt.</p>
          <p className="text-gray-400 mt-2">Klicken Sie auf "Neue Umfrage erstellen", um zu beginnen.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {surveys.map(survey => (
          <Card key={survey.id} className="flex flex-col justify-between hover:shadow-xl transition-shadow">
            <div>
              <h2 className="text-xl font-semibold text-neutral mb-2">{survey.title}</h2>
              <p className="text-gray-600 text-sm mb-1">Erstellt am: {new Date(survey.createdAt).toLocaleDateString('de-DE')}</p>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">{survey.description}</p>
            </div>
            <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
              <Button 
                onClick={() => navigate(`/teacher/results/${survey.id}`)} 
                variant="secondary" 
                size="sm" 
                className="w-full"
              >
                Ergebnisse anzeigen
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleShare(survey.id)} 
                  variant="primary" 
                  size="sm" 
                  className="w-full"
                >
                  Teilen
                </Button>
                <Button 
                  onClick={() => handleEditClick(survey)} 
                  variant="secondary" 
                  size="sm" 
                  className="w-full"
                >
                  Bearbeiten
                </Button>
                <Button 
                  onClick={() => handleDeleteClick(survey.id)}
                  variant="danger" 
                  size="sm" 
                  className="w-full"
                  disabled={isDeleting}
                >
                  {isDeleting && surveyToDelete === survey.id ? 'Löschen...' : 'Löschen'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} title="Umfrage-Link teilen">
        <p className="text-gray-700 mb-4">Teilen Sie diesen Link mit den Teilnehmern:</p>
        <Input type="text" value={surveyLink} readOnly className="mb-4 bg-gray-100"/>
        <Button onClick={() => { navigator.clipboard.writeText(surveyLink); alert('Link kopiert!'); }} variant="primary" className="w-full">Link kopieren</Button>
      </Modal>

      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        title="Umfrage löschen"
      >
        <p className="text-gray-700 mb-6">Möchten Sie diese Umfrage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
        <div className="flex justify-end space-x-3">
          <Button 
            onClick={() => setShowDeleteConfirm(false)} 
            variant="secondary"
            disabled={isDeleting}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="danger"
            disabled={isDeleting}
          >
            {isDeleting ? 'Löschen...' : 'Endgültig löschen'}
          </Button>
        </div>
      </Modal>

      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)}
        title="Umfrage löschen"
      >
        <p className="text-gray-700 mb-4">Möchten Sie diese Umfrage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
        <div className="flex justify-end space-x-3 mt-6">
          <Button 
            onClick={() => setShowDeleteConfirm(false)} 
            variant="secondary"
            disabled={isDeleting}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="danger"
            disabled={isDeleting}
          >
            {isDeleting ? 'Löschen...' : 'Endgültig löschen'}
          </Button>
        </div>
      </Modal>

      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)}
        title="Umfrage löschen"
      >
        <p className="text-gray-700 mb-4">Möchten Sie diese Umfrage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
        <div className="flex justify-end space-x-3 mt-6">
          <Button 
            onClick={() => setShowDeleteConfirm(false)} 
            variant="secondary"
            disabled={isDeleting}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="danger"
            disabled={isDeleting}
          >
            {isDeleting ? 'Löschen...' : 'Endgültig löschen'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

const CreateSurveyPage: React.FC = () => {
  const { addSurvey, isLoading } = useSurveyApp(); // isLoading here is for survey creation
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<NewQuestion[]>([{ text: '', type: QuestionType.TEXT, choices: [] }]);

  const handleAddQuestion = () => {
    setQuestions([...questions, { text: '', type: QuestionType.TEXT, choices: [] }]);
  };

  const handleQuestionChange = <K extends keyof NewQuestion,>(index: number, field: K, value: NewQuestion[K]) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    if (field === 'type' && (value !== QuestionType.SINGLE_CHOICE && value !== QuestionType.MULTIPLE_CHOICE)) {
        newQuestions[index].choices = [];
    } else if (field === 'type' && (value === QuestionType.SINGLE_CHOICE || value === QuestionType.MULTIPLE_CHOICE) && !newQuestions[index].choices?.length) {
        newQuestions[index].choices = [{id: `temp-${Date.now()}`, text: ''}];
    }
    setQuestions(newQuestions);
  };

  const handleChoiceChange = (qIndex: number, cIndex: number, value: string) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].choices) {
      newQuestions[qIndex].choices![cIndex].text = value;
      setQuestions(newQuestions);
    }
  };

  const handleAddChoice = (qIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].choices) {
      newQuestions[qIndex].choices!.push({id: `temp-${Date.now()}`, text: ''});
    } else {
      newQuestions[qIndex].choices = [{id: `temp-${Date.now()}`, text: ''}];
    }
    setQuestions(newQuestions);
  };
  
  const handleRemoveChoice = (qIndex: number, cIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].choices && newQuestions[qIndex].choices!.length > 1) {
      newQuestions[qIndex].choices!.splice(cIndex, 1);
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
    if (!title.trim() || !description.trim()) {
      alert("Titel und Beschreibung sind erforderlich.");
      return;
    }
    if (questions.some(q => !q.text.trim())) {
      alert("Alle Fragen müssen einen Text haben.");
      return;
    }
    if (questions.some(q => (q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTIPLE_CHOICE) && (!q.choices || q.choices.length === 0 || q.choices.some(c => !c.text.trim())))) {
      alert("Alle Antwortoptionen für Einfach-/Mehrfachauswahl-Fragen müssen einen Text haben.");
      return;
    }

    const surveyData: NewSurvey = { title, description, questions };
    const newSurvey = await addSurvey(surveyData);
    if (newSurvey) {
      alert('Umfrage erfolgreich erstellt!');
      navigate('/teacher');
    } else {
      alert('Fehler beim Erstellen der Umfrage.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fadeIn">
      <h1 className="text-3xl font-bold text-neutral mb-8">Neue Umfrage erstellen</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <Input label="Umfragetitel" value={title} onChange={e => setTitle(e.target.value)} required placeholder="z.B. Kurs-Feedback" />
          <Textarea label="Umfragebeschreibung" value={description} onChange={e => setDescription(e.target.value)} required className="mt-4" placeholder="z.B. Helfen Sie uns, uns zu verbessern, indem Sie Ihr Feedback geben." />
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
                {q.choices?.map((choice, cIndex) => (
                  <div key={`choice-${qIndex}-${cIndex}`} className="flex items-center space-x-2">
                    <Input type="text" value={choice.text} onChange={e => handleChoiceChange(qIndex, cIndex, e.target.value)} placeholder={`Option ${cIndex + 1}`} className="flex-grow" required />
                    { (q.choices?.length ?? 0) > 1 &&
                      <Button type="button" onClick={() => handleRemoveChoice(qIndex, cIndex)} variant="ghost" size="sm" className="!p-1.5 text-red-500">
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
  const { surveyId } = useParams<{ surveyId: string }>();
  const { getSurveyById, submitSurveyResponse } = useSurveyApp();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer['value']>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasAlreadyTaken, setHasAlreadyTaken] = useState(false);
  const [respondentId, setRespondentId] = useState<string | null>(null);
  
  const [isSurveyLoading, setIsSurveyLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);


  useEffect(() => {
    // Generate or retrieve respondentId once on mount
    let currentRespondentId = localStorage.getItem(RESPONDENT_ID_LOCALSTORAGE_KEY);
    if (!currentRespondentId) {
      currentRespondentId = `resp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      localStorage.setItem(RESPONDENT_ID_LOCALSTORAGE_KEY, currentRespondentId);
    }
    setRespondentId(currentRespondentId);
  }, []);

  useEffect(() => {
    if (!surveyId) {
        setPageError("Keine Umfrage-ID angegeben.");
        setIsSurveyLoading(false);
        return;
    }
    if (!respondentId) { // Wait for respondentId to be set
        setIsSurveyLoading(true); // Keep loading until respondentId is available
        return;
    }

    const loadSurvey = async () => {
      setIsSurveyLoading(true);
      setPageError(null);
      try {
        const surveyData = await getSurveyById(surveyId);
        if (surveyData) {
            setSurvey(surveyData);
            const taken = await surveyService.checkIfSurveyTaken(surveyId, respondentId);
            setHasAlreadyTaken(taken);
            if (taken) setIsSubmitted(true);
        } else {
            setPageError("Umfrage nicht gefunden.");
        }
      } catch (error) {
        console.error("Error loading survey:", error);
        setPageError("Fehler beim Laden der Umfrage.");
      } finally {
        setIsSurveyLoading(false);
      }
    };
    loadSurvey();
  }, [surveyId, getSurveyById, respondentId, navigate]);

  const handleAnswerChange = (questionId: string, value: Answer['value']) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
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
    if (!survey || !respondentId) return;

    setErrors({}); 
    const newErrors: Record<string, string> = {};

    for (const question of survey.questions) {
        if (answers[question.id] === undefined || 
            (typeof answers[question.id] === 'string' && !(answers[question.id] as string).trim()) || 
            (Array.isArray(answers[question.id]) && (answers[question.id] as string[]).length === 0)) {
            newErrors[question.id] = `Bitte beantworten Sie diese Frage.`;
        }
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }
    
    setIsSubmitting(true);
    setPageError(null);
    const responseAnswers: Answer[] = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
    try {
        const result = await submitSurveyResponse(survey.id, responseAnswers, respondentId);
        if (result) {
          setIsSubmitted(true);
        } else {
          setErrors({ form: 'Fehler beim Senden der Antwort. Bitte versuchen Sie es erneut.' });
        }
    } catch (error) {
        console.error("Error submitting survey:", error);
        setErrors({ form: 'Ein unerwarteter Fehler ist beim Senden aufgetreten.' });
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
          <Button onClick={() => navigate('/')} variant="primary" className="mt-6">Zurück zur Startseite</Button>
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
              {q.type === QuestionType.SINGLE_CHOICE && q.choices && (
                 <fieldset className="mt-2" aria-labelledby={`question-block-${q.id}`}>
                   <legend className="sr-only">Optionen für {q.text}</legend>
                    <div className="space-y-2">
                      {q.choices.map(choice => (
                        <label key={choice.id} className={`flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${answers[q.id] === choice.id ? 'bg-blue-50 border-primary ring-2 ring-primary' : 'border-gray-300'} ${errors[q.id] ? 'border-error' : ''} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <input type="radio" name={q.id} value={choice.id} onChange={() => handleAnswerChange(q.id, choice.id)} className="mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300" id={`question-${q.id}-choice-${choice.id}`} aria-describedby={errors[q.id] ? `error-${q.id}` : undefined} disabled={isSubmitting} />
                          {choice.text}
                        </label>
                      ))}
                    </div>
                 </fieldset>
              )}
              {q.type === QuestionType.MULTIPLE_CHOICE && q.choices && (
                <fieldset className="mt-2" aria-labelledby={`question-block-${q.id}`}>
                  <legend className="sr-only">Optionen für {q.text} (Mehrfachauswahl)</legend>
                  <div className="space-y-2">
                    {q.choices.map(choice => (
                      <label key={choice.id} className={`flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${(answers[q.id] as string[] || []).includes(choice.id) ? 'bg-blue-50 border-primary ring-2 ring-primary' : 'border-gray-300'} ${errors[q.id] ? 'border-error' : ''} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input 
                          type="checkbox" 
                          value={choice.id}
                          id={`question-${q.id}-choice-${choice.id}`}
                          checked={(answers[q.id] as string[] || []).includes(choice.id)}
                          onChange={e => {
                            const currentAnswers = (answers[q.id] as string[] || []);
                            const newAnswers = e.target.checked ? [...currentAnswers, choice.id] : currentAnswers.filter(val => val !== choice.id);
                            handleAnswerChange(q.id, newAnswers);
                          }}
                          className="mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          aria-describedby={errors[q.id] ? `error-${q.id}` : undefined}
                          disabled={isSubmitting}
                        />
                        {choice.text}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {errors[q.id] && <p id={`error-${q.id}`} className="text-sm text-error mt-2 animate-fadeIn">{errors[q.id]}</p>}
            </div>
          ))}
          {errors.form && <p className="text-sm text-error text-center animate-fadeIn">{errors.form}</p>}
          <Button type="submit" disabled={isSubmitting || isSurveyLoading} variant="primary" size="lg" className="w-full mt-8">
            {isSubmitting ? <LoadingSpinner text="Wird gesendet..." /> : 'Antworten absenden'}
          </Button>
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
                            {chartData.map((entry, idx) => (
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


// ======== APP ROOT ======== //
function App() {
  return (
    <SurveyAppProvider>
      <HashRouter>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/teacher" element={<TeacherDashboardPage />} />
            <Route path="/teacher/create" element={<CreateSurveyPage />} />
            <Route path="/teacher/surveys/:surveyId/edit" element={<EditSurveyPage />} />
            <Route path="/survey/:surveyId" element={<TakeSurveyPage />} />
            <Route path="/survey/:surveyId/results" element={<SurveyResultsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <footer className="bg-white border-t border-gray-200 py-6 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Umfrage-Plattform. Alle Rechte vorbehalten.
          </footer>
        </div>
      </HashRouter>
    </SurveyAppProvider>
  );
};
}

export default App;
