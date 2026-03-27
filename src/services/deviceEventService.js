import apiClient from "../config/api";

const BASE = "/api/v1/device-events";

function pickPositiveInt(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** Payload trong envelope API: mảng hoặc object có items + totalCount / totalPages (camel hoặc Pascal) */
function parseListResponse(axiosResponse) {
  const root = axiosResponse?.data;
  const inner = root?.data ?? root;

  let items = [];
  let totalCount = null;
  let totalPages = null;

  if (Array.isArray(inner)) {
    items = inner;
  } else if (inner && typeof inner === "object") {
    if (Array.isArray(inner.items)) {
      items = inner.items;
    } else if (Array.isArray(inner.data)) {
      items = inner.data;
    }
    totalCount = pickPositiveInt(
      inner.totalCount ??
        inner.TotalCount ??
        inner.total ??
        inner.Total ??
        inner.count ??
        inner.Count ??
        inner.totalRecords ??
        inner.TotalRecords,
    );
    totalPages = pickPositiveInt(
      inner.totalPages ?? inner.TotalPages ?? inner.pageCount ?? inner.PageCount,
    );
  }

  if (root && typeof root === "object") {
    if (totalCount == null) {
      totalCount = pickPositiveInt(
        root.totalCount ??
          root.TotalCount ??
          root.total ??
          root.count ??
          root.totalRecords,
      );
    }
    if (totalPages == null) {
      totalPages = pickPositiveInt(
        root.totalPages ?? root.TotalPages ?? root.pageCount ?? root.PageCount,
      );
    }
  }

  return { items, totalCount, totalPages };
}

const deviceEventService = {
  /**
   * GET /api/v1/device-events
   * Query: deviceId, lotId, eventType, eventStatus, page, pageSize
   * @returns {{ items: any[], totalCount: number | null, totalPages: number | null }}
   */
  getAll: async (params = {}) => {
    const reqParams = { ...params };
    if (reqParams.page == null) reqParams.page = 1;
    if (reqParams.pageSize == null) reqParams.pageSize = 10;
    const res = await apiClient.get(BASE, { params: reqParams });
    return parseListResponse(res);
  },

  /** GET /api/v1/device-events/{id} */
  getById: async (id) => {
    const response = await apiClient.get(`${BASE}/${id}`);
    const unwrap = (r) => r?.data?.data ?? r?.data;
    return unwrap(response);
  },

  /** GET /api/v1/device-events/device/{deviceId} */
  getByDeviceId: async (deviceId, params = {}) => {
    const reqParams = { page: 1, pageSize: 10, ...params };
    const res = await apiClient.get(`${BASE}/device/${deviceId}`, {
      params: reqParams,
    });
    return parseListResponse(res);
  },

  /** GET /api/v1/device-events/lot/{lotId} */
  getByLotId: async (lotId, params = {}) => {
    const reqParams = { page: 1, pageSize: 10, ...params };
    const res = await apiClient.get(`${BASE}/lot/${lotId}`, {
      params: reqParams,
    });
    return parseListResponse(res);
  },

  /** POST /api/v1/device-events */
  create: async (payload) => {
    const res = await apiClient.post(BASE, payload);
    return res?.data?.data ?? res?.data;
  },

  /** POST /api/v1/device-events/iot */
  createIot: async (payload) => {
    const res = await apiClient.post(`${BASE}/iot`, payload);
    return res?.data?.data ?? res?.data;
  },
};

export default deviceEventService;
