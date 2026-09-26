import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  FiDownload,
  FiEdit2,
  FiFileText,
  FiLoader,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiUserCheck,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { getApiErrorMessage, pegawaiApi } from '../api';
import type {
  HasilImportPegawai,
  ImportPegawaiBaris,
  JenisKelamin,
  Pegawai,
  PegawaiInput,
  RingkasanPegawai,
} from '../api';

type ModalMode = 'add' | 'edit' | 'delete';

const excelHeaders = [
  'Kode Pegawai',
  'Kode Unit',
  'Unit Kerja',
  'Nama',
  'Jabatan',
  'NRP',
  'Jenis Kelamin',
];

const emptyForm: PegawaiInput = {
  kodePegawai: '',
  kodeUnit: '',
  unitKerja: '',
  nama: '',
  jabatan: '',
  nrp: '',
  jenisKelamin: 'L',
};

const getCellValue = (row: Record<string, unknown>, header: string) => {
  const foundKey = Object.keys(row).find(
    (key) => key.trim().toLowerCase() === header.toLowerCase(),
  );
  const value = foundKey ? row[foundKey] : '';

  return String(value ?? '').trim();
};

const normalizeJenisKelamin = (value: string): JenisKelamin => {
  const code = value.trim().toUpperCase();
  return code === 'P' || code.includes('PEREMPUAN') ? 'P' : 'L';
};

const labelJenisKelamin = (value: JenisKelamin) =>
  value === 'L' ? 'Laki-laki' : 'Perempuan';

