import axios, { AxiosError } from 'axios';
import { API_URL } from '../config/env';
import { getToken } from '../utils/auth';

/**
 * ======================================================
 * AXIOS CLIENT SIPINTAR
 * ======================================================
 *
 * Instance axios tunggal yang dipakai seluruh service. Base
 * URL diambil dari VITE_API_BASE_URL (lihat .env) dan selalu
 * diakhiri /api.
 */

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Sisipkan token hasil login (disimpan oleh utils/auth).
 * Endpoint pegawai & pengadaan saat ini belum butuh token,
 * tetapi endpoint autentikasi seperti /autentikasi/saya butuh.
 */
apiClient.interceptors.request.use((config) => {
  const token = getToken();

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
