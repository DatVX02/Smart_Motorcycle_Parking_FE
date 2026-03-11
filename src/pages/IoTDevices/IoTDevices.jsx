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
  Wrench,
} from "lucide-react";

import { EyeTwoTone, EditTwoTone, DeleteTwoTone } from "@ant-design/icons";
import toast from "react-hot-toast";

import DeviceModal from "./DeviceModal";
import DeviceDetailModal from "./DeviceDetailModal";
import DeviceMaintenanceModal from "./DeviceMaintenanceModal";

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

  const [selected, setSelected] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceDevice, setMaintenanceDevice] = useState(null);

  const [filterType, setFilterType] = useState("all");
  const [filterLot, setFilterLot] = useState("all");

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: null,
    device: null,
  });

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);

      const [devData, lotData] = await Promise.all([
        iotDeviceService.getAll(),
        parkingLotService.getAllParkingLots().catch(() => []),
      ]);

      setDevices(Array.isArray(devData) ? devData : []);
      setLots(Array.isArray(lotData) ? lotData : []);
    } catch {
      toast.error("Không thể tải danh sách thiết bị");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleMaintenance = (device) => {
    setMaintenanceDevice(device);
    setShowMaintenanceModal(true);
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

  const handleConfirmAction = async () => {
    const { type, device } = confirmDialog;

    try {
      if (type === "delete") {
        await iotDeviceService.delete(device.id ?? device.deviceId);
        toast.success("Đã xóa thiết bị");
      }

      if (type === "unassign") {
        await iotDeviceService.unassign(device.id ?? device.deviceId);
        toast.success("Đã ngắt gán thiết bị");
      }

      await fetchDevices();
    } catch {
      toast.error("Thao tác thất bại");
    }
  };

  const filtered = devices.filter((d) => {
    const typeOk = filterType === "all" || d.deviceType === filterType;

    const lotOk =
      filterLot === "all" ||
      d.lotId === filterLot ||
      d.parkingLotId === filterLot;

    return typeOk && lotOk;
  });

  const totalCount = devices.length;
  const onlineCount = devices.filter(
    (d) => d.connectionStatus === "ONLINE",
  ).length;
  const offlineCount = devices.filter(
    (d) => d.connectionStatus === "OFFLINE",
  ).length;
  const readyCount = devices.filter(
    (d) =>
      !["ONLINE", "OFFLINE"].includes(
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
    <div className="space-y-8">
      {/* Stats */}

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

      <div className="bg-white rounded-3xl p-6 shadow border flex flex-wrap gap-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input w-48"
        >
          <option value="all">Tất cả loại</option>
          <option value="LPR_CAMERA">Camera LPR</option>
          <option value="BARRIER">Barie</option>
        </select>

        <select
          value={filterLot}
          onChange={(e) => setFilterLot(e.target.value)}
          className="input w-56"
        >
          <option value="all">Tất cả bãi đỗ</option>

          {lots.map((l) => (
            <option key={l.id ?? l.lotId} value={l.id ?? l.lotId}>
              {l.name ?? l.lotName}
            </option>
          ))}
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

      {/* Device grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((device) => {
          const id = device.id ?? device.deviceId;

          const conn = getConnStatus(device.connectionStatus);
          const dtype = getDeviceType(device.deviceType);

          const DevIcon = dtype.icon;
          const ConnIcon = conn.icon;

          return (
            <div key={id} className="bg-white rounded-3xl shadow border p-6">
              <div className="flex justify-between mb-3">
                <div className="flex gap-3 items-center">
                  <DevIcon className="w-8 h-8 text-blue-600" />

                  <div>
                    <h3 className="font-semibold">
                      {device.deviceName || device.name}
                    </h3>

                    <span
                      className={`text-xs px-2 py-1 rounded-full ${dtype.color}`}
                    >
                      {dtype.label}
                    </span>
                  </div>
                </div>

                <span
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${conn.color}`}
                >
                  <ConnIcon className="w-3 h-3" />
                  {conn.label}
                </span>
              </div>

              <div className="space-y-1 text-sm mb-4">
                {device.gateName && (
                  <Row label="Cổng" value={device.gateName} />
                )}
                {device.ipAddress && (
                  <Row label="IP" value={device.ipAddress} />
                )}
                {device.model && <Row label="Model" value={device.model} />}
                {device.macAddress && (
                  <Row label="MAC" value={device.macAddress} />
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  onClick={() => {
                    setSelected(device);
                    setShowDetailModal(true);
                  }}
                  className="flex-1 btn btn-secondary text-sm"
                >
                  <EyeTwoTone /> Chi tiết
                </button>

                {device.gateName && (
                  <button
                    onClick={() => handleUnassign(device)}
                    className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg"
                  >
                    <Unlink className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => handleMaintenance(device)}
                  className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                >
                  <Wrench className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setSelected(device);
                    setShowModal(true);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <EditTwoTone />
                </button>

                <button
                  onClick={() => handleDelete(device)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <DeleteTwoTone />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}

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

      <DeviceMaintenanceModal
        device={maintenanceDevice}
        open={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        onSuccess={fetchDevices}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false })}
        onConfirm={handleConfirmAction}
        title="Xác nhận"
        description="Bạn có chắc muốn thực hiện thao tác này?"
        confirmLabel="Xác nhận"
        variant="destructive"
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

function Stat({ icon: Icon, value, label, color = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow border flex gap-4 items-center">
      <Icon className="w-7 h-7 text-blue-600" />
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-gray-500 text-sm">{label}</p>
      </div>
    </div>
  );
}

export default IoTDevices;
