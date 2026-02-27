import { useState, useEffect } from "react";
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
  CalendarDays,
  X,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import parkingLotService from "../../services/parkingLotService";
import gateService from "../../services/gateService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fmtVND = (v) =>
  v != null
    ? new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(v)
    : "—";

const fmtTime = (v) => (v ? v.substring(0, 5) : "—");

const fmtDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.toLocaleDateString("vi-VN");
};

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
const getStatusVariant = (raw) =>
  STATUS_VARIANT[String(raw ?? "").toLowerCase()] ?? "secondary";
const getStatusLabel = (raw) =>
  STATUS_LABEL[String(raw ?? "").toLowerCase()] ?? (raw || "—");

const GATE_TYPE = { ENTRY: "Cổng vào", EXIT: "Cổng ra", BOTH: "Cả hai" };

const DEVICE_TYPE_MAP = {
  LPR_CAMERA: { label: "Camera LPR", variant: "default", Icon: Camera },
  BARRIER: { label: "Barie", variant: "secondary", Icon: Activity },
};
const getDType = (raw) =>
  DEVICE_TYPE_MAP[String(raw ?? "").toUpperCase()] ?? {
    label: raw || "—",
    variant: "outline",
    Icon: Cpu,
  };

const CONN_MAP = {
  ONLINE: { label: "Online", variant: "success", Icon: Wifi },
  OFFLINE: { label: "Offline", variant: "destructive", Icon: WifiOff },
  READY: { label: "Sẵn sàng", variant: "default", Icon: Wifi },
  WARNING: { label: "Cảnh báo", variant: "warning", Icon: AlertTriangle },
};
const getConn = (raw) =>
  CONN_MAP[String(raw ?? "").toUpperCase()] ?? {
    label: raw || "—",
    variant: "outline",
    Icon: Cpu,
  };

function InfoRow({ label, value, icon: Icon }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
        </div>
      )}
      <div>
        <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1 bg-gray-100" />
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-2 whitespace-nowrap">
        {children}
      </p>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  );
}

