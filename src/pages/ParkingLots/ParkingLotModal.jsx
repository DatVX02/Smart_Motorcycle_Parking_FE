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
import { getRandomDemoSample } from "./parkingLotDemoData";

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
  { value: "two_way", label: "Cả hai" },
];

const DEVICE_TYPE_OPTIONS = [
  { value: "LPR_CAMERA", label: "Camera LPR (Đọc biển số)" },
  { value: "BARRIER", label: "Barie (Thanh chắn)" },
];

const DEVICE_TYPE_LABEL = {
  LPR_CAMERA: "Camera LPR",
  BARRIER: "Barie",
};

const newDevice = () => ({
  _id: crypto.randomUUID(),
  deviceCode: "",
  deviceName: "",
  deviceType: "",
  model: "",
  ipAddress: "",
  macAddress: "",
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
  const [loading, setLoading] = useState(!!lot);
  const [formData, setFormData] = useState(getDefaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [collapsed, setCollapsed] = useState({}); // gate _id → bool
  const [deletingGate, setDeletingGate] = useState(null); // gate _id đang xóa
  const [togglingGate, setTogglingGate] = useState(null); // gate _id đang chuyển trạng thái
  const aiConfigIdRef = useRef(null); // lưu configId để update sau

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
        const [detail, apiGates, aiConfigData] = await Promise.all([
          parkingLotService.getParkingLotDetail(lotId),
          gateService.getByLot(lotId).catch(() => []),
          aiConfigService.getByLot(lotId).catch(() => null),
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
        apiGates.forEach((g) => {
          const id = g.gateId ?? g.id;
          if (id) {
            gateNameMap.set(id, {
              gateName: g.gateName || g.name || "",
              gateType: normalizeGateType(g.gateType || g.type),
              isActive: g.isActive !== false,
            });
          }
        });

        // Group devices by gateId → one gate entry per unique gateId
        const gateMap = new Map();
        const rawDev = detail.devices || [];

        rawDev.forEach((d) => {
          const gId = d.gateId ?? d.gate_id;
          if (!gId) return;
          const gateInfo = gateNameMap.get(gId);

          if (!gateMap.has(gId)) {
            gateMap.set(gId, {
              _id: gId,
              _persisted: true,
              gateName: gateInfo?.gateName ?? "",
              gateType: normalizeGateType(gateInfo?.gateType),
              isActive: gateInfo?.isActive !== false,
              devices: [],
            });
          }
          gateMap.get(gId).devices.push({
            _id: d.deviceId ?? d.id ?? crypto.randomUUID(),
            _persisted: true,
            deviceCode: d.deviceCode || "",
            deviceName: d.deviceName || "",
            deviceType: d.deviceType || "",
            model: d.model || "",
            ipAddress: d.ipAddress || "",
            macAddress: d.macAddress || "",
            firmwareVersion: d.firmwareVersion || "",
          });
        });

        // Also add gates that exist but have no devices yet
        apiGates.forEach((g) => {
          const gId = g.gateId ?? g.id;
          if (gId && !gateMap.has(gId)) {
            gateMap.set(gId, {
              _id: gId,
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
          (apiGates || []).map((g) => g.gateId ?? g.id).filter(Boolean),
        );
        const filtered =
          apiGateIds.size > 0
            ? [...gateMap.values()].filter(
                (g) => g._id !== "no-gate" && apiGateIds.has(g._id),
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
  }, [lot?.id]);

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field])
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
  };

  const addGate = () =>
    setFormData((prev) => ({ ...prev, gates: [...prev.gates, newGate()] }));

  const removeGate = async (gId) => {
    const gate = formData.gates.find((g) => g._id === gId);
    if (gate?._persisted) {
      setDeletingGate(gId);
      try {
        await gateService.delete(gId);
        toast.success(`Đã xóa cổng "${gate.gateName || gId}" thành công`);
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.title ||
          "Không thể xóa cổng. Vui lòng thử lại.";
        toast.error(msg, { duration: 5000 });
        setDeletingGate(null);
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
        g._id === gId ? { ...g, [field]: value } : g,
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

  const handleAutoFill = () => {
    const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");
    const sample = getRandomDemoSample();
    setFormData({
      ...sample,
      scheduledActivationDate: tomorrow,
      licensePlateThreshold: "70",
      faceRecognitionThreshold: "70",
    });
    setErrors({});
    toast.success(`Đã điền mẫu: ${sample.lotName}`);
  };

  const addDevice = (gId) =>
    setFormData((prev) => ({
      ...prev,
      gates: prev.gates.map((g) =>
        g._id === gId ? { ...g, devices: [...g.devices, newDevice()] } : g,
      ),
    }));

  const removeDevice = (gId, dId) =>
    setFormData((prev) => ({
      ...prev,
      gates: prev.gates.map((g) =>
        g._id === gId
          ? { ...g, devices: g.devices.filter((d) => d._id !== dId) }
          : g,
      ),
    }));

  const updateDevice = (gId, dId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      gates: prev.gates.map((g) =>
        g._id === gId
          ? {
              ...g,
              devices: g.devices.map((d) =>
                d._id === dId ? { ...d, [field]: value } : d,
              ),
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

    if (formData.hourlyRate !== "" && Number(formData.hourlyRate) < 0)
      newErrors.hourlyRate = "Giá không hợp lệ";

    if (formData.monthlyRate !== "" && Number(formData.monthlyRate) < 0)
      newErrors.monthlyRate = "Giá không hợp lệ";

    if (!formData.is24h) {
      const { openingTime: o, closingTime: c } = formData;
      if (!o || !c) newErrors.time = "Vui lòng chọn giờ mở cửa và đóng cửa";
      else if (o >= c) newErrors.time = "Giờ mở cửa phải trước giờ đóng cửa";
    }

    // Uniqueness maps across ALL devices of ALL gates
    const seenIps = new Map();
    const seenCodes = new Map();
    const seenMacs = new Map();

    formData.gates.forEach((g) => {
      if (!g.gateName.trim())
        newErrors[`gate_${g._id}_gateName`] = "Vui lòng nhập tên cổng";
      if (!g.gateType)
        newErrors[`gate_${g._id}_gateType`] = "Vui lòng chọn loại cổng";

      g.devices.forEach((d) => {
        const ip = (d.ipAddress || "").trim();
        const code = (d.deviceCode || "").trim();
        const mac = (d.macAddress || "").trim().toUpperCase();

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

        const hasInfo =
          code || d.deviceName.trim() || d.model.trim() || ip || mac;
        if (hasInfo) {
          if (!d.model.trim())
            newErrors[`dev_${d._id}_model`] = "Vui lòng nhập model";
          if (!ip)
            newErrors[`dev_${d._id}_ipAddress`] = "Vui lòng nhập IP Address";
        }
      });
    });

    const lp = Number(formData.licensePlateThreshold);
    const fr = Number(formData.faceRecognitionThreshold);
    if (isNaN(lp) || lp < 70 || lp > 100)
      newErrors.licensePlateThreshold = "Ngưỡng phải từ 0-100";
    if (isNaN(fr) || fr < 70 || fr > 100)
      newErrors.faceRecognitionThreshold = "Ngưỡng phải từ 0-100";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    setSubmitting(true);
    try {
      const lotInfo = {
        lotName: formData.lotName.trim(),
        fullAddress: formData.fullAddress.trim(),
        totalCapacity: parseInt(formData.totalCapacity),
        openingTime: formData.is24h ? "00:00" : formData.openingTime || "00:00",
        closingTime: formData.is24h ? "23:59" : formData.closingTime || "23:59",
        is24h: formData.is24h,
      };
      if (formData.hourlyRate !== "")
        lotInfo.hourlyRate = parseFloat(formData.hourlyRate);
      if (formData.monthlyRate !== "")
        lotInfo.monthlyRate = parseFloat(formData.monthlyRate);
      if (formData.scheduledActivationDate)
        lotInfo.scheduledActivationDate = new Date(
          formData.scheduledActivationDate,
        ).toISOString();

      const allDevices = formData.gates.flatMap((g) =>
        g.devices
          .filter(
            (d) => d.deviceCode.trim() || d.model.trim() || d.ipAddress.trim(),
          )
          .map((d) => {
            const dev = {
              deviceCode: d.deviceCode.trim(),
              deviceName: d.deviceName.trim(),
              deviceType: d.deviceType,
              gateName: g.gateName.trim(),
              model: d.model.trim(),
              ipAddress: d.ipAddress.trim(),
              connectionStatus: "ONLINE",
            };
            if (d.macAddress.trim())
              dev.macAddress = d.macAddress.trim().toUpperCase();
            if (d.firmwareVersion.trim())
              dev.firmwareVersion = d.firmwareVersion.trim();
            return dev;
          }),
      );

      const backendData = {
        lotInfo,
        cameraSetup: {
          gates: formData.gates.map((g) => ({
            gateName: g.gateName.trim(),
            gateType: g.gateType,
            isActive: true,
          })),
          devices: allDevices,
          aiConfig: {
            licensePlateConfidenceThreshold: toDecimal(
              parseInt(formData.licensePlateThreshold) || 70,
            ),
            faceRecognitionConfidenceThreshold: toDecimal(
              parseInt(formData.faceRecognitionThreshold) || 70,
            ),
          },
        },
      };

      console.log("Payload →", JSON.stringify(backendData, null, 2));

      if (lot) {
        // EDIT MODE

        // 1. Cập nhật AI config nếu có
        if (aiConfigIdRef.current) {
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

        // Helper: tạo thiết bị mới cho một gateId
        const createNewDevices = async (gateId, devices) => {
          const newDevices = devices.filter(
            (d) => !d._persisted && (d.model.trim() || d.ipAddress.trim()),
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
            // Tạo thiết bị mới trong cổng cũ
            await createNewDevices(gate._id, gate.devices);
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
            // Tạo thiết bị cho cổng mới
            const newGateId = created?.gateId ?? created?.id;
            if (newGateId) await createNewDevices(newGateId, gate.devices);
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
                      type="number"
                      value={formData.totalCapacity}
                      onChange={(e) =>
                        setField("totalCapacity", e.target.value)
                      }
                      className={`input ${errClass("totalCapacity")}`}
                      min="1"
                      placeholder="VD: 850"
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
                        type="number"
                        value={formData.hourlyRate}
                        onChange={(e) => setField("hourlyRate", e.target.value)}
                        className={`input ${errClass("hourlyRate")}`}
                        min="0"
                        placeholder="VD: 20000"
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
                      Mỗi cổng có thể gắn nhiều thiết bị (Camera LPR, Barie...)
                    </p>
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
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  Thiết bị
                                </p>
                                <button
                                  type="button"
                                  onClick={() => addDevice(gate._id)}
                                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Thêm thiết bị
                                </button>
                              </div>

                              <div className="space-y-3">
                                {gate.devices.map((dev, dIdx) => (
                                  <div
                                    key={dev._id}
                                    className="border border-gray-200 rounded-lg p-3 bg-white"
                                  >
                                    {/* Device row header */}
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-xs font-medium text-gray-500">
                                        Thiết bị #{dIdx + 1}
                                        {dev.deviceName && (
                                          <span className="ml-1.5 text-gray-400 font-normal">
                                            - {dev.deviceName}
                                          </span>
                                        )}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                                          {DEVICE_TYPE_LABEL[dev.deviceType] ||
                                            dev.deviceType}
                                        </span>
                                        {gate.devices.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeDevice(gate._id, dev._id)
                                            }
                                            className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="Xóa thiết bị"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

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
                                          className="input text-xs"
                                        >
                                          <option value="" disabled hidden>
                                            Chọn loại thiết bị
                                          </option>
                                          {DEVICE_TYPE_OPTIONS.map((o) => (
                                            <option
                                              key={o.value}
                                              value={o.value}
                                            >
                                              {o.label}
                                            </option>
                                          ))}
                                        </select>
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
                                          placeholder="VD: CAM-IN-B1"
                                          className={`input text-xs ${errClass(`dev_${dev._id}_deviceCode`)}`}
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
                                          placeholder="VD: Camera LPR Cổng Vào"
                                          className="input text-xs"
                                        />
                                      </div>
                                    </div>

                                    {/* Device fields — row 2 */}
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                          Model{" "}
                                          <span className="text-red-500">
                                            *
                                          </span>
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
                                          placeholder="VD: Hikvision DS-2CD4A26"
                                          className={`input text-xs ${errClass(`dev_${dev._id}_model`)}`}
                                        />
                                        <ErrMsg k={`dev_${dev._id}_model`} />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                          IP Address{" "}
                                          <span className="text-red-500">
                                            *
                                          </span>
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
                                          placeholder="VD: 192.168.10.50"
                                          className={`input text-xs ${errClass(`dev_${dev._id}_ipAddress`)}`}
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
                                          placeholder="VD: A1:B2:C3:D4:E5:F6"
                                          className={`input text-xs ${errClass(`dev_${dev._id}_macAddress`)}`}
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
                                          placeholder="VD: V5.5.82"
                                          className="input text-xs"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
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
                      className={`w-full h-2.5 accent-primary-600 rounded-lg appearance-none cursor-pointer bg-gray-200 ${errClass("licensePlateThreshold")}`}
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
                      className={`w-full h-2.5 accent-primary-600 rounded-lg appearance-none cursor-pointer bg-gray-200 ${errClass("faceRecognitionThreshold")}`}
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
