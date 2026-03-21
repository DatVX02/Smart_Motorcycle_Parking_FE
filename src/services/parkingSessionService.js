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
    if (raw?.items    && Array.isArray(raw.items))    return raw.items;
    if (Array.isArray(raw)) return raw;
    return [];
  },
};

export default parkingSessionService;
