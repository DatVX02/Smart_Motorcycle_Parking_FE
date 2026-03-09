import { useState, useEffect, useCallback } from "react";
import {
  Cpu,
  Camera,
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  Plus,
  Unlink,
} from "lucide-react";
import { EyeTwoTone, EditTwoTone, DeleteTwoTone } from "@ant-design/icons";
import toast from "react-hot-toast";
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
  READY: { label: "Sẵn sàng", color: "bg-blue-100 text-blue-700", icon: Wifi },
  WARNING: {
    label: "Cảnh báo",
    color: "bg-yellow-100 text-yellow-700",
    icon: AlertTriangle,
  },
};

const DEVICE_TYPE = {
  LPR_CAMERA: {
    label: "Camera LPR",
    color: "bg-blue-100 text-blue-700",
    icon: Camera,
  },
  BARRIER: {
    label: "Barie",
    color: "bg-purple-100 text-purple-700",
    icon: Activity,
  },
};

const getConnStatus = (raw) => {
  const key = String(raw ?? "").toUpperCase();
  return (
    CONN_STATUS[key] ?? {
      label: raw || "—",
      color: "bg-gray-100 text-gray-600",
      icon: Wifi,
    }
  );
};

const getDeviceType = (raw) => {
  const key = String(raw ?? "").toUpperCase();
  return (
    DEVICE_TYPE[key] ?? {
      label: raw || "—",
      color: "bg-gray-100 text-gray-600",
      icon: Cpu,
    }
  );
};

