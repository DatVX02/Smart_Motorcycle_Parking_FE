import { Search, Filter, RefreshCw } from "lucide-react";
import {
  DEVICE_EVENT_TYPE_OPTIONS,
  DEVICE_EVENT_STATUS_OPTIONS,
} from "./deviceEventsConstants";

export default function DeviceEventsFilters({
  searchTerm,
  onSearchChange,
  loading,
  recordCount = 0,
  pageSize = 10,
  onReload,
  onResetFilters,
  lots,
  lotId,
  onLotChange,
  filterEventType,
  onEventTypeChange,
  filterEventStatus,
  onEventStatusChange,
}) {
  return (
    <div
      lang="vi"
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={loading ? "Đang tải..." : `Tìm trong tất cả bản ghi`}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input pl-10 w-full text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onResetFilters}
            className="btn btn-secondary text-sm flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Xóa bộ lọc
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <label className="text-xs font-medium text-gray-500">Bãi xe</label>
          <select
            value={lotId}
            onChange={(e) => onLotChange(e.target.value)}
            className="input w-full text-sm"
          >
            <option value="">Tất cả bãi xe</option>
            {lots.map((lot) => {
              const id = lot.lotId ?? lot.id ?? lot.parkingLotId;
              const name = lot.name ?? lot.lotName ?? id;
              return (
                <option key={id} value={id}>
                  {name}
                </option>
              );
            })}
          </select>
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <label className="text-xs font-medium text-gray-500">
            Loại sự kiện
          </label>
          <select
            value={filterEventType}
            onChange={(e) => onEventTypeChange(e.target.value)}
            className="input w-full text-sm"
          >
            <option value="">Tất cả loại</option>
            {DEVICE_EVENT_TYPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <label className="text-xs font-medium text-gray-500">
            Trạng thái
          </label>
          <select
            value={filterEventStatus}
            onChange={(e) => onEventStatusChange(e.target.value)}
            className="input w-full text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            {DEVICE_EVENT_STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
