const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireTeacherRole } = require('../authUtils');
const { asyncHandler } = require('../middleware/errorHandler');

// Hilfsfunktion zur ID-Generierung
const generateId = () => Math.random().toString(36).substr(2, 9);

// Empfohlene Umfragen Route

/**
 * @route   GET /api/surveys/recommended
 * @desc    Empfohlene Umfragen abrufen
 * @access  Öffentlich
 */
router.get('/recommended', asyncHandler(async (req, res) => {
  const userId = req.user?.userId || null;
  const isAuthenticated = !!userId;
  const userRole = req.user?.role || null;
  
  let recommendedSurveys = [];
  
  if (isAuthenticated) {
    if (userRole === 'student') {
      // Für Schüler: Umfragen von ihren Lehrern priorisieren
      recommendedSurveys = await new Promise((resolve, reject) => {
        db.all(
          `SELECT s.id, s.title, s.description, s.ownerId, s.createdAt, s.isPublic, s.access_type,
                  u.name as ownerName, COUNT(DISTINCT q.id) as totalQuestions,
                  COUNT(DISTINCT r.id) as responseCount,
                  CASE 
                    WHEN ts.teacher_id IS NOT NULL THEN 3 
                    WHEN s.isPublic = 1 THEN 2
                    ELSE 1 
                  END as priority
           FROM surveys s
           LEFT JOIN users u ON s.ownerId = u.id
           LEFT JOIN questions q ON s.id = q.survey_id
           LEFT JOIN responses r ON s.id = r.survey_id
           LEFT JOIN teacher_students ts ON s.ownerId = ts.teacher_id AND ts.student_id = ?
           WHERE s.isPublic = 1 OR s.access_type = 'public' OR 
                 (s.access_type = 'students_only' AND ts.student_id IS NOT NULL)
           GROUP BY s.id
           ORDER BY priority DESC, responseCount DESC, s.createdAt DESC
           LIMIT 10`,
          [userId],
          (err, rows) => err ? reject(err) : resolve(rows || [])
        );
      });
    } else if (userRole === 'teacher') {
      // Für Lehrer: Ihre eigenen Umfragen und beliebte öffentliche Umfragen
      recommendedSurveys = await new Promise((resolve, reject) => {
        db.all(
          `SELECT s.id, s.title, s.description, s.ownerId, s.createdAt, s.isPublic, s.access_type,
                  u.name as ownerName, COUNT(DISTINCT q.id) as totalQuestions,
                  COUNT(DISTINCT r.id) as responseCount,
                  CASE 
                    WHEN s.ownerId = ? THEN 3 
                    ELSE 1 
                  END as priority
           FROM surveys s
           LEFT JOIN users u ON s.ownerId = u.id
           LEFT JOIN questions q ON s.id = q.survey_id
           LEFT JOIN responses r ON s.id = r.survey_id
           WHERE s.ownerId = ? OR s.isPublic = 1 OR s.access_type = 'public'
           GROUP BY s.id
           ORDER BY priority DESC, responseCount DESC, s.createdAt DESC
           LIMIT 10`,
          [userId, userId],
          (err, rows) => err ? reject(err) : resolve(rows || [])
        );
      });
    }
  } else {
    // Für nicht angemeldete Benutzer: Beliebte öffentliche Umfragen
    recommendedSurveys = await new Promise((resolve, reject) => {
      db.all(
        `SELECT s.id, s.title, s.description, s.ownerId, s.createdAt, s.isPublic, s.access_type,
                u.name as ownerName, COUNT(DISTINCT q.id) as totalQuestions,
                COUNT(DISTINCT r.id) as responseCount
         FROM surveys s
         LEFT JOIN users u ON s.ownerId = u.id
         LEFT JOIN questions q ON s.id = q.survey_id
         LEFT JOIN responses r ON s.id = r.survey_id
         WHERE s.isPublic = 1 OR s.access_type = 'public'
         GROUP BY s.id
         ORDER BY responseCount DESC, s.createdAt DESC
         LIMIT 10`,
        [],
        (err, rows) => err ? reject(err) : resolve(rows || [])
      );
    });
  }
  
  // Immer ein erfolgreiches Ergebnis zurückgeben
  res.json({
    success: true,
    data: recommendedSurveys // Kann ein leeres Array sein
  });
}));

