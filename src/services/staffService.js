import apiClient from "../config/api";

const API_URL = "/api/v1/staff";

const toStatusVariants = (status) => {
  const raw = String(status ?? "").trim();
  if (!raw) return [];
  const upper = raw.toUpperCase();
  const pascal = upper.charAt(0) + upper.slice(1).toLowerCase();
  return Array.from(new Set([raw, upper, pascal]));
};

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
   * Backward-compatible: thử query params trước, fallback body nếu backend bind theo body.
   */
  updateShiftChangeStatus: async (notificationId, newStatus) => {
    const id = String(notificationId ?? "").trim();
    if (!id) throw new Error("Thiếu notificationId để cập nhật trạng thái");

    let lastErr;
    const variants = toStatusVariants(newStatus);

    for (const status of variants) {
      try {
        return await apiClient.patch(
          `${API_URL}/update-shift-change-status`,
          null,
          {
            params: { notificationId: id, newStatus: status },
          },
        );
      } catch (err) {
        lastErr = err;
      }

      try {
        return await apiClient.patch(`${API_URL}/update-shift-change-status`, {
          notificationId: id,
          newStatus: status,
        });
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr ?? new Error("Không thể cập nhật trạng thái yêu cầu đổi ca");
  },
};

export default staffService;
