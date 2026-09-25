import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiChevronDown,
  FiFileText,
  FiLoader,
  FiPlus,
  FiSave,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DAFTAR_JENIS_DOKUMEN,
  getApiErrorMessage,
  pegawaiApi,
  pengadaanApi,
} from '../api';
import type {
  BuatPengadaanInput,
  JenisDokumen,
  Pegawai,
  PerbaruiPengadaanInput,
} from '../api';

type DokumenRow = {
  jenis: JenisDokumen;
  nama: string;
  nomorDokumen: string;
  tanggalPelaksanaan: string; // ISO yyyy-mm-dd
};

const penyediaInitial = {
  alamat: '',
  namaDirektur: '',
  nomorIdentitas: '',
  teleponFax: '',
  email: '',
  jabatan: '',
  hargaPenawaranPajak: '',
  npwp: '',
};

const detailInitial = {
  judulPengadaan: '',
  perhitunganHps: '',
  hargaVendor: '',
  hasilNegosiasi: '',
  tempatPenandatanganan: '',
  peserta: '',
};

const buatDokumenRows = (): DokumenRow[] =>
  DAFTAR_JENIS_DOKUMEN.map((item) => ({
    jenis: item.jenis,
    nama: item.nama,
    nomorDokumen: '',
    tanggalPelaksanaan: '',
  }));

