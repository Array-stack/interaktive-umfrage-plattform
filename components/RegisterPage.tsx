import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [errorMessage, setErrorMessage] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMessage('Bitte füllen Sie alle Felder aus.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Die Passwörter stimmen nicht überein.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    try {
      const result = await register(name, email, password, role);
      // Erfolgreiche Registrierung mit Hinweis auf E-Mail-Bestätigung
      navigate('/');
      // Optional: Zeige einen Erfolgshinweis an
      alert('Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse, um alle Funktionen nutzen zu können.');
      
      // Wenn im Entwicklungsmodus, zeige den Link zur E-Mail-Vorschau an
      if (result?.emailPreviewUrl) {
        console.log('E-Mail-Vorschau:', result.emailPreviewUrl);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Fehler bei der Registrierung');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Konto erstellen</h1>
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
            E-Mail
          </label>
          <input
            type="email"
            id="email"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
            Passwort
          </label>
          <input
            type="password"
            id="password"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-bold mb-2">
            Passwort bestätigen
          </label>
          <input
            type="password"
            id="confirmPassword"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Rolle
          </label>
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="role"
                value="student"
                checked={role === 'student'}
                onChange={() => setRole('student')}
              />
              <span className="ml-2">Schüler/Student</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name="role"
                value="teacher"
                checked={role === 'teacher'}
                onChange={() => setRole('teacher')}
              />
              <span className="ml-2">Lehrer</span>
            </label>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? 'Registrierung...' : 'Registrieren'}
          </button>
          <Link to="/login" className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
            Bereits registriert? Anmelden
          </Link>
        </div>
      </form>
    </div>
  );
};

export default RegisterPage;
