import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  RefreshCw,
  Search,
  Ticket,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import monthlyPassService from "../../services/monthlyPassService";
import parkingLotService from "../../services/parkingLotService";
import userService from "../../services/userService";
import apiClient, { API_BASE_URL } from "../../config/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0 VNĐ";
  return `${num.toLocaleString("vi-VN")} VNĐ`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPaymentMethodLabel(method) {
  const raw = String(method ?? "")
    .trim()
    .toLowerCase();

  if (!raw) return "—";

  const map = {
    wallet: "Ví điện tử",
    points: "Điểm",
    payos: "PayOS",
    cash: "Tiền mặt",
    bank_transfer: "Chuyển khoản",
    "bank-transfer": "Chuyển khoản",
    banktransfer: "Chuyển khoản",
  };

  return map[raw] ?? String(method);
}

function normalizeStatus(value) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return "active";
  if (["active", "valid", "activated", "inuse", "in_use"].includes(raw)) {
    return "active";
  }
  if (["expired", "inactive", "ended", "done"].includes(raw)) {
    return "expired";
  }
  return "active";
}

function resolveStatusByDate(rawStatus, endDate) {
  const end = endDate ? new Date(endDate) : null;
  if (end && !Number.isNaN(end.getTime())) {
    return Date.now() > end.getTime() ? "expired" : "active";
  }

  return normalizeStatus(rawStatus) === "expired" ? "expired" : "active";
}

function statusStyle(status) {
  if (status === "active") {
    return {
      label: "Đang hoạt động",
      className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    };
  }
  if (status === "expired") {
    return {
      label: "Hết hạn",
      className: "bg-amber-100 text-amber-700 border border-amber-200",
    };
  }
  return {
    label: "Đang hoạt động",
    className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  };
}

