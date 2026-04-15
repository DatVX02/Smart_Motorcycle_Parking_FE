import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Clock3,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Check,
  Ban,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import withdrawRequestService from "../../services/withdrawRequestService";
import staffService from "../../services/staffService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const STATUS_META = {
  pending: {
    label: "Chờ duyệt",
    cls: "bg-amber-100 text-amber-700 border border-amber-200",
  },
  approved: {
    label: "Đã duyệt",
    cls: "bg-green-100 text-green-700 border border-green-200",
  },
  rejected: {
    label: "Từ chối",
    cls: "bg-rose-100 text-rose-700 border border-rose-200",
  },
};

const normalizeStatus = (status) =>
  String(status ?? "")
    .trim()
    .toLowerCase();

const normalizeRole = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const getStaffId = (staff) =>
  staff?.staffId ?? staff?.id ?? staff?.staffID ?? staff?.Id ?? null;

const getStaffName = (staff) =>
  staff?.fullName ?? staff?.name ?? staff?.staffName ?? staff?.email ?? "";

const formatCurrency = (amount) => {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "0 VNĐ";
  return `${value.toLocaleString("vi-VN")} VNĐ`;
};

const formatNumber = (amount) => {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("vi-VN");
};

const parseBackendDateToMs = (value) => {
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
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const ms = parseBackendDateToMs(value);
  if (!Number.isFinite(ms)) return String(value);
  const date = new Date(ms);

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

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

function WithdrawRequests() {
  const [items, setItems] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [adminStaffId, setAdminStaffId] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoadingMap, setActionLoadingMap] = useState({});
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await withdrawRequestService.getAll();
      setItems(extractItems(payload));
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không thể tải yêu cầu rút tiền.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const fetchStaffs = useCallback(async () => {
    try {
      const response = await staffService.getAllStaff();
      const list =
        response?.data?.data?.items ||
        response?.data?.items ||
        response?.items ||
        [];

      setStaffs(list);

      const admin = list.find(
        (staff) => normalizeRole(staff?.role) === "admin",
      );
      const resolvedAdminStaffId = getStaffId(admin);
      if (resolvedAdminStaffId) {
        setAdminStaffId(String(resolvedAdminStaffId));
      }
    } catch {
      // keep silent; table still works without reviewer mapping
    }
  }, []);

  useEffect(() => {
    fetchStaffs();
  }, [fetchStaffs]);

  const staffNameById = useMemo(() => {
    return staffs.reduce((acc, staff) => {
      const id = getStaffId(staff);
      const name = getStaffName(staff);
      if (id && name) acc[String(id)] = name;
      return acc;
    }, {});
  }, [staffs]);

  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const status = normalizeStatus(item.status);
      if (statusFilter && status !== statusFilter) return false;
      if (!q) return true;

      const raw = [
        item.userName,
        item.userEmail,
        item.bankName,
        item.bankAccountNumber,
        item.bankAccountHolder,
        item.requestId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return raw.includes(q);
    });
  }, [items, keyword, statusFilter]);

  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let totalAmount = 0;
    let pendingAmount = 0;

    for (const item of filteredItems) {
      const amount = Number(item.amount ?? 0);
      if (Number.isFinite(amount)) totalAmount += amount;

      const status = normalizeStatus(item.status);
      if (status === "pending") {
        pending += 1;
        if (Number.isFinite(amount)) pendingAmount += amount;
      }
      if (status === "approved") approved += 1;
      if (status === "rejected") rejected += 1;
    }

    return {
      total: filteredItems.length,
      pending,
      approved,
      rejected,
      totalAmount,
      pendingAmount,
    };
  }, [filteredItems]);

  const runStatusUpdate = useCallback(
    async (requestId, payload) => {
      setActionLoadingMap((prev) => ({ ...prev, [requestId]: true }));
      try {
        const finalPayload = adminStaffId
          ? { ...payload, reviewedBy: adminStaffId }
          : payload;
        await withdrawRequestService.updateStatus(requestId, finalPayload);
        toast.success("Cập nhật trạng thái thành công.");
        await fetchRequests();
        return true;
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Cập nhật trạng thái thất bại.",
        );
        return false;
      } finally {
        setActionLoadingMap((prev) => ({ ...prev, [requestId]: false }));
      }
    },
    [adminStaffId, fetchRequests],
  );

  const handleViewDetail = async (requestId) => {
    if (!requestId) return;

    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const detail = await withdrawRequestService.getById(requestId);
      setDetailData(detail?.item || detail?.data || detail);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không thể tải chi tiết yêu cầu.",
      );
      setDetailOpen(false);
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget?.requestId) return;
    const success = await runStatusUpdate(approveTarget.requestId, {
      status: "Approved",
    });
    if (success) setApproveTarget(null);
  };

  const handleReject = (row) => {
    setRejectTarget(row);
    setRejectReason(row?.rejectionReason || "");
  };

  const closeRejectDialog = () => {
    if (rejectSubmitting) return;
    setRejectTarget(null);
    setRejectReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget?.requestId) return;

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }

    setRejectSubmitting(true);
    const success = await runStatusUpdate(rejectTarget.requestId, {
      status: "Rejected",
      rejectionReason: trimmedReason,
    });
    setRejectSubmitting(false);

    if (success) {
      setRejectTarget(null);
      setRejectReason("");
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full xl:w-3/5 mx-auto">
          <StatCard
            icon={Wallet}
            iconColor="text-blue-600"
            label="Tổng yêu cầu"
            value={stats.total}
          />
          <StatCard
            icon={Wallet}
            iconColor="text-green-600"
            label="Tổng giá trị yêu cầu"
            value={formatNumber(stats.totalAmount)}
            valueSuffix="VNĐ"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={Clock3}
            iconColor="text-amber-600"
            label="Chờ duyệt"
            value={stats.pending}
            bgTint="bg-amber-500/30"
          />
          <StatCard
            icon={CheckCircle2}
            iconColor="text-green-600"
            label="Đã duyệt"
            value={stats.approved}
            bgTint="bg-green-500/30"
          />
          <StatCard
            icon={XCircle}
            iconColor="text-red-600"
            label="Từ chối"
            value={stats.rejected}
            bgTint="bg-red-500/30"
          />
          <StatCard
            icon={Wallet}
            iconColor="text-blue-700"
            label="Giá trị chờ duyệt"
            value={formatNumber(stats.pendingAmount)}
            valueSuffix="VNĐ"
            bgTint="bg-blue-500/30"
          />
        </div>
      </div>

      <div
        lang="vi"
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
      >
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            className="input pl-10 w-full text-sm"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên, email, ngân hàng, số tài khoản..."
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="text-xs font-medium text-gray-500">
              Trạng thái
            </label>
            <select
              className="input text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>

          <button
            onClick={fetchRequests}
            disabled={loading}
            className="btn btn-secondary text-sm flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-center">
                {[
                  "STT",
                  "Người dùng",
                  "Số tiền",
                  "Ngân hàng",
                  "Số tài khoản",
                  "Trạng thái",
                  "Thời gian yêu cầu",
                  "Người duyệt",
                  "Thời gian duyệt",
                  "Lý do",
                  "Thao tác",
                ].map((header) => (
                  <th
                    key={header}
                    className="p-3 text-center text-sm font-semibold whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-gray-50 animate-pulse"
                  >
                    {Array.from({ length: 10 }).map((__, colIndex) => (
                      <td key={colIndex} className="px-4 py-3.5">
                        <div
                          className="h-3.5 bg-gray-100 rounded"
                          style={{ width: `${50 + ((colIndex * 13) % 35)}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-300">
                      <XCircle className="w-12 h-12" />
                      <p className="text-gray-400 text-sm font-medium">
                        Không có yêu cầu rút tiền
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((row, index) => {
                  const rowStatus = normalizeStatus(row.status);
                  const statusMeta = STATUS_META[rowStatus] || {
                    label: row.status || "Không xác định",
                    cls: "bg-gray-100 text-gray-700 border border-gray-200",
                  };
                  const actionLoading = !!actionLoadingMap[row.requestId];
                  const canReview = rowStatus === "pending";
                  const reviewerDisplay =
                    row.reviewerName ||
                    staffNameById[String(row.reviewedBy)] ||
                    row.reviewedBy ||
                    "-";

                  return (
                    <tr
                      key={
                        row.requestId || `${row.userEmail || "user"}-${index}`
                      }
                      className="hover:bg-blue-50/40 transition-colors border-b border-gray-50"
                    >
                      <td className="p-3 text-center text-gray-500 font-semibold">
                        {index + 1}
                      </td>
                      <td className="p-3 text-center">
                        <div className="font-medium text-gray-900">
                          {row.userName || "-"}
                        </div>
                      </td>
                      <td className="p-3 text-center font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="text-sm text-gray-800">
                          {row.bankName || "-"}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="text-sm text-gray-800">
                          {row.bankAccountNumber || "-"}
                        </div>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusMeta.cls}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="p-3 text-center text-gray-500 whitespace-nowrap">
                        {formatDateTime(row.requestedAt)}
                      </td>
                      <td className="p-3 text-center">
                        <div>{reviewerDisplay}</div>
                      </td>
                      <td className="p-3 text-center text-gray-500 whitespace-nowrap">
                        {formatDateTime(row.reviewedAt)}
                      </td>
                      <td
                        className="p-3 text-center text-gray-600 max-w-[280px] whitespace-normal break-all align-top"
                        title={row.rejectionReason || ""}
                      >
                        {row.rejectionReason || "-"}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            onClick={() => handleViewDetail(row.requestId)}
                            className="btn btn-secondary px-2.5 py-1 text-xs flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {/* Chi tiết */}
                          </button>
                          <button
                            disabled={!canReview || actionLoading}
                            onClick={() => setApproveTarget(row)}
                            className="btn btn-success px-2.5 py-1 text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {/* Duyệt */}
                          </button>
                          <button
                            disabled={!canReview || actionLoading}
                            onClick={() => handleReject(row)}
                            className="btn btn-danger px-2.5 py-1 text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            {/* Từ chối */}
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
      </div>

      <ConfirmDialog
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        title="Duyệt yêu cầu rút tiền"
        description={`Bạn có chắc muốn duyệt yêu cầu của khách hàng "${approveTarget?.userName || ""}"?`}
        confirmLabel="Xác nhận duyệt"
        cancelLabel="Hủy"
        variant="warning"
      />

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && closeRejectDialog()}
      >
        <DialogContent
          className="w-[92vw] max-w-xl"
          onClose={closeRejectDialog}
        >
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu rút tiền</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <p className="text-sm text-gray-600">
              Vui lòng nhập lý do từ chối cho yêu cầu này.
            </p>
            <textarea
              className="input min-h-28 resize-y"
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeRejectDialog}
                className="btn btn-secondary"
                disabled={rejectSubmitting}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="btn btn-danger"
                disabled={rejectSubmitting || !rejectReason.trim()}
              >
                {rejectSubmitting ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto"
          onClose={() => setDetailOpen(false)}
        >
          <DialogHeader className="border-b border-gray-100 pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
              <span className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <Wallet className="w-4 h-4 text-blue-600" />
              </span>
              Chi tiết yêu cầu rút tiền
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-10 text-center text-gray-500">
              Đang tải chi tiết...
            </div>
          ) : detailData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-gray-500">Trạng thái</p>
                <p className="font-medium">
                  {detailData.status === "Pending"
                    ? "Đang chờ"
                    : detailData.status === "Approved"
                      ? "Đã duyệt"
                      : detailData.status === "Rejected"
                        ? "Đã từ chối"
                        : ""}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Người dùng</p>
                <p className="font-medium">{detailData.userName || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium break-all">
                  {detailData.userEmail || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Số tiền</p>
                <p className="font-medium">
                  {formatCurrency(detailData.amount)}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Ngân hàng</p>
                <p className="font-medium">{detailData.bankName || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500">Số tài khoản</p>
                <p className="font-medium">
                  {detailData.bankAccountNumber || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Chủ tài khoản</p>
                <p className="font-medium">
                  {detailData.bankAccountHolder || "-"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Thời gian yêu cầu</p>
                <p className="font-medium">
                  {formatDateTime(detailData.requestedAt)}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Người duyệt</p>
                <p className="font-medium">
                  {detailData.reviewerName ||
                    staffNameById[String(detailData.reviewedBy)] ||
                    detailData.reviewedBy ||
                    "-"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Thời gian duyệt</p>
                <p className="font-medium">
                  {formatDateTime(detailData.reviewedAt)}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-gray-500">Lý do từ chối</p>
                <p className="font-medium whitespace-pre-wrap break-words">
                  {detailData.rejectionReason || "-"}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-gray-500">
              Không có dữ liệu chi tiết.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WithdrawRequests;
