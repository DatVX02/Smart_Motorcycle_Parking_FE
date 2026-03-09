import apiClient from "../config/api";

const AUTH_BASE_PATH = "/api/v1/staff";

/**
 * Service để quản lý authentication và user management
 */
const authService = {
  /**
   * Đăng nhập
   * POST /api/v1/staff/login
   * @param {Object} credentials - { email, password }
   */
  login: async (credentials) => {
    try {
      // Log request data for debugging
      console.log("Login request:", {
        emailOrPhone: credentials.emailOrPhone,
        password: "***hidden***",
      });

      // Backend expects 'emailOrPhone' field (from your Swagger)
      const response = await apiClient.post(`${AUTH_BASE_PATH}/login`, {
        emailOrPhone: credentials.emailOrPhone,
        password: credentials.password,
      });
      
      console.log("Login response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      
      // Log validation errors specifically
      if (error.response?.data?.errors) {
        console.error("Validation errors:", error.response.data.errors);
        console.table(error.response.data.errors); // Display in table format
      }
      
      throw error;
    }
  },

  /**
   * Đăng ký tài khoản mới
   * POST /api/v1/staff/register
   * @param {Object} userData - Thông tin đăng ký
   */
  register: async (userData) => {
    try {
      const response = await apiClient.post(
        `${AUTH_BASE_PATH}/register`,
        userData
      );
      return response.data;
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
  },

  /**
   * Đăng xuất
   * POST /api/v1/staff/logout
   */
  logout: async () => {
    try {
      const response = await apiClient.post(`${AUTH_BASE_PATH}/logout`);
      // Clear local storage
      localStorage.removeItem("access_token");
      return response.data;
    } catch (error) {
      console.error("Logout error:", error);
      // Clear token anyway
      localStorage.removeItem("access_token");
      throw error;
    }
  },

  /**
   * Lấy thông tin profile của user hiện tại
   * GET /api/v1/staff/profile
   */
  getProfile: async () => {
    try {
      const response = await apiClient.get(`${AUTH_BASE_PATH}/profile`);
      return response.data;
    } catch (error) {
      console.error("Get profile error:", error);
      throw error;
    }
  },

  /**
   * Lấy danh sách staff
   * GET /api/v1/staff
   */
  getAllStaff: async () => {
    try {
      const response = await apiClient.get(AUTH_BASE_PATH);
      return response.data;
    } catch (error) {
      console.error("Get all staff error:", error);
      throw error;
    }
  },

  /**
   * Đăng ký khuôn mặt (Face Recognition)
   * POST /api/v1/staff/register-face
   * @param {FormData} faceData - Dữ liệu khuôn mặt
   */
  registerFace: async (faceData) => {
    try {
      const response = await apiClient.post(
        `${AUTH_BASE_PATH}/register-face`,
        faceData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Register face error:", error);
      throw error;
    }
  },

  /**
   * Kiểm tra xem user đã đăng nhập chưa
   */
  isAuthenticated: () => {
    return !!localStorage.getItem("access_token");
  },

  /**
   * Lấy token từ localStorage
   */
  getToken: () => {
    return localStorage.getItem("access_token");
  },

  /**
   * Lưu token vào localStorage
   */
  setToken: (token) => {
    localStorage.setItem("access_token", token);
  },

  /**
   * Lấy thông tin user đang đăng nhập
   */
  getCurrentUser: () => {
    try {
      const info = localStorage.getItem("user_info");
      return info ? JSON.parse(info) : null;
    } catch {
      return null;
    }
  },

  /**
   * Xóa toàn bộ dữ liệu auth khỏi localStorage
   */
  clearAuth: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_info");
  },
};

export default authService;
