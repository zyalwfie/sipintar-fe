import { apiClient } from './client';
import {
  ApiListResponse,
  ApiResponse,
  BuatPengadaanInput,
  DaftarPengadaanQuery,
  NomorDokumenBerikutnya,
  Paginasi,
  Pengadaan,
  PengadaanDetail,
  PerbaruiPengadaanInput,
} from './types';

/**
 * ======================================================
 * SERVICE PENGADAAN
 * ======================================================
 */

export interface DaftarPengadaanHasil {
  data: Pengadaan[];
  meta: Paginasi;
}

export const pengadaanApi = {
  async daftar(
    query: DaftarPengadaanQuery = {},
  ): Promise<DaftarPengadaanHasil> {
    const { data } = await apiClient.get<ApiListResponse<Pengadaan[]>>(
      '/pengadaan',
      { params: query },
    );

    return { data: data.data, meta: data.meta };
  },

  /**
   * Usulan nomor dokumen berikutnya (urut berlanjut lintas
   * pengadaan, kembali ke 001 tiap tahun baru).
   */
  async nomorDokumenBerikutnya(query: {
    jumlah: number;
    tanggal?: string;
    kecualiPengadaanId?: string;
  }): Promise<NomorDokumenBerikutnya> {
    const { data } = await apiClient.get<ApiResponse<NomorDokumenBerikutnya>>(
      '/pengadaan/nomor-dokumen-berikutnya',
      { params: query },
    );

    return data.data;
  },

  async detail(id: string): Promise<PengadaanDetail> {
    const { data } = await apiClient.get<ApiResponse<PengadaanDetail>>(
      `/pengadaan/${id}`,
    );

    return data.data;
  },

  async buat(input: BuatPengadaanInput): Promise<PengadaanDetail> {
    const { data } = await apiClient.post<ApiResponse<PengadaanDetail>>(
      '/pengadaan',
      input,
    );

    return data.data;
  },

  async perbarui(
    id: string,
    input: PerbaruiPengadaanInput,
  ): Promise<PengadaanDetail> {
    const { data } = await apiClient.patch<ApiResponse<PengadaanDetail>>(
      `/pengadaan/${id}`,
      input,
    );

    return data.data;
  },

  async hapus(id: string): Promise<void> {
    await apiClient.delete(`/pengadaan/${id}`);
  },
};
