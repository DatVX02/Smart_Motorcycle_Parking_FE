import { useState, useEffect, useCallback, useRef } from "react";
import {
  Cpu,
  Camera,
  Activity,
  Monitor,
  Wifi,
  WifiOff,
  AlertTriangle,
  Plus,
  Unlink,
  Wrench,
  PowerOff,
  Power,
  AlertCircle,
  Construction,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Radio,
  Loader2,
  MoreVertical,
  Edit3,
} from "lucide-react";

import { EyeTwoTone } from "@ant-design/icons";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import mqttTestService from "../../services/mqttTestService";

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
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-7 h-7 flex-shrink-0 ${iconColor}`} />
          <p className="text-sm font-semibold text-gray-700">{label}</p>
        </div>
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
  );
}

import DeviceModal from "./DeviceModal";
import DeviceDetailModal from "./DeviceDetailModal";

import iotDeviceService from "../../services/iotDeviceService";
import parkingLotService from "../../services/parkingLotService";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const CONN_STATUS = {
  ONLINE: {
    label: "Trực tuyến",
    color: "bg-green-100 text-green-700",
    icon: Wifi,
  },
  OFFLINE: {
    label: "Ngoại tuyến",
    color: "bg-red-100 text-red-700",
    icon: WifiOff,
  },
  READY: {
    label: "Sẵn sàng",
    color: "bg-blue-100 text-blue-700",
    icon: Wifi,
  },
  WARNING: {
    label: "Cảnh báo",
    color: "bg-yellow-100 text-yellow-700",
    icon: AlertTriangle,
  },
  INACTIVE: {
    label: "Ngừng hoạt động",
    color: "bg-gray-100 text-gray-600",
    icon: PowerOff,
  },
  BROKEN: {
    label: "Hư hỏng",
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  MAINTENANCE: {
    label: "Bảo trì",
    color: "bg-amber-100 text-amber-700",
    icon: Construction,
  },
};

const DEVICE_TYPE = {
  CAMERA: {
    label: "Camera",
    color: "bg-blue-100 text-blue-700",
    icon: Camera,
  },
  BARRIER: {
    label: "Barie",
    color: "bg-purple-100 text-purple-700",
    icon: Activity,
  },
  LCD: {
    label: "LCD",
    color: "bg-indigo-100 text-indigo-700",
    icon: Monitor,
  },
  SENSOR: {
    label: "Sensor",
    color: "bg-green-100 text-green-700",
    icon: Cpu,
  },
};

const normalizeDeviceType = (raw) => {
  const key = String(raw ?? "").toUpperCase();
  if (key === "LPR" || key === "LPR_CAMERA") return "CAMERA";
  if (
    key === "LCD" ||
    key === "DISPLAY" ||
    key === "SCREEN" ||
    key === "MONITOR"
  )
    return "LCD";
  if (
    key === "SENSOR" ||
    key === "IR_SENSOR" ||
    key === "LOOP_SENSOR" ||
    key === "ULTRASONIC_SENSOR" ||
    key === "MOTION_SENSOR" ||
    key === "HC-SR04" ||
    key === "HC_SR04" ||
    key === "HCSR04" ||
    key === "ULTRASONIC"
  )
    return "SENSOR";
  return key;
};

const getConnStatus = (raw) => {
  const key = String(raw ?? "").toUpperCase();
  return (
    CONN_STATUS[key] ?? {
      label: raw || "",
      color: "bg-gray-100 text-gray-600",
      icon: Wifi,
    }
  );
};

const getDeviceType = (raw) => {
  const key = normalizeDeviceType(raw);
  return (
    DEVICE_TYPE[key] ?? {
      label: raw || "",
      color: "bg-gray-100 text-gray-600",
      icon: Cpu,
    }
  );
};

const STATUS_OPERATIONAL = ["ONLINE", "OFFLINE", "READY", "WARNING"];
const STATUS_NEEDS_ACTION = ["BROKEN", "MAINTENANCE", "INACTIVE"];

/** Lịch đã kết thúc / huỷ — không dùng để cảnh báo cờ hay đếm hạn */
function isClosedMaintenanceStatus(st) {
  const s = String(st ?? "").trim();
  if (!s) return false;
  const u = s.toLowerCase();
  return (
    s === "Completed" ||
    s === "Cancelled" ||
    s === "Pending" ||
    u === "completed" ||
    u === "cancelled" ||
    u === "pending"
  );
}

/** Lịch còn cần xử lý (chưa đóng) — dùng để cờ cảnh báo & đồng bộ MAINTENANCE */
function isOpenMaintenanceStatus(st) {
  return !isClosedMaintenanceStatus(st);
}

/** Gộp nextMaintenanceDate sớm nhất theo deviceId, chỉ từ lịch chưa Completed/Cancelled */
function buildNextMaintenanceByDeviceId(maintenanceItems) {
  const map = {};
  for (const m of maintenanceItems) {
    if (!isOpenMaintenanceStatus(m?.status)) continue;
    const raw = m?.nextMaintenanceDate;
    if (!raw || String(raw).startsWith("0001")) continue;
    const id = m.deviceId ?? m.device_id;
    if (id == null) continue;
    const key = String(id);
    const d = dayjs(raw);
    if (!d.isValid()) continue;
    const prev = map[key];
    if (!prev || d.isBefore(dayjs(prev))) map[key] = raw;
  }
  return map;
}

function deviceHasOpenMaintenance(maintenanceItems, deviceId) {
  if (deviceId == null) return false;
  const key = String(deviceId);
  return maintenanceItems.some((m) => {
    const mid = m.deviceId ?? m.device_id;
    if (mid == null || String(mid) !== key) return false;
    return isOpenMaintenanceStatus(m.status);
  });
}

/** Có ít nhất một bản ghi lịch bảo trì cho thiết bị (dùng để tự bỏ MAINTENANCE khi lịch đã đóng hết) */
function deviceHasAnyMaintenanceRecord(maintenanceItems, deviceId) {
  if (deviceId == null) return false;
  const key = String(deviceId);
  return maintenanceItems.some((m) => {
    const mid = m.deviceId ?? m.device_id;
    return mid != null && String(mid) === key;
  });
}

function maintenanceDueWithinWeek(nextDateISO) {
  if (!nextDateISO || String(nextDateISO).startsWith("0001")) return false;
  const daysLeft = dayjs(nextDateISO).diff(dayjs(), "day");
  return daysLeft >= 0 && daysLeft <= 7;
}

function IoTDevices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [testingOperationalConnection, setTestingOperationalConnection] =
    useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [filterType, setFilterType] = useState("all");
  const [filterLot, setFilterLot] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [pageOperational, setPageOperational] = useState(1);
  const [pageNeedsAction, setPageNeedsAction] = useState(1);

  const PAGE_SIZE = 6;

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: null,
    device: null,
  });

  const [deviceNextMaintenance, setDeviceNextMaintenance] = useState({});

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);

      const [devData, lotData, maintRes] = await Promise.all([
        iotDeviceService.getAll(),
        parkingLotService.getAllParkingLots().catch(() => []),
        DeviceMaintenanceService.getAll().catch(() => ({})),
      ]);

      setLots(Array.isArray(lotData) ? lotData : []);

      const rawItems =
        maintRes?.data?.items || maintRes?.items || maintRes?.data;
      const list = Array.isArray(rawItems) ? rawItems : [];
      setDeviceNextMaintenance(buildNextMaintenanceByDeviceId(list));

      let devicesToSet = Array.isArray(devData) ? devData : [];
      const staleMaint = devicesToSet.filter((d) => {
        const id = d.deviceId ?? d.id;
        if (id == null) return false;
        if (String(d.connectionStatus ?? "").toUpperCase() !== "MAINTENANCE")
          return false;
        if (!deviceHasAnyMaintenanceRecord(list, id)) return false;
        return !deviceHasOpenMaintenance(list, id);
      });
      if (staleMaint.length > 0) {
        await Promise.all(
          staleMaint.map((d) =>
            iotDeviceService
              .update(d.deviceId ?? d.id, { connectionStatus: "READY" })
              .catch(() => {}),
          ),
        );
        const refreshed = await iotDeviceService.getAll();
        devicesToSet = Array.isArray(refreshed) ? refreshed : [];
      }
      setDevices(devicesToSet);
    } catch {
      toast.error("Không thể tải danh sách thiết bị", { duration: 1000 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    setPageOperational(1);
    setPageNeedsAction(1);
  }, [filterType, filterLot, filterStatus]);

  const matchesStatusFilter = (device) => {
    if (filterStatus === "all") return true;
    const s = String(device.connectionStatus ?? "").toUpperCase();
    if (filterStatus === "BROKEN_MAINTENANCE") {
      return s === "BROKEN" || s === "MAINTENANCE";
    }
    return s === filterStatus;
  };

  const handleMaintenance = (device) => {
    const s = String(device.connectionStatus ?? "").toUpperCase();
    if (s === "MAINTENANCE") {
      toast("Thiết bị đang ở trạng thái bảo trì", { duration: 1500 });
      return;
    }
    setConfirmDialog({
      open: true,
      type: "startMaintenance",
      device,
    });
  };

  const handleDelete = (device) => {
    setConfirmDialog({
      open: true,
      type: "delete",
      device,
    });
  };

  const handleUnassign = (device) => {
    setConfirmDialog({
      open: true,
      type: "unassign",
      device,
    });
  };

  const handleDeactivate = (device) => {
    setConfirmDialog({
      open: true,
      type: "deactivate",
      device,
    });
  };

  const handleActivate = (device) => {
    setConfirmDialog({
      open: true,
      type: "activate",
      device,
    });
  };

  /** Thoát trạng thái bảo trì → Sẵn sàng (sau khi xong bảo trì tại chỗ hoặc không dùng trang lịch) */
  const handleExitMaintenance = (device) => {
    setConfirmDialog({
      open: true,
      type: "exitMaintenance",
      device,
    });
  };

  const handleConfirmAction = async () => {
    const { type, device } = confirmDialog;

    try {
      if (type === "delete") {
        await iotDeviceService.delete(device.id ?? device.deviceId);
        toast.success("Đã xóa thiết bị", { duration: 1000 });
      }

      if (type === "unassign") {
        await iotDeviceService.unassign(device.id ?? device.deviceId);
        toast.success("Đã ngắt gán thiết bị", { duration: 1000 });
      }

      if (type === "deactivate") {
        await iotDeviceService.update(device.id ?? device.deviceId, {
          connectionStatus: "INACTIVE",
        });
        toast.success("Đã chuyển thiết bị sang trạng thái ngừng hoạt động", {
          duration: 1000,
        });
      }

      if (type === "activate") {
        await iotDeviceService.update(device.id ?? device.deviceId, {
          connectionStatus: "READY",
        });
        toast.success("Đã bật lại thiết bị", { duration: 1000 });
      }

      if (type === "exitMaintenance") {
        await iotDeviceService.update(device.id ?? device.deviceId, {
          connectionStatus: "READY",
        });
        toast.success("Thiết bị đã được đưa về trạng thái sẵn sàng hoạt động", {
          duration: 1000,
        });
      }

      if (type === "startMaintenance") {
        const deviceId = device.id ?? device.deviceId;
        await iotDeviceService.update(deviceId, {
          connectionStatus: "MAINTENANCE",
        });
        toast.success("Đã chuyển thiết bị sang trạng thái bảo trì", {
          duration: 1000,
        });

        setConfirmDialog({ open: false, type: null, device: null });
        navigate(
          `/device-maintenance?deviceId=${encodeURIComponent(deviceId)}&openSchedules=1`,
        );
      }

      await fetchDevices();
    } catch (err) {
      const actionLabelMap = {
        delete: "xóa thiết bị",
        unassign: "ngắt gán thiết bị",
        deactivate: "ngừng hoạt động thiết bị",
        activate: "bật lại thiết bị",
        exitMaintenance: "đưa thiết bị về trạng thái sẵn sàng",
        startMaintenance: "chuyển thiết bị sang trạng thái bảo trì",
      };
      const actionLabel = actionLabelMap[type] || "thực hiện thao tác";
      toast.error(
        err?.response?.data?.message ||
          `Không thể ${actionLabel}. Vui lòng thử lại.`,
      );
    }
  };

  const filtered = devices.filter((d) => {
    const typeOk =
      filterType === "all" || normalizeDeviceType(d.deviceType) === filterType;

    const lotOk =
      filterLot === "all" ||
      d.lotId === filterLot ||
      d.parkingLotId === filterLot;

    return typeOk && lotOk && matchesStatusFilter(d);
  });

  const operationalDevices = filtered.filter((d) => {
    const status = String(d.connectionStatus ?? "").toUpperCase();
    return (
      STATUS_OPERATIONAL.includes(status) ||
      !STATUS_NEEDS_ACTION.includes(status)
    );
  });
  const needsActionDevices = filtered.filter((d) =>
    STATUS_NEEDS_ACTION.includes(
      String(d.connectionStatus ?? "").toUpperCase(),
    ),
  );

  const totalPagesOp = Math.max(
    1,
    Math.ceil(operationalDevices.length / PAGE_SIZE),
  );
  const totalPagesNeeds = Math.max(
    1,
    Math.ceil(needsActionDevices.length / PAGE_SIZE),
  );
  const paginatedOperational = operationalDevices.slice(
    (pageOperational - 1) * PAGE_SIZE,
    pageOperational * PAGE_SIZE,
  );
  const paginatedNeedsAction = needsActionDevices.slice(
    (pageNeedsAction - 1) * PAGE_SIZE,
    pageNeedsAction * PAGE_SIZE,
  );

  const handleOperationalTestConnection = async () => {
    if (operationalDevices.length === 0) {
      toast.error("Không có thiết bị đang vận hành để kiểm tra kết nối.");
      return;
    }

    setTestingOperationalConnection(true);
    const total = operationalDevices.length;
    const toastId = toast.loading(
      `Đang gửi tín hiệu kiểm tra kết nối tới ${total} thiết bị...`,
    );

    let successCount = 0;
    const failures = [];

    for (const device of operationalDevices) {
      const deviceId = device.deviceId ?? device.id;
      const deviceLabel =
        device.deviceName ||
        device.deviceCode ||
        device.name ||
        (deviceId != null ? `#${deviceId}` : "Thiết bị");

      if (!deviceId) {
        failures.push(`${deviceLabel}: chưa có mã thiết bị`);
        continue;
      }

      try {
        await mqttTestService.sendTest({
          lotId: device.lotId ?? device.parkingLotId ?? null,
          gateId: device.gateId ?? device.gate_id ?? null,
          gateName: device.gateName ?? "",
          deviceId,
          deviceCode: device.deviceCode ?? "",
          deviceName: device.deviceName ?? device.name ?? "",
          deviceType: device.deviceType ?? "",
          ipAddress: device.ipAddress ?? "",
          macAddress: (device.macAddress ?? "").toUpperCase(),
        });
        successCount += 1;
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          err?.message ||
          "Lỗi không xác định";
        failures.push(`${deviceLabel}: ${msg}`);
      }
    }

    if (failures.length === 0) {
      toast.success(
        `Đã gửi tín hiệu kiểm tra kết nối tới ${successCount}/${total} thiết bị.`,
        { id: toastId },
      );
    } else if (successCount === 0) {
      toast.error(
        `Không gửi được tín hiệu tới thiết bị nào. ${failures[0] ?? ""}`,
        { id: toastId, duration: 6000 },
      );
    } else {
      toast.success(
        `Đã gửi ${successCount}/${total} thiết bị. ${failures[0] ?? ""}`,
        { id: toastId, duration: 6000 },
      );
    }

    setTestingOperationalConnection(false);
  };

  useEffect(() => {
    if (pageOperational > totalPagesOp) setPageOperational(totalPagesOp);
  }, [totalPagesOp, pageOperational]);
  useEffect(() => {
    if (pageNeedsAction > totalPagesNeeds) setPageNeedsAction(totalPagesNeeds);
  }, [totalPagesNeeds, pageNeedsAction]);

  const totalCount = devices.length;
  const onlineCount = devices.filter(
    (d) => String(d.connectionStatus ?? "").toUpperCase() === "ONLINE",
  ).length;
  const offlineCount = devices.filter(
    (d) => String(d.connectionStatus ?? "").toUpperCase() === "OFFLINE",
  ).length;
  const readyCount = devices.filter(
    (d) => String(d.connectionStatus ?? "").toUpperCase() === "READY",
  ).length;
  const inactiveCount = devices.filter(
    (d) => String(d.connectionStatus ?? "").toUpperCase() === "INACTIVE",
  ).length;
  const brokenMaintenanceCount = devices.filter((d) =>
    ["BROKEN", "MAINTENANCE"].includes(
      String(d.connectionStatus ?? "").toUpperCase(),
    ),
  ).length;
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-12 w-12 border-b-2 border-primary-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          icon={Cpu}
          iconColor="text-blue-600"
          label="Tổng thiết bị"
          value={totalCount}
          valueSuffix="Thiết bị"
        />
        <StatCard
          icon={Wifi}
          iconColor="text-green-600"
          label="Trực tuyến"
          value={onlineCount}
          valueSuffix="Thiết bị"
          bgTint="bg-green-500/30"
        />
        <StatCard
          icon={Wifi}
          iconColor="text-blue-600"
          label="Sẵn sàng"
          value={readyCount}
          valueSuffix="Thiết bị"
          bgTint="bg-blue-500/30"
        />
        <StatCard
          icon={WifiOff}
          iconColor="text-red-600"
          label="Ngoại tuyến"
          value={offlineCount}
          valueSuffix="Thiết bị"
          bgTint="bg-red-500/30"
        />
        <StatCard
          icon={PowerOff}
          iconColor="text-gray-600"
          label="Ngừng hoạt động"
          value={inactiveCount}
          valueSuffix="Thiết bị"
          bgTint="bg-gray-400/30"
        />
        <StatCard
          icon={Wrench}
          iconColor="text-amber-600"
          label="Bảo trì/Hư hỏng"
          value={brokenMaintenanceCount}
          valueSuffix="Thiết bị"
          bgTint="bg-amber-500/30"
        />
      </div>

      {/* Filters - same style as Transactions */}
      <div
        lang="vi"
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input text-sm w-48"
          >
            <option value="all">Tất cả loại</option>
            <option value="CAMERA">Camera</option>
            <option value="BARRIER">Barie</option>
            <option value="LCD">LCD</option>
            <option value="SENSOR">Sensor</option>
          </select>

          <select
            value={filterLot}
            onChange={(e) => setFilterLot(e.target.value)}
            className="input text-sm w-48"
          >
            <option value="all">Tất cả bãi gửi</option>
            {lots.map((l) => (
              <option key={l.id ?? l.lotId} value={l.id ?? l.lotId}>
                {l.name ?? l.lotName}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input text-sm w-52"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="ONLINE">Trực tuyến</option>
            <option value="READY">Sẵn sàng</option>
            <option value="OFFLINE">Ngoại tuyến</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
            <option value="BROKEN_MAINTENANCE">Bảo trì / Hư hỏng</option>
          </select>

          <button
            onClick={() => {
              setSelected(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm thiết bị
          </button>
        </div>
      </div>

      {/* Split Layout: 60% Vận hành | 40% Cần xử lý */}
      <div className="flex flex-col lg:flex-row gap-0 lg:items-start">
        {/* Left: Cột Vận hành (60%) */}
        <div className="flex-1 lg:w-[60%] min-w-0 pr-0 lg:pr-6 lg:border-r border-gray-200 pt-4 lg:pt-0">
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-200 min-h-[52px]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <Wifi className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide leading-tight">
                  Đang vận hành
                </h3>
                <span className="text-xs text-gray-500 font-medium">
                  {operationalDevices.length} thiết bị
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOperationalTestConnection}
              disabled={
                testingOperationalConnection || operationalDevices.length === 0
              }
              className="btn btn-secondary flex items-center gap-2 text-sm flex-shrink-0"
              title="Kiểm tra kết nối cho mọi thiết bị đang vận hành (theo bộ lọc hiện tại)"
            >
              {testingOperationalConnection ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Radio className="w-4 h-4" />
              )}
              Kiểm tra kết nối
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {paginatedOperational.map((device) => (
              <div
                key={device.id ?? device.deviceId}
                className="w-full max-w-[360px] h-full"
              >
                <DeviceCard
                  device={device}
                  getConnStatus={getConnStatus}
                  getDeviceType={getDeviceType}
                  maintenanceDueSoon={maintenanceDueWithinWeek(
                    deviceNextMaintenance[
                      String(device.deviceId ?? device.id ?? "")
                    ],
                  )}
                  onDetail={() => {
                    setSelected(device);
                    setShowDetailModal(true);
                  }}
                  onUnassign={handleUnassign}
                  onMaintenance={handleMaintenance}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                  onExitMaintenance={handleExitMaintenance}
                  onEdit={() => {
                    setSelected(device);
                    setShowModal(true);
                  }}
                  onDelete={handleDelete}
                />
              </div>
            ))}
            {operationalDevices.length === 0 && (
              <div className="col-span-2 py-12 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                <Cpu className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Không có thiết bị vận hành
                </p>
              </div>
            )}
          </div>
          {operationalDevices.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Trang {pageOperational}/{totalPagesOp} (
                {operationalDevices.length} thiết bị)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPageOperational((p) => Math.max(1, p - 1))}
                  disabled={pageOperational <= 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPageOperational((p) => Math.min(totalPagesOp, p + 1))
                  }
                  disabled={pageOperational >= totalPagesOp}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Cột Cần xử lý (40%) - light warning background */}
        <div className="flex-1 lg:w-[40%] min-w-0 pl-0 lg:pl-6 bg-amber-50/30 lg:rounded-r-2xl -mx-4 px-4 lg:mx-0 lg:px-6 pt-4 lg:pt-0">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-200/60 min-h-[52px]">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-800 uppercase tracking-wide leading-tight">
                Cần xử lý / Bảo trì
              </h3>
              <span className="text-xs text-amber-700/80 font-medium">
                {needsActionDevices.length} thiết bị
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {paginatedNeedsAction.map((device) => (
              <div
                key={device.id ?? device.deviceId}
                className="w-full max-w-[360px] h-full"
              >
                <DeviceCard
                  device={device}
                  getConnStatus={getConnStatus}
                  getDeviceType={getDeviceType}
                  maintenanceDueSoon={maintenanceDueWithinWeek(
                    deviceNextMaintenance[
                      String(device.deviceId ?? device.id ?? "")
                    ],
                  )}
                  onDetail={() => {
                    setSelected(device);
                    setShowDetailModal(true);
                  }}
                  onUnassign={handleUnassign}
                  onMaintenance={handleMaintenance}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivate}
                  onExitMaintenance={handleExitMaintenance}
                  onEdit={() => {
                    setSelected(device);
                    setShowModal(true);
                  }}
                  onDelete={handleDelete}
                />
              </div>
            ))}
            {needsActionDevices.length === 0 && (
              <div className="col-span-2 py-12 text-center rounded-2xl border border-dashed border-amber-200/60 bg-white/50">
                <Construction className="w-10 h-10 text-amber-300 mx-auto mb-2" />
                <p className="text-sm text-amber-700/70">
                  Không có thiết bị cần xử lý
                </p>
              </div>
            )}
          </div>
          {needsActionDevices.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-amber-200/40">
              <span className="text-xs text-amber-700/80">
                Trang {pageNeedsAction}/{totalPagesNeeds} (
                {needsActionDevices.length} thiết bị)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPageNeedsAction((p) => Math.max(1, p - 1))}
                  disabled={pageNeedsAction <= 1}
                  className="p-2 rounded-lg border border-amber-200/60 hover:bg-amber-50/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPageNeedsAction((p) => Math.min(totalPagesNeeds, p + 1))
                  }
                  disabled={pageNeedsAction >= totalPagesNeeds}
                  className="p-2 rounded-lg border border-amber-200/60 hover:bg-amber-50/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <DeviceModal
          device={selected}
          onClose={() => setShowModal(false)}
          onSave={fetchDevices}
        />
      )}

      {showDetailModal && (
        <DeviceDetailModal
          device={selected}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false })}
        onConfirm={handleConfirmAction}
        title={
          confirmDialog.type === "deactivate"
            ? "Ngừng hoạt động thiết bị"
            : confirmDialog.type === "activate"
              ? "Bật lại thiết bị"
              : confirmDialog.type === "exitMaintenance"
                ? "Cho thiết bị hoạt động lại"
                : confirmDialog.type === "startMaintenance"
                  ? "Chuyển sang bảo trì"
                  : "Xác nhận"
        }
        description={
          confirmDialog.type === "deactivate"
            ? "Thiết bị sẽ chuyển sang trạng thái ngừng hoạt động. Bạn có chắc muốn tiếp tục?"
            : confirmDialog.type === "activate"
              ? "Thiết bị sẽ chuyển sang trạng thái hoạt động. Bạn có chắc muốn tiếp tục?"
              : confirmDialog.type === "exitMaintenance"
                ? "Thiết bị sẽ thoát trạng thái bảo trì và chuyển sang Sẵn sàng (vận hành lại). Bạn có chắc muốn tiếp tục?"
                : confirmDialog.type === "startMaintenance"
                  ? "Thiết bị sẽ chuyển sang trạng thái bảo trì và hiển thị trong cột Cần xử lý. Bạn có chắc muốn tiếp tục?"
                  : "Bạn có chắc muốn thực hiện thao tác này?"
        }
        confirmLabel="Xác nhận"
        variant={
          confirmDialog.type === "deactivate"
            ? "warning"
            : confirmDialog.type === "activate"
              ? "warning"
              : confirmDialog.type === "exitMaintenance"
                ? "warning"
                : confirmDialog.type === "startMaintenance"
                  ? "warning"
                  : "destructive"
        }
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-16">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function DeviceCard({
  device,
  getConnStatus,
  getDeviceType,
  maintenanceDueSoon = false,
  onDetail,
  onUnassign,
  onMaintenance,
  onActivate,
  onDeactivate,
  onExitMaintenance,
  onEdit,
  onDelete,
}) {
  const conn = getConnStatus(device.connectionStatus);
  const dtype = getDeviceType(device.deviceType);
  const DevIcon = dtype.icon;
  const ConnIcon = conn.icon;
  const connUpper = String(device.connectionStatus ?? "").toUpperCase();
  const isInactive = connUpper === "INACTIVE";
  const isMaintenance = connUpper === "MAINTENANCE";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const runAndClose = (fn) => {
    setMenuOpen(false);
    fn?.();
  };

  return (
    <div className="bg-white rounded-3xl shadow border p-6 w-full min-w-0 h-full flex flex-col">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex gap-3 items-center min-w-0 flex-1">
          <DevIcon className="w-8 h-8 flex-shrink-0 text-blue-600" />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight whitespace-normal break-words">
              {device.deviceName || device.name}
            </h3>
            <span
              className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ${dtype.color}`}
            >
              {dtype.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {maintenanceDueSoon && (
            <span
              className="inline-flex text-amber-600"
              title="Sắp tới hạn bảo trì (trong 7 ngày)"
              aria-label="Sắp tới hạn bảo trì trong 7 ngày"
            >
              <Flag className="w-5 h-5" strokeWidth={2} fill="currentColor" />
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full whitespace-nowrap leading-none ${conn.color}`}
          >
            <ConnIcon className="w-3.5 h-3.5 flex-shrink-0" />
            {conn.label}
          </span>
        </div>
      </div>
      <div className="space-y-1 text-sm mb-4 flex-1">
        {device.gateName && <Row label="Cổng" value={device.gateName} />}
        {device.ipAddress && <Row label="IP" value={device.ipAddress} />}
        {device.model && <Row label="Model" value={device.model} />}
        {device.macAddress && <Row label="MAC" value={device.macAddress} />}
      </div>
      <div className="flex gap-2 pt-3 border-t mt-auto">
        <button onClick={onDetail} className="flex-1 btn btn-secondary text-sm">
          <EyeTwoTone /> Chi tiết
        </button>
        {/* Kebab menu: gom các action ít dùng */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Thao tác khác"
            aria-label="Thao tác khác"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute left-full bottom-0 ml-2 z-20 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => runAndClose(() => onMaintenance?.(device))}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-amber-50 hover:text-amber-700"
              >
                <Wrench className="w-4 h-4" /> Bảo trì
              </button>
              {isMaintenance ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runAndClose(() => onExitMaintenance?.(device))}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-green-50 hover:text-green-700"
                >
                  <Power className="w-4 h-4" /> Hoạt động lại sau bảo trì
                </button>
              ) : isInactive ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runAndClose(() => onActivate?.(device))}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-green-50 hover:text-green-700"
                >
                  <Power className="w-4 h-4" /> Bật lại
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runAndClose(() => onDeactivate?.(device))}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100"
                >
                  <PowerOff className="w-4 h-4" /> Ngừng hoạt động
                </button>
              )}
              {device.gateName && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runAndClose(() => onUnassign?.(device))}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-orange-50 hover:text-orange-700"
                >
                  <Unlink className="w-4 h-4" /> Gỡ khỏi bãi
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => runAndClose(() => onEdit?.(device))}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <Edit3 className="w-4 h-4" /> Chỉnh sửa
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                role="menuitem"
                onClick={() => runAndClose(() => onDelete?.(device))}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" /> Xóa thiết bị
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IoTDevices;
