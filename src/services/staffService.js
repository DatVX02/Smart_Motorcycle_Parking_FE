import apiClient from "../config/api";

const API_URL = "/api/v1/staff";

const staffService = {
    getAllStaff: () => {
        return apiClient.get(API_URL);
    },
};

export default staffService;