// Alle Umfragen abrufen
router.get('/', (req, res) => {
  const sql = `
    SELECT s.id as surveyId, s.title, s.description, s.ownerId, s.createdAt,
           q.id as questionId, q.text as questionText, q.type as questionType,
           c.id as choiceId, c.text as choiceText
    FROM surveys s
    LEFT JOIN questions q ON s.id = q.survey_id
    LEFT JOIN choices c ON q.id = c.question_id
    ORDER BY s.createdAt DESC, q.id, c.id;
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Fehler beim Abrufen der Umfragen:', err.message);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Umfragen.' });
    }

    // Gruppiere die Daten nach Umfragen
    const surveys = [];
    let currentSurvey = null;
    let currentQuestion = null;

    rows.forEach(row => {
      // Neue Umfrage
      if (!currentSurvey || currentSurvey.id !== row.surveyId) {
        currentSurvey = {
          id: row.surveyId,
          title: row.title,
          description: row.description,
          ownerId: row.ownerId,
          createdAt: row.createdAt,
          questions: []
        };
        surveys.push(currentSurvey);
        currentQuestion = null;
      }

      // Neue Frage (wenn es eine Frage gibt)
      if (row.questionId && (!currentQuestion || currentQuestion.id !== row.questionId)) {
        currentQuestion = {
          id: row.questionId,
          text: row.questionText,
          type: row.questionType,
          choices: []
        };
        currentSurvey.questions.push(currentQuestion);
      }

      // Antwortoption (wenn vorhanden)
      if (row.choiceId && currentQuestion) {
        currentQuestion.choices.push({
          id: row.choiceId,
          text: row.choiceText
        });
      }
    });

    res.json(surveys);
  });
});

// Einzelne Umfrage abrufen
router.get('/:surveyId', (req, res) => {
  const { surveyId } = req.params;
  
  const sql = `
    SELECT s.id as surveyId, s.title, s.description, s.ownerId, s.createdAt, s.isPublic,
           q.id as questionId, q.text as questionText, q.type as questionType,
           c.id as choiceId, c.text as choiceText
    FROM surveys s
    LEFT JOIN questions q ON s.id = q.survey_id
    LEFT JOIN choices c ON q.id = c.question_id
    WHERE s.id = ?
    ORDER BY q.id, c.id;
  `;

  db.all(sql, [surveyId], (err, rows) => {
    if (err) {
      console.error('Fehler beim Abrufen der Umfrage:', err.message);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Umfrage.' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Umfrage nicht gefunden.' });
    }

    // Baue das Umfrage-Objekt auf
    const survey = {
      id: rows[0].surveyId,
      title: rows[0].title,
      description: rows[0].description,
      ownerId: rows[0].ownerId,
      createdAt: rows[0].createdAt,
      isPublic: rows[0].isPublic === 1, // Konvertiere SQLite-Integer zu Boolean
      questions: []
    };

    let currentQuestion = null;

    rows.forEach(row => {
      if (!row.questionId) return; // Keine Fragen vorhanden
      
      // Neue Frage
      if (!currentQuestion || currentQuestion.id !== row.questionId) {
        currentQuestion = {
          id: row.questionId,
          text: row.questionText,
          type: row.questionType,
          choices: []
        };
        survey.questions.push(currentQuestion);
      }

      // Antwortoption (wenn vorhanden)
      if (row.choiceId) {
        currentQuestion.choices.push({
          id: row.choiceId,
          text: row.choiceText
        });
      }
    });

    res.json(survey);
  });
});

// Neue Umfrage erstellen (nur für Lehrer)
router.post('/', authenticateToken, requireTeacherRole, (req, res) => {
  console.log('Neue Umfrage wird erstellt...');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  
  // In der POST / Route (Umfrage erstellen)
  
  // Transaktion starten
  db.run("BEGIN TRANSACTION;", function(err) {
    if (err) {
      console.error("Fehler beim Starten der Transaktion:", err.message);
      return res.status(500).json({
        success: false,
        error: "Datenbankfehler beim Erstellen der Umfrage."
      });
    }
    
    // Umfrage erstellen
    const surveyId = generateId();
    const createdAt = new Date().toISOString();
    const { title, description, isPublic, access_type = 'public', questions = [] } = req.body;
  
  db.run(
    'INSERT INTO surveys (id, title, description, ownerId, createdAt, isPublic, access_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [surveyId, title, description, req.user.userId, createdAt, isPublic ? 1 : 0, access_type],
    function(err) {
      if (err) {
        console.error("Fehler beim Einfügen der Umfrage:", err.message);
        return db.run("ROLLBACK;", () => {
          res.status(500).json({
            success: false,
            error: "Fehler beim Erstellen der Umfrage: " + err.message
          });
        });
      }
      // Rest des Codes bleibt gleich
      // Fragen und Antwortoptionen einfügen
      let questionPromises = questions.map((q, qIndex) => {
        return new Promise((resolve, reject) => {
          if (!q.text || !q.type) {
            return reject(new Error(`Frage ${qIndex + 1} hat keinen Text oder Typ`));
          }

          const questionId = generateId();
          const questionSql = `INSERT INTO questions (id, survey_id, text, type) VALUES (?, ?, ?, ?)`;
          
          console.log(`Füge Frage ${qIndex + 1} ein:`, { questionId, text: q.text, type: q.type });
          
          db.run(questionSql, [questionId, surveyId, q.text, q.type], function(err) {
            if (err) {
              console.error(`Fehler beim Einfügen der Frage ${qIndex + 1}:`, err.message);
              return reject(err);
            }
            
            // Antwortoptionen speichern, falls vorhanden
            console.log(`Prüfe Antwortoptionen für Frage ${qIndex + 1}:`, {
              type: q.type,
              hasChoices: Array.isArray(q.choices),
              choicesLength: Array.isArray(q.choices) ? q.choices.length : 0,
              choices: q.choices
            });
            
            if ((q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && Array.isArray(q.choices)) {
              console.log(`Füge Antwortoptionen für Frage ${qIndex + 1} ein`);
              
              // Wenn keine Choices vorhanden sind, füge Standardoptionen hinzu
              if (q.choices.length === 0) {
                q.choices = [
                  { id: 'default-1', text: 'Option 1' },
                  { id: 'default-2', text: 'Option 2' }
                ];
                console.log(`Keine Antwortoptionen gefunden, verwende Standardoptionen`);  
              }
              let choicePromises = q.choices.map((choice, cIndex) => {
                return new Promise((resolveChoice, rejectChoice) => {
                  if (!choice.text) {
                    return rejectChoice(new Error(`Antwortoption ${cIndex + 1} für Frage ${qIndex + 1} hat keinen Text`));
                  }
                  
                  const choiceId = generateId();
                  const choiceSql = `INSERT INTO choices (id, question_id, text) VALUES (?, ?, ?)`;
                  
                  db.run(choiceSql, [choiceId, questionId, choice.text], function(err) {
                    if (err) {
                      console.error(`Fehler beim Einfügen der Antwortoption ${cIndex + 1} für Frage ${qIndex + 1}:`, err.message);
                      return rejectChoice(err);
                    }
                    console.log(`Antwortoption ${cIndex + 1} für Frage ${qIndex + 1} erfolgreich gespeichert`);
                    resolveChoice({ id: choiceId, text: choice.text });
                  });
                });
              });
              
              Promise.all(choicePromises)
                .then(savedChoices => {
                  console.log(`Alle ${savedChoices.length} Antwortoptionen für Frage ${qIndex + 1} erfolgreich gespeichert`);
                  resolve({ 
                    id: questionId, 
                    text: q.text, 
                    type: q.type, 
                    choices: savedChoices 
                  });
                })
                .catch(error => {
                  console.error(`Fehler beim Speichern der Antwortoptionen für Frage ${qIndex + 1}:`, error);
                  reject(error);
                });
            } else {
              console.log(`Keine Antwortoptionen für Frage ${qIndex + 1} (Typ: ${q.type})`);
              resolve({ 
                id: questionId, 
                text: q.text, 
                type: q.type, 
                choices: [] 
              });
            }
          });
        });
      });

      console.log(`Starte Verarbeitung von ${questionPromises.length} Fragen...`);

      Promise.all(questionPromises)
        .then(savedQuestions => {
          console.log("Alle Fragen erfolgreich gespeichert. Führe Commit durch...");
          
          db.run("COMMIT;", function(err) {
            if (err) {
              console.error("Fehler beim Commit der Transaktion:", err.message);
              return db.run("ROLLBACK;", () => {
                res.status(500).json({ 
                  success: false,
                  error: "Fehler beim Speichern der Umfrage: " + err.message 
                });
              });
            }
            
            console.log(`Umfrage ${surveyId} erfolgreich in der Datenbank`);
            res.status(201).json({
              success: true,
              message: "Umfrage erfolgreich erstellt",
              surveyId: surveyId,
              questions: savedQuestions
            });
          });
        })
        .catch(err => {
          console.error("Fehler beim Speichern der Fragen:", err.message);
          db.run("ROLLBACK;", function(rollbackErr) {
            if (rollbackErr) {
              console.error("Fehler beim Rollback der Transaktion:", rollbackErr.message);
            }
            res.status(500).json({ 
              success: false,
              error: "Fehler beim Speichern der Fragen: " + err.message 
            });
          });
        });
  });
}); // Schließende Klammer für die POST-Route

// Umfrage löschen (nur für Lehrer und nur eigene Umfragen)
router.delete('/:surveyId', authenticateToken, requireTeacherRole, (req, res) => {
  const { surveyId } = req.params;
  const userId = req.user.userId;

  // Überprüfen, ob die Umfrage existiert und dem Benutzer gehört
  db.get('SELECT * FROM surveys WHERE id = ? AND ownerId = ?', [surveyId, userId], (err, survey) => {
    if (err) {
      console.error('Fehler beim Suchen der Umfrage:', err.message);
      return res.status(500).json({ error: 'Datenbankfehler beim Suchen der Umfrage.' });
    }

    if (!survey) {
      return res.status(404).json({ 
        error: 'Umfrage nicht gefunden oder Sie haben keine Berechtigung zum Löschen.' 
      });
    }

    // Transaktion starten, um alle abhängigen Daten zu löschen
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        console.error('Fehler beim Starten der Transaktion:', err.message);
        return res.status(500).json({ error: 'Datenbankfehler beim Löschen der Umfrage.' });
      }

      // Löschen der Antworten und zugehörigen Daten
      const deleteAnswers = new Promise((resolve, reject) => {
        // Die falsche Abfrage entfernen und nur die korrekte behalten
        db.run('DELETE FROM answers WHERE response_id IN (SELECT id FROM responses WHERE survey_id = ?)', 
          [surveyId], (err) => {
            if (err) reject(err);
            else resolve();
        });
      });

      // Löschen der Responses
      const deleteResponses = new Promise((resolve, reject) => {
        db.run('DELETE FROM responses WHERE survey_id = ?', [surveyId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Löschen der Choices
      const deleteChoices = new Promise((resolve, reject) => {
        db.run('DELETE FROM choices WHERE question_id IN (SELECT id FROM questions WHERE survey_id = ?)', 
          [surveyId], (err) => {
            if (err) reject(err);
            else resolve();
        });
      });

      // Löschen der Questions
      const deleteQuestions = new Promise((resolve, reject) => {
        db.run('DELETE FROM questions WHERE survey_id = ?', [surveyId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Löschen der Survey
      const deleteSurvey = new Promise((resolve, reject) => {
        db.run('DELETE FROM surveys WHERE id = ?', [surveyId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Alle Löschoperationen ausführen
      Promise.all([deleteAnswers, deleteResponses, deleteChoices, deleteQuestions, deleteSurvey])
        .then(() => {
          // Transaktion abschließen
          db.run('COMMIT', (err) => {
            if (err) {
              console.error('Fehler beim Commit der Transaktion:', err.message);
              return db.run('ROLLBACK', () => {
                res.status(500).json({ error: 'Fehler beim Löschen der Umfrage.' });
              });
            }
            res.status(204).send(); // Erfolg ohne Inhalt
          });
        })
        .catch(err => {
          console.error('Fehler beim Löschen der Umfrage:', err.message);
          db.run('ROLLBACK', () => {
            res.status(500).json({ error: 'Fehler beim Löschen der Umfrage: ' + err.message });
          });
        });
    });
  });
});

// Umfrage aktualisieren (nur für Lehrer und nur eigene Umfragen)
router.put('/:surveyId', authenticateToken, requireTeacherRole, (req, res) => {
  const { surveyId } = req.params;
  const userId = req.user.userId;
  const { title, description, questions, isPublic } = req.body;

  // Überprüfen, ob die Umfrage existiert und dem Benutzer gehört
  db.get('SELECT * FROM surveys WHERE id = ? AND ownerId = ?', [surveyId, userId], (err, survey) => {
    if (err) {
      console.error('Fehler beim Suchen der Umfrage:', err.message);
      return res.status(500).json({ error: 'Datenbankfehler beim Suchen der Umfrage.' });
    }

    if (!survey) {
      return res.status(404).json({ 
        error: 'Umfrage nicht gefunden oder Sie haben keine Berechtigung zum Bearbeiten.' 
      });
    }

    // Transaktion starten, um alle abhängigen Daten zu aktualisieren
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        console.error('Fehler beim Starten der Transaktion:', err.message);
        return res.status(500).json({ error: 'Datenbankfehler beim Aktualisieren der Umfrage.' });
      }

      // Umfrage aktualisieren
      const updateSurvey = new Promise((resolve, reject) => {
        db.run('UPDATE surveys SET title = ?, description = ?, isPublic = ? WHERE id = ?', 
          [title, description, isPublic ? 1 : 0, surveyId], (err) => {
            if (err) reject(err);
            else resolve();
        });
      });

      // Bestehende Fragen und Antwortoptionen löschen
      const deleteChoices = new Promise((resolve, reject) => {
        db.run('DELETE FROM choices WHERE question_id IN (SELECT id FROM questions WHERE survey_id = ?)', 
          [surveyId], (err) => {
            if (err) reject(err);
            else resolve();
        });
      });

      const deleteQuestions = new Promise((resolve, reject) => {
        db.run('DELETE FROM questions WHERE survey_id = ?', [surveyId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Erst bestehende Daten löschen (AKTUALISIERT)
      Promise.all([deleteChoices, deleteQuestions])
        .then(() => {
          // Dann neue Fragen und Antwortoptionen einfügen
          let questionPromises = questions.map((q, qIndex) => {
            return new Promise((resolve, reject) => {
              if (!q.text || !q.type) {
                return reject(new Error(`Frage ${qIndex + 1} hat keinen Text oder Typ`));
              }

              const questionId = generateId();
              const questionSql = `INSERT INTO questions (id, survey_id, text, type) VALUES (?, ?, ?, ?)`;
              
              db.run(questionSql, [questionId, surveyId, q.text, q.type], function(err) {
                if (err) {
                  return reject(err);
                }
                
                // Antwortoptionen speichern, falls vorhanden
                if ((q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && (q.choices?.length > 0 || q.options?.length > 0)) {
                  // Verwende entweder choices oder options, je nachdem was verfügbar ist
                  const optionsToUse = q.choices?.length > 0 ? q.choices : 
                                      q.options?.map((opt, idx) => ({ id: `option-${idx}`, text: opt })) || [];
                  
                  let choicePromises = optionsToUse.map((choice, cIndex) => {
                    return new Promise((resolveChoice, rejectChoice) => {
                      if (!choice.text) {
                        return rejectChoice(new Error(`Antwortoption ${cIndex + 1} für Frage ${qIndex + 1} hat keinen Text`));
                      }
                      
                      const choiceId = generateId();
                      const choiceSql = `INSERT INTO choices (id, question_id, text) VALUES (?, ?, ?)`;
                      
                      db.run(choiceSql, [choiceId, questionId, choice.text], function(err) {
                        if (err) {
                          return rejectChoice(err);
                        }
                        resolveChoice({ id: choiceId, text: choice.text });
                      });
                    });
                  });
                  
                  Promise.all(choicePromises)
                    .then(savedChoices => {
                      resolve({ 
                        id: questionId, 
                        text: q.text, 
                        type: q.type, 
                        choices: savedChoices 
                      });
                    })
                    .catch(error => {
                      reject(error);
                    });
                } else {
                  resolve({ 
                    id: questionId, 
                    text: q.text, 
                    type: q.type, 
                    choices: [] 
                  });
                }
              });
            });
          });

          Promise.all([updateSurvey, ...questionPromises])
            .then(results => {
              // Das erste Element ist das Ergebnis von updateSurvey, der Rest sind die Fragen
              const savedQuestions = results.slice(1);
              
              // Transaktion abschließen
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Fehler beim Commit der Transaktion:', err.message);
                  return db.run('ROLLBACK', () => {
                    res.status(500).json({ error: 'Fehler beim Aktualisieren der Umfrage.' });
                  });
                }
                
                // Aktualisierte Umfrage zurückgeben
                res.status(200).json({
                  id: surveyId,
                  title,
                  description,
                  isPublic: isPublic ? true : false,
                  questions: savedQuestions,
                  updatedAt: new Date().toISOString()
                });
              });
            })
            .catch(err => {
              console.error('Fehler beim Aktualisieren der Umfrage:', err.message);
              db.run('ROLLBACK', () => {
                res.status(500).json({ error: 'Fehler beim Aktualisieren der Umfrage: ' + err.message });
              });
            });
        })
        .catch(err => {
          console.error('Fehler beim Löschen der bestehenden Daten:', err.message);
          db.run('ROLLBACK', () => {
            res.status(500).json({ error: 'Fehler beim Aktualisieren der Umfrage: ' + err.message });
          });
        });
    });
  });
});

/**
 * @route   GET /api/surveys/teacher
 * @desc    Alle Umfragen eines Lehrers abrufen
 * @access  Privat (nur Lehrer)
 * @deprecated Dieser Endpunkt wurde nach /api/teacher/surveys verschoben
 */
// Auskommentiert, da dieser Endpunkt jetzt unter /api/teacher/surveys verfügbar ist
/*
router.get('/teacher', authenticateToken, requireTeacherRole, asyncHandler(async (req, res) => {
  const teacherId = req.user.userId;
  
  const sql = `
    SELECT s.id as surveyId, s.title, s.description, s.ownerId, s.createdAt,
           q.id as questionId, q.text as questionText, q.type as questionType,
           c.id as choiceId, c.text as choiceText
    FROM surveys s
    LEFT JOIN questions q ON s.id = q.survey_id
    LEFT JOIN choices c ON q.id = c.question_id
    WHERE s.ownerId = ?
    ORDER BY s.createdAt DESC, q.id, c.id;
  `;

  db.all(sql, [teacherId], (err, rows) => {
    if (err) {
      console.error('Fehler beim Abrufen der Lehrerumfragen:', err.message);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Lehrerumfragen.' });
    }

    // Gruppiere die Daten nach Umfragen (gleiche Logik wie in der allgemeinen Umfragen-Route)
    const surveys = [];
    let currentSurvey = null;
    let currentQuestion = null;

    rows.forEach(row => {
      // Neue Umfrage
      if (!currentSurvey || currentSurvey.id !== row.surveyId) {
        currentSurvey = {
          id: row.surveyId,
          title: row.title,
          description: row.description,
          ownerId: row.ownerId,
          createdAt: row.createdAt,
          questions: []
        };
        surveys.push(currentSurvey);
        currentQuestion = null;
      }

      // Neue Frage (wenn es eine Frage gibt)
      if (row.questionId && (!currentQuestion || currentQuestion.id !== row.questionId)) {
        currentQuestion = {
          id: row.questionId,
          text: row.questionText,
          type: row.questionType,
          choices: []
        };
        currentSurvey.questions.push(currentQuestion);
      }

      // Antwortoption (wenn vorhanden)
      if (row.choiceId && currentQuestion) {
        currentQuestion.choices.push({
          id: row.choiceId,
          text: row.choiceText
        });
      }
    });

    res.json(surveys);
  });
}));
*/

// Nur ein einziges module.exports am Ende der Datei
module.exports = router;



}); // Closing bracket for the POST route

module.exports = router;





