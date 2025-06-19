const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireTeacherRole } = require('../authUtils');
const { asyncHandler } = require('../middleware/errorHandler');
// Hilfsfunktion zur ID-Generierung
const generateId = () => Math.random().toString(36).substr(2, 9);
/**
 * @route   GET /api/teacher/students
 * @desc    Alle Schüler eines Lehrers abrufen
 * @access  Privat (nur Lehrer)
 */
router.get('/students', authenticateToken, requireTeacherRole, asyncHandler(async (req, res) => {
    // TypeScript-Fehler vermeiden: req.user wird durch requireTeacherRole garantiert
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Nicht authentifiziert'
        });
    }
    const teacherId = req.user.userId;
    const students = await new Promise((resolve, reject) => {
        db.all(`SELECT ts.id, ts.added_at, ts.survey_id, 
              u.id as student_id, u.name, u.email, 
              s.title as survey_title
       FROM teacher_students ts
       JOIN users u ON ts.student_id = u.id
       LEFT JOIN surveys s ON ts.survey_id = s.id
       WHERE ts.teacher_id = ?
       ORDER BY u.name ASC`, [teacherId], (err, rows) => {
            if (err)
                return reject(err);
            resolve(rows || []);
        });
    });
    res.json({
        success: true,
        data: students
    });
}));
/**
 * @route   POST /api/teacher/students/add-by-survey
 * @desc    Schüler hinzufügen, die an einer bestimmten Umfrage teilgenommen haben
 * @access  Privat (nur Lehrer)
 */
router.post('/students/add-by-survey', authenticateToken, requireTeacherRole, asyncHandler(async (req, res) => {
    // TypeScript-Fehler vermeiden: req.user wird durch requireTeacherRole garantiert
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Nicht authentifiziert'
        });
    }
    const teacherId = req.user.userId;
    const { surveyId } = req.body;
    if (!surveyId) {
        return res.status(400).json({
            success: false,
            error: 'Umfrage-ID ist erforderlich'
        });
    }
    // Überprüfen, ob die Umfrage dem Lehrer gehört
    const survey = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM surveys WHERE id = ? AND ownerId = ?', [surveyId, teacherId], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!survey) {
        return res.status(404).json({
            success: false,
            error: 'Umfrage nicht gefunden oder Sie sind nicht der Besitzer'
        });
    }
    // Alle Teilnehmer der Umfrage finden
    const participants = await new Promise((resolve, reject) => {
        db.all(`SELECT DISTINCT r.respondentId, u.id, u.name, u.email, u.role
       FROM responses r
       JOIN users u ON r.respondentId = u.id
       WHERE r.survey_id = ? AND u.role = 'student'`, [surveyId], (err, rows) => err ? reject(err) : resolve(rows || []));
    });
    if (participants.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Keine Schüler haben an dieser Umfrage teilgenommen'
        });
    }
    // Bestehende Schüler-Lehrer-Beziehungen abrufen
    const existingRelations = await new Promise((resolve, reject) => {
        db.all('SELECT student_id FROM teacher_students WHERE teacher_id = ?', [teacherId], (err, rows) => err ? reject(err) : resolve(rows.map(r => r.student_id) || []));
    });
    // Neue Beziehungen hinzufügen
    const addedStudents = [];
    const now = new Date().toISOString();
    await db.run('BEGIN TRANSACTION');
    try {
        for (const student of participants) {
            // Überspringen, wenn der Schüler bereits zugeordnet ist
            if (existingRelations.includes(student.id))
                continue;
            const relationId = generateId();
            await new Promise((resolve, reject) => {
                db.run('INSERT INTO teacher_students (id, teacher_id, student_id, added_at, survey_id) VALUES (?, ?, ?, ?, ?)', [relationId, teacherId, student.id, now, surveyId], function (err) {
                    if (err)
                        return reject(err);
                    addedStudents.push({
                        id: relationId,
                        student_id: student.id,
                        name: student.name,
                        email: student.email,
                        added_at: now,
                        survey_id: surveyId
                    });
                    resolve(undefined);
                });
            });
        }
        await db.run('COMMIT');
        res.json({
            success: true,
            message: `${addedStudents.length} Schüler wurden hinzugefügt`,
            data: addedStudents
        });
    }
    catch (error) {
        await db.run('ROLLBACK');
        throw error;
    }
}));
/**
 * @route   DELETE /api/teacher/students/:studentId
 * @desc    Schüler von der Liste des Lehrers entfernen
 * @access  Privat (nur Lehrer)
 */
router.delete('/students/:studentId', authenticateToken, requireTeacherRole, asyncHandler(async (req, res) => {
    // TypeScript-Fehler vermeiden: req.user wird durch requireTeacherRole garantiert
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Nicht authentifiziert'
        });
    }
    const teacherId = req.user.userId;
    const { studentId } = req.params;
    const result = await new Promise((resolve, reject) => {
        db.run('DELETE FROM teacher_students WHERE teacher_id = ? AND student_id = ?', [teacherId, studentId], function (err) {
            if (err)
                return reject(err);
            resolve({ changes: this.changes });
        });
    });
    if (result.changes === 0) {
        return res.status(404).json({
            success: false,
            error: 'Schüler nicht gefunden oder nicht mit diesem Lehrer verknüpft'
        });
    }
    res.json({
        success: true,
        message: 'Schüler erfolgreich entfernt'
    });
}));
/**
 * @route   GET /api/teacher/surveys
 * @desc    Alle Umfragen eines Lehrers abrufen
 * @access  Privat (nur Lehrer)
 */
router.get('/surveys', authenticateToken, requireTeacherRole, asyncHandler(async (req, res) => {
    // TypeScript-Fehler vermeiden: req.user wird durch requireTeacherRole garantiert
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Nicht authentifiziert'
        });
    }
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
module.exports = router;
