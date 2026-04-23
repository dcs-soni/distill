import axios from 'axios';
import { API_BASE_URL } from '@/lib/utils';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

/* Inject JWT from localStorage on every request */
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('distill_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* Redirect to /login on 401 (token expired / revoked) */
apiClient.interceptors.response.use(
  (response) => response,
  (error: import('axios').AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('distill_token');
      localStorage.removeItem('distill_user');
      localStorage.removeItem('distill_tenant');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
