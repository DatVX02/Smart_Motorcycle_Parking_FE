import apiClient from "../config/api";

const BASE = "/api/v1/incident-reports";
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

function cleanObject(obj = {}) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
}

/** Sinh các biến thể format cho status enum (PascalCase, snake_case, numeric, v.v.) */
function buildStatusVariants(statusRaw) {
  if (statusRaw == null || statusRaw === "") return [statusRaw];

  const s = String(statusRaw).trim();
  const lower = s
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");

  const PASCAL_MAP = {
    pending: "Pending",
    in_progress: "Processing",
    processing: "Processing",
    resolved: "Resolved",
    rejected: "Closed",
    cancelled: "Closed",
    closed: "Closed",
  };
  const NUMERIC_MAP = {
    pending: 0,
    in_progress: 1,
    processing: 1,
    resolved: 2,
    rejected: 3,
    cancelled: 3,
    closed: 3,
  };

  const variants = [];
  const push = (v) => {
    if (v != null && v !== "" && !variants.includes(v)) variants.push(v);
  };

  push(s);
  const pascal = PASCAL_MAP[lower];
  if (pascal) push(pascal);
  if (lower === "in_progress" || lower === "processing") push("InProgress");
  /* Nếu là closed/rejected/cancelled → ưu tiên thêm "Closed" và các biến thể */
  if (["closed", "rejected", "cancelled"].includes(lower)) {
    push("Closed");
    push("closed");
    push("CLOSED");
  }
  push(lower);
  push(lower.toUpperCase());
  const numeric = NUMERIC_MAP[lower];
  if (numeric !== undefined) push(numeric);

  return variants;
}

/** Retry khi gặp các HTTP status cho biết sai format/BE issue tạm thời */
const shouldTryNextVariant = (err) => {
  const status = err?.response?.status;
  return (
    status === 400 ||
    status === 404 ||
    status === 415 ||
    status === 422 ||
    status === 500 ||
    !status
  );
};

const incidentReportService = {
  /** GET /api/v1/incident-reports */
  getAll: async (params = {}) => {
    const response = await apiClient.get(BASE, { params });
    return unwrap(response.data);
  },

  /** GET /api/v1/incident-reports/types */
  getTypes: async () => {
    const response = await apiClient.get(`${BASE}/types`);
    return unwrap(response.data);
  },

  /** GET /api/v1/incident-reports/{id} */
  getById: async (id) => {
    const response = await apiClient.get(`${BASE}/${id}`);
    return unwrap(response.data);
  },

  /** GET /api/v1/incident-reports/my-reports */
  getMyReports: async (params = {}) => {
    const response = await apiClient.get(`${BASE}/my-reports`, { params });
    return unwrap(response.data);
  },

  /** GET /api/v1/incident-reports/lot/{lotId} */
  getByLot: async (lotId, params = {}) => {
    const response = await apiClient.get(`${BASE}/lot/${lotId}`, { params });
    return unwrap(response.data);
  },

  /** POST /api/v1/incident-reports */
  create: async (payload = {}) => {
    const response = await apiClient.post(BASE, payload);
    return unwrap(response.data);
  },

  /** DELETE /api/v1/incident-reports/{id} */
  delete: async (id) => {
    const response = await apiClient.delete(`${BASE}/${id}`);
    return unwrap(response.data);
  },

  /**
   * PATCH /api/v1/incident-reports/{id}/status
   * Cập nhật trạng thái xử lý + ghi chú (dùng cho flow cập nhật sự cố).
   * Tự động thử nhiều format status + content-type để tương thích BE.
   */
  updateStatus: async (id, payload = {}) => {
    const url = `${BASE}/${id}/status`;
    const rawStatus = payload?.status;
    const resolutionNotes =
      payload?.resolutionNotes ?? payload?.resolution_notes;
    const resolvedAt = payload?.resolvedAt ?? payload?.resolved_at;

    const statusVariants = buildStatusVariants(rawStatus);
    let lastErr;

    const tryRequest = async (requestFn) => {
      try {
        const res = await requestFn();
        return { ok: true, data: unwrap(res.data) };
      } catch (err) {
        lastErr = err;
        return { ok: false, data: null };
      }
    };

    for (const statusValue of statusVariants) {
      const body = cleanObject({
        status: statusValue,
        resolutionNotes,
        resolution_notes: resolutionNotes,
        resolvedAt,
        resolved_at: resolvedAt,
        notes: resolutionNotes,
        note: resolutionNotes,
      });

      const patchJson = await tryRequest(() =>
        apiClient.patch(url, body, {
          headers: { "Content-Type": "application/json" },
        }),
      );
      if (patchJson.ok) return patchJson.data;
      if (!shouldTryNextVariant(lastErr)) throw lastErr;

      const patchParams = await tryRequest(() =>
        apiClient.patch(url, null, { params: body }),
      );
      if (patchParams.ok) return patchParams.data;
      if (!shouldTryNextVariant(lastErr)) throw lastErr;
    }

    throw lastErr;
  },

  /**
   * PUT /api/v1/incident-reports/{id}
   * Cập nhật toàn bộ thông tin sự cố (tiêu đề, loại, mô tả, ảnh, v.v.).
   */
  updateFull: async (id, payload = {}) => {
    const response = await apiClient.put(`${BASE}/${id}`, payload);
    return unwrap(response.data);
  },

  /**
   * Alias cho flow cũ: nếu payload chỉ chứa status/notes → dùng PATCH /status,
   * ngược lại → PUT full body (giữ tương thích ngược cho các nơi đang gọi update()).
   */
  update: async (id, payload = {}) => {
    const onlyStatusFields =
      payload &&
      Object.keys(payload).every((k) =>
        [
          "status",
          "resolutionNotes",
          "resolution_notes",
          "resolvedAt",
          "resolved_at",
          "notes",
          "note",
        ].includes(k),
      );

    if (onlyStatusFields) {
      return incidentReportService.updateStatus(id, payload);
    }
    return incidentReportService.updateFull(id, payload);
  },
};

export default incidentReportService;
