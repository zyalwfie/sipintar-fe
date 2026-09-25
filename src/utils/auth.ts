import { VITE_API_BASE_URL } from "../config/env";

const AUTH_KEY = 'sipintar-auth';

export type Role = 'ADMINISTRATOR' | 'VERIFIKATOR' | 'PEMOHON';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthData {
  token: string;
  user: User;
}

export interface LoginResult {
  success: boolean;
  message?: string;
}

export async function login(
  email: string,
  password: string,
  rememberMe: boolean,
): Promise<LoginResult> {
  let response: Response;

  try {
    response = await fetch(`${VITE_API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return {
      success: false,
      message: 'Tidak dapat terhubung ke server. Coba lagi.',
    };
  }

  const body = await response.json();

  if (!response.ok || !body.success) {
    return {
      success: false,
      message: body.message || 'Email atau password tidak sesuai.',
    };
  }

  const authData: AuthData = body.data;
  const serialized = JSON.stringify(authData);

  if (rememberMe) {
    localStorage.setItem(AUTH_KEY, serialized);
    sessionStorage.removeItem(AUTH_KEY);
  } else {
    sessionStorage.setItem(AUTH_KEY, serialized);
    localStorage.removeItem(AUTH_KEY);
  }

  return { success: true };
}

export function getAuthData(): AuthData | null {
  const raw = sessionStorage.getItem(AUTH_KEY) ?? localStorage.getItem(AUTH_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthData;
  } catch {
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function getToken(): string | null {
  return getAuthData()?.token ?? null;
}

export function isAuthenticated(): boolean {
  return getAuthData() !== null;
}

export function clearAuth(): void {
  sessionStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_KEY);
}