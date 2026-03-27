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

function DeviceEvents() {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [serverTotalPages, setServerTotalPages] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
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
    try {
      const params = { page, pageSize: PAGE_SIZE };
      if (lotId) params.lotId = lotId;
      const et = filterEventType.trim().toLowerCase();
      const es = filterEventStatus.trim().toLowerCase();
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
      setLogs(normalized);
      setTotalCount(
        typeof total === "number" && Number.isFinite(total) ? total : null,
      );
      setServerTotalPages(
        typeof tp === "number" && tp >= 1 && Number.isFinite(tp)
          ? Math.floor(tp)
          : null,
      );
    } catch (e) {
      console.error(e);
      toast.error("Không thể tải nhật ký thiết bị");
      setLogs([]);
      setTotalCount(null);
      setServerTotalPages(null);
    } finally {
      setLoading(false);
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

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warningCount = logs.filter((l) => l.level === "warning").length;
  const activeOperationalCount = logs.filter((l) =>
    isActiveOperationalStatus(l.eventStatus),
  ).length;
  const inactiveOperationalCount = logs.filter((l) =>
    isInactiveOperationalStatus(l.eventStatus),
  ).length;

  const totalPages =
    serverTotalPages != null
      ? serverTotalPages
      : totalCount != null
        ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
        : null;

  const canGoNext =
    totalPages != null ? page < totalPages : logs.length >= PAGE_SIZE;

  const statTotalEvents = totalCount != null ? totalCount : logs.length;

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
        loading={loading}
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
        onReload={() => loadLogs()}
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
            pageSizeLabel={`· ${PAGE_SIZE} / trang`}
          />
        )}
      </div>
    </div>
  );
}

export default DeviceEvents;
