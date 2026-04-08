import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import viLocale from "@fullcalendar/core/locales/vi";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  RefreshCw,
  Users,
  Calendar,
  Clock,
  Trash2,
  X,
  MapPin,
  AlertCircle,
  LayoutGrid,
  SquareDashedBottom,
  Columns2,
  Columns3,
  Columns4,
  Maximize2,
  Edit,
  Inbox,
  Phone,
  StickyNote,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogIcon,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";
import StaffSidebar from "./StaffSidebar";
import CreateShiftModal from "./CreateShiftModal";
import BulkAssignModal from "./BulkAssignModal";
import PendingShiftChangeRequestsModal from "./PendingShiftChangeRequestsModal";
import ShiftAnomaliesModal from "./ShiftAnomaliesModal";
import authService from "../../services/authService";
import workShiftService from "../../services/workShiftService";
import parkingLotService from "../../services/parkingLotService";

const SHIFT_COLORS = {
  MORNING: "#3B82F6",
  AFTERNOON: "#F59E0B",
  NIGHT: "#8B5CF6",
  FULL_DAY: "#10B981",
};
const STATUS_COLORS = {
  SCHEDULED: "#6B7280",
  PENDING_CHANGE: "#F59E0B",
  IN_PROGRESS: "#3B82F6",
  COMPLETED: "#10B981",
  CANCELLED: "#EF4444",
};
const STATUS_LABELS = {
  SCHEDULED: "Đã lên lịch",
  PENDING_CHANGE: "Chờ đổi ca",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};
const SHIFT_TYPE_LABELS = {
  Morning: "Ca sáng",
  MORNING: "Ca sáng",
  morning: "Ca sáng",
  Afternoon: "Ca chiều",
  AFTERNOON: "Ca chiều",
  afternoon: "Ca chiều",
  Night: "Ca đêm",
  NIGHT: "Ca đêm",
  night: "Ca đêm",
  FullDay: "Cả ngày",
  FULL_DAY: "Cả ngày",
  full_day: "Cả ngày",
  Fullday: "Cả ngày",
};

const HIDDEN_CALENDAR_STATUSES = new Set(["CANCELLED", "REJECTED"]);

function shiftStatusKey(shift) {
  return String(shift?.shiftStatus ?? shift?.ShiftStatus ?? shift?.status ?? "")
    .trim()
    .toUpperCase();
}

function shouldHideShiftOnCalendar(shift) {
  return HIDDEN_CALENDAR_STATUSES.has(shiftStatusKey(shift));
}
const LEGEND_ITEMS = [
  { type: "MORNING", label: "Ca sáng", color: SHIFT_COLORS.MORNING },
  { type: "AFTERNOON", label: "Ca chiều", color: SHIFT_COLORS.AFTERNOON },
  { type: "NIGHT", label: "Ca đêm", color: SHIFT_COLORS.NIGHT },
  { type: "FULL_DAY", label: "Cả ngày", color: SHIFT_COLORS.FULL_DAY },
];
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-orange-500",
];

