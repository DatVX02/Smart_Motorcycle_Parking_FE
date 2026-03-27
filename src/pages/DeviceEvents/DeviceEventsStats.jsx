import {
  Receipt,
  Activity,
  PowerOff,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import DeviceEventStatCard from "./DeviceEventStatCard";

export default function DeviceEventsStats({
  loading,
  statTotalEvents,
  activeOperationalCount,
  inactiveOperationalCount,
  warningCount,
  errorCount,
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-3xl border p-6 shadow flex items-center gap-3 animate-pulse"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-8 bg-gray-100 rounded w-16" />
              <div className="h-4 bg-gray-100 rounded w-24" />
            </div>
          </div>
        ))
      ) : (
        <>
          <DeviceEventStatCard
            icon={Receipt}
            iconColor="text-blue-600"
            label="Tổng sự kiện"
            value={statTotalEvents}
            valueSuffix="Sự kiện"
          />
          <DeviceEventStatCard
            icon={Activity}
            iconColor="text-emerald-600"
            label="Hoạt động"
            value={activeOperationalCount}
            valueSuffix="Sự kiện"
          />
          <DeviceEventStatCard
            icon={PowerOff}
            iconColor="text-slate-600"
            label="Ngừng hoạt động"
            value={inactiveOperationalCount}
            valueSuffix="Sự kiện"
            bgTint="bg-slate-400/20"
          />
          <DeviceEventStatCard
            icon={AlertTriangle}
            iconColor="text-orange-600"
            label="Cảnh báo"
            value={warningCount}
            valueSuffix="Sự kiện"
            bgTint="bg-amber-500/30"
          />
          <DeviceEventStatCard
            icon={XCircle}
            iconColor="text-red-600"
            label="Lỗi"
            value={errorCount}
            valueSuffix="Sự kiện"
            bgTint="bg-red-500/30"
          />
        </>
      )}
    </div>
  );
}
