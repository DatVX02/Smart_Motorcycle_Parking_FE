import apiClient from "../config/api";

const API_URL = "/api/v1/maintenance";

const DeviceMaintenanceService = {
//get all maintenance
  getAll: async () => {
    const res = await apiClient.get(API_URL);
    return res.data;
  },

  //get due devices
  getDueDevices: async () => {
    const res = await apiClient.get(`${API_URL}/due-devices`);
    return res.data;
  },

  //create maintenance
  create: async (data) => {
    const res = await apiClient.post(API_URL, data);
    return res.data;
  },

  //update maintenance
  update: async (id, data) => {
    const res = await apiClient.put(`${API_URL}/${id}`, data);
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
  }

};

export default DeviceMaintenanceService;