function IoTDevices() {
  const [devices, setDevices] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterLot, setFilterLot] = useState("all");
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: null,
    device: null,
  });

  const fetchDevices = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const [devData, lotData] = await Promise.all([
        iotDeviceService.getAll(),
        parkingLotService.getAllParkingLots().catch(() => []),
      ]);
      setDevices(Array.isArray(devData) ? devData : []);
      setLots(Array.isArray(lotData) ? lotData : []);
      if (showToast) toast.success(`Đã tải ${devData.length} thiết bị`);
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Không thể tải danh sách thiết bị";
      toast.error(msg);
      console.error("Error fetching devices:", err);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleSave = async (payload, deviceId) => {
    try {
      if (deviceId) {
        await iotDeviceService.update(deviceId, payload);
        toast.success("Đã cập nhật thiết bị thành công");
      } else {
        await iotDeviceService.create(payload);
        toast.success("Đã thêm thiết bị mới thành công");
      }
      setShowModal(false);
      setSelected(null);
      await fetchDevices();
    } catch (err) {
      const data = err?.response?.data;
      const msg = data?.message || data?.title || "Không thể lưu thiết bị";
      toast.error(msg, { duration: 5000 });
      console.error("Save error:", data ?? err);
      throw err;
    }
  };

  const handleDelete = (device) => {
    setConfirmDialog({ open: true, type: "delete", device });
  };

  const handleUnassign = (device) => {
    setConfirmDialog({ open: true, type: "unassign", device });
  };

  const handleConfirmAction = async () => {
    const { type, device } = confirmDialog;
    const name = device?.deviceName || device?.name || "thiết bị";
    try {
      if (type === "delete") {
        await iotDeviceService.delete(device.id ?? device.deviceId);
        toast.success(`Đã xóa "${name}"`);
      } else if (type === "unassign") {
        await iotDeviceService.unassign(device.id ?? device.deviceId);
        toast.success(`Đã ngắt gán "${name}"`);
      }
      await fetchDevices();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          (type === "delete" ? "Không thể xóa thiết bị" : "Không thể ngắt gán"),
      );
    }
  };

  const handleViewDetail = (device) => {
    setSelected(device);
    setShowDetailModal(true);
  };

  const filtered = devices.filter((d) => {
    const typeOk = filterType === "all" || d.deviceType === filterType;
    const lotOk =
      filterLot === "all" ||
      d.lotId === filterLot ||
      d.parkingLotId === filterLot;
    return typeOk && lotOk;
  });

  const countBy = (key, val) =>
    devices.filter(
      (d) => String(d.connectionStatus ?? "").toUpperCase() === val,
    ).length;

  const totalCount = devices.length;
  const onlineCount = countBy("connectionStatus", "ONLINE");
  const offlineCount = countBy("connectionStatus", "OFFLINE");
  const readyCount = devices.filter(
    (d) =>
      !["ONLINE", "OFFLINE"].includes(
        String(d.connectionStatus ?? "").toUpperCase(),
      ),
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex justify-end items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelected(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-3 rounded-2xl"
          >
            <Plus className="w-4 h-4" />
            Thêm thiết bị
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl p-8 shadow border">
          <div className="flex items-center gap-5">
            <Cpu className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-3xl font-bold">{totalCount}</p>
              <p className="text-gray-500">Tổng thiết bị</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow border">
          <div className="flex items-center gap-5">
            <Wifi className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-3xl font-bold text-green-600">{onlineCount}</p>
              <p className="text-gray-500">Trực tuyến</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow border">
          <div className="flex items-center gap-5">
            <WifiOff className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-3xl font-bold text-red-600">{offlineCount}</p>
              <p className="text-gray-500">Ngoại tuyến</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow border">
          <div className="flex items-center gap-5">
            <AlertTriangle className="w-8 h-8 text-gray-600" />
            <div>
              <p className="text-3xl font-bold text-gray-600">{readyCount}</p>
              <p className="text-gray-500">Khác</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl p-6 shadow border flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Loại thiết bị:
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input w-48"
          >
            <option value="all">Tất cả</option>
            <option value="LPR_CAMERA">Camera LPR</option>
            <option value="BARRIER">Barie</option>
          </select>
        </div>
        {lots.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Bãi đỗ:
            </label>
            <select
              value={filterLot}
              onChange={(e) => setFilterLot(e.target.value)}
              className="input w-56"
            >
              <option value="all">Tất cả bãi đỗ</option>
              {lots.map((l) => (
                <option key={l.lotId ?? l.id} value={l.lotId ?? l.id}>
                  {l.lotName ?? l.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {filtered.length !== devices.length && (
          <span className="text-sm text-gray-500">
            Hiển thị {filtered.length} / {devices.length} thiết bị
          </span>
        )}
      </div>

      {/* Device grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl shadow border text-center py-12">
          <Cpu className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {devices.length === 0
              ? "Chưa có thiết bị nào"
              : "Không tìm thấy thiết bị"}
          </h3>
          <p className="text-gray-500 text-sm">
            {devices.length === 0
              ? "Bắt đầu bằng cách thêm thiết bị IoT đầu tiên"
              : "Thử thay đổi bộ lọc để xem thêm thiết bị"}
          </p>
          {devices.length === 0 && (
            <button
              onClick={() => {
                setSelected(null);
                setShowModal(true);
              }}
              className="mt-4 btn btn-primary inline-flex items-center gap-3 rounded-2xl"
            >
              <Plus className="w-4 h-4" /> Thêm thiết bị
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((device) => {
            const id = device.id ?? device.deviceId;
            const conn = getConnStatus(device.connectionStatus);
            const dtype = getDeviceType(device.deviceType);
            const DevIcon = dtype.icon;
            const ConnIcon = conn.icon;

            return (
              <div key={id} className="bg-white rounded-3xl shadow border hover:shadow-lg transition-shadow p-6">
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <DevIcon className="w-8 h-8 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate leading-tight">
                        {device.deviceName || device.name || "—"}
                      </h3>
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${dtype.color}`}
                      >
                        {dtype.label}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 ml-2 flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${conn.color}`}
                  >
                    <ConnIcon className="w-3 h-3" />
                    {conn.label}
                  </span>
                </div>

                {/* Device info */}
                <div className="space-y-1.5 mb-4 text-sm">
                  {device.gateName && (
                    <Row label="Cổng" value={device.gateName} />
                  )}
                  {(device.ipAddress || device.ip) && (
                    <Row
                      label="IP"
                      value={device.ipAddress || device.ip}
                      mono
                    />
                  )}
                  {device.model && <Row label="Model" value={device.model} />}
                  {(device.deviceCode || device.code) && (
                    <Row
                      label="Mã"
                      value={device.deviceCode || device.code}
                      mono
                    />
                  )}
                  {device.firmwareVersion && (
                    <Row label="Firmware" value={device.firmwareVersion} />
                  )}
                  {device.macAddress && (
                    <Row label="MAC" value={device.macAddress} mono />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleViewDetail(device)}
                    className="flex-1 btn btn-secondary flex items-center justify-center gap-1.5 text-sm py-1.5"
                  >
                    <EyeTwoTone twoToneColor="#2563eb" />
                    Xem chi tiết
                  </button>
                  {device.gateName && (
                    <button
                      onClick={() => handleUnassign(device)}
                      className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                      title="Ngắt gán khỏi cổng"
                    >
                      <Unlink className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelected(device);
                      setShowModal(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Chỉnh sửa"
                  >
                    <EditTwoTone twoToneColor="#2563eb" />
                  </button>
                  <button
                    onClick={() => handleDelete(device)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <DeleteTwoTone twoToneColor="#2563eb" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <DeviceModal
          device={selected}
          onClose={() => {
            setShowModal(false);
            setSelected(null);
          }}
          onSave={handleSave}
        />
      )}

      {showDetailModal && selected && (
        <DeviceDetailModal
          device={selected}
          onClose={() => {
            setShowDetailModal(false);
            setSelected(null);
          }}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, type: null, device: null })}
        onConfirm={handleConfirmAction}
        title={
          confirmDialog.type === "delete" ? "Xóa thiết bị" : "Ngắt gán thiết bị"
        }
        description={
          confirmDialog.type === "delete"
            ? `Bạn có chắc muốn xóa "${confirmDialog.device?.deviceName || confirmDialog.device?.name}"? Hành động này không thể hoàn tác.`
            : `Ngắt gán "${confirmDialog.device?.deviceName || confirmDialog.device?.name}" khỏi cổng hiện tại?`
        }
        confirmLabel={confirmDialog.type === "delete" ? "Xóa" : "Ngắt gán"}
        variant={confirmDialog.type === "delete" ? "destructive" : "warning"}
      />
    </div>
  );
}

// Small helper row component
function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-start gap-1">
      <span className="text-gray-400 w-20 flex-shrink-0">{label}:</span>
      <span
        className={`text-gray-900 truncate ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export default IoTDevices;