const DataPegawai = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [ringkasan, setRingkasan] = useState<RingkasanPegawai | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form, setForm] = useState<PegawaiInput>(emptyForm);
  const [exporting, setExporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importGagal, setImportGagal] = useState<HasilImportPegawai['gagal']>(
    []
  );

  const muatRingkasan = useCallback(async () => {
    try {
      setRingkasan(await pegawaiApi.ringkasan());
    } catch (error) {
      // Ringkasan gagal tidak memblokir tabel utama.
      console.error(error);
    }
  }, []);

  const muatPegawai = useCallback(async (cari: string) => {
    setLoading(true);
    setLoadError('');

    try {
      const hasil = await pegawaiApi.daftar({
        cari: cari.trim() || undefined,
        batas: 100,
      });
      setPegawai(hasil.data);
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Gagal memuat data pegawai.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muatRingkasan();
  }, [muatRingkasan]);

  // Pencarian dilakukan di server (kode pegawai / nama / NRP) dengan debounce.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      muatPegawai(query);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, muatPegawai]);

  useEffect(() => {
    if (!modalMode) return;

    const animationFrame = requestAnimationFrame(() => {
      setIsModalVisible(true);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [modalMode]);

  const openModal = (mode: ModalMode, item?: Pegawai) => {
    setModalMode(mode);
    setSelectedPegawai(item ?? null);
    setIsModalVisible(false);
    setForm(
      item
        ? {
            kodePegawai: item.kodePegawai,
            kodeUnit: item.kodeUnit,
            unitKerja: item.unitKerja,
            nama: item.nama,
            jabatan: item.jabatan,
            nrp: item.nrp,
            jenisKelamin: item.jenisKelamin,
          }
        : emptyForm,
    );
  };

  const closeModal = () => {
    setIsModalVisible(false);
    window.setTimeout(() => {
      setModalMode(null);
      setSelectedPegawai(null);
    }, 200);
  };

  const updateForm = <K extends keyof PegawaiInput>(
    key: K,
    value: PegawaiInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const refresh = async () => {
    await Promise.all([muatPegawai(query), muatRingkasan()]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    try {
      if (modalMode === 'add') {
        await pegawaiApi.buat(form);
        toast.success('Pegawai berhasil ditambahkan.');
      }

      if (modalMode === 'edit' && selectedPegawai) {
        await pegawaiApi.perbarui(selectedPegawai.id, form);
        toast.success('Pegawai berhasil diperbarui.');
      }

      closeModal();
      await refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Gagal menyimpan pegawai.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPegawai || submitting) return;

    setSubmitting(true);

    try {
      await pegawaiApi.hapus(selectedPegawai.id);
      toast.success('Pegawai berhasil dihapus.');
      closeModal();
      await refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Gagal menghapus pegawai.'));
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        'Kode Pegawai': 'PGW-005',
        'Kode Unit': 'PBJ',
        'Unit Kerja': 'Pengadaan Internal',
        Nama: 'Nama Pegawai',
        Jabatan: 'Jabatan Pegawai',
        NRP: '12345678',
        'Jenis Kelamin': 'L',
      },
    ]);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pegawai');
    XLSX.writeFile(workbook, 'template-data-pegawai-sipintar.xlsx');
  };

  // Kolom sama dengan template supaya hasil export bisa diimport ulang.
  // Mengikuti pencarian yang sedang aktif.
  const handleExportExcel = async () => {
    if (exporting) return;

    setExporting(true);
    const loadingToast = toast.loading('Menyiapkan file export...');

    try {
      const semuaPegawai: Pegawai[] = [];
      let halaman = 1;
      let totalHalaman = 1;

      do {
        const hasil = await pegawaiApi.daftar({
          cari: query.trim() || undefined,
          halaman,
          batas: 100,
        });
        semuaPegawai.push(...hasil.data);
        totalHalaman = hasil.meta.totalHalaman;
        halaman += 1;
      } while (halaman <= totalHalaman);

      if (semuaPegawai.length === 0) {
        toast.error('Tidak ada data pegawai untuk diexport.');
        return;
      }

      const barisExcel: Record<string, string>[] = semuaPegawai.map(
        (item) => ({
          'Kode Pegawai': item.kodePegawai,
          'Kode Unit': item.kodeUnit,
          'Unit Kerja': item.unitKerja,
          Nama: item.nama,
          Jabatan: item.jabatan,
          // Disimpan sebagai teks supaya nol di depan NRP tidak hilang.
          NRP: item.nrp,
          'Jenis Kelamin': item.jenisKelamin,
        })
      );
      const worksheet = XLSX.utils.json_to_sheet(barisExcel, {
        header: excelHeaders,
      });
      worksheet['!cols'] = excelHeaders.map((header) => ({
        wch:
          Math.max(
            header.length,
            ...barisExcel.map((baris) => (baris[header] ?? '').length)
          ) + 2,
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pegawai');

      const tanggal = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `data-pegawai-sipintar-${tanggal}.xlsx`);

      toast.success(`${semuaPegawai.length} data pegawai berhasil diexport.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Gagal mengexport data pegawai.'));
    } finally {
      toast.dismiss(loadingToast);
      setExporting(false);
    }
  };

  const handleImportExcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
    });

    // Baris kosong total dilewati; baris yang terisi sebagian tetap
    // dikirim supaya server melaporkan kolom mana yang kurang.
    const importedPegawai: ImportPegawaiBaris[] = rows
      .map((row) => ({
        // __rowNum__ dari xlsx berbasis 0, jadi +1 = nomor baris di Excel.
        baris: ((row as { __rowNum__?: number }).__rowNum__ ?? 0) + 1,
        kodePegawai: getCellValue(row, 'Kode Pegawai'),
        kodeUnit: getCellValue(row, 'Kode Unit'),
        unitKerja: getCellValue(row, 'Unit Kerja'),
        nama: getCellValue(row, 'Nama'),
        jabatan: getCellValue(row, 'Jabatan'),
        nrp: getCellValue(row, 'NRP'),
        jenisKelamin: normalizeJenisKelamin(getCellValue(row, 'Jenis Kelamin')),
      }))
      .filter(
        (item) =>
          item.kodePegawai ||
          item.kodeUnit ||
          item.unitKerja ||
          item.nama ||
          item.jabatan ||
          item.nrp
      );

    event.target.value = '';
    setImportGagal([]);

    if (importedPegawai.length === 0) {
      setImportMessage(
        'Import gagal. Pastikan header Excel sesuai template yang tersedia.',
      );
      window.setTimeout(() => setImportMessage(''), 4000);
      return;
    }

    const loadingToast = toast.loading(
      `Mengimport ${importedPegawai.length} data pegawai...`,
    );

    try {
      const hasil = await pegawaiApi.import(importedPegawai);

      setImportGagal(hasil.gagal);
      setImportMessage(
        `${hasil.berhasil} dari ${hasil.total} data pegawai berhasil diimport${
          hasil.gagal.length > 0 ? `, ${hasil.gagal.length} gagal:` : '.'
        }`
      );

      if (hasil.berhasil > 0) {
        toast.success(`${hasil.berhasil} pegawai berhasil diimport.`);
        await refresh();
      } else {
        toast.error('Semua baris gagal diimport.');
      }

      // Pesan dengan daftar gagal dibiarkan tampil sampai ditutup.
      if (hasil.gagal.length === 0) {
        window.setTimeout(() => setImportMessage(''), 5000);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Gagal mengimport data pegawai.'));
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Data Pegawai" />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
            <FiUsers size={20} />
          </div>
          <p className="text-sm font-medium">Total Pegawai</p>
          <h3 className="mt-2 text-2xl font-bold text-black dark:text-white">
            {ringkasan?.totalPegawai ?? '-'}
          </h3>
        </div>
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-success/10 text-success">
            <FiUserCheck size={20} />
          </div>
          <p className="text-sm font-medium">Laki-laki</p>
          <h3 className="mt-2 text-2xl font-bold text-black dark:text-white">
            {ringkasan?.lakiLaki ?? '-'}
          </h3>
        </div>
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-warning/10 text-warning">
            <FiUserCheck size={20} />
          </div>
          <p className="text-sm font-medium">Perempuan</p>
          <h3 className="mt-2 text-2xl font-bold text-black dark:text-white">
            {ringkasan?.perempuan ?? '-'}
          </h3>
        </div>
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-meta-5/10 text-meta-5">
            <FiUsers size={20} />
          </div>
          <p className="text-sm font-medium">Unit Terdata</p>
          <h3 className="mt-2 text-2xl font-bold text-black dark:text-white">
            {ringkasan?.unitTerdata ?? '-'}
          </h3>
        </div>
      </div>

      {importMessage && (
        <div className="mb-6 rounded-sm border border-primary/30 bg-primary/10 px-5 py-4 text-sm font-semibold text-primary">
          <div className="flex items-start justify-between gap-4">
            <span>{importMessage}</span>
            <button
              type="button"
              aria-label="Tutup pesan import"
              onClick={() => {
                setImportMessage('');
                setImportGagal([]);
              }}
              className="shrink-0 hover:opacity-70"
            >
              <FiX size={18} />
            </button>
          </div>
          {importGagal.length > 0 && (
            <ul className="mt-2 max-h-48 list-disc overflow-y-auto pl-5 font-normal text-danger">
              {importGagal.map((item) => (
                <li key={item.baris}>
                  Baris {item.baris}
                  {item.kodePegawai ? ` (${item.kodePegawai})` : ''}: {item.pesan}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col gap-4 px-5 py-5 sm:px-7.5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h4 className="text-xl font-semibold text-black dark:text-white">
              Glossary Data Pegawai
            </h4>
            <p className="mt-1 text-sm text-body dark:text-bodydark">
              Master pegawai untuk kebutuhan PPK, PBJ, dan tanda tangan dokumen.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
            <div className="flex h-11 min-w-[260px] items-center gap-2 rounded border border-stroke bg-white px-4 dark:border-form-strokedark dark:bg-form-input">
              <FiSearch size={17} />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari kode, nama, NRP"
                className="w-full bg-transparent text-sm text-black outline-none dark:text-white"
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded border border-stroke px-4 text-sm font-medium text-black transition hover:border-primary hover:text-primary dark:border-strokedark dark:text-white"
            >
              <FiUpload size={18} />
              Import Data Excel
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded border border-stroke px-4 text-sm font-medium text-black transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-strokedark dark:text-white"
            >
              {exporting ? (
                <FiLoader size={18} className="animate-spin" />
              ) : (
                <FiFileText size={18} />
              )}
              Export Data Excel
            </button>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded border border-stroke px-4 text-sm font-medium text-black transition hover:border-primary hover:text-primary dark:border-strokedark dark:text-white"
            >
              <FiDownload size={18} />
              Download Template
            </button>
            <button
              type="button"
              onClick={() => openModal('add')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-white transition hover:bg-opacity-90"
            >
              <FiPlus size={18} />
              Tambah Pegawai
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                {excelHeaders.map((header) => (
                  <th
                    key={header}
                    className="px-5 py-4 text-sm font-medium uppercase text-black dark:text-white"
                  >
                    {header}
                  </th>
                ))}
                <th className="px-5 py-4 text-center text-sm font-medium uppercase text-black dark:text-white">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-body dark:text-bodydark"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FiLoader className="animate-spin" size={16} />
                      Memuat data pegawai...
                    </span>
                  </td>
                </tr>
              )}

              {!loading && loadError && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-danger"
                  >
                    {loadError}
                    <button
                      type="button"
                      onClick={() => muatPegawai(query)}
                      className="ml-2 font-semibold underline"
                    >
                      Coba lagi
                    </button>
                  </td>
                </tr>
              )}

              {!loading &&
                !loadError &&
                pegawai.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-stroke last:border-b-0 dark:border-strokedark"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-black dark:text-white">
                      {item.kodePegawai}
                    </td>
                    <td className="px-5 py-4 text-sm text-black dark:text-white">
                      {item.kodeUnit}
                    </td>
                    <td className="px-5 py-4 text-sm text-black dark:text-white">
                      {item.unitKerja}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-black dark:text-white">
                      {item.nama}
                    </td>
                    <td className="px-5 py-4 text-sm text-black dark:text-white">
                      {item.jabatan}
                    </td>
                    <td className="px-5 py-4 text-sm text-black dark:text-white">
                      {item.nrp}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                          item.jenisKelamin === 'L'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-meta-5/10 text-meta-5'
                        }`}
                      >
                        {item.jenisKelamin} -{' '}
                        {labelJenisKelamin(item.jenisKelamin)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openModal('edit', item)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-body transition hover:bg-primary/10 hover:text-primary dark:text-bodydark"
                          title="Edit"
                          aria-label="Edit pegawai"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openModal('delete', item)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-body transition hover:bg-danger/10 hover:text-danger dark:text-bodydark"
                          title="Hapus"
                          aria-label="Hapus pegawai"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && !loadError && pegawai.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-body dark:text-bodydark"
                  >
                    Data pegawai tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && (
        <div
          className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm transition-opacity duration-200 ${
            isModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeModal}
        >
          <div
            className={`w-full max-h-[88vh] max-w-[620px] overflow-y-auto rounded-sm border border-stroke bg-white shadow-default transition-all duration-200 dark:border-strokedark dark:bg-boxdark ${
              isModalVisible
                ? 'translate-y-0 scale-100 opacity-100'
                : 'translate-y-4 scale-95 opacity-0'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
              <h3 className="text-base font-semibold text-black dark:text-white">
                {modalMode === 'add' && 'Tambah Pegawai'}
                {modalMode === 'edit' && 'Edit Pegawai'}
                {modalMode === 'delete' && 'Hapus Pegawai'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-body transition hover:bg-gray-2 hover:text-black dark:text-bodydark dark:hover:bg-meta-4 dark:hover:text-white"
                aria-label="Tutup modal"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="px-5 py-5">
              {modalMode === 'delete' && selectedPegawai ? (
                <>
                  <p className="text-sm text-body dark:text-bodydark">
                    Yakin ingin menghapus pegawai ini dari glossary?
                  </p>
                  <div className="mt-4 rounded bg-gray-2 p-4 dark:bg-meta-4">
                    <p className="text-sm font-semibold text-black dark:text-white">
                      {selectedPegawai.nama}
                    </p>
                    <p className="mt-1 text-sm text-body dark:text-bodydark">
                      {selectedPegawai.kodePegawai} | NRP :{' '}
                      {selectedPegawai.nrp}
                    </p>
                  </div>
                  <div className="mt-5 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded border border-stroke px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-2 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded bg-danger px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <FiLoader className="animate-spin" size={16} />
                      ) : (
                        <FiTrash2 size={16} />
                      )}
                      Hapus
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                        Kode Pegawai
                      </label>
                      <input
                        type="text"
                        required
                        value={form.kodePegawai}
                        onChange={(event) =>
                          updateForm('kodePegawai', event.target.value)
                        }
                        className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                        Kode Unit
                      </label>
                      <input
                        type="text"
                        required
                        value={form.kodeUnit}
                        onChange={(event) =>
                          updateForm('kodeUnit', event.target.value)
                        }
                        className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                        Unit Kerja
                      </label>
                      <input
                        type="text"
                        required
                        value={form.unitKerja}
                        onChange={(event) =>
                          updateForm('unitKerja', event.target.value)
                        }
                        className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                        Nama
                      </label>
                      <input
                        type="text"
                        required
                        value={form.nama}
                        onChange={(event) =>
                          updateForm('nama', event.target.value)
                        }
                        className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                        Jabatan
                      </label>
                      <input
                        type="text"
                        required
                        value={form.jabatan}
                        onChange={(event) =>
                          updateForm('jabatan', event.target.value)
                        }
                        className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                        NRP
                      </label>
                      <input
                        type="text"
                        required
                        value={form.nrp}
                        onChange={(event) =>
                          updateForm('nrp', event.target.value)
                        }
                        className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-black dark:text-white">
                        Jenis Kelamin
                      </label>
                      <select
                        value={form.jenisKelamin}
                        onChange={(event) =>
                          updateForm(
                            'jenisKelamin',
                            event.target.value as JenisKelamin,
                          )
                        }
                        className="w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                      >
                        <option value="L">L - Laki-laki</option>
                        <option value="P">P - Perempuan</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded border border-stroke px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-2 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <FiLoader className="animate-spin" size={16} />
                      ) : (
                        <FiUserCheck size={16} />
                      )}
                      Simpan
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DataPegawai;
