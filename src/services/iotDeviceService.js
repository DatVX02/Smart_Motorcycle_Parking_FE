import apiClient from "../config/api";

const BASE = "/api/v1/iot-devices";
const unwrap = (res) => res?.data?.data ?? res?.data;

const iotDeviceService = {
  /** GET /api/v1/iot-devices - Lấy tất cả thiết bị (hỗ trợ pageSize để lấy hết) */
  getAll: async (params = {}) => {
    const reqParams = { ...params };
    if (reqParams.pageSize == null) reqParams.pageSize = 9999;
    const res = await apiClient.get(BASE, { params: reqParams });
    const raw = unwrap(res);
    if (raw?.items && Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw)) return raw;
    return [];
  },

  /** GET /api/v1/iot-devices/{id} */
  getById: async (id) => {
    const res = await apiClient.get(`${BASE}/${id}`);
    return unwrap(res);
  },

  /** GET /api/v1/iot-devices/{id}/detail */
  getDetail: async (id) => {
    const res = await apiClient.get(`${BASE}/${id}/detail`);
    return unwrap(res);
  },

  /** GET /api/v1/iot-devices/lot/{lotId} */
  getByLot: async (lotId) => {
    const res = await apiClient.get(`${BASE}/lot/${lotId}`);
    const raw = unwrap(res);
    if (raw?.items && Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw)) return raw;
    return [];
  },

  /** POST /api/v1/iot-devices */
  create: async (payload) => {
    const res = await apiClient.post(BASE, payload);
    return unwrap(res);
  },

  /** PUT /api/v1/iot-devices/{id} */
  update: async (id, payload) => {
    const res = await apiClient.put(`${BASE}/${id}`, payload);
    return unwrap(res);
  },

  /** DELETE /api/v1/iot-devices/{id} */
  delete: async (id) => {
    const res = await apiClient.delete(`${BASE}/${id}`);
    return unwrap(res);
  },

  /** POST /api/v1/iot-devices/{id}/heartbeat */
  heartbeat: async (id) => {
    const res = await apiClient.post(`${BASE}/${id}/heartbeat`);
    return unwrap(res);
  },

  /** POST /api/v1/iot-devices/{id}/connection-status */
  updateConnectionStatus: async (id, connectionStatus) => {
    const res = await apiClient.post(`${BASE}/${id}/connection-status`, {
      connectionStatus,
    });
    return unwrap(res);
  },

  /** POST /api/v1/iot-devices/{id}/unassign */
  unassign: async (id) => {
    const res = await apiClient.post(`${BASE}/${id}/unassign`);
    return unwrap(res);
  },
};

export default iotDeviceService;
