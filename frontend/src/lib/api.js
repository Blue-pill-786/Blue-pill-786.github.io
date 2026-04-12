import axios from "axios";

/* ================= API INSTANCE ================= */

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  withCredentials: true
});

/* ================= REQUEST INTERCEPTOR ================= */

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pg_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/* ================= RESPONSE INTERCEPTOR ================= */

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;

    console.error("🚨 API ERROR:", error.response?.data || error.message);

    // ✅ Auto logout on auth failure
    if (status === 401) {
      localStorage.removeItem("pg_token");
      localStorage.removeItem("pg_user");

      // brutal but effective
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pg_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});