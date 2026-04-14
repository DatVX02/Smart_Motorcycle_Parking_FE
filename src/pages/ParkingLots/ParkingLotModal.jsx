import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { format, parse } from "date-fns";
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Power,
  PowerOff,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import parkingLotService from "../../services/parkingLotService";
import gateService from "../../services/gateService";
import iotDeviceService from "../../services/iotDeviceService";
import aiConfigService from "../../services/aiConfigService";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import { getDefaultDemoSample } from "./parkingLotDemoData";

const createMaintenanceForDevice = async (deviceId) => {
  if (!deviceId) return;
  try {
    await DeviceMaintenanceService.generateSchedule(deviceId);
  } catch (err) {
    console.warn("Tạo lịch bảo trì thất bại:", err);
  }
};

const GATE_TYPE_OPTIONS = [
  { value: "entry", label: "Cổng vào" },
  { value: "exit", label: "Cổng ra" },
];

const DEVICE_TYPE_OPTIONS = [
  { value: "CAMERA", label: "Camera" },
  { value: "BARRIER", label: "Barie" },
  { value: "LCD", label: "LCD" },
  { value: "SENSOR", label: "Sensor" },
];

const DEVICE_TYPE_LABEL = {
  CAMERA: "Camera",
  BARRIER: "Barie",
  LCD: "LCD",
  SENSOR: "Sensor",
};

const normalizeDeviceType = (value) => {
  const v = String(value || "")
    .trim()
    .toUpperCase();
  if (!v) return "";
  if (v === "LPR" || v === "CAMERA" || v === "LPR_CAMERA") return "CAMERA";
  if (v === "BARRIER" || v === "BARIE" || v === "BARRIE") return "BARRIER";
  if (v === "LCD" || v === "DISPLAY" || v === "SCREEN" || v === "MONITOR")
    return "LCD";
  if (
    v === "SENSOR" ||
    v === "IR_SENSOR" ||
    v === "LOOP_SENSOR" ||
    v === "ULTRASONIC_SENSOR" ||
    v === "MOTION_SENSOR" ||
    v === "HC-SR04" ||
    v === "HC_SR04" ||
    v === "HCSR04" ||
    v === "ULTRASONIC"
  )
    return "SENSOR";
  return v;
};

const pickDeviceId = (device) =>
  device?.deviceId ??
  device?.id ??
  device?.device_id ??
  device?.iotDeviceId ??
  null;

const isEmptyBindingValue = (value) => {
  if (value == null) return true;
  const token = String(value).trim().toLowerCase();
  if (!token) return true;
  return (
    token === "null" ||
    token === "undefined" ||
    token === "none" ||
    token === "n/a" ||
    token === "00000000-0000-0000-0000-000000000000"
  );
};

const isUnassignedDevice = (device) => {
  const assignmentStatus = String(
    device?.assignmentStatus ??
      device?.bindingStatus ??
      device?.assignment_state ??
      "",
  ).toLowerCase();
  if (
    assignmentStatus.includes("unassigned") ||
    assignmentStatus.includes("available") ||
    assignmentStatus.includes("free")
  ) {
    return true;
  }
  if (
    assignmentStatus.includes("assigned") ||
    assignmentStatus.includes("bound") ||
    assignmentStatus.includes("inuse") ||
    assignmentStatus.includes("in_use")
  ) {
    return false;
  }

  const gateId =
    device?.gateId ??
    device?.gate_id ??
    device?.gate?.gateId ??
    device?.gate?.id ??
    device?.assignedGateId;
  const gateName =
    device?.gateName ?? device?.gate_name ?? device?.gate?.gateName ?? "";

  if (typeof device?.isAssigned === "boolean") return !device.isAssigned;
  if (typeof device?.assigned === "boolean") return !device.assigned;

  // Thực tế nghiệp vụ: thiết bị "đã gán" khi đã gắn vào một cổng.
  // Vì vậy chỉ cần chưa có gateId/gateName thì vẫn cho phép chọn.
  if (isEmptyBindingValue(gateId) && isEmptyBindingValue(gateName)) {
    return true;
  }

  return false;
};

const normalizeGateType = (value) => {
  const v = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!v) return "";

  if (["two_way", "twoway", "both", "bidirectional"].includes(v)) {
    return "two_way";
  }
  if (["entry", "in", "incoming", "entrance", "vao", "input"].includes(v)) {
    return "entry";
  }
  if (["exit", "out", "outgoing", "ra", "output"].includes(v)) {
    return "exit";
  }
  return "";
};

const normalizeDirectionText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const inferGateTypeFromText = (value) => {
  const text = normalizeDirectionText(value);
  if (!text) return "";

  const hasEntryHint =
    /(^|[^a-z0-9])(entry|entrance|in|vao|input)([^a-z0-9]|$)/i.test(text) ||
    text.includes("cong vao");
  const hasExitHint =
    /(^|[^a-z0-9])(exit|out|ra|output)([^a-z0-9]|$)/i.test(text) ||
    text.includes("cong ra");

  if (hasEntryHint && hasExitHint) return "two_way";
  if (hasEntryHint) return "entry";
  if (hasExitHint) return "exit";
  return "";
};

const resolveDeviceGateType = (device) => {
  const directCandidates = [
    device?.gateType,
    device?.direction,
    device?.deviceDirection,
    device?.laneDirection,
    device?.flowDirection,
    device?.ioDirection,
    device?.position,
    device?.side,
    device?.gate?.gateType,
    device?.gate?.direction,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeGateType(candidate);
    if (normalized) return normalized;
  }

  const textCandidates = [
    device?.deviceCode,
    device?.deviceName,
    device?.name,
    device?.gateName,
    device?.gate?.gateName,
    device?.topic,
    device?.path,
  ];

  for (const candidate of textCandidates) {
    const inferred = inferGateTypeFromText(candidate);
    if (inferred) return inferred;
  }

  return "";
};

const isDeviceCompatibleWithGateType = (device, gateType) => {
  const normalizedGateType = normalizeGateType(gateType);
  if (!normalizedGateType || normalizedGateType === "two_way") return true;

  const deviceGateType = normalizeGateType(device?.gateType);
  if (!deviceGateType)
    return normalizeDeviceType(device?.deviceType) === "CAMERA";
  if (deviceGateType === "two_way") return true;
  return deviceGateType === normalizedGateType;
};

const hasAnyDeviceInput = (device) => {
  if (!device || typeof device !== "object") return false;
  return Boolean(
    (device.existingDeviceId || "").trim() ||
    (device.deviceCode || "").trim() ||
    (device.deviceName || "").trim() ||
    (device.model || "").trim() ||
    (device.ipAddress || "").trim() ||
    (device.macAddress || "").trim() ||
    (device.firmwareVersion || "").trim() ||
    device.deviceType,
  );
};

const isConfiguredDevice = (device) => {
  if (!device || typeof device !== "object") return false;
  const existingId = (device.existingDeviceId || "").trim();
  if (existingId) return true;

  return Boolean(
    device.deviceType &&
    (device.model || "").trim() &&
    (device.ipAddress || "").trim(),
  );
};

const isConfiguredCameraDevice = (device) =>
  normalizeDeviceType(device?.deviceType) === "CAMERA" &&
  isConfiguredDevice(device);

const newDevice = () => ({
  _id: crypto.randomUUID(),
  existingDeviceId: "",
  deviceCode: "",
  deviceName: "",
  deviceType: "",
  model: "",
  ipAddress: "",
  macAddress: "",
  connectionStatus: "ONLINE",
  firmwareVersion: "",
});

const newGate = () => ({
  _id: crypto.randomUUID(),
  gateName: "",
  gateType: "",
  isActive: true,
  devices: [newDevice()],
});

const getDefaultFormData = () => ({
  lotName: "",
  fullAddress: "",
  totalCapacity: "",
  hourlyRate: "",
  monthlyRate: "",
  openingTime: "",
  closingTime: "",
  is24h: false,
  scheduledActivationDate: "",
  gates: [newGate()],
  licensePlateThreshold: "70",
  faceRecognitionThreshold: "70",
});
// Backend lưu 0.0–1.0, UI hiển thị 0–100%
const toPercent = (v) =>
  v == null ? null : v <= 1 ? Math.round(v * 100) : Math.round(v);
