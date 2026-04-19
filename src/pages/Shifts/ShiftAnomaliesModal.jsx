import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  RefreshCw,
  AlertTriangle,
  Users,
  Building2,
  BarChart2,
  CalendarX,
  UserX,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import workShiftService from "../../services/workShiftService";

const CHECKS = [
  {
    key: "anomalies",
    label: "Tổng hợp vấn đề",
    description: "Tổng hợp tất cả bất thường trong lịch",
    icon: ShieldAlert,
    color: "rose",
    fn: (params) => workShiftService.checkAnomalies(params),
  },
  {
    key: "multipleLot",
    label: "Xung đột nhiều bãi",
    description: "Nhân viên bị xếp lịch ở nhiều bãi xe cùng lúc",
    icon: Building2,
    color: "orange",
    fn: (params) => workShiftService.checkMultipleLotConflicts(params),
  },
  {
    key: "overstaffed",
    label: "Bãi quá nhiều NV",
    description: "Bãi xe có số nhân viên vượt quá mức cần thiết",
    icon: Users,
    color: "amber",
    fn: (params) => workShiftService.checkOverstaffedLots(params),
  },
  {
    key: "unbalanced",
    label: "Lịch không cân bằng",
    description: "Phân bổ ca trực không đều giữa các nhân viên",
    icon: BarChart2,
    color: "yellow",
    fn: (params) => workShiftService.checkUnbalancedWorkload(params),
  },
  {
    key: "unscheduled",
    label: "Ngày chưa có lịch",
    description: "Các ngày chưa được xếp lịch cho bãi xe",
    icon: CalendarX,
    color: "blue",
    fn: (params) => workShiftService.checkUnscheduledDays(params),
  },
  {
    key: "emptyShifts",
    label: "Ca trống chưa gán",
    description: "Ca trực chưa được gán nhân viên",
    icon: UserX,
    color: "violet",
    fn: (params) => workShiftService.checkEmptyShifts(params),
  },
];

function getMonthParams(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = date.getMonth();
  // startDate = hôm nay
  const startDate = `${y}-${pad(m + 1)}-${pad(date.getDate())}`;
  // endDate = ngày cuối tháng
  const lastDay = new Date(y, m + 1, 0).getDate();
  const endDate = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return { startDate, endDate };
}

const COLOR_MAP = {
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    badge: "bg-rose-100 text-rose-700",
    icon: "text-rose-500",
    header: "bg-rose-50 border-rose-100",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
    icon: "text-orange-500",
    header: "bg-orange-50 border-orange-100",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    icon: "text-amber-500",
    header: "bg-amber-50 border-amber-100",
  },
  yellow: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-700",
    icon: "text-yellow-600",
    header: "bg-yellow-50 border-yellow-100",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    icon: "text-blue-500",
    header: "bg-blue-50 border-blue-100",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    badge: "bg-violet-100 text-violet-700",
    icon: "text-violet-500",
    header: "bg-violet-50 border-violet-100",
  },
};

function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  // Ưu tiên các key mảng phổ biến
  for (const key of [
    "items",
    "data",
    "conflicts",
    "issues",
    "anomalies",
    "results",
    "staffWorkloads",
    "workloads",
  ]) {
    if (Array.isArray(data[key])) return data[key];
  }
  // Nếu chính object là 1 record (không phải wrapper), trả về mảng chứa nó
  if (typeof data === "object" && !Array.isArray(data)) {
    const arrays = Object.values(data).filter(Array.isArray);
    if (arrays.length > 0) return arrays.flat();
    return [data];
  }
  return [];
}

const SHIFT_TYPE_VI = {
  MORNING: "Ca sáng",
  morning: "Ca sáng",
  AFTERNOON: "Ca chiều",
  afternoon: "Ca chiều",
  NIGHT: "Ca đêm",
  night: "Ca đêm",
  FULL_DAY: "Cả ngày",
  fullday: "Cả ngày",
  Morning: "Ca sáng",
  Afternoon: "Ca chiều",
  Night: "Ca đêm",
  FullDay: "Cả ngày",
};

