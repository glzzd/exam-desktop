import axios from 'axios';

const savedUrl = localStorage.getItem('server_url');
const defaultUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

// If saved URL is just base (e.g. http://192.168.1.35:5001), append /api/v1
// If it already has /api/v1, use as is
const getApiUrl = (url) => {
  if (!url) return defaultUrl;
  if (url.includes('/api/v1')) return url;
  return `${url.replace(/\/$/, '')}/api/v1`;
};

const baseURL = savedUrl ? getApiUrl(savedUrl) : defaultUrl;

console.log('API Base URL:', baseURL);

const api = axios.create({
  baseURL: baseURL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized (e.g., redirect to login or refresh token)
      localStorage.removeItem('accessToken');
      window.location.href = '#/login';
    }
    return Promise.reject(error);
  }
);

export default api;
