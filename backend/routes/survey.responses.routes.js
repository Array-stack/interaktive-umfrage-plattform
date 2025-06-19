const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireTeacherRole } = require('../authUtils');
const { asyncHandler } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid'); // UUID für bessere ID-Generierung

/**
 * @route   POST /api/survey-responses/surveys/:surveyId
 * @desc    Speichert die Antworten eines Benutzers auf eine Umfrage
 * @param   {import('express').Request} req - Express Request-Objekt
 * @param   {import('express').Response} res - Express Response-Objekt
 * @returns {Promise<void>} - Promise, der nach Abschluss aufgelöst wird
 * @throws  {Error} - Fehler bei der Datenbankabfrage oder Validierung
 * @access  Privat - Erfordert Authentifizierung
 */
router.post('/surveys/:surveyId', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user?.userId || 'anonymous';
    const responses = req.body.responses;

    console.log(`Neue Antworten für Umfrage ${surveyId} von Benutzer ${userId}`);
    console.log('Empfangene Antworten:', JSON.stringify(responses, null, 2));

    if (!Array.isArray(responses) || responses.length === 0) {
      console.error('Keine Antworten im Request erhalten');
      return res.status(400).json({ 
        success: false,
        error: 'Antworten sind erforderlich.',
        code: 'MISSING_ANSWERS'
      });
    }

    // Überprüfen, ob die Umfrage existiert
    const survey = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM surveys WHERE id = ?', [surveyId], (err, row) => {
        if (err) {
          console.error('Datenbankfehler beim Abrufen der Umfrage:', err);
          return reject(err);
        }
        resolve(row);
      });
    });

    if (!survey) {
      console.error(`Umfrage mit ID ${surveyId} nicht gefunden`);
      return res.status(404).json({ 
        success: false,
        error: 'Umfrage nicht gefunden.',
        code: 'SURVEY_NOT_FOUND'
      });
    }
    
    console.log(`Umfrage gefunden: ${survey.title}`);

    // Überprüfen, ob der Benutzer bereits an der Umfrage teilgenommen hat
    const existingResponse = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM responses WHERE survey_id = ? AND respondentId = ?',
        [surveyId, userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (existingResponse) {
      return res.status(409).json({ 
        success: false,
        error: 'Sie haben bereits an dieser Umfrage teilgenommen.',
        code: 'ALREADY_PARTICIPATED',
        submittedAt: existingResponse.submitted_at
      });
    }

    // Transaktion starten
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        db.run("BEGIN TRANSACTION;");

        try {
          // Neue Antwort erstellen
          const responseId = uuidv4(); // Verwende UUID statt generateId
          const submittedAt = new Date().toISOString();
          
          console.log(`Erstelle neue Antwort mit ID: ${responseId}`);
          
          // Antwort-Header speichern
          await new Promise((res, rej) => {
            const stmt = db.prepare(
              'INSERT INTO responses (id, survey_id, respondentId, submittedAt) VALUES (?, ?, ?, ?)'
            );
            stmt.run([responseId, surveyId, userId, submittedAt], function(err) {
              stmt.finalize();
              if (err) {
                console.error('Fehler beim Speichern der Antwort-Header:', err);
                return rej(err);
              }
              res(undefined);
            });
          });

          // Einzelne Antworten speichern
          console.log(`Speichere ${responses.length} Antworten...`);
          
          for (const [index, response] of responses.entries()) {
            if (!response.questionId || response.value === undefined) {
              console.error(`Ungültiges Antwortformat bei Antwort ${index + 1}:`, response);
              throw new Error(`Ungültiges Antwortformat bei Frage ${index + 1}`);
            }

            /** @type {string} */
            let answerValue;
            
            try {
              answerValue = Array.isArray(response.value) 
                ? JSON.stringify(response.value)
                : String(response.value);
                
              console.log(`Speichere Antwort ${index + 1} für Frage ${response.questionId}:`, answerValue);
              
              /** @type {Promise<void>} */
              await new Promise((res, rej) => {
                const stmt = db.prepare(
                  'INSERT INTO answers (response_id, question_id, value) VALUES (?, ?, ?)'
                );
                stmt.run([responseId, response.questionId, answerValue], function(err) {
                  stmt.finalize();
                  if (err) {
                    console.error('Fehler beim Speichern der Antwort:', err);
                    return rej(err);
                  }
                  console.log(`Antwort gespeichert mit ID: ${this.lastID}`);
                  res(undefined);
                });
              });
            } catch (error) {
              console.error(`Fehler beim Verarbeiten der Antwort ${index + 1}:`, error instanceof Error ? error.message : error);
              throw error;
            }
          }

          // Automatisch Schüler-Lehrer-Beziehung erstellen, wenn ein Schüler an einer Umfrage teilnimmt
          if (req.user && req.user.role === 'student') {
            try {
              // Hole den Besitzer der Umfrage
              const surveyOwner = await new Promise((resolve, reject) => {
                db.get('SELECT ownerId FROM surveys WHERE id = ?', [surveyId], 
                  (err, row) => err ? reject(err) : resolve(row?.ownerId));
              });
              
              if (surveyOwner) {
                // Überprüfe, ob der Besitzer ein Lehrer ist
                const isTeacher = await new Promise((resolve, reject) => {
                  db.get('SELECT role FROM users WHERE id = ?', [surveyOwner], 
                    (err, row) => err ? reject(err) : resolve(row?.role === 'teacher'));
                });
                
                if (isTeacher) {
                  // Überprüfe, ob die Beziehung bereits existiert
                  const existingRelation = await new Promise((resolve, reject) => {
                    db.get(
                      'SELECT id FROM teacher_students WHERE teacher_id = ? AND student_id = ?',
                      [surveyOwner, userId],
                      (err, row) => err ? reject(err) : resolve(row)
                    );
                  });
                  
                  // Wenn keine Beziehung existiert, erstelle eine neue
                  if (!existingRelation) {
                    const relationId = uuidv4(); // Verwende UUID statt generateId
                    const now = new Date().toISOString();
                    
                    await new Promise((resolve, reject) => {
                      db.run(
                        'INSERT INTO teacher_students (id, teacher_id, student_id, created_at) VALUES (?, ?, ?, ?)',
                        [relationId, surveyOwner, userId, now],
                        err => err ? reject(err) : resolve(undefined)
                      );
                    });
                    
                    console.log(`Schüler ${userId} wurde automatisch dem Lehrer ${surveyOwner} zugeordnet`);
                  }
                }
              }
            } catch (error) {
              console.error('Fehler beim Erstellen der Lehrer-Schüler-Beziehung:', error instanceof Error ? error.message : error);
              // Fehler hier nicht zurückgeben, da die Antwort trotzdem gespeichert werden soll
            }
          }

          // Alles erfolgreich, Transaktion bestätigen
          await new Promise((resolve, reject) => {
            db.run("COMMIT;", (err) => {
              if (err) return reject(err);
              
              // Erfolgreiche Antwort zurücksenden
              res.status(201).json({
                success: true,
                message: 'Antwort erfolgreich gespeichert',
                responseId,
                submittedAt
              });
              
              resolve(undefined);
            });
          });
        } catch (error) {
          // Bei Fehlern Transaktion rückgängig machen
          await new Promise((resolve) => db.run("ROLLBACK;", () => resolve(undefined)));
          console.error('Fehler beim Speichern der Antworten:', error instanceof Error ? error.message : error);
          
          // Fehlerantwort senden
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Fehler beim Speichern der Antworten',
              details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
            });
          }
          
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('[POST /respond] Fehler:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Fehler beim Abspeichern der Antwort' });
  }
}));

