import { useState } from "react";
import {
  Cpu,
  Camera,
  Wifi,
  WifiOff,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Activity,
} from "lucide-react";
import DeviceModal from "./DeviceModal";

function IoTDevices() {
  const [showModal, setShowModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedType, setSelectedType] = useState("all");

  const devices = [
    {
      id: 1,
      name: "Camera Cổng A1",
      type: "camera",
      location: "Bãi đỗ Tòa A - Cổng vào A1",
      ip: "192.168.1.101",
      status: "online",
      lastSeen: "2024-02-03 10:35:00",
      model: "Hikvision DS-2CD2043G2",
      uptime: "15 ngày 8 giờ",
    },
    {
      id: 2,
      name: "Camera Cổng A2",
      type: "camera",
      location: "Bãi đỗ Tòa A - Cổng ra A2",
      ip: "192.168.1.102",
      status: "online",
      lastSeen: "2024-02-03 10:34:55",
      model: "Hikvision DS-2CD2043G2",
      uptime: "15 ngày 8 giờ",
    },
    {
      id: 3,
      name: "Camera Cổng B1",
      type: "camera",
      location: "Bãi đỗ Tòa B - Cổng vào B1",
      ip: "192.168.1.103",
      status: "offline",
      lastSeen: "2024-02-03 10:15:00",
      model: "Hikvision DS-2CD2043G2",
      uptime: "0 giờ",
    },
    {
      id: 4,
      name: "Barrier Controller A1",
      type: "barrier",
      location: "Bãi đỗ Tòa A - Cổng A1",
      ip: "192.168.1.201",
      status: "online",
      lastSeen: "2024-02-03 10:35:02",
      model: "ESP32 Control Module",
      uptime: "15 ngày 8 giờ",
    },
    {
      id: 5,
      name: "Barrier Controller A2",
      type: "barrier",
      location: "Bãi đỗ Tòa A - Cổng A2",
      ip: "192.168.1.202",
      status: "online",
      lastSeen: "2024-02-03 10:35:01",
      model: "ESP32 Control Module",
      uptime: "15 ngày 8 giờ",
    },
    {
      id: 6,
      name: "Edge AI Server A",
      type: "edge-ai",
      location: "Bãi đỗ Tòa A - Phòng server",
      ip: "192.168.1.50",
      status: "online",
      lastSeen: "2024-02-03 10:35:03",
      model: "NVIDIA Jetson Nano",
      uptime: "15 ngày 8 giờ",
    },
    {
      id: 7,
      name: "Edge AI Server B",
      type: "edge-ai",
      location: "Bãi đỗ Tòa B - Phòng server",
      ip: "192.168.1.51",
      status: "warning",
      lastSeen: "2024-02-03 10:35:00",
      model: "NVIDIA Jetson Nano",
      uptime: "2 ngày 4 giờ",
    },
  ];

  const statusColors = {
    online: "bg-green-100 text-green-800",
    offline: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800",
  };

  const statusLabels = {
    online: "Trực tuyến",
    offline: "Ngoại tuyến",
    warning: "Cảnh báo",
  };

  const typeColors = {
    camera: "bg-blue-100 text-blue-800",
    barrier: "bg-purple-100 text-purple-800",
    "edge-ai": "bg-orange-100 text-orange-800",
  };

  const typeLabels = {
    camera: "Camera",
    barrier: "Barrier",
    "edge-ai": "Edge AI",
  };

  const typeIcons = {
    camera: Camera,
    barrier: Activity,
    "edge-ai": Cpu,
  };

  const filteredDevices = devices.filter((device) => {
    return selectedType === "all" || device.type === selectedType;
  });

  const handleEdit = (device) => {
    setSelectedDevice(device);
    setShowModal(true);
  };

  const handleDelete = (device) => {
    if (confirm(`Bạn có chắc muốn xóa thiết bị "${device.name}"?`)) {
      console.log("Deleting device:", device.id);
    }
  };

  const handleRestart = (device) => {
    if (confirm(`Bạn có chắc muốn khởi động lại "${device.name}"?`)) {
      console.log("Restarting device:", device.id);
    }
  };

  const handleAddNew = () => {
    setSelectedDevice(null);
    setShowModal(true);
  };

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const offlineCount = devices.filter((d) => d.status === "offline").length;
  const warningCount = devices.filter((d) => d.status === "warning").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Quản lý thiết bị IoT
          </h1>
          <p className="text-gray-600 mt-1">
            Giám sát và quản lý các thiết bị phần cứng
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm thiết bị</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Cpu className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {devices.length}
              </p>
              <p className="text-sm text-gray-600">Tổng thiết bị</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{onlineCount}</p>
              <p className="text-sm text-gray-600">Trực tuyến</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <WifiOff className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{offlineCount}</p>
              <p className="text-sm text-gray-600">Ngoại tuyến</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{warningCount}</p>
              <p className="text-sm text-gray-600">Cảnh báo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">
            Loại thiết bị:
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="input"
          >
            <option value="all">Tất cả</option>
            <option value="camera">Camera</option>
            <option value="barrier">Barrier Controller</option>
            <option value="edge-ai">Edge AI Server</option>
          </select>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDevices.map((device) => {
          const Icon = typeIcons[device.type];
          return (
            <div
              key={device.id}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {device.name}
                    </h3>
                    <span
                      className={`badge ${typeColors[device.type]} text-xs`}
                    >
                      {typeLabels[device.type]}
                    </span>
                  </div>
                </div>
                <span className={`badge ${statusColors[device.status]}`}>
                  {device.status === "online" ? (
                    <Wifi className="w-3 h-3 mr-1" />
                  ) : (
                    <WifiOff className="w-3 h-3 mr-1" />
                  )}
                  {statusLabels[device.status]}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-start text-sm">
                  <span className="text-gray-500 w-20">Vị trí:</span>
                  <span className="text-gray-900 flex-1">
                    {device.location}
                  </span>
                </div>
                <div className="flex items-start text-sm">
                  <span className="text-gray-500 w-20">IP:</span>
                  <span className="font-mono text-gray-900">{device.ip}</span>
                </div>
                <div className="flex items-start text-sm">
                  <span className="text-gray-500 w-20">Model:</span>
                  <span className="text-gray-900">{device.model}</span>
                </div>
                <div className="flex items-start text-sm">
                  <span className="text-gray-500 w-20">Uptime:</span>
                  <span className="text-gray-900">{device.uptime}</span>
                </div>
                <div className="flex items-start text-sm">
                  <span className="text-gray-500 w-20">Kiểm tra:</span>
                  <span className="text-gray-900">{device.lastSeen}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleRestart(device)}
                  className="flex-1 btn btn-secondary flex items-center justify-center space-x-1 text-sm"
                  disabled={device.status === "offline"}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Khởi động lại</span>
                </button>
                <button
                  onClick={() => handleEdit(device)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(device)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <DeviceModal
          device={selectedDevice}
          onClose={() => setShowModal(false)}
          onSave={(data) => {
            console.log("Saving device:", data);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

export default IoTDevices;
