import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import deviceEventService from "../../services/deviceEventService";
import parkingLotService from "../../services/parkingLotService";
import DeviceEventsPagination from "./DeviceEventsPagination";
import { PAGE_SIZE } from "./deviceEventsConstants";
import { normalizeDeviceEvent } from "./deviceEventUtils";
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

function normKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function DeviceEvents() {
  /** Cache dữ liệu theo từng trang (backend phân trang). */
  const [pageCache, setPageCache] = useState(() => ({}));
  const [pageSizeByPage, setPageSizeByPage] = useState(() => ({}));
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
  const currentPageLogs = useMemo(
    () => pageCache[page] ?? [],
    [pageCache, page],
  );
  const lastPageSize = pageSizeByPage[page] ?? 0;

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
      // Backend thực tế có phân trang (pageNumber/pageSize) nhưng không trả totalPages.
      const params = { pageNumber: page, pageSize: PAGE_SIZE };
      if (lotId) params.lotId = lotId;
      const et = filterEventType.trim();
      const es = filterEventStatus.trim();
      if (et) params.eventType = et;
      if (es) params.eventStatus = es;

      const { items } = await deviceEventService.getAll(params);
      const rawPageSize = Array.isArray(items) ? items.length : 0;
      const normalized = (items ?? []).map((raw, i) =>
        normalizeDeviceEvent(raw, i),
      );
      const filtered = applyEventClientFilters(normalized, {
        lotId,
        eventType: et,
        eventStatus: es,
      });
      setPageCache((prev) => ({ ...prev, [page]: filtered }));
      setPageSizeByPage((prev) => ({ ...prev, [page]: rawPageSize }));
    } catch (e) {
      console.error(e);
      toast.error("Không thể tải nhật ký thiết bị");
      setPageCache((prev) => ({ ...prev, [page]: [] }));
      setPageSizeByPage((prev) => ({ ...prev, [page]: 0 }));
    } finally {
      setLoading(false);
    }
  }, [page, lotId, filterEventType, filterEventStatus]);

  useEffect(() => {
    if (!pageCache[page]) loadLogs();
  }, [pageCache, page, loadLogs]);

  // Thống kê tăng dần theo trang: trang 1 = 10, trang 2 = 20, ...
  // (danh sách vẫn hiển thị theo trang hiện tại)
  useEffect(() => {
    setStatsLoading(true);
    const pagesToCount = Array.from(
      { length: Math.max(0, page) },
      (_, i) => i + 1,
    );
    const data = pagesToCount.flatMap((p) => pageCache[p] ?? []);
    const statusCounts = data.reduce((acc, item) => {
      const k = normKey(item?.eventStatus);
      if (!k) return acc;
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    setSummaryStats({
      total: data.length,
      statusCounts,
    });
    setStatsLoading(false);
  }, [pageCache, page]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    // Search áp dụng trên trang hiện tại.
    return currentPageLogs.filter((log) => {
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
  }, [currentPageLogs, searchTerm]);

  const statTotalEvents = summaryStats?.total ?? 0;
  const statusCounts = summaryStats?.statusCounts ?? {};

  // API không trả tổng trang: cho phép qua trang sau nếu trang hiện tại trả đủ PAGE_SIZE bản ghi.
  const totalPages = null;
  const canGoNext = lastPageSize >= PAGE_SIZE;

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterEventType("");
    setFilterEventStatus("");
    setLotId("");
    setPage(1);
    setPageCache({});
    setPageSizeByPage({});
  };

  return (
    <div className="space-y-5">
      <DeviceEventsStats
        loading={statsLoading}
        statTotalEvents={statTotalEvents}
        statusCounts={statusCounts}
      />

      <DeviceEventsFilters
        searchTerm={searchTerm}
        onSearchChange={(v) => {
          setSearchTerm(v);
          setPage(1);
        }}
        loading={loading}
        recordCount={currentPageLogs.length}
        pageSize={PAGE_SIZE}
        onReload={loadLogs}
        onResetFilters={handleResetFilters}
        lots={lots}
        lotId={lotId}
        onLotChange={(v) => {
          setLotId(v);
          setPage(1);
          setPageCache({});
          setPageSizeByPage({});
        }}
        filterEventType={filterEventType}
        onEventTypeChange={(v) => {
          setFilterEventType(v);
          setPage(1);
          setPageCache({});
          setPageSizeByPage({});
        }}
        filterEventStatus={filterEventStatus}
        onEventStatusChange={(v) => {
          setFilterEventStatus(v);
          setPage(1);
          setPageCache({});
          setPageSizeByPage({});
        }}
      />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <DeviceEventsList loading={loading} filteredLogs={filteredLogs} />

        {!loading && currentPageLogs.length > 0 && (
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
