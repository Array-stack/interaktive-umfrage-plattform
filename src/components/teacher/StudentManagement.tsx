import React, { useState, useEffect } from 'react';
import { surveyService } from '../../services/surveyService';
import Button from '../ui/Button';
import Loader from '../ui/Loader';
import { useTranslation } from 'react-i18next';

interface Student {
  id: string;
  student_id: string;
  name: string;
  email: string;
  added_at: string;
  survey_id?: string;
  survey_title?: string;
}

const StudentManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surveyId, setSurveyId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addResult, setAddResult] = useState<{message: string, success: boolean} | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/teacher/students', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP-Fehler ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStudents(data.data || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Schüler');
      console.error('Fehler beim Laden der Schüler:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyId.trim()) return;

    try {
      setIsAdding(true);
      setAddResult(null);
      setError(null);
      
      const response = await surveyService.addStudentsBySurvey(surveyId);
      
      setAddResult({
        message: response.message || `${response.data?.length || 0} Schüler hinzugefügt`,
        success: true
      });
      
      // Aktualisiere die Schülerliste
      fetchStudents();
      
      // Formular zurücksetzen
      setSurveyId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen der Schüler');
      setAddResult({
        message: err instanceof Error ? err.message : 'Fehler beim Hinzufügen der Schüler',
        success: false
      });
      console.error('Fehler beim Hinzufügen der Schüler:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm(t('student_management_remove_confirm'))) return;
    
    try {
      await surveyService.removeStudent(studentId);
      setStudents(students.filter(s => s.student_id !== studentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Entfernen des Schülers');
      console.error('Fehler beim Entfernen des Schülers:', err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t('student_management_title')}</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">{t('student_management_add_title')}</h2>
        <p className="mb-4 text-gray-600">
          {t('student_management_add_description')}
        </p>
        
        <form onSubmit={handleAddStudents} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              value={surveyId}
              onChange={(e) => setSurveyId(e.target.value)}
              placeholder={t('student_management_survey_id')}
              className="w-full p-2 border rounded"
              disabled={isAdding}
            />
          </div>
          <Button 
            type="submit" 
            disabled={isAdding || !surveyId.trim()}
            isLoading={isAdding}
          >
            {t('student_management_add_button')}
          </Button>
        </form>
        
        {addResult && (
          <div className={`mt-4 p-3 rounded ${addResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {addResult.message}
          </div>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {loading ? (
        <Loader text={t('student_management_loading')} />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('student_management_name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('student_management_email')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('student_management_added_via')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('student_management_date')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('student_management_actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {t('student_management_no_students')}
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.survey_title ? (
                        <span className="text-blue-600">{student.survey_title}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(student.added_at).toLocaleDateString(i18n.language === 'de' ? 'de-DE' : i18n.language === 'ar' ? 'ar-SA' : i18n.language === 'fr' ? 'fr-FR' : 'en-US')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleRemoveStudent(student.student_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        {t('student_management_remove')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;