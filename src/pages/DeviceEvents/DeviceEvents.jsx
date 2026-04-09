import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import deviceEventService from "../../services/deviceEventService";
import parkingLotService from "../../services/parkingLotService";
import DeviceEventsPagination from "./DeviceEventsPagination";
import { PAGE_SIZE } from "./deviceEventsConstants";
import {
  normalizeDeviceEvent,
  isActiveOperationalStatus,
  isInactiveOperationalStatus,
} from "./deviceEventUtils";
import DeviceEventsStats from "./DeviceEventsStats";
import DeviceEventsFilters from "./DeviceEventsFilters";
import DeviceEventsList from "./DeviceEventsList";

function normalizeEventToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function applyEventClientFilters(items, { lotId, eventType, eventStatus }) {
  const lotNeedle = String(lotId ?? "").trim();
  const typeNeedle = normalizeEventToken(eventType);
  const statusNeedle = normalizeEventToken(eventStatus);

  return items.filter((log) => {
    if (lotNeedle && String(log.lotId ?? "") !== lotNeedle) return false;
    if (typeNeedle && normalizeEventToken(log.eventType) !== typeNeedle) {
      return false;
    }
    if (statusNeedle && normalizeEventToken(log.eventStatus) !== statusNeedle) {
      return false;
    }
    return true;
  });
}

function DeviceEvents() {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [serverTotalPages, setServerTotalPages] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  /** Thống kê 5 ô phía trên: toàn bộ bản ghi khớp bộ lọc (không đổi khi đổi trang). */
  const [summaryStats, setSummaryStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lots, setLots] = useState([]);
  const [lotId, setLotId] = useState("");
  const [filterEventType, setFilterEventType] = useState("");
  const [filterEventStatus, setFilterEventStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setStatsLoading(true);
    try {
      const params = { page, pageSize: PAGE_SIZE };
      if (lotId) params.lotId = lotId;
      const et = filterEventType.trim();
      const es = filterEventStatus.trim();
      if (et) params.eventType = et;
      if (es) params.eventStatus = es;

      const {
        items,
        totalCount: total,
        totalPages: tp,
      } = await deviceEventService.getAll(params);
      const normalized = (items ?? []).map((raw, i) =>
        normalizeDeviceEvent(raw, i),
      );
      const filtered = applyEventClientFilters(normalized, {
        lotId,
        eventType: et,
        eventStatus: es,
      });
      setLogs(filtered);

      const serverCount =
        typeof total === "number" && Number.isFinite(total) ? total : null;
      const serverPages =
        typeof tp === "number" && tp >= 1 && Number.isFinite(tp)
          ? Math.floor(tp)
          : null;

      // If backend did not apply filter correctly, prefer client-filtered length.
      if (filtered.length !== normalized.length) {
        setTotalCount(filtered.length);
        setServerTotalPages(
          Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
        );
      } else {
        setTotalCount(serverCount);
        setServerTotalPages(serverPages);
      }

      // Lightweight stats: use server total + current page breakdown to avoid fetching all pages.
      const statTotal =
        typeof serverCount === "number" && Number.isFinite(serverCount)
          ? serverCount
          : filtered.length;
      setSummaryStats({
        total: statTotal,
        active: filtered.filter((l) => isActiveOperationalStatus(l.eventStatus))
          .length,
        inactive: filtered.filter((l) =>
          isInactiveOperationalStatus(l.eventStatus),
        ).length,
        warning: filtered.filter((l) => l.level === "warning").length,
        error: filtered.filter((l) => l.level === "error").length,
      });
    } catch (e) {
      console.error(e);
      toast.error("Không thể tải nhật ký thiết bị");
      setLogs([]);
      setTotalCount(null);
      setServerTotalPages(null);
      setSummaryStats({
        total: 0,
        active: 0,
        inactive: 0,
        warning: 0,
        error: 0,
      });
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [page, lotId, filterEventType, filterEventStatus]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        !q ||
        log.eventId.toLowerCase().includes(q) ||
        log.deviceId.toLowerCase().includes(q) ||
        log.deviceName.toLowerCase().includes(q) ||
        log.lotId.toLowerCase().includes(q) ||
        log.lotName.toLowerCase().includes(q) ||
        log.eventType.toLowerCase().includes(q) ||
        log.eventSource.toLowerCase().includes(q) ||
        log.eventStatus.toLowerCase().includes(q) ||
        log.eventDataSummary.toLowerCase().includes(q) ||
        (log.eventDataPretty && log.eventDataPretty.toLowerCase().includes(q));
      return matchesSearch;
    });
  }, [logs, searchTerm]);

  const statTotalEvents = summaryStats?.total ?? 0;
  const activeOperationalCount = summaryStats?.active ?? 0;
  const inactiveOperationalCount = summaryStats?.inactive ?? 0;
  const warningCount = summaryStats?.warning ?? 0;
  const errorCount = summaryStats?.error ?? 0;

  const totalPages =
    serverTotalPages != null
      ? serverTotalPages
      : totalCount != null
        ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
        : null;

  const canGoNext =
    totalPages != null ? page < totalPages : logs.length >= PAGE_SIZE;

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterEventType("");
    setFilterEventStatus("");
    setLotId("");
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <DeviceEventsStats
        loading={statsLoading}
        statTotalEvents={statTotalEvents}
        activeOperationalCount={activeOperationalCount}
        inactiveOperationalCount={inactiveOperationalCount}
        warningCount={warningCount}
        errorCount={errorCount}
      />

      <DeviceEventsFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        loading={loading}
        recordCount={logs.length}
        pageSize={PAGE_SIZE}
        onReload={loadLogs}
        onResetFilters={handleResetFilters}
        lots={lots}
        lotId={lotId}
        onLotChange={(v) => {
          setLotId(v);
          setPage(1);
        }}
        filterEventType={filterEventType}
        onEventTypeChange={(v) => {
          setFilterEventType(v);
          setPage(1);
        }}
        filterEventStatus={filterEventStatus}
        onEventStatusChange={(v) => {
          setFilterEventStatus(v);
          setPage(1);
        }}
      />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <DeviceEventsList loading={loading} filteredLogs={filteredLogs} />

        {!loading && logs.length > 0 && (
          <DeviceEventsPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={loading}
            canGoNext={canGoNext}
          />
        )}
      </div>
    </div>
  );
}

export default DeviceEvents;
