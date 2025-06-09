/**
 * Zentraler Fehlerbehandler für Express-Routen
 * @param {Error} err - Das Fehlerobjekt
 * @param {Object} req - Der Express-Request
 * @param {Object} res - Die Express-Response
 * @param {Function} next - Die nächste Middleware-Funktion
 */
const errorHandler = (err, req, res, next) => {
  // Standardwerte für Fehlerantworten
  const statusCode = err.statusCode || 500;
  const error = {
    message: err.message || 'Interner Serverfehler',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Zusätzliche Validierungsfehler einfügen, falls vorhanden
  if (err.errors) {
    error.details = err.errors;
  }

  // Logging
  console.error('Fehler aufgetreten:', {
    message: err.message,
    statusCode,
    code: error.code,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? { id: req.user.userId, role: req.user.role } : 'Nicht authentifiziert',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });

  // Sende die Fehlerantwort
  res.status(statusCode).json({ error });
};

/**
 * Middleware zum Abfangen von 404 Fehlern
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Nicht gefunden - ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
};

/**
 * Wrapper für asynchrone Handler, um try/catch Blöcke zu vermeiden
 * @param {Function} fn - Asynchrone Controller-Funktion
 * @returns {Function} Neue Middleware-Funktion
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
 * @returns {Error} Neues Fehlerobjekt
 */
const createError = (message, statusCode = 400, code = 'VALIDATION_ERROR') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

/**
 * Validierungsfehler für Joi-Validierung
 * @param {Object} error - Joi-Validierungsfehler
 * @returns {Object} Formatierter Validierungsfehler
 */
const validationError = (error) => {
  const formattedError = createError('Validierungsfehler', 400, 'VALIDATION_ERROR');
  const details = error.details.reduce((acc, curr) => {
    const key = curr.path.join('.');
    acc[key] = curr.message;
    return acc;
  }, {});
  
  formattedError.errors = details;
  return formattedError;
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createError,
  validationError
};