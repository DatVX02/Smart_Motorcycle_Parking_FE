import {
  Receipt,
  Activity,
  CheckCircle2,
  XCircle,
  Slash,
  BadgeCheck,
} from "lucide-react";
import DeviceEventStatCard from "./DeviceEventStatCard";
import { DEVICE_EVENT_STATUS_OPTIONS } from "./deviceEventsConstants";

export default function DeviceEventsStats({
  loading,
  statTotalEvents,
  statusCounts = {},
}) {
  const VISIBLE_STATUSES = new Set(["success", "triggered", "failed"]);

  const iconForStatus = (statusKey) => {
    switch (statusKey) {
      case "active":
      case "processing":
      case "pending":
      case "triggered":
        return Activity;
      case "success":
      case "completed":
      case "resolved":
        return CheckCircle2;
      case "failed":
        return XCircle;
      case "ignored":
        return Slash;
      case "acknowledged":
        return BadgeCheck;
      default:
        return Receipt;
    }
  };

  const styleForStatus = (statusKey) => {
    switch (statusKey) {
      case "active":
        return { iconColor: "text-green-600", bgTint: "bg-green-500/10" };
      case "processing":
        return { iconColor: "text-blue-600", bgTint: "bg-blue-500/10" };
      case "pending":
        return { iconColor: "text-amber-700", bgTint: "bg-amber-500/15" };
      case "triggered":
        return { iconColor: "text-slate-700", bgTint: "bg-slate-500/10" };
      case "success":
        return { iconColor: "text-green-700", bgTint: "bg-green-500/30" };
      case "completed":
        return { iconColor: "text-green-700", bgTint: "bg-green-500/30" };
      case "resolved":
        return { iconColor: "text-slate-700", bgTint: "bg-slate-500/10" };
      case "ignored":
        return { iconColor: "text-gray-600", bgTint: "bg-gray-500/10" };
      case "failed":
        return { iconColor: "text-red-700", bgTint: "bg-red-500/30" };
      case "acknowledged":
        return { iconColor: "text-violet-700", bgTint: "bg-violet-500/10" };
      default:
        return { iconColor: "text-blue-600", bgTint: "bg-white" };
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
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

          {DEVICE_EVENT_STATUS_OPTIONS.filter(([value]) =>
            VISIBLE_STATUSES.has(String(value).toLowerCase()),
          ).map(([value, label]) => {
            const key = String(value).toLowerCase();
            const Icon = iconForStatus(key);
            const { iconColor, bgTint } = styleForStatus(key);
            return (
              <DeviceEventStatCard
                key={value}
                icon={Icon}
                iconColor={iconColor}
                label={label}
                value={statusCounts[key] ?? 0}
                valueSuffix="Sự kiện"
                bgTint={bgTint}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