function ParkingLotDetailModal({ lot, onClose }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [gates, setGates] = useState([]);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    if (!lot?.id) return;
    const load = async () => {
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
      } catch (err) {
        toast.error("Không thể tải thông tin chi tiết");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lot?.id]);

  // Group devices by gateId
  const devicesByGate = {};
  (detail?.devices || []).forEach((d) => {
    const gId = d.gateId || "unassigned";
    if (!devicesByGate[gId]) devicesByGate[gId] = [];
    devicesByGate[gId].push(d);
  });

  const d = detail || {};
  const totalSpots = lot.totalSpots ?? d.totalCapacity ?? 0;
  const occupiedSpots = lot.occupiedSpots ?? d.currentOccupancy ?? 0;
  const occupancy = totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0;
  const aiConfig = d.cameraSetup?.aiConfig || d.aiConfig;
  const rawStatus = d.status ?? lot.status;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-primary-50 border border-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ParkingCircle className="w-6 h-6 text-primary-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
                    {lot.name}
                  </DialogTitle>
                  <Badge variant={getStatusVariant(rawStatus)}>
                    {getStatusLabel(rawStatus)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{lot.location}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
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
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
            {/* ── Occupancy ── */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary-50 via-primary-50 to-blue-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Tỷ lệ lấp đầy
                  </p>
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      occupancy > 80
                        ? "text-red-600"
                        : occupancy > 50
                          ? "text-orange-500"
                          : "text-green-600",
                    )}
                  >
                    {occupancy.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-white/60 rounded-full h-2.5 mb-3">
                  <div
                    className={cn(
                      "h-2.5 rounded-full transition-all",
                      occupancy > 80
                        ? "bg-red-500"
                        : occupancy > 50
                          ? "bg-orange-500"
                          : "bg-green-500",
                    )}
                    style={{ width: `${Math.min(occupancy, 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {
                      val: totalSpots,
                      label: "Tổng chỗ",
                      Icon: ParkingCircle,
                      color: "text-blue-600",
                    },
                    {
                      val: totalSpots - occupiedSpots,
                      label: "Còn trống",
                      Icon: ParkingCircle,
                      color: "text-green-600",
                    },
                    {
                      val: gates.length || lot.gates,
                      label: "Số cổng",
                      Icon: DoorOpen,
                      color: "text-purple-600",
                    },
                    {
                      val: d.totalDevices ?? lot.cameras,
                      label: "Thiết bị",
                      Icon: Camera,
                      color: "text-orange-600",
                    },
                  ].map(({ val, label, Icon, color }) => (
                    <div
                      key={label}
                      className="bg-white/70 rounded-xl p-3 text-center"
                    >
                      <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
                      <p
                        className={cn("text-lg font-bold leading-none", color)}
                      >
                        {val ?? 0}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Thông tin chung ── */}
            <div>
              <SectionTitle>Thông tin chung</SectionTitle>
              <Card>
                <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InfoRow
                    icon={Clock}
                    label="Giờ hoạt động"
                    value={
                      d.is24h
                        ? "24/7"
                        : `${fmtTime(d.openingTime)} – ${fmtTime(d.closingTime)}`
                    }
                  />
                  <InfoRow
                    icon={CircleDollarSign}
                    label="Giá theo giờ"
                    value={d.hourlyRate ? fmtVND(d.hourlyRate) : null}
                  />
                  <InfoRow
                    icon={CircleDollarSign}
                    label="Giá theo tháng"
                    value={d.monthlyRate ? fmtVND(d.monthlyRate) : null}
                  />
                  <InfoRow
                    icon={CalendarDays}
                    label="Ngày kích hoạt"
                    value={fmtDate(d.scheduledActivationDate)}
                  />
                  <InfoRow
                    icon={CalendarDays}
                    label="Ngày tạo"
                    value={fmtDate(d.createdAt)}
                  />
                  <InfoRow
                    icon={CalendarDays}
                    label="Cập nhật lần cuối"
                    value={fmtDate(d.updatedAt)}
                  />
                </CardContent>
              </Card>
            </div>

            {/* ── Cổng & Thiết bị ── */}
            {gates.length > 0 && (
              <div>
                <SectionTitle>Cổng & Thiết bị</SectionTitle>
                <div className="space-y-3">
                  {gates.map((gate, idx) => {
                    const gId = gate.gateId ?? gate.id;
                    const devList = devicesByGate[gId] || [];
                    const typeLabel =
                      GATE_TYPE[gate.gateType] || gate.gateType || "—";
                    const isActive = gate.isActive !== false;

                    return (
                      <Card key={gId || idx} className="overflow-hidden">
                        <CardHeader className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <DoorOpen className="w-4 h-4 text-purple-500 flex-shrink-0" />
                              <span className="text-sm font-semibold text-gray-900">
                                {gate.gateName ||
                                  gate.name ||
                                  `Cổng ${idx + 1}`}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-2 py-0"
                              >
                                {typeLabel}
                              </Badge>
                            </div>
                            <Badge
                              variant={isActive ? "success" : "secondary"}
                              className="text-[10px]"
                            >
                              {isActive ? "Hoạt động" : "Tắt"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          {devList.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                              {devList.map((dev) => {
                                const dtype = getDType(dev.deviceType);
                                const conn = getConn(dev.connectionStatus);
                                const ConnIcon = conn.Icon;
                                const DTypeIcon = dtype.Icon;
                                return (
                                  <div
                                    key={dev.deviceId ?? dev.id}
                                    className="px-4 py-3 flex items-start justify-between gap-3"
                                  >
                                    <div className="flex items-start gap-3 min-w-0">
                                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <DTypeIcon className="w-4 h-4 text-gray-500" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                          <span className="text-sm font-medium text-gray-900">
                                            {dev.deviceName || "—"}
                                          </span>
                                          <Badge
                                            variant={dtype.variant}
                                            className="text-[10px]"
                                          >
                                            {dtype.label}
                                          </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                                          {dev.deviceCode && (
                                            <span>
                                              Mã:{" "}
                                              <span className="font-mono text-gray-700">
                                                {dev.deviceCode}
                                              </span>
                                            </span>
                                          )}
                                          {dev.model && (
                                            <span>Model: {dev.model}</span>
                                          )}
                                          {dev.ipAddress && (
                                            <span>
                                              IP:{" "}
                                              <span className="font-mono text-gray-700">
                                                {dev.ipAddress}
                                              </span>
                                            </span>
                                          )}
                                          {dev.macAddress && (
                                            <span>
                                              MAC:{" "}
                                              <span className="font-mono text-gray-700">
                                                {dev.macAddress}
                                              </span>
                                            </span>
                                          )}
                                          {dev.firmwareVersion && (
                                            <span>
                                              FW: {dev.firmwareVersion}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge
                                      variant={conn.variant}
                                      className="flex-shrink-0 gap-1 text-[10px] mt-0.5"
                                    >
                                      <ConnIcon className="w-3 h-3" />
                                      {conn.label}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="px-4 py-4 text-sm text-gray-400 italic text-center">
                              Chưa có thiết bị nào
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Cấu hình AI ── */}
            {aiConfig && (
              <div>
                <SectionTitle>Cấu hình AI</SectionTitle>
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {aiConfig.licensePlateConfidenceThreshold != null && (
                        <div className="flex items-center gap-3 bg-indigo-50 rounded-xl p-4">
                          <Shield className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">
                              Nhận diện biển số
                            </p>
                            <p className="text-2xl font-bold text-indigo-700">
                              {aiConfig.licensePlateConfidenceThreshold}%
                            </p>
                          </div>
                        </div>
                      )}
                      {aiConfig.faceRecognitionConfidenceThreshold != null && (
                        <div className="flex items-center gap-3 bg-violet-50 rounded-xl p-4">
                          <Shield className="w-6 h-6 text-violet-500 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">
                              Nhận diện khuôn mặt
                            </p>
                            <p className="text-2xl font-bold text-violet-700">
                              {aiConfig.faceRecognitionConfidenceThreshold}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Thống kê ── */}
            {statistics && Object.keys(statistics).length > 0 && (
              <div>
                <SectionTitle>Thống kê</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(statistics.todayVehicles ??
                    statistics.totalVehicles ??
                    statistics.vehicleCount) != null && (
                    <Card>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Số lượt xe
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {statistics.todayVehicles ??
                              statistics.totalVehicles ??
                              statistics.vehicleCount}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-indigo-600" />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {(statistics.todayRevenue ??
                    statistics.revenue ??
                    statistics.totalRevenue) != null && (
                    <Card>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Doanh thu
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {fmtVND(
                              statistics.todayRevenue ??
                                statistics.revenue ??
                                statistics.totalRevenue ??
                                0,
                            )}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ParkingLotDetailModal;