function getAvatarColor(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + h * 31;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name = "") {
  return name
    .split(" ")
    .slice(-2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

/** YYYY-MM-DD theo giờ local (so khớp ô ngày trên lịch). */
function getLocalYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Khoảng đếm "Ca đã lên lịch": từ hôm nay (hoặc đầu tháng nếu đang xem tháng tương lai)
 * đến hết tháng đang xem — không tính ngày đã qua trong tháng.
 * Trả về null nếu cả tháng đã nằm trước hôm nay.
 */
function getScheduledStatsDateRangeYmd(viewedMonth, todayYmd) {
  const y = viewedMonth.year;
  const m = viewedMonth.month; // 0–11 (giống Date.getMonth)
  const lastDay = new Date(y, m + 1, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");
  const monthNum = m + 1;
  const monthStart = `${y}-${pad(monthNum)}-01`;
  const monthEnd = `${y}-${pad(monthNum)}-${pad(lastDay)}`;
  const rangeStart = todayYmd > monthStart ? todayYmd : monthStart;
  if (rangeStart > monthEnd) return null;
  return { start: rangeStart, end: monthEnd };
}

function toCalendarEvent(shift, todayYmd) {
  const rawDate =
    shift.shiftDate ?? shift.workDate ?? shift.date ?? shift.ShiftDate ?? "";
  const date = rawDate ? rawDate.split("T")[0] : "";
  const startTime = shift.startTime ?? shift.StartTime ?? shift.start ?? "";
  const endTime = shift.endTime ?? shift.EndTime ?? shift.end ?? "";
  const staffName =
    shift.staffName ??
    shift.StaffName ??
    shift.staff?.fullName ??
    shift.staff?.name ??
    "Nhân viên";
  const shiftType = (shift.shiftType ?? shift.ShiftType ?? "").toUpperCase();
  const shiftStatus = (
    shift.shiftStatus ??
    shift.ShiftStatus ??
    shift.status ??
    ""
  ).toUpperCase();

  const color =
    SHIFT_COLORS[shiftType] ?? STATUS_COLORS[shiftStatus] ?? "#6B7280";
  const startStr =
    startTime && date ? `${date}T${startTime.slice(0, 5)}` : date || undefined;
  const endStr = endTime && date ? `${date}T${endTime.slice(0, 5)}` : undefined;
  /** Hôm nay và các ngày trước: chỉ xem, không bấm / không xóa hàng loạt (chia ca chỉ từ ngày mai). */
  const isReadOnlyShift = Boolean(date && todayYmd && date <= todayYmd);

  return {
    id: String(shift.shiftId ?? shift.ShiftId ?? shift.id ?? Math.random()),
    title: staffName,
    start: startStr,
    end: endStr,
    backgroundColor: color,
    borderColor: color,
    textColor: "#ffffff",
    extendedProps: { shift, isReadOnlyShift },
  };
}

function DroppableLotCalendar({ lotId, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: `calendar-${lotId}` });
  return (
    <div
      ref={setNodeRef}
      data-lot-id={lotId}
      className={`relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full transition-all duration-200 ${
        isOver ? "ring-2 ring-blue-500 bg-blue-50/30" : ""
      }`}
    >
      {children}
    </div>
  );
}

function StaffDragOverlayCard({ staff }) {
  const name = staff?.fullName ?? staff?.name ?? "Nhân viên";
  const id = staff?.staffId ?? staff?.id ?? "";
  const avatarUrl =
    staff?.faceImageUrl ?? staff?.avatarUrl ?? staff?.imageUrl ?? "";
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-xl shadow-2xl border border-blue-300 cursor-grabbing min-w-[180px]">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-100"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/avatar_comingsoon.png";
          }}
        />
      ) : (
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(id)}`}
        >
          {getInitials(name)}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-gray-800">{name}</p>
        <p className="text-xs text-blue-500 font-medium">
          Thả vào ngày & bãi xe
        </p>
      </div>
    </div>
  );
}

const STATUS_DOT = {
  COMPLETED: { color: "#10B981", label: "Hoàn thành", icon: "✓" },
  IN_PROGRESS: { color: "#3B82F6", label: "Đang làm" },
  PENDING_CHANGE: { color: "#F59E0B", label: "Chờ đổi ca" },
  CANCELLED: { color: "#EF4444", label: "Đã hủy" },
};

function renderEventContent(eventInfo) {
  const { shift } = eventInfo.event.extendedProps;
  const name = shift?.staffName ?? eventInfo.event.title;
  const statusKey = (shift?.shiftStatus ?? shift?.status ?? "").toUpperCase();
  const dot = STATUS_DOT[statusKey];

  return (
    <div className="px-1.5 py-0.5 w-full overflow-hidden flex items-start gap-1">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate leading-tight">{name}</p>
        {shift?.startTime && shift?.endTime && (
          <p className="text-[11px] opacity-90 truncate leading-tight">
            {shift.startTime.slice(0, 5)} – {shift.endTime.slice(0, 5)}
          </p>
        )}
      </div>
      {dot && (
        <div className="flex-shrink-0 mt-0.5" title={dot.label}>
          {dot.icon ? (
            <span className="text-[10px] font-bold leading-none opacity-90">
              {dot.icon}
            </span>
          ) : (
            <div
              className="w-2 h-2 rounded-full ring-1 ring-white"
              style={{ backgroundColor: dot.color }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ShiftTooltip({ tooltip }) {
  if (!tooltip) return null;
  const { x, y, shift, readOnly } = tooltip;
  const shiftType = (shift?.shiftType ?? "").toUpperCase();
  const statusKey = (shift?.shiftStatus ?? shift?.status ?? "").toUpperCase();
  const barColor =
    SHIFT_COLORS[shiftType] ?? STATUS_COLORS[statusKey] ?? "#6B7280";

  const name = shift?.staffName ?? shift?.StaffName ?? "Nhân viên";
  const phone =
    shift?.phone ??
    shift?.phoneContact ??
    shift?.staffPhone ??
    shift?.contactPhone ??
    null;
  const position =
    shift?.position ?? shift?.dutyPosition ?? shift?.workPosition ?? null;
  const notes = shift?.notes ?? shift?.note ?? shift?.description ?? null;
  const startTime = (shift?.startTime ?? "").slice(0, 5);
  const endTime = (shift?.endTime ?? "").slice(0, 5);
  const lotName = shift?.lotName ?? shift?.LotName ?? "";

  const safeX = Math.min(x + 14, window.innerWidth - 240);
  const safeY = Math.max(8, Math.min(y - 12, window.innerHeight - 260));

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ left: safeX, top: safeY }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-[220px]"
        style={{ borderTopWidth: 3, borderTopColor: barColor }}
      >
        <div className="px-3 pt-2.5 pb-3 space-y-2">
          {/* Name & shift type */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold text-gray-800 leading-snug truncate flex-1">
              {name}
            </p>
            {shift?.shiftType && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: barColor + "25", color: barColor }}
              >
                {SHIFT_TYPE_LABELS[shift.shiftType] ?? shift.shiftType}
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-[11px] text-gray-600">
            {(startTime || endTime) && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="font-medium">
                  {startTime} – {endTime}
                </span>
              </div>
            )}
            {lotName && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="truncate">{lotName}</span>
              </div>
            )}
            {position && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <span className="truncate text-blue-600 font-medium">
                  {position}
                </span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span>{phone}</span>
              </div>
            )}
            {notes && (
              <div className="flex items-start gap-1.5 pt-1.5 mt-0.5 border-t border-gray-100">
                <StickyNote className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-500 line-clamp-3 leading-relaxed">
                  {notes}
                </span>
              </div>
            )}
          </div>

          {/* Status badge */}
          <div className="pt-1.5 border-t border-gray-100 flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: STATUS_COLORS[statusKey] ?? "#6B7280" }}
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: STATUS_COLORS[statusKey] ?? "#6B7280" }}
            >
              {STATUS_LABELS[statusKey] ?? shift?.shiftStatus ?? "—"}
            </span>
            <span className="text-[10px] text-gray-400 ml-auto">
              {readOnly ? "Chỉ xem (không chỉnh sửa)" : "Nhấn để xem chi tiết"}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  lots,
  colorClass,
  dotColor,
  headerClass,
  valueClass,
  rowValueClass,
  rowUnit = "ca",
}) {
  const hasLots = lots.length > 0;
  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-default select-none ${colorClass}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-xs font-medium">{label}</span>
      <span className={`text-sm font-bold ${valueClass ?? ""}`}>{value}</span>
      {hasLots && (
        <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0 transition-transform group-hover:rotate-180" />
      )}
      {hasLots && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-[9999] hidden group-hover:block w-max min-w-[220px] max-w-[340px] pointer-events-none group-hover:pointer-events-auto">
          {/* Tam giác trỏ lên */}
          <div
            className="ml-4 w-0 h-0"
            style={{
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              borderBottom: "7px solid #e5e7eb",
            }}
          />
          <div
            className="-mt-px ml-[17px] w-0 h-0"
            style={{
              position: "absolute",
              top: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderBottom: "6px solid white",
            }}
          />
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className={`px-3 py-2 border-b ${headerClass}`}>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wide ${dotColor}`}
              >
                Chi tiết theo bãi
              </span>
            </div>
            <div className="py-1">
              {lots.map((lot, idx) => (
                <div
                  key={`${lot.name}-${idx}`}
                  className="flex items-center justify-between gap-6 px-3 py-1.5 hover:bg-gray-50"
                >
                  <span className="text-xs text-gray-600">{lot.name}</span>
                  <span
                    className={`text-xs font-bold flex-shrink-0 ${rowValueClass ?? dotColor}`}
                  >
                    {lot.count} {rowUnit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDateVi(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function DateInput({ value, onChange, placeholder, min }) {
  return (
    <div className="relative flex items-center">
      <input
        type="date"
        value={value}
        min={min}
        onChange={onChange}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        tabIndex={-1}
      />
      <span
        className={`text-xs font-medium select-none pointer-events-none px-1 ${value ? "text-gray-800" : "text-gray-400"}`}
      >
        {value ? fmtDateVi(value) : placeholder}
      </span>
    </div>
  );
}

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [ref, onClose]);
}

/** null = tất cả bãi — hiển thị lịch gộp; chọn một id = chỉ lịch bãi đó */
function LotDropdown({ lots, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isAll = value == null || value === "";
  const selected = isAll
    ? { id: null, name: "Tất cả bãi xe" }
    : lots.find((l) => String(l.id) === String(value));
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm transition-all hover:shadow-md ${open ? "border-blue-400 ring-1 ring-blue-100" : "border-blue-200 hover:border-blue-400"}`}
      >
        <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-800 max-w-[200px] truncate">
          {selected?.name ?? "Chọn bãi xe"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-[200] bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 min-w-[240px] max-w-[320px] overflow-hidden max-h-[min(70vh,420px)] overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 pb-1.5 pt-0.5">
            Chọn bãi xe
          </p>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${isAll ? "bg-blue-50" : "hover:bg-gray-50"}`}
          >
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${isAll ? "bg-blue-500" : "bg-gray-300"}`}
            />
            <span
              className={`text-xs font-medium flex-1 ${isAll ? "text-blue-700 font-semibold" : "text-gray-700"}`}
            >
              Tất cả bãi xe
            </span>
            {isAll && (
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            )}
          </button>
          {lots.map((lot) => {
            const isActive = String(lot.id) === String(value);
            return (
              <button
                key={lot.id}
                type="button"
                onClick={() => {
                  onChange(lot.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${isActive ? "bg-blue-50" : "hover:bg-gray-50"}`}
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-blue-500" : "bg-gray-300"}`}
                />
                <span
                  className={`text-xs font-medium truncate flex-1 ${isActive ? "text-blue-700" : "text-gray-700"}`}
                >
                  {lot.name}
                </span>
                {isActive && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SHIFT_TYPE_OPTIONS = [
  { value: "", label: "Tất cả ca", dot: "#6B7280" },
  { value: "MORNING", label: "Ca sáng", dot: "#3B82F6" },
  { value: "AFTERNOON", label: "Ca chiều", dot: "#F59E0B" },
  { value: "NIGHT", label: "Ca đêm", dot: "#8B5CF6" },
  { value: "FULL_DAY", label: "Cả ngày", dot: "#10B981" },
];

function StaffFilterDropdown({ staff, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close);

  const selected = staff.find(
    (s) => String(s.staffId ?? s.id) === String(value),
  );

  const filtered = staff.filter((s) => {
    const name = (s.fullName ?? s.name ?? "").toLowerCase();
    const q = search.toLowerCase();
    return !q || name.includes(q);
  });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm transition-all hover:shadow-md ${open ? "border-violet-400 ring-1 ring-violet-100" : value ? "border-violet-300 bg-violet-50" : "border-gray-200 hover:border-gray-400"}`}
      >
        <Users className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
        <span
          className={`text-xs font-semibold max-w-[140px] truncate ${value ? "text-violet-700" : "text-gray-800"}`}
        >
          {selected ? (selected.fullName ?? selected.name) : "Tất cả NV"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-[200] bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 min-w-[220px] max-w-[280px] overflow-hidden">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 pb-1.5 pt-0.5">
            Lọc theo nhân viên
          </p>
          {/* Search */}
          <div className="px-3 pb-1.5">
            <input
              type="text"
              placeholder="Tìm nhân viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder:text-gray-400 bg-gray-50"
            />
          </div>
          <div className="max-h-[260px] overflow-y-auto">
            {/* Tất cả nhân viên */}
            <button
              onClick={() => {
                onChange("");
                setOpen(false);
                setSearch("");
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${!value ? "bg-violet-50" : "hover:bg-gray-50"}`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${!value ? "bg-violet-500" : "bg-gray-300"}`}
              />
              <span
                className={`text-xs font-medium flex-1 ${!value ? "text-violet-700 font-semibold" : "text-gray-700"}`}
              >
                Tất cả nhân viên
              </span>
              {!value && (
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
              )}
            </button>
            {filtered.map((s) => {
              const id = String(s.staffId ?? s.id);
              const isActive = String(value) === id;
              const name = s.fullName ?? s.name ?? "Nhân viên";
              return (
                <button
                  key={id}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${isActive ? "bg-violet-50" : "hover:bg-gray-50"}`}
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-violet-500" : "bg-gray-300"}`}
                  />
                  <span
                    className={`text-xs font-medium truncate flex-1 ${isActive ? "text-violet-700 font-semibold" : "text-gray-700"}`}
                  >
                    {name}
                  </span>
                  {isActive && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">
                Không tìm thấy
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ShiftTypeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected =
    SHIFT_TYPE_OPTIONS.find((o) => o.value === value) ?? SHIFT_TYPE_OPTIONS[0];
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm transition-all hover:shadow-md ${open ? "border-gray-400 ring-1 ring-gray-100" : "border-gray-200 hover:border-gray-400"}`}
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: selected.dot }}
        />
        <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">
          {selected.label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-[200] bg-white border border-gray-200 rounded-xl shadow-2xl py-1.5 min-w-[160px] overflow-hidden">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 pb-1.5 pt-0.5">
            Lọc theo ca
          </p>
          {SHIFT_TYPE_OPTIONS.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${isActive ? "bg-gray-50" : "hover:bg-gray-50"}`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: opt.dot }}
                />
                <span
                  className={`text-xs font-medium flex-1 ${isActive ? "text-gray-900 font-semibold" : "text-gray-700"}`}
                >
                  {opt.label}
                </span>
                {isActive && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Shifts() {
  const [allStaff, setAllStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [parkingLots, setParkingLots] = useState([]);

  const [shiftsByLot, setShiftsByLot] = useState({});

  const [viewMode, setViewMode] = useState("tab");
  const [gridCols, setGridCols] = useState(2);
  /** null = tất cả bãi (mặc định: lịch gộp mọi bãi) */
  const [activeTabLotId, setActiveTabLotId] = useState(null);

  const [viewedMonth, setViewedMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [activeStaff, setActiveStaff] = useState(null);
  const [createModal, setCreateModal] = useState(null);
  const [detailShift, setDetailShift] = useState(null);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedRange, setSelectedRange] = useState(null);
  const [isMultiDeleteMode, setIsMultiDeleteMode] = useState(false);
  const [selectedShiftIds, setSelectedShiftIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [filterShiftType, setFilterShiftType] = useState("");
  const [filterStaffId, setFilterStaffId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [tooltip, setTooltip] = useState(null);
  const [calendarView, setCalendarView] = useState("dayGridMonth");
  const [calendarViewTitle, setCalendarViewTitle] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  });
  const calendarRef = useRef(null);
  const calendarRefs = useRef({});

  const tabShowsAllLots =
    viewMode === "tab" && (activeTabLotId == null || activeTabLotId === "");

  /** Chỉ tab + chọn 1 bãi: thống kê đầu trang theo bãi đó; còn lại = tất cả bãi */
  const activeStatsLotId =
    viewMode === "tab" && activeTabLotId != null && activeTabLotId !== ""
      ? activeTabLotId
      : null;

  const calendarApiAll = useCallback(
    (fn) => {
      if (viewMode === "tab" && !tabShowsAllLots) {
        fn(calendarRef.current?.getApi());
      } else {
        Object.values(calendarRefs.current).forEach((r) => fn(r?.getApi()));
      }
    },
    [viewMode, tabShowsAllLots],
  );

  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const update = (e) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", update);
    window.addEventListener("pointerup", update);
    return () => {
      window.removeEventListener("pointermove", update);
      window.removeEventListener("pointerup", update);
    };
  }, []);

  useEffect(() => {
    loadStaff();
    loadParkingLots();
    loadPendingCount();
  }, []);

  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      const data = await authService.getAllStaff();
      let arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.items)
            ? data.items
            : data?.data?.items || [];
      const staffOnly = arr.filter(
        (s) => (s.role ?? "").toUpperCase() === "STAFF",
      );
      setAllStaff(staffOnly);
    } catch (err) {
      toast.error("Lỗi tải nhân viên");
    } finally {
      setStaffLoading(false);
    }
  };

  const loadParkingLots = async () => {
    try {
      const data = await parkingLotService.getAllParkingLots();
      const arr = Array.isArray(data) ? data : [];
      const normalized = arr.map((lot) => ({
        id: lot.lotId ?? lot.id,
        name: lot.lotName ?? lot.name ?? "Bãi xe",
      }));
      setParkingLots(normalized);
    } catch (err) {
      toast.error("Lỗi tải bãi xe");
    }
  };

  const loadPendingCount = async () => {
    try {
      const data = await workShiftService.getPendingShiftChangeRequests();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.items)
            ? data.items
            : (data?.data?.items ?? []);
      setPendingCount(arr.length);
    } catch {
      // silent – badge không hiện nếu lỗi
    }
  };

  const loadAllShifts = useCallback(
    async (lots, monthOverride) => {
      const { year, month } = monthOverride ?? viewedMonth;
      // Tính startDate / endDate của tháng đang xem (±1 tuần để lịch không bị trống biên)
      const start = new Date(year, month - 1, 1);
      start.setDate(start.getDate() - 7);
      const end = new Date(year, month, 0);
      end.setDate(end.getDate() + 7);
      const pad = (n) => String(n).padStart(2, "0");
      const fmt = (d) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      try {
        const results = {};
        await Promise.all(
          lots.map(async (lot) => {
            let data;
            try {
              // Thử filter theo tháng trước (giảm tải server)
              data = await workShiftService.getByLot(lot.id, {
                month: month,
                year: year,
                startDate: fmt(start),
                endDate: fmt(end),
              });
            } catch {
              // Nếu server không hỗ trợ params đó, thử không params
              data = await workShiftService.getByLot(lot.id, {});
            }
            const arr = Array.isArray(data)
              ? data
              : Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data?.items)
                  ? data.items
                  : data?.data?.items || [];
            results[lot.id] = arr;
          }),
        );
        setShiftsByLot(results);
      } catch (err) {
        toast.error(`Lỗi tải ca trực: ${err.message}`);
      }
    },
    [viewedMonth],
  );

  useEffect(() => {
    if (parkingLots.length > 0) loadAllShifts(parkingLots);
  }, [parkingLots, refreshKey, loadAllShifts]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const todayLocalStr = getLocalYmd();

  const clearRange = () => setSelectedRange(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = useCallback(({ active }) => {
    setActiveStaff(active.data.current ?? null);
  }, []);

  const handleDragEnd = useCallback(
    ({ active }) => {
      const { x, y } = lastMousePos.current;
      let targetDate = null;
      let targetLotId = null;

      if (x > 0 || y > 0) {
        const elements = document.elementsFromPoint(x, y);
        for (const el of elements) {
          if (!targetDate) {
            const dateEl =
              el.closest("[data-date]") ??
              (el.hasAttribute?.("data-date") ? el : null);
            if (dateEl) targetDate = dateEl.getAttribute("data-date");
          }
          if (!targetLotId) {
            const lotEl =
              el.closest("[data-lot-id]") ??
              (el.hasAttribute?.("data-lot-id") ? el : null);
            if (lotEl) targetLotId = lotEl.getAttribute("data-lot-id");
          }
        }
      }

      setActiveStaff(null);
      if (!targetDate || !targetLotId) return;

      const tomorrowMidnight = new Date();
      tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
      tomorrowMidnight.setHours(0, 0, 0, 0);
      if (new Date(targetDate + "T00:00:00") < tomorrowMidnight) {
        toast.error("Chỉ được chia lịch từ ngày mai trở đi");
        return;
      }

      const draggedStaff = active.data.current;
      const range = selectedRange;
      setSelectedRange(null);
      setCreateModal({
        staff: draggedStaff,
        date: range?.start ?? targetDate,
        lotId: targetLotId,
        endDate: range?.end ?? null,
        useRange: !!range,
      });
    },
    [selectedRange],
  );

  const handleEventMouseEnter = useCallback((info) => {
    const shift = info.event.extendedProps?.shift;
    if (!shift) return;
    const rect = info.el.getBoundingClientRect();
    setTooltip({
      x: rect.right + 6,
      y: rect.top,
      shift,
      readOnly: !!info.event.extendedProps?.isReadOnlyShift,
    });
  }, []);

  const handleEventMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleDateClick = (info, lotId) => {
    const tomorrowMidnight = new Date();
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
    tomorrowMidnight.setHours(0, 0, 0, 0);
    if (new Date(info.dateStr + "T00:00:00") < tomorrowMidnight) {
      toast.error("Chỉ được chia lịch từ ngày mai trở đi");
      return;
    }
    // Click vào 1 ô ngày = luôn mở modal tạo ca đơn (single)
    setSelectedRange(null);
    setCreateModal({
      staff: null,
      date: info.dateStr,
      lotId,
      endDate: null,
      useRange: false,
    });
  };

  const handleDatesSet = useCallback((arg) => {
    const d = arg.view.currentStart;
    setViewedMonth({ year: d.getFullYear(), month: d.getMonth() });
    setCalendarViewTitle(arg.view.title);
    setCalendarView(arg.view.type);
  }, []);

  const handleEventClick = (info) => {
    const shift = info.event.extendedProps.shift;
    if (!shift) return;
    if (info.event.extendedProps.isReadOnlyShift) return;
    if (isMultiDeleteMode) {
      const id = String(shift.shiftId ?? shift.ShiftId ?? shift.id);
      setSelectedShiftIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setDetailShift(shift);
    }
  };

  const exitMultiDeleteMode = () => {
    setIsMultiDeleteMode(false);
    setSelectedShiftIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedShiftIds.size === 0) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedShiftIds);
      const BATCH_SIZE = 10;
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((id) => workShiftService.delete(id)));
      }
      setShiftsByLot((prev) => {
        const next = {};
        for (const [lotId, shifts] of Object.entries(prev)) {
          next[lotId] = shifts.filter(
            (s) => !ids.includes(String(s.shiftId ?? s.ShiftId ?? s.id)),
          );
        }
        return next;
      });
      toast.success(`Đã xóa ${ids.length} ca trực`);
      exitMultiDeleteMode();
      setTimeout(handleRefresh, 300);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? "Xóa thất bại",
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  const inactiveStaffIds = useMemo(
    () =>
      new Set(
        allStaff
          .filter((s) => s.isActive === false)
          .map((s) => String(s.staffId ?? s.id ?? "")),
      ),
    [allStaff],
  );

  const handleRangeSelect = useCallback(
    (selectInfo, calendarLotId) => {
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      tomorrowDate.setHours(0, 0, 0, 0);

      const endExclusive = new Date(selectInfo.endStr + "T00:00:00");
      endExclusive.setDate(endExclusive.getDate() - 1);
      const endStr = `${endExclusive.getFullYear()}-${String(endExclusive.getMonth() + 1).padStart(2, "0")}-${String(endExclusive.getDate()).padStart(2, "0")}`;
      const startStr = selectInfo.startStr;

      if (isMultiDeleteMode) {
        // Chỉ ca của đúng bãi đang kéo trên lịch (tránh lệch số so với ô hiển thị)
        const shiftsInCalendar = shiftsByLot[calendarLotId] ?? [];
        const idsToAdd = new Set();
        for (const shift of shiftsInCalendar) {
          if (
            inactiveStaffIds.has(String(shift.staffId ?? shift.StaffId ?? ""))
          )
            continue;
          const date = (
            shift.shiftDate ??
            shift.workDate ??
            shift.date ??
            ""
          ).split("T")[0];
          if (
            date &&
            date >= startStr &&
            date <= endStr &&
            date > todayLocalStr
          ) {
            const sid = String(
              shift.shiftId ?? shift.ShiftId ?? shift.id ?? "",
            );
            if (sid) idsToAdd.add(sid);
          }
        }
        setSelectedShiftIds((prev) => new Set([...prev, ...idsToAdd]));
        selectInfo.view.calendar.unselect();
        return;
      }

      if (selectInfo.start < tomorrowDate) {
        selectInfo.view.calendar.unselect();
        toast.error("Chỉ được chia lịch từ ngày mai trở đi");
        return;
      }
      setSelectedRange({ start: startStr, end: endStr });
      selectInfo.view.calendar.unselect();
    },
    [isMultiDeleteMode, shiftsByLot, inactiveStaffIds, todayLocalStr],
  );

  const activeStaffForSidebar = useMemo(
    () => allStaff.filter((s) => s.isActive !== false),
    [allStaff],
  );

  const allShiftsArray = useMemo(() => {
    const raw = Object.values(shiftsByLot).flat();
    return raw.filter(
      (s) =>
        !inactiveStaffIds.has(String(s.staffId ?? s.StaffId ?? "")) &&
        !shouldHideShiftOnCalendar(s),
    );
  }, [shiftsByLot, inactiveStaffIds]);

  // Khi chọn range ngày: chỉ hiển thị staff KHÔNG có ca trong khoảng đó (rảnh để gán)
  const sidebarStaff = useMemo(() => {
    if (!selectedRange) return activeStaffForSidebar;
    const { start, end } = selectedRange;
    const staffIdsWithShiftsInRange = new Set();
    for (const shift of allShiftsArray) {
      const date = (
        shift.shiftDate ??
        shift.workDate ??
        shift.date ??
        ""
      ).split("T")[0];
      if (date && date >= start && date <= end) {
        staffIdsWithShiftsInRange.add(
          String(shift.staffId ?? shift.StaffId ?? ""),
        );
      }
    }
    return activeStaffForSidebar.filter(
      (s) => !staffIdsWithShiftsInRange.has(String(s.staffId ?? s.id ?? "")),
    );
  }, [selectedRange, activeStaffForSidebar, allShiftsArray]);

  // Kiểm tra một ngày có thuộc tháng đang xem trên calendar không
  const isInViewedMonth = useCallback(
    (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr.split("T")[0] + "T00:00:00");
      return (
        d.getFullYear() === viewedMonth.year &&
        d.getMonth() === viewedMonth.month
      );
    },
    [viewedMonth],
  );

  // Shifts của 1 lot đã lọc theo tháng đang xem (dùng cho thống kê đầu trang; có lọc NV nếu đang chọn)
  const lotShiftsInMonth = useCallback(
    (lotId) =>
      (shiftsByLot[lotId] ?? []).filter((s) => {
        if (inactiveStaffIds.has(String(s.staffId ?? s.StaffId ?? "")))
          return false;
        if (shouldHideShiftOnCalendar(s)) return false;
        if (
          filterStaffId &&
          String(s.staffId ?? s.StaffId ?? "") !== String(filterStaffId)
        )
          return false;
        return isInViewedMonth(s.shiftDate ?? s.workDate ?? s.date ?? "");
      }),
    [shiftsByLot, inactiveStaffIds, isInViewedMonth, filterStaffId],
  );

  const statsParkingLots = useMemo(
    () =>
      activeStatsLotId != null
        ? parkingLots.filter((l) => String(l.id) === String(activeStatsLotId))
        : parkingLots,
    [parkingLots, activeStatsLotId],
  );

  const todayShifts = useMemo(() => {
    const base =
      activeStatsLotId != null
        ? (shiftsByLot[activeStatsLotId] ?? []).filter(
            (s) => !inactiveStaffIds.has(String(s.staffId ?? s.StaffId ?? "")),
          )
        : allShiftsArray;
    return base.filter((s) => {
      if (
        filterStaffId &&
        String(s.staffId ?? s.StaffId ?? "") !== String(filterStaffId)
      )
        return false;
      return (
        (s.shiftDate ?? s.workDate ?? s.date ?? "").split("T")[0] ===
        todayLocalStr
      );
    });
  }, [
    activeStatsLotId,
    shiftsByLot,
    inactiveStaffIds,
    allShiftsArray,
    todayLocalStr,
    filterStaffId,
  ]);

  const todayShiftsByLot = useMemo(
    () =>
      statsParkingLots.map((lot) => ({
        name: lot.name,
        count: (shiftsByLot[lot.id] ?? []).filter((s) => {
          if (inactiveStaffIds.has(String(s.staffId ?? s.StaffId ?? "")))
            return false;
          if (shouldHideShiftOnCalendar(s)) return false;
          if (
            filterStaffId &&
            String(s.staffId ?? s.StaffId ?? "") !== String(filterStaffId)
          )
            return false;
          return (
            (s.shiftDate ?? s.workDate ?? "").split("T")[0] === todayLocalStr
          );
        }).length,
      })),
    [
      statsParkingLots,
      shiftsByLot,
      inactiveStaffIds,
      todayLocalStr,
      filterStaffId,
    ],
  );

  const scheduledStatsDateRange = useMemo(
    () => getScheduledStatsDateRangeYmd(viewedMonth, todayLocalStr),
    [viewedMonth, todayLocalStr],
  );

  const scheduledByLot = useMemo(
    () =>
      statsParkingLots.map((lot) => ({
        name: lot.name,
        count: lotShiftsInMonth(lot.id).filter((s) => {
          if ((s.shiftStatus ?? "").toUpperCase() !== "SCHEDULED") return false;
          if (!scheduledStatsDateRange) return false;
          const d = (s.shiftDate ?? s.workDate ?? s.date ?? "").split("T")[0];
          return (
            d >= scheduledStatsDateRange.start &&
            d <= scheduledStatsDateRange.end
          );
        }).length,
      })),
    [statsParkingLots, lotShiftsInMonth, scheduledStatsDateRange],
  );

  const inProgressByLot = useMemo(
    () =>
      statsParkingLots.map((lot) => ({
        name: lot.name,
        count: lotShiftsInMonth(lot.id).filter(
          (s) => (s.shiftStatus ?? "").toUpperCase() === "IN_PROGRESS",
        ).length,
      })),
    [statsParkingLots, lotShiftsInMonth],
  );

  const totalByLot = useMemo(
    () =>
      statsParkingLots.map((lot) => ({
        name: lot.name,
        count: lotShiftsInMonth(lot.id).length,
      })),
    [statsParkingLots, lotShiftsInMonth],
  );

  const scheduledCount = scheduledByLot.reduce((s, l) => s + l.count, 0);
  const inProgressCount = inProgressByLot.reduce((s, l) => s + l.count, 0);

  const gridLayoutClass =
    {
      1: "grid-cols-1",
      2: "grid-cols-1 xl:grid-cols-2",
      3: "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    }[gridCols] || "grid-cols-1";

  const visibleLots =
    viewMode === "tab"
      ? tabShowsAllLots
        ? parkingLots
        : parkingLots.filter((l) => String(l.id) === String(activeTabLotId))
      : parkingLots;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <style>{`
        .fc .fc-day-today {
          background: rgba(59, 130, 246, 0.07) !important;
        }
        .fc .fc-day-today .fc-daygrid-day-frame {
          border-left: 2px solid rgba(59, 130, 246, 0.5);
        }
        .fc .fc-col-header-cell.fc-day-today {
          background: rgba(59, 130, 246, 0.1) !important;
        }
        .fc .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion {
          color: #2563EB;
          font-weight: 700;
        }
        .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
          color: #2563EB;
          font-weight: 800;
          background: rgba(59, 130, 246, 0.15);
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 2px;
        }
        .fc-past-disabled {
          background: rgba(0,0,0,0.02) !important;
          color: #9CA3AF;
        }
        .fc-past-disabled .fc-daygrid-day-number {
          color: #D1D5DB;
        }
      `}</style>
      <div className="absolute inset-0 flex flex-col min-h-0 gap-0 bg-gray-50/80">
        {/* ── Hàng 1: Thống kê + Hành động ── */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2 bg-white border-b border-gray-100 flex-shrink-0 z-30 overflow-visible">
          {/* Trái – Stats */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatCard
              icon={Calendar}
              label="Ca hôm nay:"
              value={`${todayShifts.length} ca`}
              lots={todayShiftsByLot}
              colorClass="bg-blue-50 text-blue-700"
              dotColor="text-blue-600"
              headerClass="bg-blue-50 border-blue-100"
            />
            <StatCard
              icon={Clock}
              label="Ca đã lên lịch:"
              value={`${scheduledCount} ca`}
              lots={scheduledByLot}
              colorClass="bg-gray-100 text-gray-700"
              dotColor="text-gray-500"
              headerClass="bg-gray-50 border-gray-200"
              rowValueClass="text-gray-700"
            />
            <StatCard
              icon={AlertCircle}
              label="Ca đang trực:"
              value={`${inProgressCount} ca`}
              lots={inProgressByLot}
              colorClass="bg-emerald-50 text-emerald-700"
              dotColor="text-emerald-600"
              headerClass="bg-emerald-50 border-emerald-100"
            />
            <StatCard
              icon={Users}
              label="Tổng ca trực:"
              value={`${totalByLot.reduce((s, l) => s + l.count, 0)} ca / tháng`}
              lots={totalByLot}
              colorClass="bg-violet-50 text-violet-700"
              dotColor="text-violet-600"
              headerClass="bg-violet-50 border-violet-100"
              rowUnit="ca / tháng"
            />
          </div>

          {/* Phải – Hành động */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowAnomalies(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all shadow-sm"
              title="Kiểm tra bất thường trong lịch"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kiểm tra lịch</span>
            </button>
            <button
              onClick={() => {
                setShowPendingRequests(true);
                setPendingCount(0);
              }}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all shadow-sm"
              title="Xem yêu cầu đổi ca chờ xử lý"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Yêu cầu đổi ca</span>
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shadow-sm">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                if (isMultiDeleteMode) exitMultiDeleteMode();
                else setIsMultiDeleteMode(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm ${
                isMultiDeleteMode
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 ring-1 ring-red-100"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-red-600"
              }`}
              title={
                isMultiDeleteMode ? "Thoát chế độ chọn" : "Chọn nhiều ca để xóa"
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isMultiDeleteMode ? "Hủy chọn" : "Xóa nhiều"}
              </span>
            </button>
          </div>
        </div>

        {/* ── Hàng 2: Calendar Toolbar ── */}
        <div className="flex items-center gap-2 px-4 md:px-6 py-2 bg-gray-50/80 border-b border-gray-200 flex-shrink-0 z-20 overflow-visible">
          {/* Trái – Bãi xe + Bộ lọc + Chế độ xem */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Dropdown chọn bãi xe (chỉ tab mode) */}
            {viewMode === "tab" && parkingLots.length > 0 && (
              <LotDropdown
                lots={parkingLots}
                value={activeTabLotId}
                onChange={setActiveTabLotId}
              />
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-gray-300 flex-shrink-0" />

            {/* Loại ca */}
            <ShiftTypeDropdown
              value={filterShiftType}
              onChange={setFilterShiftType}
            />

            {/* Nhân viên */}
            <StaffFilterDropdown
              staff={activeStaffForSidebar}
              value={filterStaffId}
              onChange={setFilterStaffId}
            />

            {/* Khoảng ngày */}
            <div
              className={`flex items-center gap-1.5 bg-white border rounded-lg px-2.5 py-1.5 shadow-sm transition-colors cursor-pointer ${filterDateFrom || filterDateTo ? "border-blue-300 ring-1 ring-blue-100" : "border-gray-200 hover:border-gray-300"}`}
            >
              <CalendarRange
                className={`w-3.5 h-3.5 flex-shrink-0 ${filterDateFrom || filterDateTo ? "text-blue-500" : "text-gray-400"}`}
              />
              <DateInput
                value={filterDateFrom}
                placeholder="Từ ngày"
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  if (filterDateTo && e.target.value > filterDateTo)
                    setFilterDateTo("");
                }}
              />
              <span className="text-gray-300 text-xs font-bold select-none">
                →
              </span>
              <DateInput
                value={filterDateTo}
                placeholder="Đến ngày"
                min={filterDateFrom || undefined}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
              {(filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => {
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                  className="text-blue-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Xóa bộ lọc ngày"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-300 flex-shrink-0" />

            {/* Tab / Grid mode */}
            <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
              <button
                onClick={() => setViewMode("tab")}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${viewMode === "tab" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
                title="Dạng 1 bãi (Tab)"
              >
                <SquareDashedBottom className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all ${viewMode === "grid" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
                title="Dạng lưới tất cả bãi"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {viewMode === "grid" && (
              <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                <button
                  onClick={() => setGridCols(1)}
                  className={`p-1.5 rounded-md ${gridCols === 1 ? "bg-gray-100 text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                  title="1 cột"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setGridCols(2)}
                  className={`p-1.5 rounded-md ${gridCols === 2 ? "bg-gray-100 text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                  title="2 cột"
                >
                  <Columns2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setGridCols(3)}
                  className={`p-1.5 rounded-md hidden sm:block ${gridCols === 3 ? "bg-gray-100 text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                  title="3 cột"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setGridCols(4)}
                  className={`p-1.5 rounded-md hidden md:block ${gridCols === 4 ? "bg-gray-100 text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                  title="4 cột"
                >
                  <Columns4 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Giữa spacer */}
          <div className="flex-1" />

          {/* Phải – Nav + Tháng/Tuần (luôn hiện) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => calendarApiAll((api) => api?.prev())}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100 shadow-sm transition-colors text-gray-600"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => calendarApiAll((api) => api?.today())}
              className="px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 shadow-sm transition-colors text-xs font-semibold text-gray-700 whitespace-nowrap"
              title="Về hôm nay"
            >
              Hôm nay
            </button>
            <button
              onClick={() => calendarApiAll((api) => api?.next())}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100 shadow-sm transition-colors text-gray-600"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-sm font-bold text-gray-800 capitalize min-w-[148px]">
              {calendarViewTitle}
            </span>

            <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

            <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
              <button
                onClick={() => {
                  setCalendarView("dayGridMonth");
                  calendarApiAll((api) => api?.changeView("dayGridMonth"));
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${calendarView === "dayGridMonth" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
              >
                Tháng
              </button>
              <button
                onClick={() => {
                  setCalendarView("timeGridWeek");
                  calendarApiAll((api) => api?.changeView("timeGridWeek"));
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${calendarView === "timeGridWeek" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
              >
                Tuần
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden flex-col sm:flex-row">
          {/* Chú thích mobile (sidebar ẩn trên mobile) */}
          <div className="sm:hidden px-4 py-2.5 bg-gray-50/50 border-b border-gray-100 flex-shrink-0 w-full">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Chú thích
            </span>
            <div className="grid grid-cols-2 gap-2 w-full">
              {LEGEND_ITEMS.map(({ label, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-l-4 w-full min-w-0"
                  style={{
                    borderLeftColor: color,
                    backgroundColor: `${color}18`,
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-semibold text-gray-800 truncate">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex flex-col flex-shrink-0 w-[268px] h-full border-r-2 border-gray-100 bg-white">
            <div className="flex-1 min-h-0 overflow-hidden">
              <StaffSidebar
                staff={sidebarStaff}
                loading={staffLoading}
                onRetry={loadStaff}
                filteredByRange={!!selectedRange}
              />
            </div>
            {/* Bảng chú thích - dưới sidebar nhân viên */}
            <div className="flex-shrink-0 w-full px-3 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-2.5">
                Chú thích
              </span>
              <div className="grid grid-cols-2 gap-2 w-full">
                {LEGEND_ITEMS.map(({ label, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 w-full min-w-0 px-3 py-2 rounded-xl border-l-4 transition-all"
                    style={{
                      borderLeftColor: color,
                      backgroundColor: `${color}18`,
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-semibold text-gray-800 truncate flex-1">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden relative">
            {selectedRange && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border-b border-blue-200 flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                <p className="text-xs text-blue-700 flex-1">
                  <span className="font-semibold">Đã chọn range:</span>{" "}
                  {new Date(
                    selectedRange.start + "T00:00:00",
                  ).toLocaleDateString("vi-VN", {
                    day: "numeric",
                    month: "long",
                  })}
                  {" → "}
                  {new Date(selectedRange.end + "T00:00:00").toLocaleDateString(
                    "vi-VN",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                  {" · "}
                  <span className="text-blue-500">
                    Kéo nhân viên vào lịch để gán cả khoảng này
                  </span>
                </p>
                <button
                  onClick={clearRange}
                  className="p-1 hover:bg-blue-100 rounded-lg transition-colors text-blue-400 hover:text-blue-600"
                  title="Xóa range"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div
              className={`flex-1 min-h-0 overflow-auto p-2 ${viewMode === "grid" || tabShowsAllLots ? `grid gap-4 ${gridLayoutClass}` : "flex flex-col"}`}
            >
              {visibleLots.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MapPin className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">
                    Chưa có bãi xe nào
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Thêm bãi gửi xe trong mục Quản lý bãi gửi xe
                  </p>
                </div>
              )}

              {visibleLots.map((lot) => {
                const rawLotShifts = shiftsByLot[lot.id] || [];
                const lotShifts = rawLotShifts.filter((s) => {
                  if (
                    inactiveStaffIds.has(String(s.staffId ?? s.StaffId ?? ""))
                  )
                    return false;
                  if (shouldHideShiftOnCalendar(s)) return false;
                  if (
                    filterShiftType &&
                    (s.shiftType ?? s.ShiftType ?? "").toUpperCase() !==
                      filterShiftType
                  )
                    return false;
                  if (
                    filterStaffId &&
                    String(s.staffId ?? s.StaffId ?? "") !== filterStaffId
                  )
                    return false;
                  const shiftDate = (
                    s.shiftDate ??
                    s.workDate ??
                    s.date ??
                    ""
                  ).split("T")[0];
                  if (filterDateFrom || filterDateTo) {
                    if (filterDateFrom && shiftDate < filterDateFrom)
                      return false;
                    if (filterDateTo && shiftDate > filterDateTo) return false;
                  }
                  return true;
                });
                const calendarEvents = lotShifts.map((s) =>
                  toCalendarEvent(s, todayLocalStr),
                );

                return (
                  <div
                    key={lot.id}
                    className={`${viewMode === "grid" || tabShowsAllLots ? "h-[700px]" : "flex-1 min-h-0"} flex flex-col`}
                  >
                    {(viewMode === "grid" || tabShowsAllLots) && (
                      <div
                        className="group flex items-center gap-2 mb-2 px-2 cursor-pointer"
                        onClick={() => {
                          setActiveTabLotId(lot.id);
                          setViewMode("tab");
                        }}
                        title="Bấm để xem lịch đầy đủ"
                      >
                        <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <h2 className="font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                          {lot.name}
                        </h2>
                        <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">
                          {lotShifts.length} ca
                        </span>
                        <Maximize2 className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors ml-auto flex-shrink-0" />
                      </div>
                    )}

                    <DroppableLotCalendar lotId={lot.id}>
                      <FullCalendar
                        ref={(el) => {
                          const tabSingleLot =
                            viewMode === "tab" &&
                            activeTabLotId != null &&
                            activeTabLotId !== "";
                          if (viewMode === "tab" && tabSingleLot) {
                            calendarRef.current = el;
                          } else {
                            calendarRefs.current[lot.id] = el;
                          }
                        }}
                        plugins={[
                          dayGridPlugin,
                          timeGridPlugin,
                          interactionPlugin,
                        ]}
                        initialView="dayGridMonth"
                        locale={viLocale}
                        headerToolbar={false}
                        events={calendarEvents}
                        eventContent={renderEventContent}
                        eventClick={handleEventClick}
                        eventMouseEnter={handleEventMouseEnter}
                        eventMouseLeave={handleEventMouseLeave}
                        // Thay đổi CSS của Event trên lịch khi ở chế độ xóa
                        eventClassNames={(arg) => {
                          const shift = arg.event.extendedProps?.shift;
                          if (!shift) return [];
                          const id = String(
                            shift.shiftId ?? shift.ShiftId ?? shift.id,
                          );

                          if (arg.event.extendedProps?.isReadOnlyShift) {
                            return [
                              "!opacity-50",
                              "grayscale-[0.45]",
                              "cursor-default",
                              "transition-opacity",
                            ];
                          }

                          if (isMultiDeleteMode) {
                            if (selectedShiftIds.has(id)) {
                              return [
                                "!ring-2",
                                "!ring-red-500",
                                "!ring-offset-1",
                                "!opacity-100",
                                "relative",
                                "!z-10",
                                "transition-all",
                                "cursor-pointer",
                              ];
                            }
                            // Làm mờ các ca chưa chọn
                            return [
                              "!opacity-40",
                              "hover:!opacity-70",
                              "transition-all",
                              "cursor-pointer",
                            ];
                          }

                          // Mặc định
                          return [
                            "transition-transform",
                            "hover:scale-[1.02]",
                            "cursor-pointer",
                          ];
                        }}
                        datesSet={handleDatesSet}
                        dateClick={(info) => handleDateClick(info, lot.id)}
                        height="100%"
                        dayMaxEvents={3}
                        moreLinkText={(n) => `+${n}`}
                        nowIndicator
                        buttonText={{
                          today: "Hôm nay",
                          month: "Tháng",
                          week: "Tuần",
                        }}
                        eventDisplay="block"
                        selectable={true}
                        selectMirror={true}
                        select={(selectInfo) =>
                          handleRangeSelect(selectInfo, lot.id)
                        }
                        selectAllow={(selectInfo) => {
                          if (isMultiDeleteMode) return true;
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(0, 0, 0, 0);
                          return selectInfo.start >= tomorrow;
                        }}
                        dayCellClassNames={(arg) => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(0, 0, 0, 0);
                          return arg.date < tomorrow
                            ? ["fc-past-disabled"]
                            : [];
                        }}
                      />
                    </DroppableLotCalendar>
                  </div>
                );
              })}
            </div>

            {isMultiDeleteMode && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-full shadow-2xl px-3 py-2.5 flex items-center gap-4 z-[60] animate-in slide-in-from-bottom-8 fade-in duration-300">
                <div className="flex items-center gap-2.5 pl-3">
                  {selectedShiftIds.size > 0 ? (
                    <>
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs shadow-inner">
                        {selectedShiftIds.size}
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">
                        ca được chọn
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-gray-400 whitespace-nowrap">
                      Bấm vào ca hoặc kéo chọn khoảng ngày...
                    </span>
                  )}
                </div>

                {selectedShiftIds.size > 0 && (
                  <>
                    <div className="w-px h-5 bg-gray-700"></div>
                    <button
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {bulkDeleting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Đang
                          xóa...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" /> Xóa ngay
                        </>
                      )}
                    </button>
                  </>
                )}

                <div className="w-px h-5 bg-gray-700"></div>
                <button
                  onClick={exitMultiDeleteMode}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full text-sm font-medium transition-colors mr-1"
                >
                  <X className="w-4 h-4" />
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeStaff && <StaffDragOverlayCard staff={activeStaff} />}
      </DragOverlay>

      {createModal && (
        <CreateShiftModal
          staff={createModal.staff}
          staffList={activeStaffForSidebar}
          date={createModal.date}
          initialLotId={createModal.lotId}
          initialEndDate={createModal.endDate}
          initialTab={
            createModal.editingShift
              ? "single"
              : createModal.useRange
                ? "bulk"
                : "single"
          }
          parkingLots={parkingLots}
          editingShift={createModal.editingShift}
          onClose={() => setCreateModal(null)}
          onSuccess={handleRefresh}
        />
      )}

      {detailShift && (
        <ShiftDetailPopup
          shift={detailShift}
          onClose={() => setDetailShift(null)}
          onDelete={handleRefresh}
          onEdit={(shift) => {
            setDetailShift(null);
            setCreateModal({
              staff: {
                staffId: shift.staffId ?? shift.StaffId,
                id: shift.staffId ?? shift.StaffId,
                fullName: shift.staffName ?? shift.StaffName,
                name: shift.staffName ?? shift.StaffName,
              },
              date: (shift.shiftDate ?? shift.workDate ?? "").split("T")[0],
              lotId: shift.lotId ?? shift.LotId,
              editingShift: shift,
            });
          }}
        />
      )}

      {showBulkAssign && (
        <BulkAssignModal
          allStaff={activeStaffForSidebar}
          parkingLots={parkingLots}
          onClose={() => setShowBulkAssign(false)}
          onSuccess={handleRefresh}
        />
      )}

      {showPendingRequests && (
        <PendingShiftChangeRequestsModal
          parkingLots={parkingLots}
          onClose={() => {
            setShowPendingRequests(false);
            loadPendingCount();
          }}
          onSuccess={handleRefresh}
        />
      )}

      {showAnomalies && (
        <ShiftAnomaliesModal onClose={() => setShowAnomalies(false)} />
      )}

      <ShiftTooltip tooltip={tooltip} />
    </DndContext>
  );
}

function ShiftDetailPopup({ shift, onClose, onDelete, onEdit }) {
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  if (!shift) return null;

  const name = shift.staffName ?? shift.StaffName ?? "Nhân viên";
  const staffId = shift.staffId ?? shift.StaffId ?? "";
  const rawDate = shift.shiftDate ?? shift.workDate ?? shift.date ?? "";
  const date = rawDate.split("T")[0] ?? "";
  const displayDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const shiftType = (shift.shiftType ?? shift.ShiftType ?? "").toUpperCase();
  const statusKey = (
    shift.shiftStatus ??
    shift.ShiftStatus ??
    shift.status ??
    ""
  ).toUpperCase();
  const statusLabel = STATUS_LABELS[statusKey] ?? shift.shiftStatus ?? "—";
  const statusColor = STATUS_COLORS[statusKey] ?? "#6B7280";
  const barColor = SHIFT_COLORS[shiftType] ?? statusColor;

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await workShiftService.delete(shift.shiftId ?? shift.ShiftId ?? shift.id);
      toast.success("Đã xóa ca trực");
      setShowDeleteDialog(false);
      onDelete();
      onClose();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? err?.message ?? "Xóa thất bại",
      );
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden my-auto">
          <div className="h-1.5" style={{ background: barColor }} />

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${getAvatarColor(staffId)}`}
            >
              {getInitials(name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
              <p className="text-xs text-gray-400">
                {SHIFT_TYPE_LABELS[shift.shiftType] ??
                  shift.shiftType ??
                  "Ca trực"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Details */}
          <div className="px-5 pb-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">
                    Ngày
                  </span>
                </div>
                <span className="text-xs text-gray-700 capitalize">
                  {displayDate}
                </span>
              </div>
              <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">
                    Giờ làm
                  </span>
                </div>
                <span className="text-xs text-gray-700">
                  {(shift.startTime ?? "—").slice(0, 5)} →{" "}
                  {(shift.endTime ?? "—").slice(0, 5)}
                </span>
              </div>
            </div>

            {shift.lotName && (
              <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">
                    Bãi xe
                  </span>
                </div>
                <span className="text-xs text-gray-700">{shift.lotName}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-500">Trạng thái</span>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: statusColor + "18", color: statusColor }}
              >
                {statusLabel}
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              {onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(shift);
                  }}
                  className="flex-1 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" /> Sửa ca
                </button>
              )}
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="flex-1 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa ca
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AlertDialog xác nhận xóa */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogIcon variant="destructive" />
            <AlertDialogTitle>Xác nhận xóa ca trực</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa ca của{" "}
              <span className="font-semibold text-gray-700">{name}</span> vào{" "}
              <span className="font-semibold text-gray-700 capitalize">
                {displayDate}
              </span>
              ?
              <span className="text-red-500 text-xs mt-1 block">
                Hành động này không thể hoàn tác.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onOpenChange={setShowDeleteDialog}
              disabled={deleting}
            />
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Đang xóa...
                </span>
              ) : (
                "Xóa ca trực"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body,
  );
}

export default Shifts;