function normalizePass(pass) {
  const endDate = pass?.endDate ?? pass?.validTo ?? null;
  return {
    passId: pass?.passId ?? pass?.id ?? pass?.monthlyPassId ?? "",
    userId: pass?.userId ?? "",
    userEmail: pass?.userEmail ?? pass?.email ?? "",
    fullName: pass?.fullName ?? pass?.userFullName ?? pass?.name ?? "",
    userName: pass?.userName ?? pass?.fullName ?? "",
    vehicleId: pass?.vehicleId ?? "",
    vehiclePlate: pass?.vehiclePlate ?? pass?.licensePlate ?? "",
    vehicleColor: pass?.color ?? pass?.vehicleColor ?? pass?.carColor ?? "",
    lotId: pass?.lotId ?? "",
    lotName: pass?.lotName ?? pass?.parkingLotName ?? "",
    packageId: pass?.packageId ?? "",
    packageName: pass?.packageName ?? pass?.monthlyPassPackageName ?? "",
    startDate: pass?.startDate ?? pass?.validFrom ?? pass?.createdAt ?? null,
    endDate,
    originalPrice: pass?.originalPrice ?? pass?.price ?? 0,
    paidAmount: pass?.paidAmount ?? pass?.amount ?? 0,
    paymentMethod: pass?.paymentMethod ?? "",
    statusRaw: pass?.status ?? "",
    statusKey: resolveStatusByDate(pass?.status, endDate),
    createdAt: pass?.createdAt ?? null,
  };
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function firstImageValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function resolveImageUrl(url) {
  if (!url) return "";
  if (/^(https?:|data:image|blob:)/i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function matchesVehicle(vehicle, vehicleId, vehiclePlate) {
  const targetId = String(vehicleId ?? "")
    .trim()
    .toLowerCase();
  const targetPlate = String(vehiclePlate ?? "")
    .trim()
    .toLowerCase();
  const candidateIds = [vehicle?.id, vehicle?.vehicleId, vehicle?.uuid]
    .map((value) =>
      String(value ?? "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);
  const candidatePlates = [
    vehicle?.licensePlate,
    vehicle?.vehiclePlate,
    vehicle?.plateNumber,
    vehicle?.plate,
  ]
    .map((value) =>
      String(value ?? "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);

  return (
    (targetId && candidateIds.includes(targetId)) ||
    (targetPlate && candidatePlates.includes(targetPlate))
  );
}

function findVehicleFromResponse(raw, vehicleId, vehiclePlate) {
  const items = extractItems(raw);
  if (items.length > 0) {
    return (
      items.find((item) => matchesVehicle(item, vehicleId, vehiclePlate)) ||
      null
    );
  }

  if (raw && typeof raw === "object") {
    return matchesVehicle(raw, vehicleId, vehiclePlate) ? raw : null;
  }

  return null;
}

async function getVehicleFromVehiclesApi(vehicleId, vehiclePlate) {
  const requestConfigs = [
    { params: { pageSize: 200, vehicleId } },
    { params: { pageSize: 200, id: vehicleId } },
    { params: { pageSize: 200, keyword: vehiclePlate } },
    { params: { pageSize: 200 } },
  ];

  for (const config of requestConfigs) {
    try {
      const response = await apiClient.get("/api/v1/vehicles", config);
      const raw = response?.data?.data ?? response?.data;
      const matched = findVehicleFromResponse(raw, vehicleId, vehiclePlate);
      if (matched) return matched;
    } catch {
      // continue next request shape
    }
  }

  return null;
}

function UserMonthlyPasses() {
  const [loading, setLoading] = useState(true);
  const [parkingLots, setParkingLots] = useState([]);
  const [passes, setPasses] = useState([]);
  const [userFullNameById, setUserFullNameById] = useState({});
  const [search, setSearch] = useState("");
  const [lotFilter, setLotFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [detailPass, setDetailPass] = useState(null);
  const [vehicleMedia, setVehicleMedia] = useState({
    loading: false,
    plateUrl: "",
    color: "",
  });

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      try {
        const response = await userService.getAllUser();
        const payload = response?.data?.data ?? response?.data ?? response;
        const users = extractItems(payload);
        const lookup = {};

        users.forEach((user) => {
          const id = user?.userId ?? user?.id ?? user?.accountId;
          const fullName = user?.fullName ?? user?.name ?? user?.displayName;
          if (id && fullName) {
            lookup[String(id)] = String(fullName);
          }
        });

        if (!cancelled) setUserFullNameById(lookup);
      } catch {
        if (!cancelled) setUserFullNameById({});
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lots, list] = await Promise.all([
        parkingLotService.getAllParkingLots().catch(() => []),
        monthlyPassService.getAllPasses({
          ...(lotFilter ? { lotId: lotFilter } : {}),
        }),
      ]);

      setParkingLots(Array.isArray(lots) ? lots : []);
      setPasses(Array.isArray(list) ? list.map(normalizePass) : []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ??
          "Không thể tải danh sách vé tháng người dùng",
      );
      setPasses([]);
      setParkingLots([]);
    } finally {
      setLoading(false);
    }
  }, [lotFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPageNumber(1);
  }, [search, statusFilter, lotFilter]);

  const filteredPasses = useMemo(() => {
    let list = [...passes];

    if (statusFilter) {
      list = list.filter((item) => item.statusKey === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((item) => {
        const values = [
          item.passId,
          item.userEmail,
          item.fullName,
          item.userName,
          item.vehiclePlate,
          item.lotName,
          item.packageName,
          item.paymentMethod,
          formatPaymentMethodLabel(item.paymentMethod),
        ];
        return values.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(q),
        );
      });
    }

    return list;
  }, [passes, search, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredPasses.length;
    const active = filteredPasses.filter(
      (item) => item.statusKey === "active",
    ).length;
    const expired = filteredPasses.filter(
      (item) => item.statusKey === "expired",
    ).length;
    return { total, active, expired };
  }, [filteredPasses]);

  const totalPages = Math.max(1, Math.ceil(filteredPasses.length / pageSize));
  const rows = filteredPasses.slice(
    (pageNumber - 1) * pageSize,
    pageNumber * pageSize,
  );

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(pageNumber - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [pageNumber, totalPages]);

  useEffect(() => {
    let cancelled = false;

    const setMediaFromSources = (vehicleData, passData) => {
      const plateRaw =
        firstImageValue(vehicleData, [
          "licensePlateImageUrl",
          "vehiclePlateImageUrl",
          "plateImageUrl",
          "licensePlateImage",
          "vehiclePlateImage",
          "plateImage",
        ]) ||
        firstImageValue(passData, [
          "licensePlateImageUrl",
          "vehiclePlateImageUrl",
          "plateImageUrl",
          "licensePlateImage",
          "vehiclePlateImage",
          "plateImage",
        ]);

      const colorRaw =
        firstImageValue(vehicleData, ["color", "vehicleColor", "carColor"]) ||
        firstImageValue(passData, ["color", "vehicleColor", "carColor"]);

      setVehicleMedia({
        loading: false,
        plateUrl: resolveImageUrl(plateRaw),
        color: colorRaw,
      });
    };

    const loadVehicleMedia = async () => {
      if (!detailPass) {
        setVehicleMedia({ loading: false, plateUrl: "", color: "" });
        return;
      }

      setVehicleMedia((prev) => ({ ...prev, loading: true }));

      const vehicleId = detailPass.vehicleId;
      const vehiclePlate = detailPass.vehiclePlate;
      if (!vehicleId && !vehiclePlate) {
        setMediaFromSources(null, detailPass);
        return;
      }

      const vehicleData = await getVehicleFromVehiclesApi(
        vehicleId,
        vehiclePlate,
      );
      if (!cancelled) {
        setMediaFromSources(vehicleData, detailPass);
      }
    };

    loadVehicleMedia();

    return () => {
      cancelled = true;
    };
  }, [detailPass]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-3xl p-6 shadow border bg-white">
          <div className="flex items-start gap-3">
            <Ticket className="w-8 h-8 flex-shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Tổng vé tháng
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {stats.total}
                <span className="text-base font-medium text-gray-600">Vé</span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl p-6 shadow border bg-green-500/30">
          <div className="flex items-start gap-3">
            <UserRound className="w-8 h-8 flex-shrink-0 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Vé đang hoạt động
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {stats.active}
                <span className="text-base font-medium text-gray-600">Vé</span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl p-6 shadow border bg-rose-500/30">
          <div className="flex items-start gap-3">
            <MapPin className="w-8 h-8 flex-shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Đã hết hạn
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {stats.expired}
                <span className="text-base font-medium text-gray-600">Vé</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow p-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <label className="text-sm font-medium text-gray-600 mb-2 block">
              Tìm kiếm
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Email, biển số, mã vé, tên gói..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block">
              Bãi xe
            </label>
            <select
              value={lotFilter}
              onChange={(e) => setLotFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tất cả bãi xe</option>
              {parkingLots.map((lot) => {
                const lotId = lot.id ?? lot.lotId;
                const lotName = lot.name ?? lot.lotName ?? "Bãi xe";
                return (
                  <option key={lotId} value={lotId}>
                    {lotName}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="expired">Đã hết hạn</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <RefreshCw className="w-10 h-10 animate-spin mb-3" />
            <p>Đang tải danh sách vé tháng người dùng...</p>
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-5">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
              <Ticket className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Chưa có vé tháng người dùng
            </h3>
            <p className="text-gray-500 text-sm">
              Kiểm tra lại bộ lọc hoặc dữ liệu
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-center">
                    {[
                      "STT",
                      "Người dùng",
                      "Biển số",
                      "Bãi xe",
                      "Gói vé",
                      "Thời hạn",
                      "Thanh toán",
                      "Loại thanh toán",
                      "Trạng thái",
                      "",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="p-3 text-center text-sm font-semibold whitespace-nowrap"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const style = statusStyle(row.statusKey);
                    const isLast = index === rows.length - 1;
                    return (
                      <tr
                        key={
                          row.passId ||
                          `${row.userId}-${row.vehicleId}-${index}`
                        }
                        className={`hover:bg-blue-50/40 transition-colors cursor-default ${!isLast ? "border-b border-gray-50" : ""}`}
                      >
                        <td className="p-3 text-center text-gray-500 font-semibold whitespace-nowrap">
                          {(pageNumber - 1) * pageSize + index + 1}
                        </td>
                        <td className="p-3 text-center text-gray-600 max-w-[180px]">
                          <p className="font-semibold text-gray-900 truncate">
                            {row.fullName ||
                              userFullNameById[String(row.userId)] ||
                              "Không rõ"}
                          </p>
                        </td>
                        <td className="p-3 text-center font-semibold text-gray-900 max-w-[170px]">
                          <div className="inline-flex items-center gap-2 max-w-full">
                            <span className="truncate">
                              {row.vehiclePlate || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center max-w-[220px]">
                          <p className="font-semibold text-gray-900 truncate">
                            {row.lotName || "—"}
                          </p>
                        </td>
                        <td className="p-3 text-center max-w-[210px]">
                          <p className="font-semibold text-gray-900 truncate">
                            {row.packageName || "—"}
                          </p>
                        </td>
                        <td className="p-3 text-center text-gray-500 whitespace-nowrap">
                          <p className="text-gray-700">
                            {formatDateTime(row.startDate)} -{" "}
                            {formatDateTime(row.endDate)}
                          </p>
                        </td>
                        <td className="p-3 text-center font-semibold text-gray-900">
                          <p className="inline-flex items-center gap-1.5">
                            {formatMoney(row.paidAmount)}
                          </p>
                        </td>
                        <td className="p-3 text-center text-gray-600 font-medium whitespace-nowrap">
                          {formatPaymentMethodLabel(row.paymentMethod)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.className}`}
                          >
                            {style.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            title="Xem chi tiết vé tháng"
                            aria-label="Xem chi tiết vé tháng"
                            onClick={() => setDetailPass(row)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>
                  Trang{" "}
                  <span className="font-semibold text-gray-700">
                    {pageNumber}
                  </span>{" "}
                  / {totalPages}
                </span>
                <span>- {filteredPasses.length} vé tháng</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pageNumber === 1}
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPageNumber(num)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                      num === pageNumber
                        ? "bg-blue-600 text-white shadow-sm"
                        : "hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pageNumber >= totalPages}
                  onClick={() =>
                    setPageNumber((p) => Math.min(totalPages, p + 1))
                  }
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={Boolean(detailPass)}
        onOpenChange={(open) => {
          if (!open) setDetailPass(null);
        }}
      >
        <DialogContent
          className="w-[92vw] max-w-5xl rounded-2xl px-0 py-0 overflow-hidden"
          onClose={() => setDetailPass(null)}
        >
          <DialogHeader className="px-5 py-4 border-b border-gray-100 bg-gray-50/70">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Chi tiết đăng ký vé tháng
            </DialogTitle>
          </DialogHeader>

          {detailPass && (
            <div className="space-y-4 px-5 pb-5 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Tên người dùng
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-all">
                    {detailPass.fullName?.trim() ||
                      userFullNameById[String(detailPass.userId ?? "")] ||
                      detailPass.userName?.trim() ||
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Email
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-all">
                    {detailPass.userEmail || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Biển số xe
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {detailPass.vehiclePlate || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Màu xe
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {vehicleMedia.color || detailPass.vehicleColor || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Bãi xe
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {detailPass.lotName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Gói vé
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {detailPass.packageName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Thời gian bắt đầu
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {formatDateTime(detailPass.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Thời gian kết thúc
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {formatDateTime(detailPass.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Giá gốc
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {formatMoney(detailPass.originalPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Thanh toán
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {formatMoney(detailPass.paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Loại thanh toán
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {formatPaymentMethodLabel(detailPass.paymentMethod)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Trạng thái
                  </p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle(detailPass.statusKey).className}`}
                  >
                    {statusStyle(detailPass.statusKey).label}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Ngày tạo
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {formatDateTime(detailPass.createdAt)}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-xl border border-gray-200 p-2.5">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Hình ảnh biển số
                  </p>
                  {vehicleMedia.loading ? (
                    <div className="h-60 w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                      Đang tải hình ảnh...
                    </div>
                  ) : vehicleMedia.plateUrl ? (
                    <img
                      src={vehicleMedia.plateUrl}
                      alt="Hình ảnh biển số"
                      className="h-full w-full rounded-lg border border-gray-100 object-cover object-center bg-gray-50"
                    />
                  ) : (
                    <div className="h-60 w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                      Chưa có hình ảnh
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UserMonthlyPasses;
