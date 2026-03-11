import apiClient from "../config/api";

const BASE = "/api/v1/dashboard";

const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

const dashboardService = {
  /** GET /api/v1/dashboard/revenue - Doanh thu */
  getRevenue: () =>
    apiClient.get(`${BASE}/revenue`).then((r) => unwrap(r.data)),

  /** GET /api/v1/dashboard/sessions - Phiên giao dịch / xe vào ra */
  getSessions: () =>
    apiClient.get(`${BASE}/sessions`).then((r) => unwrap(r.data)),

  /** GET /api/v1/dashboard/occupancy - Mức độ sử dụng bãi đỗ */
  getOccupancy: () =>
    apiClient.get(`${BASE}/occupancy`).then((r) => unwrap(r.data)),

  /** GET /api/v1/dashboard/peak-hours - Giờ cao điểm */
  getPeakHours: () =>
    apiClient.get(`${BASE}/peak-hours`).then((r) => unwrap(r.data)),

  /** GET /api/v1/dashboard/device-health - Trạng thái thiết bị */
  getDeviceHealth: () =>
    apiClient.get(`${BASE}/device-health`).then((r) => unwrap(r.data)),
};

export default dashboardService;
