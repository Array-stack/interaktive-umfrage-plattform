/**
 * Gesundheitscheck-Endpunkt für Railway
 * Dieser Endpunkt wird von Railway verwendet, um den Status des Servers zu überwachen
 */

const express = require('express');
const router = express.Router();

/**
 * @route GET /api/health
 * @desc Gesundheitscheck-Endpunkt für Railway
 * @access Public
 */
router.get('/', (req, res) => {
  // Einfacher Gesundheitscheck
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

module.exports = router;