const toDecimal = (v) =>
  v == null ? null : v > 1 ? parseFloat((v / 100).toFixed(4)) : parseFloat(v);
const toDigitsOnly = (value) => String(value ?? "").replace(/\D/g, "");
const formatViThousands = (value) => {
  const digits = toDigitsOnly(value);
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/** Input ngày hiển thị theo format dd/mm/yyyy (ngày/tháng/năm) */
function DateInputDDMMYYYY({ label, optionalLabel, value, min, onChange }) {
  const displayValue =
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? (() => {
          try {
            const d = parse(value, "yyyy-MM-dd", new Date());
            return format(d, "dd/MM/yyyy");
          } catch {
            return value;
          }
        })()
      : "";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {optionalLabel && (
          <span className="ml-1 text-gray-400 text-xs font-normal">
            {optionalLabel}
          </span>
        )}
      </label>
      <div className="relative">
        <div
          className={`input flex items-center gap-2 min-h-[42px] ${
            displayValue ? "text-gray-900" : "text-gray-400"
          }`}
        >
          <span>{displayValue || "dd/mm/yyyy"}</span>
          <Calendar className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
        </div>
        <input
          type="date"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={label}
        />
      </div>
    </div>
  );
}

function ParkingLotModal({ lot, onClose, onSave }) {
  const isEditMode = Boolean(lot?.id);
  const [loading, setLoading] = useState(!!lot);
  const [formData, setFormData] = useState(getDefaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [loadingAvailableDevices, setLoadingAvailableDevices] = useState(false);
  const [deviceSelectorFallback, setDeviceSelectorFallback] = useState(false);
  const [errors, setErrors] = useState({});
  const [collapsed, setCollapsed] = useState({}); // gate _id → bool
  const [collapsedDevices, setCollapsedDevices] = useState({}); // device _id → bool
  const [deletingGate, setDeletingGate] = useState(null); // gate _id đang xóa
  const [togglingGate, setTogglingGate] = useState(null); // gate _id đang chuyển trạng thái
  const aiConfigIdRef = useRef(null); // lưu configId để update sau
  const hasConfiguredCamera = formData.gates.some((g) =>
    g.devices.some((d) => isConfiguredCameraDevice(d)),
  );

  useEffect(() => {
    let cancelled = false;
    const loadAvailableDevices = async () => {
      try {
        setLoadingAvailableDevices(true);
        const all = await iotDeviceService.getAll();
        if (cancelled) return;

        const allWithId = (Array.isArray(all) ? all : []).filter((d) =>
          pickDeviceId(d),
        );
        const unassignedOnly = allWithId.filter(isUnassignedDevice);
        const source = unassignedOnly.length > 0 ? unassignedOnly : allWithId;
        setDeviceSelectorFallback(
          allWithId.length > 0 && unassignedOnly.length === 0,
        );

        const options = source
          .filter((d) => pickDeviceId(d))
          .map((d) => {
            const id = pickDeviceId(d);
            const deviceCode = d.deviceCode || "";
            const deviceName = d.deviceName || d.name || "";
            const deviceType = normalizeDeviceType(d.deviceType || d.type);
            const gateType = resolveDeviceGateType(d);
            return {
              id,
              deviceCode,
              deviceName,
              deviceType,
              gateType,
              model: d.model || "",
              ipAddress: d.ipAddress || "",
              macAddress: d.macAddress || "",
              firmwareVersion: d.firmwareVersion || "",
              connectionStatus: d.connectionStatus || "ONLINE",
              label:
                deviceCode || deviceName
                  ? `${deviceCode || "NO-CODE"} - ${deviceName || "Chưa có tên"}`
                  : `Thiết bị ${id}`,
            };
          });

        setAvailableDevices(options);
      } catch (err) {
        console.warn("Không tải được danh sách thiết bị có sẵn:", err);
      } finally {
        if (!cancelled) setLoadingAvailableDevices(false);
      }
    };

    loadAvailableDevices();
    return () => {
      cancelled = true;
    };
  }, [lot?.id]);

  useEffect(() => {
    const fetchLotDetail = async () => {
      if (!lot?.id) {
        setFormData(getDefaultFormData());
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const lotId = lot.id;

        // Fetch detail + gates + aiConfig by lot in parallel
        const [detail, apiGates, aiConfigData, devicesByLotData] =
          await Promise.all([
            parkingLotService.getParkingLotDetail(lotId),
            gateService.getByLot(lotId).catch(() => []),
            aiConfigService.getByLot(lotId).catch(() => null),
            iotDeviceService.getByLot(lotId).catch(() => []),
          ]);

        const aiConfig =
          aiConfigData || detail.cameraSetup?.aiConfig || detail.aiConfig || {};

        // Lưu configId để dùng khi update
        aiConfigIdRef.current =
          aiConfigData?.configId ??
          aiConfigData?.id ??
          aiConfigData?.aiConfigId ??
          null;
        const lotInfo = detail.lotInfo || detail;

        // Build gateId → { gateName, gateType } from the gates endpoint
        const normalizeGateType = (v) =>
          (v || "").toLowerCase().replace("both", "two_way") || "";
        const gateNameMap = new Map();
        const gateIdByName = new Map();
        apiGates.forEach((g) => {
          const id = g.gateId ?? g.id;
          const idKey = String(id ?? "");
          const nameKey = String(g.gateName || g.name || "")
            .trim()
            .toLowerCase();
          if (id) {
            gateNameMap.set(idKey, {
              gateName: g.gateName || g.name || "",
              gateType: normalizeGateType(g.gateType || g.type),
              isActive: g.isActive !== false,
            });
            if (nameKey) gateIdByName.set(nameKey, idKey);
          }
        });

        // Group devices by gateId → one gate entry per unique gateId
        const gateMap = new Map();
        const detailDevices = Array.isArray(detail.devices)
          ? detail.devices
          : [];
        const fallbackDevices = Array.isArray(devicesByLotData)
          ? devicesByLotData
          : [];
        const rawDev =
          detailDevices.length > 0 ? detailDevices : fallbackDevices;

        rawDev.forEach((d) => {
          const directGateId =
            d.gateId ??
            d.gate_id ??
            d.gate?.gateId ??
            d.gate?.id ??
            d.assignedGateId;
          const fallbackGateId = gateIdByName.get(
            String(d.gateName ?? d.gate?.gateName ?? "")
              .trim()
              .toLowerCase(),
          );
          const gId = directGateId ?? fallbackGateId;
          if (!gId) return;
          const gateKey = String(gId);
          const gateInfo = gateNameMap.get(gateKey);

          if (!gateMap.has(gateKey)) {
            gateMap.set(gateKey, {
              _id: gateKey,
              _persisted: true,
              gateName:
                gateInfo?.gateName ?? d.gateName ?? d.gate?.gateName ?? "",
              gateType: normalizeGateType(gateInfo?.gateType),
              isActive: gateInfo?.isActive !== false,
              devices: [],
            });
          }
          gateMap.get(gateKey).devices.push({
            _id: d.deviceId ?? d.id ?? crypto.randomUUID(),
            _persisted: true,
            existingDeviceId: d.deviceId ?? d.id ?? "",
            deviceCode: d.deviceCode || "",
            deviceName: d.deviceName || "",
            deviceType: normalizeDeviceType(d.deviceType || d.type),
            model: d.model || "",
            ipAddress: d.ipAddress || "",
            macAddress: d.macAddress || "",
            connectionStatus: d.connectionStatus || "ONLINE",
            firmwareVersion: d.firmwareVersion || "",
          });
        });

        // Also add gates that exist but have no devices yet
        apiGates.forEach((g) => {
          const gId = g.gateId ?? g.id;
          const gateKey = String(gId ?? "");
          if (gId && !gateMap.has(gateKey)) {
            gateMap.set(gateKey, {
              _id: gateKey,
              _persisted: true,
              gateName: g.gateName || g.name || "",
              gateType: normalizeGateType(g.gateType || g.type),
              isActive: g.isActive !== false,
              devices: [newDevice()],
            });
          }
        });

        // Chỉ hiển thị cổng thực sự có trong apiGates; bỏ qua cổng "ảo" từ thiết bị không có gateId
        const apiGateIds = new Set(
          (apiGates || [])
            .map((g) => String(g.gateId ?? g.id ?? ""))
            .filter(Boolean),
        );
        const filtered =
          apiGateIds.size > 0
            ? [...gateMap.values()].filter(
                (g) => g._id !== "no-gate" && apiGateIds.has(String(g._id)),
              )
            : [...gateMap.values()].filter((g) => g._id !== "no-gate");
        const mergedGates = filtered.length > 0 ? filtered : [newGate()];

        // Stringify date to YYYY-MM-DD for <input type="date">
        const toDateValue = (v) => {
          if (!v) return "";
          const d = new Date(v);
          return isNaN(d) ? "" : d.toISOString().substring(0, 10);
        };

        setFormData({
          lotName: lotInfo.lotName || lot.name || "",
          fullAddress: lotInfo.fullAddress || lot.location || "",
          totalCapacity: lotInfo.totalCapacity || lot.totalSpots || "",
          hourlyRate: lotInfo.hourlyRate ?? "",
          monthlyRate: lotInfo.monthlyRate ?? "",
          openingTime: lotInfo.openingTime?.substring(0, 5) || "08:00",
          closingTime: lotInfo.closingTime?.substring(0, 5) || "22:00",
          is24h: lotInfo.is24h || false,
          scheduledActivationDate: toDateValue(lotInfo.scheduledActivationDate),
          gates: mergedGates,
          licensePlateThreshold:
            toPercent(
              aiConfig.licensePlateConfidenceThreshold ??
                aiConfig.licensePlateThreshold,
            ) ?? 70,
          faceRecognitionThreshold:
            toPercent(
              aiConfig.faceRecognitionConfidenceThreshold ??
                aiConfig.faceRecognitionThreshold,
            ) ?? 70,
        });
      } catch (err) {
        console.error("Error fetching parking lot detail:", err);
        toast.error("Không thể tải thông tin chi tiết bãi gửi xe");
      } finally {
        setLoading(false);
      }
    };
    fetchLotDetail();
  }, [lot?.id, lot?.name, lot?.location, lot?.totalSpots]);

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field])
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
  };

  const setNumericField = (field, value) => {
    setField(field, toDigitsOnly(value));
  };

  const addGate = () =>
    setFormData((prev) => ({ ...prev, gates: [...prev.gates, newGate()] }));

  const getDeviceGateId = (device) =>
    device?.gateId ??
    device?.gate_id ??
    device?.gate?.gateId ??
    device?.gate?.id ??
    device?.assignedGateId ??
    null;

  const removeGate = async (gId) => {
    const gate = formData.gates.find((g) => g._id === gId);
    if (gate?._persisted) {
      setDeletingGate(gId);
      try {
        const lotId = lot?.id;
        const persistedGateCount = formData.gates.filter(
          (g) => g?._persisted,
        ).length;
        const shouldCleanupWholeLotDevices = persistedGateCount <= 1;

        let lotDevicesSnapshot = [];
        let gateDevices = [];

        if (lotId) {
          try {
            const devicesByLot = await iotDeviceService.getByLot(lotId);
            lotDevicesSnapshot = Array.isArray(devicesByLot)
              ? devicesByLot
              : [];
            gateDevices = lotDevicesSnapshot
              .filter(
                (d) => String(getDeviceGateId(d) ?? "") === String(gId ?? ""),
              )
              .map((d) => ({
                id: d?.deviceId ?? d?.id,
                name: d?.deviceName ?? d?.name ?? d?.deviceCode,
              }))
              .filter((d) => d.id);
          } catch (loadErr) {
            console.warn(
              "Không tải được thiết bị theo bãi để xóa cổng:",
              loadErr,
            );
          }
        }

        let cleanupDevices = gateDevices;
        if (shouldCleanupWholeLotDevices && lotDevicesSnapshot.length > 0) {
          cleanupDevices = lotDevicesSnapshot
            .map((d) => ({
              id: d?.deviceId ?? d?.id,
              name: d?.deviceName ?? d?.name ?? d?.deviceCode,
            }))
            .filter((d) => d.id);
        }

        if (cleanupDevices.length === 0 && Array.isArray(gate.devices)) {
          cleanupDevices = gate.devices
            .map((d) => ({
              id: d?.existingDeviceId || d?._id,
              name: d?.deviceName || d?.deviceCode,
            }))
            .filter((d) => d.id);
        }

        const gateDeviceIds = [
          ...new Set(cleanupDevices.map((d) => String(d.id))),
        ];
        if (gateDeviceIds.length > 0) {
          const maintResult =
            await DeviceMaintenanceService.deleteAllSchedulesForDevices(
              gateDeviceIds,
            );
          if (maintResult.total === -1) {
            toast.error(
              "Không tải được lịch bảo trì của thiết bị trong cổng. Vui lòng thử lại.",
              { duration: 6000 },
            );
            return;
          }

          const failedDevices = [];
          let deletedDevices = 0;

          for (const dev of cleanupDevices) {
            const devId = String(dev.id);
            try {
              await iotDeviceService.delete(devId);
              deletedDevices += 1;
            } catch {
              try {
                await iotDeviceService.unassign(devId);
                await iotDeviceService.delete(devId);
                deletedDevices += 1;
              } catch {
                failedDevices.push(dev.name || devId);
              }
            }
          }

          if (failedDevices.length > 0) {
            toast.error(
              `Không thể xóa hết thiết bị trong cổng: ${failedDevices.join(", ")}. Vui lòng xử lý thiết bị trước rồi thử lại.`,
              { duration: 8000 },
            );
            return;
          }

          if (deletedDevices > 0 || maintResult.deleted > 0) {
            toast.success(
              shouldCleanupWholeLotDevices
                ? `Đã dọn toàn bộ ${deletedDevices} thiết bị và ${maintResult.deleted} lịch bảo trì của bãi.`
                : `Đã dọn ${deletedDevices} thiết bị và ${maintResult.deleted} lịch bảo trì của cổng.`,
            );
          }
        }

        await gateService.delete(gId);
        toast.success(`Đã xóa cổng "${gate.gateName || gId}" thành công`);
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.title ||
          "Không thể xóa cổng. Vui lòng thử lại.";
        toast.error(msg, { duration: 5000 });
        return;
      } finally {
        setDeletingGate(null);
      }
    }
    setFormData((prev) => ({
      ...prev,
      gates: prev.gates.filter((g) => g._id !== gId),
    }));
  };

  const toggleGateStatus = async (gId) => {
    const gate = formData.gates.find((g) => g._id === gId);
    if (!gate?._persisted) return;
    const newActive = !(gate.isActive !== false);
    setTogglingGate(gId);
    try {
      await gateService.update(gId, {
        gateName: gate.gateName?.trim() || gate.gateName,
        gateType: gate.gateType,
        isActive: newActive,
      });
      updateGate(gId, "isActive", newActive);
      toast.success(
        newActive
          ? `Đã bật cổng "${gate.gateName || gId}"`
          : `Đã tắt cổng "${gate.gateName || gId}"`,
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        "Không thể chuyển trạng thái cổng.";
      toast.error(msg, { duration: 5000 });
    } finally {
      setTogglingGate(null);
    }
  };

  const updateGate = (gId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      gates: prev.gates.map((g) =>
        g._id === gId
          ? {
              ...g,
              [field]: value,
              devices:
                field === "gateType"
                  ? g.devices.map((d) => {
                      if (!d.existingDeviceId) return d;
                      const selected = availableDevices.find(
                        (opt) => opt.id === d.existingDeviceId,
                      );
                      if (
                        selected &&
                        !isDeviceCompatibleWithGateType(selected, value)
                      ) {
                        return {
                          ...d,
                          existingDeviceId: "",
                          deviceCode: "",
                          deviceName: "",
                          deviceType: "",
                          model: "",
                          ipAddress: "",
                          macAddress: "",
                          connectionStatus: "ONLINE",
                          firmwareVersion: "",
                        };
                      }
                      return d;
                    })
                  : g.devices,
            }
          : g,
      ),
    }));
    const key = `gate_${gId}_${field}`;
    if (errors[key])
      setErrors((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
  };

  const toggleCollapse = (gId) =>
    setCollapsed((prev) => ({ ...prev, [gId]: !prev[gId] }));

  const toggleDeviceCollapse = (dId) =>
    setCollapsedDevices((prev) => ({ ...prev, [dId]: !prev[dId] }));

  const handleAutoFill = () => {
    const sample = getDefaultDemoSample();
    setFormData((prev) => ({
      ...getDefaultFormData(),
      lotName: sample.lotName ?? "",
      fullAddress: sample.fullAddress ?? "",
      totalCapacity: sample.totalCapacity ?? "",
      hourlyRate: sample.hourlyRate ?? "",
      monthlyRate: sample.monthlyRate ?? "",
      openingTime: sample.openingTime ?? "",
      closingTime: sample.closingTime ?? "",
      is24h: !!sample.is24h,
      gates: prev.gates,
      licensePlateThreshold: sample.licensePlateThreshold ?? "80",
      faceRecognitionThreshold: sample.faceRecognitionThreshold ?? "80",
      scheduledActivationDate: "",
    }));
    setCollapsed({});
    setErrors({});
    toast.success(`Đã điền thông tin bãi: ${sample.lotName}`);
  };

  const addDevice = (gId) =>
    setFormData((prev) => ({
      ...prev,
      gates: prev.gates.map((g) =>
        g._id === gId ? { ...g, devices: [...g.devices, newDevice()] } : g,
      ),
    }));

  const removeDevice = (gId, dId) => {
    setFormData((prev) => ({
      ...prev,
      gates: prev.gates.map((g) =>
        g._id === gId
          ? { ...g, devices: g.devices.filter((d) => d._id !== dId) }
          : g,
      ),
    }));
    setCollapsedDevices((prev) => {
      const next = { ...prev };
      delete next[dId];
      return next;
    });
  };

  const updateDevice = (gId, dId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      gates: prev.gates.map((g) =>
        g._id === gId
          ? {
              ...g,
              devices: g.devices.map((d) => {
                if (d._id !== dId) return d;

                if (field === "deviceType" && d.existingDeviceId) {
                  const selectedExisting = availableDevices.find(
                    (opt) => opt.id === d.existingDeviceId,
                  );
                  const nextType = normalizeDeviceType(value);
                  const selectedType = normalizeDeviceType(
                    selectedExisting?.deviceType,
                  );

                  if (nextType && selectedType && nextType !== selectedType) {
                    return {
                      ...d,
                      deviceType: value,
                      existingDeviceId: "",
                      deviceCode: "",
                      deviceName: "",
                      model: "",
                      ipAddress: "",
                      macAddress: "",
                      connectionStatus: "ONLINE",
                      firmwareVersion: "",
                    };
                  }
                }

                return { ...d, [field]: value };
              }),
            }
          : g,
      ),
    }));
    const key = `dev_${dId}_${field}`;
    if (errors[key])
      setErrors((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
  };

  const isExistingDeviceSelectedElsewhere = (deviceId, currentDeviceId) =>
    formData.gates.some((g) =>
      g.devices.some(
        (d) => d._id !== currentDeviceId && d.existingDeviceId === deviceId,
      ),
    );

  const handleExistingDeviceChange = (gId, dId, existingDeviceId) => {
    const selected = availableDevices.find((d) => d.id === existingDeviceId);
    setFormData((prev) => ({
      ...prev,
      gates: prev.gates.map((g) =>
        g._id === gId
          ? {
              ...g,
              devices: g.devices.map((d) => {
                if (d._id !== dId) return d;
                if (!existingDeviceId) {
                  return {
                    ...d,
                    existingDeviceId: "",
                    deviceCode: "",
                    deviceName: "",
                    deviceType: "",
                    model: "",
                    ipAddress: "",
                    macAddress: "",
                    connectionStatus: "ONLINE",
                    firmwareVersion: "",
                  };
                }
                return {
                  ...d,
                  existingDeviceId,
                  deviceCode: selected?.deviceCode || "",
                  deviceName: selected?.deviceName || "",
                  deviceType: selected?.deviceType || "",
                  model: selected?.model || "",
                  ipAddress: selected?.ipAddress || "",
                  macAddress: selected?.macAddress || "",
                  connectionStatus: selected?.connectionStatus || "ONLINE",
                  firmwareVersion: selected?.firmwareVersion || "",
                };
              }),
            }
          : g,
      ),
    }));

    setErrors((prev) => {
      const n = { ...prev };
      delete n[`dev_${dId}_existingDeviceId`];
      delete n[`dev_${dId}_deviceCode`];
      delete n[`dev_${dId}_deviceType`];
      delete n[`dev_${dId}_model`];
      delete n[`dev_${dId}_ipAddress`];
      delete n[`dev_${dId}_macAddress`];
      return n;
    });
  };

  const validateForm = () => {
    const newErrors = {};
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

    if (!formData.lotName || formData.lotName.trim().length < 3)
      newErrors.lotName = "Tên bãi gửi phải có ít nhất 3 ký tự";

    if (!formData.fullAddress || formData.fullAddress.trim().length < 10)
      newErrors.fullAddress = "Địa chỉ phải có ít nhất 10 ký tự";

    if (!formData.totalCapacity || Number(formData.totalCapacity) < 1)
      newErrors.totalCapacity = "Số chỗ gửi phải lớn hơn 0";

    if (formData.hourlyRate === "" || Number(formData.hourlyRate) < 0)
      newErrors.hourlyRate = "Vui lòng nhập giá theo giờ hợp lệ";

    if (formData.monthlyRate !== "" && Number(formData.monthlyRate) < 0)
      newErrors.monthlyRate = "Giá không hợp lệ";

    if (!formData.is24h) {
      const { openingTime: o, closingTime: c } = formData;
      if (!o || !c) newErrors.time = "Vui lòng chọn giờ mở cửa và đóng cửa";
      else if (o >= c) newErrors.time = "Giờ mở cửa phải trước giờ đóng cửa";
    }

    if (!lot) {
      if (formData.gates.length !== 2) {
        newErrors.gatesStructure =
          "Tạo mới bắt buộc có đúng 2 cổng: 1 cổng vào và 1 cổng ra.";
      }

      const normalizedGateTypes = formData.gates.map((g) =>
        normalizeGateType(g.gateType),
      );
      const entryCount = normalizedGateTypes.filter(
        (gt) => gt === "entry",
      ).length;
      const exitCount = normalizedGateTypes.filter(
        (gt) => gt === "exit",
      ).length;

      if (entryCount !== 1 || exitCount !== 1) {
        newErrors.gatesStructure =
          "Cần đủ 1 cổng vào và 1 cổng ra. Không dùng cổng 2 chiều khi tạo mới.";
      }

      formData.gates.forEach((g) => {
        const configuredDeviceCount = g.devices.filter((d) =>
          isConfiguredDevice(d),
        ).length;
        if (configuredDeviceCount < 4) {
          newErrors[`gate_${g._id}_devicesCount`] =
            "Mỗi cổng cần tối thiểu 6 thiết bị (2 sensor, 2 camera, 1 barie, 1 lcd).";
        }
      });
    }

    // Uniqueness maps across ALL devices of ALL gates
    const seenIps = new Map();
    const seenCodes = new Map();
    const seenMacs = new Map();
    const seenExisting = new Map();

    formData.gates.forEach((g) => {
      if (!g.gateName.trim())
        newErrors[`gate_${g._id}_gateName`] = "Vui lòng nhập tên cổng";
      if (!g.gateType)
        newErrors[`gate_${g._id}_gateType`] = "Vui lòng chọn loại cổng";

      g.devices.forEach((d) => {
        const existingId = (d.existingDeviceId || "").trim();
        const ip = (d.ipAddress || "").trim();
        const code = (d.deviceCode || "").trim();
        const mac = (d.macAddress || "").trim().toUpperCase();

        if (existingId) {
          if (seenExisting.has(existingId)) {
            newErrors[`dev_${seenExisting.get(existingId)}_existingDeviceId`] =
              "Thiết bị có sẵn đã được chọn ở cổng khác";
            newErrors[`dev_${d._id}_existingDeviceId`] =
              "Thiết bị có sẵn đã được chọn ở cổng khác";
          } else {
            seenExisting.set(existingId, d._id);
          }
        }

        if (ip) {
          if (!ipRegex.test(ip)) {
            newErrors[`dev_${d._id}_ipAddress`] =
              "IP không hợp lệ (VD: 192.168.1.100)";
          } else if (seenIps.has(ip)) {
            newErrors[`dev_${seenIps.get(ip)}_ipAddress`] =
              "IP bị trùng với thiết bị khác";
            newErrors[`dev_${d._id}_ipAddress`] =
              "IP bị trùng với thiết bị khác";
          } else {
            seenIps.set(ip, d._id);
          }
        }

        if (code) {
          if (seenCodes.has(code)) {
            newErrors[`dev_${seenCodes.get(code)}_deviceCode`] =
              "Mã thiết bị bị trùng";
            newErrors[`dev_${d._id}_deviceCode`] = "Mã thiết bị bị trùng";
          } else {
            seenCodes.set(code, d._id);
          }
        }

        if (mac) {
          if (!macRegex.test(mac)) {
            newErrors[`dev_${d._id}_macAddress`] =
              "MAC không hợp lệ (VD: AA:BB:CC:DD:EE:FF)";
          } else if (seenMacs.has(mac)) {
            newErrors[`dev_${seenMacs.get(mac)}_macAddress`] =
              "MAC bị trùng với thiết bị khác";
            newErrors[`dev_${d._id}_macAddress`] =
              "MAC bị trùng với thiết bị khác";
          } else {
            seenMacs.set(mac, d._id);
          }
        }

        if (
          !d.deviceType &&
          (existingId || code || d.model.trim() || ip || mac)
        ) {
          newErrors[`dev_${d._id}_deviceType`] = "Vui lòng chọn loại thiết bị";
        }

        const hasInfo = hasAnyDeviceInput(d);
        if (hasInfo && !existingId) {
          if (!d.model.trim())
            newErrors[`dev_${d._id}_model`] = "Vui lòng nhập model";
          if (!ip)
            newErrors[`dev_${d._id}_ipAddress`] = "Vui lòng nhập IP Address";
        }
      });
    });

    if (hasConfiguredCamera) {
      const lp = Number(formData.licensePlateThreshold);
      const fr = Number(formData.faceRecognitionThreshold);
      if (isNaN(lp) || lp < 70 || lp > 100)
        newErrors.licensePlateThreshold = "Ngưỡng phải từ 70-100";
      if (isNaN(fr) || fr < 70 || fr > 100)
        newErrors.faceRecognitionThreshold = "Ngưỡng phải từ 70-100";
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      const firstErrorMessage =
        validationErrors.gatesStructure ||
        validationErrors.aiConfig ||
        Object.values(validationErrors)[0] ||
        "Vui lòng kiểm tra lại thông tin";
      toast.error(String(firstErrorMessage));
      return;
    }

    setSubmitting(true);
    try {
      const lotInfo = {
        lotName: formData.lotName.trim(),
        fullAddress: formData.fullAddress.trim(),
        totalCapacity: parseInt(formData.totalCapacity, 10),
        openingTime: formData.is24h ? "00:00" : formData.openingTime || "00:00",
        closingTime: formData.is24h ? "23:59" : formData.closingTime || "23:59",
        is24h: formData.is24h,
      };
      if (formData.hourlyRate !== "")
        lotInfo.hourlyRate = parseFloat(formData.hourlyRate);
      if (formData.scheduledActivationDate)
        lotInfo.scheduledActivationDate = new Date(
          formData.scheduledActivationDate,
        ).toISOString();

      const allDevices = formData.gates.flatMap((g) =>
        g.devices
          .map((d) => {
            const existingDeviceId = (d.existingDeviceId || "").trim();
            const hasInfo =
              existingDeviceId ||
              d.deviceCode.trim() ||
              d.deviceName.trim() ||
              d.model.trim() ||
              d.ipAddress.trim() ||
              d.macAddress.trim() ||
              d.firmwareVersion.trim() ||
              d.deviceType;
            if (!hasInfo) return null;

            const dev = {
              gateName: g.gateName.trim(),
              deviceType: d.deviceType,
              deviceCode: d.deviceCode.trim(),
              deviceName: d.deviceName.trim(),
              model: d.model.trim(),
              ipAddress: d.ipAddress.trim(),
              connectionStatus: d.connectionStatus || "ONLINE",
            };

            if (existingDeviceId) dev.existingDeviceId = existingDeviceId;
            if (d.macAddress.trim())
              dev.macAddress = d.macAddress.trim().toUpperCase();
            if (d.firmwareVersion.trim())
              dev.firmwareVersion = d.firmwareVersion.trim();

            return dev;
          })
          .filter(Boolean),
      );

      const backendData = {
        lotInfo,
        cameraSetup: {
          gates: formData.gates.map((g) => ({
            gateName: g.gateName.trim(),
            gateType: g.gateType,
            isActive: g.isActive !== false,
          })),
          devices: allDevices,
          ...(hasConfiguredCamera
            ? {
                aiConfig: {
                  licensePlateConfidenceThreshold: toDecimal(
                    parseInt(formData.licensePlateThreshold) || 70,
                  ),
                  faceRecognitionConfidenceThreshold: toDecimal(
                    parseInt(formData.faceRecognitionThreshold) || 70,
                  ),
                },
              }
            : {}),
        },
      };

      console.log("Payload →", JSON.stringify(backendData, null, 2));

      if (lot) {
        // EDIT MODE

        // 1. Cập nhật AI config nếu có
        if (aiConfigIdRef.current && hasConfiguredCamera) {
          const aiPayload = {
            licensePlateConfidenceThreshold: toDecimal(
              parseInt(formData.licensePlateThreshold) || 70,
            ),
            faceRecognitionConfidenceThreshold: toDecimal(
              parseInt(formData.faceRecognitionThreshold) || 70,
            ),
          };
          await aiConfigService
            .update(aiConfigIdRef.current, aiPayload)
            .catch((err) => console.warn("Không thể cập nhật AI config:", err));
        }

        // Helper: đồng bộ thiết bị của một gate (gán thiết bị có sẵn + tạo thiết bị mới)
        const syncGateDevices = async (gateId, devices) => {
          const attachExistingDevices = devices.filter((d) => {
            const existingId = (d.existingDeviceId || "").trim();
            return !d._persisted && !!existingId;
          });

          for (const d of attachExistingDevices) {
            const existingId = String(d.existingDeviceId).trim();
            const attachPayload = {
              lotId: lot.id,
              parkingLotId: lot.id,
              gateId,
              connectionStatus: d.connectionStatus || "ONLINE",
            };
            if (d.deviceCode.trim())
              attachPayload.deviceCode = d.deviceCode.trim();
            if (d.deviceName.trim())
              attachPayload.deviceName = d.deviceName.trim();
            if (d.deviceType) attachPayload.deviceType = d.deviceType;
            if (d.model.trim()) attachPayload.model = d.model.trim();
            if (d.ipAddress.trim())
              attachPayload.ipAddress = d.ipAddress.trim();
            if (d.macAddress.trim()) {
              attachPayload.macAddress = d.macAddress.trim().toUpperCase();
            }
            if (d.firmwareVersion.trim()) {
              attachPayload.firmwareVersion = d.firmwareVersion.trim();
            }

            try {
              await iotDeviceService.update(existingId, attachPayload);
            } catch (err) {
              const errData = err.response?.data;
              const msg = errData?.message ?? errData?.title ?? err.message;
              console.error("Gán thiết bị có sẵn thất bại:", errData);
              toast.error(
                `Không thể gán thiết bị "${d.deviceName || d.deviceCode || existingId}": ${msg}`,
              );
            }
          }

          const newDevices = devices.filter(
            (d) =>
              !d._persisted &&
              !d.existingDeviceId &&
              (d.model.trim() || d.ipAddress.trim()),
          );
          for (const d of newDevices) {
            const devPayload = {
              lotId: lot.id,
              parkingLotId: lot.id,
              gateId,
              deviceCode: d.deviceCode.trim(),
              deviceName: d.deviceName.trim(),
              deviceType: d.deviceType,
              model: d.model.trim(),
              ipAddress: d.ipAddress.trim(),
              connectionStatus: "ONLINE",
            };
            if (d.macAddress.trim())
              devPayload.macAddress = d.macAddress.trim().toUpperCase();
            if (d.firmwareVersion.trim())
              devPayload.firmwareVersion = d.firmwareVersion.trim();
            console.log("POST device:", devPayload);
            let createdDev;
            try {
              createdDev = await iotDeviceService.create(devPayload);
            } catch (err) {
              const errData = err.response?.data;
              const msg = errData?.message ?? errData?.title ?? err.message;
              console.error("Tạo thiết bị thất bại:", errData);
              toast.error(
                `Không thể tạo thiết bị "${d.deviceName || d.deviceCode}": ${msg}`,
              );
              continue;
            }
            const devId = createdDev?.deviceId ?? createdDev?.id;
            if (devId) await createMaintenanceForDevice(devId);
          }
        };

        // 2. Cập nhật cổng đã tồn tại + tạo cổng mới
        for (const gate of formData.gates) {
          if (gate._persisted) {
            // Cập nhật cổng cũ
            const updatePayload = {
              gateName: gate.gateName.trim(),
              gateType: gate.gateType,
              isActive: gate.isActive !== false,
              lotId: lot.id,
              parkingLotId: lot.id,
            };
            await gateService.update(gate._id, updatePayload).catch((err) => {
              const errData = err.response?.data;
              console.warn(
                `Cập nhật cổng thất bại:`,
                errData?.errors ?? errData?.message ?? err.message,
              );
            });
            // Đồng bộ thiết bị trong cổng cũ
            await syncGateDevices(gate._id, gate.devices);
          } else {
            // Tạo cổng mới
            const createPayload = {
              gateName: gate.gateName.trim(),
              gateType: gate.gateType,
              isActive: gate.isActive !== false,
              lotId: lot.id,
              parkingLotId: lot.id,
            };
            let created;
            try {
              created = await gateService.create(createPayload);
            } catch (err) {
              const errData = err.response?.data;
              const fieldErrors = errData?.errors
                ? Object.entries(errData.errors)
                    .map(([f, msgs]) => `${f}: ${[].concat(msgs).join(", ")}`)
                    .join(" | ")
                : null;
              const msg =
                fieldErrors ??
                errData?.message ??
                errData?.title ??
                err.message;
              console.error("Tạo cổng thất bại:", errData?.errors ?? errData);
              toast.error(`Không thể tạo cổng "${gate.gateName}": ${msg}`);
              continue;
            }
            // Đồng bộ thiết bị cho cổng mới
            const newGateId = created?.gateId ?? created?.id;
            if (newGateId) await syncGateDevices(newGateId, gate.devices);
          }
        }

        // 3. Cập nhật thông tin bãi + đóng modal
        await onSave({ lotInfo });
      } else {
        // CREATE MODE
        await onSave(backendData);
      }
    } catch (err) {
      console.error("Error saving:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const errClass = (key) => (errors[key] ? "border-red-500" : "");
  const ErrMsg = ({ k }) =>
    errors[k] ? <p className="text-red-500 text-xs mt-1">{errors[k]}</p> : null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-auto flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header - cố định */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {lot ? "Chỉnh sửa bãi gửi" : "Thêm bãi gửi mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" />
            <p className="text-gray-600">Đang tải thông tin...</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* SECTION 1: Lot info */}
              <section className="border-b pb-5">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  Thông tin bãi gửi xe
                </h3>
                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên bãi gửi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lotName}
                      onChange={(e) => setField("lotName", e.target.value)}
                      className={`input ${errClass("lotName")}`}
                      placeholder="VD: Bãi xe Tòa nhà Bitexco"
                    />
                    <ErrMsg k="lotName" />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Địa chỉ đầy đủ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullAddress}
                      onChange={(e) => setField("fullAddress", e.target.value)}
                      className={`input ${errClass("fullAddress")}`}
                      placeholder="VD: 2 Hải Triều, Bến Nghé, Quận 1, TP.HCM"
                    />
                    <ErrMsg k="fullAddress" />
                  </div>

                  {/* Capacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tổng số chỗ đỗ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      value={formatViThousands(formData.totalCapacity)}
                      onChange={(e) =>
                        setNumericField("totalCapacity", e.target.value)
                      }
                      className={`input ${errClass("totalCapacity")}`}
                      placeholder="VD: 20.000"
                    />
                    <ErrMsg k="totalCapacity" />
                  </div>

                  {/* Rates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giá theo giờ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9.]*"
                        value={formatViThousands(formData.hourlyRate)}
                        onChange={(e) =>
                          setNumericField("hourlyRate", e.target.value)
                        }
                        className={`input ${errClass("hourlyRate")}`}
                        placeholder="VD: 20.000"
                      />
                      <ErrMsg k="hourlyRate" />
                    </div>
                  </div>

                  {/* 24h toggle */}
                  <div className="flex items-center space-x-3">
                    <input
                      id="is24h"
                      type="checkbox"
                      checked={formData.is24h}
                      onChange={(e) => setField("is24h", e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="is24h"
                      className="text-sm font-medium text-gray-700"
                    >
                      Hoạt động 24/7
                    </label>
                  </div>

                  {/* Opening / Closing time */}
                  {!formData.is24h && (
                    <div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Giờ mở cửa <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={formData.openingTime}
                            onChange={(e) => {
                              setField("openingTime", e.target.value);
                              if (errors.time)
                                setErrors((p) => {
                                  const n = { ...p };
                                  delete n.time;
                                  return n;
                                });
                            }}
                            className={`input ${errClass("time")}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Giờ đóng cửa <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            value={formData.closingTime}
                            onChange={(e) => {
                              setField("closingTime", e.target.value);
                              if (errors.time)
                                setErrors((p) => {
                                  const n = { ...p };
                                  delete n.time;
                                  return n;
                                });
                            }}
                            className={`input ${errClass("time")}`}
                          />
                        </div>
                      </div>
                      <ErrMsg k="time" />
                    </div>
                  )}

                  {/* Activation date */}
                  <DateInputDDMMYYYY
                    label="Ngày kích hoạt dự kiến"
                    optionalLabel="(tùy chọn)"
                    value={formData.scheduledActivationDate}
                    min={format(new Date(), "yyyy-MM-dd")}
                    onChange={(v) => setField("scheduledActivationDate", v)}
                  />
                </div>
              </section>

              {/* SECTION 2: Gates & Devices */}
              <section className="border-b pb-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Cấu hình cổng & Thiết bị
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Mỗi cổng có thể gắn nhiều thiết bị (Camera, Barie...)
                    </p>
                    <ErrMsg k="gatesStructure" />
                  </div>
                  <button
                    type="button"
                    onClick={addGate}
                    className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium border border-primary-300 hover:border-primary-500 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm cổng
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.gates.map((gate, gIdx) => {
                    const isCollapsed = !!collapsed[gate._id];
                    const compatibleAvailableDevices = availableDevices.filter(
                      (opt) =>
                        isDeviceCompatibleWithGateType(opt, gate.gateType),
                    );
                    const gateHasErr = Object.keys(errors).some(
                      (k) =>
                        k.startsWith(`gate_${gate._id}`) ||
                        gate.devices.some((d) => k.startsWith(`dev_${d._id}`)),
                    );

                    return (
                      <div
                        key={gate._id}
                        className={`border rounded-lg bg-gray-50 overflow-hidden ${gateHasErr ? "border-red-300" : "border-gray-200"}`}
                      >
                        {/* Gate header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                          <button
                            type="button"
                            onClick={() => toggleCollapse(gate._id)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                          >
                            {isCollapsed ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            )}
                            <span>
                              Cổng #{gIdx + 1}
                              {gate.gateName && (
                                <span className="ml-1.5 font-normal text-gray-400">
                                  - {gate.gateName}
                                </span>
                              )}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {GATE_TYPE_OPTIONS.find(
                                (o) => o.value === gate.gateType,
                              )?.label || gate.gateType}
                            </span>
                            <span className="text-xs text-gray-400">
                              {gate.devices.length} thiết bị
                            </span>
                            {gate._persisted && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded ${
                                  gate.isActive !== false
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-200 text-gray-500"
                                }`}
                              >
                                {gate.isActive !== false ? "Hoạt động" : "Tắt"}
                              </span>
                            )}
                          </button>
                          <div className="flex items-center gap-1">
                            {gate._persisted && (
                              <button
                                type="button"
                                onClick={() => toggleGateStatus(gate._id)}
                                disabled={togglingGate === gate._id}
                                title={
                                  gate.isActive !== false
                                    ? "Tắt cổng"
                                    : "Bật cổng"
                                }
                                className={`p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                  gate.isActive !== false
                                    ? "text-green-600 hover:bg-green-50 hover:text-green-700"
                                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                }`}
                              >
                                {togglingGate === gate._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : gate.isActive !== false ? (
                                  <PowerOff className="w-4 h-4" />
                                ) : (
                                  <Power className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {(formData.gates.length > 1 || gate._persisted) && (
                              <button
                                type="button"
                                onClick={() => removeGate(gate._id)}
                                disabled={deletingGate === gate._id}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Xóa cổng"
                              >
                                {deletingGate === gate._id ? (
                                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {!isCollapsed && (
                          <div className="p-4 space-y-4">
                            {/* Gate name + type */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Tên cổng{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={gate.gateName}
                                  onChange={(e) =>
                                    updateGate(
                                      gate._id,
                                      "gateName",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="VD: Cổng Vào Tầng Hầm B1"
                                  className={`input text-sm ${errClass(`gate_${gate._id}_gateName`)}`}
                                />
                                <ErrMsg k={`gate_${gate._id}_gateName`} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Loại cổng
                                </label>
                                <select
                                  value={gate.gateType}
                                  onChange={(e) =>
                                    updateGate(
                                      gate._id,
                                      "gateType",
                                      e.target.value,
                                    )
                                  }
                                  className={`input text-sm ${errClass(`gate_${gate._id}_gateType`)}`}
                                >
                                  <option value="" disabled hidden>
                                    Chọn loại cổng
                                  </option>
                                  {GATE_TYPE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <ErrMsg k={`gate_${gate._id}_gateType`} />
                              </div>
                            </div>

                            {/* Devices */}
                            <div>
                              <div className="max-h-[55vh] overflow-y-auto pr-1">
                                <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 mb-3">
                                  <div className="flex items-center justify-between py-2">
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                      Thiết bị
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => addDevice(gate._id)}
                                      disabled={isEditMode}
                                      className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Thêm thiết bị
                                    </button>
                                  </div>
                                  {isEditMode && (
                                    <p className="text-[11px] text-gray-400 pb-2">
                                      Chế độ chỉnh sửa: chỉ cho xem và xóa thiết
                                      bị.
                                    </p>
                                  )}
                                  <ErrMsg k={`gate_${gate._id}_devicesCount`} />
                                </div>

                                <div className="space-y-3 pb-1">
                                  {gate.devices.map((dev, dIdx) => {
                                    const canPickExisting =
                                      !isEditMode && !dev._persisted;
                                    const lockedByExisting =
                                      isEditMode ||
                                      (canPickExisting &&
                                        !!dev.existingDeviceId);
                                    const isDeviceCollapsed =
                                      !!collapsedDevices[dev._id];
                                    const selectedDeviceType =
                                      normalizeDeviceType(dev.deviceType);
                                    const typeFilteredAvailableDevices =
                                      compatibleAvailableDevices.filter(
                                        (opt) => {
                                          if (!selectedDeviceType) return true;
                                          return (
                                            normalizeDeviceType(
                                              opt.deviceType,
                                            ) === selectedDeviceType
                                          );
                                        },
                                      );

                                    return (
                                      <div
                                        key={dev._id}
                                        className={`border border-gray-200 rounded-lg bg-white ${
                                          isDeviceCollapsed ? "p-2" : "p-3"
                                        }`}
                                      >
                                        {/* Device row header */}
                                        <div
                                          className={`flex items-center justify-between ${
                                            isDeviceCollapsed ? "mb-0" : "mb-3"
                                          }`}
                                        >
                                          <span className="text-xs font-medium text-gray-500">
                                            Thiết bị #{dIdx + 1}
                                            {dev.deviceName && (
                                              <span className="ml-1.5 text-gray-400 font-normal">
                                                - {dev.deviceName}
                                              </span>
                                            )}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                toggleDeviceCollapse(dev._id)
                                              }
                                              className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                              title={
                                                isDeviceCollapsed
                                                  ? "Mở rộng thiết bị"
                                                  : "Thu gọn thiết bị"
                                              }
                                            >
                                              {isDeviceCollapsed ? (
                                                <ChevronDown className="w-3.5 h-3.5" />
                                              ) : (
                                                <ChevronUp className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                                              {DEVICE_TYPE_LABEL[
                                                dev.deviceType
                                              ] || dev.deviceType}
                                            </span>
                                            {gate.devices.length > 1 && (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  removeDevice(
                                                    gate._id,
                                                    dev._id,
                                                  )
                                                }
                                                className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Xóa thiết bị"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {!isDeviceCollapsed && (
                                          <>
                                            {canPickExisting && (
                                              <div className="mb-3">
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                  Dùng thiết bị có sẵn
                                                  <span className="ml-1 text-gray-400 font-normal">
                                                    (tùy chọn)
                                                  </span>
                                                </label>
                                                <select
                                                  value={
                                                    dev.existingDeviceId || ""
                                                  }
                                                  onChange={(e) =>
                                                    handleExistingDeviceChange(
                                                      gate._id,
                                                      dev._id,
                                                      e.target.value,
                                                    )
                                                  }
                                                  className={`input text-xs ${errClass(`dev_${dev._id}_existingDeviceId`)}`}
                                                >
                                                  <option value="">
                                                    Tạo thiết bị mới
                                                  </option>
                                                  {typeFilteredAvailableDevices.map(
                                                    (opt) => (
                                                      <option
                                                        key={opt.id}
                                                        value={opt.id}
                                                        disabled={isExistingDeviceSelectedElsewhere(
                                                          opt.id,
                                                          dev._id,
                                                        )}
                                                      >
                                                        {opt.label}
                                                      </option>
                                                    ),
                                                  )}
                                                </select>
                                                <ErrMsg
                                                  k={`dev_${dev._id}_existingDeviceId`}
                                                />
                                                {loadingAvailableDevices ? (
                                                  <p className="text-[11px] text-gray-400 mt-1">
                                                    Đang tải danh sách thiết bị
                                                    có sẵn...
                                                  </p>
                                                ) : deviceSelectorFallback ? (
                                                  <p className="text-[11px] text-amber-600 mt-1">
                                                    Không xác định được trạng
                                                    thái gán từ API, đang hiển
                                                    thị toàn bộ thiết bị để bạn
                                                    chọn.
                                                  </p>
                                                ) : (
                                                  <p className="text-[11px] text-gray-400 mt-1">
                                                    {!selectedDeviceType
                                                      ? "Chọn loại thiết bị để lọc danh sách thiết bị có sẵn."
                                                      : typeFilteredAvailableDevices.length >
                                                          0
                                                        ? "Chọn thiết bị có sẵn đúng loại để gán vào cổng, hoặc để trống để tạo mới."
                                                        : gate.gateType
                                                          ? "Không có thiết bị phù hợp với loại cổng đã chọn."
                                                          : "Hiện chưa có thiết bị chưa gán trong hệ thống."}
                                                  </p>
                                                )}
                                              </div>
                                            )}

                                            {/* Device fields — row 1 */}
                                            <div className="grid grid-cols-3 gap-2 mb-2">
                                              <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                  Loại thiết bị
                                                </label>
                                                <select
                                                  value={dev.deviceType}
                                                  onChange={(e) =>
                                                    updateDevice(
                                                      gate._id,
                                                      dev._id,
                                                      "deviceType",
                                                      e.target.value,
                                                    )
                                                  }
                                                  disabled={isEditMode}
                                                  className={`input text-xs ${errClass(`dev_${dev._id}_deviceType`)}`}
                                                >
                                                  <option
                                                    value=""
                                                    disabled
                                                    hidden
                                                  >
                                                    Chọn loại thiết bị
                                                  </option>
                                                  {DEVICE_TYPE_OPTIONS.map(
                                                    (o) => (
                                                      <option
                                                        key={o.value}
                                                        value={o.value}
                                                      >
                                                        {o.label}
                                                      </option>
                                                    ),
                                                  )}
                                                </select>
                                                <ErrMsg
                                                  k={`dev_${dev._id}_deviceType`}
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                  Mã thiết bị
                                                </label>
                                                <input
                                                  type="text"
                                                  value={dev.deviceCode}
                                                  onChange={(e) =>
                                                    updateDevice(
                                                      gate._id,
                                                      dev._id,
                                                      "deviceCode",
                                                      e.target.value,
                                                    )
                                                  }
                                                  disabled={lockedByExisting}
                                                  placeholder="VD: CAM-IN-B1"
                                                  className={`input text-xs disabled:bg-gray-100 disabled:text-gray-500 ${errClass(`dev_${dev._id}_deviceCode`)}`}
                                                />
                                                <ErrMsg
                                                  k={`dev_${dev._id}_deviceCode`}
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                  Tên thiết bị
                                                </label>
                                                <input
                                                  type="text"
                                                  value={dev.deviceName}
                                                  onChange={(e) =>
                                                    updateDevice(
                                                      gate._id,
                                                      dev._id,
                                                      "deviceName",
                                                      e.target.value,
                                                    )
                                                  }
                                                  disabled={lockedByExisting}
                                                  placeholder="VD: Camera Cổng Vào"
                                                  className="input text-xs disabled:bg-gray-100 disabled:text-gray-500"
                                                />
                                              </div>
                                            </div>

                                            {/* Device fields — row 2 */}
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                              <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                  Model{" "}
                                                  {!lockedByExisting && (
                                                    <span className="text-red-500">
                                                      *
                                                    </span>
                                                  )}
                                                </label>
                                                <input
                                                  type="text"
                                                  value={dev.model}
                                                  onChange={(e) =>
                                                    updateDevice(
                                                      gate._id,
                                                      dev._id,
                                                      "model",
                                                      e.target.value,
                                                    )
                                                  }
                                                  disabled={lockedByExisting}
                                                  placeholder="VD: Hikvision DS-2CD4A26"
                                                  className={`input text-xs disabled:bg-gray-100 disabled:text-gray-500 ${errClass(`dev_${dev._id}_model`)}`}
                                                />
                                                <ErrMsg
                                                  k={`dev_${dev._id}_model`}
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                  IP Address{" "}
                                                  {!lockedByExisting && (
                                                    <span className="text-red-500">
                                                      *
                                                    </span>
                                                  )}
                                                </label>
                                                <input
                                                  type="text"
                                                  value={dev.ipAddress}
                                                  onChange={(e) =>
                                                    updateDevice(
                                                      gate._id,
                                                      dev._id,
                                                      "ipAddress",
                                                      e.target.value,
                                                    )
                                                  }
                                                  disabled={lockedByExisting}
                                                  placeholder="VD: 192.168.10.50"
                                                  className={`input text-xs disabled:bg-gray-100 disabled:text-gray-500 ${errClass(`dev_${dev._id}_ipAddress`)}`}
                                                />
                                                <ErrMsg
                                                  k={`dev_${dev._id}_ipAddress`}
                                                />
                                              </div>
                                            </div>

                                            {/* Device fields — row 3 */}
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                  MAC Address
                                                  <span className="ml-1 text-gray-400 font-normal">
                                                    (tùy chọn)
                                                  </span>
                                                </label>
                                                <input
                                                  type="text"
                                                  value={dev.macAddress}
                                                  onChange={(e) =>
                                                    updateDevice(
                                                      gate._id,
                                                      dev._id,
                                                      "macAddress",
                                                      e.target.value,
                                                    )
                                                  }
                                                  disabled={lockedByExisting}
                                                  placeholder="VD: A1:B2:C3:D4:E5:F6"
                                                  className={`input text-xs disabled:bg-gray-100 disabled:text-gray-500 ${errClass(`dev_${dev._id}_macAddress`)}`}
                                                />
                                                <ErrMsg
                                                  k={`dev_${dev._id}_macAddress`}
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                                  Phiên bản firmware
                                                  <span className="ml-1 text-gray-400 font-normal">
                                                    (tùy chọn)
                                                  </span>
                                                </label>
                                                <input
                                                  type="text"
                                                  value={dev.firmwareVersion}
                                                  onChange={(e) =>
                                                    updateDevice(
                                                      gate._id,
                                                      dev._id,
                                                      "firmwareVersion",
                                                      e.target.value,
                                                    )
                                                  }
                                                  disabled={lockedByExisting}
                                                  placeholder="VD: V5.5.82"
                                                  className="input text-xs disabled:bg-gray-100 disabled:text-gray-500"
                                                />
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ══ SECTION 3: AI config ══ */}
              <section>
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  Cấu hình AI
                </h3>
                {!hasConfiguredCamera && (
                  <p className="text-xs text-amber-700 mb-3">
                    Cần setup ít nhất 1 camera đã cấu hình (chọn thiết bị có sẵn
                    hoặc nhập mới) để bật chỉnh ngưỡng AI.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Ngưỡng nhận diện biển số
                        <span className="text-red-500"> *</span>
                      </label>
                      <span className="text-sm font-semibold text-primary-600 tabular-nums">
                        {formData.licensePlateThreshold || "70"}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      disabled={!hasConfiguredCamera}
                      value={
                        formData.licensePlateThreshold === ""
                          ? 70
                          : Math.max(
                              70,
                              Number(formData.licensePlateThreshold) || 70,
                            )
                      }
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v >= 70)
                          setField("licensePlateThreshold", e.target.value);
                      }}
                      className={`w-full h-2.5 accent-primary-600 rounded-lg appearance-none bg-gray-200 ${!hasConfiguredCamera ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${errClass("licensePlateThreshold")}`}
                    />
                    <ErrMsg k="licensePlateThreshold" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Ngưỡng nhận diện khuôn mặt
                        <span className="text-red-500"> *</span>
                      </label>
                      <span className="text-sm font-semibold text-primary-600 tabular-nums">
                        {formData.faceRecognitionThreshold || "70"}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      disabled={!hasConfiguredCamera}
                      value={
                        formData.faceRecognitionThreshold === ""
                          ? 70
                          : Math.max(
                              70,
                              Number(formData.faceRecognitionThreshold) || 70,
                            )
                      }
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v >= 70)
                          setField("faceRecognitionThreshold", e.target.value);
                      }}
                      className={`w-full h-2.5 accent-primary-600 rounded-lg appearance-none bg-gray-200 ${!hasConfiguredCamera ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${errClass("faceRecognitionThreshold")}`}
                    />
                    <ErrMsg k="faceRecognitionThreshold" />
                  </div>
                </div>
              </section>
            </div>

            {/* Sticky footer - ghim cố định cạnh dưới modal */}
            <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-end gap-3">
                {!lot && (
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    className="btn btn-secondary text-primary-600 hover:text-primary-700 border-primary-200 hover:border-primary-300"
                    disabled={submitting}
                    title="Điền dữ liệu mẫu để demo nhanh"
                  >
                    Auto fill
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{lot ? "Đang cập nhật..." : "Đang thêm..."}</span>
                    </span>
                  ) : (
                    <span>{lot ? "Cập nhật" : "Thêm mới"}</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default ParkingLotModal;
