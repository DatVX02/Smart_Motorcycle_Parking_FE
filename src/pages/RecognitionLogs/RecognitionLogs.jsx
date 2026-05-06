import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import recognitionLogService from "../../services/recognitionLogService";
import parkingLotService from "../../services/parkingLotService";
import RecognitionLogsStats from "./RecognitionLogsStats";
import RecognitionLogsFilters from "./RecognitionLogsFilters";
import RecognitionLogsTable from "./RecognitionLogsTable";
import RecognitionLogDetailModal from "./RecognitionLogDetailModal";
import { PAGE_SIZE } from "./recognitionLogsConstants";
import {
  buildLotOptions,
  calculateRecognitionStats,
  normalizeText,
} from "./recognitionLogsUtils";

function RecognitionLogs() {
  const [parkingLots, setParkingLots] = useState([]);
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: PAGE_SIZE,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [recognitionTypeFilter, setRecognitionTypeFilter] = useState("");
  const [lotFilter, setLotFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    let cancelled = false;

    parkingLotService
      .getAllParkingLots()
      .then((items) => {
        if (!cancelled) {
          setParkingLots(Array.isArray(items) ? items : []);
        }
      })
      .catch(() => {
        if (!cancelled) setParkingLots([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (recognitionTypeFilter) params.recognitionType = recognitionTypeFilter;
      if (lotFilter) params.lotId = lotFilter;

      const result = await recognitionLogService.getAll(params);
      setLogs(Array.isArray(result.items) ? result.items : []);
      setMeta(
        result.meta ?? {
          totalItems: 0,
          totalPages: 1,
          currentPage: 1,
          pageSize: PAGE_SIZE,
        },
      );
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải nhật ký nhận diện");
      setLogs([]);
      setMeta({
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        pageSize: PAGE_SIZE,
      });
    } finally {
      setLoading(false);
    }
  }, [page, recognitionTypeFilter, lotFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    let cancelled = false;

    const loadAllLogs = async () => {
      setLoadingStats(true);
      try {
        const params = {
          page: 1,
          pageSize: PAGE_SIZE,
        };
        if (recognitionTypeFilter)
          params.recognitionType = recognitionTypeFilter;
        if (lotFilter) params.lotId = lotFilter;

        const first = await recognitionLogService.getAll(params);
        const collected = Array.isArray(first.items) ? [...first.items] : [];
        const totalPages = Number(first.meta?.totalPages ?? 1);

        for (let p = 2; p <= totalPages; p += 1) {
          const next = await recognitionLogService.getAll({
            ...params,
            page: p,
          });
          if (Array.isArray(next.items)) collected.push(...next.items);
        }

        if (!cancelled) setAllLogs(collected);
      } catch (error) {
        console.error(error);
        if (!cancelled) setAllLogs([]);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };

    loadAllLogs();

    return () => {
      cancelled = true;
    };
  }, [recognitionTypeFilter, lotFilter]);

  const lotOptions = useMemo(() => {
    return buildLotOptions(parkingLots, allLogs.length ? allLogs : logs);
  }, [parkingLots, allLogs, logs]);

  const filterLogs = useCallback(
    (items) => {
      const needle = normalizeText(searchTerm);
      const recognitionTypeNeedle = normalizeText(recognitionTypeFilter);
      const lotNeedle = normalizeText(lotFilter);

      return items.filter((item) => {
        const itemRecognitionType = normalizeText(item?.recognitionType);
        const itemLotId = normalizeText(item?.lotId);

        if (
          recognitionTypeNeedle &&
          itemRecognitionType !== recognitionTypeNeedle
        ) {
          return false;
        }

        if (lotNeedle && itemLotId !== lotNeedle) {
          return false;
        }

        if (!needle) return true;

        const searchable = [
          item?.logId,
          item?.sessionId,
          item?.licensePlate,
          item?.recognitionType,
          item?.lotName,
          item?.lotId,
        ]
          .map((v) => normalizeText(v))
          .join(" ");

        return searchable.includes(needle);
      });
    },
    [searchTerm, recognitionTypeFilter, lotFilter],
  );

  const filteredLogs = useMemo(() => {
    return filterLogs(logs);
  }, [logs, filterLogs]);

  const statsSource = useMemo(() => {
    if (allLogs.length === 0) return filteredLogs;
    return filterLogs(allLogs);
  }, [allLogs, filteredLogs, filterLogs]);

  const totalItems = Number(meta.totalItems ?? 0);
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    Boolean(recognitionTypeFilter.trim()) ||
    Boolean(lotFilter.trim());

  const stats = useMemo(
    () =>
      calculateRecognitionStats(
        statsSource,
        hasActiveFilters ? statsSource.length : totalItems,
      ),
    [statsSource, totalItems, hasActiveFilters],
  );

  const handleResetFilters = () => {
    setSearchTerm("");
    setRecognitionTypeFilter("");
    setLotFilter("");
    setPage(1);
  };

  const totalPages = Math.max(1, Number(meta.totalPages) || 1);
  const statsLoadingState = loading || loadingStats;

  return (
    <div className="space-y-5">
      <RecognitionLogsStats loading={statsLoadingState} stats={stats} />

      <RecognitionLogsFilters
        searchTerm={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setPage(1);
        }}
        recognitionTypeFilter={recognitionTypeFilter}
        onRecognitionTypeChange={(value) => {
          setRecognitionTypeFilter(value);
          setPage(1);
        }}
        lotFilter={lotFilter}
        onLotChange={(value) => {
          setLotFilter(value);
          setPage(1);
        }}
        lotOptions={lotOptions}
        onReload={loadLogs}
        onReset={handleResetFilters}
        loading={loading}
      />

      <RecognitionLogsTable
        logs={filteredLogs}
        loading={loading}
        currentPage={page}
        pageSize={Number(meta.pageSize || PAGE_SIZE)}
        totalPages={totalPages}
        totalItems={hasActiveFilters ? filteredLogs.length : totalItems}
        onPageChange={setPage}
        onOpenDetail={setSelectedLog}
      />

      <RecognitionLogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}

export default RecognitionLogs;
