import axios, { AxiosError } from 'axios';

/**
 * ======================================================
 * AXIOS CLIENT SIPINTAR
 * ======================================================
 *
 * Instance axios tunggal yang dipakai seluruh service. Base
 * URL diambil dari VITE_API_BASE_URL (lihat .env), sudah
 * termasuk prefix /api.
 */

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

/** Kunci penyimpanan token. Dipakai lagi saat autentikasi diwire. */
export const TOKEN_KEY = 'sipintar-token';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Sisipkan token bila ada. Endpoint pegawai & pengadaan saat
 * ini belum butuh token, tetapi interceptor ini membuat modul
 * siap ketika autentikasi diwire.
 */
apiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Bentuk error dari backend:
 *   { success: false, message, errors?: [{ field, message }] }
 */
interface ApiErrorBody {
  success: false;
  message?: string;
  errors?: { field: string; message: string }[];
}

/**
 * Mengubah error axios menjadi pesan yang bisa langsung
 * ditampilkan ke pengguna. Menggabungkan pesan validasi per
 * field bila ada.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Terjadi kesalahan. Silakan coba lagi.',
): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    const body = axiosError.response?.data;

    if (body?.errors?.length) {
      return body.errors.map((item) => item.message).join(' ');
    }

    if (body?.message) {
      return body.message;
    }

    if (axiosError.code === 'ERR_NETWORK') {
      return 'Tidak dapat terhubung ke server. Pastikan backend berjalan.';
    }
  }

  return fallback;
}
