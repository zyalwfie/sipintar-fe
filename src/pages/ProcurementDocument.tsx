import { createContext, useContext, useEffect, useState } from 'react';
import {
  FiArrowLeft,
  FiDownload,
  FiEye,
  FiFileText,
  FiLayout,
  FiLoader,
  FiSave,
  FiX,
} from 'react-icons/fi';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DefaultDocumentImages,
  DocumentAssetKind,
  DocumentHeaderFooterVisibility,
  DocumentTemplateAsset,
  defaultHeaderAsset,
  emptyDefaultDocumentImages,
  getDocumentHeaderFooterVisibility,
  loadDefaultDocumentImages,
  saveDocumentHeaderFooterVisibility,
} from '../utils/documentTemplate';
import {
  dokumenApi,
  DOKUMEN_SLUG,
  getApiErrorMessage,
  pegawaiApi,
  pengadaanApi,
} from '../api';
import type { NilaiEfektif } from '../api';

const dokumenPelaksana = [
  'Surat Undangan Pengadaan',
  'Berita Acara Penjelasan Pekerjaan',
  'Bukti Pengambilan Dokumen Pengadaan',
  'Berita Acara Pemasukan dan Pembukaan Dokumen',
  'Tanda Terima Pemasukan Dokumen',
  'Berita Acara Evaluasi Dokumen',
  'Undangan Klarifikasi dan Negosiasi',
  'Berita Acara Klarifikasi dan Negosiasi Dokumen',
  'Berita Acara Hasil Pengadaan Langsung',
  'Penunjukan Penyedia Pengadaan',
  'SPK atau Kontrak Kerja',
  // 4 dibawh belum ada template
  'SPMK',
  'Berita Acara Pemeriksaan Pekerjaan',
  'Berita Acara Serah Terima Pekerjaan',
  'Pengajuan Pembayaran',
];

// Data pengadaan (penyedia + pegawai yang ditugaskan) hasil adaptasi
// dari GET /pengadaan/:id untuk dipakai template dokumen.
type DokumenPegawaiView = {
  id: string;
  nama: string;
  nrp: string;
  jabatan?: string;
};

type DokumenPengadaanView = {
  namaPenyedia: string;
  namaDirektur: string;
  jabatanDirektur: string;
  alamat: string;
  email: string;
  npwp: string;
  judulPengadaan: string;
  hps: string;
  hasilNegosiasi: string;
  tempatPenandatanganan: string;
  ppk: DokumenPegawaiView[];
  pbj: DokumenPegawaiView[];
  penandaTangan: DokumenPegawaiView[];
};

const emptyPengadaanView: DokumenPengadaanView = {
  namaPenyedia: '',
  namaDirektur: '',
  jabatanDirektur: '',
  alamat: '',
  email: '',
  npwp: '',
  judulPengadaan: '',
  hps: '',
  hasilNegosiasi: '',
  tempatPenandatanganan: '',
  ppk: [],
  pbj: [],
  penandaTangan: [],
};

const PegawaiOptionsContext = createContext<DokumenPegawaiView[] | null>(null);

const muatSemuaPegawai = async (): Promise<DokumenPegawaiView[]> => {
  const semuaPegawai: DokumenPegawaiView[] = [];
  let halaman = 1;

  while (true) {
    const hasil = await pegawaiApi.daftar({ halaman, batas: 100 });

    semuaPegawai.push(
      ...hasil.data.map((pegawai) => ({
        id: pegawai.id,
        nama: pegawai.nama,
        nrp: pegawai.nrp,
        jabatan: pegawai.jabatan,
      })),
    );

    if (halaman >= hasil.meta.totalHalaman || hasil.data.length === 0) {
      break;
    }

    halaman += 1;
  }

  return semuaPegawai;
};

// ======================================================
// PEMETAAN FIELD FORM <-> FIELD API PER DOKUMEN
// ======================================================
//
// Setiap dokumen memetakan field form ke field body API.
// `tipe` menentukan transformasi saat memuat nilaiEfektif
// dan saat menyimpan. Diisi bertahap per dokumen.
type TipeField = 'text' | 'date' | 'time' | 'rupiah' | 'pegawai';
type PetaField = { form: string; api: string; tipe?: TipeField };
type PetaDokumen = { slug: string; fields: PetaField[] };

const PETA_DOKUMEN: Record<string, PetaDokumen> = {
  'Surat Undangan Pengadaan': {
    slug: 'surat-undangan-pengadaan',
    fields: [
      { form: 'lampiran', api: 'lampiran' },
      { form: 'kepadaYth', api: 'kepadaYth' },
      { form: 'di', api: 'alamatTujuan' },
      { form: 'email', api: 'email' },
      { form: 'perihal', api: 'perihal' },
      { form: 'namaPaketPekerjaan', api: 'namaPaketPekerjaan' },
      { form: 'nilaiTotalHps', api: 'nilaiTotalHps', tipe: 'rupiah' },
      { form: 'tempatSurat', api: 'tempatSurat' },
      { form: 'tanggalSurat', api: 'tanggalSurat', tipe: 'date' },
      { form: 'hariPelaksanaan', api: 'hariPelaksanaan', tipe: 'date' },
      { form: 'waktuMulai', api: 'waktuPelaksanaanMulai', tipe: 'time' },
      { form: 'waktuSelesai', api: 'waktuPelaksanaanSelesai', tipe: 'time' },
      { form: 'tempatPelaksanaan', api: 'tempatPelaksanaan' },
      { form: 'namaKegiatan', api: 'namaKegiatan' },
      { form: 'tanggalKegiatan', api: 'tanggalKegiatan', tipe: 'date' },
      { form: 'waktuKegiatanMulai', api: 'waktuKegiatanMulai', tipe: 'time' },
      { form: 'waktuKegiatanSelesai', api: 'waktuKegiatanSelesai', tipe: 'time' },
      { form: 'keteranganTujuan', api: 'keteranganTujuanDokumen' },
      { form: 'keteranganPermohonan', api: 'keteranganPermohonan' },
      { form: 'penandaTangan', api: 'penandaTanganPbjId', tipe: 'pegawai' },
    ],
  },
  'Berita Acara Penjelasan Pekerjaan': {
    slug: 'berita-acara-penjelasan-pekerjaan',
    fields: [
      { form: 'beritaTanggal', api: 'hariTanggal', tipe: 'date' },
      { form: 'beritaPukul', api: 'pukul', tipe: 'time' },
      { form: 'beritaTempat', api: 'tempat' },
      { form: 'beritaPeserta', api: 'peserta' },
      { form: 'beritaNamaPenjelasanPekerjaan', api: 'namaPenjelasanPekerjaan' },
      { form: 'beritaRapatDipimpinPpk', api: 'pimpinanRapatPpkId', tipe: 'pegawai' },
      {
        form: 'beritaPenjelasanAdministrasiPpbj',
        api: 'pemberiPenjelasanUmumId',
        tipe: 'pegawai',
      },
      {
        form: 'beritaPenjelasanTeknikPpbj',
        api: 'pemberiPenjelasanTeknikId',
        tipe: 'pegawai',
      },
      { form: 'beritaRapatTanyaJawab', api: 'pemimpinTanyaJawabId', tipe: 'pegawai' },
      { form: 'beritaKeteranganAwal', api: 'keteranganAwal' },
      { form: 'beritaKeteranganTujuan', api: 'keteranganTujuan' },
      { form: 'beritaPenandaTangan', api: 'penandaTanganPbjId', tipe: 'pegawai' },
    ],
  },
  'Bukti Pengambilan Dokumen Pengadaan': {
    slug: 'bukti-pengambilan-dokumen-pengadaan',
    fields: [
      { form: 'buktiPekerjaan', api: 'pekerjaan' },
      { form: 'buktiTanggal', api: 'hariTanggal', tipe: 'date' },
      { form: 'buktiWaktu', api: 'waktu', tipe: 'time' },
      { form: 'buktiNamaPerusahaan', api: 'namaPerusahaan' },
      { form: 'buktiNamaPejabatPerusahaan', api: 'namaPejabatPerusahaan' },
      { form: 'buktiJabatanPejabat', api: 'jabatanPejabat' },
      { form: 'buktiPenandaTangan', api: 'penandaTanganPbjId', tipe: 'pegawai' },
    ],
  },
  'Berita Acara Pemasukan dan Pembukaan Dokumen': {
    slug: 'berita-acara-pemasukan-dan-pembukaan-dokumen',
    fields: [
      { form: 'baPemasukanTanggalDokumen', api: 'tanggalBeritaAcara', tipe: 'date' },
      { form: 'baPemasukanPukul', api: 'pukul', tipe: 'time' },
      { form: 'baPemasukanNamaPekerjaan', api: 'pengadaanPekerjaan' },
      { form: 'baPemasukanPejabatPengadaan', api: 'pejabatPengadaan' },
      { form: 'baPemasukanPenyedia', api: 'penyediaBarangJasa' },
      {
        form: 'baPemasukanTanggalPemasukan',
        api: 'tanggalPemasukanDokumenPenawaran',
        tipe: 'date',
      },
      { form: 'baPemasukanMasaBerlaku', api: 'masaBerlakuPenawaran' },
      { form: 'baPemasukanNilaiPenawaran', api: 'nilaiPenawaran', tipe: 'rupiah' },
      { form: 'baPemasukanRincianHarga', api: 'rincianHarga' },
      { form: 'baPemasukanKeterangan', api: 'keterangan' },
      { form: 'baPemasukanPenandaTangan', api: 'penandaTanganPbjId', tipe: 'pegawai' },
    ],
  },
  'Tanda Terima Pemasukan Dokumen': {
    slug: 'tanda-terima-pemasukan-dokumen',
    fields: [
      { form: 'tandaTerimaPekerjaan', api: 'pekerjaan' },
      { form: 'tandaTerimaTanggal', api: 'hariTanggal', tipe: 'date' },
      { form: 'tandaTerimaWaktu', api: 'waktu', tipe: 'time' },
      { form: 'tandaTerimaNamaPerusahaan', api: 'namaPerusahaan' },
      { form: 'tandaTerimaNamaPejabat', api: 'namaPejabatPerwakilan' },
      { form: 'tandaTerimaJabatan', api: 'jabatan' },
      { form: 'tandaTerimaPenandaTangan', api: 'penandaTanganPbjId', tipe: 'pegawai' },
    ],
  },
  'Berita Acara Evaluasi Dokumen': {
    slug: 'berita-acara-evaluasi-dokumen',
    fields: [
      { form: 'baEvaluasiTanggalDokumen', api: 'tanggalEvaluasiDokumen', tipe: 'date' },
      { form: 'baEvaluasiNamaPekerjaan', api: 'namaPekerjaan' },
      { form: 'baEvaluasiNamaPenyedia', api: 'namaPenyedia' },
      { form: 'baEvaluasiNomorBaPemasukan', api: 'nomorBaPemasukanDokumen' },
      { form: 'baEvaluasiNilaiPenawaran', api: 'nilaiPenawaran', tipe: 'rupiah' },
      { form: 'baEvaluasiJadwalPelaksanaan', api: 'jadwalPelaksanaanPekerjaan' },
      { form: 'baEvaluasiKualifikasiSiup', api: 'kualifikasiSiupNib' },
      { form: 'baEvaluasiKualifikasiNpwp', api: 'kualifikasiNpwp' },
      { form: 'baEvaluasiKualifikasiKtp', api: 'kualifikasiKtp' },
      { form: 'baEvaluasiKualifikasiKswp', api: 'kualifikasiKswp' },
      { form: 'baEvaluasiPenandaTangan', api: 'penandaTanganPbjId', tipe: 'pegawai' },
    ],
  },
  'Undangan Klarifikasi dan Negosiasi': {
    slug: 'undangan-klarifikasi-dan-negosiasi',
    fields: [
      { form: 'uknLampiran', api: 'lampiran' },
      { form: 'uknTempatSurat', api: 'tempatSurat' },
      { form: 'uknTanggalSurat', api: 'tanggalSurat', tipe: 'date' },
      { form: 'uknKepadaJabatan', api: 'jabatanPenerima' },
      { form: 'uknNamaPenyedia', api: 'namaPenyedia' },
      { form: 'uknAlamat', api: 'alamat' },
      { form: 'uknPerihal', api: 'perihal' },
      { form: 'uknPekerjaan', api: 'pekerjaan' },
      { form: 'uknWaktu', api: 'waktu', tipe: 'time' },
      { form: 'uknHari', api: 'hariTanggalPelaksanaan', tipe: 'date' },
      { form: 'uknTempat', api: 'tempat' },
      { form: 'uknParagrafPembuka', api: 'paragrafPembuka' },
      { form: 'uknParagrafPenutup', api: 'paragrafPenutup' },
      { form: 'uknPenandaTangan', api: 'penandaTanganPbjId', tipe: 'pegawai' },
    ],
  },
  'Berita Acara Klarifikasi dan Negosiasi Dokumen': {
    slug: 'berita-acara-klarifikasi-dan-negosiasi-dokumen',
    fields: [
      { form: 'baknTanggal', api: 'hariTanggal', tipe: 'date' },
      { form: 'baknTempat', api: 'tempat' },
      { form: 'baknNamaPenyedia', api: 'namaPenyedia' },
      { form: 'baknPekerjaan', api: 'untukPekerjaan' },
      { form: 'baknHasil1', api: 'hasilKlarifikasiTeknis' },
      { form: 'baknHasil2', api: 'hasilNegosiasiHarga' },
      { form: 'baknHasil3', api: 'hasilPembuktianKualifikasi' },
      { form: 'baknKeteranganPenutup', api: 'keteranganPenutup' },
      { form: 'baknNamaDirektur', api: 'namaDirekturPenyedia' },
      { form: 'baknPenandaTangan', api: 'penandaTanganPbjId', tipe: 'pegawai' },
    ],
  },
  'Berita Acara Hasil Pengadaan Langsung': {
    slug: 'berita-acara-hasil-pengadaan-langsung',
    fields: [
      { form: 'bahplTanggal', api: 'hariTanggal', tipe: 'date' },
      { form: 'bahplPekerjaan', api: 'pekerjaan' },
      { form: 'bahplHps', api: 'hps', tipe: 'rupiah' },
      { form: 'bahplUnsurEvaluasi', api: 'unsurEvaluasi' },
      { form: 'bahplNamaPerusahaan', api: 'namaPerusahaan' },
      { form: 'bahplHargaPenawaran', api: 'hargaPenawaran', tipe: 'rupiah' },
      { form: 'bahplEvalAdministrasi', api: 'evaluasiAdministrasi' },
      { form: 'bahplEvalTeknis', api: 'evaluasiTeknis' },
      { form: 'bahplEvalHarga', api: 'evaluasiHarga' },
      { form: 'bahplEvalKualifikasi', api: 'evaluasiKualifikasi' },
      { form: 'bahplKet', api: 'keteranganEvaluasi' },
      { form: 'bahplNamaPenyedia', api: 'namaPenyedia' },
      { form: 'bahplNamaDirektur', api: 'namaDirekturUtama' },
      { form: 'bahplAlamat', api: 'alamatPerusahaan' },
      { form: 'bahplNpwp', api: 'npwp' },
      { form: 'bahplHargaNegosiasi', api: 'hargaHasilNegosiasi', tipe: 'rupiah' },
      { form: 'bahplKeteranganPenutup', api: 'keteranganPenutup' },
      { form: 'bahplPenandaTangan', api: 'penandaTanganPbjId', tipe: 'pegawai' },
    ],
  },
  'Penunjukan Penyedia Pengadaan': {
    slug: 'penunjukan-penyedia-pengadaan',
    fields: [
      { form: 'penunjukanTempat', api: 'tempatSurat' },
      { form: 'penunjukanTanggal', api: 'tanggalSurat', tipe: 'date' },
      { form: 'penunjukanLampiran', api: 'lampiran' },
      { form: 'penunjukanJabatanTujuan', api: 'jabatanTujuan' },
      { form: 'penunjukanKepada', api: 'kepadaYth' },
      { form: 'penunjukanDi', api: 'alamatTujuan' },
      { form: 'penunjukanPerihal', api: 'perihal' },
      { form: 'penunjukanTanggalPenawaran', api: 'tanggalSuratPenawaran', tipe: 'date' },
      { form: 'penunjukanNilaiNegosiasi', api: 'hasilNegosiasiHarga', tipe: 'rupiah' },
      { form: 'penunjukanKeteranganTindakLanjut', api: 'keteranganTindakLanjut' },
      { form: 'penunjukanPenandaTangan', api: 'penandaTanganPbjId', tipe: 'pegawai' },
    ],
  },
  'SPK atau Kontrak Kerja': {
    slug: 'spk-atau-kontrak-kerja',
    fields: [
      { form: 'spkTanggal', api: 'tanggalSpk', tipe: 'date' },
      { form: 'spkPaketPengadaan', api: 'paketPengadaan' },
      { form: 'spkNomorSuratUndangan', api: 'nomorSuratUndangan' },
      { form: 'spkTanggalSuratUndangan', api: 'tanggalSuratUndangan', tipe: 'date' },
      { form: 'spkSumberDana', api: 'sumberDana' },
      { form: 'spkNilaiKontrak', api: 'nilaiKontrak', tipe: 'rupiah' },
      { form: 'spkPerusahaanPenyedia', api: 'namaPerusahaanPenyedia' },
      { form: 'spkNamaPenyedia', api: 'namaPenyedia' },
      { form: 'spkJabatanPenyedia', api: 'jabatanPenyedia' },
      { form: 'spkPpk', api: 'penandaTanganPpkId', tipe: 'pegawai' },
    ],
  },
};

const formatTanggalIndonesia = () =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

const getNomorDokumen = (index: number) => {
  const now = new Date();
  const nomorUrut = String(index + 1).padStart(3, '0');
  const bulan = String(now.getMonth() + 1).padStart(2, '0');
  return `${nomorUrut}.${bulan}.PBJ./BPR-NTB/2026`;
};

const formatRupiahText = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  return new Intl.NumberFormat('id-ID').format(Number(digits));
};

const formatDateFromInput = (value: string) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
};

const formatDateOnlyFromInput = (value: string) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
};

const formatTimeWita = (value: string) => value.replace(':', '.');

const formatDateTwoDigitFromInput = (value: string) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
};

const terbilang = (value: number): string => {
  const satuan = [
    '',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
    'sepuluh',
    'sebelas',
  ];

  if (!value) return 'Nol rupiah';
  if (value < 12) return `${satuan[value]} rupiah`;
  if (value < 20) return `${terbilang(value - 10).replace(' rupiah', '')} belas rupiah`;
  if (value < 100) {
    const puluh = Math.floor(value / 10);
    const sisa = value % 10;
    return `${satuan[puluh]} puluh${sisa ? ` ${terbilang(sisa).replace(' rupiah', '')}` : ''} rupiah`;
  }
  if (value < 200) {
    return `seratus${value > 100 ? ` ${terbilang(value - 100).replace(' rupiah', '')}` : ''} rupiah`;
  }
  if (value < 1000) {
    const ratus = Math.floor(value / 100);
    const sisa = value % 100;
    return `${satuan[ratus]} ratus${sisa ? ` ${terbilang(sisa).replace(' rupiah', '')}` : ''} rupiah`;
  }
  if (value < 2000) {
    return `seribu${value > 1000 ? ` ${terbilang(value - 1000).replace(' rupiah', '')}` : ''} rupiah`;
  }
  if (value < 1000000) {
    const ribu = Math.floor(value / 1000);
    const sisa = value % 1000;
    return `${terbilang(ribu).replace(' rupiah', '')} ribu${sisa ? ` ${terbilang(sisa).replace(' rupiah', '')}` : ''} rupiah`;
  }
  if (value < 1000000000) {
    const juta = Math.floor(value / 1000000);
    const sisa = value % 1000000;
    return `${terbilang(juta).replace(' rupiah', '')} juta${sisa ? ` ${terbilang(sisa).replace(' rupiah', '')}` : ''} rupiah`;
  }
  if (value < 1000000000000) {
    const miliar = Math.floor(value / 1000000000);
    const sisa = value % 1000000000;
    return `${terbilang(miliar).replace(' rupiah', '')} miliar${sisa ? ` ${terbilang(sisa).replace(' rupiah', '')}` : ''} rupiah`;
  }

  const triliun = Math.floor(value / 1000000000000);
  const sisa = value % 1000000000000;
  return `${terbilang(triliun).replace(' rupiah', '')} triliun${sisa ? ` ${terbilang(sisa).replace(' rupiah', '')}` : ''} rupiah`;
};

