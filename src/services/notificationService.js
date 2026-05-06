import apiClient from "../config/api";

const BASE = "/api/v1/notifications";

function parseListResponse(axiosResponse) {
  const root = axiosResponse?.data;
  const inner = root?.data ?? root;

  if (Array.isArray(inner)) {
    return { items: inner };
  }

  if (inner && typeof inner === "object") {
    const items =
      inner.items ??
      inner.data ??
      inner.notifications ??
      inner.records ??
      inner.results ??
      [];
    return { items: Array.isArray(items) ? items : [] };
  }

  return { items: [] };
}

const notificationService = {
  /**
   * GET /api/v1/notifications/admin/device-status
   * Query: pageNumber, pageSize, isRead
   */
  getAdminDeviceStatus: async (params = {}) => {
    const res = await apiClient.get(`${BASE}/admin/device-status`, { params });
    return parseListResponse(res);
  },
};

export default notificationService;
