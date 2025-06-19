import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { surveyService } from '../../services/surveyService';
import { Survey, Question } from '../../types';   
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import { Bar, Pie } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  ChartData,
  ChartOptions
} from 'chart.js';

// Registriere die notwendigen Chart.js-Komponenten
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Typ für die Analyse-Daten

interface AnalysisData {
  question: string;
  type: string;
  response: any;
  options?: string[];
  correctAnswer?: any;
  isCorrect?: boolean;
  answerDistribution?: number[];
  chartData?: ChartData<'bar', number[], string> | null;
  [key: string]: any; // Erlaubt zusätzliche Eigenschaften
}

type SurveyStatus = 'open' | 'in_progress' | 'completed' | 'loading';

interface SurveyWithStatus extends Omit<Survey, 'questions' | 'createdBy'> {
  status: SurveyStatus;
  progress: number;
  answeredQuestions: number;
  totalQuestions: number;
  ownerId: string;
  ownerName: string;
  createdBy: string;
  questions: Question[];
  responses?: Array<{
    id: string;
    answers?: Array<{
      id: string;
      question_id: string;
      questionText?: string;
      questionType?: string;
      value: any;
      isCorrect?: boolean;
    }>;
  }>;
}

const StudentDashboard: React.FC = () => {
  const { t } = useTranslation();
  
  // Zustandsvariablen
  const [surveys, setSurveys] = useState<SurveyWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyWithStatus | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData[]>([]);
  
  // Verwende diese für die Analyse
   const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);
   
   // Neue Zustandsvariablen für die Aktualisierung
   const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
   const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
   
   // Berechne Statistiken für die Diagramme
   const statusCounts = surveys.reduce((acc, survey) => {
     acc[survey.status] = (acc[survey.status] || 0) + 1;
     return acc;
   }, {} as Record<SurveyStatus, number>);
   
   // Statistiken für die Karten
   const statistics = {
     open: statusCounts['open'] || 0,
     in_progress: statusCounts['in_progress'] || 0,
     completed: statusCounts['completed'] || 0,
     refreshing: isRefreshing // Verwende isRefreshing für die UI
   };
   
   // Erstelle Daten für das Kuchendiagramm
   const chartData = {
     labels: [t('student_dashboard_status_open'), t('student_dashboard_status_in_progress'), t('student_dashboard_status_completed')],
     datasets: [
       {
         data: [
           statistics.open,
           statistics.in_progress,
           statistics.completed
         ],
         backgroundColor: [
           'rgba(var(--color-primary-rgb), 0.7)',
           'rgba(245, 158, 11, 0.7)',
           'rgba(16, 185, 129, 0.7)'
         ],
         borderColor: [
           'rgba(var(--color-primary-rgb), 1)',
           'rgba(245, 158, 11, 1)',
           'rgba(16, 185, 129, 1)'
         ],
         borderWidth: 1
       }
     ]
   };
  
  // Hooks
  const navigate = useNavigate();
  
  // Nach erfolgreicher Einreichung einer Antwort
  const updateSurveyStatus = async (surveyId: string) => {
    try {
      // Aktualisiere den Status der Umfrage auf 'completed'
      setSurveys(prevSurveys => 
        prevSurveys.map(s => 
          s.id === surveyId ? { ...s, status: 'completed' as const, progress: 100 } : s
        )
      );
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Umfragestatus:', error);
    }
  };
  
  // Status-Badge für die Anzeige des Umfragestatus
  const getStatusBadge = (status: SurveyStatus) => {
    const statusClasses = {
      open: 'bg-primary-light/20 text-primary-dark',
      in_progress: 'bg-amber-100 text-amber-800',
      completed: 'bg-green-100 text-green-800',
      loading: 'bg-neutral-light/30 text-neutral-dark'
    } as const;
    
    const statusText = {
      open: t('student_dashboard_status_open'),
      in_progress: t('student_dashboard_status_in_progress'),
      completed: t('student_dashboard_status_completed'),
      loading: t('student_dashboard_status_loading')
    } as const;
    
    const badgeClass = statusClasses[status] || 'bg-neutral-light/30 text-neutral-dark';
    const text = statusText[status] || 'Unbekannt';
    
    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full ${badgeClass}`}>
        {text}
      </span>
    );
  };

  // Funktion zum Abrufen der Umfragen mit Cache-Unterstützung
  const fetchStudentSurveys = async (forceRefresh = false) => {
    try {
      // Wenn keine erzwungene Aktualisierung und die letzte Aktualisierung weniger als 30 Sekunden her ist, nicht aktualisieren
      // Dies verhindert zu häufige Aktualisierungen, wenn die Komponente neu gerendert wird
      const now = Date.now();
      if (!forceRefresh && lastRefreshTime > 0 && now - lastRefreshTime < 30000) {
        console.log('Überspringe Aktualisierung, letzte Aktualisierung vor weniger als 30 Sekunden');
        return;
      }

      setIsRefreshing(true);
      setError(null);
      
      if (loading) {
        // Wenn wir bereits laden, setzen wir loading nicht erneut
      } else {
        // Wenn wir nur aktualisieren, setzen wir loading nicht auf true
        console.log('Aktualisiere Umfragen...');
      }
      
      console.log('Starte Ladevorgang für Studentenumfragen...');
      
      // Verwende die getStudentSurveys-Methode, die die Statusinformationen enthält
      // Die Methode fügt bereits einen Timestamp-Parameter hinzu, um den Cache zu umgehen
      const studentSurveys = await surveyService.getStudentSurveys();
      console.log('Geladene Umfragen (Rohdaten):', studentSurveys);
      
      // Stelle sicher, dass alle erforderlichen Felder vorhanden sind
      const processedSurveys = studentSurveys.map(survey => {
        const processedSurvey: SurveyWithStatus = {
          ...survey,
          id: survey.id || `survey-${Math.random().toString(36).substr(2, 9)}`,
          title: survey.title || 'Unbenannte Umfrage',
          description: survey.description || '',
          createdBy: survey.createdBy || survey.ownerId || 'system',
          ownerId: survey.ownerId || 'system',
          ownerName: survey.ownerName || 'System',
          createdAt: survey.createdAt || new Date().toISOString(),
          updatedAt: survey.updatedAt || survey.createdAt || new Date().toISOString(),
          isPublic: survey.isPublic !== undefined ? survey.isPublic : true,
          progress: typeof survey.progress === 'number' ? survey.progress : 0,
          answeredQuestions: typeof survey.answeredQuestions === 'number' ? survey.answeredQuestions : 0,
          totalQuestions: typeof survey.totalQuestions === 'number' ? survey.totalQuestions : 0,
          status: ['open', 'in_progress', 'completed'].includes(survey.status) 
            ? survey.status as 'open' | 'in_progress' | 'completed' 
            : 'open',
          questions: Array.isArray(survey.questions) 
            ? survey.questions.map((q: any) => ({
                ...q,
                id: q.id || `q-${Math.random().toString(36).substr(2, 9)}`,
                text: q.text || 'Unbenannte Frage',
                type: q.type || 'TEXT',
                required: q.required !== undefined ? q.required : true,
                options: Array.isArray(q.options) ? q.options : [],
                choices: Array.isArray(q.choices) ? q.choices : []
              }))
            : []
        };
        
        console.log(`Verarbeitete Umfrage: ${processedSurvey.id} - ${processedSurvey.title}`, processedSurvey);
        return processedSurvey;
      });
      
      setSurveys(processedSurveys);
      setLastRefreshTime(now);
      console.log('Alle verarbeiteten Umfragen:', processedSurveys);
      
      // Aktualisiere den Status basierend auf dem lokalen Speicher
      try {
        // Prüfe auf abgeschlossene Umfragen im lokalen Speicher
        // Überprüfe beide möglichen Speicherorte für abgeschlossene Umfragen
        const takenSurveys = JSON.parse(localStorage.getItem('taken_surveys') || '[]');
        const participatedSurveys = JSON.parse(localStorage.getItem('participated_surveys') || '[]');
        
        // Kombiniere beide Listen
        const completedSurveyIds = [...new Set([...takenSurveys, ...participatedSurveys])];
        
        // Prüfe auf Umfragen mit gespeichertem Fortschritt
        const savedProgress = JSON.parse(localStorage.getItem('incomplete_survey_answers') || '{}');
        
        console.log('Lokaler Speicher Status:', {
          completedSurveyIds,
          savedProgressIds: Object.keys(savedProgress)
        });
        
        // Aktualisiere den Status der Umfragen basierend auf dem lokalen Speicher
        // Verwende setTimeout, um sicherzustellen, dass dies nach dem Rendern der Umfragen geschieht
        setTimeout(() => {
          setSurveys(prevSurveys => 
            prevSurveys.map(survey => {
              // Wenn die Umfrage als abgeschlossen markiert ist
              if (completedSurveyIds.includes(survey.id)) {
                return { ...survey, status: 'completed' as const, progress: 100 };
              }
              
              // Wenn die Umfrage gespeicherten Fortschritt hat
              if (savedProgress[survey.id]) {
                return { ...survey, status: 'in_progress' as const };
              }
              
              return survey;
            })
          );
          console.log('Umfragestatus wurden aktualisiert basierend auf lokalem Speicher');
        }, 0);
      } catch (error) {
        console.error('Fehler beim Aktualisieren der Umfragestatus aus dem lokalen Speicher:', error);
      }
    } catch (err) {
      console.error(t('student_dashboard_error') + ':', err);
      const errorMessage = err instanceof Error ? err.message : t('student_dashboard_error');
      setError(`${t('student_dashboard_error')}: ${errorMessage}`);
      
      // Füge Debug-Informationen hinzu
      if (err instanceof Error) {
        console.error('Fehlerdetails:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Manuelle Aktualisierung der Umfragen
 

  // Initialer Ladevorgang und regelmäßige Aktualisierung
  useEffect(() => {
    // Initialer Ladevorgang mit erzwungener Aktualisierung, um sicherzustellen, dass die neuesten Daten geladen werden
    fetchStudentSurveys(true);
    
    // Setze ein Intervall für die regelmäßige Aktualisierung (alle 3 Minuten)
    const intervalId = setInterval(() => {
      // Automatische Aktualisierung im Hintergrund
      fetchStudentSurveys(true);
    }, 3 * 60 * 1000); // 3 Minuten in Millisekunden
    
    // Bereinige das Intervall beim Unmounten der Komponente
    return () => clearInterval(intervalId);
  }, []);

  // Zweiter useEffect-Hook, der den Status der Umfragen basierend auf dem lokalen Speicher aktualisiert
  useEffect(() => {
    if (surveys.length === 0) return;
    
    console.log('useEffect: Aktualisiere Umfragestatus basierend auf lokalem Speicher...');
    
    // Prüfe, ob Umfragen im lokalen Speicher als abgeschlossen markiert sind
    try {
      // Prüfe auf abgeschlossene Umfragen im lokalen Speicher
      // Überprüfe beide möglichen Speicherorte für abgeschlossene Umfragen
      const takenSurveys = JSON.parse(localStorage.getItem('taken_surveys') || '[]');
      const participatedSurveys = JSON.parse(localStorage.getItem('participated_surveys') || '[]');
      
      // Kombiniere beide Listen
      const completedSurveyIds = [...new Set([...takenSurveys, ...participatedSurveys])];
      
      // Prüfe auf Umfragen mit gespeichertem Fortschritt
      const savedProgress = JSON.parse(localStorage.getItem('incomplete_survey_answers') || '{}');
      
      console.log('useEffect: Lokaler Speicher Status:', {
        completedSurveyIds,
        savedProgressIds: Object.keys(savedProgress)
      });
      
      // Aktualisiere den Status der Umfragen basierend auf dem lokalen Speicher
      setSurveys(prevSurveys => 
        prevSurveys.map(survey => {
          // Wenn die Umfrage als abgeschlossen markiert ist
          if (completedSurveyIds.includes(survey.id)) {
            return { ...survey, status: 'completed' as const, progress: 100 };
          }
          
          // Wenn die Umfrage gespeicherten Fortschritt hat
          if (savedProgress[survey.id]) {
            return { ...survey, status: 'in_progress' as const };
          }
          
          return survey;
        })
      );
      
      console.log('useEffect: Umfragestatus wurden aktualisiert');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Umfragestatus aus dem lokalen Speicher:', error);
    }
  }, [surveys.length]); // Zurück zu surveys.length, um Endlosschleifen zu vermeiden, da wir surveys in setSurveys aktualisieren

  const handleStartSurvey = async (survey: SurveyWithStatus) => {
    console.log('Starte Umfrage:', survey.id);
    
    // Prüfe zuerst, ob die Umfrage bereits abgeschlossen wurde
    if (survey.status === 'completed') {
      console.log('Umfrage wurde bereits abgeschlossen, zeige Analyse an');
      handleAnalyzeSurvey(survey);
      return;
    }
    
    // Update the survey status to loading
    setSurveys(prevSurveys => 
      prevSurveys.map(s => 
        s.id === survey.id ? { ...s, status: 'loading' as const } : s
      )
    );
    
    try {
      // Überprüfe erneut, ob die Umfrage bereits abgeschlossen wurde
      const hasTaken = await surveyService.checkIfSurveyTaken(survey.id);
      if (hasTaken) {
        console.log('Umfrage wurde bereits abgeschlossen, aktualisiere Status');
        // Rufe updateSurveyStatus auf, um den Status zu aktualisieren
        await updateSurveyStatus(survey.id);
        // Zeige die Analyse an
        handleAnalyzeSurvey(survey);
        return;
      }
      
      // Navigate to the survey with the survey ID
      console.log('Navigiere zur Umfrage:', `/survey/${survey.id}`);
      navigate(`/survey/${survey.id}`, { 
        state: { 
          surveyId: survey.id,
          surveyTitle: survey.title,
          isPublic: survey.isPublic
        }
      });
    } catch (error) {
      console.error('Fehler beim Überprüfen des Umfragestatus:', error);
      // Im Fehlerfall trotzdem zur Umfrage navigieren
      navigate(`/survey/${survey.id}`, { 
        state: { 
          surveyId: survey.id,
          surveyTitle: survey.title,
          isPublic: survey.isPublic
        }
      });
    }
  };

  const handleAnalyzeSurvey = async (survey: SurveyWithStatus) => {
    try {
      console.log('=== START ANALYSE VORGANG ===');
      console.log('Starte Analyse für Umfrage:', survey);
      
      // Setze den Ladezustand für diese spezifische Umfrage
      setAnalyzingIds(prev => [...prev, survey.id]);
      setError('');
      setAnalysisData([]);
      setSelectedSurvey(survey);
      
      // Aktualisiere den Status auf 'completed', wenn die Analyse angezeigt wird
      if (survey.status !== 'completed') {
        await updateSurveyStatus(survey.id);
      }
      
      console.log('Lade Analyse-Daten für Umfrage:', survey.id);
      
      // Prüfe, ob der Benutzer an der Umfrage teilgenommen hat
      try {
        const hasTaken = await surveyService.checkIfSurveyTaken(survey.id);
        if (!hasTaken) {
          setError('Sie müssen an dieser Umfrage teilnehmen, bevor Sie die Analyse einsehen können.');
          setAnalyzingIds(prev => prev.filter(id => id !== survey.id));
          return;
        }
      } catch (error) {
        console.error('Fehler bei der Teilnahmeprüfung:', error);
        // Fahre trotzdem fort, da dies möglicherweise nur für Lehrer relevant ist
      }
      
      // Lade die Analyse-Daten
      const analysis = await surveyService.getSurveyAnalysis(survey.id);
      console.log('Analyse-Daten erhalten:', {
        rohdaten: analysis,
        hatInhalt: !!analysis,
        statusCode: 'Siehe Netzwerk-Tab in den Entwicklertools'
      });
      console.log('=== ROHANALYSE-DATEN VOM SERVER ===');
      console.log(JSON.stringify(analysis, null, 2));
      
      // DEBUGGING: Überprüfe die Struktur der Serverantwort
      console.log('Struktur der Serverantwort:', {
        hatQuestions: !!analysis.questions,
        istArray: Array.isArray(analysis.questions),
        anzahlFragen: analysis.questions ? analysis.questions.length : 0
      });
      
      if (!analysis || !analysis.questions || !Array.isArray(analysis.questions)) {
        throw new Error('Ungültiges Antwortformat vom Server erhalten');
      }
      
      if (analysis.questions.length === 0) {
        console.log('Keine Fragen in der Analyse gefunden');
        setAnalysisData([{ 
          question: t('student_dashboard_no_data_available'), 
          type: 'text', 
          response: t('student_dashboard_no_analysis_data_available') 
        }]);
        return;
      }
      
      console.log('=== ERSTE FRAGE AUS DEN ANALYSE-DATEN ===');
      console.log(JSON.stringify(analysis.questions[0], null, 2));
      
      // Finde die Antworten des aktuellen Benutzers
      const userId = localStorage.getItem('userId') || 'anonymous';
      console.log('Aktuelle Benutzer-ID:', userId);
      
      const formattedData = analysis.questions.map((q: any) => {
        console.log('Verarbeite Frage:', q.questionText || 'Unbenannte Frage');
        
        // Finde die Antwort des aktuellen Benutzers auf diese Frage
        const userResponse = q.responses?.find((r: any) => r.respondentId === userId);
        console.log('Gefundene Benutzerantwort:', userResponse);
        
        const userAnswer = userResponse ? userResponse.value : t('student_dashboard_no_answer_text');
        
        // Wenn keine Optionen vorhanden sind, aber Antworten existieren, extrahiere die Optionen aus den Antworten
        let options = q.options || [];
        let answerDistribution = q.answerDistribution || [];
        
        if ((q.questionType === 'SINGLE_CHOICE' || q.questionType === 'MULTIPLE_CHOICE') && 
            (options.length === 0 || answerDistribution.length === 0) && 
            q.responses && q.responses.length > 0) {
          
          console.log('Extrahiere Optionen aus Antworten für Frage:', q.questionText);
          
          // Sammle alle eindeutigen Antworten als Optionen
          const uniqueAnswers = new Set<string>();
          q.responses.forEach((response: any) => {
            if (Array.isArray(response.value)) {
              response.value.forEach((val: string) => uniqueAnswers.add(val));
            } else if (response.value !== null && response.value !== undefined) {
              uniqueAnswers.add(String(response.value));
            }
          });
          
          options = Array.from(uniqueAnswers);
          console.log('Extrahierte Optionen:', options);
          
          // Zähle die Häufigkeit jeder Option
          answerDistribution = options.map((option: string) => {
            let count = 0;
            q.responses.forEach((response: any) => {
              if (Array.isArray(response.value)) {
                if (response.value.includes(option)) count++;
              } else if (String(response.value) === option) {
                count++;
              }
            });
            return count;
          });
          
          console.log('Berechnete Antwortverteilung:', answerDistribution);
        }
        
        // Erstelle Chart-Daten für die Antwortverteilung
        let chartData: ChartData<'bar', number[], string> | null = null;
          
        if (answerDistribution.length > 0 && options.length > 0) {
          console.log('Erstelle Diagramm für Frage:', q.questionText);
          console.log('Antwortoptionen:', options);
          console.log('Verteilung:', answerDistribution);
          
          // Erstelle eine konsistente Farbskala
          const backgroundColors = [
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)'
          ];
          
          // Kürze lange Beschriftungen für die X-Achse
          const labels = options.map((opt: string) => 
            opt.length > 15 ? `${opt.substring(0, 15)}...` : opt
          );
          
          chartData = {
            labels,
            datasets: [{
              label: 'Anzahl der Antworten',
              data: answerDistribution,
              backgroundColor: backgroundColors.slice(0, options.length),
              borderColor: backgroundColors
                .slice(0, options.length)
                .map(color => color.replace('0.7', '1')),
              borderWidth: 1,
              borderRadius: 4,
              borderSkipped: false,
            }]
          };
        } else {
          console.log('Keine Diagrammdaten für Frage:', q.questionText);
          console.log('Grund:', {
            hatVerteilung: !!answerDistribution,
            laengeVerteilung: answerDistribution?.length,
            hatOptionen: !!options,
            laengeOptionen: options?.length
          });
        }
        
        return {
          question: q.questionText || 'Unbenannte Frage',
          type: (q.questionType || 'text').toLowerCase(),
          response: userAnswer,
          options: options,
          chartData,
          answerDistribution: answerDistribution
        };
      });
      
      console.log('=== FORMATIERTE ANALYSE-DATEN ===');
      console.log(JSON.stringify(formattedData, null, 2));
      
      // DEBUGGING: Überprüfe die formatierten Daten vor dem Setzen des States
      console.log('Formatierte Daten vor dem Setzen des States:', {
        anzahlItems: formattedData.length,
        erstesFrage: formattedData[0] ? formattedData[0].question : 'Keine Frage',
        hatChartData: formattedData[0] ? !!formattedData[0].chartData : false
      });
      
      setAnalysisData(formattedData);
      setSelectedSurvey(survey);
      
      // Entferne die Umfrage-ID aus dem analyzingIds-Array
      setAnalyzingIds(prev => prev.filter(id => id !== survey.id));
      
    } catch (error) {
      console.error('Fehler beim Laden der Analyse:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten';
      
      // Prüfe auf spezifischen Fehlercode
      if (errorMessage.includes('PARTICIPATION_REQUIRED') || errorMessage.includes('403')) {
        setError('Sie müssen an dieser Umfrage teilnehmen, bevor Sie die Analyse einsehen können.');
        // Navigiere zur Umfrage, damit der Student teilnehmen kann
        navigate(`/survey/${survey.id}`);
      } else {
        setError('Fehler beim Laden der Analyse: ' + errorMessage);
      }
      
      setAnalysisData([{ 
        question: 'Fehler', 
        type: 'text', 
        response: 'Es ist ein Fehler beim Laden der Analyse aufgetreten: ' + errorMessage
      }]);
      
      // Entferne die Umfrage-ID aus dem analyzingIds-Array
      setAnalyzingIds(prev => prev.filter(id => id !== survey.id));
    }
  };

  const closeAnalysis = () => {
    setSelectedSurvey(null);
    setAnalysisData([]);
  };

  if (loading) {
    return <Loader variant="primary" size="lg" text={t('student_dashboard_loading')} />;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
        <strong className="font-bold">{t('student_dashboard_error')}</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 animate-fadeIn" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-6">
        <h1 className={`text-3xl font-bold text-primary-dark ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>{t('student_dashboard_title')}</h1>
      </div>
      
      {/* Statistics Section */}
      <div className="card mb-8">
        <div className="card-body">
          <h2 className={`text-xl font-semibold text-primary-dark mb-4 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>{t('student_dashboard_statistics')}</h2>
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="w-full md:w-1/2 mb-6 md:mb-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-primary-light/20 p-4 rounded-lg text-center">
                  <p className="text-sm text-primary-dark font-medium">{t('student_dashboard_open_surveys')}</p>
                  <p className="text-2xl font-bold text-primary">{statusCounts['open'] || 0}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-amber-600 font-medium">{t('student_dashboard_in_progress')}</p>
                  <p className="text-2xl font-bold text-amber-700">{statusCounts['in_progress'] || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600 font-medium">{t('student_dashboard_completed')}</p>
                  <p className="text-2xl font-bold text-green-700">{statusCounts['completed'] || 0}</p>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 flex justify-center">
              <div className="w-48 h-48">
                {surveys.length > 0 ? (
                  <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: true }} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-neutral text-center">{t('student_dashboard_no_data')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-body">
          <div className="sm:flex sm:items-center mb-6">
            <div className="sm:flex-auto">
              <h2 className={`text-xl font-semibold text-primary-dark ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>{t('student_dashboard_my_surveys')}</h2>
              <p className={`mt-2 text-sm text-neutral ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                {t('student_dashboard_surveys_description')}
              </p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-light/30">
              <thead className="bg-neutral-light/20">
                <tr>
                  <th scope="col" className={`py-3.5 pl-4 pr-3 ${i18n.language === 'ar' ? 'text-right' : 'text-left'} text-sm font-semibold text-primary-dark sm:pl-6`}>
                    {t('student_dashboard_title')}
                  </th>
                  <th scope="col" className={`px-3 py-3.5 ${i18n.language === 'ar' ? 'text-right' : 'text-left'} text-sm font-semibold text-primary-dark`}>
                    {t('student_dashboard_table_status')}
                  </th>
                  <th scope="col" className={`px-3 py-3.5 ${i18n.language === 'ar' ? 'text-right' : 'text-left'} text-sm font-semibold text-primary-dark`}>
                    {t('student_dashboard_table_progress')}
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">{t('student_dashboard_table_actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-light/20 bg-white">
                {surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-neutral-light/10 transition-colors duration-150">
                    <td className={`whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary-dark sm:pl-6 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {survey.title}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-4 text-sm ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {getStatusBadge(survey.status)}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-4 text-sm ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                      {survey.progress !== undefined ? (
                        <div className="w-full bg-neutral-light/30 rounded-full h-2.5">
                          <div 
                            className="bg-primary h-2.5 rounded-full" 
                            style={{ width: `${survey.progress}%` }}
                          ></div>
                        </div>
                      ) : null}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-center text-sm font-medium sm:pr-6 space-x-2">
                      {/* Starten/Fortsetzen Button */}
                      <Button 
                        onClick={() => handleStartSurvey(survey)}
                        variant="primary"
                        size="sm"
                        className="inline-flex min-w-[120px] mb-2 sm:mb-0"
                        disabled={survey.status === 'loading'}
                        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                      >
                        {survey.status === 'loading' ? t('student_dashboard_loading') : 
                          (survey.status === 'completed' ? t('student_dashboard_status_completed') :
                          (hasSavedProgress(survey.id) ? t('student_dashboard_continue') : t('student_dashboard_button_start')))
                        }
                      </Button>
                      
                      {/* Analyse Button */}
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="inline-flex min-w-[120px]"
                        onClick={() => handleAnalyzeSurvey(survey)}
                        disabled={analyzingIds.includes(survey.id)}
                        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                      >
                        {analyzingIds.includes(survey.id) ? t('student_dashboard_loading') : t('student_dashboard_button_analysis')}
                      </Button>
                    </td>
                  </tr>
                ))}
                {surveys.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-neutral">
                    <div className="flex flex-col items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-light mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>{t('student_dashboard_no_surveys')}</p>
                    </div>
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Analyse-Modal */}
      {selectedSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
                <div className={`flex justify-between items-center mb-4 ${i18n.language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <h3 className={`text-lg font-medium text-primary-dark ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                    {t('student_dashboard_analysis')}: {selectedSurvey.title}
                  </h3>
                  <button
                    onClick={closeAnalysis}
                    className="text-neutral hover:text-neutral-dark"
                  >
                    <span className="sr-only">{t('student_dashboard_close')}</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {selectedSurvey && analyzingIds.includes(selectedSurvey.id) ? (
                  <div className="text-center py-8">
                    <Loader variant="primary" size="lg" text={t('student_dashboard_loading_analysis')} />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {analysisData.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-neutral">{t('student_dashboard_no_analysis_data')}</p>
                      </div>
                    ) : (
                      analysisData.map((item, index) => (
                        <div key={index} className="card">
                          <div className="card-body">
                            <h3 className="font-medium text-lg mb-4 text-primary-dark">{item.question}</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-medium mb-2 text-neutral-dark">{t('student_dashboard_your_answer')}:</h4>
                                <div className="p-4 bg-neutral-light/10 rounded-lg border border-neutral-light/30">
                                  {item.type === 'rating' ? (
                                    <div className="flex flex-col space-y-2">
                                      <div className={`flex items-center ${i18n.language === 'ar' ? 'space-x-reverse' : 'space-x-1'}`}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <span 
                                            key={star} 
                                            className={`text-2xl ${star <= item.response ? 'text-amber-400' : 'text-neutral-light'}`}
                                          >
                                            ★
                                          </span>
                                        ))}
                                        <span className={`ml-2 text-neutral-dark font-medium ${i18n.language === 'ar' ? 'mr-2 ml-0' : ''}`}>
                                          {item.response}
                                        </span>
                                      </div>
                                      {item.options && item.options[item.response - 1] && (
                                        <p className={`text-sm text-neutral mt-1 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                                          {item.options[item.response - 1]}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {item.response === t('student_dashboard_no_answer_text') ? (
                                        <p className={`text-neutral italic ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>{t('student_dashboard_no_answer')}</p>
                                      ) : (
                                        <p className={`text-primary-dark ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>{item.response}</p>
                                      )}
                                      {typeof item.isCorrect === 'boolean' && (
                                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                                          item.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {item.isCorrect ? t('student_dashboard_correct') : t('student_dashboard_incorrect')}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {item.chartData ? (
                                <div>
                                  <h4 className={`font-medium mb-2 text-neutral-dark ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>{t('student_dashboard_answer_distribution')}:</h4>
                                  <div className="h-48 bg-white p-2 rounded-lg border border-neutral-light/30">
                                    <Bar
                                      data={item.chartData}
                                      options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                          y: {
                                            beginAtZero: true,
                                            ticks: {
                                              stepSize: 1,
                                              precision: 0,
                                              color: 'var(--color-neutral)'
                                            },
                                            grid: {
                                              color: 'rgba(var(--color-neutral-light-rgb), 0.2)'
                                            }
                                          },
                                          x: {
                                            ticks: {
                                              color: 'var(--color-neutral)'
                                            },
                                            grid: {
                                              display: false
                                            }
                                          }
                                        },
                                        plugins: {
                                          legend: {
                                            display: false
                                          },
                                          tooltip: {
                                            backgroundColor: 'white',
                                            titleColor: 'var(--color-primary-dark)',
                                            bodyColor: 'var(--color-neutral)',
                                            borderColor: 'var(--color-neutral-light)',
                                            borderWidth: 1,
                                            padding: 12,
                                            // @ts-ignore - boxShadow ist in den Typen nicht definiert, wird aber unterstützt
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                            callbacks: {
                                              label: function(context: any) {
                                                return `${context.parsed.y} ${context.parsed.y === 1 ? t('student_dashboard_answer') : t('student_dashboard_answers')}`;
                                              }
                                            }
                                          } as any // Typumwandlung, da die Tooltip-Typen nicht vollständig sind
                                        }
                                      } as ChartOptions<'bar'>}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <p className={`text-neutral text-sm ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>{t('student_dashboard_no_distribution_data')}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    
                    <div className={`flex ${i18n.language === 'ar' ? 'justify-start' : 'justify-end'} mt-6 pt-4 border-t border-neutral-light/30`}>
                      <Button 
                        onClick={closeAnalysis} 
                        variant="outline"
                        className="border-neutral-light/50 text-neutral-dark hover:bg-neutral-light/20"
                        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                      >
                        {t('student_dashboard_close')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      )}
      
      {/* Analyse-Modal */}
      {selectedSurvey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
                <div className={`flex justify-between items-center mb-4 ${i18n.language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <h3 className={`text-lg font-medium text-primary-dark ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                    {t('student_dashboard_analysis')}: {selectedSurvey.title}
                  </h3>
                  <button
                    onClick={closeAnalysis}
                    className="text-neutral hover:text-neutral-dark"
                  >
                    <span className="sr-only">{t('student_dashboard_close')}</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {selectedSurvey && analyzingIds.includes(selectedSurvey.id) ? (
                  <div className="text-center py-8">
                    <Loader variant="primary" size="lg" text={t('student_dashboard_loading_analysis')} />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {analysisData.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-neutral">{t('student_dashboard_no_analysis_data')}</p>
                      </div>
                    ) : (
                      analysisData.map((item, index) => (
                        <div key={index} className="card">
                          <div className="card-body">
                            <h3 className="font-medium text-lg mb-4 text-primary-dark">{item.question}</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-medium mb-2 text-neutral-dark">{t('student_dashboard_your_answer')}:</h4>
                                <div className={`p-4 bg-neutral-light/10 rounded-lg border border-neutral-light/30 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                                  {item.type === 'rating' ? (
                                    <div className="flex flex-col space-y-2">
                                      <div className={`flex items-center ${i18n.language === 'ar' ? 'space-x-reverse' : 'space-x-1'}`}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <span 
                                            key={star} 
                                            className={`text-2xl ${star <= item.response ? 'text-amber-400' : 'text-neutral-light'}`}
                                          >
                                            ★
                                          </span>
                                        ))}
                                        <span className={`ml-2 text-neutral-dark font-medium ${i18n.language === 'ar' ? 'mr-2 ml-0' : ''}`}>
                                          {item.response}
                                        </span>
                                      </div>
                                      {item.options && item.options[item.response - 1] && (
                                        <p className={`text-sm text-neutral mt-1 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                                          {item.options[item.response - 1]}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {item.response === t('student_dashboard_no_answer_text') ? (
                                        <p className={`text-neutral italic ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>{t('student_dashboard_no_answer')}</p>
                                      ) : (
                                        <p className={`text-primary-dark ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>{item.response}</p>
                                      )}
                                      {typeof item.isCorrect === 'boolean' && (
                                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                                          item.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                          {item.isCorrect ? t('student_dashboard_correct') : t('student_dashboard_incorrect')}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {item.chartData ? (
                                <div>
                                  <h4 className={`font-medium mb-2 text-neutral-dark ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>{t('student_dashboard_answer_distribution')}:</h4>
                                  <div className="h-48 bg-white p-2 rounded-lg border border-neutral-light/30">
                                    <Bar
                                      data={item.chartData}
                                      options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                          y: {
                                            beginAtZero: true,
                                            ticks: {
                                              stepSize: 1,
                                              precision: 0,
                                              color: 'var(--color-neutral)'
                                            },
                                            grid: {
                                              color: 'rgba(var(--color-neutral-light-rgb), 0.2)'
                                            }
                                          },
                                          x: {
                                            ticks: {
                                              color: 'var(--color-neutral)'
                                            },
                                            grid: {
                                              display: false
                                            }
                                          }
                                        },
                                        plugins: {
                                          legend: {
                                            display: false
                                          },
                                          tooltip: {
                                            backgroundColor: 'white',
                                            titleColor: 'var(--color-primary-dark)',
                                            bodyColor: 'var(--color-neutral)',
                                            borderColor: 'var(--color-neutral-light)',
                                            borderWidth: 1,
                                            padding: 12,
                                            // @ts-ignore - boxShadow ist in den Typen nicht definiert, wird aber unterstützt
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                            callbacks: {
                                              label: function(context: any) {
                                                return `${context.parsed.y} ${context.parsed.y === 1 ? t('student_dashboard_answer') : t('student_dashboard_answers')}`;
                                              }
                                            }
                                          } as any // Typumwandlung, da die Tooltip-Typen nicht vollständig sind
                                        }
                                      } as ChartOptions<'bar'>}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <p className={`text-neutral text-sm ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>{t('student_dashboard_no_distribution_data')}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    
                    <div className={`flex ${i18n.language === 'ar' ? 'justify-start' : 'justify-end'} mt-6 pt-4 border-t border-neutral-light/30`}>
                      <Button 
                        onClick={closeAnalysis} 
                        variant="outline"
                        className="border-neutral-light/50 text-neutral-dark hover:bg-neutral-light/20"
                        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                      >
                        {t('student_dashboard_close')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;

// Die Funktion zum Prüfen des gespeicherten Fortschritts beibehalten
const hasSavedProgress = (surveyId: string) => {
  try {
    const savedData = JSON.parse(localStorage.getItem('incomplete_survey_answers') || '{}');
    return !!savedData[surveyId];
  } catch (error) {
    console.error('Fehler beim Prüfen auf gespeicherte Antworten:', error);
    return false;
  }
};

// Entferne diese Zeilen:
// console.log('State wurde aktualisiert:', {
//   analysisDataLength: formattedData.length,
//   selectedSurveyId: survey.id
// });
