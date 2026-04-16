import axios from 'axios';

/* ================= ENV FIX ================= */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const IS_DEV = import.meta.env.MODE === 'development';

// Consistent token key
const TOKEN_KEY = 'auth_token';

/**
 * Advanced API Service with Interceptors, Retry Logic, and Token Management
 */
class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.isRefreshing = false;
    this.failedQueue = [];

    this.setupInterceptors();
  }

  /* ================= INTERCEPTORS ================= */

  setupInterceptors() {
    // Request Interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        config.headers['X-Request-ID'] = this.generateRequestId();

        if (IS_DEV) {
          console.log(`📤 [${config.method.toUpperCase()}] ${config.url}`);
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (IS_DEV) {
          console.log(`✅ [${response.status}] ${response.config.url}`);
        }
        return response;
      },
      (error) => this.handleResponseError(error)
    );
  }

  /* ================= ERROR HANDLING ================= */

  handleResponseError = async (error) => {
    const originalRequest = error.config;

    // 🔁 TOKEN REFRESH
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.client(originalRequest);
          })
          .catch((err) => {
            this.clearAuth();
            return Promise.reject(err);
          });
      }

      this.isRefreshing = true;
      originalRequest._retry = true;

      try {
        const response = await this.refreshToken();
        const newToken = response.data.token;

        localStorage.setItem('auth_token', newToken);

        this.failedQueue.forEach(({ resolve }) => resolve(newToken));
        this.failedQueue = [];
        this.isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return this.client(originalRequest);
      } catch (err) {
        this.clearAuth();
        this.failedQueue = [];
        this.isRefreshing = false;
        return Promise.reject(err);
      }
    }

    // 🔁 RATE LIMIT
    if (error.response?.status === 429 && !originalRequest._retryCount) {
      originalRequest._retryCount = 1;
      const retryAfter = parseInt(error.response.headers['retry-after'] || 60);

      await new Promise((res) => setTimeout(res, retryAfter * 1000));
      return this.client(originalRequest);
    }

    // 🔁 SERVER ERROR RETRY
    if (
      error.response?.status >= 500 &&
      !originalRequest._retryCount &&
      !['post', 'put', 'delete'].includes(originalRequest.method)
    ) {
      originalRequest._retryCount = 1;
      const delay = Math.min(1000 * 2, 10000);

      await new Promise((res) => setTimeout(res, delay));
      return this.client(originalRequest);
    }

    if (IS_DEV) {
      console.error(
        `❌ [${error.response?.status || 'No Status'}] ${error.config.url}`
      );
      console.error('Error:', error.response?.data || error.message);
    }

    return Promise.reject(error);
  };

  /* ================= AUTH ================= */

  refreshToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    return this.client.post('/auth/refresh', { refreshToken });
  };

  clearAuth = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    window.location.href = '/login';
  };

  /* ================= HELPERS ================= */

  generateRequestId = () => {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  /* ================= REQUEST METHODS ================= */

  get = (url, config = {}) => this.client.get(url, config);

  post = (url, data = {}, config = {}) =>
    this.client.post(url, data, config);

  put = (url, data = {}, config = {}) =>
    this.client.put(url, data, config);

  patch = (url, data = {}, config = {}) =>
    this.client.patch(url, data, config);

  delete = (url, config = {}) =>
    this.client.delete(url, config);

  uploadFile = (url, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        const progress = Math.round((e.loaded * 100) / e.total);
        onProgress?.(progress);
      },
    });
  };

  batch = (requests) =>
    Promise.all(requests.map((req) => this.client(req)));
}

export const apiService = new ApiService();
export default apiService;