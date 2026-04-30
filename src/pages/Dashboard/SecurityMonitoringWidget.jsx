import { AlertTriangle, Clock3, Siren } from "lucide-react";

const severityStyleMap = {
  critical: {
    container: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-800",
    icon: "text-red-700",
    label: "Nghiêm trọng",
  },
  high: {
    container: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
    icon: "text-amber-700",
    label: "Mức cao",
  },
  medium: {
    container: "border-blue-200 bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
    icon: "text-blue-700",
    label: "Theo dõi",
  },
  low: {
    container: "border-slate-200 bg-slate-50",
    badge: "bg-slate-100 text-slate-700",
    icon: "text-slate-600",
    label: "Thông tin",
  },
};

function SecurityMonitoringWidget({ alerts = [], loading = false }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
          <Siren className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Cảnh báo an ninh
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border border-slate-100 p-3">
              <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-2.5 w-24 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50/70 p-4 text-sm text-green-700">
          Không có cảnh báo an ninh quan trọng ở thời điểm hiện tại.
        </div>
      ) : (
        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {alerts.map((alert) => {
            const style =
              severityStyleMap[alert.severity] ?? severityStyleMap.low;
            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-3 ${style.container}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {alert.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {alert.description}
                    </p>
                  </div>
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}
                  >
                    {style.label}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  {alert.title.toLowerCase().includes("24") ||
                  alert.title.toLowerCase().includes("48") ? (
                    <Clock3 className={`h-3.5 w-3.5 ${style.icon}`} />
                  ) : (
                    <AlertTriangle className={`h-3.5 w-3.5 ${style.icon}`} />
                  )}
                  <span>{alert.timeLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SecurityMonitoringWidget;
