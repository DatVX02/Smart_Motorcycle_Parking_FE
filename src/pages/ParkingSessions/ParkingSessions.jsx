import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  RefreshCw,
  Car,
  Search,
  LogIn,
  LogOut,
  XCircle,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { DatePicker, ConfigProvider } from "antd";
import dayjs from "dayjs";
import viVN from "antd/es/locale/vi_VN";
import "dayjs/locale/vi";
import parkingSessionService from "../../services/parkingSessionService";
import parkingLotService from "../../services/parkingLotService";
import { API_BASE_URL } from "../../config/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

dayjs.locale("vi");

/** Offset hiển thị giống ParkingLotDetailModal */
function formatSessionTimes(s) {
  const rawTime = s.exitTime ?? s.entryTime ?? s.createdAt ?? s.checkInTime;
  const adjustedDate = rawTime
    ? new Date(new Date(rawTime).getTime() - 7 * 60 * 60 * 1000)
    : null;
  const timeStr = adjustedDate
    ? adjustedDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";
  const dateStr = adjustedDate ? adjustedDate.toLocaleDateString("vi-VN") : "";
  return { timeStr, dateStr, raw: rawTime };
}

function plateOf(s) {
  return s.licensePlate ?? s.vehiclePlate ?? s.plateNumber ?? "—";
}

