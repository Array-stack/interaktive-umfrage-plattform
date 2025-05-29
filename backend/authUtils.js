const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// JWT Secret Key - in einer Produktionsumgebung sollte dies in einer Umgebungsvariable gespeichert werden
const JWT_SECRET = 'umfrage-plattform-secret-key-2025';
const JWT_EXPIRES_IN = '24h'; // Token läuft nach 24 Stunden ab

// Passwort hashen
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Passwort vergleichen
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT Token generieren
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Token verifizieren
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware zum Schutz von Routen
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Zugriff verweigert. Kein Token bereitgestellt.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Ungültiger oder abgelaufener Token.' });
  }

  req.user = decoded;
  next();
};

// Middleware zum Überprüfen der Lehrerrolle
const requireTeacherRole = (req, res, next) => {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Zugriff verweigert. Nur für Lehrer.' });
  }
  next();
};

// E-Mail-Bestätigungstoken generieren
const generateEmailToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  generateEmailToken,
  verifyToken,
  authenticateToken,
  requireTeacherRole
};