function translateShiftTypeToken(token) {
  const t = String(token).trim();
  if (!t) return "";
  return (
    SHIFT_TYPE_VI[t] ??
    SHIFT_TYPE_VI[t.toUpperCase()] ??
    SHIFT_TYPE_VI[t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()] ??
    t
  );
}

const WARNING_TYPE_VI = {
  UNSCHEDULED_DAYS: "Ngày chưa xếp lịch",
  MULTIPLE_LOT_CONFLICT: "Xung đột nhiều bãi",
  OVERSTAFFED: "Bãi quá nhiều nhân viên",
  UNBALANCED_WORKLOAD: "Lịch không cân bằng",
  EMPTY_SHIFTS: "Ca trống chưa gán",
};

const SEVERITY_VI = {
  High: "Cao",
  MEDIUM: "Trung bình",
  Medium: "Trung bình",
  LOW: "Thấp",
  Low: "Thấp",
  CRITICAL: "Nghiêm trọng",
  Critical: "Nghiêm trọng",
};

/** Gộp lặp "Bãi xe Bãi xe …" → một lần */
function dedupeBaiXePrefix(text) {
  if (typeof text !== "string") return text;
  return text.replace(/(Bãi xe\s*){2,}/gi, "Bãi xe ");
}

function formatShortUuid(id) {
  if (typeof id !== "string" || id.length < 12) return id ?? "";
  return `${id.slice(0, 8)}…`;
}

function formatMaybeIsoDateTime(value) {
  if (typeof value !== "string") return value;
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value + "T12:00:00").toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return value;
}

/** Chuỗi nhiều ngày "yyyy-mm-dd, ..." → dd/mm/yyyy */
function formatDateList(value) {
  if (typeof value !== "string") return formatMaybeIsoDateTime(value);
  if (!value.includes(",")) return formatMaybeIsoDateTime(value.trim());
  return value
    .split(",")
    .map((x) => formatMaybeIsoDateTime(x.trim()))
    .join(", ");
}

/** Chuỗi/array loại ca (Morning, xuống dòng, v.v.) → tiếng Việt */
function formatShiftTypesList(raw) {
  if (raw == null) return "";
  let parts;
  if (Array.isArray(raw)) {
    parts = raw.flatMap((x) =>
      String(x)
        .split(/\s*,\s*|\r?\n|\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  } else {
    parts = String(raw)
      .split(/\r?\n/)
      .flatMap((line) => line.split(/\s*,\s*/))
      .flatMap((seg) => seg.trim().split(/\s+/));
  }
  parts = parts.map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map(translateShiftTypeToken).join(", ");
}

function formatNumberVi(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(2)));
}

/** Dòng chi tiết: lotId / Mã bãi xe | Tên bãi | … (phân tách | · •) */
function parseDetailsPipeString(str) {
  if (typeof str !== "string" || !str.trim()) return null;
  const parts = str
    .split(/\s*[|·•]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const detailLabels = {
    lotid: "Mã bãi xe",
    lotname: "Tên bãi xe",
    daysahead: "Số ngày tới",
    staffid: "Mã NV",
    staffname: "Nhân viên",
  };
  const rows = [];
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    if (/^\s*(lotId|lot_id|Mã\s*bãi\s*xe)\s*:/i.test(part)) continue;
    const key = part.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "");
    if (key === "lotid" || key === "lot_id" || key === "mãbãixe") continue;
    const val = part.slice(idx + 1).trim();
    const label = detailLabels[key] ?? part.slice(0, idx).trim();
    let displayVal = val;
    if (key === "staffid") displayVal = formatShortUuid(val);
    else if (key === "daysahead") displayVal = val;
    rows.push({ label, value: displayVal });
  }
  return rows.length ? rows : null;
}

