const fs = require('fs');
const path = require('path');

// 🔹 Dateien und Pfade, die überprüft werden sollen
const TARGET_FILES = [
  'routes/survey.routes.js',
  'controllers/survey.controller.js',
  'client/src/views/TakeSurvey.vue',
  'client/src/components/SurveyCard.vue',
  'client/src/api/surveys.js',
  'package.json',
  'vite.config.js'
];

// 🔹 Schlüsselwörter, nach denen im Code gesucht wird
const KEYWORDS = [
  '/recommended',
  'input type="radio"',
  'input type="checkbox"',
  'fetch',
  'useRecommendedSurveys',
  'getRecommendedSurveys'
];

// 🔹 Hauptfunktion: durchsucht jede Datei nach relevanten Stellen
function analyzeFile(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️ Datei nicht gefunden: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');

  console.log(`\n📄 Überprüfung: ${filePath}`);
  KEYWORDS.forEach(keyword => {
    if (content.includes(keyword)) {
      console.log(`✅ Gefunden: "${keyword}"`);
    } else {
      console.log(`⛔ Nicht gefunden: "${keyword}"`);
    }
  });
}

// 🔹 Alle Ziel-Dateien analysieren
function runAnalysis() {
  console.log('🔍 Starte Analyse deines Projekts...');
  TARGET_FILES.forEach(analyzeFile);
  console.log('\n✅ Analyse abgeschlossen.');
}

runAnalysis();
