import { API_URL } from "../config/env";

const AUTH_KEY = 'sipintar-auth';

export type Peran = 'ADMINISTRATOR' | 'VERIFIKATOR' | 'PEMOHON';

// Sama dengan respons POST /api/autentikasi/masuk.
export interface Pengguna {
  id: string;
  nama: string;
  email: string;
  peran: Peran;
  aktif: boolean;
  dibuatPada: string;
  diperbaruiPada: string;
}

export interface AuthData {
  token: string;
  pengguna: Pengguna;
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
    response = await fetch(`${API_URL}/autentikasi/masuk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, kataSandi: password }),
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

/** Nama event saat data login diperbarui (mis. setelah ubah profil). */
export const AUTH_CHANGED_EVENT = 'sipintar-auth-changed';

/**
 * Mengganti data login yang tersimpan tanpa mengubah pilihan
 * "ingat saya" (tetap di storage yang sama).
 */
export function updateAuthData(authData: AuthData): void {
  const storage =
    sessionStorage.getItem(AUTH_KEY) !== null ? sessionStorage : localStorage;

  storage.setItem(AUTH_KEY, JSON.stringify(authData));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
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