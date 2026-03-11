import apiClient from "../config/api";

const MONTHLY_PASS_BASE_PATH = "/api/v1/monthly-pass-packages";

const unwrap = (data) => data?.data ?? data;

const monthlyPassService = {
  /**
   * POST /api/v1/monthly-pass-packages - Tạo gói vé tháng mới
   * @param {Object} payload - { lotId, packageName, description, monthCount, price }
   */
  create: async (payload) => {
    const response = await apiClient.post(MONTHLY_PASS_BASE_PATH, payload);
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/monthly-pass-packages/lot/{lotId} - Lấy gói vé tháng theo bãi xe
   */
  getByLotId: async (lotId) => {
    const response = await apiClient.get(
      `${MONTHLY_PASS_BASE_PATH}/lot/${lotId}`,
    );
    const raw = unwrap(response.data);
    if (raw?.items && Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw)) return raw;
    return [];
  },

  /**
   * GET /api/v1/monthly-pass-packages/{id} - Lấy chi tiết một gói
   */
  getById: async (id) => {
    const response = await apiClient.get(`${MONTHLY_PASS_BASE_PATH}/${id}`);
    return unwrap(response.data);
  },

  /**
   * PUT /api/v1/monthly-pass-packages/{id} - Cập nhật gói vé tháng
   */
  update: async (id, payload) => {
    const response = await apiClient.put(
      `${MONTHLY_PASS_BASE_PATH}/${id}`,
      payload,
    );
    return unwrap(response.data);
  },

  /**
   * DELETE /api/v1/monthly-pass-packages/{id} - Xóa gói vé tháng
   */
  delete: async (id) => {
    const response = await apiClient.delete(
      `${MONTHLY_PASS_BASE_PATH}/${id}`,
    );
    return unwrap(response.data);
  },
};

export default monthlyPassService;
