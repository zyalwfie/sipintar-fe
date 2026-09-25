/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // tambahkan variabel VITE_ lainnya di sini jika ada
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}