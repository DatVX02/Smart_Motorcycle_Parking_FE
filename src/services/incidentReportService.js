import apiClient from "../config/api";

const BASE = "/api/v1/incident-reports";
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

const incidentReportService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get(BASE, { params });
    return unwrap(response.data);
  },

  getById: async (id) => {
    const response = await apiClient.get(`${BASE}/${id}`);
    return unwrap(response.data);
  },
};

export default incidentReportService;
