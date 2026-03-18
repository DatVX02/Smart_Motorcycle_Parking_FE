import apiClient from "../config/api";

const BASE_PATH = "/api/v1/loyalty-configs";

const unwrap = (data) => data?.data ?? data;

const loyaltyConfigService = {
  /**
   * POST /api/v1/loyalty-configs - Tạo cấu hình điểm thưởng mới
   * @param {Object} payload - { lotId, pointsPer1000Vnd, vndPerPoint, monthlyPassValue, startDate, endDate }
   */
  create: async (payload) => {
    const response = await apiClient.post(BASE_PATH, payload);
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/loyalty-configs - Lấy danh sách cấu hình
   * @param {Object} params - { isActive?: boolean, lotId?: string }
   */
  getAll: async (params = {}) => {
    const response = await apiClient.get(BASE_PATH, { params });
    const raw = unwrap(response.data);
    if (raw?.items && Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw)) return raw;
    return [];
  },

  /**
   * GET /api/v1/loyalty-configs/{configId} - Lấy cấu hình theo ID
   */
  getById: async (configId) => {
    const response = await apiClient.get(`${BASE_PATH}/${configId}`);
    return unwrap(response.data);
  },

  /**
   * PUT /api/v1/loyalty-configs/{configId} - Cập nhật cấu hình
   * @param {Object} payload - { lotId, pointsPer1000Vnd, vndPerPoint, monthlyPassValue, isActive, startDate, endDate }
   */
  update: async (configId, payload) => {
    const response = await apiClient.put(`${BASE_PATH}/${configId}`, payload);
    return unwrap(response.data);
  },

  /**
   * DELETE /api/v1/loyalty-configs/{configId} - Xóa cấu hình
   */
  delete: async (configId) => {
    const response = await apiClient.delete(`${BASE_PATH}/${configId}`);
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/loyalty-configs/active - Lấy tất cả cấu hình đang hoạt động
   */
  getActive: async () => {
    const response = await apiClient.get(`${BASE_PATH}/active`);
    const raw = unwrap(response.data);
    if (raw?.items && Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw)) return raw;
    return [];
  },

  /**
   * GET /api/v1/loyalty-configs/active/lot/{lotId} - Lấy cấu hình đang hoạt động theo bãi xe
   */
  getActiveByLot: async (lotId) => {
    const response = await apiClient.get(`${BASE_PATH}/active/lot/${lotId}`);
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/loyalty-configs/active/by-lot - Lấy cấu hình đang hoạt động nhóm theo bãi xe
   * @param {string} lotId - (optional)
   */
  getActiveGroupedByLot: async (lotId) => {
    const params = lotId ? { lotId } : {};
    const response = await apiClient.get(`${BASE_PATH}/active/by-lot`, { params });
    const raw = unwrap(response.data);
    if (raw?.items && Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw)) return raw;
    return [];
  },
};

export default loyaltyConfigService;
