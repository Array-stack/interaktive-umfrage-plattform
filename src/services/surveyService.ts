import { 
  Survey, 
  NewSurvey, 
  SurveyResponse, 
  NewSurveyResponse, 
  QuestionType, 
  Question,
  Answer
} from '../types';

// Additional type definitions
export interface SurveyAnalysis {
  id: string;
  title: string;
  questions: Array<{
    id: string;
    text: string;
    type: QuestionType;
    options?: string[];
    correctAnswer?: any;
    responses?: Array<{
      respondentId: string;
      value: any;
      isCorrect?: boolean;
    }>;
    answerDistribution?: number[];
  }>;
}

export interface StudentSurvey extends Omit<Survey, 'questions'> {
  status: 'open' | 'in_progress' | 'completed';
  progress: number;
  answeredQuestions: number;
  totalQuestions: number;
  ownerId: string;
  ownerName: string;
  createdBy: string;
  questions: Question[];
}

// Konstanten
const RESPONDENT_ID_LOCALSTORAGE_KEY = 'current_survey_respondent_id';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

console.log('Using API_BASE_URL:', API_BASE_URL);

/**
 * Verarbeitet API-Antworten und wirft Fehler bei HTTP-Fehlern
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  // Überprüfe zuerst den HTTP-Status
  if (!response.ok) {
    // Bei Fehlerstatus versuchen wir trotzdem, die Antwort zu parsen, um Fehlermeldungen zu erhalten
    try {
      const errorData = await response.clone().json();
      console.error('API Error:', response.status, errorData);
      throw new Error(
        errorData.message || 
        errorData.error || 
        `HTTP-Fehler ${response.status}: ${response.statusText}`
      );
    } catch (parseError) {
      // Wenn das Parsen fehlschlägt, versuchen wir, den Text zu lesen
      try {
        const errorText = await response.clone().text();
        // Überprüfen, ob es sich um HTML handelt
        if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
          console.error('API Error: HTML-Antwort erhalten statt JSON', {
            status: response.status,
            url: response.url,
            textPreview: errorText.substring(0, 100) + '...'
          });
          throw new Error(`API-Fehler: Server hat HTML statt JSON zurückgegeben. Möglicherweise ist der API-Server nicht erreichbar oder falsch konfiguriert.`);
        } else {
          console.error('API Error: Konnte Fehlerantwort nicht parsen', parseError, 'Antworttext:', errorText);
          throw new Error(`HTTP-Fehler ${response.status}: ${response.statusText}`);
        }
      } catch (textError) {
        // Wenn auch das Lesen des Texts fehlschlägt
        console.error('API Error: Konnte Fehlerantwort nicht lesen', textError);
        throw new Error(`HTTP-Fehler ${response.status}: ${response.statusText}`);
      }
    }
  }

  // Content-Type überprüfen
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  if (!isJson) {
    console.warn('API Warnung: Unerwarteter Content-Type', {
      status: response.status,
      contentType,
      url: response.url
    });
    // Wir versuchen trotzdem, die Antwort zu parsen
  }
  
  // Versuche, die Antwort als JSON zu parsen
  try {
    const text = await response.text();
    
    // Überprüfe, ob die Antwort leer ist
    if (!text.trim()) {
      console.warn('API Warnung: Leere Antwort erhalten');
      return {} as T; // Leeres Objekt zurückgeben
    }
    
    // Überprüfen, ob es sich um HTML handelt
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      console.error('API Error: HTML-Antwort erhalten statt JSON', {
        status: response.status,
        url: response.url,
        textPreview: text.substring(0, 100) + '...'
      });
      throw new Error(`API-Fehler: Server hat HTML statt JSON zurückgegeben. Möglicherweise ist der API-Server nicht erreichbar oder falsch konfiguriert.`);
    }
    
    // Versuche, den Text als JSON zu parsen
    try {
      const data = JSON.parse(text);
      return data as T;
    } catch (jsonError) {
      console.error('API Error: Ungültiges JSON-Format', jsonError, 'Antworttext:', text);
      throw new Error('Ungültiges JSON-Format in der Antwort');
    }
  } catch (error) {
    console.error('API Error: Konnte Antwort nicht lesen', error);
    throw new Error('Fehler beim Lesen der Antwort');
  }
}

/**
 * Erstellt die benötigten HTTP-Header für authentifizierte Anfragen
 */
function getAuthHeader(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Explizit den Content-Type setzen
    'X-Requested-With': 'XMLHttpRequest'
  };
  
  // Nur im Browser ausführen
  if (typeof window === 'undefined') {
    return headers;
  }

  try {
    // Prüfe verschiedene mögliche Token-Speicherorte
    const token = localStorage.getItem('auth_token') || 
                 localStorage.getItem('token') || 
                 '';
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      // Debug-Ausgabe (nur die ersten 5 Zeichen des Tokens)
      console.log('Using auth token:', token.substring(0, 5) + '...');
    } else {
      console.warn('No auth token found in localStorage');
    }
  } catch (error) {
    console.error('Error reading auth token:', error);
  }
  
  return headers;
}

