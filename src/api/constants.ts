import type { JenisDokumen } from './types';

/**
 * ======================================================
 * DAFTAR JENIS DOKUMEN (Keterangan Pelaksana)
 * ======================================================
 *
 * Urut sesuai enum JenisDokumen di backend & tampilan UI.
 * `nama` adalah label tampilan untuk tabel Keterangan
 * Pelaksana dan detail pengadaan.
 */

export const DAFTAR_JENIS_DOKUMEN: { jenis: JenisDokumen; nama: string }[] = [
  { jenis: 'SURAT_UNDANGAN', nama: 'Surat Undangan Pengadaan' },
  { jenis: 'BERITA_ACARA_PENJELASAN', nama: 'Berita Acara Penjelasan Pekerjaan' },
  { jenis: 'BUKTI_PENGAMBILAN', nama: 'Bukti Pengambilan Dokumen Pengadaan' },
  {
    jenis: 'BERITA_ACARA_PEMASUKAN',
    nama: 'Berita Acara Pemasukan dan Pembukaan Dokumen',
  },
  { jenis: 'TANDA_TERIMA_PEMASUKAN', nama: 'Tanda Terima Pemasukan Dokumen' },
  { jenis: 'BERITA_ACARA_EVALUASI', nama: 'Berita Acara Evaluasi Dokumen' },
  { jenis: 'UNDANGAN_KLARIFIKASI', nama: 'Undangan Klarifikasi dan Negosiasi' },
  {
    jenis: 'BERITA_ACARA_KLARIFIKASI',
    nama: 'Berita Acara Klarifikasi dan Negosiasi Dokumen',
  },
  { jenis: 'BERITA_ACARA_HASIL', nama: 'Berita Acara Hasil Pengadaan Langsung' },
  { jenis: 'PENUNJUKAN_PENYEDIA', nama: 'Penunjukan Penyedia Pengadaan' },
  { jenis: 'SPK', nama: 'SPK atau Kontrak Kerja' },
  { jenis: 'SPMK', nama: 'SPMK' },
  { jenis: 'BERITA_ACARA_PEMERIKSAAN', nama: 'Berita Acara Pemeriksaan Pekerjaan' },
  {
    jenis: 'BERITA_ACARA_SERAH_TERIMA',
    nama: 'Berita Acara Serah Terima Pekerjaan',
  },
  { jenis: 'PENGAJUAN_PEMBAYARAN', nama: 'Pengajuan Pembayaran' },
];

export const JENIS_DOKUMEN_LABEL: Record<JenisDokumen, string> =
  DAFTAR_JENIS_DOKUMEN.reduce(
    (acc, item) => {
      acc[item.jenis] = item.nama;
      return acc;
    },
    {} as Record<JenisDokumen, string>,
  );
