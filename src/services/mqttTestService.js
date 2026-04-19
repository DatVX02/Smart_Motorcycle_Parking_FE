import apiClient from "../config/api";

const BASE = "/api/MqttTest";
const unwrap = (res) => res?.data?.data ?? res?.data;

const mqttTestService = {
  /** POST /api/MqttTest/send-test */
  sendTest: async (payload = {}) => {
    const res = await apiClient.post(`${BASE}/send-test`, payload);
    return unwrap(res);
  },
};

export default mqttTestService;
