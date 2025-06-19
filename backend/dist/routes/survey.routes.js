const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireTeacherRole } = require('../authUtils');
const { asyncHandler } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid'); // UUID für bessere ID-Generierung
// Promise-Wrapper für db.all
const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Datenbankfehler:', err.message);
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
/**
 * @typedef {Object} Survey
 * @property {string} id - ID der Umfrage
 * @property {string} title - Titel der Umfrage
 * @property {string} description - Beschreibung der Umfrage
 * @property {string} ownerId - ID des Erstellers der Umfrage
 * @property {string} createdAt - Erstellungsdatum der Umfrage
 * @property {boolean} isPublic - Gibt an, ob die Umfrage öffentlich ist
 * @property {string} access_type - Zugriffstyp der Umfrage (public, students_only, private)
 * @property {string} [ownerName] - Name des Erstellers der Umfrage
 * @property {number} [totalQuestions] - Anzahl der Fragen in der Umfrage
 * @property {number} [responseCount] - Anzahl der Antworten auf die Umfrage
 * @property {Question[]} [questions] - Fragen der Umfrage
 */
/**
 * @typedef {Object} Question
 * @property {string} id - ID der Frage
 * @property {string} text - Text der Frage
 * @property {string} type - Typ der Frage (TEXT, SINGLE_CHOICE, MULTIPLE_CHOICE, etc.)
 * @property {Array<{id: string, text: string}>} choices - Antwortoptionen für die Frage
 */
/**
 * @typedef {Object} Choice
 * @property {string} id - ID der Antwortoption
 * @property {string} text - Text der Antwortoption
 */
/**
 * @typedef {Object} CreateSurveyRequest
 * @property {string} title - Titel der Umfrage
 * @property {string} description - Beschreibung der Umfrage
 * @property {boolean} isPublic - Gibt an, ob die Umfrage öffentlich ist
 * @property {string} [access_type] - Zugriffstyp der Umfrage (public, students_only, private)
 * @property {Object[]} [questions] - Fragen der Umfrage
 * @property {string} questions.text - Text der Frage
 * @property {string} questions.type - Typ der Frage
 * @property {Object[]} [questions.choices] - Antwortoptionen für die Frage
 * @property {string} questions.choices.text - Text der Antwortoption
 */
/**
 * @typedef {Object} UpdateSurveyRequest
 * @property {string} title - Titel der Umfrage
 * @property {string} description - Beschreibung der Umfrage
 * @property {boolean} isPublic - Gibt an, ob die Umfrage öffentlich ist
 * @property {Object[]} questions - Fragen der Umfrage
 */
/**
 * @typedef {Object} SurveyResponse
 * @property {boolean} success - Gibt an, ob die Operation erfolgreich war
 * @property {string} [message] - Erfolgsmeldung
 * @property {string} [surveyId] - ID der erstellten Umfrage
 * @property {Object[]} [questions] - Gespeicherte Fragen
 * @property {string} [error] - Fehlermeldung
 */
// Empfohlene Umfragen Route
/**
 * @route   GET /api/surveys/recommended
 * @desc    Empfohlene Umfragen abrufen (Testversion)
 * @access  Öffentlich
 */
router.get('/recommended', asyncHandler(async (req, res) => {
    try {
        const recommended = await dbAll('SELECT * FROM surveys WHERE isPublic = 1 ORDER BY createdAt DESC LIMIT 5');
        // Leeres Array als Fallback
        res.json(Array.isArray(recommended) ? recommended : []);
    }
    catch (error) {
        console.error('[GET /recommended] Fehler:', error instanceof Error ? error.message : error);
        res.status(500).json({ error: 'Fehler beim Abrufen empfohlener Umfragen' });
    }
}));
/**
 * @route   GET /api/surveys
 * @desc    Alle öffentlichen Umfragen abrufen
 * @access  Öffentlich
 */
