export type UserRole = 'admin' | 'mentor' | 'student';

export interface IUserSession {
  id: string;
  name: string;
  role: UserRole;
  identifier: string;
  subtitle?: string;
  email?: string;
}

export interface IAuthCredentials {
  identifier: string;
  password: string;
  role: UserRole;
}

export interface IRegisterPayload {
  name: string;
  identifier: string;
  email: string;
  password: string;
  role: 'student' | 'mentor';
}