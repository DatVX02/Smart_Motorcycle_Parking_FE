import apiClient from "../config/api";

const PARKING_LOT_BASE_PATH = "/api/v1/parking-lots";

const unwrap = (data) => data?.data ?? data;

const parkingLotService = {
  /**
   * GET /api/v1/parking-lots - Lấy danh sách tất cả bãi đỗ xe
   */
  getAllParkingLots: async () => {
    const response = await apiClient.get(PARKING_LOT_BASE_PATH);
    const raw = unwrap(response.data);
    if (raw?.items && Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw)) return raw;
    return [];
  },

  /**
   * GET /api/v1/parking-lots/{id} - Lấy thông tin một bãi đỗ theo ID
   */
  getParkingLotById: async (id) => {
    const response = await apiClient.get(`${PARKING_LOT_BASE_PATH}/${id}`);
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/parking-lots/{id}/detail - Lấy chi tiết đầy đủ (cổng, thiết bị, AI config)
   */
  getParkingLotDetail: async (id) => {
    const response = await apiClient.get(
      `${PARKING_LOT_BASE_PATH}/${id}/detail`,
    );
    return unwrap(response.data);
  },

  /**
   * GET /api/v1/parking-lots/{id}/statistics - Lấy thống kê bãi đỗ
   */
  getParkingLotStatistics: async (id) => {
    const response = await apiClient.get(
      `${PARKING_LOT_BASE_PATH}/${id}/statistics`,
    );
    return unwrap(response.data);
  },

  /**
   * POST /api/v1/parking-lots - Tạo bãi đỗ xe mới
   * @param {Object} payload - { lotInfo?, cameraSetup? } hoặc format backend yêu cầu
   */
  createParkingLot: async (payload) => {
    const response = await apiClient.post(PARKING_LOT_BASE_PATH, payload);
    return unwrap(response.data);
  },

  /**
   * PUT /api/v1/parking-lots/{id} - Cập nhật bãi đỗ xe
   */
  updateParkingLot: async (id, payload) => {
    const response = await apiClient.put(
      `${PARKING_LOT_BASE_PATH}/${id}`,
      payload,
    );
    return unwrap(response.data);
  },

  /**
   * DELETE /api/v1/parking-lots/{id} - Xóa bãi đỗ xe
   */
  deleteParkingLot: async (id) => {
    const response = await apiClient.delete(`${PARKING_LOT_BASE_PATH}/${id}`);
    return unwrap(response.data);
  },
};

export default parkingLotService;
