import apiClient from "../config/api";

/** Tiền tố API kiểm tra MQTT */
const BASE = "/api/MqttTest";
const unwrap = (res) => res?.data?.data ?? res?.data;

const mqttTestService = {
  /**
   * Gửi lệnh kiểm tra kết nối (test) tới một thiết bị qua MQTT.
   * POST /api/MqttTest/send-test
   */
  sendTest: async (payload = {}) => {
    const res = await apiClient.post(`${BASE}/send-test`, payload);
    return unwrap(res);
  },
};

export default mqttTestService;
