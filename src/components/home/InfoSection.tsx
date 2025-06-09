import React from 'react';
import { FaChartBar, FaUsers, FaMobileAlt, FaShieldAlt, FaChartLine, FaLightbulb } from 'react-icons/fa';

const features = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: 'Einfache Erstellung',
    description: 'Erstellen Sie in wenigen Minuten professionelle Umfragen mit unserem intuitiven Editor.'
  },
  {
    icon: <FaChartBar className="h-7 w-7" />,
    title: 'Umfassende Analysen',
    description: 'Erhalten Sie detaillierte Auswertungen und Echtzeit-Ergebnisse Ihrer Umfragen.'
  },
  {
    icon: <FaUsers className="h-7 w-7" />,
    title: 'Zielgruppen erreichen',
    description: 'Teilen Sie Ihre Umfragen über verschiedene Kanäle und erreichen Sie Ihre gewünschte Zielgruppe.'
  },
  {
    icon: <FaMobileAlt className="h-7 w-7" />,
    title: 'Mobile Optimierung',
    description: 'Ihre Umfragen sind auf allen Geräten perfekt nutzbar - ohne zusätzlichen Aufwand.'
  },
  {
    icon: <FaShieldAlt className="h-7 w-7" />,
    title: 'Datenschutz',
    description: 'Ihre Daten sind sicher mit uns. Wir halten uns streng an die DSGVO-Richtlinien.'
  },
  {
    icon: <FaChartLine className="h-7 w-7" />,
    title: 'Echtzeit-Ergebnisse',
    description: 'Verfolgen Sie die Teilnahme und Ergebnisse Ihrer Umfragen in Echtzeit.'
  },
  {
    icon: <FaLightbulb className="h-7 w-7" />,
    title: 'Intelligente Vorlagen',
    description: 'Nutzen Sie unsere professionellen Vorlagen oder erstellen Sie eigene individuelle Designs.'
  }
];

const InfoSection: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 text-sm font-semibold text-teal-700 bg-teal-100 rounded-full mb-4">
            Funktionen
          </span>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Erstellen, versenden und analysieren Sie Umfragen mit unseren benutzerfreundlichen Tools
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="group relative bg-white p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center mb-6">
                {React.cloneElement(feature.icon, { 
                  className: 'h-7 w-7 text-teal-600',
                  'aria-hidden': 'true'
                })}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
              <span 
                className="absolute top-6 right-6 text-gray-200 group-hover:text-teal-400 transition-colors duration-300"
                aria-hidden="true"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InfoSection;
