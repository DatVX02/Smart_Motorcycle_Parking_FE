import { useState } from "react";
import {
  ScrollText,
  Search,
  Filter,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
} from "lucide-react";

function SystemLogs() {
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const logs = [
    {
      id: 1,
      timestamp: "2024-02-03 10:35:42",
      level: "error",
      type: "authentication",
      message: "Phát hiện không khớp khuôn mặt - Biển số 29A-12345",
      user: "System",
      ip: "192.168.1.105",
      details: "Face mismatch detected at gate A1",
    },
    {
      id: 2,
      timestamp: "2024-02-03 10:32:15",
      level: "success",
      type: "payment",
      message: "Thanh toán thành công TX-2024020301",
      user: "Nguyễn Văn A",
      ip: "192.168.1.102",
      details: "Payment processed via Momo: 15,000 VND",
    },
    {
      id: 3,
      timestamp: "2024-02-03 10:30:18",
      level: "warning",
      type: "camera",
      message: "Camera cổng B mất kết nối tạm thời",
      user: "System",
      ip: "192.168.1.150",
      details: "Camera reconnected after 2 minutes",
    },
    {
      id: 4,
      timestamp: "2024-02-03 10:25:09",
      level: "info",
      type: "entry",
      message: "Xe vào bãi đỗ - Biển số 30B-98765",
      user: "Trần Thị B",
      ip: "192.168.1.103",
      details: "Entry at gate A1, LPR confidence: 98.5%",
    },
    {
      id: 5,
      timestamp: "2024-02-03 10:20:33",
      level: "error",
      type: "system",
      message: "Lỗi kết nối database (tạm thời)",
      user: "System",
      ip: "localhost",
      details: "Connection timeout, auto-retry successful",
    },
    {
      id: 6,
      timestamp: "2024-02-03 10:15:45",
      level: "success",
      type: "exit",
      message: "Xe ra khỏi bãi đỗ - Biển số 51C-55555",
      user: "Lê Văn C",
      ip: "192.168.1.104",
      details: "Exit at gate A1, payment verified",
    },
    {
      id: 7,
      timestamp: "2024-02-03 10:10:22",
      level: "warning",
      type: "payment",
      message: "Người dùng chưa thanh toán trước 10 phút",
      user: "Phạm Thị D",
      ip: "192.168.1.106",
      details: "Payment reminder sent",
    },
    {
      id: 8,
      timestamp: "2024-02-03 10:05:11",
      level: "info",
      type: "admin",
      message: "Admin đăng nhập hệ thống",
      user: "admin@motoguard.com",
      ip: "192.168.1.1",
      details: "Login successful",
    },
  ];

  const levelIcons = {
    error: XCircle,
    warning: AlertTriangle,
    success: CheckCircle,
    info: Info,
  };

  const levelColors = {
    error: "bg-red-100 text-red-800 border-red-200",
    warning: "bg-orange-100 text-orange-800 border-orange-200",
    success: "bg-green-100 text-green-800 border-green-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
  };

  const levelLabels = {
    error: "Lỗi",
    warning: "Cảnh báo",
    success: "Thành công",
    info: "Thông tin",
  };

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = selectedLevel === "all" || log.level === selectedLevel;
    const matchesType = selectedType === "all" || log.type === selectedType;
    const matchesSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesType && matchesSearch;
  });

  const errorCount = logs.filter((l) => l.level === "error").length;
  const warningCount = logs.filter((l) => l.level === "warning").length;
  const successCount = logs.filter((l) => l.level === "success").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nhật ký hệ thống</h1>
        <p className="text-gray-600 mt-1">
          Theo dõi hoạt động và sự kiện hệ thống
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{errorCount}</p>
              <p className="text-sm text-gray-600">Lỗi</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{warningCount}</p>
              <p className="text-sm text-gray-600">Cảnh báo</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{successCount}</p>
              <p className="text-sm text-gray-600">Thành công</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ScrollText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
              <p className="text-sm text-gray-600">Tổng nhật ký</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm nhật ký..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="input flex-1 min-w-[130px]"
            >
              <option value="all">Tất cả mức độ</option>
              <option value="error">Lỗi</option>
              <option value="warning">Cảnh báo</option>
              <option value="success">Thành công</option>
              <option value="info">Thông tin</option>
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input flex-1 min-w-[130px]"
            >
              <option value="all">Tất cả loại</option>
              <option value="authentication">Xác thực</option>
              <option value="payment">Thanh toán</option>
              <option value="camera">Camera</option>
              <option value="entry">Vào bãi</option>
              <option value="exit">Ra bãi</option>
              <option value="system">Hệ thống</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.map((log) => {
          const Icon = levelIcons[log.level];
          return (
            <div
              key={log.id}
              className={`card border ${levelColors[log.level]}`}
            >
              <div className="flex items-start space-x-4">
                <div className="mt-1">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`badge ${levelColors[log.level]}`}>
                          {levelLabels[log.level]}
                        </span>
                        <span className="badge badge-info uppercase text-xs">
                          {log.type}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {log.message}
                      </p>
                      <p className="text-xs text-gray-600">{log.details}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-gray-500">{log.timestamp}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>User: {log.user}</span>
                    <span>IP: {log.ip}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredLogs.length === 0 && (
        <div className="card text-center py-12">
          <ScrollText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Không tìm thấy nhật ký nào</p>
        </div>
      )}
    </div>
  );
}

export default SystemLogs;