/**
 * @route   GET /api/survey-responses/surveys/:surveyId
 * @desc    Ruft alle Antworten für eine bestimmte Umfrage ab
 * @param   {import('express').Request} req - Express Request-Objekt
 * @param   {import('express').Response} res - Express Response-Objekt
 * @returns {Promise<void>} - Promise, der nach Abschluss aufgelöst wird
 * @throws  {Error} - Fehler bei der Datenbankabfrage
 * @access  Privat - Erfordert Authentifizierung und Lehrerrolle oder Eigentümerschaft
 */
router.get('/surveys/:surveyId', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user?.userId;

    // Überprüfen, ob die Umfrage existiert
    const survey = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM surveys WHERE id = ?', [surveyId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!survey) {
      return res.status(404).json({ 
        success: false,
        error: 'Umfrage nicht gefunden.',
        code: 'SURVEY_NOT_FOUND'
      });
    }

    // Überprüfen, ob der Benutzer berechtigt ist, die Antworten zu sehen
    // (nur der Eigentümer der Umfrage oder ein Lehrer mit Zugriff)
    if (survey.ownerId !== userId && req.user?.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Sie haben keine Berechtigung, diese Antworten einzusehen.',
        code: 'UNAUTHORIZED'
      });
    }

    // Alle Antworten für die Umfrage abrufen
    const responses = await new Promise((resolve, reject) => {
      db.all(
        `SELECT r.id, r.respondentId, r.submittedAt, u.username, u.email, u.role
         FROM responses r
         LEFT JOIN users u ON r.respondentId = u.id
         WHERE r.survey_id = ?
         ORDER BY r.submittedAt DESC`,
        [surveyId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    // Für jede Antwort die zugehörigen Antwortdetails abrufen
    const detailedResponses = await Promise.all(responses.map(async (response) => {
      const answers = await new Promise((resolve, reject) => {
        db.all(
          `SELECT a.question_id, a.value, q.text as question_text, q.type as question_type
           FROM answers a
           JOIN questions q ON a.question_id = q.id
           WHERE a.response_id = ?
           ORDER BY q.position`,
          [response.id],
          (err, rows) => err ? reject(err) : resolve(rows)
        );
      });

      // Antworten verarbeiten (JSON-Strings in Arrays umwandeln, wenn nötig)
      const processedAnswers = answers.map(answer => {
        try {
          // Versuche, den Wert als JSON zu parsen, falls es ein Array ist
          if (answer.value && (answer.value.startsWith('[') || answer.value.startsWith('{'))) {
            answer.value = JSON.parse(answer.value);
          }
        } catch (e) {
          // Wenn das Parsen fehlschlägt, behalte den ursprünglichen Wert bei
          console.warn(`Konnte Antwort nicht als JSON parsen: ${answer.value}`);
        }
        return answer;
      });

      return {
        ...response,
        answers: processedAnswers
      };
    }));

    res.json(detailedResponses);
  } catch (error) {
    console.error('[GET /surveys/:surveyId] Fehler:', error instanceof Error ? error.message : error);
    res.status(500).json({ 
      success: false,
      error: 'Fehler beim Abrufen der Antworten',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}));

/**
 * @route   GET /api/survey-responses/surveys/:surveyId/check
 * @desc    Überprüft, ob der aktuelle Benutzer bereits an einer Umfrage teilgenommen hat
 * @param   {import('express').Request} req - Express Request-Objekt
 * @param   {import('express').Response} res - Express Response-Objekt
 * @returns {Promise<void>} - Promise, der nach Abschluss aufgelöst wird
 * @throws  {Error} - Fehler bei der Datenbankabfrage
 * @access  Privat - Erfordert Authentifizierung
 */
router.get('/surveys/:surveyId/check', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user?.userId || 'anonymous';

    // Überprüfen, ob der Benutzer bereits an der Umfrage teilgenommen hat
    const existingResponse = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, submittedAt FROM responses WHERE survey_id = ? AND respondentId = ?',
        [surveyId, userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    res.json({
      hasParticipated: !!existingResponse,
      submittedAt: existingResponse?.submittedAt || null,
      responseId: existingResponse?.id || null
    });
  } catch (error) {
    console.error('[GET /surveys/:surveyId/check] Fehler:', error instanceof Error ? error.message : error);
    res.status(500).json({ 
      success: false,
      error: 'Fehler bei der Überprüfung der Teilnahme',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}));

module.exports = router;
