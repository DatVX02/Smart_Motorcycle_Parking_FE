import { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  ParkingCircle,
  Camera,
  DoorOpen,
  TrendingUp,
  Clock,
  CircleDollarSign,
  Activity,
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle,
  AlertCircle,
  Construction,
  X,
  Shield,
  Plus,
  BarChart3,
  LogIn,
  LogOut,
  Loader2,
  PowerOff,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import parkingLotService from "../../services/parkingLotService";
import gateService from "../../services/gateService";
import iotDeviceService from "../../services/iotDeviceService";
import parkingSessionService from "../../services/parkingSessionService";
import DeviceModal from "../IoTDevices/DeviceModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* formatters */
const fmtVND = (v) =>
  v != null
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })
        .format(v)
        .replace("₫", "VNĐ")
    : "—";
const fmtTime = (v) => (v ? v.substring(0, 5) : "—");
const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.toLocaleDateString("vi-VN");
};

/* lookup maps */
const STATUS_VARIANT = {
  active: "success",
  inactive: "destructive",
  maintenance: "warning",
};
const STATUS_LABEL = {
  active: "Hoạt động",
  inactive: "Không hoạt động",
  maintenance: "Bảo trì",
};
const getStatusVariant = (r) =>
  STATUS_VARIANT[String(r ?? "").toLowerCase()] ?? "secondary";
const getStatusLabel = (r) =>
  STATUS_LABEL[String(r ?? "").toLowerCase()] ?? (r || "—");

const GATE_TYPE = {
  entry: "Cổng vào",
  exit: "Cổng ra",
  two_way: "Cả hai",
  ENTRY: "Cổng vào",
  EXIT: "Cổng ra",
  BOTH: "Cả hai",
};

