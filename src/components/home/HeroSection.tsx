import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection: React.FC = () => {
  // Animationen für den Hintergrund
  React.useEffect(() => {
    // Füge die Keyframes für die Animation hinzu
    const style = document.createElement('style');
    style.textContent = `
      @keyframes blob {
        0% {
          transform: translate(0px, 0px) scale(1);
        }
        33% {
          transform: translate(30px, -50px) scale(1.1);
        }
        66% {
          transform: translate(-20px, 20px) scale(0.9);
        }
        100% {
          transform: translate(0px, 0px) scale(1);
        }
      }
      .animate-blob {
        animation: blob 7s infinite;
      }
      .animation-delay-2000 {
        animation-delay: 2s;
      }
      .animation-delay-4000 {
        animation-delay: 4s;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
  return (
    <section className="relative py-12 md:py-20 overflow-hidden bg-gradient-to-br from-white to-gray-50">
      {/* Moderner Hintergrund mit abstrakten Formen */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        
        {/* Subtiles Gittermuster */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMCA0MCA0MCA0MCA0MCAwIDAgMHoiIGZpbGw9IiMxYTdmNzEiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]"></div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 pt-6">
        <div className="text-center">
          
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 leading-tight text-gray-900">
            Professionelle <span className="text-teal-600">Umfragen</span> einfach erstellen
          </h1>
          
          <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto mb-4">
            Sammeln Sie wertvolles Feedback und treffen Sie datengestützte Entscheidungen mit unserer intuitiven Umfrageplattform.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-2 mb-6">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 shadow-sm hover:shadow-teal-500/20 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Jetzt kostenlos starten
              <svg className="ml-3 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all duration-200 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById('features');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Mehr erfahren
            </a>
          </div>
          
          <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg inline-flex items-center shadow-sm border border-gray-100 text-sm">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                  {i}+K
                </div>
              ))}
            </div>
            <p className="ml-4 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">10.000+</span> Unternehmen vertrauen uns
            </p>
          </div>
          
          <p className="mt-8 text-sm text-gray-500">
            Keine Kreditkarte erforderlich • 14 Tage kostenlos testen
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
