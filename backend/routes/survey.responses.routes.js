const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireTeacherRole } = require('../authUtils');
const { asyncHandler } = require('../middleware/errorHandler');

// Hilfsfunktion zur ID-Generierung
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * @route   POST /api/surveys/:surveyId/responses
 * @desc    Antworten auf eine Umfrage speichern
 * @access  Privat
 */
// Ändere von '/:surveyId/responses' zu '/surveys/:surveyId'
router.post('/surveys/:surveyId', authenticateToken, asyncHandler(async (req, res) => {
  const { surveyId } = req.params;
  const { answers } = req.body;
  const userId = req.user.userId;

  console.log(`Neue Antworten für Umfrage ${surveyId} von Benutzer ${userId}`);
  console.log('Empfangene Antworten:', JSON.stringify(answers, null, 2));

  if (!Array.isArray(answers) || answers.length === 0) {
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
        const responseId = generateId();
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
            console.log(`Antwort-Header gespeichert, ID: ${responseId}`);
            res();
          });
        });

        // Einzelne Antworten speichern
        console.log(`Speichere ${answers.length} Antworten...`);
        
        for (const [index, answer] of answers.entries()) {
          if (!answer.questionId || answer.value === undefined) {
            console.error(`Ungültiges Antwortformat bei Antwort ${index + 1}:`, answer);
            throw new Error(`Ungültiges Antwortformat bei Frage ${index + 1}`);
          }

          // Entferne die answerId-Generierung, da die Datenbank automatisch eine ID generiert
          let answerValue;
          
          try {
            answerValue = Array.isArray(answer.value) 
              ? JSON.stringify(answer.value)
              : String(answer.value);
              
            console.log(`Speichere Antwort ${index + 1} für Frage ${answer.questionId}:`, answerValue);
            
            await new Promise((res, rej) => {
              const stmt = db.prepare(
                'INSERT INTO answers (response_id, question_id, value) VALUES (?, ?, ?)'
              );
              stmt.run([responseId, answer.questionId, answerValue], function(err) {
                stmt.finalize();
                if (err) {
                  console.error('Fehler beim Speichern der Antwort:', err);
                  return rej(err);
                }
                console.log(`Antwort gespeichert mit ID: ${this.lastID}`);
                res();
              });
            });
          } catch (error) {
            console.error(`Fehler beim Verarbeiten der Antwort ${index + 1}:`, error);
            throw error;
          }
        }

        // Automatisch Schüler-Lehrer-Beziehung erstellen, wenn ein Schüler an einer Umfrage teilnimmt
        if (req.user.role === 'student') {
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
                  const relationId = generateId();
                  const now = new Date().toISOString();
                  
                  await new Promise((resolve, reject) => {
                    db.run(
                      'INSERT INTO teacher_students (id, teacher_id, student_id, added_at, survey_id) VALUES (?, ?, ?, ?, ?)',
                      [relationId, surveyOwner, userId, now, surveyId],
                      err => err ? reject(err) : resolve()
                    );
                  });
                  
                  console.log(`Schüler ${userId} wurde automatisch dem Lehrer ${surveyOwner} zugeordnet`);
                }
              }
            }
          } catch (error) {
            console.error('Fehler beim Erstellen der Lehrer-Schüler-Beziehung:', error);
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
            
            resolve();
          });
        });
      } catch (error) {
        // Bei Fehlern Transaktion rückgängig machen
        await new Promise((resolve) => db.run("ROLLBACK;", () => resolve()));
        console.error('Fehler beim Speichern der Antworten:', error);
        
        // Fehlerantwort senden
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Fehler beim Speichern der Antworten',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
        }
        
        reject(error);
      }
    });
  });
}));

/**
 * @route   GET /api/surveys/:surveyId/responses
 * @desc    Antworten auf eine Umfrage abrufen (nur für Besitzer)
 * @access  Privat (Lehrer)
 */
