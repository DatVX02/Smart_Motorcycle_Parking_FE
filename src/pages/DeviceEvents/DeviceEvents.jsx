import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import deviceEventService from "../../services/deviceEventService";
import parkingLotService from "../../services/parkingLotService";
import { normalizeDeviceEvent } from "./deviceEventUtils";
import {
  DEVICE_EVENT_STATUS_OPTIONS,
  PAGE_SIZE,
} from "./deviceEventsConstants";
import DeviceEventsStats from "./DeviceEventsStats";
import DeviceEventsFilters from "./DeviceEventsFilters";
import DeviceEventsList from "./DeviceEventsList";
import DeviceEventsPagination from "./DeviceEventsPagination";

function normalizeStatusKey(value) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  const ascii = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const token = ascii.replace(/[\s_-]+/g, "");

  if (
    token.includes("thanhcong") ||
    token.includes("success") ||
    token.includes("succeed") ||
    token.includes("successful")
  )
    return "success";
  if (token.includes("hoanthanh") || token.includes("completed")) {
    return "completed";
  }
  if (token.includes("thatbai") || token.includes("fail")) return "failed";
  if (token.includes("dackichhoat") || token.includes("trigger")) {
    return "triggered";
  }
  if (token.includes("danghoatdong") || token.includes("active")) {
    return "active";
  }
  if (token.includes("dangxuly") || token.includes("processing")) {
    return "processing";
  }
  if (token.includes("dangcho") || token.includes("pending")) return "pending";
  if (token.includes("daxuly") || token.includes("resolved")) return "resolved";
  if (token.includes("daboqua") || token.includes("ignored")) return "ignored";
  if (token.includes("daxacnhan") || token.includes("acknowledged")) {
    return "acknowledged";
  }

  return token;
}

function applyEventClientFilters(items, { lotId, eventStatus }) {
  const lotNeedle = String(lotId ?? "").trim();
  const statusNeedle = normalizeStatusKey(eventStatus);

  return items.filter((log) => {
    if (lotNeedle && String(log.lotId ?? "") !== lotNeedle) return false;
    if (statusNeedle && normalizeStatusKey(log.eventStatus) !== statusNeedle) {
      return false;
    }
    return true;
  });
}

function matchesSearch(log, needle) {
  const q = String(needle ?? "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  return (
    log.eventId.toLowerCase().includes(q) ||
    log.deviceId.toLowerCase().includes(q) ||
    log.deviceName.toLowerCase().includes(q) ||
    log.lotId.toLowerCase().includes(q) ||
    log.lotName.toLowerCase().includes(q) ||
    log.eventType.toLowerCase().includes(q) ||
    log.eventSource.toLowerCase().includes(q) ||
    log.eventStatus.toLowerCase().includes(q) ||
    log.eventDataSummary.toLowerCase().includes(q) ||
    (log.eventDataPretty && log.eventDataPretty.toLowerCase().includes(q))
  );
}

