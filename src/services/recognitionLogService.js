import apiClient from "../config/api";

const BASE = "/api/v1/recognition-logs";

function toPositiveInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function normalizePagingParams(params = {}) {
  const next = { ...params };

  const page =
    toPositiveInt(
      next.page ?? next.pageNumber ?? next.current_page ?? next.currentPage,
    ) ?? 1;
  const pageSize =
    toPositiveInt(next.pageSize ?? next.page_size ?? next.PageSize) ?? 20;

  delete next.page;
  delete next.pageNumber;
  delete next.current_page;
  delete next.currentPage;
  delete next.pageSize;
  delete next.page_size;

  // Send both common conventions so backend model binder can pick whichever it supports.
  return {
    ...next,
    page,
    pageNumber: page,
    current_page: page,
    pageSize,
    page_size: pageSize,
  };
}

function pickMeta(meta = {}, itemCount = 0) {
  const totalPages =
    toPositiveInt(meta.total_pages ?? meta.totalPages ?? meta.pageCount) ?? 1;
  const totalItems =
    toPositiveInt(meta.total_items ?? meta.totalItems ?? meta.totalCount) ??
    itemCount;
  const currentPage =
    toPositiveInt(meta.current_page ?? meta.currentPage ?? meta.pageNumber) ??
    1;
  const pageSize =
    toPositiveInt(meta.page_size ?? meta.pageSize ?? meta.size) ?? itemCount;

  return {
    totalPages,
    totalItems,
    currentPage,
    pageSize,
  };
}

function parseListResponse(response) {
  const root = response?.data ?? {};
  const payload = root?.data ?? {};

  const rawItems =
    payload?.items ?? payload?.data ?? root?.items ?? root?.data?.items ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [];

  const meta = pickMeta(
    payload?.meta ??
      payload?.pagination ??
      root?.meta ??
      root?.pagination ??
      {},
    items.length,
  );

  return {
    items,
    meta,
    message: root?.message ?? "",
    isSuccess: root?.is_success ?? root?.isSuccess ?? true,
  };
}

const recognitionLogService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get(BASE, {
      params: normalizePagingParams(params),
    });
    return parseListResponse(response);
  },
};

export default recognitionLogService;
