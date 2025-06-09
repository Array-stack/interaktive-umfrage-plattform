import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from './ui/Button';

// Temporäre Platzhalter für fehlende Komponenten
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white p-4 rounded-lg shadow ${className}`}>{children}</div>
);
const Input = ({ 
  label, 
  id, 
  error,
  className = '',
  ...props 
}: { 
  label: string, 
  id: string,
  error?: string,
  className?: string
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className={`mb-4 ${className}`}>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <input
      id={id}
      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
        error ? 'border-red-500' : ''
      }`}
      {...props}
    />
    {error && (
      <p className="mt-1 text-sm text-red-600">{error}</p>
    )}
  </div>
);
// Temporäre Toast-Ersatzfunktion
const toast = {
  success: (message: string) => console.log('Success:', message),
  error: (message: string) => console.error('Error:', message)
};

interface ProfileFormData {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  // Temporär deaktivierte Funktionen
  const updateProfile = async (data: any) => {
    console.log('updateProfile would update:', data);
    return Promise.resolve();
  };
  const updatePassword = async (currentPassword: string, newPassword: string) => {
    console.log('updatePassword would update password', { currentPassword, newPassword });
    return Promise.resolve();
  };
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});

  // Initialisiere Formulardaten
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  // Formularvalidierung
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProfileFormData, string>> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }
    
    if (!formData.email) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }
    
    if (isEditing && formData.newPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Aktuelles Passwort ist erforderlich';
      }
      
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Passwort muss mindestens 6 Zeichen lang sein';
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Profildaten aktualisieren
      await updateProfile({
        name: formData.name,
        email: formData.email
      });
      
      // Passwort aktualisieren, wenn angegeben
      if (formData.newPassword) {
        await updatePassword(formData.currentPassword, formData.newPassword);
      }
      
      toast.success('Profil erfolgreich aktualisiert');
      setIsEditing(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error(errorMessage);
      console.error('Profilaktualisierung fehlgeschlagen:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Bitte melden Sie sich an, um Ihr Profil anzuzeigen.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mein Profil</h1>
        
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Name"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing || isLoading}
                  error={errors.name}
                  required
                />
              </div>
              
              <div>
                <Input
                  label="E-Mail"
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing || isLoading}
                  error={errors.email}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Passwort ändern</h3>
                <div className="space-y-4">
                  <Input
                    label="Aktuelles Passwort"
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    disabled={!isEditing || isLoading}
                    error={errors.currentPassword}
                  />
                  
                  <Input
                    label="Neues Passwort"
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    disabled={!isEditing || isLoading}
                    error={errors.newPassword}
                    placeholder="Mindestens 6 Zeichen"
                  />
                  
                  <Input
                    label="Neues Passwort bestätigen"
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={!isEditing || isLoading}
                    error={errors.confirmPassword}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      // Formular zurücksetzen
                      setFormData({
                        name: user.name || '',
                        email: user.email || '',
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                      setErrors({});
                    }}
                    disabled={isLoading}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Wird gespeichert...' : 'Änderungen speichern'}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setIsEditing(true)}
                >
                  Profil bearbeiten
                </Button>
              )}
            </div>
          </form>
        </Card>
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Konto-Einstellungen</h2>
          <Card className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Konto löschen</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Ihr Konto wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (window.confirm('Sind Sie sicher, dass Sie Ihr Konto löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
                    // Hier würde normalerweise die Löschlogik stehen
                    console.log('Konto löschen');
                  }
                }}
              >
                Konto löschen
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;