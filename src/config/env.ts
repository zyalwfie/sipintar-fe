export const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Alamat API backend, selalu diakhiri /api. VITE_API_BASE_URL
 * boleh ditulis dengan atau tanpa /api
 * (http://localhost:4000 atau http://localhost:4000/api).
 */
export const API_URL = `${(VITE_API_BASE_URL || 'http://localhost:4000')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '')}/api`;