router.get('/', asyncHandler(async (req, res) => {
    try {
        const surveys = await dbAll('SELECT * FROM surveys WHERE isPublic = 1 ORDER BY createdAt DESC');
        res.json(Array.isArray(surveys) ? surveys : []);
    }
    catch (error) {
        console.error('[GET /] Fehler:', error instanceof Error ? error.message : error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Umfragen' });
    }
}));
/**
 * @route   GET /api/surveys/:surveyId
 * @desc    Einzelne Umfrage mit allen Fragen und Antwortoptionen abrufen
 * @param   {import('express').Request} req - Express Request-Objekt
 * @param   {import('express').Response} res - Express Response-Objekt
 * @returns {void}
 * @throws  {Error} Wenn die Umfrage nicht gefunden wird oder ein Datenbankfehler auftritt
 */
router.get('/:surveyId', asyncHandler(async (req, res) => {
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
    try {
        const rows = await dbAll(sql, [surveyId]);
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
            questions: /** @type {Question[]} */ ([])
        };
        /** @type {Question|null} */
        let currentQuestion = null;
        rows.forEach(row => {
            if (!row.questionId)
                return; // Keine Fragen vorhanden
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
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Umfrage:', error instanceof Error ? error.message : String(error));
        res.status(500).json({ error: 'Fehler beim Abrufen der Umfrage.' });
    }
}));
/**
 * @route   POST /api/surveys
 * @desc    Neue Umfrage erstellen (nur für Lehrer)
 * @param   {import('express').Request<{}, {}, CreateSurveyRequest>} req - Express Request-Objekt
 * @param   {import('express').Response} res - Express Response-Objekt
 * @returns {void}
 * @throws  {Error} Wenn die Umfrage nicht erstellt werden kann oder ein Datenbankfehler auftritt
 */
router.post('/', authenticateToken, requireTeacherRole, asyncHandler(async (req, res) => {
    console.log('Neue Umfrage wird erstellt...');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    try {
        // Umfrage erstellen
        const surveyId = uuidv4();
        const createdAt = new Date().toISOString();
        const { title, description, isPublic, access_type = 'public', questions = [] } = req.body;
        const userId = req.user?.userId || 'anonymous';
        await db.run('INSERT INTO surveys (id, title, description, ownerId, createdAt, isPublic, access_type) VALUES (?, ?, ?, ?, ?, ?, ?)', [surveyId, title, description, userId, createdAt, isPublic ? 1 : 0, access_type]);
        // Fragen und Antwortoptionen einfügen
        const savedQuestions = [];
        for (const [qIndex, q] of questions.entries()) {
            if (!q.text || !q.type) {
                throw new Error(`Frage ${qIndex + 1} hat keinen Text oder Typ`);
            }
            const questionId = uuidv4();
            const questionSql = `INSERT INTO questions (id, survey_id, text, type) VALUES (?, ?, ?, ?)`;
            console.log(`Füge Frage ${qIndex + 1} ein:`, { questionId, text: q.text, type: q.type });
            await db.run(questionSql, [questionId, surveyId, q.text, q.type]);
            // Antwortoptionen speichern, falls vorhanden
            console.log(`Prüfe Antwortoptionen für Frage ${qIndex + 1}:`, {
                type: q.type,
                hasChoices: Array.isArray(q.choices),
                choicesLength: Array.isArray(q.choices) ? q.choices.length : 0,
                choices: q.choices
            });
            const savedChoices = [];
            if ((q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && Array.isArray(q.choices)) {
                console.log(`Füge Antwortoptionen für Frage ${qIndex + 1} ein`);
                // Wenn keine Choices vorhanden sind, füge Standardoptionen hinzu
                const choicesToUse = q.choices.length === 0 ? [
                    { id: 'default-1', text: 'Option 1' },
                    { id: 'default-2', text: 'Option 2' }
                ] : q.choices;
                for (const [cIndex, choice] of choicesToUse.entries()) {
                    if (!choice.text) {
                        throw new Error(`Antwortoption ${cIndex + 1} für Frage ${qIndex + 1} hat keinen Text`);
                    }
                    const choiceId = uuidv4();
                    const choiceSql = `INSERT INTO choices (id, question_id, text) VALUES (?, ?, ?)`;
                    await db.run(choiceSql, [choiceId, questionId, choice.text]);
                    console.log(`Antwortoption ${cIndex + 1} für Frage ${qIndex + 1} erfolgreich gespeichert`);
                    savedChoices.push({ id: choiceId, text: choice.text });
                }
            }
            savedQuestions.push({
                id: questionId,
                text: q.text,
                type: q.type,
                choices: savedChoices
            });
        }
        console.log(`Umfrage ${surveyId} erfolgreich in der Datenbank`);
        res.status(201).json({
            success: true,
            message: "Umfrage erfolgreich erstellt",
            surveyId: surveyId,
            questions: savedQuestions
        });
    }
    catch (error) {
        console.error("Fehler beim Speichern der Umfrage:", error instanceof Error ? error.message : error);
        res.status(500).json({
            success: false,
            error: "Fehler beim Erstellen der Umfrage: " + (error instanceof Error ? error.message : error)
        });
    }
}));
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

    // Gruppiere die Daten nach Umfragen (gleiche Logik wie in der allgemeinen Umfrage-Route)
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
/**
 * @route   PUT /api/surveys/:surveyId
 * @desc    Umfrage aktualisieren
 * @access  Privat (nur Lehrer)
 */
router.put('/:surveyId', authenticateToken, requireTeacherRole, asyncHandler(async (req, res) => {
    const { surveyId } = req.params;
    const { title, description, isPublic, questions = [] } = req.body;
    const userId = req.user?.userId;
    try {
        // Überprüfen, ob die Umfrage existiert und dem Lehrer gehört
        const survey = await dbAll('SELECT * FROM surveys WHERE id = ? AND ownerId = ?', [surveyId, userId]);
        if (survey.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Umfrage nicht gefunden oder Sie sind nicht der Besitzer'
            });
        }
        // Umfrage aktualisieren
        await db.run('UPDATE surveys SET title = ?, description = ?, isPublic = ? WHERE id = ?', [title, description, isPublic ? 1 : 0, surveyId]);
        // Bestehende Fragen und Antwortoptionen löschen
        // Zuerst die Antwortoptionen löschen (wegen Fremdschlüsselbeziehungen)
        await db.run('DELETE FROM choices WHERE question_id IN (SELECT id FROM questions WHERE survey_id = ?)', [surveyId]);
        // Dann die Fragen löschen
        await db.run('DELETE FROM questions WHERE survey_id = ?', [surveyId]);
        // Neue Fragen und Antwortoptionen einfügen
        const savedQuestions = [];
        for (const [qIndex, q] of questions.entries()) {
            if (!q.text || !q.type) {
                throw new Error(`Frage ${qIndex + 1} hat keinen Text oder Typ`);
            }
            const questionId = uuidv4();
            const questionSql = `INSERT INTO questions (id, survey_id, text, type) VALUES (?, ?, ?, ?)`;
            await db.run(questionSql, [questionId, surveyId, q.text, q.type]);
            // Antwortoptionen speichern, falls vorhanden
            const savedChoices = [];
            if ((q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && Array.isArray(q.choices)) {
                const choicesToUse = q.choices.length === 0 ? [
                    { id: 'default-1', text: 'Option 1' },
                    { id: 'default-2', text: 'Option 2' }
                ] : q.choices;
                for (const [cIndex, choice] of choicesToUse.entries()) {
                    if (!choice.text) {
                        throw new Error(`Antwortoption ${cIndex + 1} für Frage ${qIndex + 1} hat keinen Text`);
                    }
                    const choiceId = uuidv4();
                    const choiceSql = `INSERT INTO choices (id, question_id, text) VALUES (?, ?, ?)`;
                    await db.run(choiceSql, [choiceId, questionId, choice.text]);
                    savedChoices.push({ id: choiceId, text: choice.text });
                }
            }
            savedQuestions.push({
                id: questionId,
                text: q.text,
                type: q.type,
                choices: savedChoices
            });
        }
        res.json({
            success: true,
            message: 'Umfrage erfolgreich aktualisiert',
            surveyId: surveyId,
            questions: savedQuestions
        });
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren der Umfrage:', error instanceof Error ? error.message : error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Aktualisieren der Umfrage: ' + (error instanceof Error ? error.message : error)
        });
    }
}));
/**
 * @route   DELETE /api/surveys/:surveyId
 * @desc    Umfrage löschen
 * @access  Privat (nur Lehrer)
 */
