import { LoginCredentials, RegisterData, AuthResponse, User } from '../types/auth';

export interface VerifyEmailResponse {
  message: string;
  email?: string;
  redirect?: string;
}

// API-Basis-URL für Backend-Anfragen
// Verwende die Umgebungsvariable oder den Fallback für die Produktion
const API_BASE_URL = process.env.API_BASE_URL || '/api';
console.log('API_BASE_URL:', API_BASE_URL);

// Helper zum Umgang mit API-Antworten
const handleApiResponse = async (response: Response) => {
  console.log('API Response Status:', response.status);
  
  // Bei Weiterleitungen die Weiterleitung zurückgeben
  if (response.redirected) {
    console.log('Weiterleitung erkannt');
    return { message: 'Weiterleitung erforderlich' };
  }
  
  // Versuche, die Antwort als JSON zu parsen, unabhängig vom Statuscode
  let responseData;
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
      console.log('API Response Data:', responseData);
    } catch (parseError) {
      console.error('Fehler beim Parsen der JSON-Antwort:', parseError);
      throw new Error('Ungültiges Antwortformat vom Server');
    }
  }
  
  // Fehlerbehandlung für nicht erfolgreiche Antworten
  if (!response.ok) {
    console.error('API Error:', response.status, responseData);
    const errorMessage = responseData?.error || 
                        responseData?.message || 
                        `HTTP-Fehler ${response.status}`;
    throw new Error(errorMessage);
  }
  
  // Erfolgreiche Antwort zurückgeben
  return responseData || { message: 'Erfolgreich' };
};

// Token im localStorage speichern
const saveToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

// Token aus dem localStorage abrufen
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Token aus dem localStorage entfernen
const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// Benutzer im localStorage speichern
const saveUser = (user: User): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

// Benutzer aus dem localStorage abrufen
const getUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    // Überprüfen, ob der String gültiges JSON ist
    const parsed = JSON.parse(userStr);
    return parsed;
  } catch (error) {
    console.error('Fehler beim Parsen des Benutzers aus dem localStorage:', error);
    // Bei Fehler den Eintrag entfernen, um zukünftige Fehler zu vermeiden
    localStorage.removeItem('user');
    return null;
  }
};

// Benutzer aus dem localStorage entfernen
const removeUser = (): void => {
  localStorage.removeItem('user');
};

