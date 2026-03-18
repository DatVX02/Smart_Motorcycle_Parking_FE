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
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import transactionService from "../../services/transactionService";

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

/* ─────────────────── Helpers ─────────────────── */
function formatCurrency(amount) {
  if (amount == null || amount === "") return "-";
  return `${Number(amount).toLocaleString("vi-VN")} đ`;
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
          "Mã giao dịch",
          detail.transactionCode ?? detail.code ?? detail.id ?? id,
        ],
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
        ["Loại giao dịch", detail.transactionType ?? detail.type ?? "-"],
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
        ["Phương thức TT", detail.paymentMethod ?? "-"],
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Chi tiết giao dịch
              </h2>
              <p className="text-xs text-gray-400 font-mono truncate max-w-[200px]">
                #{id}
              </p>
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
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {rows.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                      {label}
                    </p>
                    <p className="text-sm font-medium text-gray-900 break-all">
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

              {/* Update status */}
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
              </div>

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
function StatCard({ icon: Icon, bg, iconColor, label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}
      >
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

/* Main Page */
export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [detailId, setDetailId] = useState(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  /* Load transactions */
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setStatsLoading(true);
    try {
      const params = { pageNumber, pageSize };
      if (search) params.search = search;
      if (paymentStatus) params.paymentStatus = paymentStatus;
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (transactionType) params.transactionType = transactionType;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const data = await transactionService.getAll(params);

      let items = [];
      let count = 0;

      if (Array.isArray(data)) {
        items = data;
        count = data.length;
      } else if (data?.items) {
        items = data.items;
        count = data.totalCount ?? data.total ?? data.items.length;
      } else if (data?.data && Array.isArray(data.data)) {
        items = data.data;
        count = data.totalCount ?? data.total ?? data.data.length;
      }

      // Client-side status filter as fallback (in case API filter doesn't apply server-side)
      if (paymentStatus && items.length > 0) {
        const needle = paymentStatus.toLowerCase();
        const filtered = items.filter((tx) => {
          const s = (tx.paymentStatus ?? tx.status ?? "").toLowerCase();
          return s === needle;
        });
        // Only apply client filter if it changed the result (API filter might have worked already)
        if (filtered.length !== items.length) {
          items = filtered;
          count = filtered.length;
        }
      }

      setTransactions(items);
      setTotalCount(count);

      // Compute statistics from loaded data (avoids separate /statistics call which may be 403)
      const allRevenue = items.reduce(
        (s, tx) => s + Number(tx.amount ?? tx.totalAmount ?? 0),
        0,
      );
      const completedItems = items.filter((tx) => {
        const s = (tx.paymentStatus ?? tx.status ?? "").toLowerCase();
        return s === "completed";
      });
      const pendingItems = items.filter((tx) => {
        const s = (tx.paymentStatus ?? tx.status ?? "").toLowerCase();
        return s === "pending";
      });
      setStatistics({
        totalTransactions: count,
        totalRevenue: allRevenue,
        completedTransactions: completedItems.length,
        pendingTransactions: pendingItems.length,
      });
    } catch {
      toast.error("Không thể tải danh sách giao dịch");
      setTransactions([]);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [
    pageNumber,
    pageSize,
    search,
    paymentStatus,
    paymentMethod,
    transactionType,
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
    setFromDate("");
    setToDate("");
    setPageNumber(1);
    // Reset statistics
    setStatistics(null);
  };

  /* Stat values */
  const statTotal = totalCount;
  const statRevenue = formatCurrency(statistics?.totalRevenue ?? 0);
  const statCompleted = statistics?.completedTransactions ?? 0;
  const statPending = statistics?.pendingTransactions ?? 0;

  /* Pagination numbers */
  const pageNums = (() => {
    const start = Math.max(1, Math.min(pageNumber - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  })();

  return (
    <div className="space-y-5">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 animate-pulse"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-100 rounded w-14" />
                <div className="h-3.5 bg-gray-100 rounded w-24" />
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard
              icon={Receipt}
              bg="bg-blue-50"
              iconColor="text-blue-600"
              label="Tổng giao dịch"
              value={statTotal}
            />
            <StatCard
              icon={TrendingUp}
              bg="bg-green-50"
              iconColor="text-green-600"
              label="Tổng doanh thu"
              value={statRevenue}
            />
            <StatCard
              icon={CheckCircle}
              bg="bg-purple-50"
              iconColor="text-purple-600"
              label="Hoàn thành"
              value={statCompleted}
            />
            <StatCard
              icon={Clock}
              bg="bg-orange-50"
              iconColor="text-orange-600"
              label="Chờ thanh toán"
              value={statPending}
            />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        {/* Row 1: search + dropdowns */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm biển số, tên, mã giao dịch..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageNumber(1);
              }}
              className="input pl-10 w-full text-sm"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPageNumber(1);
              }}
              className="input text-sm min-w-[150px]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Completed">Hoàn thành</option>
              <option value="pending">Chờ thanh toán</option>
              <option value="InProgress">Đang đỗ</option>
              <option value="Failed">Thất bại</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>

          <select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPageNumber(1);
            }}
            className="input text-sm min-w-[150px] shrink-0"
          >
            <option value="">Tất cả phương thức</option>
            <option value="Momo">Momo</option>
            <option value="VNPay">VNPay</option>
            <option value="payos">PayOS</option>
            <option value="Wallet">Ví điện tử</option>
            <option value="Cash">Tiền mặt</option>
          </select>

          <select
            value={transactionType}
            onChange={(e) => {
              setTransactionType(e.target.value);
              setPageNumber(1);
            }}
            className="input text-sm min-w-[150px] shrink-0"
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

        {/* Row 2: date range + actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">
              Từ ngày
            </label>
            <input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">
              Đến ngày
            </label>
            <input
              type="datetime-local"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input text-sm"
            />
          </div>
          <button onClick={handleReset} className="btn btn-secondary text-sm">
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">
            Danh sách giao dịch
            {!loading && totalCount > 0 && (
              <span className="ml-2 text-gray-400 font-normal">
                ({totalCount})
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageNumber(1);
              }}
              className="input py-1 px-2 text-sm w-auto"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span>dòng</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
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
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
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
                      <td className="px-4 py-3.5 w-12 text-center">
                        <span className="text-sm font-semibold text-gray-500">
                          {(pageNumber - 1) * pageSize + idx + 1}
                        </span>
                      </td>
                      {/* Biển số */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-gray-900">
                          {tx.licensePlate ??
                            tx.vehicleLicensePlate ??
                            tx.plate ??
                            "—"}
                        </span>
                      </td>
                      {/* Người dùng */}
                      <td className="px-4 py-3.5 text-gray-600 max-w-[140px] truncate">
                        {tx.userName ?? tx.customerName ?? tx.fullName ?? "—"}
                      </td>
                      {/* Loại GD */}
                      <td className="px-4 py-3.5 text-gray-500">
                        {TX_TYPE_LABELS[tx.transactionType ?? tx.type ?? ""] ??
                          tx.transactionType ??
                          tx.type ??
                          "—"}
                      </td>
                      {/* Thời gian vào */}
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                        {formatDateTime(
                          tx.entryTime ?? tx.checkInTime ?? tx.createdAt,
                        )}
                      </td>
                      {/* Thời gian ra */}
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                        {formatDateTime(tx.exitTime ?? tx.checkOutTime)}
                      </td>
                      {/* Số tiền */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(tx.amount ?? tx.totalAmount)}
                        </span>
                      </td>
                      {/* Phương thức */}
                      <td className="px-4 py-3.5 text-gray-600">
                        {tx.paymentMethod ?? "—"}
                      </td>
                      {/* Trạng thái */}
                      <td className="px-4 py-3.5">
                        <StatusBadge tx={tx} />
                      </td>
                      {/* Action */}
                      <td className="px-4 py-3.5">
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
            <p className="text-xs text-gray-500">
              Trang{" "}
              <span className="font-semibold text-gray-700">{pageNumber}</span>{" "}
              / {totalPages} &nbsp;·&nbsp; {totalCount} giao dịch
            </p>
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
