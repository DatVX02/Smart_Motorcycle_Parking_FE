import { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  Eye,
  Search,
  X,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { createPortal } from "react-dom";
import incidentReportService from "../../services/incidentReportService";
import parkingLotService from "../../services/parkingLotService";

function fmtDate(v) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "—";
}

function statusClass(status) {
  const s = String(status ?? "").toLowerCase();
  if (s.includes("open") || s.includes("new")) {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }
  if (s.includes("progress") || s.includes("processing")) {
    return "bg-blue-100 text-blue-700 border border-blue-200";
  }
  if (s.includes("resolved") || s.includes("closed") || s.includes("done")) {
    return "bg-green-100 text-green-700 border border-green-200";
  }
  return "bg-gray-100 text-gray-600 border border-gray-200";
}

function priorityClass(priority) {
  const p = String(priority ?? "").toLowerCase();
  if (p.includes("high") || p.includes("critical")) {
    return "bg-red-100 text-red-700 border border-red-200";
  }
  if (p.includes("medium")) {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }
  if (p.includes("low")) {
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }
  return "bg-gray-100 text-gray-600 border border-gray-200";
}

function DetailModal({ report, onClose }) {
  if (!report) return null;

  const details = [
    [
      "Mã sự cố",
      report.id ?? report.incidentReportId ?? report.reportId ?? "—",
    ],
    ["Tiêu đề", report.title ?? report.issueTitle ?? report.name ?? "—"],
    ["Bãi xe", report.lotName ?? report.parkingLotName ?? report.lotId ?? "—"],
    [
      "Thiết bị",
      report.deviceName ?? report.deviceCode ?? report.deviceId ?? "—",
    ],
    ["Mức độ", report.priority ?? "—"],
    ["Trạng thái", report.status ?? "—"],
    [
      "Thời gian tạo",
      fmtDate(report.createdAt ?? report.createdDate ?? report.reportedAt),
    ],
    [
      "Thời gian cập nhật",
      fmtDate(report.updatedAt ?? report.lastUpdatedAt ?? report.resolvedAt),
    ],
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Chi tiết báo cáo sự cố
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {details.map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                  {label}
                </p>
                <p className="text-sm font-medium text-gray-900 break-words">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-100">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Mô tả
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {report.description ?? report.content ?? report.note ?? "—"}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function IncidentReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState("");
  const [lotId, setLotId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const [lots, setLots] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);

  const [detailReport, setDetailReport] = useState(null);

  useEffect(() => {
    let cancelled = false;
    parkingLotService
      .getAllParkingLots()
      .then((data) => {
        if (!cancelled) setLots(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setLots([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pageNumber,
        pageSize,
      };

      if (lotId) params.lotid = lotId;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (search.trim()) params.search = search.trim();

      const data = await incidentReportService.getAll(params);

      let items = [];
      let total = 0;

      if (Array.isArray(data)) {
        items = data;
        total = data.length;
      } else if (Array.isArray(data?.items)) {
        items = data.items;
        total = Number(
          data.totalCount ??
            data.total ??
            data.count ??
            data.pagination?.total ??
            items.length,
        );
      } else if (Array.isArray(data?.data)) {
        items = data.data;
        total = Number(data.totalCount ?? data.total ?? items.length);
      }

      setReports(items);
      setTotalCount(Number.isFinite(total) ? total : items.length);
    } catch (e) {
      console.error(e);
      toast.error("Không thể tải danh sách báo cáo sự cố");
      setReports([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [lotId, status, priority, search, pageNumber, pageSize]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageNums = useMemo(() => {
    const start = Math.max(1, Math.min(pageNumber - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [pageNumber, totalPages]);

  const handleReset = () => {
    setSearch("");
    setLotId("");
    setStatus("");
    setPriority("");
    setPageNumber(1);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            placeholder="Tìm theo tiêu đề, mã sự cố, thiết bị..."
            onChange={(e) => {
              setSearch(e.target.value);
              setPageNumber(1);
            }}
            className="input pl-10 w-full text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Bãi xe</label>
            <select
              value={lotId}
              onChange={(e) => {
                setLotId(e.target.value);
                setPageNumber(1);
              }}
              className="input text-sm"
            >
              <option value="">Tất cả bãi</option>
              {lots.map((lot) => {
                const id = lot.id ?? lot.lotId;
                const name = lot.name ?? lot.lotName ?? id;
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPageNumber(1);
              }}
              className="input text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Open">Open</option>
              <option value="InProgress">InProgress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Mức độ</label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPageNumber(1);
              }}
              className="input text-sm"
            >
              <option value="">Tất cả mức độ</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary text-sm flex items-center gap-1.5 w-full justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-center">
                {[
                  "STT",
                  "Mã sự cố",
                  "Tiêu đề",
                  "Bãi xe",
                  "Mức độ",
                  "Trạng thái",
                  "Thời gian tạo",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="p-3 text-center text-sm font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 animate-pulse">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className="h-3.5 bg-gray-100 rounded"
                          style={{ width: `${50 + ((j * 13) % 40)}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-300">
                      <XCircle className="w-12 h-12" />
                      <p className="text-gray-400 text-sm font-medium">
                        Không có báo cáo sự cố
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((r, idx) => {
                  const id = r.id ?? r.incidentReportId ?? r.reportId;
                  return (
                    <tr
                      key={id ?? idx}
                      className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="p-3 text-center text-gray-500 font-semibold">
                        {(pageNumber - 1) * pageSize + idx + 1}
                      </td>
                      <td className="p-3 text-center text-gray-600 whitespace-nowrap">
                        {id ?? "—"}
                      </td>
                      <td className="p-3 text-center text-gray-900 font-medium max-w-[220px] truncate">
                        {r.title ?? r.issueTitle ?? r.name ?? "—"}
                      </td>
                      <td className="p-3 text-center text-gray-600 max-w-[220px] truncate">
                        {r.lotName ?? r.parkingLotName ?? r.lotId ?? "—"}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${priorityClass(r.priority)}`}
                        >
                          {r.priority ?? "—"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass(r.status)}`}
                        >
                          {r.status ?? "—"}
                        </span>
                      </td>
                      <td className="p-3 text-center text-gray-500 whitespace-nowrap">
                        {fmtDate(r.createdAt ?? r.createdDate ?? r.reportedAt)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setDetailReport(r)}
                          className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                Trang{" "}
                <span className="font-semibold text-gray-700">
                  {pageNumber}
                </span>{" "}
                / {totalPages}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber === 1}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pageNums.map((p) => (
                <button
                  key={p}
                  onClick={() => setPageNumber(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                    p === pageNumber
                      ? "bg-blue-600 text-white shadow-sm"
                      : "hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() =>
                  setPageNumber((p) => Math.min(totalPages, p + 1))
                }
                disabled={pageNumber === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {detailReport && (
        <DetailModal
          report={detailReport}
          onClose={() => setDetailReport(null)}
        />
      )}
    </div>
  );
}
