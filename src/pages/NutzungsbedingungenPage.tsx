import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const NutzungsbedingungenPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-primary-dark mb-6">Nutzungsbedingungen</h1>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">1. Geltungsbereich</h2>
        <p>
          Diese Nutzungsbedingungen regeln die Nutzung der OpinionBase-Plattform. Mit der Registrierung und Nutzung unserer Dienste erklären Sie sich mit diesen Bedingungen einverstanden. Wenn Sie mit diesen Bedingungen nicht einverstanden sind, dürfen Sie unsere Dienste nicht nutzen.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">2. Leistungsbeschreibung</h2>
        <p className="mb-3">
          OpinionBase ist eine Plattform zur Erstellung, Verteilung und Auswertung von Umfragen. Wir bieten folgende Funktionen:
        </p>
        <ul className="list-disc pl-6">
          <li>Erstellung von Umfragen mit verschiedenen Fragetypen</li>
          <li>Verteilung von Umfragen an Teilnehmer</li>
          <li>Sammlung und Auswertung von Umfrageergebnissen</li>
          <li>Verwaltung von Teilnehmern und Ergebnissen</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">3. Registrierung und Benutzerkonto</h2>
        <p className="mb-3">
          Für die Nutzung unserer Dienste ist eine Registrierung erforderlich. Bei der Registrierung müssen Sie wahrheitsgemäße Angaben machen und Ihre Zugangsdaten sicher aufbewahren. Sie sind für alle Aktivitäten unter Ihrem Konto verantwortlich.
        </p>
        <p>
          Wir behalten uns das Recht vor, Konten zu sperren oder zu löschen, wenn gegen diese Nutzungsbedingungen verstoßen wird oder wenn wir Sicherheitsrisiken feststellen.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">4. Pflichten der Nutzer</h2>
        <p className="mb-3">Als Nutzer unserer Plattform verpflichten Sie sich:</p>
        <ul className="list-disc pl-6">
          <li>Keine rechtswidrigen, beleidigenden, diskriminierenden oder anderweitig anstößigen Inhalte zu erstellen oder zu verbreiten</li>
          <li>Die Rechte Dritter (insbesondere Urheber-, Marken- und Persönlichkeitsrechte) zu respektieren</li>
          <li>Keine Schadsoftware oder schädliche Codes zu verbreiten</li>
          <li>Die Plattform nicht zu überlasten oder deren Funktionalität zu beeinträchtigen</li>
          <li>Keine persönlichen Daten von anderen Nutzern ohne deren Einwilligung zu sammeln oder zu verarbeiten</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">5. Urheberrechte und Lizenzen</h2>
        <p className="mb-3">
          Alle Rechte an der Plattform und ihren Inhalten, einschließlich Software, Design, Logos und Texte, liegen bei uns oder unseren Lizenzgebern. Die Nutzung dieser Inhalte ist nur im Rahmen der Plattformnutzung gestattet.
        </p>
        <p>
          Für Inhalte, die Sie auf unserer Plattform erstellen (z.B. Umfragen), behalten Sie die Urheberrechte. Sie gewähren uns jedoch eine weltweite, nicht-exklusive, kostenlose Lizenz zur Nutzung, Speicherung und Verarbeitung dieser Inhalte im Rahmen unserer Dienste.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">6. Datenschutz</h2>
        <p>
          Die Erhebung und Verarbeitung personenbezogener Daten erfolgt gemäß unserer <Link to="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</Link>, die Bestandteil dieser Nutzungsbedingungen ist.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">7. Haftungsbeschränkung</h2>
        <p className="mb-3">
          Wir bemühen uns, unsere Dienste stets verfügbar und fehlerfrei anzubieten, können dies jedoch nicht garantieren. Wir haften nicht für Schäden, die durch die Nutzung unserer Dienste entstehen, es sei denn, diese beruhen auf Vorsatz oder grober Fahrlässigkeit unsererseits.
        </p>
        <p>
          Insbesondere haften wir nicht für Schäden, die durch höhere Gewalt, technische Störungen oder Handlungen Dritter verursacht werden.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">8. Änderungen der Nutzungsbedingungen</h2>
        <p>
          Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern. Über wesentliche Änderungen werden wir Sie informieren. Die fortgesetzte Nutzung unserer Dienste nach solchen Änderungen gilt als Zustimmung zu den geänderten Bedingungen.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">9. Kündigung</h2>
        <p>
          Sie können Ihr Konto jederzeit kündigen. Wir behalten uns das Recht vor, Konten bei Verstößen gegen diese Nutzungsbedingungen oder aus anderen wichtigen Gründen zu kündigen oder zu sperren.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">10. Schlussbestimmungen</h2>
        <p className="mb-3">
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
        </p>
        <p className="mb-3">
          Sollten einzelne Bestimmungen dieser Nutzungsbedingungen unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt.
        </p>
        <p>
          Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesen Nutzungsbedingungen ist, soweit gesetzlich zulässig, unser Geschäftssitz.
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

export default NutzungsbedingungenPage;