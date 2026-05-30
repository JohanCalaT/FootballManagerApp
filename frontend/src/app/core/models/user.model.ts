export type UserRole = 'guest' | 'user' | 'admin';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}
