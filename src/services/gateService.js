import apiClient from "../config/api";

const BASE = "/api/v1/gates";
const unwrap = (res) => res?.data?.data ?? res?.data;

const gateService = {
  /** GET /api/v1/gates/lot/{lotId} */
  getByLot: async (lotId) => {
    const res = await apiClient.get(`${BASE}/lot/${lotId}`);
    const raw = unwrap(res);
    if (raw?.items && Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw)) return raw;
    return [];
  },

  /** GET /api/v1/gates/{gateId} */
  getById: async (gateId) => {
    const res = await apiClient.get(`${BASE}/${gateId}`);
    return unwrap(res);
  },

  /** POST /api/v1/gates */
  create: async (payload) => {
    const res = await apiClient.post(BASE, payload);
    return unwrap(res);
  },

  /** PUT /api/v1/gates/{gateId} */
  update: async (gateId, payload) => {
    const res = await apiClient.put(`${BASE}/${gateId}`, payload);
    return unwrap(res);
  },

  /** DELETE /api/v1/gates/{gateId} */
  delete: async (gateId) => {
    const res = await apiClient.delete(`${BASE}/${gateId}`);
    return unwrap(res);
  },
};

export default gateService;
