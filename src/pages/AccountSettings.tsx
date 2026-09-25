import { FormEvent, useEffect, useState } from 'react';
import { FiEye, FiEyeOff, FiLoader, FiLock, FiSave, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import { akunApi, getApiErrorMessage } from '../api';
import { getAuthData, Peran, updateAuthData } from '../utils/auth';

const labelPeran: Record<Peran, string> = {
  ADMINISTRATOR: 'Administrator',
  VERIFIKATOR: 'Verifikator',
  PEMOHON: 'Pemohon',
};

const inputClass =
  'w-full rounded border border-stroke bg-transparent px-4 py-2.5 text-sm text-black outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:disabled:bg-black';

const labelClass = 'mb-2 block text-sm font-medium text-black dark:text-white';

const kataSandiKosong = {
  kataSandiLama: '',
  kataSandiBaru: '',
  konfirmasi: '',
};

const AccountSettings = () => {
  const awal = getAuthData()?.pengguna;

  const [profil, setProfil] = useState({
    nama: awal?.nama ?? '',
    email: awal?.email ?? '',
  });
  const [peran, setPeran] = useState<Peran | null>(awal?.peran ?? null);
  const [menyimpanProfil, setMenyimpanProfil] = useState(false);

  const [kataSandi, setKataSandi] = useState(kataSandiKosong);
  const [tampilkanSandi, setTampilkanSandi] = useState(false);
  const [menyimpanSandi, setMenyimpanSandi] = useState(false);

  // Data tersimpan bisa usang (mis. diubah admin), jadi ambil
  // yang terbaru dari server.
  useEffect(() => {
    let batal = false;

    akunApi
      .saya()
      .then((pengguna) => {
        if (batal) return;
        setProfil({ nama: pengguna.nama, email: pengguna.email });
        setPeran(pengguna.peran);
      })
      .catch((error) => {
        if (!batal) {
          toast.error(getApiErrorMessage(error, 'Gagal memuat data akun.'));
        }
      });

    return () => {
      batal = true;
    };
  }, []);

  const simpanProfil = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (menyimpanProfil) return;

    setMenyimpanProfil(true);

    try {
      const hasil = await akunApi.perbaruiProfil({
        nama: profil.nama.trim(),
        email: profil.email.trim(),
      });

      updateAuthData(hasil);
      setProfil({ nama: hasil.pengguna.nama, email: hasil.pengguna.email });
      toast.success('Profil berhasil diperbarui.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Gagal memperbarui profil.'));
    } finally {
      setMenyimpanProfil(false);
    }
  };

  const simpanKataSandi = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (menyimpanSandi) return;

    if (kataSandi.kataSandiBaru !== kataSandi.konfirmasi) {
      toast.error('Konfirmasi kata sandi baru tidak sama.');
      return;
    }

    setMenyimpanSandi(true);

    try {
      await akunApi.gantiKataSandi({
        kataSandiLama: kataSandi.kataSandiLama,
        kataSandiBaru: kataSandi.kataSandiBaru,
      });

      setKataSandi(kataSandiKosong);
      toast.success('Kata sandi berhasil diganti.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Gagal mengganti kata sandi.'));
    } finally {
      setMenyimpanSandi(false);
    }
  };

  const tipeSandi = tampilkanSandi ? 'text' : 'password';

  return (
    <>
      <Breadcrumb pageName="Pengaturan Akun" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <form
          onSubmit={simpanProfil}
          className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark"
        >
          <div className="flex items-center gap-3 border-b border-stroke px-6.5 py-4 dark:border-strokedark">
            <FiUser size={20} className="text-primary" />
            <h3 className="font-semibold text-black dark:text-white">Profil</h3>
          </div>

          <div className="flex flex-col gap-5 p-6.5">
            <div>
              <label htmlFor="nama" className={labelClass}>
                Nama
              </label>
              <input
                id="nama"
                type="text"
                required
                maxLength={255}
                value={profil.nama}
                onChange={(e) => setProfil({ ...profil, nama: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                maxLength={255}
                value={profil.email}
                onChange={(e) => setProfil({ ...profil, email: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="peran" className={labelClass}>
                Peran
              </label>
              <input
                id="peran"
                type="text"
                disabled
                value={peran ? labelPeran[peran] ?? peran : '-'}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs">
                Peran hanya bisa diubah oleh administrator.
              </p>
            </div>

            <button
              type="submit"
              disabled={menyimpanProfil}
              className="inline-flex items-center justify-center gap-2 self-end rounded bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menyimpanProfil ? (
                <FiLoader size={18} className="animate-spin" />
              ) : (
                <FiSave size={18} />
              )}
              Simpan Profil
            </button>
          </div>
        </form>

        <form
          onSubmit={simpanKataSandi}
          className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark"
        >
          <div className="flex items-center justify-between gap-3 border-b border-stroke px-6.5 py-4 dark:border-strokedark">
            <div className="flex items-center gap-3">
              <FiLock size={20} className="text-primary" />
              <h3 className="font-semibold text-black dark:text-white">
                Ubah Kata Sandi
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setTampilkanSandi((nilai) => !nilai)}
              className="inline-flex items-center gap-1.5 text-sm hover:text-primary"
            >
              {tampilkanSandi ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              {tampilkanSandi ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>

          <div className="flex flex-col gap-5 p-6.5">
            <div>
              <label htmlFor="kataSandiLama" className={labelClass}>
                Kata Sandi Lama
              </label>
              <input
                id="kataSandiLama"
                type={tipeSandi}
                required
                autoComplete="current-password"
                value={kataSandi.kataSandiLama}
                onChange={(e) =>
                  setKataSandi({ ...kataSandi, kataSandiLama: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="kataSandiBaru" className={labelClass}>
                Kata Sandi Baru
              </label>
              <input
                id="kataSandiBaru"
                type={tipeSandi}
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={kataSandi.kataSandiBaru}
                onChange={(e) =>
                  setKataSandi({ ...kataSandi, kataSandiBaru: e.target.value })
                }
                className={inputClass}
              />
              <p className="mt-1.5 text-xs">Minimal 8 karakter.</p>
            </div>

            <div>
              <label htmlFor="konfirmasi" className={labelClass}>
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                id="konfirmasi"
                type={tipeSandi}
                required
                autoComplete="new-password"
                value={kataSandi.konfirmasi}
                onChange={(e) =>
                  setKataSandi({ ...kataSandi, konfirmasi: e.target.value })
                }
                className={inputClass}
              />
              {kataSandi.konfirmasi &&
                kataSandi.konfirmasi !== kataSandi.kataSandiBaru && (
                  <p className="mt-1.5 text-xs text-danger">
                    Konfirmasi belum sama dengan kata sandi baru.
                  </p>
                )}
            </div>

            <button
              type="submit"
              disabled={menyimpanSandi}
              className="inline-flex items-center justify-center gap-2 self-end rounded bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {menyimpanSandi ? (
                <FiLoader size={18} className="animate-spin" />
              ) : (
                <FiLock size={18} />
              )}
              Ganti Kata Sandi
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AccountSettings;