const formatRupiahText = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';

  return new Intl.NumberFormat('id-ID').format(Number(digits));
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatTanggalIndonesia = (iso: string) => {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

/** Nilai rupiah backend (string/null) -> digit string untuk state. */
const rupiahKeDigit = (value: string | null | undefined) =>
  value ? String(value).split('.')[0].replace(/\D/g, '') : '';

/** ISO datetime dari backend -> yyyy-mm-dd untuk input tanggal. */
const isoKeTanggal = (value: string | null | undefined) =>
  value ? value.slice(0, 10) : '';

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

const getTerbilang = (value: string) => {
  const amount = Number(value.replace(/\D/g, ''));
  const words = terbilang(amount);
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const SectionTitle = ({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) => (
  <div className="mb-5 flex gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary text-sm font-semibold text-white">
      {number}
    </div>
    <div>
      <h3 className="text-lg font-semibold text-black dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-sm text-body dark:text-bodydark">
        {description}
      </p>
    </div>
  </div>
);

const TextInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
      {label}
    </label>
    <input
      type={type}
      required={required}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded border border-stroke bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
    />
  </div>
);

const MoneyInput = ({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-black dark:text-white">
      {label}
    </label>
    <div className="flex overflow-hidden rounded border border-stroke bg-white focus-within:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus-within:border-primary">
      <span className="flex items-center border-r border-stroke bg-gray-2 px-4 text-sm font-semibold text-black dark:border-form-strokedark dark:bg-meta-4 dark:text-white">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        required={required}
        value={formatRupiahText(value)}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        placeholder="0"
        className="w-full bg-transparent px-4 py-3 text-sm text-black outline-none dark:text-white"
      />
    </div>
    <div className="mt-2 rounded bg-primary/5 px-3 py-2 text-xs font-medium text-primary dark:bg-primary/10">
      Terbilang: {value ? getTerbilang(value) : 'Belum terisi'}
    </div>
  </div>
);

const PegawaiPicker = ({
  label,
  value,
  options,
  excludedIds,
  onChange,
}: {
  label: string;
  value: string;
  options: Pegawai[];
  excludedIds: string[];
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((pegawai) => pegawai.id === value);
  const filteredPegawai = options.filter((pegawai) => {
    const searchable = `${pegawai.nama} ${pegawai.nrp} ${pegawai.jabatan}`.toLowerCase();
    return (
      searchable.includes(query.toLowerCase()) &&
      (!excludedIds.includes(pegawai.id) || pegawai.id === value)
    );
  });

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-medium text-black dark:text-white">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded border border-stroke bg-white px-4 py-3 text-left transition hover:border-primary dark:border-form-strokedark dark:bg-form-input"
      >
        {selected ? (
          <span>
            <span className="block text-sm font-semibold text-black dark:text-white">
              {selected.nama}
            </span>
            <span className="mt-0.5 block text-xs text-body dark:text-bodydark">
              NRP : {selected.nrp}
            </span>
          </span>
        ) : (
          <span className="text-sm text-body dark:text-bodydark">
            Pilih nama lengkap
          </span>
        )}
        <FiChevronDown
          className={`shrink-0 transition ${open ? 'rotate-180' : ''}`}
          size={18}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[86px] z-40 rounded-sm border border-stroke bg-white p-3 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-2 flex items-center gap-2 rounded border border-stroke px-3 py-2 dark:border-form-strokedark">
            <FiSearch size={16} />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau NRP"
              className="w-full bg-transparent text-sm text-black outline-none dark:text-white"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filteredPegawai.map((pegawai) => (
              <button
                type="button"
                key={pegawai.id}
                onClick={() => {
                  onChange(pegawai.id);
                  setOpen(false);
                  setQuery('');
                }}
                className="block w-full rounded px-3 py-2 text-left transition hover:bg-gray-2 dark:hover:bg-meta-4"
              >
                <span className="block text-sm font-medium text-black dark:text-white">
                  {pegawai.nama}
                </span>
                <span className="mt-0.5 block text-xs text-body dark:text-bodydark">
                  NRP : {pegawai.nrp} | {pegawai.jabatan}
                </span>
              </button>
            ))}
            {filteredPegawai.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-body dark:text-bodydark">
                Data tidak ditemukan
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProcurementCreate = ({ mode = 'create' }: { mode?: 'create' | 'edit' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = mode === 'edit';

  const [pegawaiOptions, setPegawaiOptions] = useState<Pegawai[]>([]);
  const [loadingAwal, setLoadingAwal] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [namaPenyedia, setNamaPenyedia] = useState('');
  const [dataPenyediaVisible, setDataPenyediaVisible] = useState(false);
  const [penyedia, setPenyedia] = useState(penyediaInitial);
  const [detail, setDetail] = useState(detailInitial);
  const [ppkIds, setPpkIds] = useState<string[]>(['']);
  const [pbjIds, setPbjIds] = useState<string[]>(['']);
  const [penandaTanganIds, setPenandaTanganIds] = useState<string[]>(['']);
  const [kakAktif, setKakAktif] = useState(false);
  const [dokumenRows, setDokumenRows] = useState<DokumenRow[]>(buatDokumenRows);

  // Muat opsi pegawai (dropdown PPK / PBJ / penanda tangan) + data
  // pengadaan bila mode edit.
  useEffect(() => {
    let batal = false;

    const muat = async () => {
      setLoadingAwal(true);
      try {
        const pegawaiHasil = await pegawaiApi.daftar({ batas: 100 });
        if (batal) return;
        setPegawaiOptions(pegawaiHasil.data);

        if (isEditMode && id) {
          const data = await pengadaanApi.detail(id);
          if (batal) return;

          setNamaPenyedia(data.penyediaNama);
          setDataPenyediaVisible(true);
          setPenyedia({
            alamat: data.penyediaAlamat ?? '',
            namaDirektur: data.penyediaDirektur ?? '',
            nomorIdentitas: data.penyediaNomorIdentitas ?? '',
            teleponFax: data.penyediaTeleponFax ?? '',
            email: data.penyediaEmail ?? '',
            jabatan: data.penyediaJabatan ?? '',
            hargaPenawaranPajak: rupiahKeDigit(data.hargaPenawaranSudahPajak),
            npwp: data.penyediaNpwp ?? '',
          });
          setDetail({
            judulPengadaan: data.judul,
            perhitunganHps: rupiahKeDigit(data.nilaiHps),
            hargaVendor: rupiahKeDigit(data.hargaDitawarkanVendor),
            hasilNegosiasi: rupiahKeDigit(data.hasilNegosiasi),
            tempatPenandatanganan: data.tempatPenandatanganan ?? '',
            peserta: data.peserta ?? '',
          });
          setKakAktif(data.sertakanKak);
          setPpkIds(data.ppk.length ? data.ppk.map((p) => p.id) : ['']);
          setPbjIds(data.pbj.length ? data.pbj.map((p) => p.id) : ['']);
          setPenandaTanganIds(
            data.penandaTangan.length
              ? data.penandaTangan.map((p) => p.id)
              : ['']
          );

          if (data.dokumen.length > 0) {
            setDokumenRows((rows) =>
              rows.map((row) => {
                const found = data.dokumen.find((d) => d.jenis === row.jenis);
                return found
                  ? {
                      ...row,
                      nomorDokumen: found.nomorDokumen ?? '',
                      tanggalPelaksanaan: isoKeTanggal(found.tanggalPelaksanaan),
                    }
                  : row;
              })
            );
          }
        }
      } catch (error) {
        if (!batal) {
          toast.error(getApiErrorMessage(error, 'Gagal memuat data.'));
        }
      } finally {
        if (!batal) setLoadingAwal(false);
      }
    };

    muat();

    return () => {
      batal = true;
    };
  }, [isEditMode, id]);

  const visibleDokumen = useMemo(() => {
    const kak: DokumenRow[] = kakAktif
      ? [
          {
            jenis: 'SURAT_UNDANGAN' as JenisDokumen, // penanda tampilan saja
            nama: 'Kerangka Acuan Kerja',
            nomorDokumen: '',
            tanggalPelaksanaan: '',
          },
        ]
      : [];
    return [...kak, ...dokumenRows];
  }, [kakAktif, dokumenRows]);

  const selectedPpkIds = ppkIds.filter(Boolean);
  const selectedPbjIds = pbjIds.filter(Boolean);
  const selectedPenandaTanganIds = penandaTanganIds.filter(Boolean);

  const updatePenyedia = (key: keyof typeof penyedia, value: string) => {
    setPenyedia((current) => ({ ...current, [key]: value }));
  };

  const updateDetail = (key: keyof typeof detail, value: string) => {
    setDetail((current) => ({ ...current, [key]: value }));
  };

  const handleContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDataPenyediaVisible(true);
  };

  // Nomor diambil dari server supaya urutnya melanjutkan
  // pengadaan lain di tahun yang sama. Saat edit, nomor milik
  // pengadaan ini sendiri tidak ikut dihitung.
  const generateKeterangan = async () => {
    if (generating) return;

    setGenerating(true);

    try {
      const tanggal = todayIso();
      const { nomor } = await pengadaanApi.nomorDokumenBerikutnya({
        jumlah: dokumenRows.length,
        tanggal,
        kecualiPengadaanId: isEditMode && id ? id : undefined,
      });

      setDokumenRows((rows) =>
        rows.map((row, index) => ({
          ...row,
          nomorDokumen: nomor[index] ?? row.nomorDokumen,
          tanggalPelaksanaan: tanggal,
        }))
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Gagal membuat nomor dokumen.'));
    } finally {
      setGenerating(false);
    }
  };

  const addRow = (
    setter: Dispatch<SetStateAction<string[]>>,
    current: string[]
  ) => {
    if (current.length < 5) setter((rows) => [...rows, '']);
  };

  const removeRow = (
    setter: Dispatch<SetStateAction<string[]>>,
    index: number
  ) => {
    setter((rows) => rows.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateRow = (
    setter: Dispatch<SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter((rows) =>
      rows.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if (!namaPenyedia.trim()) {
      toast.error('Nama penyedia wajib diisi.');
      return;
    }
    if (!detail.judulPengadaan.trim()) {
      toast.error('Judul pengadaan wajib diisi.');
      return;
    }

    const dokumen = dokumenRows
      .filter((row) => row.nomorDokumen.trim() || row.tanggalPelaksanaan)
      .map((row) => ({
        jenis: row.jenis,
        nomorDokumen: row.nomorDokumen.trim() || null,
        tanggalPelaksanaan: row.tanggalPelaksanaan || null,
      }));

    const payload: BuatPengadaanInput = {
      penyedia: {
        nama: namaPenyedia.trim(),
        alamat: penyedia.alamat.trim() || null,
        namaDirektur: penyedia.namaDirektur.trim() || null,
        nomorIdentitas: penyedia.nomorIdentitas.trim() || null,
        teleponFax: penyedia.teleponFax.trim() || null,
        email: penyedia.email.trim() || null,
        jabatan: penyedia.jabatan.trim() || null,
        npwp: penyedia.npwp.trim() || null,
      },
      hargaPenawaranSudahPajak: penyedia.hargaPenawaranPajak || null,
      sertakanKak: kakAktif,
      judul: detail.judulPengadaan.trim(),
      nilaiHps: detail.perhitunganHps || null,
      hargaDitawarkanVendor: detail.hargaVendor || null,
      hasilNegosiasi: detail.hasilNegosiasi || null,
      tempatPenandatanganan: detail.tempatPenandatanganan.trim() || null,
      peserta: detail.peserta.trim() || null,
      ppkIds: selectedPpkIds,
      pbjIds: selectedPbjIds,
      penandaTanganIds: selectedPenandaTanganIds,
      ...(dokumen.length > 0 ? { dokumen } : {}),
    };

    setSubmitting(true);
    try {
      if (isEditMode && id) {
        await pengadaanApi.perbarui(id, payload as PerbaruiPengadaanInput);
        toast.success('Perubahan pengadaan berhasil disimpan.');
      } else {
        await pengadaanApi.buat(payload);
        toast.success('Pengadaan berhasil disimpan.');
      }
      navigate('/pengadaan');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Gagal menyimpan pengadaan.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAwal) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="inline-flex items-center gap-2 text-sm text-body dark:text-bodydark">
          <FiLoader className="animate-spin" size={18} />
          Memuat data...
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3">
            <Link
              to="/pengadaan"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:opacity-80"
            >
              <FiArrowLeft size={16} />
              Kembali ke Daftar Pengadaan
            </Link>
          </div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            {isEditMode ? 'Edit Pengadaan' : 'Tambah Pengadaan'}
          </h2>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            {isEditMode
              ? 'Perbarui data penyedia, dokumen pelaksana, nilai pengadaan, dan data tanda tangan.'
              : 'Lengkapi data penyedia, dokumen pelaksana, nilai pengadaan, dan data tanda tangan.'}
          </p>
        </div>
        <div className="rounded-sm border border-stroke bg-white px-4 py-3 shadow-default dark:border-strokedark dark:bg-boxdark">
          <p className="text-xs font-medium uppercase text-body dark:text-bodydark">
            Status Form
          </p>
          <p className="mt-1 text-sm font-semibold text-black dark:text-white">
            {dataPenyediaVisible
              ? isEditMode
                ? 'Mode edit aktif'
                : 'Data penyedia dibuka'
              : 'Menunggu nama penyedia'}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
            <FiFileText size={20} />
          </div>
          <p className="text-sm font-medium">Dokumen Pelaksana</p>
          <h3 className="mt-2 text-2xl font-bold text-black dark:text-white">
            {visibleDokumen.length}
          </h3>
        </div>
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-success/10 text-success">
            <FiCheckCircle size={20} />
          </div>
          <p className="text-sm font-medium">PPK Terpilih</p>
          <h3 className="mt-2 text-2xl font-bold text-black dark:text-white">
            {selectedPpkIds.length}/5
          </h3>
        </div>
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-warning/10 text-warning">
            <FiCheckCircle size={20} />
          </div>
          <p className="text-sm font-medium">PBJ Terpilih</p>
          <h3 className="mt-2 text-2xl font-bold text-black dark:text-white">
            {selectedPbjIds.length}/5
          </h3>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-7.5">
          <SectionTitle
            number="1"
            title="Nama Penyedia"
            description="Masukkan nama penyedia terlebih dahulu untuk membuka form Data Penyedia."
          />
          <form onSubmit={handleContinue}>
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <TextInput
                label="Nama Penyedia"
                value={namaPenyedia}
                onChange={setNamaPenyedia}
                placeholder="Contoh: PT Nusa Teknologi Mandiri"
                required
              />
              <button
                type="submit"
                className="inline-flex h-[46px] items-center justify-center rounded bg-primary px-5 text-sm font-medium text-white transition hover:bg-opacity-90"
              >
                Lanjutkan
              </button>
            </div>
          </form>
        </div>

        {dataPenyediaVisible && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-7.5">
              <SectionTitle
                number="2"
                title="Data Penyedia"
                description="Data legal dan kontak penyedia, termasuk nilai penawaran setelah pajak 11%."
              />
              <div className="mb-5 rounded bg-primary/5 px-4 py-3 text-sm font-medium text-primary dark:bg-primary/10">
                Penyedia: {namaPenyedia}
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <TextInput
                  label="Alamat"
                  value={penyedia.alamat}
                  onChange={(value) => updatePenyedia('alamat', value)}
                />
                <TextInput
                  label="Nama Direktur"
                  value={penyedia.namaDirektur}
                  onChange={(value) => updatePenyedia('namaDirektur', value)}
                />
                <TextInput
                  label="Nomor Identitas/NIP/NRP"
                  value={penyedia.nomorIdentitas}
                  onChange={(value) => updatePenyedia('nomorIdentitas', value)}
                />
                <TextInput
                  label="Telepon/Fax"
                  value={penyedia.teleponFax}
                  onChange={(value) => updatePenyedia('teleponFax', value)}
                />
                <TextInput
                  label="Email"
                  type="email"
                  value={penyedia.email}
                  onChange={(value) => updatePenyedia('email', value)}
                />
                <TextInput
                  label="Jabatan"
                  value={penyedia.jabatan}
                  onChange={(value) => updatePenyedia('jabatan', value)}
                />
                <MoneyInput
                  label="Harga Penawaran Sudah Pajak 11%"
                  value={penyedia.hargaPenawaranPajak}
                  onChange={(value) => updatePenyedia('hargaPenawaranPajak', value)}
                />
                <TextInput
                  label="NPWP"
                  value={penyedia.npwp}
                  onChange={(value) => updatePenyedia('npwp', value)}
                />
              </div>
            </div>

            <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-7.5">
              <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <SectionTitle
                  number="3"
                  title="Keterangan Pelaksana"
                  description="Klik Generate untuk mengisi nomor dan tanggal dokumen wajib. Kerangka Acuan Kerja opsional."
                />
                <button
                  type="button"
                  onClick={generateKeterangan}
                  disabled={generating}
                  className="inline-flex items-center justify-center gap-2 rounded bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generating ? (
                    <FiLoader size={18} className="animate-spin" />
                  ) : (
                    <FiFileText size={18} />
                  )}
                  Generate Keterangan
                </button>
              </div>

              <label className="mb-4 flex items-center gap-3 rounded border border-stroke px-4 py-3 dark:border-strokedark">
                <input
                  type="checkbox"
                  checked={kakAktif}
                  onChange={(event) => setKakAktif(event.target.checked)}
                  className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
                />
                <span>
                  <span className="block text-sm font-semibold text-black dark:text-white">
                    Sertakan Kerangka Acuan Kerja
                  </span>
                  <span className="text-xs text-body dark:text-bodydark">
                    Opsional, boleh ada atau tidak.
                  </span>
                </span>
              </label>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 text-sm font-medium uppercase text-black dark:text-white">
                        Dokumen
                      </th>
                      <th className="px-4 py-4 text-sm font-medium uppercase text-black dark:text-white">
                        Tanggal Pelaksana
                      </th>
                      <th className="px-4 py-4 text-sm font-medium uppercase text-black dark:text-white">
                        Nomor Dokumen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDokumen.map((dokumen) => (
                      <tr
                        key={dokumen.nama}
                        className="border-b border-stroke last:border-b-0 dark:border-strokedark"
                      >
                        <td className="px-4 py-4 text-sm font-medium text-black dark:text-white">
                          {dokumen.nama}
                        </td>
                        <td className="px-4 py-4 text-sm text-black dark:text-white">
                          {dokumen.tanggalPelaksanaan
                            ? formatTanggalIndonesia(dokumen.tanggalPelaksanaan)
                            : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-black dark:text-white">
                          {dokumen.nomorDokumen || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-7.5">
              <SectionTitle
                number="4"
                title="Detail Pengadaan"
                description="Nilai HPS, penawaran vendor, dan hasil negosiasi akan langsung dibuatkan terbilangnya."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Judul Pengadaan"
                  value={detail.judulPengadaan}
                  onChange={(value) => updateDetail('judulPengadaan', value)}
                  required
                />
                <MoneyInput
                  label="Perhitungan HPS (Harga Perkiraan Sendiri Sudah Termasuk PPN)"
                  value={detail.perhitunganHps}
                  onChange={(value) => updateDetail('perhitunganHps', value)}
                />
                <MoneyInput
                  label="Harga yang Ditawarkan Vendor"
                  value={detail.hargaVendor}
                  onChange={(value) => updateDetail('hargaVendor', value)}
                />
                <MoneyInput
                  label="Hasil Negosiasi"
                  value={detail.hasilNegosiasi}
                  onChange={(value) => updateDetail('hasilNegosiasi', value)}
                />
                <TextInput
                  label="Tempat Penandatanganan"
                  value={detail.tempatPenandatanganan}
                  onChange={(value) => updateDetail('tempatPenandatanganan', value)}
                />
                <TextInput
                  label="Peserta"
                  value={detail.peserta}
                  onChange={(value) => updateDetail('peserta', value)}
                  placeholder="Pisahkan dengan koma jika lebih dari satu"
                />
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-7.5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <SectionTitle
                    number="5"
                    title="Nama PPK"
                    description="Pilih maksimal 5 nama PPK dengan pencarian nama atau NRP."
                  />
                  <button
                    type="button"
                    onClick={() => addRow(setPpkIds, ppkIds)}
                    disabled={ppkIds.length >= 5}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiPlus size={16} />
                    PPK
                  </button>
                </div>
                <div className="space-y-4">
                  {ppkIds.map((value, index) => (
                    <div key={`ppk-${index}`} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <PegawaiPicker
                        label={`Nama Lengkap PPK ${index + 1}`}
                        value={value}
                        options={pegawaiOptions}
                        excludedIds={selectedPpkIds}
                        onChange={(next) => updateRow(setPpkIds, index, next)}
                      />
                      {ppkIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(setPpkIds, index)}
                          className="inline-flex h-[52px] w-full items-center justify-center rounded border border-danger text-danger transition hover:bg-danger/10 sm:w-12"
                          aria-label="Hapus PPK"
                          title="Hapus PPK"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-7.5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <SectionTitle
                    number="6"
                    title="Nama PBJ"
                    description="Pilih maksimal 5 nama PBJ dengan pencarian nama atau NRP."
                  />
                  <button
                    type="button"
                    onClick={() => addRow(setPbjIds, pbjIds)}
                    disabled={pbjIds.length >= 5}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiPlus size={16} />
                    PBJ
                  </button>
                </div>
                <div className="space-y-4">
                  {pbjIds.map((value, index) => (
                    <div key={`pbj-${index}`} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <PegawaiPicker
                        label={`Nama Lengkap PBJ ${index + 1}`}
                        value={value}
                        options={pegawaiOptions}
                        excludedIds={selectedPbjIds}
                        onChange={(next) => updateRow(setPbjIds, index, next)}
                      />
                      {pbjIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(setPbjIds, index)}
                          className="inline-flex h-[52px] w-full items-center justify-center rounded border border-danger text-danger transition hover:bg-danger/10 sm:w-12"
                          aria-label="Hapus PBJ"
                          title="Hapus PBJ"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark sm:p-7.5">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle
                  number="7"
                  title="Master Data Tanda Tangan"
                  description="Pilih pegawai penanda tangan dokumen, maksimal 5 nama."
                />
                <button
                  type="button"
                  onClick={() => addRow(setPenandaTanganIds, penandaTanganIds)}
                  disabled={penandaTanganIds.length >= 5}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded bg-primary px-4 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiPlus size={16} />
                  Penanda Tangan
                </button>
              </div>

              <div className="space-y-4">
                {penandaTanganIds.map((value, index) => (
                  <div
                    key={`penanda-tangan-${index}`}
                    className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                  >
                    <PegawaiPicker
                      label={`Nama Penanda Tangan ${index + 1}`}
                      value={value}
                      options={pegawaiOptions}
                      excludedIds={selectedPenandaTanganIds}
                      onChange={(next) =>
                        updateRow(setPenandaTanganIds, index, next)
                      }
                    />
                    {penandaTanganIds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(setPenandaTanganIds, index)}
                        className="inline-flex h-[52px] w-full items-center justify-center rounded border border-danger text-danger transition hover:bg-danger/10 sm:w-12"
                        aria-label="Hapus penanda tangan"
                        title="Hapus penanda tangan"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}

                <div className="rounded bg-gray-2 px-4 py-3 text-sm text-body dark:bg-meta-4 dark:text-bodydark">
                  Jumlah penanda tangan: {selectedPenandaTanganIds.length}/5
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-20 -mx-4 border-t border-stroke bg-whiten/95 px-4 py-4 backdrop-blur dark:border-strokedark dark:bg-boxdark-2/95 sm:-mx-6 lg:-mx-8.5 lg:px-8.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Link
                  to="/pengadaan"
                  className="inline-flex items-center justify-center rounded border border-stroke px-5 py-2.5 text-sm font-medium text-black transition hover:bg-gray-2 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
                >
                  Batal
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <FiLoader className="animate-spin" size={18} />
                  ) : (
                    <FiSave size={18} />
                  )}
                  {isEditMode ? 'Simpan Perubahan' : 'Simpan Pengadaan'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  );
};

export default ProcurementCreate;
