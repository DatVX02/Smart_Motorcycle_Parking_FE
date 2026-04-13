import apiClient from "../config/api";

const BASE = "/api/v1/vehicles";

const unwrap = (payload) => payload?.data?.data ?? payload?.data ?? payload;

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const vehicleService = {
  /**
   * GET /api/v1/vehicles
   * @param {Object} params - { userId, pageNumber, pageSize, ... }
   */
  getAll: async (params = {}) => {
    const response = await apiClient.get(BASE, { params });
    return extractItems(unwrap(response.data));
  },

  /**
   * GET /api/v1/vehicles/{vehicleId}
   */
  getById: async (vehicleId) => {
    const response = await apiClient.get(`${BASE}/${vehicleId}`);
    return unwrap(response.data);
  },
};

export default vehicleService;