router.get('/:surveyId/responses', authenticateToken, requireTeacherRole, asyncHandler(async (req, res) => {
  const { surveyId } = req.params;
  const userId = req.user.userId;

  // Überprüfen, ob die Umfrage existiert und dem Benutzer gehört
  const survey = await new Promise((resolve, reject) => {
    db.get('SELECT * FROM surveys WHERE id = ?', [surveyId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!survey) {
    return res.status(404).json({ 
      error: 'Umfrage nicht gefunden.',
      code: 'SURVEY_NOT_FOUND'
    });
  }

  if (survey.ownerId !== userId) {
    return res.status(403).json({ 
      error: 'Sie sind nicht berechtigt, die Antworten dieser Umfrage einzusehen.',
      code: 'FORBIDDEN'
    });
  }

  // Antworten abrufen
  const responses = await new Promise((resolve, reject) => {
    const sql = `
      SELECT r.id as responseId, r.respondentId, r.submittedAt,
             u.name as respondentName, u.email as respondentEmail,
             a.question_id as questionId, a.value as answerValue,
             q.text as questionText, q.type as questionType
      FROM responses r
      LEFT JOIN users u ON r.respondentId = u.id
      LEFT JOIN answers a ON r.id = a.response_id
      LEFT JOIN questions q ON a.question_id = q.id
      WHERE r.survey_id = ?
      ORDER BY r.submittedAt DESC, r.id, q.id;
    `;

    db.all(sql, [surveyId], (err, rows) => {
      if (err) return reject(err);
      
      // Antworten nach Response gruppieren
      const responses = [];
      let currentResponse = null;

      rows.forEach(row => {
        // Neue Response
        if (!currentResponse || currentResponse.id !== row.responseId) {
          currentResponse = {
            id: row.responseId,
            respondent: {
              id: row.respondentId,
              name: row.respondentName || 'Anonymer Benutzer',
              email: row.respondentEmail || 'keine E-Mail'
            },
            submittedAt: row.submittedAt,
            answers: []
          };
          responses.push(currentResponse);
        }

        // Nur Antworten hinzufügen, wenn questionId vorhanden ist
        if (row.questionId) {
          // Antwort zur aktuellen Response hinzufügen
          let value = row.answerValue;
          if (row.questionType === 'MULTIPLE_CHOICE') {
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.error('Fehler beim Parsen der Mehrfachantwort:', e);
            }
          }

          currentResponse.answers.push({
            questionId: row.questionId,
            questionText: row.questionText || 'Unbekannte Frage',
            questionType: row.questionType || 'TEXT',
            value: value
          });
        }
      });

      resolve(responses);
    });
  });

  res.json(responses);
}));

/**
 * @route   GET /api/surveys/:surveyId/responses/check
 * @desc    Überprüfen, ob der aktuelle Benutzer bereits an der Umfrage teilgenommen hat
 * @access  Privat
 */
router.get('/:surveyId/responses/check', authenticateToken, asyncHandler(async (req, res) => {
  const { surveyId } = req.params;
  const userId = req.user.userId;

  console.log(`[check-participation] Überprüfe Teilnahme für Benutzer ${userId} an Umfrage ${surveyId}`);

  // Überprüfe, ob der Benutzer bereits an der Umfrage teilgenommen hat
  const response = await new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM responses WHERE survey_id = ? AND respondentId = ?',
      [surveyId, userId],
      (err, row) => err ? reject(err) : resolve(row)
    );
  });

  res.json({
    hasParticipated: !!response,
    submittedAt: response?.submittedAt
  });
}));

/**
 * @route   GET /api/surveys/:surveyId/analysis
 * @desc    Analyse der Antworten einer Umfrage abrufen
 * @access  Privat (Teilnehmer und Besitzer)
 */
