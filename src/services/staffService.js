import apiClient from "../config/api";

const API_URL = "/api/v1/staff";
const staffService = {
    getAllStaff: () => {
        return apiClient.get(API_URL);
    },

    createAccountStaff: (formData) => {
        return apiClient.post(`${API_URL}/register`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                Authorization: "Bearer " + localStorage.getItem("access_token"),
            },
        });
    },

    getStaffById: (id) => {
        return apiClient.get(`${API_URL}/${id}`);
    },

    updateStaff: (id, formData) => {
        return apiClient.put(`${API_URL}/${id}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                Authorization: "Bearer " + localStorage.getItem("access_token"),
            }
        });
    },

    deleteStaff: (id) => {
        return apiClient.delete(`${API_URL}/${id}`);
    },

};

export default staffService;