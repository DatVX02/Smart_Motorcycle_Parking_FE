import apiClient from "../config/api";

const BASE = "/api/v1/withdraw-requests";

const unwrap = (data) => data?.data ?? data;

const withdrawRequestService = {
  /**
   * GET /api/v1/withdraw-requests
   */
  getAll: async (params = {}) => {
    const response = await apiClient.get(BASE, { params });
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/withdraw-requests/{requestId}
   */
  getById: async (requestId) => {
    const response = await apiClient.get(`${BASE}/${requestId}`);
    return unwrap(response.data);
  },

  /**
   * PUT/PATCH /api/v1/withdraw-requests/{requestId}/status
   */
  updateStatus: async (requestId, payload) => {
    try {
      const response = await apiClient.patch(
        `${BASE}/${requestId}/status`,
        payload,
      );
      return unwrap(response.data);
    } catch {
      // Fallback when backend maps this endpoint with PUT instead of PATCH.
      const response = await apiClient.put(
        `${BASE}/${requestId}/status`,
        payload,
      );
      return unwrap(response.data);
    }
  },
};

export default withdrawRequestService;