/** Fallback: chuỗi chi tiết không parse được — vẫn bỏ đoạn mã bãi */
function stripLotIdFromDetailsRaw(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/\s*lotId\s*:\s*[0-9a-fA-F-]{30,}\s*([|·•]\s*|$)/gi, "$1")
    .replace(/\s*Mã\s*bãi\s*xe\s*:\s*[0-9a-fA-F-]{30,}\s*([|·•]\s*|$)/gi, "$1")
    .replace(/^[|·•\s]+/, "")
    .trim();
}

/** Chuẩn hoá key field (camelCase / snake_case) để so khớp */
function normalizeFieldKey(key) {
  return String(key)
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function formatStaffWorkloadRow(w) {
  if (typeof w !== "object" || w === null) return String(w);
  const name = w.staffName ?? w.name ?? w.fullName ?? w.StaffName ?? "";
  const shifts =
    w.shiftCount ?? w.totalShifts ?? w.shifts ?? w.shiftTotal ?? "";
  const dev = w.deviation ?? w.diff ?? w.balance ?? w.weight;
  const devStr =
    typeof dev === "number" ? ` · Lệch phân bổ: ${formatNumberVi(dev)}` : "";
  return `• ${name}: ${shifts} ca${devStr}`;
}

// Chuyển bất kỳ giá trị nào thành string an toàn cho React
function toDisplayString(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "boolean") return val ? "Có" : "Không";
  if (typeof val === "number") return formatNumberVi(val);
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    if (val.length === 0) return "";
    return val
      .map((v) =>
        typeof v === "object" && v !== null
          ? formatStaffWorkloadRow(v)
          : String(v),
      )
      .join("\n");
  }
  if (typeof val === "object") {
    const readable = Object.entries(val)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${friendlyKey(k)}: ${formatFieldValue(k, v)}`)
      .join(" · ");
    return readable || JSON.stringify(val);
  }
  return String(val);
}

/** Giá trị hiển thị theo từng field (tiếng Việt, định dạng) */
function formatFieldValue(key, val) {
  const k = normalizeFieldKey(key);

  if (val === null || val === undefined) return "";

  if (k === "warningtype") {
    const s = String(val);
    return WARNING_TYPE_VI[s] ?? WARNING_TYPE_VI[s.toUpperCase()] ?? s;
  }
  if (k === "severity") {
    const s = String(val);
    return (
      SEVERITY_VI[s] ??
      SEVERITY_VI[s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()] ??
      s
    );
  }
  if (k === "detectedat") {
    return formatMaybeIsoDateTime(String(val));
  }
  if (k === "message" || k === "description" || k === "title") {
    return dedupeBaiXePrefix(String(val));
  }
  if (k === "unscheduleddates") {
    if (Array.isArray(val))
      return val
        .map((d) => formatMaybeIsoDateTime(String(d).split("T")[0]))
        .join(", ");
    return formatDateList(String(val));
  }
  if (k === "emptyshifttypes" || k === "emptyshifts") {
    return formatShiftTypesList(val);
  }
  if (k === "shifttypes" || k === "shifttype") {
    return formatShiftTypesList(val);
  }
  if (k === "averageshiftsperstaff") {
    return typeof val === "number" ? formatNumberVi(val) : toDisplayString(val);
  }
  if (k === "staffworkloads") {
    if (Array.isArray(val))
      return val.map((row) => formatStaffWorkloadRow(row)).join("\n");
    return toDisplayString(val);
  }
  if (k === "details" && typeof val === "string") {
    const parsed = parseDetailsPipeString(val);
    if (parsed && parsed.length > 0)
      return parsed.map((r) => `${r.label}: ${r.value}`).join("\n");
    return stripLotIdFromDetailsRaw(val);
  }
  if (typeof val === "number") return formatNumberVi(val);
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    return formatMaybeIsoDateTime(val);
  }

  return toDisplayString(val);
}

// Label tiếng Việt cho key (camelCase / snake / API)
function friendlyKey(k) {
  const raw = String(k);
  const normalized = raw.trim().toLowerCase();
  const byNorm = {
    "warning type": "Loại cảnh báo",
    "detected at": "Thời điểm phát hiện",
    "staff workloads": "Phân bổ ca theo nhân viên",
  };
  if (byNorm[normalized]) return byNorm[normalized];
  const map = {
    staffId: "Mã nhân viên",
    staffName: "Nhân viên",
    lotId: "Mã bãi xe",
    lotName: "Tên bãi xe",
    shiftDate: "Ngày ca",
    workDate: "Ngày làm",
    shiftType: "Loại ca",
    startTime: "Giờ bắt đầu",
    endTime: "Giờ kết thúc",
    unscheduledDates: "Ngày chưa có lịch",
    daysAhead: "Số ngày xét (tới)",
    emptyShiftTypes: "Ca còn trống",
    totalShifts: "Tổng ca",
    averageShiftsPerStaff: "Trung bình ca/NV",
    maxShifts: "Ca nhiều nhất",
    minShifts: "Ca ít nhất",
    startDate: "Từ ngày",
    endDate: "Đến ngày",
    date: "Ngày",
    reason: "Lý do",
    message: "Nội dung",
    warningType: "Loại cảnh báo",
    severity: "Mức độ",
    detectedAt: "Thời điểm phát hiện",
    details: "Chi tiết",
    staffWorkloads: "Phân bổ ca theo nhân viên",
    staff_workloads: "Phân bổ ca theo nhân viên",
    description: "Mô tả",
    title: "Tiêu đề",
  };
  if (map[raw]) return map[raw];
  if (map[normalized]) return map[normalized];
  const spaced = raw
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim();
  if (!spaced) return raw;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function ItemCard({ item }) {
  const [open, setOpen] = useState(false);

  if (typeof item !== "object" || item === null) {
    return (
      <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
        <p className="text-xs text-gray-700">{toDisplayString(item)}</p>
      </div>
    );
  }

  const entries = Object.entries(item);

  // Tìm trường tiêu đề ưu tiên (chỉ lấy string/number)
  const titleRaw =
    item.staffName ??
    item.lotName ??
    item.name ??
    item.title ??
    item.message ??
    item.description ??
    item.date ??
    null;
  const titleVal =
    titleRaw !== null &&
    (typeof titleRaw === "string" || typeof titleRaw === "number")
      ? dedupeBaiXePrefix(String(titleRaw))
      : null;

  const subRaw =
    item.shiftDate ?? item.workDate ?? item.date ?? item.reason ?? null;
  const subVal =
    subRaw !== null &&
    subRaw !== titleRaw &&
    (typeof subRaw === "string" || typeof subRaw === "number")
      ? (() => {
          const s = String(subRaw);
          if (/^\d{4}-\d{2}-\d{2}/.test(s))
            return formatMaybeIsoDateTime(s.split("T")[0]);
          return s;
        })()
      : null;

  const titleNorm = titleVal ? titleVal.trim().toLowerCase() : "";
  const displayEntries = entries.filter(([key, val]) => {
    const kn = normalizeFieldKey(key);
    if (kn === "lotid" || kn === "mãbãixe") return false;
    if (kn === "lotname" && titleNorm) {
      const lotStr = dedupeBaiXePrefix(String(val ?? ""))
        .trim()
        .toLowerCase();
      if (
        lotStr === titleNorm ||
        lotStr === titleNorm.replace(/^bãi xe\s+/i, "")
      )
        return false;
    }
    if (kn === "title" && titleRaw != null && String(val) === String(titleRaw))
      return false;
    return true;
  });

  const hasMore = displayEntries.length > 0;

  return (
    <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">
            {titleVal ?? "Chi tiết"}
          </p>
          {subVal && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5">
              {subVal}
            </p>
          )}
        </div>
        {hasMore &&
          (open ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          ))}
      </button>
      {open && hasMore && (
        <div className="px-3 pb-2.5 border-t border-gray-100 pt-2 space-y-1.5">
          {displayEntries.map(([k, v]) => {
            const text = formatFieldValue(k, v);
            return (
              <div key={k} className="flex gap-2 text-[11px]">
                <span className="text-gray-500 font-medium min-w-[130px] flex-shrink-0">
                  {friendlyKey(k)}
                </span>
                <span
                  className={`text-gray-800 flex-1 min-w-0 break-words ${String(text).includes("\n") ? "whitespace-pre-line" : ""}`}
                >
                  {text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CheckSection({ check, params }) {
  const [state, setState] = useState("idle"); // idle | loading | ok | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const c = COLOR_MAP[check.color];
  const Icon = check.icon;
  const items = extractItems(data);
  const hasIssues = items.length > 0;

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setData(null);
    check
      .fn(params)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setState("ok");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ??
              err?.message ??
              "Không thể tải dữ liệu bất thường ca trực. Vui lòng thử lại.",
          );
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [check, params]);

  return (
    <div
      className={`rounded-xl border ${hasIssues ? c.border : "border-gray-100"} overflow-hidden`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          hasIssues ? c.header : "bg-gray-50"
        } border-b ${hasIssues ? c.border : "border-gray-100"}`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${hasIssues ? c.bg : "bg-gray-100"}`}
        >
          {state === "loading" ? (
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
          ) : state === "error" ? (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          ) : hasIssues ? (
            <Icon className={`w-4 h-4 ${c.icon}`} />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold ${hasIssues ? c.text : "text-gray-500"}`}
          >
            {check.label}
          </p>
          <p className="text-[11px] text-gray-400 truncate">
            {check.description}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {state === "ok" && (
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                hasIssues ? c.badge : "bg-green-100 text-green-600"
              }`}
            >
              {hasIssues ? `${items.length} vấn đề` : "Ổn"}
            </span>
          )}
          {state === "error" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-500">
              Lỗi
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="bg-white px-4 py-3">
          {state === "loading" && (
            <div className="flex items-center gap-2 py-2">
              <RefreshCw className="w-4 h-4 text-gray-300 animate-spin" />
              <span className="text-xs text-gray-400">Đang kiểm tra...</span>
            </div>
          )}
          {state === "error" && (
            <p className="text-xs text-red-500 py-1">{error}</p>
          )}
          {state === "ok" && !hasIssues && (
            <div className="flex items-center gap-2 py-1">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-600 font-medium">
                Không phát hiện vấn đề
              </span>
            </div>
          )}
          {state === "ok" && hasIssues && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {items.map((item, i) => (
                <ItemCard
                  key={i}
                  item={
                    typeof item === "object" && item !== null
                      ? item
                      : { value: item }
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ShiftAnomaliesModal({ onClose }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [monthDate] = useState(() => new Date());
  const params = getMonthParams(monthDate);

  const monthLabel = monthDate.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900">
              Kiểm tra lịch làm việc
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Phát hiện bất thường trong lịch phân ca -{" "}
              <span className="font-medium text-gray-500 capitalize">
                {monthLabel}
              </span>
              <span className="text-gray-300 mx-1">·</span>
              <span>
                {new Date(params.startDate + "T00:00:00").toLocaleDateString(
                  "vi-VN",
                  { day: "2-digit", month: "2-digit", year: "numeric" },
                )}
                {" → "}
                {new Date(params.endDate + "T00:00:00").toLocaleDateString(
                  "vi-VN",
                  { day: "2-digit", month: "2-digit", year: "numeric" },
                )}
              </span>
            </p>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            title="Kiểm tra lại"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3" key={refreshKey}>
          {CHECKS.map((check) => (
            <CheckSection key={check.key} check={check} params={params} />
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
