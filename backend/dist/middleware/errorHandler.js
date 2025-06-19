/**
 * @typedef {Object} AppError
 * @property {number} [statusCode] - HTTP-Statuscode des Fehlers
 * @property {string} [code] - Fehlercode für die Clientanwendung
 * @property {Object} [errors] - Optionale Validierungsfehlerdetails
 * @property {string} [message] - Fehlermeldung (geerbt von Error)
 */
/**
 * @typedef {Object} JoiValidationError
 * @property {Array<{path?: string[], message?: string}>} [details] - Details des Validierungsfehlers
 */
/**
 * Zentraler Fehlerbehandler für Express-Routen
 * @param {Error & AppError} err - Das Fehlerobjekt
 * @param {import('express').Request} req - Der Express-Request
 * @param {import('express').Response} res - Die Express-Response
 * @param {import('express').NextFunction} next - Die nächste Middleware-Funktion
 * @returns {void}
 */
const errorHandler = (err, req, res, next) => {
    // Standardwerte für Fehlerantworten
    const statusCode = err.statusCode || 500;
    // Sicherere Fehlerstruktur erstellen
    /** @type {{message: string, code: string, stack?: string, details?: Object}} */
    const safeError = {
        message: err.message || 'Interner Serverfehler',
        code: err.code || 'INTERNAL_SERVER_ERROR',
    };
    // Stack-Trace nur in Entwicklungsumgebung hinzufügen
    if (process.env.NODE_ENV === 'development' && err.stack) {
        safeError.stack = err.stack;
    }
    // Zusätzliche Validierungsfehler einfügen, falls vorhanden
    if (err.errors) {
        safeError.details = err.errors;
    }
    // Strukturierte Fehlerprotokollierung
    /** @type {{timestamp: string, message: string, statusCode: number, code: string, url: string, method: string, ip: string|undefined, user: string|{id: string, role: string}, stack?: string}} */
    const logDetails = {
        timestamp: new Date().toISOString(),
        message: err.message,
        statusCode,
        code: safeError.code,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user ? { id: req.user.userId, role: req.user.role } : 'Nicht authentifiziert',
    };
    // Stack-Trace nur in Entwicklungsumgebung zum Log hinzufügen
    if (process.env.NODE_ENV === 'development' && err.stack) {
        logDetails.stack = err.stack;
    }
    console.error('Fehler aufgetreten:', logDetails);
    // Sende die Fehlerantwort
    res.status(statusCode).json({ error: safeError });
};
/**
 * Middleware zum Abfangen von 404 Fehlern
 * @param {import('express').Request} req - Der Express-Request
 * @param {import('express').Response} res - Die Express-Response
 * @param {import('express').NextFunction} next - Die nächste Middleware-Funktion
 * @returns {void}
 */
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Nicht gefunden - ${req.originalUrl}`);
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    next(error);
};
/**
 * Wrapper für asynchrone Handler, um try/catch Blöcke zu vermeiden
 * @template P, ResBody, ReqBody, ReqQuery
 * @param {(req: import('express').Request<P, ResBody, ReqBody, ReqQuery> & {user?: {userId: string, email: string, role: string}}, res: import('express').Response<ResBody>, next: import('express').NextFunction) => Promise<any>} fn - Asynchrone Controller-Funktion
 * @returns {import('express').RequestHandler<P, ResBody, ReqBody, ReqQuery>} Express RequestHandler
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
        // Füge Standardwerte für Fehler hinzu, falls nicht gesetzt
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        if (!err.code) {
            err.code = 'INTERNAL_SERVER_ERROR';
        }
        next(err);
    });
};
/**
 * Hilfsfunktion zum Erstellen von benutzerdefinierten Fehlern
 * @param {string} message - Fehlermeldung
 * @param {number} statusCode - HTTP-Statuscode (Standard: 400)
 * @param {string} code - Fehlercode (Standard: 'VALIDATION_ERROR')
 * @returns {Error & AppError} Neues Fehlerobjekt
 */
const createError = (message, statusCode = 400, code = 'VALIDATION_ERROR') => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    // In JavaScript können wir das Objekt einfach zurückgeben
    return error;
};
/**
 * Validierungsfehler für Joi-Validierung
 * @param {JoiValidationError} error - Joi-Validierungsfehler
 * @returns {Error & AppError} Formatierter Validierungsfehler
 */
const validationError = (error) => {
    const formattedError = createError('Validierungsfehler', 400, 'VALIDATION_ERROR');
    // Sicherheitsprüfung hinzufügen
    if (error && error.details && Array.isArray(error.details)) {
        /** @type {Object.<string, string>} */
        const details = error.details.reduce((/** @type {Object.<string, string>} */ acc, /** @type {{path?: string[], message?: string}} */ curr) => {
            // Prüfen, ob path existiert und ein Array ist
            const key = curr.path && Array.isArray(curr.path) ? curr.path.join('.') : 'unknown';
            acc[key] = curr.message || 'Unbekannter Validierungsfehler';
            return acc;
        }, {});
        formattedError.errors = details;
    }
    else {
        // Fallback für unerwartete Fehlerformate
        formattedError.errors = { general: 'Unbekannter Validierungsfehler' };
    }
    return formattedError;
};
module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    createError,
    validationError
};
