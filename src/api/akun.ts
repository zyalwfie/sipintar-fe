import { apiClient } from './client';
import { ApiResponse } from './types';
import type { AuthData, Pengguna } from '../utils/auth';

/**
 * ======================================================
 * SERVICE PENGATURAN AKUN (pengguna yang sedang login)
 * ======================================================
 */

export interface PerbaruiProfilInput {
  nama: string;
  email: string;
}

export interface GantiKataSandiInput {
  kataSandiLama: string;
  kataSandiBaru: string;
}

export const akunApi = {
  async saya(): Promise<Pengguna> {
    const { data } = await apiClient.get<ApiResponse<Pengguna>>(
      '/autentikasi/saya',
    );

    return data.data;
  },

  /** Mengembalikan token baru karena email tersimpan di token. */
  async perbaruiProfil(input: PerbaruiProfilInput): Promise<AuthData> {
    const { data } = await apiClient.patch<ApiResponse<AuthData>>(
      '/autentikasi/saya',
      input,
    );

    return data.data;
  },

  async gantiKataSandi(input: GantiKataSandiInput): Promise<void> {
    await apiClient.put('/autentikasi/saya/kata-sandi', input);
  },
};
