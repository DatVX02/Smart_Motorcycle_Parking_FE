import apiClient from "../config/api";

const BASE = "/api/User";

const userService = {

  getAllUser: () => apiClient.get(BASE),

};

export default userService;