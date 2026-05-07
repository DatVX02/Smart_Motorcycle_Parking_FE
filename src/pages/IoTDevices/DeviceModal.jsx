import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const DEVICE_TYPE_OPTIONS = [
  { value: "CAMERA", label: "Camera" },
  { value: "BARRIER", label: "Barie" },
  { value: "LCD", label: "LCD" },
  { value: "SENSOR", label: "Sensor" },
];

const getDefault = (device) => ({
  deviceCode: device?.deviceCode || device?.code || "",
  deviceName: device?.deviceName || device?.name || "",
  deviceType: device?.deviceType || "CAMERA",
  gateId: device?.gateId ?? device?.gate_id ?? "",
  gateName: device?.gateName || device?.gate_name || "",
  model: device?.model || device?.deviceModel || "",
  ipAddress: device?.ipAddress || device?.ip || device?.ip_address || "",
  macAddress: device?.macAddress || device?.mac_address || "",
  firmwareVersion: device?.firmwareVersion || device?.firmware_version || "",
  connectionStatus: device?.connectionStatus || "ONLINE",
});

function DeviceModal({ device, onClose, onSave }) {
  const [formData, setFormData] = useState(() => getDefault(device));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData(getDefault(device));
    setErrors({});
  }, [device]);

  const set = (field, value) => {
    setFormData((p) => ({ ...p, [field]: value }));
    if (errors[field])
      setErrors((p) => {
        const n = { ...p };
        delete n[field];
        return n;
      });
  };

  const validate = () => {
    const e = {};
    const macRx = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

    if (!formData.deviceName.trim())
      e.deviceName = "Vui lòng nhập tên thiết bị";

    const mac = formData.macAddress.trim();
    if (mac && !macRx.test(mac))
      e.macAddress = "MAC không hợp lệ (VD: AA:BB:CC:DD:EE:FF)";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        deviceCode: formData.deviceCode.trim(),
        deviceName: formData.deviceName.trim(),
        deviceType: formData.deviceType,
        gateId: formData.gateId || undefined,
        gateName: formData.gateName.trim() || undefined,
        model: formData.model.trim(),
        ipAddress: formData.ipAddress.trim(),
        macAddress: formData.macAddress.trim().toUpperCase(),
        firmwareVersion: formData.firmwareVersion.trim(),
        connectionStatus: formData.connectionStatus || "ONLINE",
      };
      // Remove undefined keys
      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k],
      );

      await onSave(payload, device?.deviceId ?? device?.id);
    } catch {
      // Error already handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  const errClass = (k) => (errors[k] ? "border-red-500" : "");
  const ErrMsg = ({ k }) =>
    errors[k] ? <p className="text-red-500 text-xs mt-1">{errors[k]}</p> : null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {device ? "Chỉnh sửa thiết bị" : "Thêm thiết bị mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 max-h-[70vh] overflow-y-auto"
        >
          {/* Device type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loại thiết bị <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.deviceType}
              onChange={(e) => set("deviceType", e.target.value)}
              className="input"
            >
              {DEVICE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Code + Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã thiết bị
                
              </label>
              <input
                type="text"
                value={formData.deviceCode}
                onChange={(e) => set("deviceCode", e.target.value)}
                className="input"
                placeholder="VD: CAM-IN-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên thiết bị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.deviceName}
                onChange={(e) => set("deviceName", e.target.value)}
                className={`input ${errClass("deviceName")}`}
                placeholder="VD: Camera Cổng Vào"
              />
              <ErrMsg k="deviceName" />
            </div>
          </div>

          {/* Model + IP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => set("model", e.target.value)}
                className="input"
                placeholder="VD: Hikvision DS-2CD4A26"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={formData.ipAddress}
                onChange={(e) => set("ipAddress", e.target.value)}
                className="input"
                placeholder="VD: 192.168.1.110"
              />
            </div>
          </div>

          {/* MAC + Firmware */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MAC Address
                
              </label>
              <input
                type="text"
                value={formData.macAddress}
                onChange={(e) => set("macAddress", e.target.value)}
                className={`input ${errClass("macAddress")}`}
                placeholder="VD: AA:BB:CC:DD:EE:FF"
              />
              <ErrMsg k="macAddress" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Firmware Version
                
              </label>
              <input
                type="text"
                value={formData.firmwareVersion}
                onChange={(e) => set("firmwareVersion", e.target.value)}
                className="input"
                placeholder="VD: V5.5.82"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
                  {device ? "Đang cập nhật..." : "Đang thêm..."}
                </span>
              ) : device ? (
                "Cập nhật"
              ) : (
                "Thêm mới"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export default DeviceModal;
