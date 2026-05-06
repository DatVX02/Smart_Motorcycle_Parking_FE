import apiClient from "../config/api";

const BASE = "/api/v1/device-events";

function pickPositiveInt(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function pickTotalCount(source) {
  if (!source || typeof source !== "object") return null;
  return pickPositiveInt(
    source.totalCount ??
      source.TotalCount ??
      source.total ??
      source.Total ??
      source.count ??
      source.Count ??
      source.totalRecords ??
      source.TotalRecords ??
      source.totalItems ??
      source.TotalItems ??
      source.itemCount ??
      source.ItemCount,
  );
}

function pickTotalPages(source) {
  if (!source || typeof source !== "object") return null;
  return pickPositiveInt(
    source.totalPages ??
      source.TotalPages ??
      source.pageCount ??
      source.PageCount ??
      source.pages ??
      source.Pages,
  );
}

function pickPagingFromCandidates(candidates) {
  let totalCount = null;
  let totalPages = null;

  for (const source of candidates) {
    if (!source || typeof source !== "object") continue;
    if (totalCount == null) totalCount = pickTotalCount(source);
    if (totalPages == null) totalPages = pickTotalPages(source);
    if (totalCount != null && totalPages != null) break;
  }

  return { totalCount, totalPages };
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
    const innerPaging = pickPagingFromCandidates([
      inner,
      inner.pagination,
      inner.Pagination,
      inner.meta,
      inner.Meta,
      inner.metadata,
      inner.Metadata,
      inner.page,
      inner.Page,
    ]);
    totalCount = innerPaging.totalCount;
    totalPages = innerPaging.totalPages;
  }

  if (root && typeof root === "object") {
    const rootPaging = pickPagingFromCandidates([
      root,
      root.pagination,
      root.Pagination,
      root.meta,
      root.Meta,
      root.metadata,
      root.Metadata,
      root.page,
      root.Page,
    ]);
    if (totalCount == null) totalCount = rootPaging.totalCount;
    if (totalPages == null) totalPages = rootPaging.totalPages;
  }

  return { items, totalCount, totalPages };
}

function normalizePagingParams(params) {
  const reqParams = { ...params };
  const page = reqParams.pageNumber ?? reqParams.page ?? reqParams.Page ?? 1;
  const size = reqParams.pageSize ?? reqParams.PageSize ?? 10;
  delete reqParams.page;
  delete reqParams.pageNumber;
  delete reqParams.Page;
  delete reqParams.pageSize;
  delete reqParams.PageSize;
  reqParams.page = page;
  reqParams.pageNumber = page;
  reqParams.pageSize = size;
  return reqParams;
}

