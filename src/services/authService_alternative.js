import apiClient from "../config/api";

const AUTH_BASE_PATH = "/api/v1/staff";

/**
 * Alternative auth service - Use if backend expects different field names
 */
const authServiceAlt = {
  // Option 1: Backend expects 'username' instead of 'email'
  loginWithUsername: async (credentials) => {
    try {
      const response = await apiClient.post(`${AUTH_BASE_PATH}/login`, {
        username: credentials.email, // Send email as username
        password: credentials.password,
      });
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // Option 2: Backend expects different structure
  loginWithDifferentStructure: async (credentials) => {
    try {
      const response = await apiClient.post(`${AUTH_BASE_PATH}/login`, {
        loginRequest: {
          email: credentials.email,
          password: credentials.password,
        }
      });
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // Option 3: Backend expects form data
  loginWithFormData: async (credentials) => {
    try {
      const formData = new FormData();
      formData.append('email', credentials.email);
      formData.append('password', credentials.password);

      const response = await apiClient.post(`${AUTH_BASE_PATH}/login`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // Option 4: Backend expects URL-encoded form
  loginWithUrlEncoded: async (credentials) => {
    try {
      const params = new URLSearchParams();
      params.append('email', credentials.email);
      params.append('password', credentials.password);

      const response = await apiClient.post(`${AUTH_BASE_PATH}/login`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },
};

export default authServiceAlt;