router.delete('/:surveyId', authenticateToken, requireTeacherRole, asyncHandler(async (req, res) => {
    const { surveyId } = req.params;
    const userId = req.user?.userId;
    try {
        // Überprüfen, ob die Umfrage existiert und dem Lehrer gehört
        const survey = await dbAll('SELECT * FROM surveys WHERE id = ? AND ownerId = ?', [surveyId, userId]);
        if (survey.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Umfrage nicht gefunden oder Sie sind nicht der Besitzer'
            });
        }
        // Beginne eine Transaktion
        await db.run('BEGIN TRANSACTION');
        try {
            // Lösche zuerst alle Antworten auf die Umfrage
            await db.run('DELETE FROM responses WHERE survey_id = ?', [surveyId]);
            // Lösche dann alle Antwortoptionen der Fragen
            await db.run('DELETE FROM choices WHERE question_id IN (SELECT id FROM questions WHERE survey_id = ?)', [surveyId]);
            // Lösche alle Fragen der Umfrage
            await db.run('DELETE FROM questions WHERE survey_id = ?', [surveyId]);
            // Lösche schließlich die Umfrage selbst
            await db.run('DELETE FROM surveys WHERE id = ?', [surveyId]);
            // Commit der Transaktion
            await db.run('COMMIT');
            // Erfolgreiche Antwort senden
            res.status(204).send();
        }
        catch (error) {
            // Bei einem Fehler die Transaktion zurückrollen
            await db.run('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Fehler beim Löschen der Umfrage:', error instanceof Error ? error.message : error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Löschen der Umfrage: ' + (error instanceof Error ? error.message : error)
        });
    }
}));
/**
 * @route   GET /api/surveys/:surveyId/analysis
 * @desc    Analysedaten für eine Umfrage abrufen
 * @access  Privat (erfordert Authentifizierung)
 */
