import apiClient from "../config/api";

const BASE = "/api/v1/ai-configs";
const unwrap = (res) => res?.data?.data ?? res?.data;

const aiConfigService = {
  /** GET /api/v1/ai-configs/lot/{lotId} */
  getByLot: async (lotId) => {
    const res = await apiClient.get(`${BASE}/lot/${lotId}`);
    return unwrap(res);
  },

  /** GET /api/v1/ai-configs/{configId} */
  getById: async (configId) => {
    const res = await apiClient.get(`${BASE}/${configId}`);
    return unwrap(res);
  },

  /** POST /api/v1/ai-configs */
  create: async (payload) => {
    const res = await apiClient.post(BASE, payload);
    return unwrap(res);
  },

  /** PUT /api/v1/ai-configs/{configId} */
  update: async (configId, payload) => {
    const res = await apiClient.put(`${BASE}/${configId}`, payload);
    return unwrap(res);
  },

  /** DELETE /api/v1/ai-configs/{configId} */
  delete: async (configId) => {
    const res = await apiClient.delete(`${BASE}/${configId}`);
    return unwrap(res);
  },
};

export default aiConfigService;