const getTerbilangTitleCase = (value: string) =>
  terbilang(Number(value.replace(/\D/g, '')))
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const angkaTerbilang = (value: number): string => {
  const satuan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  const n = Math.floor(Math.abs(value));

  if (n < 12) return satuan[n];
  if (n < 20) return `${angkaTerbilang(n - 10)} Belas`;
  if (n < 100)
    return `${angkaTerbilang(Math.floor(n / 10))} Puluh${
      n % 10 ? ` ${angkaTerbilang(n % 10)}` : ''
    }`;
  if (n < 200) return `Seratus${n - 100 ? ` ${angkaTerbilang(n - 100)}` : ''}`;
  if (n < 1000)
    return `${angkaTerbilang(Math.floor(n / 100))} Ratus${
      n % 100 ? ` ${angkaTerbilang(n % 100)}` : ''
    }`;
  if (n < 2000) return `Seribu${n - 1000 ? ` ${angkaTerbilang(n - 1000)}` : ''}`;
  if (n < 1000000)
    return `${angkaTerbilang(Math.floor(n / 1000))} Ribu${
      n % 1000 ? ` ${angkaTerbilang(n % 1000)}` : ''
    }`;
  if (n < 1000000000)
    return `${angkaTerbilang(Math.floor(n / 1000000))} Juta${
      n % 1000000 ? ` ${angkaTerbilang(n % 1000000)}` : ''
    }`;

  return `${angkaTerbilang(Math.floor(n / 1000000000))} Miliar${
    n % 1000000000 ? ` ${angkaTerbilang(n % 1000000000)}` : ''
  }`;
};

const getDatePartsIndonesia = (value: string) => {
  if (!value) return { hari: '-', tanggal: '-', bulan: '-', tahun: '-' };

  const date = new Date(`${value}T00:00:00`);

  return {
    hari: new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date),
    tanggal: angkaTerbilang(date.getDate()),
    bulan: new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(date),
    tahun: angkaTerbilang(date.getFullYear()),
  };
};

const formatRupiahTerbilang = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  return `${angkaTerbilang(Number(digits))} Rupiah`;
};

const documentBodyInset = 28;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeHtmlWithBreaks = (value: string) =>
  escapeHtml(value).replace(/\n/g, '<br />');

const formatBeritaText = (value: string) =>
  escapeHtmlWithBreaks(
    value.replace(/berlaku\.\s+Demikian/g, 'berlaku.\n\nDemikian')
  );

const TextInput = ({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded border border-stroke bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
    />
  </div>
);

const TextArea = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
      {label}
    </label>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={4}
      className="w-full rounded border border-stroke bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
    />
  </div>
);

const RupiahInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
      {label}
    </label>
    <div className="flex overflow-hidden rounded border border-stroke bg-white focus-within:border-primary dark:border-form-strokedark dark:bg-form-input">
      <span className="flex items-center border-r border-stroke bg-gray-2 px-4 text-sm font-semibold text-black dark:border-form-strokedark dark:bg-meta-4 dark:text-white">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={formatRupiahText(value)}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        className="w-full bg-transparent px-4 py-3 text-sm text-black outline-none dark:text-white"
      />
    </div>
  </div>
);

const PbjSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; nama: string; nrp: string }[];
  onChange: (value: string) => void;
}) => {
  const semuaPegawai = useContext(PegawaiOptionsContext);
  const daftarOpsi = semuaPegawai?.length ? semuaPegawai : options;

  return (
    <div>
    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
      {label}
    </label>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded border border-stroke bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
    >
      <option value="">Pilih pegawai</option>
      {daftarOpsi.map((pegawai) => (
        <option key={pegawai.id} value={pegawai.id}>
          {pegawai.nama} - NRP : {pegawai.nrp}
        </option>
      ))}
    </select>
  </div>
  );
};

const EvalSelect = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
      {label}
    </label>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded border border-stroke bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
    >
      <option value="M">M - Memenuhi Syarat</option>
      <option value="TM">TM - Tidak Memenuhi Syarat</option>
    </select>
  </div>
);

const getHtmlJustifyContent = (position: DocumentTemplateAsset['position']) => {
  if (position === 'left') return 'flex-start';
  if (position === 'right') return 'flex-end';

  return 'center';
};

const getDocumentAssetHtml = (
  asset: DocumentTemplateAsset,
  label: string
) => {
  if (!asset.src) return '';

  const imageWidth = asset.position === 'stretch' ? 'width: 100%;' : '';

  return `
    <div style="display: flex; justify-content: ${getHtmlJustifyContent(
      asset.position
    )}; margin: ${asset.marginTop}px 0 ${asset.marginBottom}px;">
      <img
        src="${escapeHtml(asset.src)}"
        alt="${escapeHtml(label)}"
        style="display: block; max-width: 100%; height: ${
          asset.height
        }px; ${imageWidth} object-fit: contain;"
      />
    </div>
  `;
};

const a4WidthMm = 210;
const pageBottomPaddingMm = 16;
const fullPageFooterGapMm = 4;

// Footer bawaan didesain penuh selebar kertas dan menempel di tepi bawah.
const getFullPageFooterHtml = (src: string, heightMm: number) => `
  <div class="page-footer-full" style="height: ${heightMm}mm;">
    <img src="${escapeHtml(src)}" alt="Footer dokumen" />
  </div>
`;

const HeaderFooterSwitch = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="group inline-flex items-center gap-3 text-sm text-black outline-none"
  >
    <span
      className={`relative block h-5 w-9 flex-shrink-0 rounded-full transition group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 ${
        checked ? 'bg-primary' : 'bg-stroke'
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </span>
    {label}
  </button>
);

const ProcurementDocument = () => {
  const { id, documentIndex, action } = useParams();
  const selectedIndex = Math.max(Number(documentIndex ?? 1) - 1, 0);
  const documentName =
    dokumenPelaksana[selectedIndex] ?? dokumenPelaksana[0];
  const slug = DOKUMEN_SLUG[selectedIndex] ?? null;
  const [selectedPengadaan, setSelectedPengadaan] =
    useState<DokumenPengadaanView>(emptyPengadaanView);
  const [daftarPegawai, setDaftarPegawai] = useState<DokumenPegawaiView[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [muatError, setMuatError] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [sudahDisimpan, setSudahDisimpan] = useState(false);
  const pengadaanTitle = selectedPengadaan.judulPengadaan;
  const isPreview = action === 'lihat';
  const isSuratUndangan =
    !isPreview && documentName === 'Surat Undangan Pengadaan';
  const isBeritaAcaraPenjelasan =
    !isPreview && documentName === 'Berita Acara Penjelasan Pekerjaan';
  const isBuktiPengambilan =
    !isPreview && documentName === 'Bukti Pengambilan Dokumen Pengadaan';
  const isBeritaAcaraPemasukanDanPembukaanDokumen =
    !isPreview &&
    documentName === 'Berita Acara Pemasukan dan Pembukaan Dokumen';
  const isTandaTerimaPemasukanDokumen =
    !isPreview && documentName === 'Tanda Terima Pemasukan Dokumen';
  const isBeritaAcaraEvaluasiDokumen =
    !isPreview && documentName === 'Berita Acara Evaluasi Dokumen';
  const isUndanganKlarifikasi =
    !isPreview && documentName === 'Undangan Klarifikasi dan Negosiasi';
  const isBeritaKlarifikasi =
    !isPreview &&
    documentName === 'Berita Acara Klarifikasi dan Negosiasi Dokumen';
  const isHasilPengadaan =
    !isPreview && documentName === 'Berita Acara Hasil Pengadaan Langsung';
  const isPenunjukanPenyedia =
    !isPreview && documentName === 'Penunjukan Penyedia Pengadaan';
  const isSpk = !isPreview && documentName === 'SPK atau Kontrak Kerja';
  const [nomorDokumen, setNomorDokumen] = useState(
    getNomorDokumen(selectedIndex)
  );
  const [form, setForm] = useState({
    // ========================================================
    // DOKUMEN 001: SURAT UNDANGAN PENGADAAN (InvitationLetter)
    // ========================================================
    lampiran: '1 (satu) berkas',
    kepadaYth: selectedPengadaan.namaPenyedia, // [Provider.name]
    di: selectedPengadaan.alamat, // [Provider.address]
    email: selectedPengadaan.email, // [Provider.email]
    perihal: documentName,
    namaPaketPekerjaan: selectedPengadaan.judulPengadaan, // [Procurement.title]
    nilaiTotalHps: selectedPengadaan.hps, // [Procurement.estimatedPriceIncludingTax]
    tempatSurat: selectedPengadaan.tempatPenandatanganan, // [Procurement.signingPlace]
    tanggalSurat: '2026-07-29',
    hariPelaksanaan: '2026-07-29',
    waktuMulai: '10:00',
    waktuSelesai: '12:00',
    tempatPelaksanaan: selectedPengadaan.tempatPenandatanganan, // [Procurement.signingPlace]
    namaKegiatan: 'Penjelasan Pekerjaan',
    tanggalKegiatan: '2026-07-31',
    waktuKegiatanMulai: '10:00',
    waktuKegiatanSelesai: '12:00',
    keteranganTujuan:
      'Dengan ini mengharapkan kehadiran Saudara untuk mengikuti Penjelasan Pekerjaan, yang akan diadakan pada : ',
    keteranganPermohonan:
      'Saudara diminta untuk memasukkan penawaran administrasi, teknis dan harga secara langsung dan melaksanakan klarifikasi dan Negosiasi pada : ',
    penandaTangan: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi Signatory/PBJ]

    // =========================================================================
    // DOKUMEN 002: BERITA ACARA PENJELASAN PEKERJAAN (WorkExplanationMinutes)
    // =========================================================================
    beritaTanggal: '2026-07-29',
    beritaPukul: '11:00',
    beritaTempat: selectedPengadaan.tempatPenandatanganan, // [Procurement.signingPlace]
    beritaPeserta: selectedPengadaan.judulPengadaan, // [Procurement.participants]
    beritaNamaPenjelasanPekerjaan: selectedPengadaan.judulPengadaan, // [Procurement.title]
    beritaKeteranganAwal: 'Dengan hasil terlampir sebagai berikut : ',
    beritaRapatDipimpinPpk: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi PPK]
    beritaPenjelasanAdministrasiPpbj: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi PBJ]
    beritaPenjelasanTeknikPpbj: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi PBJ]
    beritaRapatTanyaJawab: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi PBJ]
    beritaKeteranganTujuan:
      'Penjelasan Pekerjaan ini ditutup pada Tanggal tersebut di atas pada pukul 11.00 WITA.\n\nSelanjutnya calon penyedia barang/jasa diminta segera memasukkan dokumen penawaran pada hari operasional kerja setelah penjelasan pekerjaan untuk diproses lebih lanjut oleh Pejabat Pengadaan barang/jasa sesuai dengan ketentuan yang berlaku.\n\nDemikian Berita Acara ini dibuat untuk dipergunakan sebagaimana mestinya.',
    beritaPenandaTangan: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi Signatory/PBJ]

    // =========================================================================
    // DOKUMEN 003: BUKTI PENGAMBILAN DOKUMEN (DocumentCollectionReceipt)
    // =========================================================================
    buktiPekerjaan: selectedPengadaan.judulPengadaan, // [Procurement.title]
    buktiTanggal: '2026-07-30',
    buktiWaktu: '11:00',
    buktiNamaPerusahaan: 'Muamalat Institute', // [Provider.name]
    buktiNamaPejabatPerusahaan: 'Amien', // [Provider.directorName]
    buktiJabatanPejabat: 'Direktur Eksekutif', // [Provider.position]
    buktiPenandaTangan: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi Signatory/PBJ]

    // =========================================================================================
    // DOKUMEN 004: BERITA ACARA PEMASUKAN DAN PEMBUKAAN DOKUMEN (DocumentSubmissionMinutes)
    // =========================================================================================
    baPemasukanTanggalDokumen: '2026-07-31',
    baPemasukanPukul: '11:00',
    baPemasukanNamaPekerjaan: selectedPengadaan.judulPengadaan, // [Procurement.title]
    baPemasukanPejabatPengadaan:
      'Pejabat Pengadaan Barang/Jasa PT BPR NTB PERSERODA', // [Relasi PBJ]
    baPemasukanPenyedia: selectedPengadaan.namaPenyedia, // [Provider.name]
    baPemasukanTanggalPemasukan: '2026-07-30',
    baPemasukanMasaBerlaku: '7 (tujuh) hari kalender',
    baPemasukanNilaiPenawaran: selectedPengadaan.hps, // [Procurement.offeredPrice / HPS]
    baPemasukanRincianHarga: 'Ada',
    baPemasukanKeterangan: 'Lengkap',
    baPemasukanPenandaTangan: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi Signatory/PBJ]

    // =====================================================================
    // DOKUMEN 005: TANDA TERIMA PEMASUKAN DOKUMEN (DocumentSubmissionReceipt)
    // =====================================================================
    tandaTerimaPekerjaan: selectedPengadaan.judulPengadaan, // [Procurement.title]
    tandaTerimaTanggal: '2026-08-03',
    tandaTerimaWaktu: '11:00',
    tandaTerimaNamaPerusahaan: selectedPengadaan.namaPenyedia, // [Provider.name]
    tandaTerimaNamaPejabat: selectedPengadaan.namaDirektur, // [Provider.directorName]
    tandaTerimaJabatan: 'Direktur', // [Provider.position]
    tandaTerimaPenandaTangan: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi Signatory/PBJ]

    // =====================================================================
    // DOKUMEN 006: BERITA ACARA EVALUASI DOKUMEN (DocumentEvaluationMinutes)
    // =====================================================================
    baEvaluasiTanggalDokumen: '2026-08-03',
    baEvaluasiNamaPekerjaan: selectedPengadaan.judulPengadaan, // [Procurement.title]
    baEvaluasiNamaPenyedia: selectedPengadaan.namaPenyedia, // [Provider.name]
    baEvaluasiNomorBaPemasukan: getNomorDokumen(3), // [Fallback Dokumen 004]
    baEvaluasiNilaiPenawaran: selectedPengadaan.hps, // [Procurement.offeredPrice / HPS]
    baEvaluasiJadwalPelaksanaan: '45 (Empat Puluh Lima) hari kalender',
    baEvaluasiKualifikasiSiup: 'L',
    baEvaluasiKualifikasiNpwp: 'L',
    baEvaluasiKualifikasiKtp: 'L',
    baEvaluasiKualifikasiKswp: 'L',
    baEvaluasiPenandaTangan: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi Signatory/PBJ]

    // ===================================================================================
    // DOKUMEN 007: UNDANGAN KLARIFIKASI DAN NEGOSIASI (ClarificationNegotiationInvitation)
    // ===================================================================================
    uknLampiran: '1 (satu) gabung',
    uknTempatSurat: selectedPengadaan.tempatPenandatanganan, // [Procurement.signingPlace]
    uknTanggalSurat: '2026-08-03',
    uknKepadaJabatan: 'Direktur', // [Provider.position]
    uknNamaPenyedia: selectedPengadaan.namaPenyedia, // [Provider.name]
    uknAlamat: selectedPengadaan.alamat, // [Provider.address]
    uknPerihal: 'Undangan Klarifikasi dan Negosiasi',
    uknPekerjaan: selectedPengadaan.judulPengadaan, // [Procurement.title]
    uknWaktu: '11:00',
    uknHari: '2026-08-04',
    uknTempat: 'Ruang Rapat Kantor PT BPR NTB PERSERODA',
    uknParagrafPembuka:
      'Berdasarkan hasil evaluasi yang kami lakukan, penawaran Saudara kami nyatakan memenuhi syarat. Sehubungan dengan hal tersebut, kami mengundang Saudara dalam rangka klarifikasi, negosiasi harga, dan pembuktian kualifikasi dengan keterangan sebagai berikut ini :',
    uknParagrafPenutup:
      'Dalam Pembuktian Kualifikasi, mohon kiranya membawa dokumen aseli terhadap dokumen yang dicantumkan dalam dokumen penawaran. Demikian atas perhatian dan kehadiran saudara disampaikan terima kasih.',
    uknPenandaTangan: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi Signatory/PBJ]

    // =========================================================================================
    // DOKUMEN 008: BERITA ACARA KLARIFIKASI DAN NEGOSIASI (ClarificationNegotiationMinutes)
    // =========================================================================================
    baknTanggal: '2026-08-04',
    baknTempat: 'Ruang Rapat Kantor PT BPR NTB PERSERODA',
    baknNamaPenyedia: selectedPengadaan.namaPenyedia, // [Provider.name]
    baknPekerjaan: selectedPengadaan.judulPengadaan, // [Procurement.title]
    baknHasil1:
      'Dari hasil klarifikasi teknis, ' +
      selectedPengadaan.namaPenyedia +
      ' menyatakan sanggup untuk melaksanakan pekerjaan di atas sesuai dengan spesifikasi teknis, volume dan jangka waktu pekerjaan yang ditentukan.',
    baknHasil2:
      'Dari hasil negosiasi harga, disepakati harga pekerjaan sesuai daftar (terlampir).',
    baknHasil3:
      'Dari hasil pembuktian kualifikasi, ' +
      selectedPengadaan.namaPenyedia +
      ' dapat menunjukkan dokumen asli yang tercantum dalam dokumen penawaran.',
    baknKeteranganPenutup:
      'Demikian Berita Acara ini dibuat untuk ditindak lanjuti sebagaimana mestinya.',
    baknNamaDirektur: selectedPengadaan.namaDirektur, // [Provider.directorName]
    baknPenandaTangan: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi Signatory/PBJ]

    // =========================================================================
    // DOKUMEN 009: BERITA ACARA HASIL PENGADAAN LANGSUNG (HasilPengadaan)
    // =========================================================================
    bahplTanggal: '2026-08-05',
    bahplPekerjaan: selectedPengadaan.judulPengadaan, // [Procurement.title]
    bahplHps: selectedPengadaan.hps, // [Procurement.estimatedPriceIncludingTax]
    bahplUnsurEvaluasi: 'Adminstrasi, Teknis, Harga dan Kualifikasi',
    bahplNamaPerusahaan: selectedPengadaan.namaPenyedia, // [Provider.name]
    bahplHargaPenawaran: '135450000', // [Procurement.offeredPriceIncludingTax]
    bahplEvalAdministrasi: 'M',
    bahplEvalTeknis: 'M',
    bahplEvalHarga: 'M',
    bahplEvalKualifikasi: 'M',
    bahplKet: 'M',
    bahplNamaPenyedia: selectedPengadaan.namaPenyedia, // [Provider.name]
    bahplNamaDirektur: selectedPengadaan.namaDirektur, // [Provider.directorName]
    bahplAlamat: selectedPengadaan.alamat, // [Provider.address]
    bahplNpwp: '1000000009573294', // [Provider.taxIdentificationNumber]
    bahplHargaNegosiasi: '130950000', // [Procurement.negotiatedPrice]
    bahplKeteranganPenutup:
      'Demikian berita acara ini dibuat sebagai pertimbangan dalam pembuatan kontrak oleh pejabat pembuat Komitmen.',
    bahplPenandaTangan: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi Signatory/PBJ]

    // ============================================================================
    // DOKUMEN 010: PENUNJUKAN PENYEDIA PENGADAAN / SPPBJ (PenunjukanPenyedia)
    // ============================================================================
    penunjukanTempat: selectedPengadaan.tempatPenandatanganan, // [Procurement.signingPlace]
    penunjukanTanggal: '2026-08-06',
    penunjukanLampiran: '-',
    penunjukanJabatanTujuan: selectedPengadaan.jabatanDirektur, // [Provider.position]
    penunjukanKepada: selectedPengadaan.namaPenyedia, // [Provider.name]
    penunjukanDi: 'Tempat',
    penunjukanPerihal: `Penunjukan Penyedia Pengadaan ${selectedPengadaan.judulPengadaan}`,
    penunjukanTanggalPenawaran: '2026-07-30',
    penunjukanNilaiNegosiasi: selectedPengadaan.hasilNegosiasi, // [Procurement.negotiatedPrice]
    penunjukanKeteranganTindakLanjut:
      'Sebagai tindak lanjut dari Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) ini Saudara diharuskan menandatangani SPK paling lambat 14 (empat belas) hari setelah diterbitkannya SPPBJ. Kegagalan Saudara untuk menerima penunjukan ini yang disusun berdasarkan evaluasi terhadap penawaran Saudara, akan dikenakan sanksi sesuai ketentuan dan peraturan yang berlaku.',
    penunjukanPenandaTangan: selectedPengadaan.pbj[0]?.nrp ?? '', // [Relasi Signatory/PBJ]

    // =================================================================
    // DOKUMEN 011: SPK ATAU KONTRAK KERJA (Spk)
    // =================================================================
    spkTanggal: '2026-08-07',
    spkPpk: selectedPengadaan.ppk[0]?.nrp ?? '', // [Relasi PPK]
    spkNamaPenyedia: selectedPengadaan.namaDirektur, // [Provider.directorName]
    spkJabatanPenyedia: selectedPengadaan.jabatanDirektur, // [Provider.position]
    spkPerusahaanPenyedia: selectedPengadaan.namaPenyedia, // [Provider.name]
    spkPaketPengadaan: selectedPengadaan.judulPengadaan, // [Procurement.title]
    spkNomorSuratUndangan: getNomorDokumen(0), // [Fallback Dokumen 001]
    spkTanggalSuratUndangan: '2026-07-29', // [Fallback Dokumen 001]
    spkSumberDana: 'Rencana Bisnis Bank (RBB) Tahun Anggaran 2026',
    spkNilaiKontrak: selectedPengadaan.hasilNegosiasi, // [Procurement.negotiatedPrice]
  });
  const [showResultModal, setShowResultModal] = useState(false);
  const [useHeaderFooter] = useState(true);
  const [showImageSettings, setShowImageSettings] = useState(false);
  const [defaultDocumentImages, setDefaultDocumentImages] =
    useState<DefaultDocumentImages>(emptyDefaultDocumentImages);
  const paketKey = id ?? '1';
  const documentKey = documentIndex ?? '1';
  const [headerFooterVisibility, setHeaderFooterVisibility] =
    useState<DocumentHeaderFooterVisibility>(() =>
      getDocumentHeaderFooterVisibility(paketKey, documentKey)
    );

  useEffect(() => {
    let isActive = true;

    loadDefaultDocumentImages().then((images) => {
      if (isActive) setDefaultDocumentImages(images);
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setHeaderFooterVisibility(
      getDocumentHeaderFooterVisibility(paketKey, documentKey)
    );
  }, [paketKey, documentKey]);

  const updateHeaderFooterVisibility = (
    kind: DocumentAssetKind,
    isVisible: boolean
  ) => {
    const next = { ...headerFooterVisibility, [kind]: isVisible };

    setHeaderFooterVisibility(next);
    saveDocumentHeaderFooterVisibility(paketKey, documentKey, next);
  };

  // Pegawai dicari berdasarkan id (nilai select), lintas peran
  // (PPK/PBJ/penanda tangan) supaya template selalu menemukan orangnya.
  const pegawaiKosong: DokumenPegawaiView = { id: '', nama: '', nrp: '' };
  const getPegawaiById = (idPegawai: string): DokumenPegawaiView =>
    daftarPegawai.find((pegawai) => pegawai.id === idPegawai) ?? pegawaiKosong;

  const selectedPenandaTangan = getPegawaiById(form.penandaTangan);
  const beritaRapatDipimpin = getPegawaiById(form.beritaRapatDipimpinPpk);
  const beritaAdministrasi = getPegawaiById(
    form.beritaPenjelasanAdministrasiPpbj
  );
  const beritaTeknik = getPegawaiById(form.beritaPenjelasanTeknikPpbj);
  const beritaTanyaJawab = getPegawaiById(form.beritaRapatTanyaJawab);
  const beritaPenandaTangan = getPegawaiById(form.beritaPenandaTangan);
  const buktiPenandaTangan = getPegawaiById(form.buktiPenandaTangan);
  const baPemasukanPenandaTangan = getPegawaiById(form.baPemasukanPenandaTangan);
  const tandaTerimaPenandaTangan = getPegawaiById(form.tandaTerimaPenandaTangan);
  const baEvaluasiPenandaTangan = getPegawaiById(form.baEvaluasiPenandaTangan);
  const uknPenandaTangan = getPegawaiById(form.uknPenandaTangan);
  const baknPenandaTangan = getPegawaiById(form.baknPenandaTangan);
  const bahplPenandaTangan = getPegawaiById(form.bahplPenandaTangan);
  const penunjukanPenandaTangan = getPegawaiById(form.penunjukanPenandaTangan);
  const spkPpk = getPegawaiById(form.spkPpk);
  const kegiatanRows = [
    {
      nama: form.namaKegiatan || 'Penjelasan Pekerjaan',
      tanggal: formatDateFromInput(form.tanggalKegiatan),
      waktu: `${formatTimeWita(form.waktuKegiatanMulai)} WITA s.d ${formatTimeWita(
        form.waktuKegiatanSelesai
      )} WITA`,
    },
    {
      nama: 'Pemasukan Dokumen Penawaran',
      tanggal: formatDateFromInput(form.hariPelaksanaan),
      waktu: `${formatTimeWita(form.waktuMulai)} WITA s.d ${formatTimeWita(
        form.waktuSelesai
      )} WITA`,
    },
    {
      nama: 'Klarifikasi dan Negosiasi Harga',
      tanggal: formatDateFromInput(form.hariPelaksanaan),
      waktu: `${formatTimeWita(form.waktuMulai)} WITA s.d ${formatTimeWita(
        form.waktuSelesai
      )} WITA`,
    },
  ];

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  // Dokumen yang sudah punya pemetaan field ke API (bisa dimuat & disimpan).
  const dokumenTerhubung = slug !== null && Boolean(PETA_DOKUMEN[documentName]);

  // Mengisi form dari nilai efektif backend. Field bernilai
  // kosong dibiarkan memakai default statis form.
  const terapkanNilaiEfektif = (ne: NilaiEfektif) => {
    if (typeof ne.nomorDokumen === 'string' && ne.nomorDokumen) {
      setNomorDokumen(ne.nomorDokumen);
    }

    const peta = PETA_DOKUMEN[documentName];
    if (!peta) return;

    setForm((current) => {
      const patch: Record<string, string> = {};

      for (const field of peta.fields) {
        const raw = ne[field.api];
        if (raw == null || raw === '') continue;

        let value = String(raw);
        if (field.tipe === 'date') value = value.slice(0, 10);
        patch[field.form] = value;
      }

      return { ...current, ...patch };
    });
  };

  // Menyusun body PUT dari nilai form untuk dokumen aktif.
  const bangunBody = (): Record<string, unknown> | null => {
    const peta = PETA_DOKUMEN[documentName];
    if (!peta) return null;

    const body: Record<string, unknown> = {
      nomorDokumen: nomorDokumen.trim() || null,
    };

    const nilaiForm = form as unknown as Record<string, string>;

    for (const field of peta.fields) {
      const value = (nilaiForm[field.form] ?? '').trim();
      body[field.api] = value === '' ? null : value;
    }

    return body;
  };

  // Memuat data pengadaan + isi dokumen aktif dari backend.
  useEffect(() => {
    if (!id) return;

    let batal = false;

    const muat = async () => {
      setMemuat(true);
      setMuatError('');

      try {
        const detail = await pengadaanApi.detail(id);
        const semuaPegawai = await muatSemuaPegawai();
        if (batal) return;

        setDaftarPegawai(semuaPegawai);
        setSelectedPengadaan({
          namaPenyedia: detail.penyediaNama,
          namaDirektur: detail.penyediaDirektur ?? '',
          jabatanDirektur: detail.penyediaJabatan ?? '',
          alamat: detail.penyediaAlamat ?? '',
          email: detail.penyediaEmail ?? '',
          npwp: detail.penyediaNpwp ?? '',
          judulPengadaan: detail.judul,
          hps: detail.nilaiHps ?? '',
          hasilNegosiasi: detail.hasilNegosiasi ?? '',
          tempatPenandatanganan: detail.tempatPenandatanganan ?? '',
          ppk: detail.ppk.map((p) => ({
            id: p.id,
            nama: p.nama,
            nrp: p.nrp,
            jabatan: p.jabatan,
          })),
          pbj: detail.pbj.map((p) => ({
            id: p.id,
            nama: p.nama,
            nrp: p.nrp,
            jabatan: p.jabatan,
          })),
          penandaTangan: detail.penandaTangan.map((p) => ({
            id: p.id,
            nama: p.nama,
            nrp: p.nrp,
            jabatan: p.jabatan,
          })),
        });

        if (slug) {
          const hasil = await dokumenApi.ambil(id, slug);
          if (batal) return;

          setSudahDisimpan(hasil.sudahDisimpan);
          terapkanNilaiEfektif(hasil.nilaiEfektif);
        }
      } catch (error) {
        if (!batal) {
          setMuatError(getApiErrorMessage(error, 'Gagal memuat dokumen.'));
        }
      } finally {
        if (!batal) setMemuat(false);
      }
    };

    muat();

    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug]);

  const simpanDokumen = async () => {
    if (!id || !slug || menyimpan) return;

    const body = bangunBody();
    if (!body) return;

    setMenyimpan(true);
    try {
      const hasil = await dokumenApi.simpan(id, slug, body);
      setSudahDisimpan(hasil.sudahDisimpan);
      terapkanNilaiEfektif(hasil.nilaiEfektif);
      toast.success(`${documentName} berhasil disimpan.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Gagal menyimpan dokumen.'));
    } finally {
      setMenyimpan(false);
    }
  };

  const openResultModal = () => {
    setShowImageSettings(false);
    setShowResultModal(true);
  };

  // Header dan footer selalu memakai gambar bawaan dari public/.
  const headerAsset: DocumentTemplateAsset = {
    ...defaultHeaderAsset,
    src: defaultDocumentImages.header.src,
    name: defaultDocumentImages.header.name,
  };
  const footerImage = defaultDocumentImages.footer;
  const fullPageFooterHeightMm = footerImage.src
    ? Number(((a4WidthMm * footerImage.height) / footerImage.width).toFixed(2))
    : 0;
  const isHeaderFooterRequired =
    isSuratUndangan ||
    isBuktiPengambilan ||
    isBeritaAcaraPemasukanDanPembukaanDokumen ||
    isTandaTerimaPemasukanDokumen ||
    isBeritaAcaraEvaluasiDokumen ||
    isUndanganKlarifikasi ||
    isBeritaKlarifikasi ||
    isHasilPengadaan ||
    isPenunjukanPenyedia;
  const effectiveUseHeaderFooter =
    isHeaderFooterRequired && (isHeaderFooterRequired || useHeaderFooter);
  const showHeader = effectiveUseHeaderFooter && headerFooterVisibility.header;
  const showFooter = effectiveUseHeaderFooter && headerFooterVisibility.footer;
  const showFullPageFooter = showFooter && Boolean(footerImage.src);
  const pagePaddingBottom = showFullPageFooter
    ? `${fullPageFooterHeightMm + fullPageFooterGapMm}mm`
    : `${pageBottomPaddingMm}mm`;

  const getHeaderHtml = () =>
    showHeader ? getDocumentAssetHtml(headerAsset, 'Header dokumen') : '';

  const getFooterHtml = () =>
    showFullPageFooter
      ? getFullPageFooterHtml(footerImage.src, fullPageFooterHeightMm)
      : '';
