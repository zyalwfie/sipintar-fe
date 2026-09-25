import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { isAuthenticated, login } from '../../utils/auth';

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const from = (location.state as { from?: string })?.from || '/dashboard';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const result = await login(email.trim(), password, rememberMe);

    setIsSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
      return;
    }

    setErrorMessage(result.message || 'Email atau password tidak sesuai.');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-2 px-4 py-10 dark:bg-boxdark-2">
      <div className="w-full max-w-5xl overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="grid min-h-[620px] lg:grid-cols-[1fr_440px]">
          <section className="flex flex-col justify-between bg-primary px-8 py-10 text-white sm:px-12">
            <div>
              <div className="text-2xl font-bold text-white">SIPINTAR</div>
              <div className="mt-1 text-sm text-white/75">
                Sistem Pengadaan Internal
              </div>
            </div>

            <div className="max-w-xl">
              <span className="mb-4 block text-sm font-medium uppercase tracking-wide text-white/80">
                SIPINTAR
              </span>
              <h1 className="mb-5 text-3xl font-bold leading-tight text-white sm:text-4xl">
                Sistem Pengadaan Internal yang tertib dan transparan.
              </h1>
              <p className="text-base leading-7 text-white/85">
                Masuk untuk memantau kebutuhan internal, paket pengadaan,
                dokumen pendukung, dan status proses dalam satu dashboard.
              </p>
            </div>

            <div className="grid gap-4 text-sm text-white/85 sm:grid-cols-3">
              <div>
                <span className="mb-1 block text-xl font-bold text-white">01</span>
                Perencanaan
              </div>
              <div>
                <span className="mb-1 block text-xl font-bold text-white">02</span>
                Pengajuan
              </div>
              <div>
                <span className="mb-1 block text-xl font-bold text-white">03</span>
                Monitoring
              </div>
            </div>
          </section>

          <section className="flex items-center px-6 py-10 sm:px-10">
            <div className="w-full">
              <span className="mb-2 block font-medium text-primary">
                Selamat datang
              </span>
              <h2 className="mb-8 text-2xl font-bold text-black dark:text-white">
                Login SIPINTAR
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className="mb-2.5 block font-medium text-black dark:text-white">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Masukkan email"
                      className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />

                    <span className="absolute right-4 top-4">
                      <svg
                        className="fill-current"
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g opacity="0.5">
                          <path
                            d="M19.2516 3.30005H2.75156C1.58281 3.30005 0.585938 4.26255 0.585938 5.46567V16.6032C0.585938 17.7719 1.54844 18.7688 2.75156 18.7688H19.2516C20.4203 18.7688 21.4172 17.8063 21.4172 16.6032V5.4313C21.4172 4.26255 20.4203 3.30005 19.2516 3.30005ZM19.2516 4.84692C19.2859 4.84692 19.3203 4.84692 19.3547 4.84692L11.0016 10.2094L2.64844 4.84692C2.68281 4.84692 2.71719 4.84692 2.75156 4.84692H19.2516ZM19.2516 17.1532H2.75156C2.40781 17.1532 2.13281 16.8782 2.13281 16.5344V6.35942L10.1766 11.5157C10.4172 11.6875 10.6922 11.7563 10.9672 11.7563C11.2422 11.7563 11.5172 11.6875 11.7578 11.5157L19.8016 6.35942V16.5688C19.8703 16.9125 19.5953 17.1532 19.2516 17.1532Z"
                            fill=""
                          />
                        </g>
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="mb-2.5 block font-medium text-black dark:text-white">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Masukkan password"
                      className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-4 top-4 text-body hover:text-primary dark:text-bodydark dark:hover:text-primary"
                      aria-label={
                        showPassword ? 'Sembunyikan password' : 'Lihat password'
                      }
                    >
                      <svg
                        className="fill-current"
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g opacity="0.5">
                          {showPassword ? (
                            <>
                              <path
                                d="M11 5.5C5.5 5.5 2.75 11 2.75 11C2.75 11 5.5 16.5 11 16.5C16.5 16.5 19.25 11 19.25 11C19.25 11 16.5 5.5 11 5.5ZM11 14.6667C8.97083 14.6667 7.33333 13.0292 7.33333 11C7.33333 8.97083 8.97083 7.33333 11 7.33333C13.0292 7.33333 14.6667 8.97083 14.6667 11C14.6667 13.0292 13.0292 14.6667 11 14.6667Z"
                                fill=""
                              />
                              <path
                                d="M11 9.16667C9.99167 9.16667 9.16667 9.99167 9.16667 11C9.16667 12.0083 9.99167 12.8333 11 12.8333C12.0083 12.8333 12.8333 12.0083 12.8333 11C12.8333 9.99167 12.0083 9.16667 11 9.16667Z"
                                fill=""
                              />
                            </>
                          ) : (
                            <>
                              <path
                                d="M3.39167 2.75L2.75 3.39167L6.00417 6.64583C3.75833 8.06667 2.75 11 2.75 11C2.75 11 5.5 16.5 11 16.5C12.4667 16.5 13.7042 16.1333 14.7583 15.5833L18.6083 19.25L19.25 18.6083L3.39167 2.75ZM11 14.6667C8.97083 14.6667 7.33333 13.0292 7.33333 11C7.33333 10.3583 7.51667 9.71667 7.79167 9.16667L9.075 10.45C9.075 10.6333 9.16667 10.8167 9.16667 11C9.16667 12.0083 9.99167 12.8333 11 12.8333C11.1833 12.8333 11.3667 12.8333 11.55 12.7417L12.8333 14.025C12.2833 14.3917 11.6417 14.6667 11 14.6667Z"
                                fill=""
                              />
                              <path
                                d="M11 5.5C9.99167 5.5 9.075 5.68333 8.25 6.05L9.71667 7.51667C10.0833 7.425 10.5417 7.33333 11 7.33333C13.0292 7.33333 14.6667 8.97083 14.6667 11C14.6667 11.4583 14.575 11.9167 14.3917 12.375L16.5 14.4833C18.425 13.0625 19.25 11 19.25 11C19.25 11 16.5 5.5 11 5.5Z"
                                fill=""
                              />
                            </>
                          )}
                        </g>
                      </svg>
                    </button>
                  </div>
                </div>

                <label className="mb-6 flex cursor-pointer items-center gap-3 text-sm text-black dark:text-white">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-form-strokedark"
                  />
                  Ingat saya
                </label>

                {errorMessage && (
                  <div className="mb-5 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                    {errorMessage}
                  </div>
                )}

                <input
                  type="submit"
                  value={isSubmitting ? 'Memproses...' : 'Masuk'}
                  disabled={isSubmitting}
                  className="w-full cursor-pointer rounded-lg border border-primary bg-primary p-4 font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default SignIn;