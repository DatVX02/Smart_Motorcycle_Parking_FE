import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Camera,
  Activity,
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle,
  AlertCircle,
  Construction,
  Monitor,
  MapPin,
  Tag,
  Hash,
  Layers,
  Clock,
  Network,
  PowerOff,
  DoorOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import iotDeviceService from "../../services/iotDeviceService";
import gateService from "../../services/gateService";

const CONN_STATUS = {
  ONLINE: {
    label: "Trực tuyến",
    cls: "bg-green-100 text-green-700",
    Icon: Wifi,
  },
  OFFLINE: {
    label: "Ngoại tuyến",
    cls: "bg-red-100 text-red-700",
    Icon: WifiOff,
  },
  READY: { label: "Sẵn sàng", cls: "bg-blue-100 text-blue-700", Icon: Wifi },
  WARNING: {
    label: "Cảnh báo",
    cls: "bg-yellow-100 text-yellow-700",
    Icon: AlertTriangle,
  },
  INACTIVE: {
    label: "Ngừng hoạt động",
    cls: "bg-gray-100 text-gray-600",
    Icon: PowerOff,
  },
  BROKEN: {
    label: "Hư hỏng",
    cls: "bg-red-100 text-red-700",
    Icon: AlertCircle,
  },
  MAINTENANCE: {
    label: "Bảo trì",
    cls: "bg-amber-100 text-amber-700",
    Icon: Construction,
  },
};

const DEVICE_TYPE = {
  LPR_CAMERA: { label: "Camera LPR", Icon: Camera },
  BARRIER: { label: "Barie", Icon: Activity },
};

const getStatus = (raw) => {
  const key = String(raw ?? "").toUpperCase();
  return (
    CONN_STATUS[key] ?? {
      label: raw || "—",
      cls: "bg-gray-100 text-gray-600",
      Icon: Wifi,
    }
  );
};

const getType = (raw) => {
  const key = String(raw ?? "").toUpperCase();
  return DEVICE_TYPE[key] ?? { label: raw || "—", Icon: Cpu };
};

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
  highlight = false,
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p
          className={`text-sm font-medium ${highlight ? "text-primary-600" : "text-gray-900"} ${mono ? "font-mono" : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function DeviceDetailModal({ device, onClose }) {
  const [detail, setDetail] = useState(null);
  const [gateInfo, setGateInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const deviceId = device?.id ?? device?.deviceId;

  useEffect(() => {
    if (!deviceId) return;
    const fetch = async () => {
      try {
        setLoading(true);
        setGateInfo(null);
        const data = await iotDeviceService.getDetail(deviceId);
        setDetail(data);

        const gateId = data?.gateId ?? data?.gate_id ?? device?.gateId;
        if (gateId) {
          try {
            const gate = await gateService.getById(gateId);
            setGateInfo(gate);
          } catch {
            // Fallback: dùng gateName từ device nếu API cổng lỗi
            setGateInfo(data?.gateName ? { gateName: data.gateName } : null);
          }
        }
      } catch (err) {
        console.error("Error loading device detail:", err);
        toast.error("Không thể tải chi tiết thiết bị");
        setDetail(device);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [deviceId]);

  // Merge card data + detail data (detail takes priority)
  const d = { ...device, ...detail };
  const conn = getStatus(d.connectionStatus);
  const dtype = getType(d.deviceType);
  const ConnIcon = conn.Icon;
  const TypeIcon = dtype.Icon;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <TypeIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                {d.deviceName || d.name || "—"}
              </h2>
              <span className="text-sm text-gray-500">{dtype.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${conn.cls}`}
            >
              <ConnIcon className="w-3.5 h-3.5" />
              {conn.label}
            </span>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-3" />
            <p className="text-sm text-gray-500">Đang tải thông tin...</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Connection status highlight */}
            <div
              className={`flex items-center gap-3 rounded-xl p-4 mb-5 ${conn.cls.replace("text-", "bg-").split(" ")[0]} bg-opacity-30`}
              style={{ background: "var(--tw-bg-opacity)" }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${conn.cls}`}
              >
                <ConnIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Trạng thái kết nối</p>
                <p className={`font-semibold ${conn.cls.split(" ")[1]}`}>
                  {conn.label}
                </p>
              </div>
            </div>

            {/* Info grid - 2 cột trên màn rộng */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 rounded-xl border border-gray-100 p-4">
              <div className="space-y-0 divide-y divide-gray-50 lg:border-r lg:border-gray-100 lg:pr-6">
                <InfoRow
                  icon={Hash}
                  label="Mã thiết bị"
                  value={d.deviceCode || d.code}
                  mono
                />
                <InfoRow
                  icon={Tag}
                  label="Tên thiết bị"
                  value={d.deviceName || d.name}
                />
                <InfoRow
                  icon={Layers}
                  label="Loại thiết bị"
                  value={dtype.label}
                />
                <InfoRow icon={Monitor} label="Model" value={d.model} />
                <InfoRow
                  icon={Network}
                  label="IP Address"
                  value={d.ipAddress || d.ip}
                  mono
                  highlight
                />
              </div>
              <div className="space-y-0 divide-y divide-gray-50 lg:pl-2">
                <InfoRow
                  icon={Network}
                  label="MAC Address"
                  value={d.macAddress}
                  mono
                />
                <InfoRow icon={Cpu} label="Firmware" value={d.firmwareVersion} />
                <InfoRow
                  icon={DoorOpen}
                  label="Cổng"
                  value={
                    gateInfo?.gateName ??
                    gateInfo?.name ??
                    d.gateName ??
                    d.gate_name
                  }
                />
                <InfoRow
                  icon={MapPin}
                  label="Bãi đỗ xe"
                  value={d.lotName || d.parkingLotName}
                />
                <InfoRow
                  icon={Clock}
                  label="Lần kiểm tra cuối"
                  value={
                    d.lastHeartbeat || d.lastSeen
                      ? new Date(d.lastHeartbeat || d.lastSeen).toLocaleString(
                          "vi-VN",
                        )
                      : null
                  }
                />
                <InfoRow
                  icon={Clock}
                  label="Ngày thêm vào"
                  value={
                    d.createdAt
                      ? new Date(d.createdAt).toLocaleString("vi-VN")
                      : null
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end px-6 pb-6">
          <button onClick={onClose} className="btn btn-secondary">
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default DeviceDetailModal;
