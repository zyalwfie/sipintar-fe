/**
 * ======================================================
 * TIPE RESPONSE & ENTITAS BACKEND SIPINTAR
 * ======================================================
 *
 * Cocok dengan bentuk response Express:
 *   sukses -> { success, message, data, meta? }
 *   gagal  -> { success: false, message, errors? }
 */

export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface Paginasi {
  halaman: number;
  batas: number;
  total: number;
  totalHalaman: number;
  adaHalamanBerikutnya?: boolean;
  adaHalamanSebelumnya?: boolean;
}

export interface ApiListResponse<T> extends ApiResponse<T> {
  meta: Paginasi;
}

/**
 * ------------------------------------------------------
 * PEGAWAI
 * ------------------------------------------------------
 */

export type JenisKelamin = 'L' | 'P';

export interface Pegawai {
  id: string;
  kodePegawai: string;
  kodeUnit: string;
  unitKerja: string;
  nama: string;
  jabatan: string;
  nrp: string;
  jenisKelamin: JenisKelamin;
  dibuatPada?: string;
  diperbaruiPada?: string;
}

export type PegawaiInput = Omit<
  Pegawai,
  'id' | 'dibuatPada' | 'diperbaruiPada'
>;

export interface RingkasanPegawai {
  totalPegawai: number;
  lakiLaki: number;
  perempuan: number;
  unitTerdata: number;
}

export interface DaftarPegawaiQuery {
  cari?: string;
  jenisKelamin?: JenisKelamin;
  kodeUnit?: string;
  halaman?: number;
  batas?: number;
}

/**
 * ------------------------------------------------------
 * PENGADAAN
 * ------------------------------------------------------
 */

/** Kode enum JenisDokumen di backend (15 jenis). */
export type JenisDokumen =
  | 'SURAT_UNDANGAN'
  | 'BERITA_ACARA_PENJELASAN'
  | 'BUKTI_PENGAMBILAN'
  | 'BERITA_ACARA_PEMASUKAN'
  | 'TANDA_TERIMA_PEMASUKAN'
  | 'BERITA_ACARA_EVALUASI'
  | 'UNDANGAN_KLARIFIKASI'
  | 'BERITA_ACARA_KLARIFIKASI'
  | 'BERITA_ACARA_HASIL'
  | 'PENUNJUKAN_PENYEDIA'
  | 'SPK'
  | 'SPMK'
  | 'BERITA_ACARA_PEMERIKSAAN'
  | 'BERITA_ACARA_SERAH_TERIMA'
  | 'PENGAJUAN_PEMBAYARAN';

/** Nilai rupiah dikirim/diterima sebagai string digit. */
export type Rupiah = string | null;

export interface DokumenPengadaan {
  id: string;
  pengadaanId: string;
  jenis: JenisDokumen;
  tanggalPelaksanaan: string | null;
  nomorDokumen: string | null;
  urlBerkas: string | null;
  namaBerkas: string | null;
  tipeMime: string | null;
  ukuranBerkas: number | null;
  dibuatPada?: string;
  diperbaruiPada?: string;
}

/** Baris pengadaan dari daftar (tanpa relasi). */
export interface Pengadaan {
  id: string;
  penyediaNama: string;
  penyediaAlamat: string | null;
  penyediaDirektur: string | null;
  penyediaNomorIdentitas: string | null;
  penyediaTeleponFax: string | null;
  penyediaEmail: string | null;
  penyediaJabatan: string | null;
  penyediaNpwp: string | null;
  hargaPenawaranSudahPajak: Rupiah;
  sertakanKak: boolean;
  judul: string;
  nilaiHps: Rupiah;
  hargaDitawarkanVendor: Rupiah;
  hasilNegosiasi: Rupiah;
  tempatPenandatanganan: string | null;
  peserta: string | null;
  dibuatPada: string;
  diperbaruiPada: string;
}

/** Pegawai pada penugasan pengadaan (dengan urutan di form). */
export interface PegawaiPenugasan extends Pegawai {
  urutan: number;
}

/** Detail pengadaan (hasil GET /pengadaan/:id). */
export interface PengadaanDetail extends Pengadaan {
  dokumen: DokumenPengadaan[];
  ppk: PegawaiPenugasan[];
  pbj: PegawaiPenugasan[];
  penandaTangan: PegawaiPenugasan[];
}

/** Data penyedia untuk body create/update pengadaan. */
export interface PenyediaInput {
  nama: string;
  alamat?: string | null;
  namaDirektur?: string | null;
  nomorIdentitas?: string | null;
  teleponFax?: string | null;
  email?: string | null;
  jabatan?: string | null;
  npwp?: string | null;
}

/** Satu baris tabel Keterangan Pelaksana untuk body pengadaan. */
export interface DokumenPengadaanInput {
  jenis: JenisDokumen;
  tanggalPelaksanaan?: string | null;
  nomorDokumen?: string | null;
}

export interface BuatPengadaanInput {
  penyedia: PenyediaInput;
  hargaPenawaranSudahPajak?: Rupiah;
  sertakanKak?: boolean;
  dokumen?: DokumenPengadaanInput[];
  judul: string;
  nilaiHps?: Rupiah;
  hargaDitawarkanVendor?: Rupiah;
  hasilNegosiasi?: Rupiah;
  tempatPenandatanganan?: string | null;
  peserta?: string | null;
  ppkIds?: string[];
  pbjIds?: string[];
  penandaTanganIds?: string[];
}

export type PerbaruiPengadaanInput = Partial<BuatPengadaanInput>;

export interface DaftarPengadaanQuery {
  cari?: string;
  halaman?: number;
  batas?: number;
  urutkan?: 'dibuatPada' | 'diperbaruiPada' | 'judul';
  arah?: 'asc' | 'desc';
}
