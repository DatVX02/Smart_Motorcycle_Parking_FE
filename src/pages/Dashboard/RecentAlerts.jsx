import { AlertTriangle, Camera, ShieldAlert, Clock } from "lucide-react";

function RecentAlerts() {
  const alerts = [
    {
      id: 1,
      type: "mismatch",
      message: "Phát hiện không khớp khuôn mặt - Biển số 29A-12345",
      time: "5 phút trước",
      severity: "high",
      icon: ShieldAlert,
    },
    {
      id: 2,
      type: "camera",
      message: "Camera cổng B mất kết nối",
      time: "15 phút trước",
      severity: "medium",
      icon: Camera,
    },
    {
      id: 3,
      type: "payment",
      message: "Người dùng chưa thanh toán - Biển số 51C-55555",
      time: "1 giờ trước",
      severity: "low",
      icon: AlertTriangle,
    },
  ];

  const severityColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-orange-100 text-orange-800 border-orange-200",
    low: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  const iconColors = {
    high: "text-red-600",
    medium: "text-orange-600",
    low: "text-yellow-600",
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Cảnh báo gần đây
        </h2>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Xem tất cả
        </button>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <div
              key={alert.id}
              className={`flex items-start space-x-4 p-4 rounded-lg border ${
                severityColors[alert.severity]
              } transition-colors`}
            >
              <div className={`mt-0.5 ${iconColors[alert.severity]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{alert.message}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <Clock className="w-3 h-3" />
                  <p className="text-xs">{alert.time}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecentAlerts;
