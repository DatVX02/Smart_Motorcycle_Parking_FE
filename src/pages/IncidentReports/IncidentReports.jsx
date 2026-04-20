import { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  Eye,
  Edit,
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
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "";
}

function simplifyIncidentTypeLabel(label = "") {
  return String(label)
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
}

const INCIDENT_TYPE_VI = {
  parking_lot_issue: "Lỗi tại bãi xe",
  parkinglotissue: "Lỗi tại bãi xe",
  app_error: "Lỗi ứng dụng",
  apperror: "Lỗi ứng dụng",
  device_error: "Lỗi thiết bị",
  deviceerror: "Lỗi thiết bị",
  staff_service: "Nhân viên / dịch vụ",
  staffservice: "Nhân viên / dịch vụ",
  payment_issue: "Vấn đề thanh toán",
  paymentissue: "Vấn đề thanh toán",
  vehicle_issue: "Vấn đề phương tiện",
  vehicleissue: "Vấn đề phương tiện",
  security_issue: "Vấn đề an ninh",
  securityissue: "Vấn đề an ninh",
  facility_issue: "Vấn đề cơ sở vật chất",
  facilityissue: "Vấn đề cơ sở vật chất",
  system_error: "Lỗi hệ thống",
  systemerror: "Lỗi hệ thống",
  other: "Khác",
};

