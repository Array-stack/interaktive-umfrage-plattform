declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      email: string;
      role: string;
    };
  }
  
  interface Error {
    statusCode?: number;
    code?: string;
    errors?: Record<string, any>;
  }
}

// Globale Erweiterung des Error-Objekts
interface Error {
  statusCode?: number;
  code?: string;
  errors?: Record<string, any>;
}

// Typdefinitionen für häufig verwendete Objekte

/**
 * @typedef {Object} User
 * @property {string} id - Eindeutige ID des Benutzers
 * @property {string} email - E-Mail-Adresse des Benutzers
 * @property {string} name - Name des Benutzers
 * @property {string} role - Rolle des Benutzers (teacher oder student)
 * @property {string} password - Gehashtes Passwort des Benutzers
 * @property {number} email_verified - Flag, ob die E-Mail bestätigt wurde (0 oder 1)
 * @property {string} verification_token - Token zur E-Mail-Bestätigung
 * @property {string} verification_token_expires - Ablaufdatum des Bestätigungstokens
 * @property {string} created_at - Erstellungsdatum des Benutzers
 * @property {string} last_login - Datum des letzten Logins
 */

/**
 * @typedef {Object} Survey
 * @property {string} id - Eindeutige ID der Umfrage
 * @property {string} title - Titel der Umfrage
 * @property {string} description - Beschreibung der Umfrage
 * @property {string} ownerId - ID des Besitzers
 * @property {string} createdAt - Erstellungsdatum
 * @property {boolean} isPublic - Öffentlichkeitsstatus
 * @property {string} access_type - Zugriffstyp (public, private, students_only)
 */

/**
 * @typedef {Object} SurveyResponse
 * @property {string} id - Eindeutige ID der Antwort
 * @property {string} survey_id - ID der zugehörigen Umfrage
 * @property {string} respondentId - ID des Antwortenden
 * @property {string} submittedAt - Zeitpunkt der Einreichung
 */

/**
 * @typedef {Object} Answer
 * @property {string} question_id - ID der Frage
 * @property {string|number|boolean|Array} value - Antwortwert
 */

/**
 * @typedef {Object} Question
 * @property {string} id - Eindeutige ID der Frage
 * @property {string} survey_id - ID der zugehörigen Umfrage
 * @property {string} text - Fragetext
 * @property {string} type - Fragetyp (text, number, choice, multiple_choice)
 * @property {boolean} required - Gibt an, ob die Frage erforderlich ist
 * @property {number} order - Reihenfolge der Frage in der Umfrage
 */