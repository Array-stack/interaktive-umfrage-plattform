import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Survey } from '../../types';
import { surveyService } from '../../services/surveyService';

const PublicSurveysSection: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchPublicSurveys = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Öffentliche Umfragen vom Backend abrufen
      const publicSurveys = await surveyService.getSurveys();
      setSurveys(publicSurveys);
    } catch (err) {
      console.error('Fehler beim Laden der Umfragen:', err);
      setError('Die Umfragen konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicSurveys();
    
    // Polling alle 30 Sekunden, um neue Umfragen zu laden
    const intervalId = setInterval(fetchPublicSurveys, 30000);
    
    // Aufräumen beim Komponentenabbau
    return () => clearInterval(intervalId);
  }, []);

  // Sortiere Umfragen nach Erstellungsdatum (neueste zuerst)
  const sortedSurveys = [...surveys].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (isLoading) {
    return (
      <section id="public-surveys" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-8 bg-indigo-100 rounded-full w-48 mx-auto mb-6"></div>
            <div className="h-4 bg-indigo-100 rounded-full w-1/3 mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 h-80">
                <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-100 rounded-full w-full"></div>
                  <div className="h-4 bg-gray-100 rounded-full w-5/6"></div>
                  <div className="h-4 bg-gray-100 rounded-full w-2/3"></div>
                </div>
                <div className="mt-8 pt-5 border-t border-gray-100">
                  <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="public-surveys" className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Fehler beim Laden</h3>
                <div className="mt-2 text-sm text-gray-600">
                  <p>Die Umfragen konnten nicht geladen werden. Bitte versuchen Sie es später erneut.</p>
                  <p className="mt-2 text-red-600 text-sm">Fehler: {error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={fetchPublicSurveys}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Erneut versuchen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="public-surveys" className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 text-xs font-semibold tracking-wider text-indigo-700 bg-indigo-100 rounded-full mb-4">
            MITMACHEN & GESTALTEN
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
              Aktuelle Umfragen
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Nehmen Sie an spannenden Umfragen teil und gestalten Sie aktiv mit. Ihre Meinung zählt!
          </p>
        </div>
        {surveys.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedSurveys.map((survey) => (
              <div 
                key={survey.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 hover:border-indigo-100 h-full flex flex-col group"
              >
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {survey.title}
                    </h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {survey.questions?.length || 0} Fragen
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                    {survey.description || 'Keine Beschreibung verfügbar.'}
                  </p>
                  <div className="mt-auto pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Erstellt am: {new Date(survey.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <button
                    onClick={() => navigate(`/survey/${survey.id}`)}
                    className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm hover:shadow-md"
                  >
                    Jetzt teilnehmen
                    <svg className="ml-2 -mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200 px-6">
            <svg className="mx-auto h-14 w-14 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Keine Umfragen verfügbar</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">Aktuell gibt es keine öffentlichen Umfragen zur Teilnahme.</p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/create-survey')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Neue Umfrage erstellen
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-12 text-center">
          <div className="inline-flex rounded-md shadow">
            <button
              onClick={() => navigate('/teacher')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors duration-200"
            >
              <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Eigene Umfrage erstellen
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PublicSurveysSection;
