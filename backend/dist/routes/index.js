const express = require('express');
const router = express.Router();
// Importiere alle Routen
const authRoutes = require('./auth.routes');
const surveyRoutes = require('./survey.routes');
const surveyResponseRoutes = require('./survey.responses.routes');
const studentRoutes = require('./student.routes');
const teacherRoutes = require('./teacher.routes'); // Neue Zeile
const healthRoutes = require('./health'); // Gesundheitscheck-Endpunkt
// API-Versionspräfix
const API_PREFIX = '/api';
// Verbinde Routen mit dem Hauptrouter
router.use('/auth', authRoutes);
// Behalte den ursprünglichen Pfad bei
router.use('/surveys', surveyRoutes);
// Ändere den Pfad für die Antworten-Routen zu einem spezifischeren Pfad
router.use('/survey-responses', surveyResponseRoutes);
router.use('/student', studentRoutes);
router.use('/teacher', teacherRoutes); // Neue Zeile
router.use('/health', healthRoutes); // Gesundheitscheck-Endpunkt
// Health Check Endpunkt wird jetzt über die health.js-Datei bereitgestellt
// 404 Handler für API-Routes
router.use('*', (req, res, next) => {
    res.status(404).json({
        error: {
            message: 'API-Endpunkt nicht gefunden',
            code: 'ENDPOINT_NOT_FOUND',
            path: req.originalUrl
        }
    });
});
module.exports = router;
