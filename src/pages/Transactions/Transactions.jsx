import { useState, useEffect, useCallback } from "react";
import {
  Receipt,
  Eye,
  Search,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { DatePicker, ConfigProvider } from "antd";
import dayjs from "dayjs";
import viVN from "antd/es/locale/vi_VN";
import "dayjs/locale/vi";
import transactionService from "../../services/transactionService";
import parkingLotService from "../../services/parkingLotService";

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

const TX_TYPE_LABELS = {
  // Đỗ xe
  parking: "Đỗ xe",
  Parking: "Đỗ xe",
  PARKING: "Đỗ xe",
  // Vé tháng
  monthly_pass: "Vé tháng",
  MonthlyPass: "Vé tháng",
  MONTHLY_PASS: "Vé tháng",
  // Nạp tiền
  deposit: "Nạp tiền",
  Deposit: "Nạp tiền",
  DEPOSIT: "Nạp tiền",
  // Hoàn tiền
  refund: "Hoàn tiền",
  Refund: "Hoàn tiền",
  REFUND: "Hoàn tiền",
  // Rút tiền
  withdrawal: "Rút tiền",
  Withdrawal: "Rút tiền",
  WITHDRAWAL: "Rút tiền",
  // Thanh toán
  payment: "Thanh toán",
  Payment: "Thanh toán",
  PAYMENT: "Thanh toán",
  // Thưởng điểm
  reward: "Thưởng điểm",
  Reward: "Thưởng điểm",
  REWARD: "Thưởng điểm",
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/* Helpers */
function formatCurrency(amount) {
  if (amount == null || amount === "") return "-";
  return `${Number(amount).toLocaleString("vi-VN")} VNĐ`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Hiển thị phương thức thanh toán (API có thể trả mã tiếng Anh). */
function formatPaymentMethodLabel(method, empty = "—") {
  if (method == null || method === "") return empty;
  const s = String(method).trim();
  if (s.toLowerCase() === "wallet") return "Ví điện tử";
  if (s.toLowerCase() === "payos") return "PayOS";
  return s;
}

/** Chuyển ngày thành tham số API: YYYY-MM-DDTHH:mm */
function toApiDateParam(dateStr, endOfDay = false) {
  if (!dateStr) return "";
  const t = endOfDay ? "23:59" : "00:00";
  return `${dateStr}T${t}`;
}

function getStatusInfo(tx) {
  const raw =
    tx.paymentStatus ?? tx.status ?? tx.PaymentStatus ?? tx.Status ?? null;
  if (!raw) return null;
  return {
    raw,
    ...(PAYMENT_STATUS_MAP[raw] ?? {
      label: raw,
      cls: "bg-gray-100 text-gray-600 border border-gray-200",
    }),
  };
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

/* Detail Modal */
function DetailModal({ id, onClose, onStatusUpdate }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    transactionService
      .getById(id)
      .then((data) => {
        setDetail(data);
        const cur = data?.paymentStatus ?? data?.status ?? "";
        setNewStatus(cur);
      })
      .catch(() => toast.error("Không thể tải chi tiết giao dịch"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    const cur = detail?.paymentStatus ?? detail?.status ?? "";
    if (!newStatus || newStatus === cur) return;
    setSaving(true);
    try {
      await transactionService.updateStatus(id, newStatus);
      toast.success("Cập nhật trạng thái thành công");
      setDetail((p) => ({ ...p, paymentStatus: newStatus, status: newStatus }));
      onStatusUpdate?.();
    } catch {
      toast.error("Cập nhật trạng thái thất bại");
    } finally {
      setSaving(false);
    }
  };

  const rows = detail
    ? [
        [
          "Biển số xe",
          detail.licensePlate ??
            detail.vehicleLicensePlate ??
            detail.plate ??
            "-",
        ],
        [
          "Người dùng",
          detail.userName ??
            detail.customerName ??
            detail.fullName ??
            detail.userId ??
            "-",
        ],
        [
          "Bãi đỗ xe",
          detail.parkingLotName ?? detail.lotName ?? detail.lotId ?? "-",
        ],
        [
          "Loại giao dịch",
          TX_TYPE_LABELS[detail.transactionType ?? detail.type ?? ""] ??
            detail.transactionType ??
            detail.type ??
            "-",
        ],
        [
          "Thời gian vào",
          formatDateTime(
            detail.entryTime ?? detail.checkInTime ?? detail.createdAt,
          ),
        ],
        [
          "Thời gian ra",
          formatDateTime(detail.exitTime ?? detail.checkOutTime),
        ],
        ["Phương thức TT", formatPaymentMethodLabel(detail.paymentMethod, "-")],
        ["Số tiền", formatCurrency(detail.amount ?? detail.totalAmount)],
      ]
    : [];

  const curStatus = detail?.paymentStatus ?? detail?.status ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
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

        <div className="p-5 space-y-5">
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
                <StatusBadge tx={detail} />
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
                    {detail.note ?? detail.description}
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
  const [transactionType, setTransactionType] = useState("");
  const [lotId, setLotId] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [parkingLots, setParkingLots] = useState([]);

  // Pagination (client-side)
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailId, setDetailId] = useState(null);

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

  const totalCount = allTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const transactions = allTransactions.slice(
    (pageNumber - 1) * pageSize,
    pageNumber * pageSize,
  );

  /* Load transactions – lấy toàn bộ 1 lần, phân trang phía client */
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
      if (search) params.search = search;
      if (paymentStatus) params.paymentStatus = paymentStatus;
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (transactionType) params.transactionType = transactionType;
      if (lotId) params.lotId = lotId;
      if (fromDateParam) params.fromDate = fromDateParam;
      if (toDateParam) params.toDate = toDateParam;

      const data = await transactionService.getAll(params);

      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data?.items) {
        items = data.items;
      } else if (data?.data && Array.isArray(data.data)) {
        items = data.data;
      }

      // Client-side filter fallback nếu API chưa lọc server-side
      if (paymentStatus) {
        const needle = paymentStatus.toLowerCase();
        const filtered = items.filter(
          (tx) =>
            (tx.paymentStatus ?? tx.status ?? "").toLowerCase() === needle,
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

      setAllTransactions(items);
      setPageNumber(1); // reset về trang 1 khi filter thay đổi

      // Tính thống kê từ toàn bộ kết quả
      const totalRevenue = items.reduce(
        (s, tx) => s + Number(tx.amount ?? tx.totalAmount ?? 0),
        0,
      );
      const statusLower = (tx) =>
        (tx.paymentStatus ?? tx.status ?? "").toLowerCase();
      setStatistics({
        totalTransactions: items.length,
        totalRevenue,
        completedTransactions: items.filter(
          (tx) => statusLower(tx) === "completed",
        ).length,
        pendingTransactions: items.filter((tx) => statusLower(tx) === "pending")
          .length,
        failedOrCancelledTransactions: items.filter((tx) => {
          const s = statusLower(tx);
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
    transactionType,
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
    setTransactionType("");
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border p-6 shadow flex items-center gap-3 animate-pulse"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-8 bg-gray-100 rounded w-16" />
                <div className="h-4 bg-gray-100 rounded w-24" />
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard
              icon={Receipt}
              iconColor="text-blue-600"
              label="Tổng giao dịch"
              value={statTotal}
              valueSuffix="Giao dịch"
            />
            <StatCard
              icon={TrendingUp}
              iconColor="text-green-600"
              label="Tổng doanh thu"
              value={statRevenueNumber}
              valueSuffix="VNĐ"
            />
            <StatCard
              icon={CheckCircle}
              iconColor="text-green-600"
              label="Hoàn thành"
              value={statCompleted}
              valueSuffix="Giao dịch"
              bgTint="bg-green-500/30"
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
              <option value="Completed">Hoàn thành</option>
              <option value="pending">Chờ thanh toán</option>
              <option value="InProgress">Đang đỗ</option>
              <option value="Failed">Thất bại</option>
              <option value="Cancelled">Đã hủy</option>
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
              <option value="Momo">Momo</option>
              <option value="VNPay">VNPay</option>
              <option value="payos">PayOS</option>
              <option value="wallet">Ví điện tử</option>
              <option value="Cash">Tiền mặt</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Loại giao dịch
            </label>
            <select
              value={transactionType}
              onChange={(e) => {
                setTransactionType(e.target.value);
                setPageNumber(1);
              }}
              className="input text-sm"
            >
              <option value="">Tất cả loại GD</option>
              <option value="parking">Đỗ xe</option>
              <option value="monthly_pass">Vé tháng</option>
              <option value="deposit">Nạp tiền</option>
              <option value="refund">Hoàn tiền</option>
              <option value="withdrawal">Rút tiền</option>
              <option value="payment">Thanh toán</option>
              <option value="reward">Thưởng điểm</option>
            </select>
          </div>

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
                  "Loại GD",
                  "Thời gian vào",
                  "Thời gian ra",
                  "Số tiền",
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
                    {Array.from({ length: 10 }).map((__, j) => (
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
                  <td colSpan={10} className="py-20 text-center">
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
                  const txId = tx.id ?? tx.transactionId;
                  const isLast = idx === transactions.length - 1;
                  return (
                    <tr
                      key={txId ?? idx}
                      className={`hover:bg-blue-50/40 transition-colors cursor-default ${!isLast ? "border-b border-gray-50" : ""}`}
                    >
                      {/* STT */}
                      <td className="p-3 text-center text-gray-500 font-semibold">
                        {(pageNumber - 1) * pageSize + idx + 1}
                      </td>
                      {/* Biển số */}
                      <td className="p-3 text-center font-semibold text-gray-900">
                        {tx.licensePlate ??
                          tx.vehicleLicensePlate ??
                          tx.plate ??
                          "—"}
                      </td>
                      {/* Người dùng */}
                      <td className="p-3 text-center text-gray-600 max-w-[140px] truncate">
                        {tx.userName ?? tx.customerName ?? tx.fullName ?? "—"}
                      </td>
                      {/* Loại GD */}
                      <td className="p-3 text-center text-gray-500">
                        {TX_TYPE_LABELS[tx.transactionType ?? tx.type ?? ""] ??
                          tx.transactionType ??
                          tx.type ??
                          "—"}
                      </td>
                      {/* Thời gian vào */}
                      <td className="p-3 text-center text-gray-500 whitespace-nowrap">
                        {formatDateTime(
                          tx.entryTime ?? tx.checkInTime ?? tx.createdAt,
                        )}
                      </td>
                      {/* Thời gian ra */}
                      <td className="p-3 text-center text-gray-500 whitespace-nowrap">
                        {formatDateTime(tx.exitTime ?? tx.checkOutTime)}
                      </td>
                      {/* Số tiền */}
                      <td className="p-3 text-center font-semibold text-gray-900">
                        {formatCurrency(tx.amount ?? tx.totalAmount)}
                      </td>
                      {/* Phương thức */}
                      <td className="p-3 text-center text-gray-600">
                        {formatPaymentMethodLabel(tx.paymentMethod)}
                      </td>
                      {/* Trạng thái */}
                      <td className="p-3 text-center">
                        <StatusBadge tx={tx} />
                      </td>
                      {/* Action */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setDetailId(txId)}
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
      {detailId && (
        <DetailModal
          id={detailId}
          onClose={() => setDetailId(null)}
          onStatusUpdate={loadTransactions}
        />
      )}
    </div>
  );
}
