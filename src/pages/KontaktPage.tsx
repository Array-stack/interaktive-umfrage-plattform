import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const KontaktPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    betreff: '',
    nachricht: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Einfache Validierung
    if (!formData.name || !formData.email || !formData.nachricht) {
      setError('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
      return;
    }

    // Hier würde normalerweise der API-Aufruf zum Senden der Nachricht erfolgen
    // Für dieses Beispiel simulieren wir einen erfolgreichen Versand
    setSubmitted(true);
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-primary-dark mb-6">Kontakt</h1>
      
      {!submitted ? (
        <>
          <section className="mb-8">
            <p className="mb-4">
              Haben Sie Fragen, Anregungen oder Feedback? Wir freuen uns, von Ihnen zu hören! 
              Füllen Sie einfach das Kontaktformular aus, und wir werden uns so schnell wie möglich bei Ihnen melden.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold text-primary-dark mb-3">Kontaktdaten</h2>
                <p className="mb-2">
                  OpinionBase GmbH<br />
                  Musterstraße 123<br />
                  12345 Musterstadt<br />
                  Deutschland
                </p>
                <p className="mb-4">
                  <strong>Telefon:</strong> +49 123 456789<br />
                  <strong>E-Mail:</strong> info@opinionbase.de
                </p>
                <p>
                  <strong>Geschäftszeiten:</strong><br />
                  Montag - Freitag: 9:00 - 17:00 Uhr
                </p>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-primary-dark mb-3">Support</h2>
                <p className="mb-2">
                  Bei technischen Fragen oder Problemen mit unserer Plattform wenden Sie sich bitte an unseren Support:
                </p>
                <p className="mb-4">
                  <strong>E-Mail:</strong> support@opinionbase.de<br />
                  <strong>Telefon:</strong> +49 123 456789
                </p>
                <p>
                  <strong>Support-Zeiten:</strong><br />
                  Montag - Freitag: 8:00 - 18:00 Uhr
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-primary-dark mb-4">Kontaktformular</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="betreff" className="block text-sm font-medium text-gray-700 mb-1">Betreff</label>
                <select
                  id="betreff"
                  name="betreff"
                  value={formData.betreff}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Bitte wählen</option>
                  <option value="Allgemeine Anfrage">Allgemeine Anfrage</option>
                  <option value="Technischer Support">Technischer Support</option>
                  <option value="Feedback">Feedback</option>
                  <option value="Kooperation">Kooperation</option>
                  <option value="Sonstiges">Sonstiges</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="nachricht" className="block text-sm font-medium text-gray-700 mb-1">Nachricht *</label>
                <textarea
                  id="nachricht"
                  name="nachricht"
                  value={formData.nachricht}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                ></textarea>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="datenschutz"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  required
                />
                <label htmlFor="datenschutz" className="ml-2 block text-sm text-gray-700">
                  Ich habe die <Link to="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</Link> gelesen und stimme der Verarbeitung meiner Daten zu. *
                </label>
              </div>
              
              <div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors"
                >
                  Nachricht senden
                </button>
              </div>
              
              <p className="text-sm text-gray-600">* Pflichtfelder</p>
            </form>
          </section>
        </>
      ) : (
        <section className="text-center py-8">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-6 rounded mb-6">
            <h2 className="text-xl font-semibold mb-2">Vielen Dank für Ihre Nachricht!</h2>
            <p>
              Wir haben Ihre Anfrage erhalten und werden uns so schnell wie möglich bei Ihnen melden.
              Bitte beachten Sie, dass die Bearbeitung je nach Aufkommen einige Zeit in Anspruch nehmen kann.
            </p>
          </div>
          
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({
                name: '',
                email: '',
                betreff: '',
                nachricht: ''
              });
            }}
            className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors"
          >
            Neue Nachricht senden
          </button>
        </section>
      )}

      <div className="mt-8 pt-4 border-t border-gray-200">
        <Link to="/" className="text-primary hover:text-primary-dark transition-colors">
          &larr; Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
};

export default KontaktPage;