const DEVICE_TYPE_MAP = {
  LPR_CAMERA: {
    label: "Camera LPR",
    variant: "default",
    Icon: Camera,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  BARRIER: {
    label: "Barie",
    variant: "secondary",
    Icon: Activity,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
};
const getDType = (r) =>
  DEVICE_TYPE_MAP[String(r ?? "").toUpperCase()] ?? {
    label: r || "—",
    variant: "outline",
    Icon: Cpu,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
  };

const CONN_MAP = {
  ONLINE: { label: "Trực tuyến", variant: "success", Icon: Wifi },
  OFFLINE: { label: "Ngoại tuyến", variant: "destructive", Icon: WifiOff },
  READY: { label: "Sẵn sàng", variant: "default", Icon: Wifi },
  WARNING: { label: "Cảnh báo", variant: "warning", Icon: AlertTriangle },
  INACTIVE: { label: "Ngừng hoạt động", variant: "secondary", Icon: PowerOff },
  BROKEN: { label: "Hư hỏng", variant: "destructive", Icon: AlertCircle },
  MAINTENANCE: { label: "Bảo trì", variant: "warning", Icon: Construction },
};
const getConn = (r) =>
  CONN_MAP[String(r ?? "").toUpperCase()] ?? {
    label: r || "—",
    variant: "outline",
    Icon: Cpu,
  };

/* simulated hourly traffic */
function makeHourlyData(seed) {
  const peak = [7, 8, 12, 17, 18, 19];
  return Array.from({ length: 24 }, (_, h) => {
    const base = peak.includes(h)
      ? 60 + ((seed * (h + 1)) % 30)
      : 10 + ((seed * (h + 3)) % 20);
    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      vào: Math.round(base),
      ra: Math.round(base * 0.85),
    };
  });
}

/* small shared components */
function SectionTitle({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">
        {children}
      </p>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  );
}

/* Main component */
function ParkingLotDetailModal({ lot, onClose }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [gates, setGates] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [addDeviceGate, setAddDeviceGate] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [det, gts, stats] = await Promise.all([
        parkingLotService.getParkingLotDetail(lot.id),
        gateService.getByLot(lot.id).catch(() => []),
        parkingLotService.getParkingLotStatistics(lot.id).catch(() => null),
      ]);
      setDetail(det);
      setGates(Array.isArray(gts) ? gts : []);
      setStatistics(stats);
    } catch {
      toast.error("Không thể tải thông tin chi tiết");
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const data = await parkingSessionService
        .getAll({
          lotId: lot.id,
          pageNumber: 1,
          pageSize: 10,
        })
        .catch(() => []);
      setSessions(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch (err) {
      console.error("[Sessions] catch:", err);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (!lot?.id) return;
    loadData();
    loadSessions();
  }, [lot?.id]);

  /* flatten all devices */
  const allDevices = useMemo(() => {
    const devs = detail?.devices || [];
    return devs.map((dev) => ({
      ...dev,
      gateName:
        gates.find((g) => (g.gateId ?? g.id) === dev.gateId)?.gateName || "—",
    }));
  }, [detail, gates]);

  /* Tạo thiết bị mới cho cổng */
  const handleSaveDevice = async (payload) => {
    const gId = addDeviceGate?.gateId ?? addDeviceGate?.id;
    try {
      await iotDeviceService.create({
        ...payload,
        gateId: gId,
        parkingLotId: lot.id,
      });
      toast.success("Đã thêm thiết bị thành công");
      setAddDeviceGate(null);
      // Reload để cập nhật danh sách thiết bị
      const det = await parkingLotService.getParkingLotDetail(lot.id);
      setDetail(det);
    } catch (err) {
      const msg = err?.response?.data?.message || "Không thể thêm thiết bị";
      toast.error(msg);
      throw err; // để DeviceModal biết có lỗi
    }
  };

  const d = detail || {};
  const totalSpots = lot.totalSpots ?? d.totalCapacity ?? 0;
  const occupiedSpots = lot.occupiedSpots ?? d.currentOccupancy ?? 0;
  const availableSpots = totalSpots - occupiedSpots;
  const occupancy = totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0;
  const aiConfig = d.cameraSetup?.aiConfig || d.aiConfig;
  const rawStatus = d.status ?? lot.status;

  // seed cho chart từ lot.id string
  const seed = useMemo(() => {
    const s = String(lot.id ?? "");
    return s.split("").reduce((acc, c) => acc + c.charCodeAt(0), 1);
  }, [lot.id]);
  const hourlyData = useMemo(() => makeHourlyData(seed), [seed]);

  const isCritical = occupancy >= 90;
  const barColor = isCritical
    ? "#ef4444"
    : occupancy >= 70
      ? "#f59e0b"
      : "#22c55e";
  const rateColor = isCritical
    ? "text-red-600"
    : occupancy >= 70
      ? "text-amber-600"
      : "text-green-600";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[96vw] w-[96vw] p-0 gap-0 max-h-[94vh] flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-primary-50 border border-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ParkingCircle className="w-5 h-5 text-primary-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base font-bold text-gray-900 leading-tight">
                    {lot.name}
                  </DialogTitle>
                  <Badge variant={getStatusVariant(rawStatus)}>
                    {getStatusLabel(rawStatus)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate" title={lot.location}>
                    {lot.location}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 flex-1">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-primary-600 mb-3" />
            <p className="text-sm text-gray-500">Đang tải thông tin...</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 flex flex-col">
            <div className="flex gap-0 flex-1">
              {/* ══ COLUMN 1 — fixed 230px — Thông tin tĩnh ══════════ */}
              <div className="w-[230px] shrink-0 px-4 py-4 flex flex-col gap-4 border-r border-gray-100">
                {/* Card: Thông tin chung */}
                <div className="w-full border border-gray-100 rounded-2xl p-4 bg-white">
                  <SectionTitle icon={Clock}>Thông tin chung</SectionTitle>
                  <div className="space-y-2">
                    <div className="w-full flex items-center gap-3 bg-blue-50 rounded-xl px-3 py-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                          Giờ hoạt động
                        </p>
                        <p className="text-sm font-bold text-blue-700">
                          {d.is24h
                            ? "24/7"
                            : `${fmtTime(d.openingTime)} – ${fmtTime(d.closingTime)}`}
                        </p>
                      </div>
                    </div>
                    <div className="w-full flex items-center gap-3 bg-green-50 rounded-xl px-3 py-2.5">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CircleDollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                          Giá theo giờ
                        </p>
                        <p className="text-sm font-bold text-green-700">
                          {d.hourlyRate ? fmtVND(d.hourlyRate) : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="w-full pt-2 space-y-1.5 border-t border-gray-100">
                      {[
                        {
                          label: "Ngày kích hoạt",
                          value: fmtDate(d.scheduledActivationDate),
                        },
                        { label: "Ngày tạo", value: fmtDate(d.createdAt) },
                        {
                          label: "Cập nhật lần cuối",
                          value: fmtDate(d.updatedAt),
                        },
                      ]
                        .filter((x) => x.value)
                        .map(({ label, value }) => (
                          <div
                            key={label}
                            className="flex items-baseline gap-1 w-full"
                          >
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {label}
                            </span>
                            <span className="flex-1 border-b border-dotted border-gray-300 mb-px" />
                            <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">
                              {value}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Spacer — đẩy thống kê xuống đáy */}
                <div className="flex-1" />

                {/* Card: Statistics */}
                {statistics && Object.keys(statistics).length > 0 && (
                  <div className="w-full border border-gray-100 rounded-2xl p-4 bg-white">
                    <SectionTitle icon={TrendingUp}>
                      Thống kê hôm nay
                    </SectionTitle>
                    <div className="space-y-2">
                      {(statistics.todayVehicles ??
                        statistics.totalVehicles ??
                        statistics.vehicleCount) != null && (
                        <div className="w-full flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5">
                          <div>
                            <p className="text-[10px] text-indigo-400 uppercase tracking-wide">
                              Lượt xe
                            </p>
                            <p className="text-2xl font-bold text-indigo-700">
                              {statistics.todayVehicles ??
                                statistics.totalVehicles ??
                                statistics.vehicleCount}
                            </p>
                          </div>
                          <TrendingUp className="w-5 h-5 text-indigo-400" />
                        </div>
                      )}
                      {(statistics.todayRevenue ??
                        statistics.revenue ??
                        statistics.totalRevenue) != null && (
                        <div className="w-full flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                          <div>
                            <p className="text-[10px] text-green-500 uppercase tracking-wide">
                              Doanh thu
                            </p>
                            <p className="text-base font-bold text-green-700">
                              {fmtVND(
                                statistics.todayRevenue ??
                                  statistics.revenue ??
                                  statistics.totalRevenue ??
                                  0,
                              )}
                            </p>
                          </div>
                          <CircleDollarSign className="w-5 h-5 text-green-400" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Card: AI Config */}
                {aiConfig && (
                  <div className="w-full border border-gray-100 rounded-2xl p-4 bg-white">
                    <SectionTitle icon={Shield}>Cấu hình AI</SectionTitle>
                    <div className="space-y-2">
                      {aiConfig.licensePlateConfidenceThreshold != null && (
                        <div className="w-full flex items-center gap-3 bg-indigo-50 rounded-xl px-3 py-2.5">
                          <Shield className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-400">
                              Nhận diện biển số
                            </p>
                            <p className="text-lg font-bold text-indigo-700">
                              {aiConfig.licensePlateConfidenceThreshold}%
                            </p>
                          </div>
                        </div>
                      )}
                      {aiConfig.faceRecognitionConfidenceThreshold != null && (
                        <div className="w-full flex items-center gap-3 bg-violet-50 rounded-xl px-3 py-2.5">
                          <Shield className="w-5 h-5 text-violet-400 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-400">
                              Nhận diện khuôn mặt
                            </p>
                            <p className="text-lg font-bold text-violet-700">
                              {aiConfig.faceRecognitionConfidenceThreshold}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ══ COLUMN 2 — flex-1 — Biểu đồ & Cổng/Thiết bị ══ */}
              <div className="flex-1 min-w-0 px-5 py-4 space-y-5 border-r border-gray-100">
                {/* Occupancy summary */}
                <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">
                      Tỷ lệ lấp đầy
                    </p>
                    <span className={cn("text-2xl font-bold", rateColor)}>
                      {occupancy.toFixed(1)}%
                      {isCritical && <span className="ml-1 text-base">⚠</span>}
                    </span>
                  </div>
                  <div className="w-full bg-white/60 border border-white/80 rounded-full h-3 mb-4">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min(occupancy, 100)}%`,
                        minWidth: occupancy > 0 ? "6px" : "0",
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      {
                        val: totalSpots,
                        label: "Tổng chỗ",
                        Icon: ParkingCircle,
                        color: "text-blue-600",
                        bg: "bg-blue-100/80",
                      },
                      {
                        val: availableSpots,
                        label: "Còn trống",
                        Icon: ParkingCircle,
                        color: "text-green-600",
                        bg: "bg-green-100/80",
                      },
                      {
                        val: gates.length,
                        label: "Số cổng",
                        Icon: DoorOpen,
                        color: "text-purple-600",
                        bg: "bg-purple-100/80",
                      },
                      {
                        val: d.totalDevices ?? lot.cameras,
                        label: "Thiết bị",
                        Icon: Camera,
                        color: "text-orange-600",
                        bg: "bg-orange-100/80",
                      },
                    ].map(({ val, label, Icon, color, bg }) => (
                      <div
                        key={label}
                        className={cn("rounded-xl p-2.5 text-center", bg)}
                      >
                        <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
                        <p
                          className={cn(
                            "text-lg font-bold leading-none",
                            color,
                          )}
                        >
                          {val ?? 0}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-1 font-medium">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Traffic chart */}
                <div>
                  <SectionTitle icon={BarChart3}>
                    Lưu lượng xe theo giờ (mô phỏng)
                  </SectionTitle>
                  <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart
                        data={hourlyData}
                        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorVao"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorRa"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#22c55e"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="#22c55e"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="hour"
                          tick={{ fontSize: 9, fill: "#94a3b8" }}
                          tickLine={false}
                          interval={3}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: "#94a3b8" }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <ReTooltip
                          contentStyle={{
                            fontSize: 11,
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                            padding: "6px 12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                          labelStyle={{
                            color: "#64748b",
                            fontWeight: 600,
                            marginBottom: 4,
                          }}
                          labelFormatter={(label) => `⏱ ${label}`}
                          formatter={(v, name) => [
                            <span style={{ fontWeight: 700 }}>{v} xe</span>,
                            name === "vào" ? "Xe vào" : "Xe ra",
                          ]}
                          cursor={{
                            stroke: "#cbd5e1",
                            strokeWidth: 1,
                            strokeDasharray: "4 2",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="vào"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#colorVao)"
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="ra"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill="url(#colorRa)"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-2 justify-center">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />{" "}
                        Xe vào
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-3 h-0.5 bg-green-500 inline-block rounded" />{" "}
                        Xe ra
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gates + Devices grouped */}
                <div>
                  <SectionTitle icon={DoorOpen}>
                    Cổng & Thiết bị ({gates.length} cổng · {allDevices.length}{" "}
                    thiết bị)
                  </SectionTitle>
                  {gates.length === 0 ? (
                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl py-8 text-center">
                      <DoorOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        Chưa có cổng nào được thiết lập
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {gates.map((gate, idx) => {
                        const gId = gate.gateId ?? gate.id;
                        const devList = allDevices.filter(
                          (dv) => dv.gateId === gId,
                        );
                        const isActive = gate.isActive !== false;
                        const typeLabel =
                          GATE_TYPE[gate.gateType] || gate.gateType || "—";
                        return (
                          <div
                            key={gId || idx}
                            className="border border-gray-100 rounded-2xl overflow-hidden"
                          >
                            {/* Gate header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                    isActive ? "bg-purple-100" : "bg-gray-200",
                                  )}
                                >
                                  <DoorOpen
                                    className={cn(
                                      "w-4 h-4",
                                      isActive
                                        ? "text-purple-600"
                                        : "text-gray-400",
                                    )}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {gate.gateName ||
                                      gate.name ||
                                      `Cổng ${idx + 1}`}
                                  </p>
                                  <p className="text-[10px] text-gray-400">
                                    {typeLabel} · {devList.length} thiết bị
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={isActive ? "success" : "secondary"}
                                  className="text-[10px]"
                                >
                                  {isActive ? "Hoạt động" : "Tắt"}
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => setAddDeviceGate(gate)}
                                  className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Thêm thiết bị
                                </button>
                              </div>
                            </div>

                            {/* Devices inside gate */}
                            {devList.length === 0 ? (
                              <div className="px-4 py-4 text-center">
                                <p className="text-xs text-gray-400 italic">
                                  Chưa có thiết bị nào trong cổng này
                                </p>
                              </div>
                            ) : (
                              <table className="w-full table-fixed text-sm">
                                <colgroup>
                                  <col style={{ width: "40%" }} />
                                  <col style={{ width: "18%" }} />
                                  <col style={{ width: "22%" }} />
                                  <col style={{ width: "20%" }} />
                                </colgroup>
                                <thead>
                                  <tr className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold border-b border-gray-50">
                                    <th className="px-4 py-2 text-left">
                                      Tên thiết bị
                                    </th>
                                    <th className="px-4 py-2 text-left">
                                      Loại
                                    </th>
                                    <th className="px-4 py-2 text-left">IP</th>
                                    <th className="px-4 py-2 text-center">
                                      Kết nối
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {devList.map((dev) => {
                                    const dtype = getDType(dev.deviceType);
                                    const conn = getConn(dev.connectionStatus);
                                    const ConnIcon = conn.Icon;
                                    const DTypeIcon = dtype.Icon;
                                    return (
                                      <tr
                                        key={dev.deviceId ?? dev.id}
                                        className="hover:bg-blue-50/30 transition-colors"
                                      >
                                        <td className="px-4 py-2.5">
                                          <div className="flex items-center gap-2.5">
                                            <div
                                              className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                                                dtype.iconBg,
                                              )}
                                            >
                                              <DTypeIcon
                                                className={cn(
                                                  "w-3.5 h-3.5",
                                                  dtype.iconColor,
                                                )}
                                              />
                                            </div>
                                            <div>
                                              <p className="font-semibold text-gray-900 text-xs leading-tight">
                                                {dev.deviceName || "—"}
                                              </p>
                                              {dev.model && (
                                                <p className="text-[10px] text-gray-400">
                                                  {dev.model}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <Badge
                                            variant={dtype.variant}
                                            className="text-[10px]"
                                          >
                                            {dtype.label}
                                          </Badge>
                                        </td>
                                        <td className="px-4 py-2.5">
                                          {dev.ipAddress ? (
                                            <span className="font-mono text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                              {dev.ipAddress}
                                            </span>
                                          ) : (
                                            <span className="text-gray-300 text-xs">
                                              —
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                          <Badge
                                            variant={conn.variant}
                                            className="gap-1 text-[10px] inline-flex items-center"
                                          >
                                            <ConnIcon className="w-3 h-3" />
                                            {conn.label}
                                          </Badge>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Nhật ký phiên đỗ xe */}
              <div className="w-[260px] shrink-0 px-4 py-4 flex flex-col">
                {/* Full-height card */}
                <div className="flex-1 w-full border border-gray-100 rounded-2xl bg-white flex flex-col p-4 overflow-hidden">
                  <SectionTitle icon={Activity}>Nhật ký ra/vào</SectionTitle>

                  {sessionsLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <LogIn className="w-8 h-8 text-gray-200 mb-2" />
                      <p className="text-sm text-gray-400">
                        Chưa có phiên đỗ xe nào
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
                      {sessions.map((s, i) => {
                        const isEntry =
                          !s.exitTime ||
                          s.sessionStatus === "active" ||
                          s.sessionStatus === "ACTIVE";
                        const plate =
                          s.licensePlate ??
                          s.vehiclePlate ??
                          s.plateNumber ??
                          "—";
                        const rawTime =
                          s.exitTime ??
                          s.entryTime ??
                          s.createdAt ??
                          s.checkInTime;
                        const adjustedDate = rawTime
                          ? new Date(
                              new Date(rawTime).getTime() - 7 * 60 * 60 * 1000,
                            )
                          : null;
                        const timeStr = adjustedDate
                          ? adjustedDate.toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "—";
                        const dateStr = adjustedDate
                          ? adjustedDate.toLocaleDateString("vi-VN")
                          : "";

                        return (
                          <div
                            key={s.sessionId ?? s.id ?? i}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-xl border",
                              isEntry
                                ? "bg-green-50 border-green-100"
                                : "bg-orange-50 border-orange-100",
                            )}
                          >
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                                isEntry ? "bg-green-100" : "bg-orange-100",
                              )}
                            >
                              {isEntry ? (
                                <LogIn className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <LogOut className="w-3.5 h-3.5 text-orange-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-xs font-bold text-gray-800 leading-tight truncate">
                                {plate}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px]",
                                  isEntry
                                    ? "text-green-600"
                                    : "text-orange-600",
                                )}
                              >
                                Xe {isEntry ? "vào" : "ra"}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[11px] text-gray-500 font-mono">
                                {timeStr}
                              </p>
                              {dateStr && (
                                <p className="text-[10px] text-gray-300">
                                  {dateStr}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {sessions.length === 10 && (
                        <p className="text-center text-[10px] text-gray-300 pt-1 pb-0.5">
                          Hiển thị 10 phiên gần nhất
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* ── Add Device Modal (portal) ── */}
      {addDeviceGate && (
        <DeviceModal
          device={null}
          onClose={() => setAddDeviceGate(null)}
          onSave={handleSaveDevice}
        />
      )}
    </Dialog>
  );
}

export default ParkingLotDetailModal;
