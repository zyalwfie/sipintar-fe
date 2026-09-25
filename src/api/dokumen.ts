import { apiClient } from './client';

/**
 * ======================================================
 * SERVICE 11 DOKUMEN PENGADAAN
 * ======================================================
 *
 * Setiap dokumen memakai endpoint dengan pola sama:
 *   GET    /pengadaan/:id/<slug>
 *   PUT    /pengadaan/:id/<slug>
 *   DELETE /pengadaan/:id/<slug>
 *
 * Response membawa `data` (isi tersimpan / null) dan
 * `meta.nilaiEfektif` (nilai akhir tiap field setelah
 * fallback ke data pengadaan/penyedia/pegawai) yang dipakai
 * untuk mengisi form.
 */

/** Nilai efektif berisi field dokumen + pasangan pegawai (`<field>` tanpa `Id`). */
export type NilaiEfektif = Record<string, unknown>;

export interface DokumenHasil {
  data: Record<string, unknown> | null;
  sudahDisimpan: boolean;
  nilaiEfektif: NilaiEfektif;
}

interface RawDokumenResponse {
  success: boolean;
  message: string;
  data: Record<string, unknown> | null;
  meta: { sudahDisimpan: boolean; nilaiEfektif: NilaiEfektif };
}

/**
 * Slug per indeks dokumen (0-based) sesuai urutan tabel
 * Keterangan Pelaksana. Empat dokumen terakhir (SPMK dst.)
 * belum punya endpoint di backend, jadi bernilai null.
 */
export const DOKUMEN_SLUG: (string | null)[] = [
  'surat-undangan-pengadaan',
  'berita-acara-penjelasan-pekerjaan',
  'bukti-pengambilan-dokumen-pengadaan',
  'berita-acara-pemasukan-dan-pembukaan-dokumen',
  'tanda-terima-pemasukan-dokumen',
  'berita-acara-evaluasi-dokumen',
  'undangan-klarifikasi-dan-negosiasi',
  'berita-acara-klarifikasi-dan-negosiasi-dokumen',
  'berita-acara-hasil-pengadaan-langsung',
  'penunjukan-penyedia-pengadaan',
  'spk-atau-kontrak-kerja',
  null,
  null,
  null,
  null,
];

const bentukHasil = (raw: RawDokumenResponse): DokumenHasil => ({
  data: raw.data,
  sudahDisimpan: raw.meta.sudahDisimpan,
  nilaiEfektif: raw.meta.nilaiEfektif,
});

export const dokumenApi = {
  async ambil(pengadaanId: string, slug: string): Promise<DokumenHasil> {
    const { data } = await apiClient.get<RawDokumenResponse>(
      `/pengadaan/${pengadaanId}/${slug}`,
    );

    return bentukHasil(data);
  },

  async simpan(
    pengadaanId: string,
    slug: string,
    body: Record<string, unknown>,
  ): Promise<DokumenHasil> {
    const { data } = await apiClient.put<RawDokumenResponse>(
      `/pengadaan/${pengadaanId}/${slug}`,
      body,
    );

    return bentukHasil(data);
  },

  async hapus(pengadaanId: string, slug: string): Promise<void> {
    await apiClient.delete(`/pengadaan/${pengadaanId}/${slug}`);
  },
};