function sessionKind(s) {
  const st = String(s.sessionStatus ?? "").toLowerCase();
  if (st === "cancelled" || st === "canceled") return "cancelled";
  if (
    st === "completed" ||
    st === "ended" ||
    st === "closed" ||
    st === "exited"
  )
    return "completed";
  if (s.exitTime) return "completed";
  if (st === "active" || st === "inprogress" || st === "in_progress" || !st)
    return "active";
  return "active";
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

function formatDateTime(value) {
  if (!value) return "—";
  const adjusted = dayjs(value).subtract(7, "hour");
  return adjusted.isValid() ? adjusted.format("HH:mm:ss DD/MM/YYYY") : "—";
}

function modalStatusBadgeClass(kind) {
  if (kind === "active") {
    return "inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700";
  }
  if (kind === "cancelled") {
    return "inline-flex rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700";
  }
  return "inline-flex rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700";
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

export default function ParkingSessions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lotIdFromUrl = searchParams.get("lotId")?.trim() ?? "";

  const [lots, setLots] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [lotFilter, setLotFilter] = useState(lotIdFromUrl);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [detailSession, setDetailSession] = useState(null);

  useEffect(() => {
    setLotFilter(lotIdFromUrl);
  }, [lotIdFromUrl]);

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
  const loadSessions = useCallback(async () => {
    setLoading(true);
    setStatsLoading(true);
    try {
      const params = { pageNumber: 1, pageSize: 9999 };
      if (lotFilter) params.lotId = lotFilter;
      const data = await parkingSessionService.getAll(params);
      setAllSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("Không thể tải danh sách phiên giữ xe");
      setAllSessions([]);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [lotFilter]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filteredSessions = useMemo(() => {
    let list = [...allSessions];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => {
        const plate = String(plateOf(s)).toLowerCase();
        const user = String(
          s.userName ?? s.customerName ?? s.fullName ?? s.userId ?? "",
        ).toLowerCase();
        const sid = String(s.sessionId ?? s.id ?? "").toLowerCase();
        return plate.includes(q) || user.includes(q) || sid.includes(q);
      });
    }

    if (statusFilter) {
      const want = statusFilter.toLowerCase();
      list = list.filter((s) => sessionKind(s) === want);
    }

    if (fromDate) {
      list = list.filter((s) => {
        const raw = s.entryTime ?? s.checkInTime ?? s.createdAt;
        if (!raw) return false;
        return !dayjs(raw).isBefore(fromDate);
      });
    }
    if (toDate) {
      list = list.filter((s) => {
        const raw = s.entryTime ?? s.checkInTime ?? s.createdAt;
        if (!raw) return false;
        return !dayjs(raw).isAfter(toDate);
      });
    }

    return list;
  }, [allSessions, search, statusFilter, fromDate, toDate]);

  const statistics = useMemo(() => {
    const total = filteredSessions.length;
    let active = 0;
    let completed = 0;
    for (const s of filteredSessions) {
      const k = sessionKind(s);
      if (k === "active") active += 1;
      else if (k === "completed") completed += 1;
    }
    return { total, active, completed };
  }, [filteredSessions]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const pageRows = filteredSessions.slice(
    (pageNumber - 1) * pageSize,
    pageNumber * pageSize,
  );

  const pageNums = useMemo(() => {
    const start = Math.max(1, Math.min(pageNumber - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [pageNumber, totalPages]);

  const onLotChange = (value) => {
    setLotFilter(value);
    setPageNumber(1);
    if (value) setSearchParams({ lotId: value });
    else setSearchParams({});
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("");
    setFromDate(null);
    setToDate(null);
    setLotFilter("");
    setSearchParams({});
    setPageNumber(1);
  };

  return (
    <div className="space-y-5">
      {/* Thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
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
              icon={Car}
              iconColor="text-blue-600"
              label="Tổng phiên"
              value={statistics.total}
              valueSuffix="Phiên"
            />
            <StatCard
              icon={LogIn}
              iconColor="text-emerald-700"
              label="Đã vào"
              value={statistics.active}
              valueSuffix="Phiên"
              bgTint="bg-emerald-500/25"
            />
            <StatCard
              icon={LogOut}
              iconColor="text-amber-700"
              label="Đã ra"
              value={statistics.completed}
              valueSuffix="Phiên"
              bgTint="bg-amber-500/25"
            />
          </>
        )}
      </div>

      {/* Bộ lọc */}
      <div
        lang="vi"
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
      >
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo biển số, tên người dùng, mã phiên..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageNumber(1);
            }}
            className="input pl-10 w-full text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              Trạng thái phiên
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
              <option value="active">Đã vào bãi</option>
              <option value="cancelled">Đã ra bãi</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Bãi xe</label>
            <select
              value={lotFilter}
              onChange={(e) => onLotChange(e.target.value)}
              className="input text-sm"
            >
              <option value="">Tất cả bãi</option>
              {lots.map((lot) => {
                const id = lot.lotId ?? lot.id;
                const name = lot.lotName ?? lot.name ?? id;
                return (
                  <option key={id} value={id}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <ConfigProvider locale={viVN}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-500">
                Từ ngày giờ
              </label>
              <DatePicker
                showTime={{ format: "HH:mm" }}
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d);
                  setPageNumber(1);
                }}
                format="DD/MM/YYYY HH:mm"
                placeholder="dd/mm/yyyy hh:mm"
                className="w-full [&.ant-picker]:rounded-lg [&.ant-picker]:border-gray-300 [&.ant-picker]:text-sm [&.ant-picker]:min-h-9"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-500">
                Đến ngày giờ
              </label>
              <DatePicker
                showTime={{ format: "HH:mm" }}
                value={toDate}
                onChange={(d) => {
                  setToDate(d);
                  setPageNumber(1);
                }}
                format="DD/MM/YYYY HH:mm"
                placeholder="dd/mm/yyyy hh:mm"
                className="w-full [&.ant-picker]:rounded-lg [&.ant-picker]:border-gray-300 [&.ant-picker]:text-sm [&.ant-picker]:min-h-9"
              />
            </div>
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
              onClick={() => loadSessions()}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`}
              />
              Tải lại
            </Button>
          </div>
        </ConfigProvider>
      </div>

      {/* Bảng */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-center">
                {[
                  "STT",
                  "Biển số",
                  "Người dùng",
                  "Bãi xe",
                  "Thời điểm",
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
                        Không có phiên giữ xe
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((s, idx) => {
                  const { timeStr, dateStr } = formatSessionTimes(s);
                  const k = sessionKind(s);
                  const statusLabel =
                    k === "active"
                      ? "Đã vào"
                      : k === "cancelled"
                        ? "Đã hủy"
                        : "Đã ra";
                  return (
                    <tr
                      key={s.sessionId ?? s.id ?? idx}
                      className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="p-3 text-center text-gray-500 font-semibold">
                        {(pageNumber - 1) * pageSize + idx + 1}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-gray-900 max-w-[200px] break-words">
                        {plateOf(s)}
                      </td>
                      <td className="p-3 text-center text-gray-600 max-w-[140px] break-words">
                        {s.userName ??
                          s.customerName ??
                          s.fullName ??
                          "Vãng lai"}
                      </td>
                      <td className="p-3 text-center text-gray-600 text-xs max-w-[160px] break-words">
                        {s.lotName ?? s.parkingLotName ?? s.lotId ?? "—"}
                      </td>
                      <td className="p-3 text-center text-gray-700 whitespace-nowrap">
                        <div className="font-mono text-xs">{timeStr}</div>
                        {dateStr && (
                          <div className="text-[11px] text-gray-400">
                            {dateStr}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={
                            k === "active"
                              ? "inline-flex min-w-[75px] justify-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                              : k === "cancelled"
                                ? "inline-flex min-w-[75px] justify-center rounded-full border border-red-200 bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                                : "inline-flex min-w-[75px] justify-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                          }
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          aria-label="Xem chi tiết phiên"
                          title="Xem chi tiết phiên"
                          onClick={() => setDetailSession(s)}
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

        {!loading && filteredSessions.length > 0 && (
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
        open={Boolean(detailSession)}
        onOpenChange={() => setDetailSession(null)}
      >
        <DialogContent
          className="max-w-3xl rounded-2xl px-0 py-0 overflow-hidden"
          onClose={() => setDetailSession(null)}
        >
          <DialogHeader className="px-5 py-4 border-b border-gray-100 bg-gray-50/70">
            <div className="flex items-center gap-3 pr-8">
              <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Car className="h-4 w-4" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Chi tiết phiên giữ xe
              </DialogTitle>
            </div>
          </DialogHeader>

          {detailSession && (
            <div className="space-y-4 px-5 pb-5 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Người dùng
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {detailSession.userName ??
                      detailSession.customerName ??
                      detailSession.fullName ??
                      "Vãng lai"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Biển số xe
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {plateOf(detailSession)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Thời gian vào
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {formatDateTime(
                      detailSession.entryTime ??
                        detailSession.checkInTime ??
                        detailSession.createdAt,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Thời gian ra
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {formatDateTime(detailSession.exitTime)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Bãi đỗ xe
                  </p>
                  <p className="text-sm font-medium text-gray-900 break-words">
                    {detailSession.lotName ??
                      detailSession.parkingLotName ??
                      detailSession.lotId ??
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    Trạng thái
                  </p>
                  <span
                    className={modalStatusBadgeClass(
                      sessionKind(detailSession),
                    )}
                  >
                    {sessionKind(detailSession) === "active"
                      ? "Đã vào"
                      : sessionKind(detailSession) === "cancelled"
                        ? "Đã hủy"
                        : "Đã ra"}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    label: "Hình biển số xe",
                    src: resolveImageUrl(
                      firstImageValue(detailSession, [
                        "plateImage",
                        "plateImageUrl",
                        "licensePlateImage",
                        "licensePlateImageUrl",
                        "vehiclePlateImage",
                        "vehiclePlateImageUrl",
                      ]),
                    ),
                  },
                  {
                    label: "Hình khuôn mặt",
                    src: resolveImageUrl(
                      firstImageValue(detailSession, [
                        "faceImage",
                        "faceImageUrl",
                        "customerFaceImage",
                        "customerFaceImageUrl",
                        "userFaceImage",
                        "userFaceImageUrl",
                      ]),
                    ),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-gray-200 p-2.5"
                  >
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                      {item.label}
                    </p>
                    {item.src ? (
                      <img
                        src={item.src}
                        alt={item.label}
                        className="h-44 w-full rounded-lg border border-gray-100 object-cover"
                      />
                    ) : (
                      <div className="h-44 w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                        Chưa có hình ảnh
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
