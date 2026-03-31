import apiClient from "../config/api";

const API_URL = "/api/v1/maintenance";

const DeviceMaintenanceService = {
  //get all maintenance (pageSize lớn để lấy hết lịch bảo trì)
  getAll: async (params = {}) => {
    const reqParams = { ...params };
    if (reqParams.pageSize == null) reqParams.pageSize = 9999;
    if (reqParams.pageNumber == null) reqParams.pageNumber = 1;
    const res = await apiClient.get(API_URL, { params: reqParams });
    return res.data;
  },

  //get due devices
  getDueDevices: async () => {
    const res = await apiClient.get(`${API_URL}/due-devices`);
    return res.data;
  },

  //get maintenance by id
  getById: async (id) => {
    const res = await apiClient.get(`${API_URL}/${id}`);
    return res.data;
  },

  //create maintenance
  create: async (data) => {
    const res = await apiClient.post(API_URL, data);
    return res.data;
  },

  /**
   * PUT /api/v1/maintenance/{id}
   * - Truyền FormData → multipart (upload ảnh); interceptor sẽ set boundary.
   * - Truyền object thường → JSON.
   */
  update: async (id, data) => {
    const res = await apiClient.put(`${API_URL}/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await apiClient.delete(`${API_URL}/${id}`);
    return res.data;
  },

  /**
   * PATCH /api/v1/maintenance/{id}/status — cập nhật trạng thái (vd. Completed = đã bảo trì).
   * Fallback PUT /api/v1/maintenance/{id} nếu PATCH 404/405.
   */
  patchStatus: async (id, body) => {
    const res = await apiClient.patch(`${API_URL}/${id}/status`, body);
    return res.data;
  },

  /**
   * Đánh dấu đã bảo trì — luôn dùng PUT multipart (khớp upload ảnh trên backend).
   * @param {string} id
   * @param {{ imageFile?: File | null }} [options]
   */
  markAsMaintained: async (id, options = {}) => {
    const { imageFile } = options;
    const fd = new FormData();
    fd.append("status", "Completed");
    fd.append("performedAt", new Date().toISOString());
    if (imageFile instanceof File) {
      fd.append("image", imageFile);
    }
    return DeviceMaintenanceService.update(id, fd);
  },

  /**
   * Xóa mọi lịch bảo trì gắn với danh sách thiết bị (trước khi xóa bãi).
   * @returns {Promise<{ deleted: number, failed: number, total: number }>}
   */
  deleteAllSchedulesForDevices: async (deviceIds) => {
    const ids = [...new Set((deviceIds ?? []).map((x) => String(x).trim()).filter(Boolean))];
    if (ids.length === 0) return { deleted: 0, failed: 0, total: 0 };

    const idSet = new Set(ids);
    let items = [];
    try {
      const res = await DeviceMaintenanceService.getAll();
      items = res?.data?.items || res?.items || [];
      if (!Array.isArray(items)) items = [];
    } catch {
      return { deleted: 0, failed: 0, total: -1 };
    }

    const maintenanceIds = [
      ...new Set(
        items
          .filter((m) => m && idSet.has(String(m.deviceId ?? m.DeviceId ?? "")))
          .map((m) => m.maintenanceId ?? m.id ?? m.Id)
          .filter((x) => x != null && x !== ""),
      ),
    ];

    let deleted = 0;
    let failed = 0;
    await Promise.all(
      maintenanceIds.map(async (mid) => {
        try {
          await DeviceMaintenanceService.delete(mid);
          deleted += 1;
        } catch {
          failed += 1;
        }
      }),
    );
    return { deleted, failed, total: maintenanceIds.length };
  },

  //get maintenance by device
  getByDevice: async (deviceId) => {
    const res = await apiClient.get(`${API_URL}/device/${deviceId}`);
    return res.data;
  },

  /** POST /api/v1/maintenance/device/{deviceId}/generate-schedule - Tự động tạo lịch bảo trì */
  generateSchedule: async (deviceId) => {
    const res = await apiClient.post(
      `${API_URL}/device/${deviceId}/generate-schedule`,
    );
    return res.data;
  },

  // complete maintenance (FormData nếu có file ảnh)
  complete: async (id, nextMaintenanceDate, image) => {
    if (image instanceof File || image instanceof Blob) {
      const fd = new FormData();
      fd.append("status", "Completed");
      if (nextMaintenanceDate != null && nextMaintenanceDate !== "") {
        fd.append("nextMaintenanceDate", String(nextMaintenanceDate));
      }
      fd.append("image", image);
      return DeviceMaintenanceService.update(id, fd);
    }
    const payload = {
      status: "Completed",
      nextMaintenanceDate,
    };
    const res = await apiClient.put(`${API_URL}/${id}`, payload);
    return res.data;
  },
};
export default DeviceMaintenanceService;