// Template All Document
  const getSuratUndanganContentHtml = () => `
    <div class="content-block top">
      <table class="meta top-meta">
        <tr><td class="meta-label">Nomor</td><td class="colon-mark">:</td><td>${escapeHtml(nomorDokumen)}</td></tr>
        <tr><td class="meta-label">Lampiran</td><td class="colon-mark">:</td><td>${escapeHtml(form.lampiran)}</td></tr>
      </table>
      <div class="top-date">${escapeHtml(form.tempatSurat)}, ${escapeHtml(formatDateOnlyFromInput(form.tanggalSurat))}</div>
    </div>

    <div class="content-block mb">
      <div>Kepada Yth,</div>
      <div>${escapeHtml(form.kepadaYth)}</div>
      <div>di -</div>
      <div class="address-indent">${escapeHtml(form.di)}</div>
    </div>

    <table class="content-block meta mb subject">
      <tr><td class="meta-label">Perihal</td><td class="colon-mark">:</td><td class="strong">${escapeHtml(form.perihal)}</td></tr>
    </table>

    <table class="content-block row-table mb">
      <tr>
        <td class="number-cell">1.</td>
        <td class="colon-label">Nama Paket Pekerjaan</td>
        <td class="colon-mark">:</td>
        <td>${escapeHtml(form.namaPaketPekerjaan)}</td>
      </tr>
      <tr>
        <td></td>
        <td class="colon-label">Nilai Total HPS</td>
        <td class="colon-mark">:</td>
        <td>Rp. ${escapeHtml(formatRupiahText(form.nilaiTotalHps))}</td>
      </tr>
    </table>

    <table class="content-block row-table mb">
      <tr>
        <td class="number-cell">2.</td>
        <td class="colon-label">Pelaksanaan Pengadaan</td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td></td>
        <td class="colon-label">Tempat dan Alamat</td>
        <td class="colon-mark">:</td>
        <td>${escapeHtml(form.tempatPelaksanaan)} - ${escapeHtml(form.di)}</td>
      </tr>
      <tr>
        <td></td>
        <td class="colon-label">Email</td>
        <td class="colon-mark">:</td>
        <td>${escapeHtml(form.email)}</td>
      </tr>
    </table>

    <div class="content-block">
      <p>${escapeHtml(form.keteranganTujuan)}</p>
      <table class="row-table mb">
        <tr><td class="number-cell"></td><td class="colon-label">Hari</td><td class="colon-mark">:</td><td>${escapeHtml(formatDateFromInput(form.hariPelaksanaan))}</td></tr>
        <tr><td></td><td class="colon-label">Waktu</td><td class="colon-mark">:</td><td>${escapeHtml(formatTimeWita(form.waktuMulai))} WITA s.d ${escapeHtml(formatTimeWita(form.waktuSelesai))} WITA</td></tr>
        <tr><td></td><td class="colon-label">Tempat</td><td class="colon-mark">:</td><td>${escapeHtml(form.tempatPelaksanaan)}</td></tr>
      </table>
    </div>

    <div class="content-block">
      <p>${escapeHtml(form.keteranganPermohonan)}</p>
      <table class="activity">
        <thead>
          <tr><th>No</th><th>Kegiatan</th><th>Tanggal</th><th>Waktu</th></tr>
        </thead>
        <tbody>
          ${kegiatanRows
            .map(
              (row, index) =>
                `<tr><td>${index + 1}.</td><td>${escapeHtml(row.nama)}</td><td>${escapeHtml(row.tanggal)}</td><td>${escapeHtml(row.waktu)}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <div class="content-block signature">
      <div class="signature-inner">
        <div>Pejabat Pengadaan Barang/Jasa</div>
        <div>PT BPR NTB PERSERODA</div>
        <div style="height: 44px;"></div>
        <div class="strong"><u>${escapeHtml(selectedPenandaTangan?.nama ?? '')}</u></div>
        <div>NRP : ${escapeHtml(selectedPenandaTangan?.nrp ?? '')}</div>
      </div>
    </div>
  `;

  const getBeritaAcaraContentHtml = () => `
    <div class="ba-document">
      <div class="ba-title-block content-block">
        <h1>Berita Acara Penjelasan Pekerjaan</h1>
        <div>Nomor: <span class="ba-number">${escapeHtml(nomorDokumen)}</span></div>
      </div>

      <table class="ba-meta content-block">
        <tr>
          <td>Hari / tanggal</td>
          <td>:</td>
          <td>${escapeHtml(formatDateFromInput(form.beritaTanggal))}</td>
        </tr>
        <tr>
          <td>Pukul</td>
          <td>:</td>
          <td>${escapeHtml(formatTimeWita(form.beritaPukul))} WITA</td>
        </tr>
        <tr>
          <td>Tempat</td>
          <td>:</td>
          <td>${escapeHtml(form.beritaTempat)}</td>
        </tr>
        <tr>
          <td>Peserta</td>
          <td>:</td>
          <td>${escapeHtml(form.beritaPeserta)}</td>
        </tr>
        <tr>
          <td>Penjelasan Pekerjaan</td>
          <td>:</td>
          <td>${escapeHtml(form.beritaNamaPenjelasanPekerjaan)}</td>
        </tr>
      </table>

      <div class="content-block ba-paragraph">${formatBeritaText(
        form.beritaKeteranganAwal
      )}</div>

      <table class="ba-list content-block">
        <tr>
          <td>1.</td>
          <td>Rapat dipimpin oleh PPK</td>
          <td>:</td>
          <td>${escapeHtml(beritaRapatDipimpin?.nama ?? '')}</td>
        </tr>
        <tr>
          <td>2.</td>
          <td>Penjelasan Umum/Administrasi diberikan Oleh PPBJ</td>
          <td>:</td>
          <td>${escapeHtml(beritaAdministrasi?.nama ?? '')}</td>
        </tr>
        <tr>
          <td>3.</td>
          <td>Penjelasan Teknik diberikan oleh PPBJ</td>
          <td>:</td>
          <td>${escapeHtml(beritaTeknik?.nama ?? '')}</td>
        </tr>
        <tr>
          <td>4.</td>
          <td>Tanya Jawab</td>
          <td>:</td>
          <td>${escapeHtml(beritaTanyaJawab?.nama ?? '')}</td>
        </tr>
      </table>

      <div class="content-block ba-paragraph">${formatBeritaText(
        form.beritaKeteranganTujuan
      )}</div>

      <div class="content-block ba-signatures">
        <div class="ba-signature-left">
          <div>${escapeHtml(selectedPengadaan.namaPenyedia)}</div>
          <div class="ba-signature-space"></div>
          <div class="strong"><u>${escapeHtml(selectedPengadaan.namaDirektur)}</u></div>
          <div>Direktur</div>
        </div>
        <div class="ba-signature-right">
          <div>Pejabat Pengadaan Barang/Jasa</div>
          <div>PT BPR NTB PERSERODA</div>
          <div class="ba-signature-space"></div>
          <div class="strong"><u>${escapeHtml(beritaPenandaTangan?.nama ?? '')}</u></div>
          <div>NRP : ${escapeHtml(beritaPenandaTangan?.nrp ?? '')}</div>
        </div>
      </div>
    </div>
  `;

  const getBuktiPengambilanContentHtml = () => `
    <div class="bp-document">
      <div class="bp-title-block content-block">
        <h1>Bukti Pengambilan Dokumen Pengadaan</h1>
      </div>

      <table class="bp-meta content-block">
        <tr>
          <td>Pekerjaan</td>
          <td>:</td>
          <td>${escapeHtml(form.buktiPekerjaan)}</td>
        </tr>
        <tr>
          <td>Hari/Tanggal</td>
          <td>:</td>
          <td>${escapeHtml(formatDateFromInput(form.buktiTanggal))}</td>
        </tr>
        <tr>
          <td>Waktu</td>
          <td>:</td>
          <td>${escapeHtml(formatTimeWita(form.buktiWaktu))} WITA</td>
        </tr>
      </table>

      <table class="bp-table content-block">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Perusahaan</th>
            <th>Nama</th>
            <th>Jabatan</th>
            <th>Tanda Tangan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1.</td>
            <td>${escapeHtml(form.buktiNamaPerusahaan)}</td>
            <td>${escapeHtml(form.buktiNamaPejabatPerusahaan)}</td>
            <td>${escapeHtml(form.buktiJabatanPejabat)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="content-block bp-signature">
        <div class="bp-signature-inner">
          <div>Pejabat Pengadaan Barang/Jasa</div>
          <div>PT BPR NTB PERSERODA T.A 2026</div>
          <div class="bp-signature-space"></div>
          <div class="strong"><u>${escapeHtml(buktiPenandaTangan?.nama ?? '')}</u></div>
          <div>NRP : ${escapeHtml(buktiPenandaTangan?.nrp ?? '')}</div>
        </div>
      </div>
    </div>
  `;

  const getBeritaAcaraPemasukanDanPembukaanDokumenContentHtml = () => {
    const parts = getDatePartsIndonesia(form.baPemasukanTanggalDokumen);

    return `
    <div class="bapp-document">
      <div class="bapp-title-block content-block">
        <h1>Berita Acara Pemasukan dan Pembukaan Dokumen</h1>
        <div class="bapp-doc-number">Nomor: <span class="bapp-number">${escapeHtml(
          nomorDokumen
        )}</span></div>
      </div>

      <table class="bapp-meta-date content-block">
        <tr>
          <td class="bapp-label-date">Pada Hari ini</td>
          <td class="bapp-colon">:</td>
          <td>${escapeHtml(parts.hari)}</td>
        </tr>
        <tr>
          <td>Tanggal</td>
          <td class="bapp-colon">:</td>
          <td>${escapeHtml(parts.tanggal)}</td>
        </tr>
        <tr>
          <td>Bulan</td>
          <td class="bapp-colon">:</td>
          <td>${escapeHtml(parts.bulan)}</td>
        </tr>
        <tr>
          <td>Tahun</td>
          <td class="bapp-colon">:</td>
          <td>${escapeHtml(parts.tahun)}</td>
        </tr>
        <tr>
          <td>Pukul</td>
          <td class="bapp-colon">:</td>
          <td>${escapeHtml(formatTimeWita(form.baPemasukanPukul))} WITA</td>
        </tr>
      </table>

      <div class="content-block bapp-section-intro">
        <p>Telah diadakan pemasukan dokumen penawaran pekerjaan sebagai berikut :</p>
      </div>

      <table class="bapp-meta-job content-block">
        <tr>
          <td class="bapp-label-job">Pengadaan Pekerjaan</td>
          <td class="bapp-colon">:</td>
          <td>${escapeHtml(form.baPemasukanNamaPekerjaan)}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding-top: 4px; padding-bottom: 2px;">Yang dihadiri oleh :</td>
        </tr>
        <tr>
          <td>Pejabat Pengadaaan</td>
          <td class="bapp-colon">:</td>
          <td>${escapeHtml(form.baPemasukanPejabatPengadaan)}</td>
        </tr>
        <tr>
          <td>Penyedia Barang/Jasa</td>
          <td class="bapp-colon">:</td>
          <td class="strong">${escapeHtml(form.baPemasukanPenyedia)}</td>
        </tr>
      </table>

      <div class="content-block bapp-section-intro">
        <p>Dengan Hasil Sebagai Berikut :</p>
      </div>

      <div class="content-block bapp-result-item">
        <table class="bapp-subtable">
          <tr>
            <td class="bapp-num-cell">1.</td>
            <td class="bapp-sublabel-long">Penyedia barang/jasa yang diundang sebanyak satu rekanan yaitu</td>
            <td class="bapp-colon">:</td>
            <td class="strong">${escapeHtml(form.baPemasukanPenyedia)}</td>
          </tr>
          <tr>
            <td></td>
            <td class="bapp-sublabel-long">Yang memasukan dokumen penawaran pada tanggal</td>
            <td class="bapp-colon">:</td>
            <td>${escapeHtml(
              formatDateFromInput(form.baPemasukanTanggalPemasukan)
            )}</td>
          </tr>
        </table>
      </div>

      <div class="content-block bapp-result-item" style="margin-top: 4px;">
        <table class="bapp-subtable">
          <tr>
            <td class="bapp-num-cell">2.</td>
            <td colspan="3">Adapun hasil pembukaan dokumen penawaran sebagai berikut :</td>
          </tr>
          <tr>
            <td></td>
            <td class="bapp-sublabel">Nama Perusahaan</td>
            <td class="bapp-colon">:</td>
            <td class="strong">${escapeHtml(form.baPemasukanPenyedia)}</td>
          </tr>
          <tr>
            <td></td>
            <td class="bapp-sublabel">Masa Berlaku Penawaran</td>
            <td class="bapp-colon">:</td>
            <td>${escapeHtml(form.baPemasukanMasaBerlaku)}</td>
          </tr>
          <tr>
            <td></td>
            <td class="bapp-sublabel">Nilai Penawaran</td>
            <td class="bapp-colon">:</td>
            <td>Rp. ${escapeHtml(
              formatRupiahText(form.baPemasukanNilaiPenawaran)
            )}</td>
          </tr>
          <tr>
            <td></td>
            <td class="bapp-sublabel">Rincian Harga</td>
            <td class="bapp-colon">:</td>
            <td>${escapeHtml(form.baPemasukanRincianHarga)}</td>
          </tr>
          <tr>
            <td></td>
            <td class="bapp-sublabel">Keterangan</td>
            <td class="bapp-colon">:</td>
            <td>${escapeHtml(form.baPemasukanKeterangan)}</td>
          </tr>
        </table>
      </div>

      <div class="content-block bapp-signature">
        <div class="bapp-signature-inner">
          <div>Pejabat Pengadaan Barang/Jasa</div>
          <div>PT BPR NTB PERSERODA T.A 2026</div>
          <div class="bapp-signature-space"></div>
          <div class="strong"><u>${escapeHtml(
            baPemasukanPenandaTangan?.nama ?? ''
          )}</u></div>
          <div>NRP : ${escapeHtml(baPemasukanPenandaTangan?.nrp ?? '')}</div>
        </div>
      </div>
    </div>
  `;
  };

  const getTandaTerimaPemasukanDokumenContentHtml = () => `
    <div class="ttp-document">
      <div class="ttp-title-block content-block">
        <h1>Tanda Terima Pemasukan Dokumen Penawaran</h1>
      </div>

      <table class="ttp-meta content-block">
        <tr>
          <td class="ttp-label">Pekerjaan</td>
          <td class="ttp-colon">:</td>
          <td>${escapeHtml(form.tandaTerimaPekerjaan)}</td>
        </tr>
        <tr>
          <td class="ttp-label">Hari/Tanggal</td>
          <td class="ttp-colon">:</td>
          <td>${escapeHtml(formatDateFromInput(form.tandaTerimaTanggal))}</td>
        </tr>
        <tr>
          <td class="ttp-label">Waktu</td>
          <td class="ttp-colon">:</td>
          <td>${escapeHtml(formatTimeWita(form.tandaTerimaWaktu))} WITA</td>
        </tr>
      </table>

      <table class="ttp-table content-block">
        <thead>
          <tr>
            <th style="width: 8%;">No.</th>
            <th style="width: 30%;">Nama Perusahaan</th>
            <th style="width: 24%;">Nama</th>
            <th style="width: 18%;">Jabatan</th>
            <th style="width: 20%;">Tanda Tangan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1.</td>
            <td class="strong">${escapeHtml(form.tandaTerimaNamaPerusahaan)}</td>
            <td>${escapeHtml(form.tandaTerimaNamaPejabat)}</td>
            <td>${escapeHtml(form.tandaTerimaJabatan)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="content-block ttp-signature">
        <div class="ttp-signature-inner">
          <div>Pejabat Pengadaan Barang/Jasa</div>
          <div>PT BPR NTB PERSERODA T.A 2026</div>
          <div class="ttp-signature-space"></div>
          <div class="strong"><u>${escapeHtml(
            tandaTerimaPenandaTangan?.nama ?? ''
          )}</u></div>
          <div>NRP : ${escapeHtml(tandaTerimaPenandaTangan?.nrp ?? '')}</div>
        </div>
      </div>
    </div>
  `;

  const getBeritaAcaraEvaluasiDokumenContentHtml = () => {
    const parts = getDatePartsIndonesia(form.baEvaluasiTanggalDokumen);

    return `
    <div class="bae-document">
      <div class="bae-title-block content-block">
        <h1>BERITA ACARA EVALUASI DOKUMEN PENAWARAN</h1>
        <div class="bae-doc-number">Nomor: <span class="bae-number">${escapeHtml(
          nomorDokumen
        )}</span></div>
      </div>

      <div class="content-block bae-opening">
        <div>Pada Hari ini,</div>
        <table class="bae-meta-date">
          <tr>
            <td class="bae-label-date">Hari</td>
            <td class="bae-colon">:</td>
            <td>${escapeHtml(parts.hari)}</td>
          </tr>
          <tr>
            <td>Tanggal</td>
            <td class="bae-colon">:</td>
            <td>${escapeHtml(parts.tanggal)}</td>
          </tr>
          <tr>
            <td>Bulan</td>
            <td class="bae-colon">:</td>
            <td>${escapeHtml(parts.bulan)}</td>
          </tr>
          <tr>
            <td>Tahun</td>
            <td class="bae-colon">:</td>
            <td>${escapeHtml(parts.tahun)}</td>
          </tr>
        </table>
      </div>

      <div class="content-block bae-section-intro">
        <div>Telah diadakan Pembukaan dan Evaluasi Dokumen Penawaran untuk pekerjaan :</div>
        <table class="bae-meta-inline">
          <tr>
            <td class="bae-label-job">Nama Pekerjaan</td>
            <td class="bae-colon">:</td>
            <td>${escapeHtml(form.baEvaluasiNamaPekerjaan)}</td>
          </tr>
        </table>
      </div>

      <div class="content-block bae-section-intro">
        <div>Penyedia yang memasukan penawaran :</div>
        <table class="bae-meta-inline">
          <tr>
            <td class="bae-label-job">Nama Penyedia</td>
            <td class="bae-colon">:</td>
            <td class="strong">${escapeHtml(form.baEvaluasiNamaPenyedia)}</td>
          </tr>
        </table>
      </div>

      <div class="content-block bae-section-intro">
        <p>Berdasarkan hasil pembukaan dan evaluasi dokumen penawaran, penyedia tersebut dinyatakan memenuhi persyaratan sesuai dengan data berikut ini:</p>
        <table class="bae-meta-inline">
          <tr>
            <td style="width: 76mm;">a. Nomor Berita Acara Pemasukan Dokumen Penawaran</td>
            <td class="bae-colon">:</td>
            <td>${escapeHtml(form.baEvaluasiNomorBaPemasukan)}</td>
          </tr>
          <tr>
            <td>b. Nama Penyedia</td>
            <td class="bae-colon">:</td>
            <td class="strong">${escapeHtml(form.baEvaluasiNamaPenyedia)}</td>
          </tr>
        </table>
      </div>

      <div class="content-block bae-eval-section">
        <div class="bae-eval-title">1. Evaluasi Administrasi</div>
        <table class="bae-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 22%;">Harga Penawaran</th>
              <th colspan="4" style="width: 44%;">Surat Penawaran</th>
              <th colspan="2" style="width: 24%;">Jangka Waktu</th>
              <th rowspan="2" style="width: 10%;">Ket</th>
            </tr>
            <tr>
              <th style="width: 11%;">Tujuan</th>
              <th style="width: 11%;">Tanggal</th>
              <th style="width: 11%;">Tanda Tangan</th>
              <th style="width: 11%;">Peruntukan/<br/>Pekerjaan</th>
              <th style="width: 12%;">Penawaran</th>
              <th style="width: 12%;">Pelaksanaan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Rp ${escapeHtml(
                formatRupiahText(form.baEvaluasiNilaiPenawaran)
              )}</td>
              <td>√</td>
              <td>√</td>
              <td>√</td>
              <td>√</td>
              <td>√</td>
              <td>√</td>
              <td>√</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="content-block bae-eval-section">
        <div class="bae-eval-title">2. Evaluasi Teknis</div>
        <table class="bae-table">
          <thead>
            <tr>
              <th colspan="2" style="width: 90%;">Unsur Teknis</th>
              <th rowspan="2" style="width: 10%;">Ket</th>
            </tr>
            <tr>
              <th style="width: 32%;">Spesifikasi Barang</th>
              <th style="width: 58%;">Jadwal Pelaksanaan Pekerjaan ${escapeHtml(
                form.baEvaluasiJadwalPelaksanaan
              )}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>√</td>
              <td>√</td>
              <td>√</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="content-block bae-eval-section">
        <div class="bae-eval-title">3. Evaluasi Harga</div>
        <table class="bae-table">
          <thead>
            <tr>
              <th style="width: 45%;">Total Harga Penawaran terhadap HPS</th>
              <th style="width: 45%;">Daftar Kuantitas<br/>Harga / RAB</th>
              <th style="width: 10%;">Ket</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>√</td>
              <td>√</td>
              <td>√</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="content-block bae-eval-section">
        <div class="bae-eval-title">4. Evaluasi Kualifikasi</div>
        <table class="bae-table">
          <thead>
            <tr>
              <th style="width: 8%;">No</th>
              <th style="width: 82%; text-align: center;">Uraian</th>
              <th style="width: 10%;">Ket</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: left;">1.</td>
              <td style="text-align: left;">Copy SIUP/NIB</td>
              <td>${escapeHtml(form.baEvaluasiKualifikasiSiup)}</td>
            </tr>
            <tr>
              <td style="text-align: left;">2.</td>
              <td style="text-align: left;">Copy NPWP</td>
              <td>${escapeHtml(form.baEvaluasiKualifikasiNpwp)}</td>
            </tr>
            <tr>
              <td style="text-align: left;">3.</td>
              <td style="text-align: left;">Copy KTP</td>
              <td>${escapeHtml(form.baEvaluasiKualifikasiKtp)}</td>
            </tr>
            <tr>
              <td style="text-align: left;">4.</td>
              <td style="text-align: left;">Copy KSWP</td>
              <td>${escapeHtml(form.baEvaluasiKualifikasiKswp)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="content-block bae-signature">
        <div class="bae-signature-inner">
          <div>Pejabat Pengadaan Barang/Jasa</div>
          <div>PT BPR NTB PERSERODA T.A 2026</div>
          <div class="bae-signature-space"></div>
          <div class="strong"><u>${escapeHtml(
            baEvaluasiPenandaTangan?.nama ?? ''
          )}</u></div>
          <div>NRP : ${escapeHtml(baEvaluasiPenandaTangan?.nrp ?? '')}</div>
        </div>
      </div>
    </div>
  `;
  };

  const getUndanganKlarifikasiContentHtml = () => `
    <div class="content-block top-date" style="text-align: right;">${escapeHtml(
      form.uknTempatSurat
    )}, ${escapeHtml(formatDateOnlyFromInput(form.uknTanggalSurat))}</div>

    <table class="content-block meta mb">
      <tr><td class="meta-label">Nomor</td><td class="colon-mark">:</td><td>${escapeHtml(
        nomorDokumen
      )}</td></tr>
      <tr><td class="meta-label">Lampiran</td><td class="colon-mark">:</td><td>${escapeHtml(
        form.uknLampiran
      )}</td></tr>
    </table>

    <div class="content-block mb">
      <div>Kepada Yth.</div>
      <div>${escapeHtml(form.uknKepadaJabatan)} - ${escapeHtml(
        form.uknNamaPenyedia
      )}</div>
      <div class="address-indent">di -</div>
      <div class="address-indent" style="margin-left: 32px;">${escapeHtml(
        form.uknAlamat
      )}</div>
    </div>

    <table class="content-block meta subject mb">
      <tr><td class="meta-label">Perihal</td><td class="colon-mark">:</td><td class="strong">${escapeHtml(
        form.uknPerihal
      )}</td></tr>
    </table>

    <div class="content-block ukn-salam">Bismillahirrahmanirrahiim<br />Assalamu'alaikum Warahmatullahi Wabarakatuh</div>

    <div class="content-block"><p>${escapeHtml(form.uknParagrafPembuka)}</p></div>

    <table class="content-block row-table mb">
      <tr><td class="colon-label">Pekerjaan</td><td class="colon-mark">:</td><td>${escapeHtml(
        form.uknPekerjaan
      )}</td></tr>
      <tr><td class="colon-label">Waktu</td><td class="colon-mark">:</td><td>${escapeHtml(
        formatTimeWita(form.uknWaktu)
      )} Wita</td></tr>
      <tr><td class="colon-label">Hari</td><td class="colon-mark">:</td><td>${escapeHtml(
        formatDateFromInput(form.uknHari)
      )}</td></tr>
      <tr><td class="colon-label">Tempat</td><td class="colon-mark">:</td><td>${escapeHtml(
        form.uknTempat
      )}</td></tr>
    </table>

    <div class="content-block"><p>${escapeHtml(form.uknParagrafPenutup)}</p></div>

    <div class="content-block ukn-salam">Wassalamu'alaikaum Warahmatullahi Wabarakatuh</div>

    <div class="content-block signature">
      <div class="signature-inner">
        <div>Pejabat Pengadaan Barang/Jasa</div>
        <div>PT BPR NTB PERSERODA T.A 2026</div>
        <div style="height: 60px;"></div>
        <div class="strong"><u>${escapeHtml(uknPenandaTangan?.nama ?? '')}</u></div>
        <div>NRP : ${escapeHtml(uknPenandaTangan?.nrp ?? '')}</div>
      </div>
    </div>
  `;

  const getBeritaKlarifikasiContentHtml = () => {
    const parts = getDatePartsIndonesia(form.baknTanggal);

    return `
    <div class="ba-document">
      <div class="ba-title-block content-block">
        <h1>Berita Acara Klarifikasi dan Negosiasi</h1>
        <div>Nomor: <span class="ba-number">${escapeHtml(nomorDokumen)}</span></div>
      </div>

      <div class="content-block ba-paragraph">Pada Hari ini,</div>

      <table class="ba-meta content-block">
        <tr><td>Hari</td><td>:</td><td>${escapeHtml(parts.hari)}</td></tr>
        <tr><td>Tanggal</td><td>:</td><td>${escapeHtml(parts.tanggal)}</td></tr>
        <tr><td>Bulan</td><td>:</td><td>${escapeHtml(parts.bulan)}</td></tr>
        <tr><td>Tahun</td><td>:</td><td>${escapeHtml(parts.tahun)}</td></tr>
        <tr><td>Tempat</td><td>:</td><td>${escapeHtml(form.baknTempat)}</td></tr>
      </table>

      <div class="content-block ba-paragraph">kami yang bertanda tangan di bawah ini adalah Pejabat Pengadaan, telah melakukan klarifikasi teknis dan negosiasi harga terhadap penawaran yang diajukan oleh:</div>

      <table class="ba-meta content-block">
        <tr><td>Nama Penyedia</td><td>:</td><td>${escapeHtml(
          form.baknNamaPenyedia
        )}</td></tr>
        <tr><td>Untuk Pekerjaan</td><td>:</td><td>${escapeHtml(
          form.baknPekerjaan
        )}</td></tr>
      </table>

      <div class="content-block ba-paragraph">Dengan hasil pembahasan sebagai berikut :</div>

      <table class="ba-list bakn-list content-block">
        <tr><td>1.</td><td>${escapeHtml(form.baknHasil1)}</td></tr>
        <tr><td>2.</td><td>${escapeHtml(form.baknHasil2)}</td></tr>
        <tr><td>3.</td><td>${escapeHtml(form.baknHasil3)}</td></tr>
      </table>

      <div class="content-block ba-paragraph">${escapeHtml(
        form.baknKeteranganPenutup
      )}</div>

      <div class="content-block ba-signatures">
        <div class="ba-signature-left">
          <div>Penyedia,</div>
          <div>${escapeHtml(form.baknNamaPenyedia)}</div>
          <div class="ba-signature-space"></div>
          <div class="strong"><u>${escapeHtml(form.baknNamaDirektur)}</u></div>
          <div>Direktur</div>
        </div>
        <div class="ba-signature-right">
          <div>Pejabat Pengadaan Barang/Jasa</div>
          <div>PT BPR NTB PERSERODA T.A 2026</div>
          <div class="ba-signature-space"></div>
          <div class="strong"><u>${escapeHtml(
            baknPenandaTangan?.nama ?? ''
          )}</u></div>
          <div>NRP : ${escapeHtml(baknPenandaTangan?.nrp ?? '')}</div>
        </div>
      </div>
    </div>
  `;
  };

  const getHasilPengadaanContentHtml = () => {
    const parts = getDatePartsIndonesia(form.bahplTanggal);

    return `
    <div class="hpl-document">
      <div class="hpl-title-block content-block">
        <h1>Berita Acara Hasil Pengadaan Langsung</h1>
        <div>Nomor: <span class="ba-number">${escapeHtml(nomorDokumen)}</span></div>
      </div>

      <div class="content-block ba-paragraph">Pada hari ini,</div>

      <table class="ba-meta content-block">
        <tr><td>Hari</td><td>:</td><td>${escapeHtml(parts.hari)}</td></tr>
        <tr><td>Tanggal</td><td>:</td><td>${escapeHtml(parts.tanggal)}</td></tr>
        <tr><td>Bulan</td><td>:</td><td>${escapeHtml(parts.bulan)}</td></tr>
        <tr><td>Tahun</td><td>:</td><td>${escapeHtml(parts.tahun)}</td></tr>
      </table>

      <div class="content-block ba-paragraph">Telah disusunnya Berita Acara Hasil Pengadaan Langsung yang memuat Proses Pengadaan Langsung sebagai berikut :</div>

      <table class="ba-meta content-block">
        <tr><td>Pekerjaan</td><td>:</td><td>${escapeHtml(
          form.bahplPekerjaan
        )}</td></tr>
        <tr><td>HPS</td><td>:</td><td>Rp ${escapeHtml(
          formatRupiahText(form.bahplHps)
        )} ,- (${escapeHtml(formatRupiahTerbilang(form.bahplHps))})</td></tr>
        <tr><td>Unsur Evaluasi</td><td>:</td><td>${escapeHtml(
          form.bahplUnsurEvaluasi
        )}</td></tr>
        <tr><td>Hasil Evaluasi</td><td>:</td><td></td></tr>
      </table>

      <table class="hpl-table content-block">
        <thead>
          <tr>
            <th>No.</th>
            <th>Nama Perusahaan</th>
            <th>Harga Penawaran</th>
            <th>Evaluasi Administrasi</th>
            <th>Evaluasi Teknis</th>
            <th>Evaluasi Harga</th>
            <th>Evaluasi Kualifikasi</th>
            <th>Ket.</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1.</td>
            <td>${escapeHtml(form.bahplNamaPerusahaan)}</td>
            <td>Rp ${escapeHtml(formatRupiahText(form.bahplHargaPenawaran))}</td>
            <td>${escapeHtml(form.bahplEvalAdministrasi)}</td>
            <td>${escapeHtml(form.bahplEvalTeknis)}</td>
            <td>${escapeHtml(form.bahplEvalHarga)}</td>
            <td>${escapeHtml(form.bahplEvalKualifikasi)}</td>
            <td>${escapeHtml(form.bahplKet)}</td>
          </tr>
        </tbody>
      </table>

      <div class="content-block hpl-note">Keterangan : M : Memenuhi Syarat; TM : Tidak Memenuhi Syarat</div>

      <div class="content-block ba-paragraph">Berdasarkan uraian diatas, maka Pejabat Pengadaan pada PT BPR NTB PERSERODA berkesimpulan bahwa peserta :</div>

      <table class="hpl-summary content-block">
        <tr><td>Nama Penyedia</td><td>:</td><td>${escapeHtml(
          form.bahplNamaPenyedia
        )}</td></tr>
        <tr><td>Nama Direktur Utama</td><td>:</td><td>${escapeHtml(
          form.bahplNamaDirektur
        )}</td></tr>
        <tr><td>Alamat Perusahaan</td><td>:</td><td>${escapeHtml(
          form.bahplAlamat
        )}</td></tr>
        <tr><td>Nomor Pokok Wajib Pajak (NPWP)</td><td>:</td><td>${escapeHtml(
          form.bahplNpwp
        )}</td></tr>
        <tr><td>Harga Penawaran</td><td>:</td><td>Rp ${escapeHtml(
          formatRupiahText(form.bahplHargaPenawaran)
        )}</td></tr>
        <tr><td>Harga Hasil Negosiasi</td><td>:</td><td>Rp ${escapeHtml(
          formatRupiahText(form.bahplHargaNegosiasi)
        )}</td></tr>
      </table>

      <div class="content-block ba-paragraph">${escapeHtml(
        form.bahplKeteranganPenutup
      )}</div>

      <div class="content-block signature">
        <div class="signature-inner">
          <div>Pejabat Pengadaan Barang/Jasa</div>
          <div>PT BPR NTB PERSERODA T.A 2026</div>
          <div style="height: 60px;"></div>
          <div class="strong"><u>${escapeHtml(
            bahplPenandaTangan?.nama ?? ''
          )}</u></div>
          <div>NRP : ${escapeHtml(bahplPenandaTangan?.nrp ?? '')}</div>
        </div>
      </div>
    </div>
  `;
  };

  const getPenunjukanPenyediaContentHtml = () => `
    <div class="pp-document">
      <div class="pp-date">${escapeHtml(form.penunjukanTempat)}, ${escapeHtml(
        formatDateTwoDigitFromInput(form.penunjukanTanggal)
      )}</div>

      <table class="pp-meta">
        <tr><td>Nomor</td><td>:</td><td>${escapeHtml(nomorDokumen)}</td></tr>
        <tr><td>Lampiran</td><td>:</td><td>${escapeHtml(form.penunjukanLampiran)}</td></tr>
      </table>

      <div class="pp-recipient">
        <div>Kepada Yth.</div>
        <div>${escapeHtml(form.penunjukanJabatanTujuan)}&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;<span class="upper">${escapeHtml(
          form.penunjukanKepada
        )}</span></div>
        <div>Di</div>
        <div class="pp-indent-1">-</div>
        <div class="pp-indent-2">${escapeHtml(form.penunjukanDi)}</div>
      </div>

      <table class="pp-meta pp-subject">
        <tr><td>Perihal</td><td>:</td><td>${escapeHtml(form.penunjukanPerihal)}</td></tr>
      </table>

      <p class="pp-paragraph">Dengan ini kami beritahukan bahwa penawaran Saudara pada hari ${escapeHtml(
        formatDateFromInput(form.penunjukanTanggalPenawaran)
      )} tentang Surat Penawaran dan dengan hasil negosiasi harga sebesar Rp. ${escapeHtml(
        formatRupiahText(form.penunjukanNilaiNegosiasi)
      )} sudah termasuk pajak, kami nyatakan diterima/disetujui.</p>

      <p class="pp-paragraph">${escapeHtmlWithBreaks(
        form.penunjukanKeteranganTindakLanjut
      )}</p>

      <div class="pp-signature">
        <div class="pp-signature-inner">
          <div>Pejabat Pengadaan Barang/Jasa</div>
          <div>PT BPR NTB PERSERODA T.A 2026</div>
          <div class="pp-signature-space"></div>
          <div class="strong upper"><u>${escapeHtml(
            penunjukanPenandaTangan?.nama ?? ''
          )}</u></div>
          <div>NRP : ${escapeHtml(penunjukanPenandaTangan?.nrp ?? '')}</div>
        </div>
      </div>
    </div>
  `;

  const getSpkContentHtml = () => `
    <div class="spk-document">
      <table class="spk-table">
        <colgroup><col style="width: 50%;" /><col style="width: 50%;" /></colgroup>
        <tr>
          <td class="spk-title" rowspan="2">Surat Perintah Kerja (SPK)</td>
          <td class="spk-company">PT BPR NTB PERSERODA</td>
        </tr>
        <tr>
          <td>
            <div class="spk-field-grid">
              <span>Nomor dan Tanggal SPK</span><span>:</span><span>${escapeHtml(nomorDokumen)}</span>
              <span>Tanggal</span><span>:</span><span>${escapeHtml(
                formatDateOnlyFromInput(form.spkTanggal)
              )}</span>
            </div>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <div class="spk-inline"><span>Nama PPK</span><span>:</span><span class="strong upper">${escapeHtml(
              spkPpk?.nama ?? ''
            )}</span></div>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <div class="spk-inline"><span>Nama Penyedia</span><span>:</span><span class="strong">${escapeHtml(
              form.spkNamaPenyedia
            )}</span></div>
          </td>
        </tr>
        <tr>
          <td rowspan="2" class="spk-middle">
            <div class="spk-inline"><span>Paket Pengadaan</span><span>:</span><span>${escapeHtml(
              form.spkPaketPengadaan
            )}</span></div>
          </td>
          <td class="spk-reference">
            <div>Nomor Surat Undangan Pengadaan Langsung :</div>
            <div>${escapeHtml(form.spkNomorSuratUndangan)}</div>
          </td>
        </tr>
        <tr>
          <td class="spk-reference">
            <div>Tanggal Surat Undangan Pengadaan Langsung :</div>
            <div>${escapeHtml(
              formatDateOnlyFromInput(form.spkTanggalSuratUndangan)
            )}</div>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="spk-roomy">
            <div class="spk-inline"><span>Sumber Dana</span><span>:</span><span>${escapeHtml(
              form.spkSumberDana
            )}</span></div>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="spk-roomy">
            Nilai Kontrak termasuk pajak pertambahan nilai PPN adalah sebesar Rp. ${escapeHtml(
              formatRupiahText(form.spkNilaiKontrak)
            )},- (${escapeHtml(getTerbilangTitleCase(form.spkNilaiKontrak))})
          </td>
        </tr>
        <tr>
          <td>
            <div class="spk-sign">
              <div>PT BPR NTB PERSERODA</div>
              <div>Pejabat Pembuat Komitmen T.A 2026</div>
              <div class="spk-sign-space"></div>
              <div class="strong upper"><u>${escapeHtml(spkPpk?.nama ?? '')}</u></div>
              <div>NRP : ${escapeHtml(spkPpk?.nrp ?? '')}</div>
            </div>
          </td>
          <td>
            <div class="spk-sign">
              <div>Untuk dan atas nama Penyedia</div>
              <div class="upper">${escapeHtml(form.spkPerusahaanPenyedia)}</div>
              <div>${escapeHtml(form.spkJabatanPenyedia)}</div>
              <div class="spk-sign-space"></div>
              <div class="strong"><u>${escapeHtml(form.spkNamaPenyedia)}</u></div>
              <div>&nbsp;</div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  const getDocumentContentHtml = () =>
    isBeritaAcaraPenjelasan
      ? getBeritaAcaraContentHtml()
      : isBuktiPengambilan
      ? getBuktiPengambilanContentHtml()
      : isBeritaAcaraPemasukanDanPembukaanDokumen
      ? getBeritaAcaraPemasukanDanPembukaanDokumenContentHtml()
      : isTandaTerimaPemasukanDokumen
      ? getTandaTerimaPemasukanDokumenContentHtml()
      : isBeritaAcaraEvaluasiDokumen
      ? getBeritaAcaraEvaluasiDokumenContentHtml()
      : isUndanganKlarifikasi
      ? getUndanganKlarifikasiContentHtml()
      : isBeritaKlarifikasi
      ? getBeritaKlarifikasiContentHtml()
      : isHasilPengadaan
      ? getHasilPengadaanContentHtml()
      : isPenunjukanPenyedia
      ? getPenunjukanPenyediaContentHtml()
      : isSpk
      ? getSpkContentHtml()
      : getSuratUndanganContentHtml();

  const getDocumentHtml = (enablePagination = true) => `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentName)}</title>
        <style>
          @page { size: A4; margin: 0; }
          html, body { margin: 0; padding: 0; background: #f1f5f9; }
          body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; line-height: 1.15; }
          p { margin: 0 0 6px; text-align: justify; }
          table { border-collapse: collapse; width: 100%; font-size: 9pt; }
          .doc-page { position: relative; box-sizing: border-box; width: 210mm; height: 297mm; margin: 2mm auto 10mm; padding: 8mm 24mm ${pagePaddingBottom}; background: #fff; box-shadow: 0 8px 26px rgba(15, 23, 42, 0.16); display: flex; flex-direction: column; overflow: hidden; }
          .page-header, .page-footer { flex: 0 0 auto; }
          .page-footer-full { position: absolute; left: 0; right: 0; bottom: 0; overflow: hidden; }
          .page-footer-full img { display: block; width: 100%; height: 100%; }
          .document-content { box-sizing: border-box; flex: 1 1 auto; overflow: hidden; padding: 0 ${documentBodyInset}px; }
          .content-block { break-inside: avoid; page-break-inside: avoid; }
          .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12mm; margin-bottom: 22px; }
          .top-meta { width: 92mm; flex: 0 0 92mm; }
          .top-meta td:last-child { white-space: nowrap; }
          .top-date { white-space: nowrap; text-align: right; }
          .meta td { padding: 0 4px 2px 0; vertical-align: top; }
          .strong { font-weight: 700; }
          .mb { margin-bottom: 10px; }
          .subject { margin-top: 24px; margin-bottom: 20px; }
          .row-table td { padding: 0 6px 3px 0; vertical-align: top; }
          .meta-label { width: 25mm; white-space: nowrap; }
          .number-cell { width: 7mm; white-space: nowrap; }
          .colon-label { width: 46mm; white-space: nowrap; }
          .colon-mark { width: 4mm; text-align: center; white-space: nowrap; }
          .activity { table-layout: fixed; margin-top: 18px; }
          .activity th, .activity td { border: 1.5px solid #000; padding: 2px 5px; vertical-align: top; }
          .activity th:nth-child(1), .activity td:nth-child(1) { width: 8mm; }
          .activity th:nth-child(3), .activity td:nth-child(3) { width: 38mm; }
          .activity th:nth-child(4), .activity td:nth-child(4) { width: 48mm; }
          .activity td:nth-child(3), .activity td:nth-child(4) { white-space: nowrap; }
          .address-indent { margin-left: 16px; }
          .activity th { text-align: center; font-weight: 700; }
          .signature { margin-top: 18px; display: flex; justify-content: flex-end; }
          .signature-inner { width: 64mm; text-align: center; }
          .ba-document { padding: 12mm 4mm 0; font-size: 9pt; line-height: 1.22; }
          .ba-title-block { margin-bottom: 22px; text-align: center; }
          .ba-title-block h1 { margin: 0 0 3px; font-size: 13pt; font-weight: 700; text-decoration: underline; }
          .ba-number { display: inline-block; min-width: 45mm; text-align: left; }
          .ba-meta { margin-bottom: 16px; }
          .ba-meta td { padding: 0 4px 4px 0; vertical-align: top; }
          .ba-meta td:nth-child(1) { width: 38mm; white-space: nowrap; }
          .ba-meta td:nth-child(2) { width: 4mm; text-align: center; }
          .ba-paragraph { margin: 0 0 14px; text-align: justify; }
          .ba-list { margin: 0 0 18px 4mm; width: calc(100% - 4mm); }
          .ba-list td { padding: 0 4px 4px 0; vertical-align: top; }
          .ba-list td:nth-child(1) { width: 7mm; }
          .ba-list td:nth-child(2) { width: 78mm; }
          .ba-list td:nth-child(3) { width: 4mm; text-align: center; }
          .ba-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20mm; margin-top: 30mm; text-align: center; }
          .ba-signature-left, .ba-signature-right { display: flex; min-height: 38mm; flex-direction: column; }
          .ba-signature-space { flex: 1 1 auto; min-height: 24mm; }
          .bp-document { padding: 3mm 0 0; font-size: 9pt; line-height: 1.2; }
          .bp-title-block { margin-bottom: 14mm; text-align: center; }
          .bp-title-block h1 { margin: 0; font-size: 13pt; font-weight: 700; text-decoration: underline; }
          .bp-meta { margin-bottom: 8mm; }
          .bp-meta td { padding: 0 5px 3px 0; vertical-align: top; }
          .bp-meta td:nth-child(1) { width: 28mm; white-space: nowrap; }
          .bp-meta td:nth-child(2) { width: 4mm; text-align: center; }
          .bp-table { table-layout: fixed; margin-top: 2mm; border: 1.5px solid #000; box-sizing: border-box; }
          .bp-table th, .bp-table td { border: 1.5px solid #000; padding: 3px 4px; text-align: center; vertical-align: middle; }
          .bp-table th { font-weight: 400; }
          .bp-table th:nth-child(1), .bp-table td:nth-child(1) { width: 7%; }
          .bp-table th:nth-child(2), .bp-table td:nth-child(2) { width: 24%; }
          .bp-table th:nth-child(3), .bp-table td:nth-child(3) { width: 22%; }
          .bp-table th:nth-child(4), .bp-table td:nth-child(4) { width: 21%; }
          .bp-table th:nth-child(5), .bp-table td:nth-child(5) { width: 26%; border-right: 1.5px solid #000; }
          .bp-table tbody td { height: 22mm; }
          .bp-signature { display: flex; justify-content: flex-end; margin-top: 8mm; }
          .bp-signature-inner { width: 64mm; text-align: center; }
          .bp-signature-space { height: 24mm; }
          .bapp-document { padding: 2mm 0 0; font-size: 8.5pt; line-height: 1.25; }
          .bapp-title-block { margin-bottom: 12px; text-align: center; }
          .bapp-title-block h1 { margin: 0 0 2px; font-size: 11.5pt; font-weight: 700; text-decoration: underline; }
          .bapp-doc-number { font-size: 8.5pt; }
          .bapp-number { display: inline-block; min-width: 40mm; text-align: left; }
          .bapp-meta-date { margin-bottom: 8px; width: 100%; }
          .bapp-meta-date td { padding: 0 3px 2px 0; vertical-align: top; }
          .bapp-label-date { width: 32mm; white-space: nowrap; }
          .bapp-colon { width: 3mm; text-align: center; }
          .bapp-section-intro { margin: 5px 0 2px; }
          .bapp-section-intro p { margin: 0; }
          .bapp-meta-job { margin-bottom: 5px; width: 100%; }
          .bapp-meta-job td { padding: 0 3px 2px 0; vertical-align: top; }
          .bapp-label-job { width: 38mm; white-space: nowrap; }
          .bapp-result-item { margin-bottom: 3px; }
          .bapp-subtable { width: 100%; }
          .bapp-subtable td { padding: 0 3px 2px 0; vertical-align: top; }
          .bapp-num-cell { width: 5mm; vertical-align: top; }
          .bapp-sublabel-long { width: 95mm; }
          .bapp-sublabel { width: 45mm; }
          .bapp-signature { display: flex; justify-content: flex-end; margin-top: 12px; }
          .bapp-signature-inner { width: 68mm; text-align: center; font-size: 8.5pt; }
          .bapp-signature-space { height: 18mm; }
          .ttp-document { padding: 4mm 0 0; font-size: 9pt; line-height: 1.25; }
          .ttp-title-block { margin-bottom: 16px; text-align: center; }
          .ttp-title-block h1 { margin: 0; font-size: 12pt; font-weight: 700; text-decoration: underline; }
          .ttp-meta { margin-bottom: 12px; width: 100%; }
          .ttp-meta td { padding: 0 4px 3px 0; vertical-align: top; }
          .ttp-label { width: 30mm; white-space: nowrap; }
          .ttp-colon { width: 3mm; text-align: center; }
          .ttp-table { table-layout: fixed; margin-top: 6px; border: 1.5px solid #000; box-sizing: border-box; }
          .ttp-table th, .ttp-table td { border: 1.5px solid #000; padding: 4px 6px; text-align: center; vertical-align: middle; }
          .ttp-table th { font-weight: 400; font-size: 9pt; }
          .ttp-table tbody td { height: 26mm; font-size: 9pt; }
          .ttp-signature { display: flex; justify-content: flex-end; margin-top: 16px; }
          .ttp-signature-inner { width: 68mm; text-align: center; font-size: 9pt; }
          .ttp-signature-space { height: 22mm; }
          .bae-document { padding: 1mm 0 0; font-size: 8pt; line-height: 1.2; }
          .bae-title-block { margin-bottom: 8px; text-align: center; }
          .bae-title-block h1 { margin: 0 0 2px; font-size: 10.5pt; font-weight: 700; text-decoration: underline; }
          .bae-doc-number { font-size: 8pt; }
          .bae-number { display: inline-block; min-width: 40mm; text-align: left; }
          .bae-opening { margin-bottom: 4px; }
          .bae-meta-date { margin: 2px 0 3px; width: 100%; }
          .bae-meta-date td { padding: 0 3px 1px 0; vertical-align: top; font-size: 8pt; }
          .bae-label-date { width: 22mm; white-space: nowrap; }
          .bae-colon { width: 3mm; text-align: center; }
          .bae-section-intro { margin: 3px 0; font-size: 8pt; }
          .bae-section-intro p { margin: 0 0 2px; text-align: justify; }
          .bae-meta-inline { margin: 1px 0 3px; width: 100%; }
          .bae-meta-inline td { padding: 0 3px 1px 0; vertical-align: top; font-size: 8pt; }
          .bae-label-job { width: 42mm; white-space: nowrap; }
          .bae-eval-section { margin-top: 5px; }
          .bae-eval-title { font-weight: 700; margin-bottom: 2px; font-size: 8pt; }
          .bae-table { table-layout: fixed; width: 100%; border: 1.2px solid #000; box-sizing: border-box; }
          .bae-table th, .bae-table td { border: 1.2px solid #000; padding: 2px 3px; text-align: center; vertical-align: middle; font-size: 7.5pt; }
          .bae-table th { font-weight: 400; background: #fff; }
          .bae-table tbody td { height: 4.5mm; }
          .bae-signature { display: flex; justify-content: flex-end; margin-top: 8px; }
          .bae-signature-inner { width: 68mm; text-align: center; font-size: 8pt; }
          .bae-signature-space { height: 15mm; }
          .ukn-salam { margin: 0 0 10px; font-style: italic; font-weight: 700; }
          .bakn-list td:nth-child(2) { width: auto; }
          .hpl-document { padding: 3mm 0 0; font-size: 9pt; line-height: 1.25; }
          .hpl-title-block { margin-bottom: 10px; text-align: center; }
          .hpl-title-block h1 { margin: 0 0 3px; font-size: 13pt; font-weight: 700; text-decoration: underline; }
          .hpl-table { table-layout: fixed; margin: 8px 0; border: 1.2px solid #000; box-sizing: border-box; }
          .hpl-table th, .hpl-table td { border: 1.2px solid #000; padding: 3px 4px; text-align: center; vertical-align: middle; font-size: 8pt; word-wrap: break-word; }
          .hpl-table th { font-weight: 400; }
          .hpl-table th:nth-child(1), .hpl-table td:nth-child(1) { width: 6%; }
          .hpl-table th:nth-child(2), .hpl-table td:nth-child(2) { width: 20%; text-align: left; }
          .hpl-table th:nth-child(3), .hpl-table td:nth-child(3) { width: 18%; text-align: left; }
          .hpl-table th:nth-child(8), .hpl-table td:nth-child(8) { width: 10%; }
          .hpl-note { margin: 4px 0 14px; }
          .hpl-summary td { padding: 0 6px 3px 0; vertical-align: top; }
          .hpl-summary td:nth-child(1) { width: 58mm; white-space: nowrap; }
          .hpl-summary td:nth-child(2) { width: 4mm; text-align: center; }
          .upper { text-transform: uppercase; }
          .pp-document { padding: 4mm 0 0; font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.3; }
          .pp-document table { font-size: 11pt; }
          .pp-date { margin-bottom: 8mm; text-align: right; }
          .pp-meta td { padding: 0 6px 2px 0; vertical-align: top; }
          .pp-meta td:nth-child(1) { width: 20mm; white-space: nowrap; }
          .pp-meta td:nth-child(2) { width: 5mm; text-align: center; }
          .pp-recipient { margin: 12mm 0 7mm; }
          .pp-indent-1 { padding-left: 6mm; }
          .pp-indent-2 { padding-left: 18mm; }
          .pp-subject { margin-bottom: 7mm; }
          .pp-paragraph { margin: 0 0 4mm; text-align: justify; }
          .pp-signature { display: flex; justify-content: flex-end; margin-top: 14mm; }
          .pp-signature-inner { width: 74mm; text-align: center; }
          .pp-signature-space { height: 26mm; }
          .spk-document { padding: 4mm 0 0; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; line-height: 1.3; }
          .spk-table { table-layout: fixed; border: 1.5px solid #000; font-size: 10.5pt; }
          .spk-table td { border: 1.5px solid #000; padding: 3px 5px; vertical-align: top; }
          .spk-title { font-size: 15pt; font-weight: 700; text-align: center; vertical-align: middle !important; }
          .spk-company { text-align: center; }
          .spk-field-grid { display: grid; grid-template-columns: 36mm 4mm 1fr; }
          .spk-inline { display: grid; grid-template-columns: max-content auto 1fr; column-gap: 6px; }
          .spk-middle { vertical-align: middle !important; }
          .spk-reference { height: 12mm; }
          .spk-roomy { padding-top: 3mm !important; padding-bottom: 3mm !important; }
          .spk-sign { display: flex; min-height: 50mm; flex-direction: column; text-align: center; }
          .spk-sign-space { flex: 1 1 auto; min-height: 20mm; }
          .document-source, template { display: none; }
          @media print {
            html, body { background: #fff; }
            .doc-page { margin: 0; box-shadow: none; page-break-after: always; }
          .doc-page:last-child { page-break-after: auto; }
            .static-document .doc-page { height: auto; min-height: 297mm; overflow: visible; display: block; }
          }
          .static-document .doc-page { height: auto; min-height: 297mm; overflow: visible; display: block; }
        </style>
      </head>
      <body class="${enablePagination ? 'browser-document' : 'static-document'}">
        ${
          enablePagination
            ? `
              <template id="page-header-template">${getHeaderHtml()}</template>
              <template id="page-footer-template">${getFooterHtml()}</template>
              <div id="document-source" class="document-source">${getDocumentContentHtml()}</div>
              <div id="page-root"></div>

              <script>
                (async () => {
                  const root = document.getElementById('page-root');
                  const source = document.getElementById('document-source');
                  const headerTemplate = document.getElementById('page-header-template');
                  const footerTemplate = document.getElementById('page-footer-template');
                  const waitForImages = (target) =>
                    Promise.all(
                      Array.from(target.querySelectorAll('img')).map((image) => {
                        if (image.complete) return Promise.resolve();

                        return new Promise((resolve) => {
                          image.addEventListener('load', resolve, { once: true });
                          image.addEventListener('error', resolve, { once: true });
                        });
                      })
                    );

                  const fillTemplate = (target, template) => {
                    if (!target || !template) return;
                    target.appendChild(template.content.cloneNode(true));
                  };

                  const createPage = () => {
                    const page = document.createElement('div');
                    page.className = 'doc-page';

                    const header = document.createElement('div');
                    header.className = 'page-header';
                    fillTemplate(header, headerTemplate);

                    const content = document.createElement('div');
                    content.className = 'document-content';

                    const footer = document.createElement('div');
                    footer.className = 'page-footer';
                    fillTemplate(footer, footerTemplate);

                    page.appendChild(header);
                    page.appendChild(content);
                    page.appendChild(footer);
                    root.appendChild(page);

                    return content;
                  };

                  let currentContent = createPage();
                  Array.from(source.children).forEach((block) => {
                    const clone = block.cloneNode(true);
                    currentContent.appendChild(clone);

                    if (
                      currentContent.scrollHeight > currentContent.clientHeight + 1 &&
                      currentContent.children.length > 1
                    ) {
                      clone.remove();
                      currentContent = createPage();
                      currentContent.appendChild(clone);
                    }
                  });

                  source.remove();
                  await waitForImages(root);
                  window.__sipintarDocumentReady = true;
                })();
              </script>
            `
            : `
              <div class="doc-page">
                <div class="page-header">${getHeaderHtml()}</div>
                <div class="document-content">${getDocumentContentHtml()}</div>
                <div class="page-footer">${getFooterHtml()}</div>
              </div>
            `
        }
      </body>
    </html>
  `;

  const downloadPdf = () => {
    const printFrame = document.createElement('iframe');

    printFrame.style.position = 'fixed';
    printFrame.style.left = '-210mm';
    printFrame.style.top = '0';
    printFrame.style.width = '210mm';
    printFrame.style.height = '297mm';
    printFrame.style.border = '0';
    printFrame.style.opacity = '0';
    printFrame.style.pointerEvents = 'none';
    printFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printFrame);

    const printDocument = printFrame.contentWindow?.document;
    if (!printDocument) {
      printFrame.remove();
      return;
    }

    printFrame.onload = () => {
      const printWindow = printFrame.contentWindow;
      if (!printWindow) {
        printFrame.remove();
        return;
      }

      const printWhenReady = () => {
        const readyWindow = printWindow as Window & {
          __sipintarDocumentReady?: boolean;
        };

        if (!readyWindow.__sipintarDocumentReady) {
          window.setTimeout(printWhenReady, 100);
          return;
        }

        printWindow.focus();
        printWindow.print();

        window.setTimeout(() => {
          printFrame.remove();
        }, 1000);
      };

      printWhenReady();
    };

    printDocument.open();
    printDocument.write(getDocumentHtml());
    printDocument.close();
  };

  if (memuat) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="inline-flex items-center gap-2 text-sm text-body dark:text-bodydark">
          <FiLoader className="animate-spin" size={18} />
          Memuat dokumen...
        </span>
      </div>
    );
  }

  if (muatError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-danger">{muatError}</p>
        <Link
          to="/pengadaan"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:opacity-80"
        >
          <FiArrowLeft size={16} />
          Kembali ke Daftar Pengadaan
        </Link>
      </div>
    );
  }

  return (
    <PegawaiOptionsContext.Provider value={daftarPegawai}>
      <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:opacity-80"
            >
              <FiArrowLeft size={16} />
              Kembali ke Dashboard
            </Link>
          </div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            {isPreview ? 'Lihat Dokumen' : 'Buka Dokumen'}
          </h2>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            {pengadaanTitle}
          </p>
        </div>

        <div className="rounded-sm border border-stroke bg-white px-4 py-3 shadow-default dark:border-strokedark dark:bg-boxdark">
          <p className="text-xs font-medium uppercase text-body dark:text-bodydark">
            Nomor Dokumen
          </p>
          {isPreview ? (
            <p className="mt-1 text-sm font-semibold text-black dark:text-white">
              {nomorDokumen}
            </p>
          ) : (
            <input
              type="text"
              value={nomorDokumen}
              onChange={(event) => setNomorDokumen(event.target.value)}
              className="mt-2 w-full min-w-[230px] rounded border border-stroke bg-white px-3 py-2 text-sm font-semibold text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded bg-primary/10 text-primary">
            <FiFileText size={24} />
          </div>
          <h3 className="text-lg font-semibold text-black dark:text-white">
            {documentName}
          </h3>
          <div className="mt-5 space-y-3">
            <div className="rounded bg-gray-2 px-4 py-3 dark:bg-meta-4">
              <p className="text-xs font-medium uppercase text-body dark:text-bodydark">
                Tanggal Pelaksana
              </p>
              <p className="mt-1 text-sm font-semibold text-black dark:text-white">
                {formatTanggalIndonesia()}
              </p>
            </div>
            <div className="rounded bg-gray-2 px-4 py-3 dark:bg-meta-4">
              <p className="text-xs font-medium uppercase text-body dark:text-bodydark">
                Status
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                Tersedia sebagai dummy
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex flex-col gap-4 border-b border-stroke px-5 py-4 dark:border-strokedark sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-black dark:text-white">
                {isPreview ? 'Pratinjau Dokumen' : 'Ruang Dokumen'}
              </h3>
              <p className="mt-1 text-sm text-body dark:text-bodydark">
                {isPreview
                  ? 'Tampilan dokumen pengadaan yang dipilih.'
                  : 'Area untuk membuka dan mengelola dokumen pengadaan.'}
              </p>
            </div>

            <div className="flex gap-2">
              {!isPreview && dokumenTerhubung && (
                <button
                  type="button"
                  onClick={simpanDokumen}
                  disabled={menyimpan}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded border border-primary px-4 text-sm font-medium text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {menyimpan ? (
                    <FiLoader className="animate-spin" size={18} />
                  ) : (
                    <FiSave size={18} />
                  )}
                  {sudahDisimpan ? 'Perbarui Dokumen' : 'Simpan Dokumen'}
                </button>
              )}
              {(isSuratUndangan ||
                isBeritaAcaraPenjelasan ||
                isBuktiPengambilan ||
                isBeritaAcaraPemasukanDanPembukaanDokumen ||
                isTandaTerimaPemasukanDokumen ||
                isBeritaAcaraEvaluasiDokumen ||
                isUndanganKlarifikasi ||
                isBeritaKlarifikasi ||
                isHasilPengadaan ||
                isPenunjukanPenyedia ||
                isSpk) && (
                <button
                  type="button"
                  onClick={openResultModal}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-white transition hover:bg-opacity-90"
                >
                  <FiEye size={18} />
                  Lihat Hasil Dokumen
                </button>
              )}
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded border border-stroke text-body transition hover:border-primary hover:text-primary dark:border-strokedark dark:text-bodydark"
                title="Download Dokumen"
                aria-label="Download Dokumen"
              >
                <FiDownload size={18} />
              </button>
            </div>
          </div>

          <div className="p-5">
            {isPreview ? (
              <div className="mx-auto max-w-3xl rounded border border-stroke bg-whiten p-6 dark:border-strokedark dark:bg-boxdark-2">
                <div className="mb-6 flex items-center justify-between border-b border-stroke pb-4 dark:border-strokedark">
                  <div>
                    <p className="text-xs font-semibold uppercase text-primary">
                      SIPINTAR
                    </p>
                    <h4 className="mt-1 text-lg font-bold text-black dark:text-white">
                      {documentName}
                    </h4>
                  </div>
                  <FiEye className="text-primary" size={24} />
                </div>
                <div className="space-y-4 text-sm leading-6 text-black dark:text-white">
                  <p>
                    Nomor dokumen:{' '}
                    <strong>{nomorDokumen}</strong>
                  </p>
                  <p>
                    Tanggal pelaksana:{' '}
                    <strong>{formatTanggalIndonesia()}</strong>
                  </p>
                  <p>
                    Dokumen ini merupakan bagian dari proses {pengadaanTitle}.
                    Konten pada halaman ini masih berupa pratinjau dummy untuk
                    kebutuhan tampilan aplikasi.
                  </p>
                </div>
              </div>
              // Form All Document
            ) : isSuratUndangan ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Lampiran"
                    value={form.lampiran}
                    onChange={(value) => updateForm('lampiran', value)}
                  />
                  <TextInput
                    label="Kepada Yth."
                    value={form.kepadaYth}
                    onChange={(value) => updateForm('kepadaYth', value)}
                  />
                  <TextInput
                    label="di -"
                    value={form.di}
                    onChange={(value) => updateForm('di', value)}
                  />
                  <TextInput
                    label="Email"
                    value={form.email}
                    onChange={(value) => updateForm('email', value)}
                    type="email"
                  />
                  <TextInput
                    label="Perihal"
                    value={form.perihal}
                    onChange={(value) => updateForm('perihal', value)}
                  />
                  <TextInput
                    label="Nama Paket Pekerjaan"
                    value={form.namaPaketPekerjaan}
                    onChange={(value) =>
                      updateForm('namaPaketPekerjaan', value)
                    }
                  />
                  <TextInput
                    label="Tempat Surat"
                    value={form.tempatSurat}
                    onChange={(value) => updateForm('tempatSurat', value)}
                  />
                  <div>
                    <TextInput
                      label="Tanggal Surat"
                      type="date"
                      value={form.tanggalSurat}
                      onChange={(value) => updateForm('tanggalSurat', value)}
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {form.tempatSurat},{' '}
                      {formatDateOnlyFromInput(form.tanggalSurat)}
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                      Nilai Total HPS
                    </label>
                    <div className="flex overflow-hidden rounded border border-stroke bg-white focus-within:border-primary dark:border-form-strokedark dark:bg-form-input">
                      <span className="flex items-center border-r border-stroke bg-gray-2 px-4 text-sm font-semibold text-black dark:border-form-strokedark dark:bg-meta-4 dark:text-white">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatRupiahText(form.nilaiTotalHps)}
                        onChange={(event) =>
                          updateForm(
                            'nilaiTotalHps',
                            event.target.value.replace(/\D/g, '')
                          )
                        }
                        className="w-full bg-transparent px-4 py-3 text-sm text-black outline-none dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <TextInput
                      label="Hari Pelaksanaan"
                      type="date"
                      value={form.hariPelaksanaan}
                      onChange={(value) =>
                        updateForm('hariPelaksanaan', value)
                      }
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatDateFromInput(form.hariPelaksanaan)}
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                      Waktu Pelaksanaan
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="time"
                        value={form.waktuMulai}
                        onChange={(event) =>
                          updateForm('waktuMulai', event.target.value)
                        }
                        className="w-full rounded border border-stroke bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                      />
                      <input
                        type="time"
                        value={form.waktuSelesai}
                        onChange={(event) =>
                          updateForm('waktuSelesai', event.target.value)
                        }
                        className="w-full rounded border border-stroke bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                      />
                    </div>
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatTimeWita(form.waktuMulai)} WITA s.d{' '}
                      {formatTimeWita(form.waktuSelesai)} WITA
                    </p>
                  </div>
                  <TextInput
                    label="Tempat Pelaksanaan"
                    value={form.tempatPelaksanaan}
                    onChange={(value) =>
                      updateForm('tempatPelaksanaan', value)
                    }
                  />
                </div>

                <div className="rounded border border-stroke p-5 dark:border-strokedark">
                  <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                    Kegiatan
                  </h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <TextInput
                      label="Nama Kegiatan"
                      value={form.namaKegiatan}
                      onChange={(value) => updateForm('namaKegiatan', value)}
                    />
                    <div>
                      <TextInput
                        label="Tanggal"
                        type="date"
                        value={form.tanggalKegiatan}
                        onChange={(value) =>
                          updateForm('tanggalKegiatan', value)
                        }
                      />
                      <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                        {formatDateFromInput(form.tanggalKegiatan)}
                      </p>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                        Waktu
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          type="time"
                          value={form.waktuKegiatanMulai}
                          onChange={(event) =>
                            updateForm(
                              'waktuKegiatanMulai',
                              event.target.value
                            )
                          }
                          className="w-full rounded border border-stroke bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                        />
                        <input
                          type="time"
                          value={form.waktuKegiatanSelesai}
                          onChange={(event) =>
                            updateForm(
                              'waktuKegiatanSelesai',
                              event.target.value
                            )
                          }
                          className="w-full rounded border border-stroke bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                        />
                      </div>
                      <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                        {formatTimeWita(form.waktuKegiatanMulai)} WITA s.d{' '}
                        {formatTimeWita(form.waktuKegiatanSelesai)} WITA
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TextArea
                    label="Keterangan Tujuan Dokumen"
                    value={form.keteranganTujuan}
                    onChange={(value) =>
                      updateForm('keteranganTujuan', value)
                    }
                  />
                  <TextArea
                    label="Keterangan Permohonan"
                    value={form.keteranganPermohonan}
                    onChange={(value) =>
                      updateForm('keteranganPermohonan', value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Pejabat Pengadaan Barang/Jasa PT BPR NTB PESERODA
                  </label>
                  <select
                    value={form.penandaTangan}
                    onChange={(event) =>
                      updateForm('penandaTangan', event.target.value)
                    }
                    className="w-full rounded border border-stroke bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                  >
                    <option value="">Pilih pegawai</option>
                    {daftarPegawai.map((pegawai) => (
                      <option key={pegawai.id} value={pegawai.id}>
                        {pegawai.nama} - NRP : {pegawai.nrp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : isBeritaAcaraPenjelasan ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <TextInput
                      label="Hari / Tanggal"
                      type="date"
                      value={form.beritaTanggal}
                      onChange={(value) => updateForm('beritaTanggal', value)}
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatDateFromInput(form.beritaTanggal)}
                    </p>
                  </div>

                  <div>
                    <TextInput
                      label="Pukul"
                      type="time"
                      value={form.beritaPukul}
                      onChange={(value) => updateForm('beritaPukul', value)}
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatTimeWita(form.beritaPukul)} WITA
                    </p>
                  </div>

                  <TextInput
                    label="Tempat"
                    value={form.beritaTempat}
                    onChange={(value) => updateForm('beritaTempat', value)}
                  />

                  <TextInput
                    label="Peserta"
                    value={form.beritaPeserta}
                    onChange={(value) => updateForm('beritaPeserta', value)}
                  />

                  <TextInput
                    label="Nama Penjelasan Pekerjaan"
                    value={form.beritaNamaPenjelasanPekerjaan}
                    onChange={(value) =>
                      updateForm('beritaNamaPenjelasanPekerjaan', value)
                    }
                  />

                  <PbjSelect
                    label="Rapat dipimpin oleh PPK"
                    value={form.beritaRapatDipimpinPpk}
                    options={selectedPengadaan.ppk}
                    onChange={(value) =>
                      updateForm('beritaRapatDipimpinPpk', value)
                    }
                  />

                  <PbjSelect
                    label="Penjelasan Umum/Administrasi diberikan Oleh PPBJ"
                    value={form.beritaPenjelasanAdministrasiPpbj}
                    options={selectedPengadaan.pbj}
                    onChange={(value) =>
                      updateForm('beritaPenjelasanAdministrasiPpbj', value)
                    }
                  />

                  <PbjSelect
                    label="Penjelasan Teknik diberikan oleh PPBJ"
                    value={form.beritaPenjelasanTeknikPpbj}
                    options={selectedPengadaan.pbj}
                    onChange={(value) =>
                      updateForm('beritaPenjelasanTeknikPpbj', value)
                    }
                  />

                  <PbjSelect
                    label="Rapat Tanya Jawab"
                    value={form.beritaRapatTanyaJawab}
                    options={selectedPengadaan.pbj}
                    onChange={(value) =>
                      updateForm('beritaRapatTanyaJawab', value)
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TextArea
                    label="Keterangan Awal"
                    value={form.beritaKeteranganAwal}
                    onChange={(value) =>
                      updateForm('beritaKeteranganAwal', value)
                    }
                  />
                  <TextArea
                    label="Keterangan Tujuan"
                    value={form.beritaKeteranganTujuan}
                    onChange={(value) =>
                      updateForm('beritaKeteranganTujuan', value)
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded border border-stroke p-5 dark:border-strokedark">
                    <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                      Penanda Tangan Penyedia
                    </h4>
                    <div className="space-y-3">
                      <div className="rounded bg-gray-2 px-4 py-3 dark:bg-meta-4">
                        <p className="text-xs font-medium uppercase text-body dark:text-bodydark">
                          {selectedPengadaan.namaPenyedia}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-black dark:text-white">
                          {selectedPengadaan.namaDirektur}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded border border-stroke p-5 dark:border-strokedark md:justify-self-end md:w-full">
                    <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                      Penanda Tangan PBJ
                    </h4>
                    <PbjSelect
                      label="Pejabat Pengadaan Barang/Jasa PT BPR NTB PESERODA"
                      value={form.beritaPenandaTangan}
                      options={selectedPengadaan.pbj}
                      onChange={(value) =>
                        updateForm('beritaPenandaTangan', value)
                      }
                    />
                  </div>
                </div>
              </div>
            ) : isBuktiPengambilan ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Pekerjaan"
                    value={form.buktiPekerjaan}
                    onChange={(value) => updateForm('buktiPekerjaan', value)}
                  />

                  <div>
                    <TextInput
                      label="Hari / Tanggal"
                      type="date"
                      value={form.buktiTanggal}
                      onChange={(value) => updateForm('buktiTanggal', value)}
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatDateFromInput(form.buktiTanggal)}
                    </p>
                  </div>

                  <div>
                    <TextInput
                      label="Waktu"
                      type="time"
                      value={form.buktiWaktu}
                      onChange={(value) => updateForm('buktiWaktu', value)}
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatTimeWita(form.buktiWaktu)} WITA
                    </p>
                  </div>

                  <TextInput
                    label="Nama Perusahaan"
                    value={form.buktiNamaPerusahaan}
                    onChange={(value) =>
                      updateForm('buktiNamaPerusahaan', value)
                    }
                  />

                  <TextInput
                    label="Nama Pejabat Perusahaan"
                    value={form.buktiNamaPejabatPerusahaan}
                    onChange={(value) =>
                      updateForm('buktiNamaPejabatPerusahaan', value)
                    }
                  />

                  <TextInput
                    label="Jabatan Pejabat"
                    value={form.buktiJabatanPejabat}
                    onChange={(value) =>
                      updateForm('buktiJabatanPejabat', value)
                    }
                  />
                </div>

                <div className="rounded border border-stroke p-5 dark:border-strokedark md:ml-auto md:max-w-xl">
                  <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                    Penanda Tangan
                  </h4>
                  <PbjSelect
                    label="Pejabat Pengadaan Barang/Jasa PT BPR NTB PESERODA"
                    value={form.buktiPenandaTangan}
                    options={selectedPengadaan.pbj}
                    onChange={(value) =>
                      updateForm('buktiPenandaTangan', value)
                    }
                  />
                </div>
              </div>
            ) : isBeritaAcaraPemasukanDanPembukaanDokumen ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <TextInput
                      label="Tanggal Berita Acara"
                      type="date"
                      value={form.baPemasukanTanggalDokumen}
                      onChange={(value) =>
                        updateForm('baPemasukanTanggalDokumen', value)
                      }
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {(() => {
                        const parts = getDatePartsIndonesia(
                          form.baPemasukanTanggalDokumen
                        );
                        return `${parts.hari}, ${parts.tanggal} ${parts.bulan} ${parts.tahun}`;
                      })()}
                    </p>
                  </div>

                  <div>
                    <TextInput
                      label="Pukul"
                      type="time"
                      value={form.baPemasukanPukul}
                      onChange={(value) =>
                        updateForm('baPemasukanPukul', value)
                      }
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatTimeWita(form.baPemasukanPukul)} WITA
                    </p>
                  </div>

                  <TextInput
                    label="Pengadaan Pekerjaan"
                    value={form.baPemasukanNamaPekerjaan}
                    onChange={(value) =>
                      updateForm('baPemasukanNamaPekerjaan', value)
                    }
                  />

                  <TextInput
                    label="Pejabat Pengadaan"
                    value={form.baPemasukanPejabatPengadaan}
                    onChange={(value) =>
                      updateForm('baPemasukanPejabatPengadaan', value)
                    }
                  />

                  <TextInput
                    label="Penyedia Barang / Jasa"
                    value={form.baPemasukanPenyedia}
                    onChange={(value) =>
                      updateForm('baPemasukanPenyedia', value)
                    }
                  />

                  <div>
                    <TextInput
                      label="Tanggal Pemasukan Dokumen Penawaran"
                      type="date"
                      value={form.baPemasukanTanggalPemasukan}
                      onChange={(value) =>
                        updateForm('baPemasukanTanggalPemasukan', value)
                      }
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatDateFromInput(form.baPemasukanTanggalPemasukan)}
                    </p>
                  </div>

                  <TextInput
                    label="Masa Berlaku Penawaran"
                    value={form.baPemasukanMasaBerlaku}
                    onChange={(value) =>
                      updateForm('baPemasukanMasaBerlaku', value)
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                      Nilai Penawaran
                    </label>
                    <div className="flex overflow-hidden rounded border border-stroke bg-white focus-within:border-primary dark:border-form-strokedark dark:bg-form-input">
                      <span className="flex items-center border-r border-stroke bg-gray-2 px-4 text-sm font-semibold text-black dark:border-form-strokedark dark:bg-meta-4 dark:text-white">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatRupiahText(form.baPemasukanNilaiPenawaran)}
                        onChange={(event) =>
                          updateForm(
                            'baPemasukanNilaiPenawaran',
                            event.target.value.replace(/\D/g, '')
                          )
                        }
                        className="w-full bg-transparent px-4 py-3 text-sm text-black outline-none dark:text-white"
                      />
                    </div>
                  </div>

                  <TextInput
                    label="Rincian Harga"
                    value={form.baPemasukanRincianHarga}
                    onChange={(value) =>
                      updateForm('baPemasukanRincianHarga', value)
                    }
                  />

                  <TextInput
                    label="Keterangan"
                    value={form.baPemasukanKeterangan}
                    onChange={(value) =>
                      updateForm('baPemasukanKeterangan', value)
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded border border-stroke p-5 dark:border-strokedark">
                    <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                      Penyedia Barang/Jasa
                    </h4>
                    <div className="space-y-3">
                      <div className="rounded bg-gray-2 px-4 py-3 dark:bg-meta-4">
                        <p className="text-xs font-medium uppercase text-body dark:text-bodydark">
                          Nama Rekanan
                        </p>
                        <p className="mt-1 text-sm font-semibold text-black dark:text-white">
                          {form.baPemasukanPenyedia}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded border border-stroke p-5 dark:border-strokedark md:justify-self-end md:w-full">
                    <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                      Penanda Tangan PBJ
                    </h4>
                    <PbjSelect
                      label="Pejabat Pengadaan Barang/Jasa PT BPR NTB PERSERODA"
                      value={form.baPemasukanPenandaTangan}
                      options={selectedPengadaan.pbj}
                      onChange={(value) =>
                        updateForm('baPemasukanPenandaTangan', value)
                      }
                    />
                  </div>
                </div>
              </div>
            ) : isTandaTerimaPemasukanDokumen ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Pekerjaan"
                    value={form.tandaTerimaPekerjaan}
                    onChange={(value) =>
                      updateForm('tandaTerimaPekerjaan', value)
                    }
                  />

                  <div>
                    <TextInput
                      label="Hari / Tanggal"
                      type="date"
                      value={form.tandaTerimaTanggal}
                      onChange={(value) =>
                        updateForm('tandaTerimaTanggal', value)
                      }
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatDateFromInput(form.tandaTerimaTanggal)}
                    </p>
                  </div>

                  <div>
                    <TextInput
                      label="Waktu"
                      type="time"
                      value={form.tandaTerimaWaktu}
                      onChange={(value) =>
                        updateForm('tandaTerimaWaktu', value)
                      }
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatTimeWita(form.tandaTerimaWaktu)} WITA
                    </p>
                  </div>

                  <TextInput
                    label="Nama Perusahaan"
                    value={form.tandaTerimaNamaPerusahaan}
                    onChange={(value) =>
                      updateForm('tandaTerimaNamaPerusahaan', value)
                    }
                  />

                  <TextInput
                    label="Nama Pejabat / Perwakilan"
                    value={form.tandaTerimaNamaPejabat}
                    onChange={(value) =>
                      updateForm('tandaTerimaNamaPejabat', value)
                    }
                  />

                  <TextInput
                    label="Jabatan"
                    value={form.tandaTerimaJabatan}
                    onChange={(value) =>
                      updateForm('tandaTerimaJabatan', value)
                    }
                  />
                </div>

                <div className="rounded border border-stroke p-5 dark:border-strokedark md:ml-auto md:max-w-xl">
                  <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                    Penanda Tangan PBJ
                  </h4>
                  <PbjSelect
                    label="Pejabat Pengadaan Barang/Jasa PT BPR NTB PERSERODA"
                    value={form.tandaTerimaPenandaTangan}
                    options={selectedPengadaan.pbj}
                    onChange={(value) =>
                      updateForm('tandaTerimaPenandaTangan', value)
                    }
                  />
                </div>
              </div>
            ) : isBeritaAcaraEvaluasiDokumen ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <TextInput
                      label="Tanggal Evaluasi Dokumen"
                      type="date"
                      value={form.baEvaluasiTanggalDokumen}
                      onChange={(value) =>
                        updateForm('baEvaluasiTanggalDokumen', value)
                      }
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {(() => {
                        const parts = getDatePartsIndonesia(
                          form.baEvaluasiTanggalDokumen
                        );
                        return `${parts.hari}, ${parts.tanggal} ${parts.bulan} ${parts.tahun}`;
                      })()}
                    </p>
                  </div>

                  <TextInput
                    label="Nama Pekerjaan"
                    value={form.baEvaluasiNamaPekerjaan}
                    onChange={(value) =>
                      updateForm('baEvaluasiNamaPekerjaan', value)
                    }
                  />

                  <TextInput
                    label="Nama Penyedia"
                    value={form.baEvaluasiNamaPenyedia}
                    onChange={(value) =>
                      updateForm('baEvaluasiNamaPenyedia', value)
                    }
                  />

                  <TextInput
                    label="Nomor BA Pemasukan Dokumen"
                    value={form.baEvaluasiNomorBaPemasukan}
                    onChange={(value) =>
                      updateForm('baEvaluasiNomorBaPemasukan', value)
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                      Nilai Penawaran (Evaluasi Administrasi)
                    </label>
                    <div className="flex overflow-hidden rounded border border-stroke bg-white focus-within:border-primary dark:border-form-strokedark dark:bg-form-input">
                      <span className="flex items-center border-r border-stroke bg-gray-2 px-4 text-sm font-semibold text-black dark:border-form-strokedark dark:bg-meta-4 dark:text-white">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatRupiahText(form.baEvaluasiNilaiPenawaran)}
                        onChange={(event) =>
                          updateForm(
                            'baEvaluasiNilaiPenawaran',
                            event.target.value.replace(/\D/g, '')
                          )
                        }
                        className="w-full bg-transparent px-4 py-3 text-sm text-black outline-none dark:text-white"
                      />
                    </div>
                  </div>

                  <TextInput
                    label="Jadwal Pelaksanaan Pekerjaan (Evaluasi Teknis)"
                    value={form.baEvaluasiJadwalPelaksanaan}
                    onChange={(value) =>
                      updateForm('baEvaluasiJadwalPelaksanaan', value)
                    }
                  />
                </div>

                <div className="rounded border border-stroke p-5 dark:border-strokedark">
                  <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                    Evaluasi Kualifikasi (Keterangan)
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <TextInput
                      label="1. Copy SIUP/NIB"
                      value={form.baEvaluasiKualifikasiSiup}
                      onChange={(value) =>
                        updateForm('baEvaluasiKualifikasiSiup', value)
                      }
                    />
                    <TextInput
                      label="2. Copy NPWP"
                      value={form.baEvaluasiKualifikasiNpwp}
                      onChange={(value) =>
                        updateForm('baEvaluasiKualifikasiNpwp', value)
                      }
                    />
                    <TextInput
                      label="3. Copy KTP"
                      value={form.baEvaluasiKualifikasiKtp}
                      onChange={(value) =>
                        updateForm('baEvaluasiKualifikasiKtp', value)
                      }
                    />
                    <TextInput
                      label="4. Copy KSWP"
                      value={form.baEvaluasiKualifikasiKswp}
                      onChange={(value) =>
                        updateForm('baEvaluasiKualifikasiKswp', value)
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded border border-stroke p-5 dark:border-strokedark">
                    <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                      Penyedia Barang/Jasa
                    </h4>
                    <div className="space-y-3">
                      <div className="rounded bg-gray-2 px-4 py-3 dark:bg-meta-4">
                        <p className="text-xs font-medium uppercase text-body dark:text-bodydark">
                          Nama Penyedia
                        </p>
                        <p className="mt-1 text-sm font-semibold text-black dark:text-white">
                          {form.baEvaluasiNamaPenyedia}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded border border-stroke p-5 dark:border-strokedark md:justify-self-end md:w-full">
                    <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                      Penanda Tangan PBJ
                    </h4>
                    <PbjSelect
                      label="Pejabat Pengadaan Barang/Jasa PT BPR NTB PERSERODA"
                      value={form.baEvaluasiPenandaTangan}
                      options={selectedPengadaan.pbj}
                      onChange={(value) =>
                        updateForm('baEvaluasiPenandaTangan', value)
                      }
                    />
                  </div>
                </div>
              </div>
            ) : isUndanganKlarifikasi ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Lampiran"
                    value={form.uknLampiran}
                    onChange={(value) => updateForm('uknLampiran', value)}
                  />
                  <TextInput
                    label="Tempat Surat"
                    value={form.uknTempatSurat}
                    onChange={(value) => updateForm('uknTempatSurat', value)}
                  />
                  <div>
                    <TextInput
                      label="Tanggal Surat"
                      type="date"
                      value={form.uknTanggalSurat}
                      onChange={(value) =>
                        updateForm('uknTanggalSurat', value)
                      }
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {form.uknTempatSurat},{' '}
                      {formatDateOnlyFromInput(form.uknTanggalSurat)}
                    </p>
                  </div>
                  <TextInput
                    label="Jabatan Penerima"
                    value={form.uknKepadaJabatan}
                    onChange={(value) => updateForm('uknKepadaJabatan', value)}
                  />
                  <TextInput
                    label="Nama Penyedia"
                    value={form.uknNamaPenyedia}
                    onChange={(value) => updateForm('uknNamaPenyedia', value)}
                  />
                  <TextInput
                    label="Alamat"
                    value={form.uknAlamat}
                    onChange={(value) => updateForm('uknAlamat', value)}
                  />
                  <TextInput
                    label="Perihal"
                    value={form.uknPerihal}
                    onChange={(value) => updateForm('uknPerihal', value)}
                  />
                  <TextInput
                    label="Pekerjaan"
                    value={form.uknPekerjaan}
                    onChange={(value) => updateForm('uknPekerjaan', value)}
                  />
                  <div>
                    <TextInput
                      label="Waktu"
                      type="time"
                      value={form.uknWaktu}
                      onChange={(value) => updateForm('uknWaktu', value)}
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatTimeWita(form.uknWaktu)} WITA
                    </p>
                  </div>
                  <div>
                    <TextInput
                      label="Hari / Tanggal Pelaksanaan"
                      type="date"
                      value={form.uknHari}
                      onChange={(value) => updateForm('uknHari', value)}
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatDateFromInput(form.uknHari)}
                    </p>
                  </div>
                  <TextInput
                    label="Tempat"
                    value={form.uknTempat}
                    onChange={(value) => updateForm('uknTempat', value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TextArea
                    label="Paragraf Pembuka"
                    value={form.uknParagrafPembuka}
                    onChange={(value) =>
                      updateForm('uknParagrafPembuka', value)
                    }
                  />
                  <TextArea
                    label="Paragraf Penutup"
                    value={form.uknParagrafPenutup}
                    onChange={(value) =>
                      updateForm('uknParagrafPenutup', value)
                    }
                  />
                </div>

                <div className="rounded border border-stroke p-5 dark:border-strokedark md:ml-auto md:max-w-xl">
                  <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                    Penanda Tangan
                  </h4>
                  <PbjSelect
                    label="Pejabat Pengadaan Barang/Jasa PT BPR NTB PESERODA"
                    value={form.uknPenandaTangan}
                    options={selectedPengadaan.pbj}
                    onChange={(value) => updateForm('uknPenandaTangan', value)}
                  />
                </div>
              </div>
            ) : isBeritaKlarifikasi ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <TextInput
                      label="Hari / Tanggal"
                      type="date"
                      value={form.baknTanggal}
                      onChange={(value) => updateForm('baknTanggal', value)}
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {(() => {
                        const parts = getDatePartsIndonesia(form.baknTanggal);
                        return `${parts.hari}, ${parts.tanggal} ${parts.bulan} ${parts.tahun}`;
                      })()}
                    </p>
                  </div>
                  <TextInput
                    label="Tempat"
                    value={form.baknTempat}
                    onChange={(value) => updateForm('baknTempat', value)}
                  />
                  <TextInput
                    label="Nama Penyedia"
                    value={form.baknNamaPenyedia}
                    onChange={(value) => updateForm('baknNamaPenyedia', value)}
                  />
                  <TextInput
                    label="Untuk Pekerjaan"
                    value={form.baknPekerjaan}
                    onChange={(value) => updateForm('baknPekerjaan', value)}
                  />
                </div>

                <div className="space-y-4">
                  <TextArea
                    label="Hasil Pembahasan 1 (Klarifikasi Teknis)"
                    value={form.baknHasil1}
                    onChange={(value) => updateForm('baknHasil1', value)}
                  />
                  <TextArea
                    label="Hasil Pembahasan 2 (Negosiasi Harga)"
                    value={form.baknHasil2}
                    onChange={(value) => updateForm('baknHasil2', value)}
                  />
                  <TextArea
                    label="Hasil Pembahasan 3 (Pembuktian Kualifikasi)"
                    value={form.baknHasil3}
                    onChange={(value) => updateForm('baknHasil3', value)}
                  />
                  <TextArea
                    label="Keterangan Penutup"
                    value={form.baknKeteranganPenutup}
                    onChange={(value) =>
                      updateForm('baknKeteranganPenutup', value)
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded border border-stroke p-5 dark:border-strokedark">
                    <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                      Penanda Tangan Penyedia
                    </h4>
                    <TextInput
                      label="Nama Direktur"
                      value={form.baknNamaDirektur}
                      onChange={(value) =>
                        updateForm('baknNamaDirektur', value)
                      }
                    />
                  </div>

                  <div className="rounded border border-stroke p-5 dark:border-strokedark">
                    <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                      Penanda Tangan PBJ
                    </h4>
                    <PbjSelect
                      label="Pejabat Pengadaan Barang/Jasa PT BPR NTB PESERODA"
                      value={form.baknPenandaTangan}
                      options={selectedPengadaan.pbj}
                      onChange={(value) =>
                        updateForm('baknPenandaTangan', value)
                      }
                    />
                  </div>
                </div>
              </div>
            ) : isHasilPengadaan ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <TextInput
                      label="Hari / Tanggal"
                      type="date"
                      value={form.bahplTanggal}
                      onChange={(value) => updateForm('bahplTanggal', value)}
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {(() => {
                        const parts = getDatePartsIndonesia(form.bahplTanggal);
                        return `${parts.hari}, ${parts.tanggal} ${parts.bulan} ${parts.tahun}`;
                      })()}
                    </p>
                  </div>
                  <TextInput
                    label="Pekerjaan"
                    value={form.bahplPekerjaan}
                    onChange={(value) => updateForm('bahplPekerjaan', value)}
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                      HPS
                    </label>
                    <div className="flex overflow-hidden rounded border border-stroke bg-white focus-within:border-primary dark:border-form-strokedark dark:bg-form-input">
                      <span className="flex items-center border-r border-stroke bg-gray-2 px-4 text-sm font-semibold text-black dark:border-form-strokedark dark:bg-meta-4 dark:text-white">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatRupiahText(form.bahplHps)}
                        onChange={(event) =>
                          updateForm(
                            'bahplHps',
                            event.target.value.replace(/\D/g, '')
                          )
                        }
                        className="w-full bg-transparent px-4 py-3 text-sm text-black outline-none dark:text-white"
                      />
                    </div>
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatRupiahTerbilang(form.bahplHps) || '-'}
                    </p>
                  </div>
                  <TextInput
                    label="Unsur Evaluasi"
                    value={form.bahplUnsurEvaluasi}
                    onChange={(value) =>
                      updateForm('bahplUnsurEvaluasi', value)
                    }
                  />
                </div>

                <div className="rounded border border-stroke p-5 dark:border-strokedark">
                  <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                    Hasil Evaluasi
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      label="Nama Perusahaan"
                      value={form.bahplNamaPerusahaan}
                      onChange={(value) =>
                        updateForm('bahplNamaPerusahaan', value)
                      }
                    />
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                        Harga Penawaran
                      </label>
                      <div className="flex overflow-hidden rounded border border-stroke bg-white focus-within:border-primary dark:border-form-strokedark dark:bg-form-input">
                        <span className="flex items-center border-r border-stroke bg-gray-2 px-4 text-sm font-semibold text-black dark:border-form-strokedark dark:bg-meta-4 dark:text-white">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatRupiahText(form.bahplHargaPenawaran)}
                          onChange={(event) =>
                            updateForm(
                              'bahplHargaPenawaran',
                              event.target.value.replace(/\D/g, '')
                            )
                          }
                          className="w-full bg-transparent px-4 py-3 text-sm text-black outline-none dark:text-white"
                        />
                      </div>
                    </div>
                    <EvalSelect
                      label="Evaluasi Administrasi"
                      value={form.bahplEvalAdministrasi}
                      onChange={(value) =>
                        updateForm('bahplEvalAdministrasi', value)
                      }
                    />
                    <EvalSelect
                      label="Evaluasi Teknis"
                      value={form.bahplEvalTeknis}
                      onChange={(value) =>
                        updateForm('bahplEvalTeknis', value)
                      }
                    />
                    <EvalSelect
                      label="Evaluasi Harga"
                      value={form.bahplEvalHarga}
                      onChange={(value) =>
                        updateForm('bahplEvalHarga', value)
                      }
                    />
                    <EvalSelect
                      label="Evaluasi Kualifikasi"
                      value={form.bahplEvalKualifikasi}
                      onChange={(value) =>
                        updateForm('bahplEvalKualifikasi', value)
                      }
                    />
                    <EvalSelect
                      label="Keterangan"
                      value={form.bahplKet}
                      onChange={(value) => updateForm('bahplKet', value)}
                    />
                  </div>
                </div>

                <div className="rounded border border-stroke p-5 dark:border-strokedark">
                  <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                    Kesimpulan Peserta
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      label="Nama Penyedia"
                      value={form.bahplNamaPenyedia}
                      onChange={(value) =>
                        updateForm('bahplNamaPenyedia', value)
                      }
                    />
                    <TextInput
                      label="Nama Direktur Utama"
                      value={form.bahplNamaDirektur}
                      onChange={(value) =>
                        updateForm('bahplNamaDirektur', value)
                      }
                    />
                    <TextInput
                      label="Alamat Perusahaan"
                      value={form.bahplAlamat}
                      onChange={(value) => updateForm('bahplAlamat', value)}
                    />
                    <TextInput
                      label="Nomor Pokok Wajib Pajak (NPWP)"
                      value={form.bahplNpwp}
                      onChange={(value) => updateForm('bahplNpwp', value)}
                    />
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                        Harga Hasil Negosiasi
                      </label>
                      <div className="flex overflow-hidden rounded border border-stroke bg-white focus-within:border-primary dark:border-form-strokedark dark:bg-form-input">
                        <span className="flex items-center border-r border-stroke bg-gray-2 px-4 text-sm font-semibold text-black dark:border-form-strokedark dark:bg-meta-4 dark:text-white">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatRupiahText(form.bahplHargaNegosiasi)}
                          onChange={(event) =>
                            updateForm(
                              'bahplHargaNegosiasi',
                              event.target.value.replace(/\D/g, '')
                            )
                          }
                          className="w-full bg-transparent px-4 py-3 text-sm text-black outline-none dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <TextArea
                  label="Keterangan Penutup"
                  value={form.bahplKeteranganPenutup}
                  onChange={(value) =>
                    updateForm('bahplKeteranganPenutup', value)
                  }
                />

                <div className="rounded border border-stroke p-5 dark:border-strokedark md:ml-auto md:max-w-xl">
                  <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                    Penanda Tangan
                  </h4>
                  <PbjSelect
                    label="Pejabat Pengadaan Barang/Jasa PT BPR NTB PESERODA"
                    value={form.bahplPenandaTangan}
                    options={selectedPengadaan.pbj}
                    onChange={(value) =>
                      updateForm('bahplPenandaTangan', value)
                    }
                  />
                </div>
              </div>
            ) : isPenunjukanPenyedia ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Tempat Surat"
                    value={form.penunjukanTempat}
                    onChange={(value) => updateForm('penunjukanTempat', value)}
                  />

                  <div>
                    <TextInput
                      label="Tanggal Surat"
                      type="date"
                      value={form.penunjukanTanggal}
                      onChange={(value) =>
                        updateForm('penunjukanTanggal', value)
                      }
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {form.penunjukanTempat},{' '}
                      {formatDateTwoDigitFromInput(form.penunjukanTanggal)}
                    </p>
                  </div>

                  <TextInput
                    label="Lampiran"
                    value={form.penunjukanLampiran}
                    onChange={(value) => updateForm('penunjukanLampiran', value)}
                  />

                  <TextInput
                    label="Jabatan Tujuan"
                    value={form.penunjukanJabatanTujuan}
                    onChange={(value) =>
                      updateForm('penunjukanJabatanTujuan', value)
                    }
                  />

                  <TextInput
                    label="Kepada Yth. (Nama Perusahaan Penyedia)"
                    value={form.penunjukanKepada}
                    onChange={(value) => updateForm('penunjukanKepada', value)}
                  />

                  <TextInput
                    label="Di -"
                    value={form.penunjukanDi}
                    onChange={(value) => updateForm('penunjukanDi', value)}
                  />

                  <TextInput
                    label="Perihal"
                    value={form.penunjukanPerihal}
                    onChange={(value) => updateForm('penunjukanPerihal', value)}
                  />

                  <div>
                    <TextInput
                      label="Tanggal Surat Penawaran"
                      type="date"
                      value={form.penunjukanTanggalPenawaran}
                      onChange={(value) =>
                        updateForm('penunjukanTanggalPenawaran', value)
                      }
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatDateFromInput(form.penunjukanTanggalPenawaran)}
                    </p>
                  </div>

                  <RupiahInput
                    label="Hasil Negosiasi Harga (Termasuk Pajak)"
                    value={form.penunjukanNilaiNegosiasi}
                    onChange={(value) =>
                      updateForm('penunjukanNilaiNegosiasi', value)
                    }
                  />
                </div>

                <TextArea
                  label="Keterangan Tindak Lanjut"
                  value={form.penunjukanKeteranganTindakLanjut}
                  onChange={(value) =>
                    updateForm('penunjukanKeteranganTindakLanjut', value)
                  }
                />

                <div className="rounded border border-stroke p-5 dark:border-strokedark md:ml-auto md:max-w-xl">
                  <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                    Penanda Tangan
                  </h4>
                  <PbjSelect
                    label="Pejabat Pengadaan Barang/Jasa PT BPR NTB PESERODA"
                    value={form.penunjukanPenandaTangan}
                    options={selectedPengadaan.pbj}
                    onChange={(value) =>
                      updateForm('penunjukanPenandaTangan', value)
                    }
                  />
                </div>
              </div>
            ) : isSpk ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <TextInput
                      label="Tanggal SPK"
                      type="date"
                      value={form.spkTanggal}
                      onChange={(value) => updateForm('spkTanggal', value)}
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatDateOnlyFromInput(form.spkTanggal)}
                    </p>
                  </div>

                  <TextInput
                    label="Paket Pengadaan"
                    value={form.spkPaketPengadaan}
                    onChange={(value) => updateForm('spkPaketPengadaan', value)}
                  />

                  <TextInput
                    label="Nomor Surat Undangan Pengadaan Langsung"
                    value={form.spkNomorSuratUndangan}
                    onChange={(value) =>
                      updateForm('spkNomorSuratUndangan', value)
                    }
                  />

                  <div>
                    <TextInput
                      label="Tanggal Surat Undangan Pengadaan Langsung"
                      type="date"
                      value={form.spkTanggalSuratUndangan}
                      onChange={(value) =>
                        updateForm('spkTanggalSuratUndangan', value)
                      }
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {formatDateOnlyFromInput(form.spkTanggalSuratUndangan)}
                    </p>
                  </div>

                  <TextInput
                    label="Sumber Dana"
                    value={form.spkSumberDana}
                    onChange={(value) => updateForm('spkSumberDana', value)}
                  />

                  <div>
                    <RupiahInput
                      label="Nilai Kontrak (Termasuk PPN)"
                      value={form.spkNilaiKontrak}
                      onChange={(value) => updateForm('spkNilaiKontrak', value)}
                    />
                    <p className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                      {getTerbilangTitleCase(form.spkNilaiKontrak)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded border border-stroke p-5 dark:border-strokedark">
                    <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                      Penanda Tangan PPK
                    </h4>
                    <PbjSelect
                      label="Pejabat Pembuat Komitmen PT BPR NTB PERSERODA"
                      value={form.spkPpk}
                      options={selectedPengadaan.ppk}
                      onChange={(value) => updateForm('spkPpk', value)}
                    />
                  </div>

                  <div className="rounded border border-stroke p-5 dark:border-strokedark">
                    <h4 className="mb-4 text-base font-semibold text-black dark:text-white">
                      Penanda Tangan Penyedia
                    </h4>
                    <div className="space-y-4">
                      <TextInput
                        label="Nama Perusahaan Penyedia"
                        value={form.spkPerusahaanPenyedia}
                        onChange={(value) =>
                          updateForm('spkPerusahaanPenyedia', value)
                        }
                      />
                      <TextInput
                        label="Nama Penyedia"
                        value={form.spkNamaPenyedia}
                        onChange={(value) =>
                          updateForm('spkNamaPenyedia', value)
                        }
                      />
                      <TextInput
                        label="Jabatan"
                        value={form.spkJabatanPenyedia}
                        onChange={(value) =>
                          updateForm('spkJabatanPenyedia', value)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded border border-stroke p-5 dark:border-strokedark">
                  <p className="text-sm font-semibold text-black dark:text-white">
                    File Dokumen
                  </p>
                  <p className="mt-2 text-sm text-body dark:text-bodydark">
                    {documentName}.pdf
                  </p>
                </div>
                <div className="rounded border border-stroke p-5 dark:border-strokedark">
                  <p className="text-sm font-semibold text-black dark:text-white">
                    Riwayat Perubahan
                  </p>
                  <p className="mt-2 text-sm text-body dark:text-bodydark">
                    Dibuat otomatis dari data keterangan pelaksana.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showResultModal && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
          onClick={() => setShowResultModal(false)}
        >
          <div
            className="max-h-[92vh] w-full max-w-[860px] overflow-y-auto rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b border-stroke bg-white px-5 py-4 dark:border-strokedark">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-black">
                    Hasil Dokumen {documentName}
                  </h3>
                  <p className="mt-1 text-sm text-body">
                    {isBeritaAcaraPenjelasan
                      ? form.beritaNamaPenjelasanPekerjaan
                      : isBuktiPengambilan
                      ? form.buktiPekerjaan
                      : isBeritaAcaraPemasukanDanPembukaanDokumen
                      ? form.baPemasukanNamaPekerjaan
                      : isTandaTerimaPemasukanDokumen
                      ? form.tandaTerimaPekerjaan
                      : isBeritaAcaraEvaluasiDokumen
                      ? form.baEvaluasiNamaPekerjaan
                      : isUndanganKlarifikasi
                      ? form.uknPekerjaan
                      : isBeritaKlarifikasi
                      ? form.baknPekerjaan
                      : isHasilPengadaan
                      ? form.bahplPekerjaan
                      : isPenunjukanPenyedia
                      ? form.penunjukanPerihal
                      : isSpk
                      ? form.spkPaketPengadaan
                      : form.namaPaketPekerjaan}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-shrink-0">
                  {effectiveUseHeaderFooter && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowImageSettings((current) => !current);
                      }}
                      aria-expanded={showImageSettings}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded border px-4 text-sm font-medium transition ${
                        showImageSettings
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-stroke text-black hover:border-primary hover:text-primary'
                      }`}
                    >
                      <FiLayout size={16} />
                      <span className="hidden sm:inline">Tampilan Halaman</span>
                      <span className="sm:hidden">Tampilan</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={downloadPdf}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiDownload size={16} />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResultModal(false)}
                    className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded border border-stroke text-body transition hover:border-danger hover:text-danger"
                    aria-label="Tutup hasil dokumen"
                    title="Tutup"
                  >
                    <FiX size={18} />
                  </button>
                </div>
              </div>
            </div>

            {effectiveUseHeaderFooter &&
              defaultDocumentImages !== emptyDefaultDocumentImages &&
              ((showHeader && !headerAsset.src) ||
                (showFooter && !footerImage.src)) && (
              <div className="border-b border-stroke bg-white px-5 py-4 dark:border-strokedark">
                <p className="text-sm font-medium text-black">
                  Gambar header atau footer tidak ditemukan. Dokumen tetap bisa
                  diunduh tanpa gambar tersebut.
                </p>
              </div>
            )}

            {effectiveUseHeaderFooter && showImageSettings && (
              <div className="border-b border-stroke bg-gray-2 px-5 py-4 dark:border-strokedark">
                <div className="rounded border border-stroke bg-white p-4">
                  <p className="mb-3 text-sm font-semibold text-black">
                    Tampilan halaman
                  </p>
                  <div className="flex flex-col items-start gap-3">
                    <HeaderFooterSwitch
                      label="Header (logo)"
                      checked={headerFooterVisibility.header}
                      onChange={(checked) =>
                        updateHeaderFooterVisibility('header', checked)
                      }
                    />
                    <HeaderFooterSwitch
                      label="Footer"
                      checked={headerFooterVisibility.footer}
                      onChange={(checked) =>
                        updateHeaderFooterVisibility('footer', checked)
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-2 px-4 py-6 dark:bg-boxdark-2 sm:px-8">
              <iframe
                title="Preview hasil dokumen"
                srcDoc={getDocumentHtml()}
                className="mx-auto block max-w-full border-0 bg-white shadow-default"
                style={{
                  width: '210mm',
                  height: '297mm',
                }}
              />
            </div>
          </div>
        </div>
      )}
      </>
    </PegawaiOptionsContext.Provider>
  );
};

export default ProcurementDocument;
