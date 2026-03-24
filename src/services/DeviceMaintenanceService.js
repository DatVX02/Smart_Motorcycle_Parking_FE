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

  //update maintenance
  update: async (id, data) => {
    const res = await apiClient.put(`${API_URL}/${id}`, data, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    return res.data;
  },

  //delete maintenance
  delete: async (id) => {
    const res = await apiClient.delete(`${API_URL}/${id}`);
    return res.data;
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

  // complete maintenance
  complete: async (id, nextMaintenanceDate, image) => {

    const payload = {
      status: "Completed",
      nextMaintenanceDate,
      image,
    };

    const res = await apiClient.put(`${API_URL}/${id}`, payload);

    return res.data;
  },

  // delete maintenance
  delete: async (id) => {
    const res = await apiClient.delete(`${API_URL}/${id}`);
    return res.data;
  },


};
export default DeviceMaintenanceService;