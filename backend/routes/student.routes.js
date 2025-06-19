const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * @typedef {Object} Survey
 * @property {string} id - Eindeutige ID der Umfrage
 * @property {string} title - Titel der Umfrage
 * @property {string} description - Beschreibung der Umfrage
 * @property {string} ownerId - ID des Besitzers
 * @property {string} createdAt - Erstellungsdatum
 * @property {boolean} isPublic - Öffentlichkeitsstatus
 * @property {string} access_type - Zugriffstyp (public, private, students_only)
 * @property {number} totalQuestions - Gesamtzahl der Fragen
 */

// Temporäre Dummy-Middleware für die Entwicklung
/**
 * @param {import('express').Request} req - Express Request-Objekt
 * @param {import('express').Response} res - Express Response-Objekt
 * @param {import('express').NextFunction} next - Express Next-Funktion
 */
const authenticateToken = (req, res, next) => { 
  // Füge einen Dummy-Benutzer für die Entwicklung hinzu
  req.user = { userId: 'dev-user-id', email: 'dev@example.com', role: 'student' };
  next(); 
};

/**
 * GET /api/student/surveys
 * Gibt alle für den Studenten sichtbaren Umfragen mit Statusinformationen zurück
 */
router.get('/surveys', authenticateToken, async (req, res) => {
  try {
    console.log('Empfange Anfrage an /api/student/surveys');
    
    // In der GET /surveys Route, ändere die SQL-Abfrage
    
    const studentId = req.user?.userId || 'anonymous';
    
    // 1. Hole alle verfügbaren Umfragen mit der Anzahl der Fragen
    const publicSurveys = await new Promise((resolve, reject) => {
      db.all(
        `SELECT s.id, s.title, s.description, s.ownerId, s.createdAt, s.isPublic, s.access_type,
                u.name as ownerName, COUNT(DISTINCT q.id) as totalQuestions,
                CASE 
                  WHEN ts.teacher_id IS NOT NULL THEN 1 
                  ELSE 0 
                END as isFromTeacher
             FROM surveys s
             LEFT JOIN users u ON s.ownerId = u.id
             LEFT JOIN questions q ON s.id = q.survey_id
             LEFT JOIN teacher_students ts ON s.ownerId = ts.teacher_id AND ts.student_id = ?
             WHERE s.isPublic = 1 OR s.access_type = 'public' OR 
                   (s.access_type = 'students_only' AND ts.student_id IS NOT NULL)
             GROUP BY s.id, s.title, s.description, s.ownerId, s.createdAt, s.isPublic, u.name
             ORDER BY isFromTeacher DESC, s.createdAt DESC`,
        [studentId],
        (err, rows) => {
          if (err) {
            console.error('Datenbankfehler beim Abrufen der Umfragen:', err);
            return reject(err);
          }
          console.log(`Gefundene Umfragen: ${rows ? rows.length : 0}`);
          resolve(rows || []);
        }
      );
    });

    // 2. Für jede Umfrage prüfen, ob der aktuelle Benutzer bereits geantwortet hat
    const surveysWithStatus = await Promise.all(
      publicSurveys.map(async (/** @type {Survey} */ survey) => {
        try {
          // Verwende die Client-IP oder eine Standard-IP, falls nicht verfügbar
          const clientIp = req.ip || '127.0.0.1';
          const response = await new Promise((resolve, reject) => {
            db.get(
              `SELECT COUNT(DISTINCT a.question_id) as answeredQuestions 
               FROM responses r
               JOIN answers a ON r.id = a.response_id
               WHERE r.survey_id = ? AND (r.respondentId = ? OR r.ip_address = ?)`,
              [survey.id, req.user?.userId || 'dev-user-id', clientIp],
              (err, row) => {
                if (err) {
                  console.error('Fehler beim Abrufen der Antworten:', err);
                  return resolve({ answeredQuestions: 0 });
                }
                resolve(row || { answeredQuestions: 0 });
              }
            );
          });

          const answeredQuestions = response.answeredQuestions || 0;
          const totalQuestions = survey.totalQuestions || 0;
          const progress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
          
          // Bestimme den Status basierend auf der Anzahl der beantworteten Fragen
          let status = 'open';
          if (totalQuestions > 0 && answeredQuestions >= totalQuestions) {
            status = 'completed';
          } else if (answeredQuestions > 0) {
            status = 'in_progress';
          }

          console.log(`Umfrage ${survey.id}: ${answeredQuestions}/${totalQuestions} Fragen beantwortet (${progress}%)`);

          return {
            ...survey,
            status,
            progress,
            answeredQuestions,
            totalQuestions
          };
        } catch (error) {
          console.error(`Fehler beim Verarbeiten der Umfrage ${survey.id}:`, error);
          return {
            ...survey,
            status: 'open',
            progress: 0,
            answeredQuestions: 0,
            totalQuestions: survey.totalQuestions || 0,
            error: 'Fehler beim Laden der Umfragendaten'
          };
        }
      })
    );

    console.log(`Sende ${surveysWithStatus.length} Umfragen an den Client`);
    
    // 3. Sende die bereinigten und angereicherten Umfragedaten
    res.json({
      success: true,
      data: surveysWithStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Kritischer Fehler beim Abrufen der Studentenumfragen:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Abrufen der Umfragen',
      details: process.env.NODE_ENV === 'development' ? (/** @type {Error} */(error)).message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