router.get('/:surveyId/analysis', authenticateToken, asyncHandler(async (req, res) => {
    const { surveyId } = req.params;
    const userId = req.user?.userId;
    try {
        // Überprüfen, ob die Umfrage existiert
        const survey = await dbAll('SELECT * FROM surveys WHERE id = ?', [surveyId]);
        if (survey.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Umfrage nicht gefunden.'
            });
        }
        // Fragen der Umfrage abrufen
        const questions = await dbAll('SELECT id, text, type FROM questions WHERE survey_id = ?', [surveyId]);
        // Für jede Frage die Antwortoptionen abrufen (falls vorhanden)
        for (const question of questions) {
            if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
                const choices = await dbAll('SELECT id, text FROM choices WHERE question_id = ?', [question.id]);
                question.options = choices.map(choice => choice.text);
            }
            // Antworten für diese Frage abrufen
            const answers = await dbAll(`SELECT a.value, r.respondentId 
         FROM answers a 
         JOIN responses r ON a.response_id = r.id 
         WHERE a.question_id = ? AND r.survey_id = ?`, [question.id, surveyId]);
            // Antworten verarbeiten
            question.responses = answers.map(answer => {
                let value = answer.value;
                // Versuche, JSON-Strings zu parsen
                if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                    try {
                        value = JSON.parse(value);
                    }
                    catch (e) {
                        // Wenn das Parsen fehlschlägt, behalte den ursprünglichen Wert bei
                    }
                }
                return {
                    respondentId: answer.respondentId,
                    value: value
                };
            });
            // Antwortverteilung berechnen (für Single-Choice und Multiple-Choice)
            if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
                const distribution = new Array(question.options.length).fill(0);
                question.responses.forEach(response => {
                    if (question.type === 'SINGLE_CHOICE') {
                        // Bei Single-Choice ist der Wert ein Index oder ein String
                        const index = typeof response.value === 'number'
                            ? response.value
                            : question.options.indexOf(response.value);
                        if (index >= 0 && index < distribution.length) {
                            distribution[index]++;
                        }
                    }
                    else if (question.type === 'MULTIPLE_CHOICE' && Array.isArray(response.value)) {
                        // Bei Multiple-Choice ist der Wert ein Array von Indizes oder Strings
                        response.value.forEach(val => {
                            const index = typeof val === 'number'
                                ? val
                                : question.options.indexOf(val);
                            if (index >= 0 && index < distribution.length) {
                                distribution[index]++;
                            }
                        });
                    }
                });
                question.answerDistribution = distribution;
            }
        }
        // Analysedaten zurückgeben
        res.json({
            id: surveyId,
            title: survey[0].title,
            questions: questions
        });
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Analyse:', error instanceof Error ? error.message : error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Abrufen der Analyse: ' + (error instanceof Error ? error.message : error)
        });
    }
}));
// Nur ein einziges module.exports am Ende der Datei
module.exports = router;
