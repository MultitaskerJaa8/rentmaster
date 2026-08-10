import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 25000,
});

/* Attach JWT on every request */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rm_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/* Normalize errors + auto-logout on 401 */
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'Request timed out. Please check your connection.'
        : error.message) ||
      'Unexpected error occurred';

    if (status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('rm_token');
      localStorage.removeItem('rm_user');
      window.location.href = '/login';
    }

    return Promise.reject(new Error(message));
  }
);

export default api;