const deviceEventService = {
  /**
   * GET /api/v1/device-events
   * Query (khớp backend .NET thường dùng): deviceId, lotId, eventType, eventStatus, pageNumber, pageSize
   * @returns {{ items: any[], totalCount: number | null, totalPages: number | null }}
   */
  getAll: async (params = {}) => {
    const res = await apiClient.get(BASE, {
      params: normalizePagingParams(params),
    });
    return parseListResponse(res);
  },

  /**
   * Gộp mọi trang cho cùng bộ lọc — dùng để thống kê tổng (không phụ thuộc trang hiện tại).
   */
  getAllFlattened: async (params = {}) => {
    /** Nhiều API .NET giới hạn PageSize; tránh 500 do vượt max. */
    const chunkSize = 100;
    const rest = { ...params };
    delete rest.page;
    delete rest.pageNumber;
    delete rest.pageSize;

    const allItems = [];
    let totalCount = null;
    let page = 1;

    for (;;) {
      const {
        items,
        totalCount: tc,
        totalPages,
      } = await deviceEventService.getAll({
        ...rest,
        page,
        pageSize: chunkSize,
      });
      if (typeof tc === "number" && Number.isFinite(tc)) totalCount = tc;

      const batch = items ?? [];
      allItems.push(...batch);

      const inferredPages =
        totalPages != null && Number.isFinite(totalPages) && totalPages >= 1
          ? Math.floor(totalPages)
          : totalCount != null
            ? Math.max(1, Math.ceil(totalCount / chunkSize))
            : null;

      if (inferredPages != null && page >= inferredPages) break;
      if (inferredPages == null && batch.length < chunkSize) break;
      if (batch.length === 0) break;

      page += 1;
      if (page > 2000) break;
    }

    return {
      items: allItems,
      totalCount:
        typeof totalCount === "number" && Number.isFinite(totalCount)
          ? totalCount
          : allItems.length,
    };
  },

  /** GET /api/v1/device-events/{id} */
  getById: async (id) => {
    const response = await apiClient.get(`${BASE}/${id}`);
    const unwrap = (r) => r?.data?.data ?? r?.data;
    return unwrap(response);
  },

  /** GET /api/v1/device-events/device/{deviceId} */
  getByDeviceId: async (deviceId, params = {}) => {
    const reqParams = normalizePagingParams({
      pageNumber: 1,
      pageSize: 10,
      ...params,
    });
    const res = await apiClient.get(`${BASE}/device/${deviceId}`, {
      params: reqParams,
    });
    return parseListResponse(res);
  },

  /** GET /api/v1/device-events/lot/{lotId} */
  getByLotId: async (lotId, params = {}) => {
    const reqParams = normalizePagingParams({
      pageNumber: 1,
      pageSize: 10,
      ...params,
    });
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

  /**
   * GET /api/v1/device-events/dashboard
   * Lấy thống kê tổng quan cho màn hình Nhật Ký Thiết Bị
   */
  getDashboardStats: async (params = {}) => {
    const res = await apiClient.get(`${BASE}/dashboard`, { params });
    const data = res?.data?.data ?? res?.data;

    // Normalize format to { totalEvents: number, statusCounts: { [status]: count } }
    let totalEvents = 0;
    const statusCounts = {};
    const mapStatusKey = (keyLower) => {
      if (keyLower.includes("success") || keyLower.includes("succeed"))
        return "success";
      if (keyLower.includes("fail")) return "failed";
      if (keyLower.includes("trigger")) return "triggered";
      if (keyLower.includes("active")) return "active";
      if (keyLower.includes("process")) return "processing";
      if (keyLower.includes("pend")) return "pending";
      if (keyLower.includes("resolv")) return "resolved";
      if (keyLower.includes("ignor")) return "ignored";
      if (keyLower.includes("acknowledg")) return "acknowledged";
      return keyLower;
    };
    const setStatusCount = (statusKey, value) => {
      if (statusCounts[statusKey] == null) {
        statusCounts[statusKey] = Number(value) || 0;
      }
    };

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const hasExplicitTotal =
        typeof data.totalEvents === "number" || typeof data.total === "number";
      if (hasExplicitTotal) {
        totalEvents = data.totalEvents ?? data.total ?? 0;
      }
      if (data.statusCounts && typeof data.statusCounts === "object") {
        Object.entries(data.statusCounts).forEach(([k, v]) => {
          const statusKey = mapStatusKey(String(k).toLowerCase());
          setStatusCount(statusKey, v);
        });
      }
      // Support flat keys like successEvents/failedEvents/triggeredEvents
      Object.entries(data).forEach(([k, v]) => {
        if (typeof v !== "number") return;
        const keyLower = k.toLowerCase();
        if (keyLower.includes("total")) {
          if (!hasExplicitTotal) totalEvents = v;
          return;
        }
        const statusKey = mapStatusKey(keyLower);
        setStatusCount(statusKey, v);
        if (!hasExplicitTotal) totalEvents += Number(v) || 0;
      });
    } else if (Array.isArray(data)) {
      data.forEach((item) => {
        const s = item.status ?? item.eventStatus;
        const c = item.count ?? item.total;
        if (s != null) {
          const statusKey = mapStatusKey(String(s).toLowerCase());
          setStatusCount(statusKey, c);
          totalEvents += Number(c) || 0;
        }
      });
    }

    return { totalEvents, statusCounts };
  },
};

export default deviceEventService;
