import { ReactNode, useCallback, useEffect, useState } from 'react';
import {
  FiEdit2,
  FiExternalLink,
  FiEye,
  FiLoader,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DAFTAR_JENIS_DOKUMEN,
  JENIS_DOKUMEN_LABEL,
  getApiErrorMessage,
  pengadaanApi,
} from '../../api';
import type { Pengadaan, PengadaanDetail } from '../../api';

/** Posisi 1-based dokumen sesuai urutan UI (untuk route Buka Dokumen). */
const posisiDokumen = (jenis: string) => {
  const index = DAFTAR_JENIS_DOKUMEN.findIndex((item) => item.jenis === jenis);
  return index === -1 ? 1 : index + 1;
};

type ModalMode = 'view' | 'delete';

/** Nilai rupiah backend berupa string; ubah ke number untuk format. */
const toNumber = (value: string | null | undefined) => {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);

const formatRupiahOpsional = (value: string | null) =>
  value ? formatRupiah(toNumber(value)) : '-';

/**
 * Status kelengkapan disimpulkan dari kelengkapan Detail
 * Pengadaan (backend belum menyimpan status eksplisit).
 * Akan disempurnakan saat halaman 11 dokumen diwire.
 */
const hitungStatus = (
  pengadaan: Pengadaan
): 'Lengkap' | 'Belum Lengkap' => {
  const wajib = [
    pengadaan.nilaiHps,
    pengadaan.hargaDitawarkanVendor,
    pengadaan.hasilNegosiasi,
    pengadaan.hargaPenawaranSudahPajak,
    pengadaan.tempatPenandatanganan,
    pengadaan.peserta,
  ];

  return wajib.every((item) => item != null && item !== '')
    ? 'Lengkap'
    : 'Belum Lengkap';
};

const statusClassName = (status: 'Lengkap' | 'Belum Lengkap') =>
  status === 'Lengkap'
    ? 'bg-success/10 text-success'
    : 'bg-warning/10 text-warning';

const formatTanggal = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const formatFilterLabel = (monthValue: string) => {
  const [year, month] = monthValue.split('-');

  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, 1));
};