function formatIncidentType(typeRaw, typeLabelMap = {}) {
  const s = String(typeRaw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "";

  if (INCIDENT_TYPE_VI[s]) return INCIDENT_TYPE_VI[s];
  if (typeLabelMap[s]) return simplifyIncidentTypeLabel(typeLabelMap[s]);

  const fallback = s
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return simplifyIncidentTypeLabel(fallback);
}

function getReportId(report) {
  return (
    report?.incident_id ??
    report?.incidentId ??
    report?.IncidentId ??
    report?.id ??
    report?.incidentReportId ??
    report?.reportId ??
    ""
  );
}

function getReportIncidentType(report) {
  return (
    report?.incident_type ??
    report?.incidentType ??
    report?.IncidentType ??
    report?.type ??
    report?.reportType ??
    ""
  );
}

function getReportTitle(report, typeLabelMap = {}) {
  return (
    report?.title ??
    report?.incidentTitle ??
    report?.incident_title ??
    report?.issueTitle ??
    report?.name ??
    formatIncidentType(getReportIncidentType(report), typeLabelMap)
  );
}

function getReportCreatedAt(report) {
  return (
    report?.created_at ??
    report?.createdAt ??
    report?.createdDate ??
    report?.reportedAt
  );
}

function getReportUpdatedAt(report) {
  return (
    report?.resolved_at ??
    report?.updatedAt ??
    report?.lastUpdatedAt ??
    report?.resolvedAt
  );
}

function getReportLotId(report) {
  return (
    report?.lot_id ??
    report?.lotId ??
    report?.LotId ??
    report?.parking_lot_id ??
    report?.parkingLotId ??
    report?.ParkingLotId ??
    ""
  );
}

function toStatusKey(statusRaw) {
  const s = String(statusRaw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (s === "" || s === "pending" || s === "open" || s === "new") {
    return "PENDING";
  }
  if (s === "inprogress" || s === "processing") return "PROCESSING";
  if (s === "resolved" || s === "done") return "RESOLVED";
  if (
    s === "rejected" ||
    s === "cancelled" ||
    s === "closed" ||
    s === "close"
  ) {
    return "REJECTED";
  }
  return "OTHER";
}

function statusInfo(statusRaw) {
  const key = toStatusKey(statusRaw);
  const map = {
    PENDING: {
      label: "Chờ xử lý",
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
    },
    PROCESSING: {
      label: "Đang xử lý",
      cls: "bg-blue-100 text-blue-700 border border-blue-200",
    },
    RESOLVED: {
      label: "Đã xử lý",
      cls: "bg-green-100 text-green-700 border border-green-200",
    },
    REJECTED: {
      label: "Từ chối",
      cls: "bg-red-100 text-red-700 border border-red-200",
    },
    OTHER: {
      label: statusRaw || "Không xác định",
      cls: "bg-gray-100 text-gray-600 border border-gray-200",
    },
  };
  return map[key] ?? map.OTHER;
}

function priorityInfo(priorityRaw) {
  const p = String(priorityRaw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (p === "critical") {
    return {
      label: "Nghiêm trọng",
      cls: "bg-red-100 text-red-700 border border-red-200",
    };
  }
  if (p === "high") {
    return {
      label: "Cao",
      cls: "bg-orange-100 text-orange-700 border border-orange-200",
    };
  }
  if (p === "medium") {
    return {
      label: "Trung bình",
      cls: "bg-amber-100 text-amber-700 border border-amber-200",
    };
  }
  if (p === "low") {
    return {
      label: "Thấp",
      cls: "bg-green-100 text-green-700 border border-green-200",
    };
  }

  return {
    label: priorityRaw || "Không xác định",
    cls: "bg-gray-100 text-gray-600 border border-gray-200",
  };
}

function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  valueSuffix,
  bgTint,
}) {
  const bgClass = bgTint ?? "bg-white";
  return (
    <div className={`rounded-3xl p-6 shadow border ${bgClass}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-8 h-8 flex-shrink-0 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
            {value}
            {valueSuffix && (
              <span className="text-base font-medium text-gray-600">
                {valueSuffix}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function statusClass(status) {
  return statusInfo(status).cls;
}

function priorityClass(priority) {
  return priorityInfo(priority).cls;
}

function toApiStatusValue(statusRaw) {
  const key = toStatusKey(statusRaw);
  if (key === "PENDING") return "pending";
  if (key === "PROCESSING") return "in_progress";
  if (key === "RESOLVED") return "resolved";
  if (key === "REJECTED") return "closed";
  return "pending";
}

function UpdateIncidentModal({
  report,
  onClose,
  onUpdated,
  typeLabelMap = {},
}) {
  const reportId = getReportId(report);
  const [detail, setDetail] = useState(report ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(toApiStatusValue(report?.status));
  const [resolutionNote, setResolutionNote] = useState(
    report?.resolution_notes ?? report?.resolutionNotes ?? "",
  );

  /* Sự cố đã đóng (Đã xử lý / Từ chối) → chỉ xem, không cho chỉnh sửa */
  const originalStatusKey = toStatusKey((detail ?? report)?.status);
  const isLocked =
    originalStatusKey === "RESOLVED" || originalStatusKey === "REJECTED";

  useEffect(() => {
    let cancelled = false;

    if (!reportId) {
      setDetail(report ?? null);
      setStatus(toApiStatusValue(report?.status));
      setResolutionNote(
        report?.resolution_notes ?? report?.resolutionNotes ?? "",
      );
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    incidentReportService
      .getById(reportId)
      .then((data) => {
        if (cancelled) return;
        const item = data?.data ?? data;
        if (item && typeof item === "object") {
          setDetail(item);
          setStatus(toApiStatusValue(item.status));
          setResolutionNote(
            item.resolution_notes ?? item.resolutionNotes ?? "",
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(report ?? null);
          setStatus(toApiStatusValue(report?.status));
          setResolutionNote(
            report?.resolution_notes ?? report?.resolutionNotes ?? "",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [report, reportId]);

  const handleSave = async () => {
    if (!reportId) {
      toast.error("Không tìm thấy mã báo cáo sự cố");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        status,
        resolution_notes: resolutionNote.trim() || null,
      };
      if (status === "resolved" || status === "rejected") {
        payload.resolved_at = new Date().toISOString();
      }

      await incidentReportService.update(reportId, payload);
      toast.success("Cập nhật xử lý sự cố thành công");
      onUpdated?.();
      onClose();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          err?.response?.data?.title ??
          err?.message ??
          "Không thể cập nhật sự cố",
      );
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Edit className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {isLocked ? "Chi tiết xử lý sự cố" : "Cập nhật xử lý sự cố"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Đang tải chi tiết...
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                Loại sự cố
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatIncidentType(
                  getReportIncidentType(detail ?? report),
                  typeLabelMap,
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                Mức độ
              </p>
              <p className="text-sm font-medium text-gray-900">
                {priorityInfo((detail ?? report)?.priority).label}
              </p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">
              Trạng thái xử lý
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isLocked}
              className="input text-sm w-full disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              <option value="pending">Chờ xử lý</option>
              <option value="in_progress">Đang xử lý</option>
              <option value="resolved">Đã xử lý</option>
              <option value="closed">Từ chối</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">
              Ghi chú xử lý
            </label>
            <textarea
              rows={4}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              disabled={isLocked}
              placeholder={
                isLocked ? "Không có ghi chú" : "Nhập ghi chú xử lý sự cố..."
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500"
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 bg-white rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {isLocked ? "Đóng" : "Hủy"}
          </button>
          {!isLocked && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "Lưu cập nhật"
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DetailModal({ report, onClose, lotNameById, typeLabelMap }) {
  const [detail, setDetail] = useState(report ?? null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const reportId = getReportId(report);

  useEffect(() => {
    let cancelled = false;

    if (!reportId) {
      setDetail(report ?? null);
      return () => {
        cancelled = true;
      };
    }

    setLoadingDetail(true);
    incidentReportService
      .getById(reportId)
      .then((data) => {
        if (cancelled) return;
        const item = data?.data ?? data;
        if (item && typeof item === "object") {
          setDetail(item);
        } else {
          setDetail(report ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setDetail(report ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [report, reportId]);

  const source = detail ?? report;
  if (!source) return null;

  const lotId = getReportLotId(source);
  const lotName =
    source.lotName ??
    source.parkingLotName ??
    (lotId ? lotNameById[String(lotId)] : null) ??
    lotId ??
    "";

  const details = [
    ["Tiêu đề", getReportTitle(source, typeLabelMap) || ""],
    [
      "Loại sự cố",
      formatIncidentType(getReportIncidentType(source), typeLabelMap),
    ],
    ["Bãi xe", lotName],
    ["Mức độ", priorityInfo(source.priority).label],
    ["Trạng thái", statusInfo(source.status).label],
    ["Thời gian tạo", fmtDate(getReportCreatedAt(source))],
    ["Thời gian cập nhật", fmtDate(getReportUpdatedAt(source))],
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
          {loadingDetail && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Đang tải chi tiết...
            </div>
          )}

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
              {source.description ?? source.content ?? source.note ?? ""}
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Ghi chú xử lý
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {source.resolution_notes ?? source.resolutionNotes ?? ""}
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
  const [updateReport, setUpdateReport] = useState(null);
  const [incidentTypeMap, setIncidentTypeMap] = useState({});

  const lotNameById = useMemo(() => {
    return lots.reduce((acc, lot) => {
      const id = lot.id ?? lot.lotId;
      if (id != null) acc[String(id)] = lot.name ?? lot.lotName ?? String(id);
      return acc;
    }, {});
  }, [lots]);

  const stats = useMemo(() => {
    const pending = reports.filter(
      (r) => toStatusKey(r.status) === "PENDING",
    ).length;
    const processing = reports.filter(
      (r) => toStatusKey(r.status) === "PROCESSING",
    ).length;
    const resolved = reports.filter(
      (r) => toStatusKey(r.status) === "RESOLVED",
    ).length;
    const rejected = reports.filter(
      (r) => toStatusKey(r.status) === "REJECTED",
    ).length;
    return {
      pending,
      processing,
      resolved,
      rejected,
    };
  }, [reports]);

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

  useEffect(() => {
    let cancelled = false;
    incidentReportService
      .getTypes()
      .then((data) => {
        if (cancelled) return;
        const map = data?.data ?? data ?? {};
        setIncidentTypeMap(typeof map === "object" && map ? map : {});
      })
      .catch(() => {
        if (!cancelled) setIncidentTypeMap({});
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
      <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 sm:grid sm:grid-cols-5 sm:overflow-visible sm:mx-0 sm:px-0">
        <div className="flex-shrink-0 w-[180px] sm:w-auto sm:min-w-0">
          <StatCard
            icon={AlertTriangle}
            iconColor="text-blue-600"
            label="Tổng sự cố"
            value={totalCount}
            valueSuffix="Sự cố"
          />
        </div>
        <div className="flex-shrink-0 w-[180px] sm:w-auto sm:min-w-0">
          <StatCard
            icon={Clock}
            iconColor="text-amber-600"
            label="Chờ xử lý"
            value={stats.pending}
            valueSuffix="Sự cố"
            bgTint="bg-amber-500/30"
          />
        </div>
        <div className="flex-shrink-0 w-[180px] sm:w-auto sm:min-w-0">
          <StatCard
            icon={RefreshCw}
            iconColor="text-blue-600"
            label="Đang xử lý"
            value={stats.processing}
            valueSuffix="Sự cố"
            bgTint="bg-blue-500/30"
          />
        </div>
        <div className="flex-shrink-0 w-[180px] sm:w-auto sm:min-w-0">
          <StatCard
            icon={CheckCircle}
            iconColor="text-green-600"
            label="Đã xử lý"
            value={stats.resolved}
            valueSuffix="Sự cố"
            bgTint="bg-green-500/30"
          />
        </div>
        <div className="flex-shrink-0 w-[180px] sm:w-auto sm:min-w-0">
          <StatCard
            icon={XCircle}
            iconColor="text-red-600"
            label="Từ chối"
            value={stats.rejected}
            valueSuffix="Sự cố"
            bgTint="bg-red-500/30"
          />
        </div>
      </div>

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
              <option value="Open">Chờ xử lý</option>
              <option value="InProgress">Đang xử lý</option>
              <option value="Resolved">Đã xử lý</option>
              <option value="Rejected">Từ chối</option>
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
              <option value="Low">Thấp</option>
              <option value="Medium">Trung bình</option>
              <option value="High">Cao</option>
              <option value="Critical">Nghiêm trọng</option>
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
                    {Array.from({ length: 7 }).map((__, j) => (
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
                  <td colSpan={7} className="py-20 text-center">
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
                  const id = getReportId(r);
                  const lotIdRaw = getReportLotId(r);
                  const lotName =
                    r.lotName ??
                    r.parkingLotName ??
                    (lotIdRaw ? lotNameById[String(lotIdRaw)] : null) ??
                    lotIdRaw ??
                    "";
                  return (
                    <tr
                      key={id ?? idx}
                      className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="p-3 text-center text-gray-500 font-semibold">
                        {(pageNumber - 1) * pageSize + idx + 1}
                      </td>
                      <td className="p-3 text-center text-gray-900 font-medium max-w-[220px] truncate">
                        {getReportTitle(r, incidentTypeMap) || ""}
                      </td>
                      <td className="p-3 text-center text-gray-600 max-w-[220px] truncate">
                        {lotName}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${priorityClass(r.priority)}`}
                        >
                          {priorityInfo(r.priority).label}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass(r.status)}`}
                        >
                          {statusInfo(r.status).label}
                        </span>
                      </td>
                      <td className="p-3 text-center text-gray-500 whitespace-nowrap">
                        {fmtDate(getReportCreatedAt(r))}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailReport(r)}
                            className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUpdateReport(r)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="Cập nhật xử lý"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
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
          lotNameById={lotNameById}
          typeLabelMap={incidentTypeMap}
          onClose={() => setDetailReport(null)}
        />
      )}

      {updateReport && (
        <UpdateIncidentModal
          report={updateReport}
          onClose={() => setUpdateReport(null)}
          onUpdated={loadReports}
          typeLabelMap={incidentTypeMap}
        />
      )}
    </div>
  );
}
