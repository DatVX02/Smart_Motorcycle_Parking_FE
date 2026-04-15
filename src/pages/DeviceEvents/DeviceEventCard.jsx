import { AlertTriangle, Info, XCircle, MapPin, Cpu } from "lucide-react";
import {
  EVENT_TYPE_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_SOURCE_LABELS,
  LEVEL_BORDER,
  LEVEL_COLORS,
  EVENT_STATUS_BADGE_CLASSES,
} from "./deviceEventsConstants";
import { labelFromMap, normStatus } from "./deviceEventUtils";

const LEVEL_ICONS = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function DeviceEventCard({ log }) {
  const Icon = LEVEL_ICONS[log.level] ?? Info;
  const statusVi = labelFromMap(
    EVENT_STATUS_LABELS,
    log.eventStatus,
    log.eventStatus,
  );
  const sourceVi = labelFromMap(
    EVENT_SOURCE_LABELS,
    log.eventSource,
    log.eventSource,
  );
  const typeVi = labelFromMap(
    EVENT_TYPE_LABELS,
    log.eventType,
    log.eventType,
  );
  const statusBadgeClasses =
    EVENT_STATUS_BADGE_CLASSES[normStatus(log.eventStatus)] ??
    "text-gray-600 bg-slate-50 border-slate-200";
  const sameTime =
    log.occurredAtRaw &&
    log.createdAtRaw &&
    String(log.occurredAtRaw) === String(log.createdAtRaw);

  return (
    <article
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm border-l-4 ${LEVEL_BORDER[log.level] ?? LEVEL_BORDER.info}`}
    >
      <div className="flex gap-4 p-5">
        <div className="shrink-0 pt-0.5">
          <span
            className={`inline-flex rounded-lg p-2 border ${LEVEL_COLORS[log.level] ?? LEVEL_COLORS.info}`}
          >
            <Icon className="w-5 h-5" />
          </span>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${LEVEL_COLORS[log.level] ?? LEVEL_COLORS.info}`}
                >
                  {typeVi}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md border ${statusBadgeClasses}`}
                >
                  {statusVi}
                </span>
                <span className="text-xs text-violet-800 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md">
                  {sourceVi}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-1 text-sm text-gray-800">
                <span className="font-semibold flex items-center gap-1.5 min-w-0">
                  <Cpu className="w-4 h-4 shrink-0 text-gray-500" />
                  <span className="truncate">
                    {log.deviceName !== ""
                      ? log.deviceName
                      : "Thiết bị không tên"}
                  </span>
                </span>
                <span className="hidden sm:inline text-gray-300">·</span>
                <span className="flex items-center gap-1.5 text-gray-600 min-w-0">
                  <MapPin className="w-4 h-4 shrink-0 text-gray-500" />
                  <span className="truncate">
                    {log.lotName !== "" ? log.lotName : "Chưa gán bãi"}
                  </span>
                </span>
              </div>
              <p className="text-base text-gray-900 leading-snug">
                {log.eventDataSummary}
              </p>
            </div>
            <div className="text-sm text-gray-600 sm:text-right shrink-0 space-y-0.5">
              {sameTime ? (
                <div>
                  <span className="text-gray-400 text-xs block">Thời gian</span>
                  {log.occurredAtFriendly}
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-gray-400 text-xs block">Xảy ra</span>
                    {log.occurredAtFriendly}
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs block">
                      Ghi nhận
                    </span>
                    {log.createdAtFriendly}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