const getMonthValue = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}`;
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded bg-gray-2 px-4 py-3 dark:bg-meta-4">
    <p className="mb-1 text-xs font-medium uppercase text-body dark:text-bodydark">
      {label}
    </p>
    <p className="text-sm font-semibold text-black dark:text-white">
      {value || '-'}
    </p>
  </div>
);

const DetailSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div>
    <h4 className="mb-3 text-sm font-semibold uppercase text-black dark:text-white">
      {title}
    </h4>
    {children}
  </div>
);

const TableOne = () => {
  const [pengadaanData, setPengadaanData] = useState<Pengadaan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [selectedPengadaan, setSelectedPengadaan] = useState<Pengadaan | null>(
    null
  );
  const [detail, setDetail] = useState<PengadaanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const muatPengadaan = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const hasil = await pengadaanApi.daftar({
        batas: 100,
        urutkan: 'dibuatPada',
        arah: 'desc',
      });
      setPengadaanData(hasil.data);
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Gagal memuat data pengadaan.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muatPengadaan();
  }, [muatPengadaan]);

  useEffect(() => {
    if (!modalMode) return;

    const animationFrame = requestAnimationFrame(() => {
      setIsModalVisible(true);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [modalMode]);

  const openModal = async (mode: ModalMode, pengadaan: Pengadaan) => {
    setSelectedPengadaan(pengadaan);
    setModalMode(mode);
    setIsModalVisible(false);

    if (mode === 'view') {
      setDetail(null);
      setDetailLoading(true);
      try {
        setDetail(await pengadaanApi.detail(pengadaan.id));
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Gagal memuat detail pengadaan.'));
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    window.setTimeout(() => {
      setModalMode(null);
      setSelectedPengadaan(null);
      setDetail(null);
    }, 200);
  };

  const handleDelete = async () => {
    if (!selectedPengadaan || deleting) return;

    setDeleting(true);
    try {
      await pengadaanApi.hapus(selectedPengadaan.id);
      toast.success('Pengadaan berhasil dihapus.');
      closeModal();
      await muatPengadaan();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Gagal menghapus pengadaan.'));
    } finally {
      setDeleting(false);
    }
  };

  const monthOptions = Array.from(
    new Set(
      pengadaanData
        .map((pengadaan) => getMonthValue(pengadaan.dibuatPada))
        .filter(Boolean)
    )
  ).sort((first, second) => second.localeCompare(first));

  const filteredPengadaanData = pengadaanData.filter((pengadaan) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const status = hitungStatus(pengadaan);
    const searchableText = [
      pengadaan.penyediaNama,
      pengadaan.judul,
      status,
      formatRupiahOpsional(pengadaan.nilaiHps),
      formatTanggal(pengadaan.dibuatPada),
    ]
      .join(' ')
      .toLowerCase();
    const matchesSearch =
      !normalizedSearch || searchableText.includes(normalizedSearch);
    const matchesMonth =
      !monthFilter || getMonthValue(pengadaan.dibuatPada) === monthFilter;

    return matchesSearch && matchesMonth;
  });

  return (
    <>
      <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-xl font-semibold text-black dark:text-white">
              PENGADAAN
            </h4>
            <p className="mt-1 text-sm text-body dark:text-bodydark">
              Daftar proses pengadaan internal BPR NTB.
            </p>
          </div>

          <Link
            to="/pengadaan/tambah"
            className="inline-flex items-center justify-center gap-2 rounded bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90"
          >
            <FiPlus size={18} />
            Pengadaan
          </Link>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <FiSearch
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-body"
              size={18}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari nama penyedia, judul, status, HPS, atau tanggal..."
              className="w-full rounded border border-stroke bg-white py-3 pl-11 pr-4 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary"
            />
          </div>

          <select
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className="w-full rounded border border-stroke bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary"
            aria-label="Filter bulan dan tahun pengadaan"
          >
            <option value="">Semua Bulan & Tahun</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {formatFilterLabel(month)}
              </option>
            ))}
          </select>
        </div>

        <p className="mb-4 text-sm text-body dark:text-bodydark">
          Menampilkan {filteredPengadaanData.length} dari {pengadaanData.length}{' '}
          pengadaan
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="px-4 py-4 text-sm font-medium uppercase text-black dark:text-white">
                  Nama Penyedia
                </th>
                <th className="px-4 py-4 text-sm font-medium uppercase text-black dark:text-white">
                  Judul Pengadaan
                </th>
                <th className="px-4 py-4 text-sm font-medium uppercase text-black dark:text-white">
                  Perhitungan HPS
                </th>
                <th className="px-4 py-4 text-sm font-medium uppercase text-black dark:text-white">
                  Status
                </th>
                <th className="px-4 py-4 text-sm font-medium uppercase text-black dark:text-white">
                  Tanggal Dibuat
                </th>
                <th className="px-4 py-4 text-center text-sm font-medium uppercase text-black dark:text-white">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-body dark:text-bodydark"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FiLoader className="animate-spin" size={16} />
                      Memuat data pengadaan...
                    </span>
                  </td>
                </tr>
              )}

              {!loading && loadError && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-danger"
                  >
                    {loadError}
                    <button
                      type="button"
                      onClick={muatPengadaan}
                      className="ml-2 font-semibold underline"
                    >
                      Coba lagi
                    </button>
                  </td>
                </tr>
              )}

              {!loading &&
                !loadError &&
                filteredPengadaanData.map((pengadaan, index) => {
                  const status = hitungStatus(pengadaan);

                  return (
                    <tr
                      className={
                        index === filteredPengadaanData.length - 1
                          ? ''
                          : 'border-b border-stroke dark:border-strokedark'
                      }
                      key={pengadaan.id}
                    >
                      <td className="px-4 py-5 text-sm text-black dark:text-white">
                        {pengadaan.penyediaNama}
                      </td>
                      <td className="px-4 py-5 text-sm text-black dark:text-white">
                        {pengadaan.judul}
                      </td>
                      <td className="px-4 py-5 text-sm font-medium text-black dark:text-white">
                        {formatRupiahOpsional(pengadaan.nilaiHps)}
                      </td>
                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusClassName(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-sm text-black dark:text-white">
                        {formatTanggal(pengadaan.dibuatPada)}
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openModal('view', pengadaan)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-body transition hover:bg-primary/10 hover:text-primary dark:text-bodydark"
                            aria-label="Lihat pengadaan"
                            title="Lihat"
                          >
                            <FiEye size={18} />
                          </button>
                          <Link
                            to={`/pengadaan/edit/${pengadaan.id}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-body transition hover:bg-primary/10 hover:text-primary dark:text-bodydark"
                            aria-label="Edit pengadaan"
                            title="Edit"
                          >
                            <FiEdit2 size={18} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openModal('delete', pengadaan)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-body transition hover:bg-danger/10 hover:text-danger dark:text-bodydark"
                            aria-label="Hapus pengadaan"
                            title="Hapus"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!loading && !loadError && filteredPengadaanData.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-body dark:text-bodydark"
                  >
                    Data pengadaan tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPengadaan && modalMode && (
        <div
          className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm transition-opacity duration-200 ${
            isModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeModal}
        >
          <div
            className={`w-full max-h-[85vh] overflow-y-auto rounded-sm border border-stroke bg-white shadow-default transition-all duration-200 dark:border-strokedark dark:bg-boxdark ${
              isModalVisible
                ? 'translate-y-0 scale-100 opacity-100'
                : 'translate-y-4 scale-95 opacity-0'
            }`}
            style={{ maxWidth: modalMode === 'view' ? 920 : 440 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stroke px-5 py-4 dark:border-strokedark">
              <div>
                <h3 className="text-base font-semibold text-black dark:text-white">
                  {modalMode === 'view' && 'Detail Pengadaan'}
                  {modalMode === 'delete' && 'Hapus Pengadaan'}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-body dark:text-bodydark">
                  {selectedPengadaan.judul}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-body transition hover:bg-gray-2 hover:text-black dark:text-bodydark dark:hover:bg-meta-4 dark:hover:text-white"
                aria-label="Tutup modal"
                title="Tutup"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="px-5 py-5">
              {modalMode === 'view' && (
                <div className="space-y-6">
                  {detailLoading && (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-body dark:text-bodydark">
                      <FiLoader className="animate-spin" size={18} />
                      Memuat detail...
                    </div>
                  )}

                  {!detailLoading && detail && (
                    <>
                      <DetailSection title="1. Nama Penyedia">
                        <DetailItem
                          label="Nama Penyedia"
                          value={detail.penyediaNama}
                        />
                      </DetailSection>

                      <DetailSection title="2. Data Penyedia">
                        <div className="grid gap-3 md:grid-cols-2">
                          <DetailItem
                            label="Alamat"
                            value={detail.penyediaAlamat ?? '-'}
                          />
                          <DetailItem
                            label="Nama Direktur"
                            value={detail.penyediaDirektur ?? '-'}
                          />
                          <DetailItem
                            label="Nomor Identitas/NIP/NRP"
                            value={detail.penyediaNomorIdentitas ?? '-'}
                          />
                          <DetailItem
                            label="Telepon/Fax"
                            value={detail.penyediaTeleponFax ?? '-'}
                          />
                          <DetailItem
                            label="Email"
                            value={detail.penyediaEmail ?? '-'}
                          />
                          <DetailItem
                            label="Jabatan"
                            value={detail.penyediaJabatan ?? '-'}
                          />
                          <DetailItem
                            label="Harga Penawaran Sudah Pajak 11%"
                            value={formatRupiahOpsional(
                              detail.hargaPenawaranSudahPajak
                            )}
                          />
                          <DetailItem
                            label="NPWP"
                            value={detail.penyediaNpwp ?? '-'}
                          />
                        </div>
                      </DetailSection>

                      <DetailSection title="3. Keterangan Pelaksana">
                        {detail.dokumen.length === 0 ? (
                          <p className="rounded bg-gray-2 px-4 py-3 text-sm text-body dark:bg-meta-4 dark:text-bodydark">
                            Belum ada baris Keterangan Pelaksana.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] table-auto">
                              <thead>
                                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                                  <th className="px-4 py-3 text-xs font-medium uppercase text-black dark:text-white">
                                    Dokumen
                                  </th>
                                  <th className="px-4 py-3 text-xs font-medium uppercase text-black dark:text-white">
                                    Nomor Dokumen
                                  </th>
                                  <th className="px-4 py-3 text-xs font-medium uppercase text-black dark:text-white">
                                    Tanggal Pelaksana
                                  </th>
                                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-black dark:text-white">
                                    Buka Dokumen
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {detail.dokumen.map((dokumen) => (
                                  <tr
                                    key={dokumen.id}
                                    className="border-b border-stroke last:border-b-0 dark:border-strokedark"
                                  >
                                    <td className="px-4 py-3 text-sm text-black dark:text-white">
                                      {JENIS_DOKUMEN_LABEL[dokumen.jenis] ??
                                        dokumen.jenis}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-black dark:text-white">
                                      {dokumen.nomorDokumen ?? '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-black dark:text-white">
                                      {formatTanggal(dokumen.tanggalPelaksanaan)}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex justify-center">
                                        <Link
                                          to={`/pengadaan/${detail.id}/dokumen/${posisiDokumen(
                                            dokumen.jenis
                                          )}/buka`}
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-body transition hover:bg-primary/10 hover:text-primary dark:text-bodydark"
                                          aria-label="Buka dokumen"
                                          title="Buka Dokumen"
                                        >
                                          <FiExternalLink size={17} />
                                        </Link>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </DetailSection>

                      <DetailSection title="4. Detail Pengadaan">
                        <div className="grid gap-3 md:grid-cols-2">
                          <DetailItem
                            label="Judul Pengadaan"
                            value={detail.judul}
                          />
                          <DetailItem
                            label="Perhitungan HPS"
                            value={formatRupiahOpsional(detail.nilaiHps)}
                          />
                          <DetailItem
                            label="Harga yang Ditawarkan Vendor"
                            value={formatRupiahOpsional(
                              detail.hargaDitawarkanVendor
                            )}
                          />
                          <DetailItem
                            label="Hasil Negosiasi"
                            value={formatRupiahOpsional(detail.hasilNegosiasi)}
                          />
                          <DetailItem
                            label="Tempat Penandatanganan"
                            value={detail.tempatPenandatanganan ?? '-'}
                          />
                          <DetailItem
                            label="Peserta"
                            value={detail.peserta ?? '-'}
                          />
                          <DetailItem
                            label="Tanggal Dibuat"
                            value={formatTanggal(detail.dibuatPada)}
                          />
                          <div className="rounded bg-gray-2 px-4 py-3 dark:bg-meta-4">
                            <p className="mb-2 text-xs font-medium uppercase text-body dark:text-bodydark">
                              Status
                            </p>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusClassName(
                                hitungStatus(detail)
                              )}`}
                            >
                              {hitungStatus(detail)}
                            </span>
                          </div>
                        </div>
                      </DetailSection>

                      <div className="grid gap-5 md:grid-cols-2">
                        <DetailSection title="5. Nama PPK">
                          <div className="space-y-2">
                            {detail.ppk.length === 0 && (
                              <p className="rounded bg-gray-2 px-4 py-3 text-sm text-body dark:bg-meta-4 dark:text-bodydark">
                                Belum ada PPK.
                              </p>
                            )}
                            {detail.ppk.map((pegawai) => (
                              <DetailItem
                                key={pegawai.id}
                                label={pegawai.nama}
                                value={`NRP : ${pegawai.nrp}`}
                              />
                            ))}
                          </div>
                        </DetailSection>

                        <DetailSection title="6. Nama PBJ">
                          <div className="space-y-2">
                            {detail.pbj.length === 0 && (
                              <p className="rounded bg-gray-2 px-4 py-3 text-sm text-body dark:bg-meta-4 dark:text-bodydark">
                                Belum ada PBJ.
                              </p>
                            )}
                            {detail.pbj.map((pegawai) => (
                              <DetailItem
                                key={pegawai.id}
                                label={pegawai.nama}
                                value={`NRP : ${pegawai.nrp}`}
                              />
                            ))}
                          </div>
                        </DetailSection>
                      </div>

                      <DetailSection title="7. Master Data Tanda Tangan">
                        <div className="grid gap-3 md:grid-cols-2">
                          {detail.penandaTangan.length === 0 && (
                            <p className="rounded bg-gray-2 px-4 py-3 text-sm text-body dark:bg-meta-4 dark:text-bodydark">
                              Belum ada penanda tangan.
                            </p>
                          )}
                          {detail.penandaTangan.map((pegawai, index) => (
                            <DetailItem
                              key={pegawai.id}
                              label={`Nama Penanda Tangan ${index + 1}`}
                              value={pegawai.nama}
                            />
                          ))}
                        </div>
                      </DetailSection>
                    </>
                  )}
                </div>
              )}

              {modalMode === 'delete' && (
                <div>
                  <p className="text-sm text-body dark:text-bodydark">
                    Yakin ingin menghapus data pengadaan ini?
                  </p>
                  <div className="mt-4 rounded bg-gray-2 p-4 dark:bg-meta-4">
                    <p className="text-sm font-semibold text-black dark:text-white">
                      {selectedPengadaan.penyediaNama}
                    </p>
                    <p className="mt-1 text-sm text-body dark:text-bodydark">
                      {selectedPengadaan.judul}
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
                      disabled={deleting}
                      className="inline-flex items-center gap-2 rounded bg-danger px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deleting ? (
                        <FiLoader className="animate-spin" size={16} />
                      ) : (
                        <FiTrash2 size={16} />
                      )}
                      Hapus
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TableOne;
