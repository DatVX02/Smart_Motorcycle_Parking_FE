import { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Eye,
  Search,
  CheckCircle,
  CircleDollarSign,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  AlertCircle,
  ClockAlert,
  Banknote,
} from "lucide-react";
import toast from "react-hot-toast";
import { DatePicker, ConfigProvider } from "antd";
import dayjs from "dayjs";
import viVN from "antd/es/locale/vi_VN";
import "dayjs/locale/vi";
import transactionService from "../../services/transactionService";
import parkingLotService from "../../services/parkingLotService";
import userService from "../../services/userService";

dayjs.locale("vi");

/* Constants */
const PAYMENT_STATUS_MAP = {
  // exact values returned by API
  Completed: {
    label: "Hoàn thành",
    cls: "bg-green-100 text-green-700 border border-green-200",
  },
  completed: {
    label: "Hoàn thành",
    cls: "bg-green-100 text-green-700 border border-green-200",
  },
  COMPLETED: {
    label: "Hoàn thành",
    cls: "bg-green-100 text-green-700 border border-green-200",
  },
  OvertimePaid: {
    label: "Thanh toán quá giờ",
    cls: "bg-purple-100 text-purple-700 border border-purple-200",
  },
  Overtimepaid: {
    label: "Đã thanh toán quá giờ",
    cls: "bg-purple-100 text-purple-700 border border-purple-200",
  },
  overtimepaid: {
    label: "Đã thanh toán quá giờ",
    cls: "bg-purple-100 text-purple-700 border border-purple-200",
  },
  "overtime-paid": {
    label: "Đã thanh toán quá giờ",
    cls: "bg-purple-100 text-purple-700 border border-purple-200",
  },
  overtime_paid: {
    label: "Đã thanh toán quá giờ",
    cls: "bg-purple-100 text-purple-700 border border-purple-200",
  },
  OVERTIME_PAID: {
    label: "Đã thanh toán quá giờ",
    cls: "bg-purple-100 text-purple-700 border border-purple-200",
  },
  Prepaid: {
    label: "Thanh toán trước",
    cls: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  PrePaid: {
    label: "Thanh toán trước",
    cls: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  prepaid: {
    label: "Thanh toán trước",
    cls: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  PREPAID: {
    label: "Thanh toán trước",
    cls: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  "pre-paid": {
    label: "Thanh toán trước",
    cls: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  pre_paid: {
    label: "Thanh toán trước",
    cls: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  PRE_PAID: {
    label: "Thanh toán trước",
    cls: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  Pending: {
    label: "Chờ thanh toán",
    cls: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  },
  pending: {
    label: "Chờ thanh toán",
    cls: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  },
  PENDING: {
    label: "Chờ thanh toán",
    cls: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  },
  Failed: {
    label: "Thất bại",
    cls: "bg-red-100 text-red-700 border border-red-200",
  },
  failed: {
    label: "Thất bại",
    cls: "bg-red-100 text-red-700 border border-red-200",
  },
  FAILED: {
    label: "Thất bại",
    cls: "bg-red-100 text-red-700 border border-red-200",
  },
  InProgress: {
    label: "Đang đỗ",
    cls: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  "in-progress": {
    label: "Đang đỗ",
    cls: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  IN_PROGRESS: {
    label: "Đang đỗ",
    cls: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  Cancelled: {
    label: "Đã hủy",
    cls: "bg-gray-100 text-gray-600 border border-gray-200",
  },
  cancelled: {
    label: "Đã hủy",
    cls: "bg-gray-100 text-gray-600 border border-gray-200",
  },
  CANCELLED: {
    label: "Đã hủy",
    cls: "bg-gray-100 text-gray-600 border border-gray-200",
  },
};

const STATUS_FILTER_OPTIONS = [
  { value: "Completed", label: "Hoàn thành" },
  { value: "Pending", label: "Chờ thanh toán" },
  { value: "Prepaid", label: "Thanh toán trước" },
  { value: "OvertimePaid", label: "Thanh toán quá giờ" },
  { value: "Cancelled", label: "Đã hủy" },
];

/* Helpers */
function formatCurrency(amount) {
  if (amount == null || amount === "") return "-";
  return `${Number(amount).toLocaleString("vi-VN")} VNĐ`;
}

function formatDateTimeInVietnam(value) {
  if (!value) return "-";

  const raw = String(value).trim();
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);

  // Handle backend format like YYYY-MM-DDTHH:mm[:ss] safely.
  const matched = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/,
  );

  let date;
  if (hasTimezone) {
    date = new Date(raw);
  } else if (matched) {
    const [, year, month, day, hour, minute, second = "00"] = matched;
    // If timezone is missing, treat source as UTC from DB then display in VN timezone.
    date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ),
    );
  } else {
    date = new Date(raw);
  }

  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatBackendDateTime(value) {
  return formatDateTimeInVietnam(value);
}

function formatCreatedDateTime(value) {
  return formatDateTimeInVietnam(value);
}

function formatDateTime(value) {
  return formatBackendDateTime(value);
}

function formatCompletedDateTime(value) {
  return formatBackendDateTime(value);
}

function formatTargetTypeLabel(type, empty = "—") {
  if (!type) return empty;
  const normalized = String(type).trim().toLowerCase();
  if (["parking-session", "parkingsession"].includes(normalized)) {
    return "Phí gửi xe";
  }
  if (["monthly-pass", "monthlypass"].includes(normalized)) return "Vé tháng";
  if (["wallet-deposit", "walletdeposit"].includes(normalized)) {
    return "Nạp ví";
  }
  if (["wallet-withdraw", "walletwithdraw"].includes(normalized)) {
    return "Rút tiền";
  }
  return String(type);
}

// function formatCompositionLabel(value, empty = "—") {
//   if (!value) return empty;
//   const normalized = String(value).trim().toLowerCase();
//   if (normalized === "single") return "Thanh toán đơn";
//   if (normalized === "mixed") return "Thanh toán nhiều";
//   return String(value);
// }

function normalizeTargetTypeParam(type) {
  if (!type) return "";
  const normalized = String(type).trim().toLowerCase();
  if (["parking", "parking_session", "parkingsession"].includes(normalized)) {
    return "parking-session";
  }
  if (["monthly", "monthly_pass", "monthlypass"].includes(normalized)) {
    return "monthly-pass";
  }
  if (["wallet", "wallet_deposit", "walletdeposit"].includes(normalized)) {
    return "wallet-deposit";
  }
  if (["wallet_withdraw", "walletwithdraw"].includes(normalized)) {
    return "wallet-withdraw";
  }
  return normalized;
}

/** Làm sạch mô tả component: bỏ phần ID tiền tố và Việt hóa loại giao dịch. */
function formatComponentDescription(value, empty = "-") {
  if (value == null || value === "") return empty;

  const raw = String(value).trim();
  if (!raw) return empty;

  const parts = raw
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean);

  let candidate = raw;
  if (parts.length > 1) {
    const prefix = parts.slice(0, -1).join("_");
    const isIdLikePrefix = /^[a-z0-9-]{12,}$/i.test(prefix);
    if (isIdLikePrefix) {
      candidate = parts[parts.length - 1];
    }
  }

  // Xoa UUID xuat hien trong mo ta de text gon hon.
  candidate = candidate
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .replace(/[,_-]+$/g, "")
    .trim();

  if (!candidate) return empty;

  const normalizedTargetType = normalizeTargetTypeParam(candidate);
  const translated = formatTargetTypeLabel(normalizedTargetType, "");
  if (translated && translated !== normalizedTargetType) return translated;

  return candidate;
}

/** Hiển thị phương thức thanh toán (API có thể trả mã tiếng Anh). */
function formatPaymentMethodLabel(method, empty = "—") {
  if (method == null || method === "") return empty;
  const s = String(method).trim();
  const normalized = s.toLowerCase().replace(/[\s_-]+/g, "");

  if (normalized === "wallet") return "Ví điện tử";
  if (normalized === "payos") return "PayOS";
  if (normalized === "cash") return "Tiền mặt";
  if (normalized === "points") return "Điểm";
  if (normalized === "banktransfer") return "Chuyển khoản";
  if (normalized === "monthlypass") return "Vé tháng";

  return s;
}

function normalizePaymentMethodKey(value) {
  const normalized = normalizeStatus(value);
  if (!normalized) return "";

  if (normalized === "wallet") return "wallet";
  if (normalized === "payos") return "payos";
  if (normalized === "cash") return "cash";
  if (normalized === "points") return "points";
  if (normalized === "banktransfer") return "banktransfer";
  if (normalized === "monthlypass") return "monthlypass";

  return normalized;
}

function parseBackendDateToMs(value) {
  if (!value) return NaN;
  const raw = String(value).trim();
  if (!raw) return NaN;

  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const matched = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/,
  );

  let date;
  if (hasTimezone) {
    date = new Date(raw);
  } else if (matched) {
    const [, year, month, day, hour, minute, second = "00"] = matched;
    date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ),
    );
  } else {
    date = new Date(raw);
  }

  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

/** Chuyển ngày thành tham số API: YYYY-MM-DDTHH:mm */
function toApiDateParam(dateStr, endOfDay = false) {
  if (!dateStr) return "";
  const t = endOfDay ? "23:59" : "00:00";
  return `${dateStr}T${t}`;
}

function getStatusInfo(tx) {
  const raw =
    tx.paymentStatus ??
    tx.payment_status ??
    tx.status ??
    tx.paymentState ??
    tx.payment_state ??
    tx.state ??
    tx.PaymentStatus ??
    tx.Status ??
    null;
  if (!raw) return null;
  return {
    raw,
    ...(PAYMENT_STATUS_MAP[raw] ?? {
      label: raw,
      cls: "bg-gray-100 text-gray-600 border border-gray-200",
    }),
  };
}

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function isSuccessfulPaymentStatus(value) {
  const normalized = normalizeStatus(value);
  return (
    normalized === "completed" ||
    normalized === "overtimepaid" ||
    normalized === "prepaid"
  );
}

function isFailedPaymentStatus(value) {
  return normalizeStatus(value) === "failed";
}

function getPaymentStatusValue(item) {
  if (!item || typeof item !== "object") return "";
  return normalizeStatus(
    item.paymentStatus ??
      item.payment_status ??
      item.status ??
      item.paymentState ??
      item.payment_state ??
      item.state ??
      item.PaymentStatus ??
      item.Status,
  );
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function getTargetTypeValue(item) {
  if (!item || typeof item !== "object") return undefined;
  return normalizeTargetTypeParam(
    pickFirst(item.targetType, item.referenceType, item.entityType),
  );
}

function getTargetIdValue(item) {
  if (!item || typeof item !== "object") return undefined;
  return pickFirst(
    item.targetId,
    item.referenceId,
    item.entityId,
    item.parkingSessionId,
    item.monthlyPassId,
    item.passId,
    item.orderId,
  );
}

function getTargetDisplay(item) {
  if (!item || typeof item !== "object") return "—";
  return (
    pickFirst(
      item.licensePlate,
      item.vehicleLicensePlate,
      item.vehiclePlate,
      item.plate,
      item.targetLabel,
    ) ?? "—"
  );
}

function getUserDisplay(item, userFullNameById = {}) {
  if (!item || typeof item !== "object") return "Vãng lai";
  const fullName = pickFirst(
    item.fullName,
    item.customerName,
    item.userFullName,
    item.name,
  );
  if (fullName) return fullName;

  const userId = pickFirst(item.userId, item.customerId, item.accountId);
  if (userId && userFullNameById[userId]) return userFullNameById[userId];

  return "Vãng lai";
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function formatPaymentMethods(value, fallbackItem) {
  if (Array.isArray(value) && value.length) {
    return value.map((item) => formatPaymentMethodLabel(item)).join(" + ");
  }

  if (
    Array.isArray(fallbackItem?.components) &&
    fallbackItem.components.length
  ) {
    const methods = [
      ...new Set(fallbackItem.components.map((c) => c?.method).filter(Boolean)),
    ];
    if (methods.length) {
      return methods.map((item) => formatPaymentMethodLabel(item)).join(" + ");
    }
  }

  return formatPaymentMethodLabel(
    fallbackItem?.paymentMethod ??
      fallbackItem?.method ??
      fallbackItem?.channel,
  );
}

function getCashAmount(item) {
  return Number(
    pickFirst(
      item?.cashAmount,
      item?.amount,
      item?.totalAmount,
      item?.paidAmount,
      0,
    ),
  );
}

function getSignedAmountMeta(amount) {
  const numericAmount = Number(amount ?? 0);
  const safeAmount = Number.isFinite(numericAmount)
    ? Math.abs(numericAmount)
    : 0;
  const baseText = formatCurrency(safeAmount);

  if (baseText === "-" || safeAmount === 0) {
    return { text: baseText, cls: "" };
  }

  if (numericAmount < 0) {
    return { text: `-${baseText}`, cls: "text-red-600" };
  }

  return { text: `+${baseText}`, cls: "text-green-700" };
}

function getSignedComponentCashAmount(component, targetType) {
  if (!component || typeof component !== "object") return 0;

  const amount = Math.abs(getCashAmount(component));
  const status = getPaymentStatusValue(component);

  if (isFailedPaymentStatus(status)) return -amount;

  if (isSuccessfulPaymentStatus(status)) {
    const direction = getCashflowDirection(targetType);
    if (direction === "out") return -amount;
    if (direction === "in") return amount;
  }

  return 0;
}

function getComponentAmountMeta(component, targetType) {
  if (!component || typeof component !== "object") {
    return { text: "-", cls: "" };
  }

  const amount = Math.abs(getCashAmount(component));
  const status = getPaymentStatusValue(component);

  if (isFailedPaymentStatus(status)) {
    return getSignedAmountMeta(-amount);
  }

  if (isSuccessfulPaymentStatus(status)) {
    return getSignedAmountMeta(
      getSignedComponentCashAmount(component, targetType),
    );
  }

  // Pending/other statuses: show original amount but no +/- sign.
  return {
    text: formatCurrency(amount),
    cls: "",
  };
}

function getNetCashAmountWithFailed(item, fallbackTargetType) {
  if (!item || typeof item !== "object") return 0;

  const resolvedTargetType =
    getTargetTypeValue(item) ?? normalizeTargetTypeParam(fallbackTargetType);

  if (Array.isArray(item.components) && item.components.length) {
    return item.components.reduce(
      (sum, component) =>
        sum + getSignedComponentCashAmount(component, resolvedTargetType),
      0,
    );
  }

  const amount = Math.abs(getCashAmount(item));
  const status = getPaymentStatusValue(item);

  if (isFailedPaymentStatus(status)) return -amount;

  if (isSuccessfulPaymentStatus(status)) {
    const direction = getCashflowDirection(resolvedTargetType);
    if (direction === "out") return -amount;
    if (direction === "in") return amount;
  }

  return 0;
}

function getCashflowDirection(targetType) {
  const normalized = normalizeTargetTypeParam(targetType);
  if (normalized === "wallet-withdraw") return "out";
  if (
    ["parking-session", "monthly-pass", "wallet-deposit"].includes(normalized)
  ) {
    return "in";
  }
  return "neutral";
}

function getPointsUsed(item) {
  return Number(pickFirst(item?.pointsUsed, item?.points, 0));
}

function StatusBadge({ tx }) {
  const info = getStatusInfo(tx);
  if (!info) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${info.cls}`}
    >
      {info.label}
    </span>
  );
}

function toStatusTimeMs(item) {
  const rawTime = pickFirst(
    item?.completedAt,
    item?.updatedAt,
    item?.createdAt,
    item?.paymentTime,
    item?.timestamp,
  );
  if (!rawTime) return NaN;

  const ms = Date.parse(rawTime);
  return Number.isFinite(ms) ? ms : NaN;
}

function getLatestStatusSource(detail, components) {
  if (!Array.isArray(components) || components.length === 0) return detail;

  const latest = components.reduce((best, component, index) => {
    if (!getStatusInfo(component)) return best;

    const current = {
      source: component,
      index,
      time: toStatusTimeMs(component),
    };

    if (!best) return current;

    const bestHasTime = Number.isFinite(best.time);
    const currentHasTime = Number.isFinite(current.time);

    if (bestHasTime && currentHasTime) {
      if (current.time > best.time) return current;
      if (current.time === best.time && current.index > best.index) {
        return current;
      }
      return best;
    }

    if (currentHasTime && !bestHasTime) return current;
    if (!currentHasTime && !bestHasTime && current.index > best.index) {
      return current;
    }

    return best;
  }, null);

  return latest?.source ?? detail;
}

function getLatestStatusValue(tx) {
  const components = Array.isArray(tx?.components) ? tx.components : [];
  const source = getLatestStatusSource(tx, components);
  return normalizeStatus(
    source?.paymentStatus ??
      source?.payment_status ??
      source?.status ??
      source?.paymentState ??
      source?.payment_state ??
      source?.state ??
      source?.PaymentStatus ??
      source?.Status,
  );
}

/* Detail Modal */
function DetailModal({ targetType, targetId, userFullNameById, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetType || !targetId) return;
    let cancelled = false;

    const loadDetail = async () => {
      setLoading(true);
      try {
        const data = await transactionService.getPaymentBreakdownsByTarget(
          targetType,
          targetId,
        );
        const firstItem = extractItems(data)[0];
        const picked =
          firstItem ?? (data && typeof data === "object" ? data : null);

        if (!cancelled) setDetail(picked);
      } catch {
        if (!cancelled) {
          setDetail(null);
          toast.error("Không thể tải chi tiết breakdown");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  const detailNetCashAmount = detail
    ? getNetCashAmountWithFailed(detail, detail.targetType ?? targetType)
    : 0;
  const detailNetCashAmountMeta = getSignedAmountMeta(detailNetCashAmount);

  const components = Array.isArray(detail?.components) ? detail.components : [];
  const statusSource = getLatestStatusSource(detail, components);

  const rows = detail
    ? [
        ["Biển số thanh toán", getTargetDisplay(detail)],
        [
          "Hình thức",
          formatTargetTypeLabel(detail.targetType ?? targetType, "-"),
        ],
        // [
        //   "Loại thanh toán",
        //   formatCompositionLabel(detail.paymentComposition, "-"),
        // ],
        ["Phương thức", formatPaymentMethods(detail.paymentMethods, detail)],
        ["Tổng tiền giao dịch", detailNetCashAmountMeta.text],
        [
          "Điểm sử dụng / tích lũy",
          getPointsUsed(detail).toLocaleString("vi-VN"),
        ],
        ["Thời gian tạo", formatCreatedDateTime(detail.createdAt)],
        ["Hoàn tất cuối lúc", formatCompletedDateTime(detail.completedAt)],
        ["Người dùng", getUserDisplay(detail, userFullNameById)],
        [
          "Bãi gửi xe",
          detail.parkingLotName ?? detail.lotName ?? detail.lotId ?? "-",
        ],
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative mt-2 sm:mt-4 bg-white rounded-2xl shadow-2xl w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-6xl max-h-[94vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Chi tiết giao dịch
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <AlertCircle className="w-10 h-10" />
              <p className="text-sm">Không có dữ liệu</p>
            </div>
          ) : (
            <>
              {/* Info grid: 8 ô — 4 hàng × 2 cột, cân đối sau khi bỏ mã giao dịch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {rows.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                      {label}
                    </p>
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Current status */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                  Trạng thái
                </p>
                <StatusBadge tx={statusSource} />
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                  Chi tiết thành phần thanh toán
                </p>

                {components.length === 0 ? (
                  <p className="text-sm text-gray-400">Không có components</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="px-3 py-2 text-left">Phương thức</th>
                          <th className="px-3 py-2 text-right">Số tiền</th>
                          <th className="px-3 py-2 text-right">Điểm</th>
                          <th className="px-3 py-2 text-center">Trạng thái</th>
                          <th className="px-3 py-2 text-left">PayOS Txn</th>
                          <th className="px-3 py-2 text-left">Mô tả</th>
                          <th className="px-3 py-2 text-left">Thời gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {components.map((component, index) => {
                          const componentAmountMeta = getComponentAmountMeta(
                            component,
                            detail?.targetType ?? targetType,
                          );

                          return (
                            <tr
                              key={`${component.method ?? "method"}-${index}`}
                              className="border-t border-gray-100"
                            >
                              <td className="px-3 py-2">
                                {formatPaymentMethodLabel(component.method)}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold">
                                <span className={componentAmountMeta.cls}>
                                  {componentAmountMeta.text}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                {Number(component.points ?? 0).toLocaleString(
                                  "vi-VN",
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <StatusBadge tx={component} />
                              </td>
                              <td className="px-3 py-2 break-all text-xs text-gray-600">
                                {component.payosTransactionId ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {formatComponentDescription(
                                  component.description,
                                  "-",
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                {formatDateTime(component.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Update status
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                  Cập nhật trạng thái
                </p>
                <div className="flex gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="input flex-1 text-sm"
                  >
                    <option value="Pending">Chờ thanh toán</option>
                    <option value="Completed">Hoàn thành</option>
                    <option value="InProgress">Đang đỗ</option>
                    <option value="Failed">Thất bại</option>
                    <option value="Cancelled">Đã hủy</option>
                  </select>
                  <button
                    onClick={handleSave}
                    disabled={saving || newStatus === curStatus}
                    className="btn btn-primary px-5 disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      "Lưu"
                    )}
                  </button>
                </div>
              </div> */}

              {(detail.note || detail.description) && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Ghi chú
                  </p>
                  <p className="text-sm text-gray-700">
                    {detail.note ??
                      formatComponentDescription(detail.description)}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* Stat Card */
function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  valueSuffix,
  bgTint,
  compact = false,
  className = "",
}) {
  const bgClass = bgTint ?? "bg-white";
  const wrapperPadding = compact ? "p-4" : "p-6";
  const iconSizeClass = compact ? "w-6 h-6" : "w-8 h-8";
  const valueSizeClass = compact
    ? "text-xl lg:text-2xl"
    : "text-2xl lg:text-3xl";
  const suffixSizeClass = compact ? "text-sm" : "text-base";

  return (
    <div
      className={`rounded-3xl shadow border ${wrapperPadding} ${bgClass} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`${iconSizeClass} flex-shrink-0 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p
            className={`${valueSizeClass} font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1`}
          >
            {value}
            {valueSuffix && (
              <span className={`${suffixSizeClass} font-medium text-gray-600`}>
                {valueSuffix}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* Main Page */
export default function Transactions() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [targetType, setTargetType] = useState("");
  const [composition, setComposition] = useState("");
  const [lotId, setLotId] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [parkingLots, setParkingLots] = useState([]);
  const [userFullNameById, setUserFullNameById] = useState({});

  // Pagination (client-side)
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);

  const [detailTarget, setDetailTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    parkingLotService
      .getAllParkingLots()
      .then((data) => {
        if (!cancelled) setParkingLots(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setParkingLots([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      try {
        const response = await userService.getAllUser();
        const payload = response?.data?.data ?? response?.data ?? response;
        const users = extractItems(payload);
        const nextLookup = {};

        users.forEach((user) => {
          const id = pickFirst(user?.userId, user?.id, user?.accountId);
          const fullName = pickFirst(
            user?.fullName,
            user?.name,
            user?.displayName,
          );

          if (id && fullName) {
            nextLookup[String(id)] = String(fullName);
          }
        });

        if (!cancelled) setUserFullNameById(nextLookup);
      } catch {
        if (!cancelled) setUserFullNameById({});
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalCount = allTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const transactions = allTransactions.slice(
    (pageNumber - 1) * pageSize,
    pageNumber * pageSize,
  );

  /* Load payment breakdown list – lấy toàn bộ 1 lần, phân trang phía client */
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setStatsLoading(true);
    try {
      const fromDateParam = fromDate
        ? toApiDateParam(fromDate.format("YYYY-MM-DD"), false)
        : "";
      const toDateParam = toDate
        ? toApiDateParam(toDate.format("YYYY-MM-DD"), true)
        : "";

      const params = { pageSize: 9999 }; // lấy hết để phân trang client-side
      if (paymentStatus) {
        params.paymentStatus = paymentStatus;
      }
      if (targetType) params.targetType = targetType;
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (composition) params.composition = composition;
      if (lotId) params.lotId = lotId;
      if (fromDateParam) params.fromDate = fromDateParam;
      if (toDateParam) params.toDate = toDateParam;

      const data = await transactionService.getPaymentBreakdowns(params);

      let items = extractItems(data);

      if (search) {
        const keyword = search.trim().toLowerCase();
        if (keyword) {
          items = items.filter((tx) => {
            const haystacks = [
              tx.userId,
              tx.targetId,
              tx.targetLabel,
              tx.targetType,
              tx.transactionId,
              tx.id,
              tx.licensePlate,
              tx.vehicleLicensePlate,
              tx.plate,
              tx.userName,
              tx.customerName,
              tx.fullName,
              tx.accountName,
              tx.lotName,
              tx.paymentStatus,
              formatPaymentMethods(tx.paymentMethods, tx),
            ]
              .filter((v) => v != null)
              .map((v) => String(v).toLowerCase());
            return haystacks.some((v) => v.includes(keyword));
          });
        }
      }

      // Client-side filter fallback nếu API chưa lọc server-side
      if (paymentStatus) {
        const needle = normalizeStatus(paymentStatus);
        const filtered = items.filter(
          (tx) => getLatestStatusValue(tx) === needle,
        );
        if (filtered.length !== items.length) items = filtered;
      }

      if (paymentMethod) {
        const needle = normalizePaymentMethodKey(paymentMethod);
        const filtered = items.filter((tx) => {
          const methods = [];

          if (Array.isArray(tx.paymentMethods)) {
            methods.push(...tx.paymentMethods);
          }

          methods.push(tx.paymentMethod, tx.method, tx.channel);

          if (Array.isArray(tx.components) && tx.components.length) {
            tx.components.forEach((component) => {
              methods.push(component?.method, component?.paymentMethod);
            });
          }

          return methods
            .filter((m) => m != null && m !== "")
            .some((m) => normalizePaymentMethodKey(m) === needle);
        });

        if (filtered.length !== items.length) items = filtered;
      }

      if (targetType) {
        const filtered = items.filter(
          (tx) => getTargetTypeValue(tx) === targetType,
        );
        if (filtered.length !== items.length) items = filtered;
      }

      if (composition) {
        const needle = normalizeStatus(composition);
        const filtered = items.filter(
          (tx) => normalizeStatus(tx.paymentComposition) === needle,
        );
        if (filtered.length !== items.length) items = filtered;
      }

      if (lotId) {
        const filtered = items.filter((tx) => {
          const id = tx.lotId ?? tx.parkingLotId ?? "";
          return String(id) === String(lotId);
        });
        if (filtered.length !== items.length) items = filtered;
      }

      if (fromDate || toDate) {
        const fromMs = fromDate ? fromDate.startOf("day").valueOf() : -Infinity;
        const toMs = toDate ? toDate.endOf("day").valueOf() : Infinity;

        const filtered = items.filter((tx) => {
          const createdMs = parseBackendDateToMs(tx.createdAt);
          if (!Number.isFinite(createdMs)) return false;
          return createdMs >= fromMs && createdMs <= toMs;
        });

        if (filtered.length !== items.length) items = filtered;
      }

      setAllTransactions(items);
      setPageNumber(1); // reset về trang 1 khi filter thay đổi

      // Doanh thu: cộng toàn bộ khoản đã thanh toán thành công ở từng breakdown/component.
      const totalRevenue = items.reduce((s, tx) => {
        return s + getNetCashAmountWithFailed(tx, getTargetTypeValue(tx));
      }, 0);

      setStatistics({
        totalTransactions: items.length,
        totalRevenue,
        completedTransactions: items.filter(
          (tx) => getLatestStatusValue(tx) === "completed",
        ).length,
        prepaidTransactions: items.filter(
          (tx) => getLatestStatusValue(tx) === "prepaid",
        ).length,
        overtimePaidTransactions: items.filter(
          (tx) => getLatestStatusValue(tx) === "overtimepaid",
        ).length,
        pendingTransactions: items.filter(
          (tx) => getLatestStatusValue(tx) === "pending",
        ).length,
        failedOrCancelledTransactions: items.filter((tx) => {
          const s = getLatestStatusValue(tx);
          return s === "failed" || s === "cancelled";
        }).length,
      });
    } catch {
      toast.error("Không thể tải danh sách giao dịch");
      setAllTransactions([]);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [
    search,
    paymentStatus,
    paymentMethod,
    targetType,
    composition,
    lotId,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleReset = () => {
    setSearch("");
    setPaymentStatus("");
    setPaymentMethod("");
    setTargetType("");
    setComposition("");
    setLotId("");
    setFromDate(null);
    setToDate(null);
    setPageNumber(1);
  };

  /* Stat values */
  const statTotal = statistics?.totalTransactions ?? totalCount;
  const statRevenueNumber = Number(
    statistics?.totalRevenue ?? 0,
  ).toLocaleString("vi-VN");
  const statCompleted = statistics?.completedTransactions ?? 0;
  const statPrepaid = statistics?.prepaidTransactions ?? 0;
  const statOvertimePaid = statistics?.overtimePaidTransactions ?? 0;
  const statPending = statistics?.pendingTransactions ?? 0;
  const statFailedOrCancelled = statistics?.failedOrCancelledTransactions ?? 0;

  /* Pagination numbers */
  const pageNums = (() => {
    const start = Math.max(1, Math.min(pageNumber - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  })();

  return (
    <div className="space-y-5">
      {/* Statistics */}
      <div className="space-y-4">
        {statsLoading ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-3/5 mx-auto">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={`stats-top-skeleton-${i}`}
                  className="bg-white rounded-3xl border p-4 shadow flex items-center gap-3 animate-pulse"
                >
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-6 bg-gray-100 rounded w-16" />
                    <div className="h-4 bg-gray-100 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`stats-bottom-skeleton-${i}`}
                  className="bg-white rounded-3xl border p-6 shadow flex items-center gap-3 animate-pulse"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-8 bg-gray-100 rounded w-16" />
                    <div className="h-4 bg-gray-100 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-3/5 mx-auto">
              <StatCard
                icon={Receipt}
                iconColor="text-blue-600"
                label="Tổng giao dịch"
                value={statTotal}
                valueSuffix="Giao dịch"
              />
              <StatCard
                icon={Banknote}
                iconColor="text-green-600"
                label="Tổng doanh thu"
                value={statRevenueNumber}
                valueSuffix="VNĐ"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <StatCard
                icon={CheckCircle}
                iconColor="text-green-600"
                label="Hoàn thành"
                value={statCompleted}
                valueSuffix="Giao dịch"
                bgTint="bg-green-500/30"
              />
              <StatCard
                icon={CircleDollarSign}
                iconColor="text-cyan-600"
                label="Thanh toán trước"
                value={statPrepaid}
                valueSuffix="Giao dịch"
                bgTint="bg-cyan-500/30"
              />
              <StatCard
                icon={ClockAlert}
                iconColor="text-purple-600"
                label="Thanh toán quá giờ"
                value={statOvertimePaid}
                valueSuffix="Giao dịch"
                bgTint="bg-purple-500/30"
              />
              <StatCard
                icon={Clock}
                iconColor="text-orange-600"
                label="Chờ thanh toán"
                value={statPending}
                valueSuffix="Giao dịch"
                bgTint="bg-amber-500/30"
              />
              <StatCard
                icon={XCircle}
                iconColor="text-red-600"
                label="Thất bại / Đã hủy"
                value={statFailedOrCancelled}
                valueSuffix="Giao dịch"
                bgTint="bg-red-500/30"
              />
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div
        lang="vi"
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
      >
        {/* Row 1: Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo biển số, tên người dùng, mã giao dịch..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageNumber(1);
            }}
            className="input pl-10 w-full text-sm"
          />
        </div>

        {/* Row 2: Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Trạng thái
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPageNumber(1);
              }}
              className="input text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Phương thức thanh toán
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPageNumber(1);
              }}
              className="input text-sm"
            >
              <option value="">Tất cả phương thức</option>
              <option value="points">Điểm</option>
              <option value="wallet">Ví điện tử</option>
              <option value="payos">PayOS</option>
              <option value="cash">Tiền mặt</option>
              <option value="bank_transfer">Chuyển khoản</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Hình thức
            </label>
            <select
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value);
                setPageNumber(1);
              }}
              className="input text-sm"
            >
              <option value="">Tất cả hình thức</option>
              <option value="parking-session">Phí gửi xe</option>
              <option value="monthly-pass">Vé tháng</option>
              <option value="wallet-deposit">Nạp ví</option>
              <option value="wallet-withdraw">Rút tiền</option>
            </select>
          </div>

          {/* <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Loại thanh toán
            </label>
            <select
              value={composition}
              onChange={(e) => {
                setComposition(e.target.value);
                setPageNumber(1);
              }}
              className="input text-sm"
            >
              <option value="">Tất cả loại</option>
              <option value="single">Đơn</option>
              <option value="mixed">Nhiều</option>
            </select>
          </div> */}

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
              {parkingLots.map((lot) => {
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
        </div>

        {/* Row 3: Date range + Reset */}
        <ConfigProvider locale={viVN}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500">
                Từ ngày
              </label>
              <DatePicker
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d);
                  setPageNumber(1);
                }}
                format="DD/MM/YY"
                placeholder="dd/mm/yy"
                className="w-full [&.ant-picker]:rounded-lg [&.ant-picker]:border-gray-300 [&.ant-picker]:text-sm [&.ant-picker]:h-9"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500">
                Đến ngày
              </label>
              <DatePicker
                value={toDate}
                onChange={(d) => {
                  setToDate(d);
                  setPageNumber(1);
                }}
                format="DD/MM/YY"
                placeholder="dd/mm/yy"
                className="w-full [&.ant-picker]:rounded-lg [&.ant-picker]:border-gray-300 [&.ant-picker]:text-sm [&.ant-picker]:h-9"
              />
            </div>
            <button
              onClick={handleReset}
              className="btn btn-secondary text-sm flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
          </div>
        </ConfigProvider>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-center">
                {[
                  "STT",
                  "Biển số",
                  "Người dùng",
                  "Hình thức",
                  "Thời gian tạo",
                  "Hoàn tất",
                  "Số tiền",
                  "Điểm",
                  "Phương thức",
                  "Trạng thái",
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
                    {Array.from({ length: 11 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className="h-3.5 bg-gray-100 rounded"
                          style={{ width: `${50 + ((j * 17) % 40)}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-300">
                      <XCircle className="w-12 h-12" />
                      <p className="text-gray-400 text-sm font-medium">
                        Không có dữ liệu giao dịch
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => {
                  const rowComponents = Array.isArray(tx?.components)
                    ? tx.components
                    : [];
                  const rowStatusSource = getLatestStatusSource(
                    tx,
                    rowComponents,
                  );
                  const targetId = getTargetIdValue(tx);
                  const targetTypeValue = getTargetTypeValue(tx);
                  const netCashAmount = getNetCashAmountWithFailed(
                    tx,
                    targetTypeValue,
                  );
                  const cashflowAmountMeta = getSignedAmountMeta(netCashAmount);
                  const txKey = `${targetTypeValue || "unknown"}-${targetId || idx}`;
                  const isLast = idx === transactions.length - 1;
                  return (
                    <tr
                      key={txKey}
                      className={`hover:bg-blue-50/40 transition-colors cursor-default ${!isLast ? "border-b border-gray-50" : ""}`}
                    >
                      {/* STT */}
                      <td className="p-3 text-center text-gray-500 font-semibold">
                        {(pageNumber - 1) * pageSize + idx + 1}
                      </td>
                      {/* Biển số */}
                      <td className="p-3 text-center font-semibold text-gray-900">
                        {getTargetDisplay(tx)}
                      </td>
                      {/* Người dùng */}
                      <td className="p-3 text-center text-gray-600 max-w-[140px] truncate">
                        {getUserDisplay(tx, userFullNameById)}
                      </td>
                      {/* Hình thức */}
                      <td className="p-3 text-center text-gray-500">
                        {formatTargetTypeLabel(targetTypeValue, "—")}
                      </td>
                      {/* Thời gian vào */}
                      <td className="p-3 text-center text-gray-500 whitespace-nowrap">
                        {formatCreatedDateTime(tx.createdAt)}
                      </td>
                      {/* Thời gian ra */}
                      <td className="p-3 text-center text-gray-500 whitespace-nowrap">
                        {formatCompletedDateTime(tx.completedAt)}
                      </td>
                      {/* Số tiền */}
                      <td className="p-3 text-center font-semibold text-gray-900">
                        <span className={cashflowAmountMeta.cls}>
                          {cashflowAmountMeta.text}
                        </span>
                      </td>
                      {/* Điểm */}
                      <td className="p-3 text-center font-medium text-blue-700 whitespace-nowrap">
                        {getPointsUsed(tx).toLocaleString("vi-VN")}
                      </td>
                      {/* Phương thức */}
                      <td className="p-3 text-center text-gray-600">
                        {formatPaymentMethods(tx.paymentMethods, tx)}
                      </td>
                      {/* Trạng thái */}
                      <td className="p-3 text-center">
                        <StatusBadge tx={rowStatusSource} />
                      </td>
                      {/* Action */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() =>
                            setDetailTarget({
                              targetType: targetTypeValue,
                              targetId,
                            })
                          }
                          className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Xem chi tiết"
                          disabled={!targetTypeValue || !targetId}
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

        {/* ── Pagination ── */}
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

      {/* Detail Modal */}
      {detailTarget?.targetType && detailTarget?.targetId && (
        <DetailModal
          targetType={detailTarget.targetType}
          targetId={detailTarget.targetId}
          userFullNameById={userFullNameById}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}