function DeviceEvents() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState([]);
  const [lotId, setLotId] = useState("");
  const [filterEventStatus, setFilterEventStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [cachedResults, setCachedResults] = useState(null);
  const [cachedKey, setCachedKey] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [canGoNext, setCanGoNext] = useState(false);
  const pendingSearch = searchTerm.trim() !== debouncedSearchTerm;

  useEffect(() => {
    let cancelled = false;
    parkingLotService
      .getAllParkingLots()
      .then((items) => {
        if (!cancelled) setLots(items ?? []);
      })
      .catch(() => {
        if (!cancelled) setLots([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 400);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const loadLogs = useCallback(
    async (pageNumber) => {
      setLoading(true);
      try {
        const params = {};
        if (lotId) params.lotId = lotId;
        const es = filterEventStatus.trim();
        if (es) params.eventStatus = es;
        const searchValue = debouncedSearchTerm.trim();
        if (searchValue.length > 0) {
          params.keyword = searchValue;
          params.search = searchValue;
        }

        const statsParams = { ...params };
        delete statsParams.eventStatus;

        deviceEventService
          .getDashboardStats(statsParams)
          .then((res) => {
            setDashboardStats(res);
          })
          .catch((e) => {
            console.error("Failed to load dashboard stats", e);
            setDashboardStats(null);
          })
          .finally(() => {
            setStatsLoading(false);
          });

        const page =
          Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;

        const requiresClientFiltering = Boolean(searchValue || lotId || es);
        if (requiresClientFiltering) {
          const nextKey = `${lotId}|${es}|${searchValue.toLowerCase()}`;
          const statusToken = normalizeStatusKey(es);
          let filtered = null;

          if (cachedResults && cachedKey === nextKey) {
            filtered = cachedResults;
          } else {
            const flattenedParams = { ...params };
            if (statusToken) delete flattenedParams.eventStatus;

            const { items } =
              await deviceEventService.getAllFlattened(flattenedParams);
            const normalized = (items ?? []).map((raw, i) =>
              normalizeDeviceEvent(raw, i),
            );
            const filteredByFilters = applyEventClientFilters(normalized, {
              lotId,
              eventStatus: es,
            });
            filtered = filteredByFilters.filter((log) =>
              matchesSearch(log, searchValue),
            );
            setCachedResults(filtered);
            setCachedKey(nextKey);
          }

          const total = filtered.length > 0 ? filtered.length : 0;
          const pages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
          const start = (page - 1) * PAGE_SIZE;
          setLogs(filtered.slice(start, start + PAGE_SIZE));
          setTotalPages(pages);
          setCanGoNext(page < pages);
        } else {
          setCachedResults(null);
          setCachedKey("");
          const { items, totalPages: tp } = await deviceEventService.getAll({
            ...params,
            pageNumber: page,
            pageSize: PAGE_SIZE,
          });
          const normalized = (items ?? []).map((raw, i) =>
            normalizeDeviceEvent(raw, i),
          );
          setLogs(normalized);
          setTotalPages(tp);
          setCanGoNext(
            typeof tp === "number" && Number.isFinite(tp)
              ? page < tp
              : (items ?? []).length >= PAGE_SIZE,
          );
        }
      } catch (e) {
        console.error(e);
        toast.error("Không thể tải nhật ký thiết bị");
        setLogs([]);
        setTotalPages(null);
        setCanGoNext(false);
      } finally {
        setLoading(false);
      }
    },
    [lotId, filterEventStatus, debouncedSearchTerm, cachedResults, cachedKey],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [lotId, filterEventStatus, searchTerm]);

  useEffect(() => {
    if (pendingSearch) return;
    loadLogs(currentPage);
  }, [loadLogs, currentPage, debouncedSearchTerm, pendingSearch]);

  const visibleLogs = logs;

  const paginationTotalPages = totalPages;
  const paginationCanGoNext = canGoNext;

  const statTotalEvents = dashboardStats?.totalEvents ?? 0;
  const statusCounts = dashboardStats?.statusCounts ?? {};
  const statusKeys = new Set(Object.keys(statusCounts));
  const statusOptions = statusKeys.size
    ? DEVICE_EVENT_STATUS_OPTIONS.filter(([value]) =>
        statusKeys.has(String(value).toLowerCase()),
      )
    : DEVICE_EVENT_STATUS_OPTIONS;

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterEventStatus("");
    setLotId("");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5">
      <DeviceEventsStats
        loading={loading || statsLoading}
        statTotalEvents={statTotalEvents}
        statusCounts={statusCounts}
      />

      <DeviceEventsFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        loading={loading}
        recordCount={visibleLogs.length}
        pageSize={PAGE_SIZE}
        onReload={loadLogs}
        onResetFilters={handleResetFilters}
        lots={lots}
        lotId={lotId}
        onLotChange={setLotId}
        filterEventStatus={filterEventStatus}
        onEventStatusChange={setFilterEventStatus}
        statusOptions={statusOptions}
      />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <DeviceEventsList loading={loading} filteredLogs={visibleLogs} />
        {(!loading || visibleLogs.length > 0) && (
          <DeviceEventsPagination
            currentPage={currentPage}
            totalPages={paginationTotalPages}
            onPageChange={setCurrentPage}
            loading={loading}
            canGoNext={paginationCanGoNext}
          />
        )}
      </div>
    </div>
  );
}

export default DeviceEvents;
