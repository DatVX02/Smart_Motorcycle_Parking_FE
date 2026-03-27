import apiClient from "../config/api";

const API_URL = "/api/v1/staff";
const staffService = {
    getAllStaff: () => {
        return apiClient.get(API_URL);
    },

    createAccountStaff: (formData) => {
        return apiClient.post(`${API_URL}/register`, formData);
    },

    getStaffById: (id) => {
        return apiClient.get(`${API_URL}/${id}`);
    },

    updateStaff: (id, formData) => {
        return apiClient.put(`${API_URL}/${id}`, formData);
    },

    deleteStaff: (id) => {
        return apiClient.delete(`${API_URL}/${id}`);
    },

    toggleStatus: (id) => {
        return apiClient.patch(`${API_URL}/${id}/toggle-status`, null, {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("access_token"),
            },
        });
    },

    /**
     * PATCH /api/v1/staff/update-shift-change-status
     * Cập nhật trạng thái thông báo yêu cầu đổi ca (query: notificationId, newStatus).
     */
    updateShiftChangeStatus: (notificationId, newStatus) =>
        apiClient.patch(`${API_URL}/update-shift-change-status`, null, {
            params: { notificationId, newStatus },
        }),
};

export default staffService;