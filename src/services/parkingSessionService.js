import apiClient from "../config/api";

const BASE = "/api/v1/parking-sessions";
const unwrap = (data) => data?.data?.data ?? data?.data ?? data;

const parkingSessionService = {
  /**
   * GET /api/v1/parking-sessions
   * @param {Object} params - { lotId, pageNumber, pageSize, ... }
   */
  getAll: async (params = {}) => {
    const res = await apiClient.get(BASE, { params });
    const raw = unwrap(res.data);
    if (raw?.sessions && Array.isArray(raw.sessions)) return raw.sessions;
    if (raw?.items && Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw)) return raw;
    return [];
  },

  /**
   * GET /api/v1/parking-sessions/status/plate/{licensePlate}
   */
  getStatusByPlate: async (licensePlate) => {
    const encodedPlate = encodeURIComponent(String(licensePlate ?? "").trim());
    const res = await apiClient.get(`${BASE}/status/plate/${encodedPlate}`);
    return res.data;
  },

  /**
   * GET /api/v1/parking-sessions/{sessionId}
   */
  getById: async (sessionId) => {
    const res = await apiClient.get(`${BASE}/${sessionId}`);
    return res.data;
  },

  /**
   * POST /api/v1/parking-sessions/{sessionId}/cancel
   */
  cancel: async (sessionId) => {
    const res = await apiClient.post(`${BASE}/${sessionId}/cancel`);
    return res.data;
  },

  /**
   * POST /api/v1/parking-sessions/pay-by-plate
   * @param {Object} payload - { LicensePlate, PaymentMethod, ExpectedCheckoutTime?, UserId? }
   */
  payByPlate: async (payload) => {
    const res = await apiClient.post(`${BASE}/pay-by-plate`, payload);
    return res.data;
  },
};

export default parkingSessionService;
