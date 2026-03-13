import apiClient from "../config/api";

const BASE = "/api/v1/users";

const userService = {

  getAllUser: () => apiClient.get(BASE),

};

export default userService;