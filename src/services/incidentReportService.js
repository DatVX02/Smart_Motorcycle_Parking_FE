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

const incidentReportService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get(BASE, { params });
    return unwrap(response.data);
  },

  getTypes: async () => {
    const response = await apiClient.get(`${BASE}/types`);
    return unwrap(response.data);
  },

  getById: async (id) => {
    const response = await apiClient.get(`${BASE}/${id}`);
    return unwrap(response.data);
  },

  update: async (id, payload = {}) => {
    const url = `${BASE}/${id}`;
    const normalized = {
      ...payload,
      resolutionNotes: payload?.resolutionNotes ?? payload?.resolution_notes,
      resolvedAt: payload?.resolvedAt ?? payload?.resolved_at,
    };

    const formData = new FormData();
    const status = normalized?.status;
    const resolutionNotes =
      normalized?.resolutionNotes ?? normalized?.resolution_notes;
    const resolvedAt = normalized?.resolvedAt ?? normalized?.resolved_at;

    if (status != null) formData.append("status", String(status));
    if (resolutionNotes != null) {
      formData.append("resolutionNotes", String(resolutionNotes));
      formData.append("resolution_notes", String(resolutionNotes));
    }
    if (resolvedAt != null) {
      formData.append("resolvedAt", String(resolvedAt));
      formData.append("resolved_at", String(resolvedAt));
    }

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

    const formRes = await tryRequest(() =>
      apiClient.put(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
    if (formRes.ok) return formRes.data;

    if (lastErr?.response?.status !== 415) throw lastErr;

    const jsonRes = await tryRequest(() =>
      apiClient.put(url, normalized, {
        headers: { "Content-Type": "application/json" },
      }),
    );
    if (jsonRes.ok) return jsonRes.data;

    if (lastErr?.response?.status !== 415) throw lastErr;

    const patchJsonRes = await tryRequest(() =>
      apiClient.put(url, normalized, {
        headers: { "Content-Type": "application/json-patch+json" },
      }),
    );
    if (patchJsonRes.ok) return patchJsonRes.data;

    if (lastErr?.response?.status !== 415) throw lastErr;

    const paramsRes = await tryRequest(() =>
      apiClient.put(url, null, {
        params: cleanObject({
          status,
          resolutionNotes,
          resolution_notes: resolutionNotes,
          resolvedAt,
          resolved_at: resolvedAt,
        }),
      }),
    );
    if (paramsRes.ok) return paramsRes.data;

    throw lastErr;
  },
};

export default incidentReportService;
