import apiClient from "../config/api";

const BASE = "/api/v1/transactions";

const unwrap = (data) => data?.data ?? data;

const transactionService = {
  /**
   * GET /api/v1/transactions - Lấy danh sách giao dịch (có phân trang và bộ lọc)
   * @param {Object} params - { pageNumber, pageSize, userId, lotId, transactionType, paymentMethod, paymentStatus, fromDate, toDate }
   */
  getAll: async (params = {}) => {
    const response = await apiClient.get(BASE, { params });
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/transactions/{id} - Lấy chi tiết giao dịch
   */
  getById: async (id) => {
    const response = await apiClient.get(`${BASE}/${id}`);
    return unwrap(response.data);
  },

  /**
   * POST /api/v1/transactions - Tạo giao dịch mới
   * @param {Object} payload - dữ liệu giao dịch
   */
  create: async (payload) => {
    const response = await apiClient.post(BASE, payload);
    return unwrap(response.data);
  },

  /**
   * PATCH /api/v1/transactions/{id}/status - Cập nhật trạng thái giao dịch
   * @param {string|number} id - ID giao dịch
   * @param {string} status - trạng thái mới
   */
  updateStatus: async (id, status) => {
    const response = await apiClient.patch(`${BASE}/${id}/status`, { status });
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/transactions/statistics - Lấy thống kê giao dịch
   * @param {Object} params - { fromDate, toDate }
   */
  getStatistics: async (params = {}) => {
    const response = await apiClient.get(`${BASE}/statistics`, { params });
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/transactions/payment-breakdowns - Lấy danh sách breakdown thanh toán
   * @param {Object} params - bộ lọc tương tự danh sách giao dịch
   */
  getPaymentBreakdowns: async (params = {}) => {
    const response = await apiClient.get(`${BASE}/payment-breakdowns`, {
      params,
    });
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/transactions/payment-breakdowns/{targetType}/{targetId}
   * - Lấy breakdown theo thực thể đích
   */
  getPaymentBreakdownsByTarget: async (targetType, targetId, params = {}) => {
    const response = await apiClient.get(
      `${BASE}/payment-breakdowns/${targetType}/${targetId}`,
      { params },
    );
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/transactions/user/{userId}/history - Lịch sử giao dịch của người dùng
   * @param {string|number} userId
   * @param {Object} params - { page, pageSize }
   */
  getUserHistory: async (userId, params = {}) => {
    const response = await apiClient.get(`${BASE}/user/${userId}/history`, {
      params,
    });
    return unwrap(response.data);
  },
};

export default transactionService;
