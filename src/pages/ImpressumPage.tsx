import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const ImpressumPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-primary-dark mb-6">Impressum</h1>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">Angaben gemäß § 5 TMG</h2>
        <p className="mb-4">
          OpinionBase GmbH<br />
          Musterstraße 123<br />
          12345 Musterstadt<br />
          Deutschland
        </p>
        
        <h3 className="text-lg font-semibold text-primary-dark mb-2">Vertreten durch</h3>
        <p>
          Max Mustermann, Geschäftsführer
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">Kontakt</h2>
        <p className="mb-2">
          Telefon: +49 123 456789<br />
          E-Mail: info@opinionbase.de
        </p>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">Handelsregister</h2>
        <p>
          Registergericht: Amtsgericht Musterstadt<br />
          Registernummer: HRB 12345
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
          DE 123456789
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          Max Mustermann<br />
          Musterstraße 123<br />
          12345 Musterstadt<br />
          Deutschland
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">Haftungsausschluss</h2>
        
        <h3 className="text-lg font-semibold text-primary-dark mb-2">Haftung für Inhalte</h3>
        <p className="mb-4">
          Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
        </p>
        
        <h3 className="text-lg font-semibold text-primary-dark mb-2">Haftung für Links</h3>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-primary-dark mb-3">Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
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

export default ImpressumPage;