import apiClient from "../config/api";

const PARKING_LOT_BASE_PATH = "/api/v1/parking-lots";

/**
 * Service để quản lý API calls liên quan đến bãi đỗ xe
 */
const parkingLotService = {
  /**
   * Lấy danh sách tất cả bãi đỗ xe
   * GET /api/v1/parking-lots
   */
  getAllParkingLots: async () => {
    try {
      const response = await apiClient.get(PARKING_LOT_BASE_PATH);
      console.log("Get all parking lots response:", response.data);
      
      // Handle different response formats
      // Format 1: { data: { items: [...], meta: {...} } } - Pagination format
      if (response.data?.data?.items) {
        console.log("Parking lots items:", response.data.data.items);
        return response.data.data.items;
      }
      // Format 2: { data: [...] } - Direct array in data
      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      // Format 3: Direct array [...]
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // Format 4: No data, return empty array
      console.warn("Unexpected response format:", response.data);
      return [];
    } catch (error) {
      console.error("Error fetching parking lots:", error);
      throw error;
    }
  },

  /**
   * Lấy thông tin chi tiết của một bãi đỗ xe theo ID
   * GET /api/v1/parking-lots/{id}
   * @param {number|string} id - ID của bãi đỗ xe
   */
  getParkingLotById: async (id) => {
    try {
      const response = await apiClient.get(`${PARKING_LOT_BASE_PATH}/${id}`);
      // Handle response format: { data: {...} } or direct object
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Error fetching parking lot ${id}:`, error);
      throw error;
    }
  },

  /**
   * Lấy thông tin chi tiết đầy đủ của một bãi đỗ xe
   * GET /api/v1/parking-lots/{id}/detail
   * @param {number|string} id - ID của bãi đỗ xe
   */
  getParkingLotDetail: async (id) => {
    try {
      const response = await apiClient.get(
        `${PARKING_LOT_BASE_PATH}/${id}/detail`
      );
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Error fetching parking lot detail ${id}:`, error);
      throw error;
    }
  },

  /**
   * Lấy thống kê của một bãi đỗ xe
   * GET /api/v1/parking-lots/{id}/statistics
   * @param {number|string} id - ID của bãi đỗ xe
   */
  getParkingLotStatistics: async (id) => {
    try {
      const response = await apiClient.get(
        `${PARKING_LOT_BASE_PATH}/${id}/statistics`
      );
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Error fetching parking lot statistics ${id}:`, error);
      throw error;
    }
  },

  /**
   * Tạo bãi đỗ xe mới
   * POST /api/v1/parking-lots
   * @param {Object} parkingLotData - Dữ liệu bãi đỗ xe mới
   */
  createParkingLot: async (parkingLotData) => {
    try {
      const response = await apiClient.post(
        PARKING_LOT_BASE_PATH,
        parkingLotData
      );
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error creating parking lot:", error);
      throw error;
    }
  },

  /**
   * Cập nhật thông tin bãi đỗ xe
   * PUT /api/v1/parking-lots/{id}
   * @param {number|string} id - ID của bãi đỗ xe
   * @param {Object} parkingLotData - Dữ liệu cập nhật
   */
  updateParkingLot: async (id, parkingLotData) => {
    try {
      const response = await apiClient.put(
        `${PARKING_LOT_BASE_PATH}/${id}`,
        parkingLotData
      );
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Error updating parking lot ${id}:`, error);
      throw error;
    }
  },

  /**
   * Xóa bãi đỗ xe
   * DELETE /api/v1/parking-lots/{id}
   * @param {number|string} id - ID của bãi đỗ xe cần xóa
   */
  deleteParkingLot: async (id) => {
    try {
      const response = await apiClient.delete(`${PARKING_LOT_BASE_PATH}/${id}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Error deleting parking lot ${id}:`, error);
      throw error;
    }
  },
};

export default parkingLotService;
