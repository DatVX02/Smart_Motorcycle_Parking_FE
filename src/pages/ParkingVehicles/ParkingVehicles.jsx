import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Ticket,
  UserRound,
  Motorbike,
} from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import vehicleService from "../../services/vehicleService";
import userService from "../../services/userService";
import { API_BASE_URL } from "../../config/api";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

dayjs.locale("vi");

function plateOf(vehicle) {
  return vehicle?.licensePlate ?? "—";
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function userDisplay(vehicle, userFullNameById = {}) {
  const directName = pickFirst(
    vehicle?.fullName,
    vehicle?.userFullName,
    vehicle?.userName,
    vehicle?.name,
    vehicle?.customerName,
  );
  if (directName) return String(directName);

  const userId = pickFirst(
    vehicle?.userId,
    vehicle?.accountId,
    vehicle?.idUser,
  );
  if (userId && userFullNameById[String(userId)]) {
    return userFullNameById[String(userId)];
  }

  return "Vãng lai";
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = dayjs(value);
  if (!d.isValid()) return "—";
  return d.format("HH:mm:ss DD/MM/YYYY");
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function resolveImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  const normalized = url.trim();
  if (!normalized) return "";
  if (/^(https?:|data:image|blob:)/i.test(normalized)) {
    return encodeURI(normalized);
  }
  const joined = `${API_BASE_URL}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
  return encodeURI(joined);
}

function statusBadgeClass(isActive) {
  return isActive
    ? "inline-flex min-w-[120px] justify-center rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
    : "inline-flex min-w-[120px] justify-center rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700";
}

function monthlyPassBadgeClass(isMonthlyPassVehicle) {
  return isMonthlyPassVehicle
    ? "inline-flex min-w-[100px] justify-center rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
    : "inline-flex min-w-[100px] justify-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700";
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

export default function ParkingVehicles() {
  const [allVehicles, setAllVehicles] = useState([]);
  const [userFullNameById, setUserFullNameById] = useState({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [monthlyFilter, setMonthlyFilter] = useState("");
  const [userIdInput, setUserIdInput] = useState("");
  const [apiUserId, setApiUserId] = useState("");

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [detailVehicle, setDetailVehicle] = useState(null);

  const loadVehicles = useCallback(
    async (overrideUserId) => {
      setLoading(true);
      setStatsLoading(true);
      try {
        const userIdQuery =
          typeof overrideUserId === "string"
            ? overrideUserId.trim()
            : apiUserId.trim();

        const params = {};
        if (userIdQuery) params.userId = userIdQuery;

        const data = await vehicleService.getAll(params);
        setAllVehicles(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        toast.error("Không thể tải danh sách phương tiện");
        setAllVehicles([]);
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    },
    [apiUserId],
  );

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

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

  const filteredVehicles = useMemo(() => {
    let list = [...allVehicles];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((vehicle) => {
        const plate = String(plateOf(vehicle)).toLowerCase();
        const userId = String(vehicle.userId ?? "").toLowerCase();
        const userName = userDisplay(vehicle, userFullNameById).toLowerCase();
        const vehicleId = String(vehicle.vehicleId ?? "").toLowerCase();
        const color = String(vehicle.color ?? "").toLowerCase();

        return (
          plate.includes(q) ||
          userId.includes(q) ||
          userName.includes(q) ||
          vehicleId.includes(q) ||
          color.includes(q)
        );
      });
    }

    if (statusFilter) {
      const want = statusFilter === "active";
      list = list.filter((vehicle) => Boolean(vehicle.isActive) === want);
    }

    if (monthlyFilter) {
      const want = monthlyFilter === "monthly";
      list = list.filter(
        (vehicle) => Boolean(vehicle.isMonthlyPassVehicle) === want,
      );
    }

    if (userIdInput.trim()) {
      const q = userIdInput.trim().toLowerCase();
      list = list.filter((vehicle) =>
        String(vehicle.userId ?? "")
          .toLowerCase()
          .includes(q),
      );
    }

    return list;
  }, [
    allVehicles,
    search,
    statusFilter,
    monthlyFilter,
    userIdInput,
    userFullNameById,
  ]);

  const statistics = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let monthly = 0;
    let linkedUser = 0;
    let guest = 0;

    for (const vehicle of filteredVehicles) {
      if (vehicle.isActive) active += 1;
      else inactive += 1;

      if (vehicle.isMonthlyPassVehicle) monthly += 1;

      if (vehicle.userId) linkedUser += 1;
      else guest += 1;
    }

    return {
      total: filteredVehicles.length,
      active,
      inactive,
      monthly,
      linkedUser,
      guest,
    };
  }, [filteredVehicles]);

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const pageRows = filteredVehicles.slice(
    (pageNumber - 1) * pageSize,
    pageNumber * pageSize,
  );

  const pageNums = useMemo(() => {
    const start = Math.max(1, Math.min(pageNumber - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [pageNumber, totalPages]);

  const handleReset = () => {
    setSearch("");
    setStatusFilter("");
    setMonthlyFilter("");
    setUserIdInput("");
    setApiUserId("");
    setPageNumber(1);
    loadVehicles("");
  };

  const handleReload = () => {
    const nextUserId = userIdInput.trim();
    setApiUserId(nextUserId);
    setPageNumber(1);
    loadVehicles(nextUserId);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {statsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
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
              icon={Motorbike}
              iconColor="text-blue-600"
              label="Tổng phương tiện"
              value={statistics.total}
              valueSuffix="Xe"
            />
            <StatCard
              icon={CheckCircle2}
              iconColor="text-blue-700"
              label="Đang hoạt động"
              value={statistics.active}
              valueSuffix="Xe"
              bgTint="bg-blue-500/30"
            />
            <StatCard
              icon={XCircle}
              iconColor="text-red-700"
              label="Ngừng hoạt động"
              value={statistics.inactive}
              valueSuffix="Xe"
              bgTint="bg-red-500/30"
            />
            <StatCard
              icon={Ticket}
              iconColor="text-green-700"
              label="Xe vé tháng"
              value={statistics.monthly}
              valueSuffix="Xe"
              bgTint="bg-green-500/30"
            />
            <StatCard
              icon={UserRound}
              iconColor="text-cyan-700"
              label="Khách hàng"
              value={statistics.linkedUser}
              valueSuffix="Xe"
              bgTint="bg-cyan-500/30"
            />
            <StatCard
              icon={UserRound}
              iconColor="text-amber-700"
              label="Khách vãng lai"
              value={statistics.guest}
              valueSuffix="Xe"
              bgTint="bg-amber-500/30"
            />
          </>
        )}
      </div>

      <div
        lang="vi"
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
      >
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo biển số, userId, mã phương tiện, màu xe..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageNumber(1);
            }}
            className="input pl-10 w-full text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPageNumber(1);
              }}
              className="input text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Loại xe</label>
            <select
              value={monthlyFilter}
              onChange={(e) => {
                setMonthlyFilter(e.target.value);
                setPageNumber(1);
              }}
              className="input text-sm"
            >
              <option value="">Tất cả</option>
              <option value="monthly">Xe vé tháng</option>
              <option value="normal">Xe thường</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Người dùng
            </label>
            <input
              type="text"
              value={userIdInput}
              onChange={(e) => {
                setUserIdInput(e.target.value);
                setPageNumber(1);
              }}
              placeholder="Nhập tên để tìm kiếm"
              className="input text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary text-sm flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleReload}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
              />
              Tải lại
            </Button>
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
                  "Biển số",
                  "Người dùng",
                  "Màu xe",
                  "Vé tháng",
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
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div
                          className="h-3.5 bg-gray-100 rounded mx-auto"
                          style={{ width: `${50 + ((j * 13) % 40)}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-300">
                      <XCircle className="w-12 h-12" />
                      <p className="text-gray-400 text-sm font-medium">
                        Không có phương tiện
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((vehicle, idx) => {
                  return (
                    <tr
                      key={vehicle.vehicleId ?? idx}
                      className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="p-3 text-center text-gray-500 font-semibold">
                        {(pageNumber - 1) * pageSize + idx + 1}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-gray-900 max-w-[180px] break-words">
                        {plateOf(vehicle)}
                      </td>
                      <td className="p-3 text-center text-gray-600 max-w-[240px] break-words">
                        {userDisplay(vehicle, userFullNameById)}
                      </td>
                      <td className="p-3 text-center text-gray-600 max-w-[140px] break-words">
                        {formatValue(vehicle.color)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={monthlyPassBadgeClass(
                            vehicle.isMonthlyPassVehicle,
                          )}
                        >
                          {vehicle.isMonthlyPassVehicle
                            ? "Xe vé tháng"
                            : "Xe thường"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={statusBadgeClass(vehicle.isActive)}>
                          {vehicle.isActive
                            ? "Đang hoạt động"
                            : "Ngừng hoạt động"}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          aria-label="Xem chi tiết phương tiện"
                          title="Xem chi tiết phương tiện"
                          onClick={() => setDetailVehicle(vehicle)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredVehicles.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="text-sm text-gray-600">
              Trang {pageNumber} / {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Trang trước"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-30"
              >
                <span className="sr-only">Trước</span>‹
              </button>
              {pageNums.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPageNumber(p)}
                  className={`min-w-[1.75rem] h-7 px-1 rounded-lg text-xs font-semibold ${
                    p === pageNumber
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                aria-label="Trang sau"
                disabled={pageNumber >= totalPages}
                onClick={() =>
                  setPageNumber((p) => Math.min(totalPages, p + 1))
                }
                className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-30"
              >
                <span className="sr-only">Sau</span>›
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(detailVehicle)}
        onOpenChange={(open) => {
          if (!open) setDetailVehicle(null);
        }}
      >
        <DialogContent
          className="w-[92vw] max-w-5xl rounded-2xl px-0 py-0 overflow-hidden"
          onClose={() => setDetailVehicle(null)}
        >
          <DialogHeader className="border-b border-gray-100 px-5 py-4">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
              <span className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <Motorbike className="w-4 h-4 text-blue-600" />
              </span>
              Chi tiết phương tiện
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 pb-5 pt-4 space-y-4">
            {!detailVehicle ? (
              <div className="py-10 text-center text-gray-500">
                Không có dữ liệu
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    ["Mã phương tiện", detailVehicle.vehicleId],
                    ["Biển số", plateOf(detailVehicle)],
                    [
                      "Người dùng",
                      userDisplay(detailVehicle, userFullNameById),
                    ],
                    ["Màu xe", formatValue(detailVehicle.color)],
                    [
                      "Loại phương tiện",
                      detailVehicle.isMonthlyPassVehicle
                        ? "Xe vé tháng"
                        : "Xe thường",
                    ],
                    [
                      "Trạng thái",
                      detailVehicle.isActive
                        ? "Đang hoạt động"
                        : "Ngừng hoạt động",
                    ],
                    ["Tạo lúc", formatDateTime(detailVehicle.createdAt)],
                    ["Cập nhật", formatDateTime(detailVehicle.updatedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                        {label}
                      </p>
                      <p className="text-sm font-medium text-gray-900 break-all">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Ảnh biển số
                  </p>
                  {detailVehicle.plateImageUrl ? (
                    <img
                      src={resolveImageUrl(detailVehicle.plateImageUrl)}
                      alt={plateOf(detailVehicle)}
                      className="max-h-56 w-auto rounded-lg border border-gray-200 object-contain"
                    />
                  ) : (
                    <p className="text-sm text-gray-400">
                      Không có ảnh biển số
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
