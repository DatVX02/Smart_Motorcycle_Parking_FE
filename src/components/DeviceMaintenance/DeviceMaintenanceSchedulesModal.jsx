import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { DatePicker } from "antd";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";

const SEGMENT_COLORS = {
  Overdue: "#dc2626",
  InProgress: "#d97706",
  Scheduled: "#2563eb",
  Completed: "#16a34a",
  Cancelled: "#64748b",
  Pending: "#64748b",
};

function segmentColorForStatus(effective) {
  return SEGMENT_COLORS[effective] || "#94a3b8";
}

/** Xuống dòng theo độ dài (ưu tiên cắt tại dấu cách), không dùng dấu … */
function wrapMaintenanceTypeLines(text, maxCharsPerLine) {
  if (!text?.trim()) return [""];
  const s = String(text).trim();
  const lines = [];
  let remaining = s;
  while (remaining.length > 0) {
    if (remaining.length <= maxCharsPerLine) {
      lines.push(remaining);
      break;
    }
    const slice = remaining.slice(0, maxCharsPerLine);
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > maxCharsPerLine * 0.35) {
      lines.push(remaining.slice(0, lastSpace).trim());
      remaining = remaining.slice(lastSpace + 1).trim();
    } else {
      lines.push(remaining.slice(0, maxCharsPerLine));
      remaining = remaining.slice(maxCharsPerLine).trim();
    }
  }
  return lines;
}