/**
 * Transformiert die Rohdaten der API in ein strukturiertes Survey-Objekt
 */
function transformSurveyApiResponse(data: any): Survey[] {
  if (!data) {
    console.warn('transformSurveyApiResponse: Keine Daten empfangen');
    return [];
  }
  
  // Neue Sicherheitsüberprüfung: Wenn data kein Array ist und kein gültiges Survey-Objekt
  if (!Array.isArray(data) && (!data.id || !data.title)) {
    console.error('transformSurveyApiResponse: Unerwartetes API-Antwortformat', data);
    throw new Error("Unexpected API response format");
  }
  
  if (data.id && data.title) {
    console.log('transformSurveyApiResponse: Daten sind bereits ein gültiges Survey-Objekt');
    return [{
      id: data.id,
      title: data.title,
      description: data.description || '',
      isPublic: data.isPublic !== undefined ? data.isPublic : false,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
      createdBy: data.createdBy || 'system',
      questions: Array.isArray(data.questions) ? data.questions.map((q: any) => {
        // Konvertiere choices zu options, wenn choices vorhanden sind
        const options = Array.isArray(q.choices) && q.choices.length > 0 
          ? q.choices.map((c: any) => c.text) 
          : (Array.isArray(q.options) ? q.options : []);
        
        console.log(`Frage ${q.id}: Konvertiere ${Array.isArray(q.choices) ? q.choices.length : 0} choices zu options:`, options);
        
        return {
          id: q.id || `q-${Math.random().toString(36).substr(2, 9)}`,
          text: q.text || 'Unbenannte Frage',
          type: q.type || QuestionType.TEXT,
          required: q.required !== undefined ? q.required : true,
          options: options,
          choices: Array.isArray(q.choices) ? q.choices : [] // Behalte choices für Abwärtskompatibilität
        };
      }) : []
    }];
  }

  // Rest der Funktion bleibt unverändert
  // Wenn data bereits ein Array von Survey-Objekten ist, geben Sie es zurück
  if (Array.isArray(data) && data.length > 0 && data[0].id && data[0].title) {
    console.log('transformSurveyApiResponse: Daten sind bereits ein gültiges Survey-Array');
    return data.map(survey => ({
      ...survey,
      questions: Array.isArray(survey.questions) ? survey.questions.map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
        choices: [] // Leeres choices-Array für Abwärtskompatibilität
      })) : []
    }));
  }

  console.log('transformSurveyApiResponse: Versuche, Daten als Rohdaten zu verarbeiten');
  
  // Ansonsten versuchen wir, die Daten als Rohdaten zu verarbeiten
  const surveysMap = new Map<string, Survey>();
  const dataArray = Array.isArray(data) ? data : [data];
  
  dataArray.forEach((row: any) => {
    const surveyId = row.surveyId || row.id || 'unknown';
    
    if (!surveysMap.has(surveyId)) {
      surveysMap.set(surveyId, {
        id: surveyId,
        title: row.title || 'Unbenannte Umfrage',
        description: row.description || '',
        isPublic: row.isPublic !== undefined ? row.isPublic : false,
        createdAt: row.createdAt || new Date().toISOString(),
        updatedAt: row.updatedAt || row.createdAt || new Date().toISOString(),
        createdBy: row.ownerId || row.createdBy || 'system',
        questions: []
      });
    }
    
    const survey = surveysMap.get(surveyId)!;
    
    // Wenn die Zeile Fragen enthält, verarbeite sie
    if (row.questionId || row.questions) {
      const questions = row.questions || [{
        id: row.questionId,
        text: row.questionText,
        type: row.questionType,
        options: row.choiceText ? [row.choiceText] : []
      }];
      
      questions.forEach((q: any) => {
        if (!q) return;
        
        const questionId = q.id || `q-${Math.random().toString(36).substr(2, 9)}`;
        let question = survey.questions.find(q => q.id === questionId);
        
        if (!question) {
          question = {
            id: questionId,
            text: q.text || q.questionText || 'Unbenannte Frage',
            type: q.type || q.questionType || QuestionType.TEXT,
            required: q.required !== undefined ? q.required : true,
            options: [],
            choices: []
          };
          survey.questions.push(question);
        }
        
        // Füge Optionen hinzu, falls vorhanden
        if (q.options && Array.isArray(q.options) && question) {
          q.options.forEach((opt: string) => {
            if (opt && question && question.options && !question.options.includes(opt)) {
              question.options.push(opt);
            }
          });
        } else if (q.choiceText && question && question.options && !question.options.includes(q.choiceText)) {
          question.options.push(q.choiceText);
        }
      });
    }
  });
  
  const result = Array.from(surveysMap.values());
  console.log('transformSurveyApiResponse - Transformiertes Ergebnis:', result);
  return result;
}

