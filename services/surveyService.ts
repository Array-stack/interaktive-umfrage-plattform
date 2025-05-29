
import { Survey, NewSurvey, SurveyResponse, NewSurveyResponse } from '../types';

const API_BASE_URL = 'http://localhost:3001/api'; // Backend-URL

// Helper to handle API responses
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Fehler beim Verarbeiten der Serverantwort.' }));
    console.error('API Error:', response.status, errorData);
    throw new Error(errorData.error || `HTTP-Fehler ${response.status}`);
  }
  return response.json();
};

// Token aus dem localStorage abrufen
const getAuthHeader = (): HeadersInit => {
  const token = localStorage.getItem('auth_token');
  return token ? {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  } : {
    'Content-Type': 'application/json'
  };
};

export const surveyService = {
  getSurveys: async (): Promise<Survey[]> => {
    const response = await fetch(`${API_BASE_URL}/surveys`);
    return handleApiResponse(response);
  },

  getSurvey: async (surveyId: string): Promise<Survey | undefined> => {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}`);
    if (response.status === 404) return undefined; // Handle not found specifically
    return handleApiResponse(response);
  },

  createSurvey: async (surveyData: NewSurvey): Promise<Survey> => {
    const response = await fetch(`${API_BASE_URL}/surveys`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(surveyData),
    });
    return handleApiResponse(response);
  },

  submitResponse: async (responseData: NewSurveyResponse & { respondentId: string }): Promise<SurveyResponse> => {
    // The backend expects surveyId in the path, respondentId and answers in the body
    const { surveyId, respondentId, answers } = responseData;
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ respondentId, answers }),
    });
    return handleApiResponse(response);
  },

  getResponsesForSurvey: async (surveyId: string): Promise<SurveyResponse[]> => {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/responses`);
    return handleApiResponse(response);
  },

  checkIfSurveyTaken: async (surveyId: string, respondentId: string): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/responses/check/${surveyId}/${respondentId}`);
    const data = await handleApiResponse(response);
    return data.hasTaken;
  },

  // _populateInitialData is no longer needed as data comes from the backend.
  // If you need initial data, it should be seeded in the backend's database.js or via a separate script.

  updateSurvey: async (surveyId: string, surveyData: NewSurvey): Promise<Survey> => {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(surveyData),
    });
    return handleApiResponse(response);
  },

  deleteSurvey: async (surveyId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    if (response.status === 204) {
      return; // Erfolg, keine weitere Aktion erforderlich
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Fehler beim Löschen der Umfrage');
    }
  },
};

// Remove automatic call to _populateInitialData
// surveyService._populateInitialData();