export const authService = {
  // Benutzerregistrierung
  register: async (data: RegisterData): Promise<AuthResponse> => {
    console.log('Registrierungsdaten:', data);
    const url = `${API_BASE_URL}/auth/register`;
    console.log('Registrierungs-URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      console.log('Registrierungsantwort Status:', response.status);
      
      if (!response.ok) {
        console.error('Registrierungsfehler:', response.status, response.statusText);
        try {
          const errorData = await response.json();
          console.error('Fehlerdetails:', errorData);
          throw new Error(errorData.error || `HTTP-Fehler ${response.status}`);
        } catch (e) {
          if (e instanceof Error && e.message.includes('Diese E-Mail wird bereits verwendet')) {
            throw e; // Wenn es ein bereits bekannter Fehler ist, werfen wir ihn weiter
          }
          console.error('Fehler beim Verarbeiten der Antwort:', e);
          throw new Error(`Fehler bei der Registrierung: ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      saveToken(result.token);
      saveUser(result.user);
      return result;
    } catch (error) {
      console.error('Netzwerkfehler bei der Registrierung:', error);
      throw new Error('Netzwerkfehler bei der Registrierung. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
    }
  },
  
  // E-Mail-Adresse bestätigen
  verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
    const url = `${API_BASE_URL}/auth/verify-email?token=${token}`;
    console.log('E-Mail-Bestätigungs-URL:', url);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der E-Mail-Bestätigung');
      }
      
      console.log('E-Mail-Bestätigung erfolgreich:', data);
      return data;
    } catch (error) {
      console.error('Fehler bei der E-Mail-Bestätigung:', error);
      throw error instanceof Error ? error : new Error('Unbekannter Fehler bei der E-Mail-Bestätigung');
    }
  },
  
  // Passwort-Zurücksetzung anfordern
  forgotPassword: async (email: string): Promise<{ message: string; emailPreviewUrl?: string }> => {
    const url = `${API_BASE_URL}/auth/forgot-password`;
    console.log('Passwort-Zurücksetzungs-URL:', url);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    return handleApiResponse(response);
  },
  
  // Passwort zurücksetzen
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const url = `${API_BASE_URL}/auth/reset-password`;
    console.log('=== resetPassword aufgerufen ===');
    console.log('Ziel-URL:', url);
    
    const requestBody = { 
      token: token,
      newPassword: newPassword 
    };
    
    console.log('Request-Body:', JSON.stringify(requestBody, null, 2));
    
    try {
      console.log('Sende Anfrage an den Server...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Antwort empfangen. Status:', response.status, response.statusText);
      
      // Debug-Ausgabe der Antwort-Header
      console.log('Antwort-Header:');
      response.headers.forEach((value, key) => {
        console.log(`  ${key}: ${value}`);
      });
      
      // Versuche, die Antwort zu parsen, unabhängig vom Statuscode
      let responseData;
      try {
        responseData = await response.clone().json();
        console.log('Antwort-Daten (JSON):', responseData);
      } catch (parseError) {
        console.warn('Konnte Antwort nicht als JSON parsen:', parseError);
        const textResponse = await response.text();
        console.log('Rohantwort vom Server:', textResponse);
        throw new Error('Ungültiges Antwortformat vom Server');
      }
      
      if (!response.ok) {
        console.error('Fehler vom Server:', response.status, responseData);
        throw new Error(
          responseData.error || 
          responseData.message || 
          `Serverfehler: ${response.status} ${response.statusText}`
        );
      }
      
      console.log('Passwort erfolgreich zurückgesetzt');
      return responseData;
      
    } catch (error) {
      console.error('Fehler in resetPassword:', error);
      // Stelle sicher, dass wir immer einen Error-Objekt zurückgeben
      if (error instanceof Error) {
        throw error;
      } else if (typeof error === 'string') {
        throw new Error(error);
      } else {
        throw new Error('Ein unbekannter Fehler ist aufgetreten');
      }
    }
  },

  // Benutzeranmeldung
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const url = `${API_BASE_URL}/auth/login`;
    console.log('Login-URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      console.log('Login-Antwort Status:', response.status);
      
      if (!response.ok) {
        console.error('Login-Fehler:', response.status, response.statusText);
        try {
          const errorData = await response.json();
          console.error('Fehlerdetails:', errorData);
          throw new Error(errorData.error || `HTTP-Fehler ${response.status}`);
        } catch (e) {
          console.error('Fehler beim Verarbeiten der Antwort:', e);
          throw new Error(`Fehler beim Login: ${response.statusText}`);
        }
      }

      const result = await response.json();
      saveToken(result.token);
      saveUser(result.user);
      return result;
    } catch (error) {
      console.error('Netzwerkfehler beim Login:', error);
      throw new Error('Netzwerkfehler beim Login. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
    }
  },

  // Benutzerabmeldung
  logout: (): void => {
    removeToken();
    removeUser();
  },

  // Benutzerprofil abrufen
  getProfile: async (): Promise<User> => {
    const token = getToken();
    if (!token) {
      throw new Error('Nicht authentifiziert');
    }

    const url = `${API_BASE_URL}/auth/profile`;
    console.log('Profil-URL:', url);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const result = await handleApiResponse(response);
    return result.user;
  },

  // Hilfsfunktionen
  getToken,
  getUser,
  isAuthenticated: (): boolean => {
    try {
      const token = getToken();
      if (!token) return false;
      
      // Überprüfen, ob das Token gültig ist (nicht abgelaufen)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return false;
      
      // Token dekodieren und Ablaufdatum prüfen
      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        const expirationTime = payload.exp * 1000; // exp ist in Sekunden, JS verwendet Millisekunden
        const currentTime = Date.now();
        
        // Prüfen, ob das Token abgelaufen ist
        if (expirationTime < currentTime) {
          console.log('Token ist abgelaufen');
          // Token aus dem localStorage entfernen, da es abgelaufen ist
          removeToken();
          removeUser();
          return false;
        }
        
        return true;
      } catch (decodeError) {
        console.error('Fehler beim Dekodieren des Tokens:', decodeError);
        return false;
      }
    } catch (error) {
      console.error('Fehler bei der Authentifizierungsprüfung:', error);
      return false;
    }
  },
  isTeacher: (): boolean => {
    const user = getUser();
    return !!user && user.role === 'teacher';
  },
  isStudent: (): boolean => {
    const user = getUser();
    return !!user && user.role === 'student';
  },
};