router.get('/:surveyId/analysis', authenticateToken, asyncHandler(async (req, res) => {
  const { surveyId } = req.params;
  const userId = req.user.userId;
  const userRole = req.user.role;

  console.log(`Analyseanfrage für Umfrage ${surveyId} von Benutzer ${userId} (Rolle: ${userRole})`);

  try {
    // 1. Überprüfen, ob die Umfrage existiert
    const survey = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM surveys WHERE id = ?', [surveyId], (err, row) => {
        if (err) {
          console.error('Fehler beim Abrufen der Umfrage:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!survey) {
      console.log(`Umfrage ${surveyId} nicht gefunden`);
      return res.status(404).json({ 
        error: 'Umfrage nicht gefunden.',
        code: 'SURVEY_NOT_FOUND'
      });
    }

    // 2. Berechtigungsprüfung: Lehrer dürfen immer zugreifen, Studenten nur wenn sie teilgenommen haben
    if (userRole === 'student') {
    // Überprüfe, ob der Student bereits an der Umfrage teilgenommen hat
    const response = await new Promise((resolve, reject) => {
    db.get(
    'SELECT * FROM responses WHERE survey_id = ? AND respondentId = ?',
    [surveyId, userId],
    (err, row) => {
    if (err) {
    console.error('Fehler beim Prüfen der Teilnahme:', err);
    reject(err);
    } else {
    resolve(row);
    }
    }
    );
    });
    
    if (!response) {
    return res.status(403).json({
    error: 'Sie müssen an dieser Umfrage teilnehmen, bevor Sie die Analyse einsehen können.',
    code: 'PARTICIPATION_REQUIRED'
    });
    }
    }
    
    console.log(`Analyseanfrage für Umfrage ${surveyId} von Benutzer ${userId} (Rolle: ${userRole}) wird verarbeitet...`);
    
    // 3. Fragen der Umfrage abrufen
    const questions = await new Promise((resolve, reject) => {
    db.all(
    'SELECT id, text, type FROM questions WHERE survey_id = ? ORDER BY id',
    [surveyId],
    (err, rows) => {
    if (err) {
    console.error('Fehler beim Abrufen der Fragen:', err);
    reject(err);
    } else {
    console.log(`${rows ? rows.length : 0} Fragen für Umfrage ${surveyId} gefunden`);
    resolve(rows || []);
    }
    }
    );
    });
    
    // 4. Analyse für jede Frage erstellen
    const analysis = [];
    
    // Hole Antwortoptionen für alle Fragen
    const choicesMap = {};
    try {
    const allChoices = await new Promise((resolve, reject) => {
    db.all(
    'SELECT id, question_id, text FROM choices WHERE question_id IN (SELECT id FROM questions WHERE survey_id = ?)',
    [surveyId],
    (err, rows) => {
    if (err) {
    console.error('Fehler beim Abrufen der Antwortoptionen:', err);
    reject(err);
    } else {
    resolve(rows || []);
    }
    }
    );
    });
    
    // Gruppiere Antwortoptionen nach Frage-ID
    allChoices.forEach(choice => {
    if (!choicesMap[choice.question_id]) {
    choicesMap[choice.question_id] = [];
    }
    choicesMap[choice.question_id].push(choice.text);
    });
    console.log(`Antwortoptionen für ${Object.keys(choicesMap).length} Fragen geladen`);
    } catch (error) {
    console.error('Fehler beim Laden der Antwortoptionen:', error);
    // Fahre trotzdem fort, da dies nicht kritisch ist
    }
    
    for (const question of questions) {
    console.log(`Verarbeite Frage ${question.id}: ${question.text} (Typ: ${question.type})`);
    
    try {
    // 4.1 Antworten für diese Frage abrufen
    const answers = await new Promise((resolve, reject) => {
    const sql = `
    SELECT a.value, r.respondentId
    FROM answers a
    JOIN responses r ON a.response_id = r.id
    WHERE a.question_id = ? AND r.survey_id = ?
    `;
    
    db.all(sql, [question.id, surveyId], (err, rows) => {
    if (err) {
    console.error(`Fehler beim Abrufen der Antworten für Frage ${question.id}:`, err);
    return reject(err);
    }
    
    console.log(`${rows ? rows.length : 0} Antworten für Frage ${question.id} gefunden`);
    
    // Werte parsen, falls es sich um JSON handelt (z.B. bei Mehrfachantworten)
    const processedRows = (rows || []).map(row => {
    let value;
    try {
    // Versuche, den Wert als JSON zu parsen
    value = row.value ? JSON.parse(row.value) : null;
    } catch (e) {
    // Wenn kein gültiges JSON, verwende den Rohwert
    value = row.value;
    }
    
    return {
    value,
    respondentId: row.respondentId
    };
    }).filter(r => r.value !== null);
    
    resolve(processedRows);
    });
    });
    
    // 4.2 Analyse für diese Frage erstellen
    const questionAnalysis = {
    questionId: question.id,
    questionText: question.text,
    questionType: question.type,
    totalResponses: answers.length,
    options: choicesMap[question.id] || [],
    responses: answers.map(a => ({
    respondentId: a.respondentId,
    value: a.value
    }))
    };
    
    // 4.3 Antwortverteilung berechnen
    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'SINGLE_CHOICE') {
    // Für Auswahlfragen: Zähle die Häufigkeit jeder Antwortoption
    const choiceCounts = {};
    const options = choicesMap[question.id] || [];
    
    // Initialisiere alle Optionen mit 0
    options.forEach(option => {
    choiceCounts[option] = 0;
    });
    
    answers.forEach(answer => {
    // Behandle sowohl Arrays (Mehrfachantworten) als auch einzelne Werte
    const choices = Array.isArray(answer.value) ? answer.value : [answer.value];
    choices.forEach(choice => {
    if (choice !== null && choice !== undefined) {
    choiceCounts[choice] = (choiceCounts[choice] || 0) + 1;
    }
    });
    });
    
    // Erstelle die Antwortverteilung als Array in der Reihenfolge der Optionen
    questionAnalysis.answerDistribution = options.map(option => choiceCounts[option] || 0);
    } else if (question.type === 'RATING' || question.type === 'SCALE') {
    // Für Bewertungsfragen: Berechne Durchschnitt, Min, Max
    const numericAnswers = answers
    .map(a => typeof a.value === 'number' ? a.value : parseFloat(a.value))
    .filter(a => !isNaN(a));
    
    if (numericAnswers.length > 0) {
    const sum = numericAnswers.reduce((a, b) => a + b, 0);
    const avg = sum / numericAnswers.length;
    
    questionAnalysis.averageRating = parseFloat(avg.toFixed(2));
    questionAnalysis.minRating = Math.min(...numericAnswers);
    questionAnalysis.maxRating = Math.max(...numericAnswers);
    
    // Erstelle Verteilung für Bewertungen (1-5)
    const ratingCounts = [0, 0, 0, 0, 0]; // Für Bewertungen 1-5
    numericAnswers.forEach(rating => {
    const index = Math.min(Math.max(Math.floor(rating) - 1, 0), 4);
    ratingCounts[index]++;
    });
    
    questionAnalysis.answerDistribution = ratingCounts;
    }
    }
    
    analysis.push(questionAnalysis);
    } catch (error) {
    console.error(`Fehler bei der Analyse von Frage ${question.id}:`, error);
    // Füge trotzdem eine Basisanalyse hinzu, damit die Gesamtanalyse nicht fehlschlägt
    analysis.push({
    questionId: question.id,
    questionText: question.text,
    questionType: question.type,
    totalResponses: 0,
    error: "Fehler bei der Analyse dieser Frage"
    });
    }
    }
    
    // 5. Analyse zurückgeben
    console.log(`Analyse für Umfrage ${surveyId} erfolgreich erstellt mit ${analysis.length} Fragen`);
    res.json({
    surveyId: survey.id,
    title: survey.title,
    totalResponses: analysis.length > 0 && analysis[0].responses ? analysis[0].responses.length : 0,
    questions: analysis
    });
    } catch (error) {
    console.error(`Kritischer Fehler bei der Analyse für Umfrage ${surveyId}:`, error);
    res.status(500).json({
    error: 'Ein Fehler ist bei der Erstellung der Analyse aufgetreten.',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
    }
    }));
    
    // Statt:
    // await someFunction();
    
    // Verwenden Sie:
    // function initialize() {
    // return someFunction();
    // }
    
    // initialize().catch(console.error);
    
    module.exports = router;