function MaintenanceTimelineHorizontal({
  schedules,
  formatDate,
  getEffectiveStatus,
  getStatusLabel,
  hoveredIndex,
  onHoverIndex,
  onSelectSchedule,
}) {
  return (
    <div className="py-4 border-b border-gray-100">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Lịch bảo trì theo dòng thời gian
        </h3>
        <p className="text-xs text-gray-500">Lướt ngang để xem đầy đủ</p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-max px-1">
          <div className="relative">
            <div className="flex gap-5">
              {schedules.map((item, index) => {
                const effective = getEffectiveStatus(item);
                const isDimmed =
                  hoveredIndex !== null &&
                  hoveredIndex !== undefined &&
                  hoveredIndex !== index;
                const titleLines = wrapMaintenanceTypeLines(
                  item.maintenanceType || `Lịch ${index + 1}`,
                  30,
                );

                return (
                  <button
                    key={item.maintenanceId ?? `schedule-${index}`}
                    type="button"
                    className={`relative z-10 w-[18rem] min-h-[8.5rem] rounded-xl border bg-white p-3 text-left transition-all ${
                      isDimmed
                        ? "opacity-45"
                        : "shadow-sm hover:shadow-md hover:-translate-y-0.5"
                    } ${hoveredIndex === index ? "ring-2 ring-blue-200 border-blue-300" : "border-gray-200"}`}
                    onMouseEnter={() => onHoverIndex?.(index)}
                    onMouseLeave={() => onHoverIndex?.(null)}
                    onClick={() => onSelectSchedule?.(item.maintenanceId)}
                    onFocus={() => onHoverIndex?.(index)}
                    onBlur={() => onHoverIndex?.(null)}
                    aria-label={`Lịch ${index + 1}: ${item.maintenanceType || "chi tiết"}`}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border-2 border-white shadow"
                        style={{
                          backgroundColor: segmentColorForStatus(effective),
                        }}
                      />
                      <span className="text-xs font-semibold text-gray-500">
                        Lịch {index + 1}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-900 leading-5">
                      {titleLines[0]}
                      {titleLines[1] ? (
                        <span className="block text-gray-700">
                          {titleLines[1]}
                        </span>
                      ) : null}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      Ngày kế tiếp:{" "}
                      <span className="font-medium text-gray-700">
                        {item.nextMaintenanceDate &&
                        !String(item.nextMaintenanceDate).startsWith("0001")
                          ? formatDate(item.nextMaintenanceDate)
                          : ""}
                      </span>
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                      {getStatusLabel(effective)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative mt-2">
              {schedules.length > 1 && (
                <div className="absolute left-4 right-4 top-3 h-[2px] bg-gray-200" />
              )}
              <div className="flex gap-5">
                {schedules.map((item, index) => {
                  const effective = getEffectiveStatus(item);
                  const active = hoveredIndex === index;

                  return (
                    <div
                      key={item.maintenanceId ?? `timeline-marker-${index}`}
                      className="w-[18rem] flex flex-col items-center"
                    >
                      <div className="h-3 w-px bg-gray-300" />
                      <span
                        className={`h-4 w-4 rounded-full border-2 border-white shadow-sm ${
                          active ? "ring-2 ring-blue-200" : ""
                        }`}
                        style={{
                          backgroundColor: segmentColorForStatus(effective),
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeviceMaintenanceSchedulesModal({
  group,
  onClose,
  onCreated,
  getEffectiveStatus,
  getStatusColor,
  getStatusLabel,
  format,
  formatDate,
  onSelectSchedule,
}) {
  if (!group) return null;

  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    maintenanceType: "",
    description: "",
    nextMaintenanceDate: "",
  });
  const [schedules, setSchedules] = useState(group.schedules || []);

  useEffect(() => {
    setSchedules(group.schedules || []);
  }, [group]);

  const disabledPastDate = (current) =>
    current && current.startOf("day").isBefore(dayjs().startOf("day"));

  const getCurrentDeviceId = () => {
    const fromGroup = group.deviceId ?? group.device_id;
    if (fromGroup != null && String(fromGroup).trim() !== "") return fromGroup;

    const first = (group.schedules || [])[0] || {};
    const fromSchedule = first.deviceId ?? first.device_id;
    if (fromSchedule != null && String(fromSchedule).trim() !== "") {
      return fromSchedule;
    }

    return null;
  };

  const handleCreateSchedule = async () => {
    const maintenanceType = newSchedule.maintenanceType.trim();
    if (!maintenanceType) {
      toast.error("Vui lòng nhập loại bảo trì", { duration: 1500 });
      return;
    }

    if (!newSchedule.nextMaintenanceDate) {
      toast.error("Vui lòng chọn ngày bảo trì tiếp theo", { duration: 1500 });
      return;
    }

    const description = newSchedule.description.trim();
    if (!description) {
      toast.error("Vui lòng nhập mô tả công việc bảo trì", { duration: 1500 });
      return;
    }

    const deviceId = getCurrentDeviceId();
    if (!deviceId) {
      toast.error("Không tìm thấy mã thiết bị để tạo lịch", { duration: 1500 });
      return;
    }

    const payload = {
      deviceId,
      maintenanceType,
      description,
      nextMaintenanceDate: dayjs(newSchedule.nextMaintenanceDate).format(
        "YYYY-MM-DD",
      ),
    };

    try {
      setCreating(true);
      const res = await DeviceMaintenanceService.create(payload);
      const createdItem =
        res?.data?.item ||
        res?.data ||
        res?.item ||
        (typeof res === "object" ? res : null);

      const fallbackId = `new-${Date.now()}`;
      const appended = {
        ...payload,
        maintenanceId:
          createdItem?.maintenanceId ?? createdItem?.id ?? fallbackId,
        status: createdItem?.status || "Scheduled",
        performedAt: createdItem?.performedAt || null,
      };

      setSchedules((prev) => [...prev, appended]);
      setNewSchedule({
        maintenanceType: "",
        description: "",
        nextMaintenanceDate: "",
      });
      setShowCreateForm(false);
      toast.success("Đã tạo lịch bảo trì", { duration: 1200 });
      await onCreated?.(createdItem || appended);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể tạo lịch bảo trì";
      toast.error(message, { duration: 1500 });
    } finally {
      setCreating(false);
    }
  };

  const sorted = [...schedules].sort((a, b) => {
    const da = a.nextMaintenanceDate
      ? dayjs(a.nextMaintenanceDate).valueOf()
      : Number.MAX_SAFE_INTEGER;
    const db = b.nextMaintenanceDate
      ? dayjs(b.nextMaintenanceDate).valueOf()
      : Number.MAX_SAFE_INTEGER;
    return da - db;
  });

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col my-auto">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 leading-tight">
              Lịch bảo trì thiết bị
            </h2>
            <p className="text-sm font-medium text-gray-800 mt-1 truncate">
              {group.deviceName || ""}
            </p>
            <p className="text-xs text-gray-500">{group.deviceCode}</p>
            <p className="text-xs text-gray-400 italic mt-0.5">
              {group.lotName?.trim() ? group.lotName : "Chưa gán bãi"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              className="h-9 rounded-lg border border-blue-200 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              {showCreateForm ? "Ẩn form" : "Thêm lịch"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5">
          {showCreateForm && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Loại bảo trì <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSchedule.maintenanceType}
                    onChange={(e) =>
                      setNewSchedule((prev) => ({
                        ...prev,
                        maintenanceType: e.target.value,
                      }))
                    }
                    placeholder="Ví dụ: Bảo trì quý 2"
                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Ngày bảo trì tiếp theo{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    className="w-full"
                    format="DD/MM/YYYY"
                    placeholder="dd/mm/yyyy"
                    disabledDate={disabledPastDate}
                    value={
                      newSchedule.nextMaintenanceDate
                        ? dayjs(newSchedule.nextMaintenanceDate)
                        : null
                    }
                    onChange={(date) =>
                      setNewSchedule((prev) => ({
                        ...prev,
                        nextMaintenanceDate: date
                          ? date.format("YYYY-MM-DD")
                          : "",
                      }))
                    }
                  />
                </div>

                <div className="lg:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={handleCreateSchedule}
                    disabled={creating}
                    className="h-10 w-full rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                  >
                    {creating ? "Đang tạo..." : "Tạo lịch bảo trì"}
                  </button>
                </div>

                <div className="lg:col-span-3">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Mô tả <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={newSchedule.description}
                    onChange={(e) =>
                      setNewSchedule((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Mô tả công việc bảo trì"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          <MaintenanceTimelineHorizontal
            schedules={sorted}
            formatDate={format}
            getEffectiveStatus={getEffectiveStatus}
            getStatusLabel={getStatusLabel}
            hoveredIndex={hoveredIndex}
            onHoverIndex={setHoveredIndex}
            onSelectSchedule={onSelectSchedule}
          />

          <ul className="space-y-3 py-4">
            {sorted.map((item, index) => {
              const eff = getEffectiveStatus(item);
              const rowActive = hoveredIndex === index;
              return (
                <li
                  key={item.maintenanceId ?? `schedule-row-${index}`}
                  className={`rounded-xl border bg-gray-50/80 p-3 transition-shadow ${
                    rowActive
                      ? "border-blue-300 ring-2 ring-blue-200 shadow-sm"
                      : "border-gray-100"
                  }`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500">
                      Lịch {index + 1}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getStatusColor(
                        eff,
                      )}`}
                    >
                      {getStatusLabel(eff)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.maintenanceType || ""}
                  </p>
                  {item.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    {item.nextMaintenanceDate &&
                      !String(item.nextMaintenanceDate).startsWith("0001") && (
                        <p>
                          Bảo trì tiếp theo:{" "}
                          <span className="text-gray-800">
                            {format(item.nextMaintenanceDate)}
                          </span>
                        </p>
                      )}
                    {item.performedAt &&
                      !String(item.performedAt).startsWith("0001") && (
                        <p>
                          Ngày thực hiện:{" "}
                          <span className="text-gray-800">
                            {formatDate(item.performedAt)}
                          </span>
                        </p>
                      )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectSchedule?.(item.maintenanceId)}
                    disabled={item.maintenanceId == null}
                    className="mt-3 w-full text-sm py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 font-medium"
                  >
                    Xem chi tiết lịch này
                  </button>
                </li>
              );
            })}

            {sorted.length === 0 && (
              <li className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                Thiết bị này chưa có lịch bảo trì. Bấm "Thêm lịch" để tạo mới.
              </li>
            )}
          </ul>
        </div>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
