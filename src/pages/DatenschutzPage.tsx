import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const DatenschutzPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-primary-dark mb-6">Datenschutzerklärung</h1>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">1. Verantwortliche Stelle</h2>
        <p className="mb-2">
          OpinionBase<br />
          Musterstraße 123<br />
          12345 Musterstadt<br />
          Deutschland
        </p>
        <p>
          E-Mail: datenschutz@opinionbase.de<br />
          Telefon: +49 123 456789
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
        <p className="mb-3">
          Bei der Nutzung unserer Plattform erheben wir folgende personenbezogene Daten:
        </p>
        <ul className="list-disc pl-6 mb-3">
          <li>Name und E-Mail-Adresse bei der Registrierung</li>
          <li>Informationen zu Ihrem Nutzerkonto (Rolle als Lehrer oder Student)</li>
          <li>Von Ihnen erstellte oder beantwortete Umfragen</li>
          <li>Technische Informationen wie IP-Adresse und Browserinformationen</li>
        </ul>
        <p>
          Die Erhebung dieser Daten erfolgt zur Bereitstellung unserer Dienste, zur Verbesserung der Nutzererfahrung und zur Erfüllung gesetzlicher Verpflichtungen.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">3. Zweck der Datenverarbeitung</h2>
        <p className="mb-3">Wir verarbeiten Ihre personenbezogenen Daten für folgende Zwecke:</p>
        <ul className="list-disc pl-6">
          <li>Bereitstellung und Verwaltung Ihres Benutzerkontos</li>
          <li>Ermöglichung der Erstellung und Teilnahme an Umfragen</li>
          <li>Kommunikation mit Ihnen bezüglich unserer Dienste</li>
          <li>Verbesserung unserer Plattform und Dienste</li>
          <li>Erfüllung gesetzlicher Verpflichtungen</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">4. Rechtsgrundlage der Verarbeitung</h2>
        <p>
          Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf Grundlage der Europäischen Datenschutz-Grundverordnung (DSGVO). Je nach Art der Verarbeitung stützen wir uns auf folgende Rechtsgrundlagen:
        </p>
        <ul className="list-disc pl-6">
          <li>Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</li>
          <li>Die Erfüllung eines Vertrags mit Ihnen (Art. 6 Abs. 1 lit. b DSGVO)</li>
          <li>Die Erfüllung rechtlicher Verpflichtungen (Art. 6 Abs. 1 lit. c DSGVO)</li>
          <li>Die Wahrung unserer berechtigten Interessen (Art. 6 Abs. 1 lit. f DSGVO)</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">5. Speicherdauer</h2>
        <p>
          Wir speichern Ihre personenbezogenen Daten nur so lange, wie es für die Erfüllung der Zwecke, für die sie erhoben wurden, erforderlich ist oder solange gesetzliche Aufbewahrungsfristen bestehen. Nach Ablauf dieser Fristen werden Ihre Daten gelöscht oder anonymisiert.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">6. Ihre Rechte</h2>
        <p className="mb-3">Als betroffene Person haben Sie folgende Rechte:</p>
        <ul className="list-disc pl-6">
          <li>Recht auf Auskunft über die von uns verarbeiteten personenbezogenen Daten</li>
          <li>Recht auf Berichtigung unrichtiger Daten</li>
          <li>Recht auf Löschung Ihrer Daten</li>
          <li>Recht auf Einschränkung der Verarbeitung</li>
          <li>Recht auf Datenübertragbarkeit</li>
          <li>Widerspruchsrecht gegen die Verarbeitung</li>
          <li>Recht auf Widerruf erteilter Einwilligungen</li>
          <li>Beschwerderecht bei einer Aufsichtsbehörde</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">7. Datensicherheit</h2>
        <p>
          Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre personenbezogenen Daten gegen zufällige oder vorsätzliche Manipulationen, Verlust, Zerstörung oder gegen den Zugriff unberechtigter Personen zu schützen. Unsere Sicherheitsmaßnahmen werden entsprechend der technologischen Entwicklung fortlaufend verbessert.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">8. Änderungen dieser Datenschutzerklärung</h2>
        <p>
          Wir behalten uns das Recht vor, diese Datenschutzerklärung jederzeit zu ändern. Die aktuelle Version der Datenschutzerklärung ist stets auf unserer Website verfügbar.
        </p>
      </section>

      <div className="mt-8 pt-4 border-t border-gray-200">
        <Link to="/" className="text-primary hover:text-primary-dark transition-colors">
          &larr; Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
};

export default DatenschutzPage;