import { AlertTriangle, Camera, ShieldAlert, Clock, ChevronRight } from "lucide-react";

const DEFAULT_ALERTS = [
  { id: 1, type: "mismatch", message: "Phát hiện không khớp khuôn mặt - Biển số 29A-12345", time: "5 phút trước", severity: "high", icon: ShieldAlert },
  { id: 2, type: "camera", message: "Camera cổng B mất kết nối", time: "15 phút trước", severity: "medium", icon: Camera },
  { id: 3, type: "payment", message: "Người dùng chưa thanh toán - Biển số 51C-55555", time: "1 giờ trước", severity: "low", icon: AlertTriangle },
];

function normalizeAlert(item) {
  if (!item) return null;
  const severity = (item.severity ?? item.level ?? "medium").toLowerCase();
  const iconMap = { mismatch: ShieldAlert, camera: Camera, default: AlertTriangle };
  return {
    id: item.id ?? item.alertId ?? item.alert_id ?? Math.random(),
    type: item.type ?? "default",
    message: item.message ?? item.description ?? item.content ?? "",
    time: item.time ?? item.createdAt ?? item.created_at ?? "",
    severity: severity === "high" || severity === "critical" ? "high" : severity === "low" ? "low" : "medium",
    icon: iconMap[item.type] ?? iconMap.default,
  };
}

function RecentAlerts({ data, loading }) {
  const raw = Array.isArray(data) ? data : data?.items ?? data?.alerts ?? [];
  const alerts = raw.length > 0
    ? raw.slice(0, 5).map(normalizeAlert).filter(Boolean)
    : DEFAULT_ALERTS;

  const severityStyles = {
    high: "border-rose-200 bg-rose-50/80",
    medium: "border-amber-200 bg-amber-50/80",
    low: "border-amber-100 bg-amber-50/50",
  };

  const iconStyles = {
    high: "text-rose-600",
    medium: "text-amber-600",
    low: "text-amber-500",
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Cảnh báo gần đây
            </h2>
            <p className="text-xs text-slate-500">5 cảnh báo mới nhất</p>
          </div>
        </div>
        <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50">
          Xem tất cả
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-4 rounded-xl border border-slate-100 p-4">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-4 rounded-xl border p-4 transition-all ${severityStyles[alert.severity]}`}
              >
                <div className={`shrink-0 ${iconStyles[alert.severity]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {alert.message}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {alert.time}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RecentAlerts;
