import apiClient from "../config/api";

const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

const workShiftService = {
  getById: (id) => apiClient.get(`/api/v1/work-shifts/${id}`).then(unwrap),
  getDetail: (id) =>
    apiClient.get(`/api/v1/work-shifts/${id}/detail`).then(unwrap),
  getByLot: (lotId) =>
    apiClient.get(`/api/v1/work-shifts/lot/${lotId}`).then(unwrap),
  getByStaff: (staffId) =>
    apiClient.get(`/api/v1/work-shifts/staff/${staffId}`).then(unwrap),
  getTodayByLot: (lotId) =>
    apiClient.get(`/api/v1/work-shifts/lot/${lotId}/today`).then(unwrap),

  create: (payload) =>
    apiClient.post("/api/v1/work-shifts", payload).then(unwrap),
  bulkCreate: (payload) =>
    apiClient.post("/api/v1/work-shifts/bulk", payload).then(unwrap),
  bulkAssign: (payload) =>
    apiClient.post("/api/v1/work-shifts/bulk-assign", payload).then(unwrap),

  update: (id, payload) =>
    apiClient.put(`/api/v1/work-shifts/${id}`, payload).then(unwrap),
  delete: (id) => apiClient.delete(`/api/v1/work-shifts/${id}`),
};

export default workShiftService;
