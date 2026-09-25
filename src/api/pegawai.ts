import { apiClient } from './client';
import {
  ApiListResponse,
  ApiResponse,
  DaftarPegawaiQuery,
  Paginasi,
  Pegawai,
  PegawaiInput,
  RingkasanPegawai,
} from './types';

/**
 * ======================================================
 * SERVICE PEGAWAI (Glossary > Data Pegawai)
 * ======================================================
 */

export interface DaftarPegawaiHasil {
  data: Pegawai[];
  meta: Paginasi;
}

export const pegawaiApi = {
  async daftar(query: DaftarPegawaiQuery = {}): Promise<DaftarPegawaiHasil> {
    const { data } = await apiClient.get<ApiListResponse<Pegawai[]>>(
      '/pegawai',
      { params: query },
    );

    return { data: data.data, meta: data.meta };
  },

  async ringkasan(): Promise<RingkasanPegawai> {
    const { data } = await apiClient.get<ApiResponse<RingkasanPegawai>>(
      '/pegawai/ringkasan',
    );

    return data.data;
  },

  async detail(id: string): Promise<Pegawai> {
    const { data } = await apiClient.get<ApiResponse<Pegawai>>(
      `/pegawai/${id}`,
    );

    return data.data;
  },

  async buat(input: PegawaiInput): Promise<Pegawai> {
    const { data } = await apiClient.post<ApiResponse<Pegawai>>(
      '/pegawai',
      input,
    );

    return data.data;
  },

  async perbarui(
    id: string,
    input: Partial<PegawaiInput>,
  ): Promise<Pegawai> {
    const { data } = await apiClient.patch<ApiResponse<Pegawai>>(
      `/pegawai/${id}`,
      input,
    );

    return data.data;
  },

  async hapus(id: string): Promise<void> {
    await apiClient.delete(`/pegawai/${id}`);
  },
};
