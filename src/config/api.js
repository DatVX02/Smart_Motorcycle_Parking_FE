import axios from "axios";

// Base API URL (cấu hình trong .env: VITE_API_BASE_URL)
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://localhost:5156";

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - Add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // FormData: let browser set Content-Type with boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
      // Handle 403 Forbidden
      if (error.response.status === 403) {
        console.error("Access forbidden");
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