export const surveyService = {
  /**
   * Ruft alle öffentlichen Umfragen ab
   */
  async getSurveys(): Promise<Survey[]> {
    try {
      console.log('Fetching surveys from:', `${API_BASE_URL}/surveys`);
      console.log('Using headers:', getAuthHeader());
      
      // Timeout für die Anfrage setzen (10 Sekunden)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(`${API_BASE_URL}/surveys`, {
          headers: getAuthHeader(),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Timeout aufheben
        
        console.log('API response status:', response.status);
        console.log('API response headers:', [...response.headers.entries()]);
        
        if (response.status === 404) {
          console.log('No surveys found (404)');
          return [];
        }
        
        try {
          const data = await handleApiResponse<any[]>(response);
          console.log('API Response data type:', typeof data);
          console.log('API Response is array:', Array.isArray(data));
          console.log('API Response preview:', JSON.stringify(data).substring(0, 200) + '...');
          
          // Überprüfen, ob die Antwort ein Array ist
          if (!Array.isArray(data)) {
            console.error('Unerwartetes Antwortformat: Kein Array erhalten', data);
            return [];
          }
          
          const surveys = transformSurveyApiResponse(data);
          console.log('Transformed surveys count:', surveys.length);
          return surveys;
        } catch (apiError) {
          console.error('API-Verarbeitungsfehler:', apiError);
          // Fehler an die UI weitergeben
          throw apiError;
        }
      } catch (fetchError) {
        clearTimeout(timeoutId); // Timeout aufheben
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('API-Anfrage hat das Timeout überschritten (10s)');
          throw new Error('API-Anfrage hat das Timeout überschritten. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
        }
        
        console.error('Fetch-Fehler in getSurveys:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error in getSurveys:', error);
      throw error; // Fehler weitergeben, damit die UI ihn anzeigen kann
    }
  },

  /**
   * Ruft eine bestimmte Umfrage anhand ihrer ID ab
   */
  async getSurvey(surveyId: string): Promise<Survey | null> {
    try {
      console.log(`Lade Umfrage mit ID: ${surveyId}...`);
      const headers = getAuthHeader();
      console.log('Verwende Auth-Header:', headers);
      
      const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}`, {
        headers: headers
      });
      
      console.log('API-Antwortstatus:', response.status);
      
      if (response.status === 404) {
        console.error(`Umfrage mit ID ${surveyId} nicht gefunden (404)`);
        return null;
      }
      
      // Überprüfe, ob die Antwort erfolgreich war
      if (!response.ok) {
        console.error(`Fehler beim Laden der Umfrage mit ID ${surveyId}: HTTP ${response.status}`);
        return null;
      }
      
      // Content-Type überprüfen, aber nicht abbrechen, wenn es nicht application/json ist
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      if (!isJson) {
        console.warn(`Umfrage mit ID ${surveyId}: Unerwarteter Content-Type:`, contentType);
        // Wir versuchen trotzdem, die Antwort zu parsen
      }
      
      // Lese den Antworttext
      const text = await response.text();
      
      // Überprüfe, ob die Antwort leer ist
      if (!text.trim()) {
        console.error(`Leere Antwort vom Server für Umfrage mit ID ${surveyId}`);
        return null;
      }
      
      // Versuche, den Text als JSON zu parsen
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Fehler beim Parsen der Antwort:', e, 'Antworttext:', text);
        return null;
      }
      
      console.log('Rohdaten der API-Antwort:', JSON.stringify(data, null, 2));
      
      // Stelle sicher, dass die Daten als Array an transformSurveyApiResponse übergeben werden
      const surveys = transformSurveyApiResponse(data);
      console.log('Transformierte Umfragen:', surveys);
      
      const survey = surveys[0] || null;
      
      if (!survey) {
        console.error('Keine Umfrage in der Antwort gefunden');
        return null;
      }
      
      // Stelle sicher, dass alle Fragen mit den richtigen Optionen initialisiert werden
      // Stelle sicher, dass alle Fragen mit den richtigen Optionen initialisiert werden
      if (survey && Array.isArray(survey.questions)) {
        survey.questions = survey.questions.map(question => {
          // Stelle sicher, dass options immer ein Array ist
          const options = Array.isArray(question.options) ? question.options : [];
          
          // Wenn es sich um eine Single- oder Multiple-Choice-Frage handelt und es keine Optionen gibt, initialisiere sie
          if ((question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.MULTIPLE_CHOICE) && 
              options.length === 0) {
            console.log(`Initialisiere Standardoptionen für Frage ${question.id}, da keine Optionen vorhanden sind`);
            return {
              ...question,
              options: ['Option 1', 'Option 2'], // Standardoptionen
              choices: [] // Für Abwärtskompatibilität
            };
          }
          
          // Wichtig: Wenn Optionen vorhanden sind, behalte sie bei
          console.log(`Frage ${question.id} hat ${options.length} Optionen:`, options);
          return {
            ...question,
            options,
            choices: [] // Für Abwärtskompatibilität
          };
        });
      } else {
        survey.questions = [];
      }
      
      console.log('Finale Umfrage:', survey);
      return survey;
      
    } catch (error) {
      console.error('Fehler beim Laden der Umfrage:', error);
      throw error;
    }
  },

  /**
   * Erstellt eine neue Umfrage
   */
  async createSurvey(surveyData: NewSurvey): Promise<Survey> {
    try {
      console.log('Sende Umfrage an Server:', JSON.stringify(surveyData, null, 2));
      const response = await fetch(`${API_BASE_URL}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(surveyData)
      });
      
      // Verarbeite die Antwort
      let data;
      try {
        data = await handleApiResponse<{surveyId: string}>(response);
        console.log('Antwort vom Server:', data);
      } catch (apiError) {
        console.error('Fehler bei der API-Anfrage:', apiError);
        throw new Error(`Fehler beim Erstellen der Umfrage: ${apiError instanceof Error ? apiError.message : 'Unbekannter Fehler'}`);
      }
      
      if (!data || !data.surveyId) {
        console.error('Ungültige Antwort vom Server:', data);
        throw new Error('Ungültige Antwort vom Server: Keine surveyId erhalten');
      }
      
      // Warte kurz, damit der Server Zeit hat, die Umfrage zu speichern
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Hole die vollständige Umfrage, um sicherzustellen, dass alle Felder vorhanden sind
      const survey = await this.getSurvey(data.surveyId);
      if (!survey) {
        console.error(`Konnte die erstellte Umfrage mit ID ${data.surveyId} nicht laden`);
        
        // Erstelle ein minimales Survey-Objekt, damit die Anwendung nicht abstürzt
        return {
          id: data.surveyId,
          title: surveyData.title,
          description: surveyData.description || '',
          isPublic: surveyData.isPublic,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'current_user',
          questions: surveyData.questions.map((q, index) => ({
            id: `q-${index}`,
            text: q.text,
            type: q.type,
            required: q.required,
            options: q.options || [],
            choices: q.choices || []
          }))
        };
      }
      
      return survey;
    } catch (error) {
      console.error('Fehler in createSurvey:', error);
      throw error;
    }
  },

  async updateSurvey(surveyId: string, surveyData: Partial<NewSurvey>): Promise<Survey> {
    // Transformiere die Fragen in das vom Backend erwartete Format
    const transformedQuestions = surveyData.questions?.map(question => ({
      text: question.text,
      type: question.type,
      required: question.required,
      choices: question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.MULTIPLE_CHOICE
        ? (question.options || []).map(option => ({
            text: option,
            isCorrect: false // Standardmäßig auf false setzen, falls nicht angegeben
          }))
        : []
    })) || [];

    const requestData = {
      title: surveyData.title,
      description: surveyData.description,
      isPublic: surveyData.isPublic,  // Diese Zeile hinzufügen
      questions: transformedQuestions
    };

    console.log('Sende Update-Anfrage:', JSON.stringify(requestData, null, 2));

    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(requestData)
    });
    
    // Direkt die Antwort als Survey-Objekt zurückgeben
    const responseData = await handleApiResponse<Survey>(response);
    
    // Sicherstellen, dass das zurückgegebene Objekt die erforderlichen Felder hat
    return {
      id: responseData.id,
      title: responseData.title,
      description: responseData.description || '',
      isPublic: responseData.isPublic !== undefined ? responseData.isPublic : false,
      createdAt: responseData.createdAt || new Date().toISOString(),
      updatedAt: responseData.updatedAt || new Date().toISOString(),
      createdBy: responseData.createdBy || 'system',
      questions: Array.isArray(responseData.questions) 
        ? responseData.questions.map(q => ({
            id: q.id || `q-${Math.random().toString(36).substr(2, 9)}`,
            text: q.text || 'Unbenannte Frage',
            type: q.type || QuestionType.TEXT,
            required: q.required !== undefined ? q.required : true,
            options: Array.isArray(q.options) ? q.options : [],
            choices: [] // Für Abwärtskompatibilität
          }))
        : []
    };
  },

  /**
   * Löscht eine Umfrage
   */
  async deleteSurvey(surveyId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (response.status === 204) {
        return;
      }

      // Content-Type überprüfen
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      let errorData: any = {};
      
      if (isJson) {
        // Versuche, die Antwort als JSON zu parsen
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('Fehler beim Parsen der Fehlerantwort:', e);
          errorData = { error: `HTTP-Fehler ${response.status}: ${response.statusText}` };
        }
      } else {
        // Bei nicht-JSON-Antworten
        try {
          const textResponse = await response.text();
          errorData = { 
            error: `HTTP-Fehler ${response.status}: ${response.statusText}`,
            responseText: textResponse.substring(0, 200) // Erste 200 Zeichen der Antwort
          };
        } catch (e) {
          errorData = { error: `HTTP-Fehler ${response.status}: ${response.statusText}` };
        }
      }
      
      console.error('API Error beim Löschen:', response.status, errorData);
      
      // Verbesserte Fehlerbehandlung für verschachtelte Fehlerobjekte
      let errorMessage = '';
      
      if (typeof errorData.error === 'object' && errorData.error !== null) {
        // Wenn error ein Objekt ist, extrahiere die message-Eigenschaft
        errorMessage = errorData.error.message || JSON.stringify(errorData.error);
      } else {
        // Ansonsten verwende die vorhandenen Eigenschaften
        errorMessage = errorData.message || errorData.error || `HTTP-Fehler ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    } catch (error) {
      console.error('Fehler beim Löschen der Umfrage:', error);
      throw error;
    }
  },

  /**
   * Reicht eine Antwort auf eine Umfrage ein
   */
  async submitResponse(submitData: NewSurveyResponse & { respondentId: string }): Promise<SurveyResponse> {
    try {
      const { surveyId, respondentId, answers } = submitData;
      
      // Speichere die Teilnehmer-ID für zukünftige Anfragen
      this.saveRespondentId(respondentId);
      
      console.log('[submitResponse] Sende Antworten an den Server:', {
        surveyId,
        respondentId,
        answerCount: answers.length,
        answers: answers.map((a: Answer) => ({
          questionId: a.questionId,
          valueType: typeof a.value,
          isArray: Array.isArray(a.value)
        }))
      });
      
      // Erstelle das Request-Objekt mit den erforderlichen Feldern
      const requestData = {
        respondentId, // Füge respondentId zum Request hinzu
        responses: answers.map(answer => ({
          questionId: answer.questionId,
          value: answer.value
        }))
      };
      
      console.log('[submitResponse] Formatiere Anfrage an das Backend');
      
      // Hole den Auth-Header
      const authHeaders = getAuthHeader();
      
      // Erstelle die ursprünglichen Request-Header
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...authHeaders
      };
      
      // Erste Anfrage mit Auth-Header senden
      const response = await fetch(
        `${API_BASE_URL}/survey-responses/surveys/${surveyId}`,
        {
          method: 'POST', // Korrigiert von GET zu POST
          headers,
          credentials: 'include',
          body: JSON.stringify(requestData)
        }
      );
      
      console.log(`[submitResponse] Server-Antwort erhalten: ${response.status} ${response.statusText}`);
      
      // Bei Autorisierungsfehlern, versuche es ohne Auth-Header
      if (response.status === 401 || response.status === 403) {
        console.log('[submitResponse] Nicht autorisiert, versuche es ohne Authentifizierungsheader');
        
        // Neue Header ohne Authorization erstellen
        const headersWithoutAuth = { ...headers };
        delete (headersWithoutAuth as any).Authorization;
        
        // Erneute Anfrage ohne Auth-Header
        const retryResponse = await fetch(
          `${API_BASE_URL}/survey-responses/surveys/${surveyId}`,
          {
            method: 'POST',
            headers: headersWithoutAuth,
            credentials: 'include',
            body: JSON.stringify(requestData)
          }
        );
        
        return this.handleSubmitResponse(retryResponse, surveyId);
      }
      
      return this.handleSubmitResponse(response, surveyId);
      
    } catch (error) {
      console.error('[submitResponse] Kritischer Fehler beim Senden der Antworten:', error);
      throw error;
    }
  },
  
  /**
   * Verarbeitet die Antwort des Servers nach dem Absenden einer Umfrage
   */
  async handleSubmitResponse(response: Response, surveyId: string): Promise<SurveyResponse> {
    // Content-Type überprüfen
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    // Versuche, die Antwort zu parsen, auch wenn ein Fehler aufgetreten ist
    let responseData;
    try {
      if (isJson) {
        responseData = await response.json();
      } else {
        const responseText = await response.text();
        console.warn('[handleSubmitResponse] Nicht-JSON-Antwort erhalten:', {
          contentType,
          preview: responseText.substring(0, 200)
        });
        responseData = { message: 'Ungültige Antwort vom Server (kein JSON)' };
      }
    } catch (e) {
      console.error('[handleSubmitResponse] Fehler beim Parsen der Antwort:', e);
      responseData = { message: 'Ungültige Antwort vom Server' };
    }
    
    // Wenn die Antwort nicht erfolgreich war, werfe einen Fehler
    if (!response.ok) {
      const error: any = new Error(
        responseData.message || `Fehler beim Senden der Antworten (${response.status})`
      );
      error.status = response.status;
      error.data = responseData;
      
      console.error(`[handleSubmitResponse] Fehler ${response.status} beim Senden der Antworten:`, {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      throw error;
    }
    
    console.log('[handleSubmitResponse] Antwort erfolgreich gesendet:', responseData);
    
    // Aktualisiere den Teilnahmestatus im localStorage
    try {
      const participatedSurveys = JSON.parse(
        localStorage.getItem('participated_surveys') || '[]'
      );
      
      if (!participatedSurveys.includes(surveyId)) {
        participatedSurveys.push(surveyId);
        localStorage.setItem(
          'participated_surveys',
          JSON.stringify(participatedSurveys)
        );
        console.log(`[handleSubmitResponse] Umfrage ${surveyId} zur Teilnahmeliste hinzugefügt`);
      }
    } catch (e) {
      console.error('[handleSubmitResponse] Fehler beim Aktualisieren der Teilnahmeliste:', e);
    }
    
    return responseData;
  },

  /**
   * Ruft alle Antworten zu einer bestimmten Umfrage ab
   */
  async getResponsesForSurvey(surveyId: string): Promise<SurveyResponse[]> {
    const response = await fetch(`${API_BASE_URL}/survey-responses/surveys/${surveyId}`, {
      headers: getAuthHeader()
    });
    
    return handleApiResponse<SurveyResponse[]>(response);
  },

  /**
   * Überprüft, ob der aktuelle Benutzer bereits an einer Umfrage teilgenommen hat
   */
  async checkIfSurveyTaken(surveyId: string): Promise<boolean> {
    // Zuerst den Server fragen
    try {
      const urlString = `${API_BASE_URL}/survey-responses/surveys/${surveyId}/check?_t=${Date.now()}`;
      
      const response = await fetch(urlString, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        const hasParticipated = data.hasParticipated;
        
        // Wenn teilgenommen wurde, im localStorage speichern
        if (hasParticipated) {
          this.markSurveyAsTaken(surveyId);
        }
        
        return hasParticipated;
      }
    } catch (error) {
      console.error('Fehler bei der Server-Überprüfung:', error);
    }
    
    // Fallback: Lokale Überprüfung
    try {
      const participatedSurveys = JSON.parse(
        localStorage.getItem('participated_surveys') || '[]'
      );
      
      return participatedSurveys.includes(surveyId);
    } catch (e) {
      console.warn('Fehler beim Lesen der lokalen Daten:', e);
      return false;
    }
  },
  
  /**
   * Verarbeitet die Antwort des Servers auf die Teilnahmeabfrage
   */
  async processSurveyResponse(response: Response): Promise<boolean> {
    console.log(`[processSurveyResponse] Verarbeite Antwort mit Status: ${response.status}`);
    
    // Wenn nicht gefunden, hat der Benutzer noch nicht teilgenommen
    if (response.status === 404) {
      console.log('[processSurveyResponse] Keine Antworten für diesen Teilnehmer gefunden');
      return false;
    }
    
    // Bei Autorisierungsfehlern annehmen, dass noch nicht teilgenommen wurde
    if (response.status === 401 || response.status === 403) {
      console.warn('[processSurveyResponse] Keine Berechtigung, nehme an, dass noch nicht teilgenommen wurde');
      return false;
    }
    
    // Bei anderen Fehlern die Fehlermeldung ausgeben
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[processSurveyResponse] Fehler beim Abrufen der Antworten (${response.status}):`, errorText);
      return false; // Im Fehlerfall nicht blockieren
    }
    
    try {
      // Antwort als Text lesen und dann parsen, um Stream-Probleme zu vermeiden
      const responseText = await response.text();
      
      // Wenn die Antwort leer ist, wurde noch nicht teilgenommen
      if (!responseText || responseText.trim() === '') {
        console.log('[processSurveyResponse] Leere Antwort empfangen, nehme an, dass noch nicht teilgenommen wurde');
        return false;
      }
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[processSurveyResponse] Fehler beim Parsen der JSON-Antwort:', parseError, { responseText });
        return false;
      }
      
      console.log('[processSurveyResponse] Antwortdaten empfangen:', responseData);
      
      // Wenn wir ein Array bekommen, prüfen ob es Einträge enthält
      if (Array.isArray(responseData)) {
        const hasResponses = responseData.length > 0;
        console.log(`[processSurveyResponse] ${hasResponses ? 'Bereits teilgenommen' : 'Noch nicht teilgenommen'} (${responseData.length} Antworten gefunden)`);
        return hasResponses;
      }
      
      // Wenn wir ein Objekt bekommen, prüfen ob es Antworten enthält
      if (responseData && typeof responseData === 'object') {
        // Prüfe auf verschiedene mögliche Strukturen
        if ('answers' in responseData && Array.isArray(responseData.answers)) {
          return responseData.answers.length > 0;
        } else if ('responses' in responseData && Array.isArray(responseData.responses)) {
          return responseData.responses.length > 0;
        } else if (responseData.id) {
          // Wenn eine ID vorhanden ist, nehmen wir an, dass es eine gültige Antwort ist
          return true;
        }
      }
      
      // Ansonsten schauen wir, ob das Objekt selbst Werte enthält
      const hasResponse = responseData && Object.keys(responseData).length > 0;
      console.log(`[processSurveyResponse] ${hasResponse ? 'Bereits teilgenommen' : 'Keine Antwortdaten gefunden'}`);
      return hasResponse;
      
    } catch (e) {
      console.error('[processSurveyResponse] Unerwarteter Fehler beim Verarbeiten der Antwort:', e);
      return false; // Im Zweifel nicht blockieren
    }
  },
  
  /**
   * Speichert die Teilnehmer-ID im localStorage
   */
  saveRespondentId(respondentId: string): void {
    try {
      localStorage.setItem(RESPONDENT_ID_LOCALSTORAGE_KEY, respondentId);
      console.log('[saveRespondentId] Teilnehmer-ID gespeichert:', respondentId);
    } catch (error) {
      console.error('[saveRespondentId] Fehler beim Speichern der Teilnehmer-ID:', error);
    }
  },
  
  /**
   * Markiert eine Umfrage als bereits beantwortet im localStorage
   */
  markSurveyAsTaken(surveyId: string): void {
    try {
      const participatedSurveys = JSON.parse(
        localStorage.getItem('participated_surveys') || '[]'
      );
      
      if (!participatedSurveys.includes(surveyId)) {
        participatedSurveys.push(surveyId);
        localStorage.setItem(
          'participated_surveys',
          JSON.stringify(participatedSurveys)
        );
        console.log(`[markSurveyAsTaken] Umfrage ${surveyId} als beantwortet markiert`);
      }
    } catch (error) {
      console.error('[markSurveyAsTaken] Fehler beim Speichern des Teilnahme-Status:', error);
    }
  },

  /**
   * Ruft alle für den aktuellen Studenten sichtbaren Umfragen mit Statusinformationen ab
   */
  async getStudentSurveys(): Promise<StudentSurvey[]> {
    try {
      console.log('Starte Abfrage der Studentenumfragen...');
      // Füge einen Timestamp-Parameter hinzu, um den Cache zu umgehen
      const timestamp = new Date().getTime();
      const response = await fetch(`${API_BASE_URL}/student/surveys?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        credentials: 'include',
      });
      
      // Logging für Debugging-Zwecke
      console.log(`Umfragen-Anfrage mit Cache-Busting: ${API_BASE_URL}/student/surveys?_t=${timestamp}`);
      console.log('Cache-Control-Header gesetzt:', 'no-cache, no-store, must-revalidate');

      console.log('Antwort erhalten, Status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('Fehlerdetails vom Server:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          console.error('Fehler beim Parsen der Fehlerantwort:', e);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Erfolgreich Umfragen geladen:', result.data?.length || 0);
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Laden der Umfragen');
      }

      return Array.isArray(result.data) ? result.data : [];
    } catch (error: unknown) {
      console.error('Kritischer Fehler beim Laden der Studentenumfragen:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      throw new Error(`Konnte die Umfragen nicht laden: ${errorMessage}`);
    }
  },

  /**
   * Ruft die Analyseergebnisse für eine bestimmte Umfrage ab.
   */
  async getSurveyAnalysis(surveyId: string): Promise<SurveyAnalysis> {
    try {
      console.log('Starte Anfrage für Umfrageanalyse:', surveyId);
      console.log('Auth-Header:', getAuthHeader());
      
      const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/analysis`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        credentials: 'include'
      });
      
      console.log('Analyse-Antwort erhalten, Status:', response.status);
      
      if (response.status === 401 || response.status === 403) {
        console.error('Keine Berechtigung für die Analyse:', surveyId);
        throw new Error('Sie müssen angemeldet sein und an dieser Umfrage teilgenommen haben, um die Analyse einsehen zu können.');
      }
      
      if (response.status === 404) {
        console.error('Umfrage nicht gefunden:', surveyId);
        throw new Error('Die angeforderte Umfrage wurde nicht gefunden.');
      }
      
      return handleApiResponse<SurveyAnalysis>(response);
    } catch (error) {
      console.error('Fehler beim Abrufen der Analyse:', error);
      throw error;
    }
  },

  /**
   * Fügt Schüler hinzu, die an einer bestimmten Umfrage teilgenommen haben
   */
  async addStudentsBySurvey(surveyId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/teacher/students/add-by-survey`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ surveyId })
    });
    
    return handleApiResponse(response);
  },
  
  /**
   * Entfernt einen Schüler von der Liste des Lehrers
   */
  async removeStudent(studentId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/teacher/students/${studentId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    
    return handleApiResponse(response);
  },

  /**
   * Entfernt eine Umfrage aus der Liste der teilgenommenen Umfragen
   */
  resetSurveyParticipation(surveyId: string): void {
    try {
      const participatedSurveys = JSON.parse(
        localStorage.getItem('participated_surveys') || '[]'
      );
      
      const updatedSurveys = participatedSurveys.filter((id: string) => id !== surveyId);
      localStorage.setItem(
        'participated_surveys',
        JSON.stringify(updatedSurveys)
      );
      console.log(`[resetSurveyParticipation] Teilnahme an Umfrage ${surveyId} zurückgesetzt`);
    } catch (error) {
      console.error('[resetSurveyParticipation] Fehler beim Zurücksetzen des Teilnahme-Status:', error);
    }
  },
  
  /**
   * Ruft empfohlene Umfragen ab mit verbesserter Fehlerbehandlung
   */
  async getRecommendedSurveys(): Promise<any> {
    try {
      const url = `${API_BASE_URL}/surveys/recommended`;
      console.log('[getRecommendedSurveys] Starte Abfrage an:', url);
      
      // Prüfe, ob ein Token vorhanden ist
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      const requestOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Nur Authorization-Header hinzufügen, wenn ein Token vorhanden ist
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include' as const
      };
      
      console.log('[getRecommendedSurveys] Request Options:', JSON.stringify({
        url,
        headers: requestOptions.headers,
        credentials: requestOptions.credentials
      }, null, 2));
      
      const response = await fetch(url, requestOptions);
      
      console.log(`[getRecommendedSurveys] Response Status: ${response.status} ${response.statusText}`);
      
      // Content-Type überprüfen
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      // Response-Header loggen
      console.log('[getRecommendedSurveys] Response Headers:', 
        Object.fromEntries(response.headers.entries()));
      
      // Bei 404 oder 501 (Not Implemented) leeres Array zurückgeben
      if (response.status === 404 || response.status === 501) {
        console.warn(`[getRecommendedSurveys] Endpoint nicht verfügbar (${response.status})`);
        return [];
      }
      
      // Bei nicht-JSON Antwort
      if (!isJson) {
        const responseText = await response.text();
        console.error('[getRecommendedSurveys] Ungültiges Antwortformat. Erwartet: JSON, Erhalten:', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          responsePreview: responseText.substring(0, 200) // Erste 200 Zeichen der Antwort
        });
        return []; // Leeres Array zurückgeben anstatt einen Fehler zu werfen
      }
      
      // JSON-Antwort verarbeiten
      let responseData;
      try {
        responseData = await response.json();
      } catch (error) {
        console.error('[getRecommendedSurveys] Fehler beim Parsen der JSON-Antwort:', error);
        return []; // Leeres Array zurückgeben bei JSON-Parsing-Fehlern
      }
      
      // Überprüfen, ob die Antwort ein Array ist
      if (!Array.isArray(responseData)) {
        console.error('[getRecommendedSurveys] Unerwartetes Antwortformat: Kein Array erhalten', responseData);
        
        // Versuchen, ein Array aus der Antwort zu extrahieren, falls es ein Objekt mit einer Array-Eigenschaft ist
        if (responseData && typeof responseData === 'object') {
          // Suche nach Array-Eigenschaften im Objekt
          const possibleArrays = Object.values(responseData).filter(value => Array.isArray(value));
          if (possibleArrays.length > 0) {
            // Verwende das erste gefundene Array
            console.log('[getRecommendedSurveys] Array-Eigenschaft im Objekt gefunden, verwende diese');
            responseData = possibleArrays[0];
          } else {
            // Wenn keine Array-Eigenschaft gefunden wurde, leeres Array zurückgeben
            console.error('[getRecommendedSurveys] Keine Array-Eigenschaft im Objekt gefunden');
            return [];
          }
        } else {
          return [];
        }
      }
      
      // Bei HTTP-Fehlern
      if (!response.ok) {
        console.error('[getRecommendedSurveys] API-Fehler:', {
          status: response.status,
          statusText: response.statusText,
          error: responseData
        });
        return [];
      }
      
      console.log('[getRecommendedSurveys] Erfolgreich abgerufen:', {
        count: Array.isArray(responseData) ? responseData.length : 'unbekannt',
        data: Array.isArray(responseData) ? responseData.slice(0, 3) : responseData
      });
      
      return responseData || [];
      
    } catch (error) {
      console.error('[getRecommendedSurveys] Kritischer Fehler:', {
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  },
  
  /**
   * Ruft alle Umfragen des eingeloggten Lehrers ab
   */
  async getTeacherSurveys(): Promise<Survey[]> {
    try {
      // Überprüfe, ob ein Auth-Token vorhanden ist
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('getTeacherSurveys: Kein Auth-Token vorhanden');
        return [];
      }
      
      console.log('Fetching teacher surveys from:', `${API_BASE_URL}/teacher/surveys`);
      console.log('Auth headers:', getAuthHeader());
      
      const response = await fetch(`${API_BASE_URL}/teacher/surveys`, {
        headers: getAuthHeader(),
        // Verhindere Caching der Anfrage
        cache: 'no-store'
      });
      
      console.log('Teacher surveys response status:', response.status);
      
      if (response.status === 401) {
        console.warn('Authentifizierungsfehler beim Abrufen der Lehrerumfragen (401)');
        return [];
      }
      
      if (response.status === 403) {
        console.warn('Keine Berechtigung zum Abrufen der Lehrerumfragen (403)');
        return [];
      }
      
      if (response.status === 404) {
        console.log('Keine Lehrerumfragen gefunden (404)');
        return [];
      }
      
      const data = await handleApiResponse<any[]>(response);
      console.log('API Response:', data);
      const surveys = transformSurveyApiResponse(data);
      console.log('Transformed teacher surveys:', surveys);
      return surveys;
    } catch (error) {
      console.error('Error in getTeacherSurveys:', error);
      // Fehler abfangen, aber leeres Array zurückgeben, um UI-Fehler zu vermeiden
      return [];
    }
  }
}; // Nur eine schließende Klammer für das surveyService-Objekt

// Exportiere die Instanz als Standard-Export für die Abwärtskompatibilität
export default surveyService;
