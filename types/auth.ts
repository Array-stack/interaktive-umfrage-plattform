// Authentifizierungstypen

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  created_at?: string;
  last_login?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
  emailPreviewUrl?: string; // Für Entwicklungszwecke (Ethereal-E-Mail-Vorschau)
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  role: 'teacher' | 'student';
}
