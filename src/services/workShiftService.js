import apiClient from "../config/api";

const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

const workShiftService = {
  getById: (id) => apiClient.get(`/api/v1/work-shifts/${id}`).then(unwrap),
  getDetail: (id) =>
    apiClient.get(`/api/v1/work-shifts/${id}/detail`).then(unwrap),
  getByLot: (lotId, options = {}) => {
    const params = {};
    params.pageSize = options.pageSize ?? 9999;
    if (options.page != null) params.page = options.page;
    if (options.pageNumber != null) params.pageNumber = options.pageNumber;
    if (options.month != null) params.month = options.month;
    if (options.year != null) params.year = options.year;
    if (options.startDate != null) params.startDate = options.startDate;
    if (options.endDate != null) params.endDate = options.endDate;
    return apiClient
      .get(`/api/v1/work-shifts/lot/${lotId}`, { params })
      .then(unwrap);
  },
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

  getPendingShiftChangeRequests: () =>
    apiClient
      .get("/api/v1/work-shifts/shift-change-requests/pending")
      .then(unwrap),
  getAdminShiftChangeNotifications: (options = {}) => {
    const params = {};
    if (options.pageNumber != null) params.pageNumber = options.pageNumber;
    if (options.pageSize != null) params.pageSize = options.pageSize;
    return apiClient
      .get("/api/v1/notifications/admin/all", { params })
      .then(unwrap);
  },
  processShiftChangeRequest: (payload) =>
    apiClient
      .post("/api/v1/work-shifts/shift-change-requests/process", payload)
      .then(unwrap),
  adminSwapShifts: (payload) =>
    apiClient.post("/api/v1/staff/admin-swap-shifts", payload).then(unwrap),

  checkAnomalies: (params) =>
    apiClient
      .get("/api/v1/work-shifts/check-anomalies", { params })
      .then(unwrap),
  checkMultipleLotConflicts: (params) =>
    apiClient
      .get("/api/v1/work-shifts/check-multiple-lot-conflicts", { params })
      .then(unwrap),
  checkOverstaffedLots: (params) =>
    apiClient
      .get("/api/v1/work-shifts/check-overstaffed-lots", { params })
      .then(unwrap),
  checkUnbalancedWorkload: (params) =>
    apiClient
      .get("/api/v1/work-shifts/check-unbalanced-workload", { params })
      .then(unwrap),
  checkUnscheduledDays: (params) =>
    apiClient
      .get("/api/v1/work-shifts/check-unscheduled-days", { params })
      .then(unwrap),
  checkEmptyShifts: (params) =>
    apiClient
      .get("/api/v1/work-shifts/check-empty-shifts", { params })
      .then(unwrap),
};

export default workShiftService;
