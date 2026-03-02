import { useState, useEffect, useRef, useCallback } from "react";
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
  ChevronDown,
  MapPin,
  AlertCircle,
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
import authService from "../../services/authService";
import workShiftService from "../../services/workShiftService";
import parkingLotService from "../../services/parkingLotService";

// ─── Constants ───

const SHIFT_COLORS = {
  MORNING: "#3B82F6",
  AFTERNOON: "#F59E0B",
  NIGHT: "#8B5CF6",
  FULL_DAY: "#10B981",
};

const STATUS_COLORS = {
  SCHEDULED: "#6B7280",
  IN_PROGRESS: "#3B82F6",
  COMPLETED: "#10B981",
  CANCELLED: "#EF4444",
};

const STATUS_LABELS = {
  SCHEDULED: "Đã lên lịch",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const SHIFT_TYPE_LABELS = {
  Morning: "Ca sáng",
  Afternoon: "Ca chiều",
  Night: "Ca đêm",
};

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

// ─── Transform shift to FullCalendar event ────────────────────────────────────

function toCalendarEvent(shift) {
  // Thử nhiều tên field cho ngày (API có thể dùng tên khác nhau)
  const rawDate =
    shift.shiftDate ?? shift.workDate ?? shift.date ?? shift.ShiftDate ?? "";
  const date = rawDate ? rawDate.split("T")[0] : "";

  // Thử nhiều tên field cho giờ
  const startTime = shift.startTime ?? shift.StartTime ?? shift.start ?? "";
  const endTime = shift.endTime ?? shift.EndTime ?? shift.end ?? "";

  // Tên nhân viên
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

  // start/end dạng "2026-03-04T06:00" hoặc chỉ "2026-03-04"
  const startStr =
    startTime && date ? `${date}T${startTime.slice(0, 5)}` : date || undefined;
  const endStr = endTime && date ? `${date}T${endTime.slice(0, 5)}` : undefined;

  return {
    id: String(shift.shiftId ?? shift.ShiftId ?? shift.id ?? Math.random()),
    title: staffName,
    start: startStr,
    end: endStr,
    backgroundColor: color,
    borderColor: color,
    textColor: "#ffffff",
    extendedProps: { shift },
  };
}

// ─── Droppable calendar wrapper ───────────────────────────────────────────────

function DroppableCalendar({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: "calendar" });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 transition-all duration-200 rounded-2xl ${
        isOver ? "ring-2 ring-blue-400 ring-offset-2 bg-blue-50/30" : ""
      }`}
    >
      {children}
    </div>
  );
}

// ─── Drag overlay mini card ───────────────────────────────────────────────────

function StaffDragOverlayCard({ staff }) {
  const name = staff?.fullName ?? staff?.name ?? "Nhân viên";
  const id = staff?.staffId ?? staff?.id ?? "";
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-xl shadow-2xl border border-blue-300 cursor-grabbing min-w-[180px]">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(id)}`}
      >
        {getInitials(name)}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{name}</p>
        <p className="text-xs text-blue-500 font-medium">
          Thả vào ngày muốn tạo ca
        </p>
      </div>
    </div>
  );
}

// ─── Shift detail popup ───────────────────────────────────────────────────────

function ShiftDetailPopup({ shift, onClose, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  if (!shift) return null;

  const name = shift.staffName ?? "Nhân viên";
  const staffId = shift.staffId ?? "";
  const rawDate = shift.shiftDate ?? "";
  const date = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
  const displayDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await workShiftService.delete(shift.shiftId ?? shift.id);
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

  const statusKey = (shift.shiftStatus ?? "").toUpperCase();
  const statusLabel = STATUS_LABELS[statusKey] ?? shift.shiftStatus ?? "—";
  const statusColor = STATUS_COLORS[statusKey] ?? "#6B7280";

  return (
    <>
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Color bar based on shift type */}
        <div
          className="h-1.5"
          style={{
            background:
              SHIFT_COLORS[shift.shiftType] ??
              STATUS_COLORS[statusKey] ??
              "#6B7280",
          }}
        />

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
            <InfoRow
              icon={<Calendar className="w-4 h-4 text-gray-400" />}
              label="Ngày"
            >
              <span className="text-xs text-gray-700 capitalize">
                {displayDate}
              </span>
            </InfoRow>
            <InfoRow
              icon={<Clock className="w-4 h-4 text-gray-400" />}
              label="Giờ làm"
            >
              <span className="text-xs text-gray-700">
                {shift.startTime ?? "—"} → {shift.endTime ?? "—"}
              </span>
            </InfoRow>
          </div>

          {shift.lotName && (
            <InfoRow
              icon={<MapPin className="w-4 h-4 text-gray-400" />}
              label="Bãi xe"
            >
              <span className="text-xs text-gray-700">{shift.lotName}</span>
            </InfoRow>
          )}

          {/* Status badge */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-500">Trạng thái</span>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: statusColor + "18",
                color: statusColor,
              }}
            >
              {statusLabel}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex-1 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa ca
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
            Bạn có chắc muốn xóa ca trực của{" "}
            <span className="font-semibold text-gray-700">{name}</span> vào{" "}
            <span className="font-semibold text-gray-700 capitalize">
              {displayDate}
            </span>
            ?<br />
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
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
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
  </>
  );
}

function InfoRow({ icon, label, children }) {
  return (
    <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-2.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Custom event renderer ────────────────────────────────────────────────────

function renderEventContent(eventInfo) {
  const { shift } = eventInfo.event.extendedProps;
  const name = shift?.staffName ?? eventInfo.event.title;
  return (
    <div className="px-1 py-0.5 w-full overflow-hidden">
      <p className="text-xs font-semibold truncate leading-tight">{name}</p>
      {shift?.startTime && shift?.endTime && (
        <p className="text-[10px] opacity-80 truncate leading-tight">
          {shift.startTime.slice(0, 5)} – {shift.endTime.slice(0, 5)}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function Shifts() {
  const [allStaff, setAllStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [parkingLots, setParkingLots] = useState([]);
  const [selectedLotId, setSelectedLotId] = useState("");

  const [activeStaff, setActiveStaff] = useState(null);
  const [createModal, setCreateModal] = useState(null); // { staff, date }
  const [detailShift, setDetailShift] = useState(null);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const calendarRef = useRef(null);

  // Track EXACT mouse position: cả di chuyển lẫn lúc thả tay
  useEffect(() => {
    const update = (e) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("pointermove", update);
    window.addEventListener("pointerup", update); // quan trọng: capture vị trí lúc thả
    return () => {
      window.removeEventListener("pointermove", update);
      window.removeEventListener("pointerup", update);
    };
  }, []);

  // Load data on mount
  useEffect(() => {
    loadStaff();
    loadParkingLots();
  }, []);

  // Load shifts when lot or refreshKey changes
  useEffect(() => {
    if (selectedLotId) loadShifts(selectedLotId);
    else setShifts([]);
  }, [selectedLotId, refreshKey]);

  const loadStaff = async () => {
    setStaffLoading(true);
    try {
      const data = await authService.getAllStaff();

      // Hỗ trợ nhiều format response: [], { data: [] }, { data: { items: [] } }, { items: [] }
      let arr = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (Array.isArray(data?.data)) {
        arr = data.data;
      } else if (Array.isArray(data?.data?.items)) {
        arr = data.data.items;
      } else if (Array.isArray(data?.items)) {
        arr = data.items;
      }

      setAllStaff(arr);
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.title ??
        err?.message ??
        "Lỗi không xác định";

      if (status === 401) {
        toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
      } else if (status === 403) {
        toast.error("Không có quyền xem danh sách nhân viên");
      } else {
        toast.error(
          `Không tải được nhân viên (${status ?? "offline"}): ${msg}`,
        );
      }
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
      if (normalized.length > 0 && !selectedLotId) {
        setSelectedLotId(normalized[0].id);
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ?? err?.message ?? "Lỗi không xác định";
      toast.error(`Không tải được bãi xe (${status ?? "offline"}): ${msg}`);
    }
  };

  const loadShifts = async (lotId) => {
    setShiftsLoading(true);
    try {
      const data = await workShiftService.getByLot(lotId);

      // Debug: xem data thực sự trả về là gì
      console.log("[loadShifts] raw data:", data);

      // Handle nhiều format: [], { data: [] }, { items: [] }, { data: { items: [] } }
      let arr = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (Array.isArray(data?.data)) {
        arr = data.data;
      } else if (Array.isArray(data?.items)) {
        arr = data.items;
      } else if (Array.isArray(data?.data?.items)) {
        arr = data.data.items;
      }

      console.log("[loadShifts] parsed arr:", arr);
      setShifts(arr);
    } catch (err) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ?? err?.message ?? "Lỗi không xác định";
      toast.error(`Không tải được ca trực (${status ?? "offline"}): ${msg}`);
    } finally {
      setShiftsLoading(false);
    }
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  // ─── dnd-kit sensors ──────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = useCallback(({ active }) => {
    setActiveStaff(active.data.current ?? null);
  }, []);

  const handleDragEnd = useCallback(({ active }) => {
    // 1. Lấy vị trí thả (TRƯỚC khi remove overlay khỏi DOM)
    const { x, y } = lastMousePos.current;

    // 2. Tìm ô ngày từ tất cả elements tại vị trí đó (kể cả bị overlay che)
    let targetDate = null;
    if (x > 0 || y > 0) {
      const elements = document.elementsFromPoint(x, y);
      for (const el of elements) {
        // FullCalendar thêm data-date vào <td> của mỗi ô ngày
        const dateEl =
          el.closest("[data-date]") ??
          (el.hasAttribute?.("data-date") ? el : null);
        if (dateEl) {
          targetDate = dateEl.getAttribute("data-date");
          break;
        }
      }
    }

    // 3. Xóa overlay
    setActiveStaff(null);

    if (!targetDate) return;

    const draggedStaff = active.data.current;
    setCreateModal({ staff: draggedStaff, date: targetDate });
  }, []);

  // ─── FullCalendar handlers ─────────────────────────────────────────────────

  const handleDateClick = (info) => {
    // Click on empty date → open modal without staff pre-filled
    setCreateModal({ staff: null, date: info.dateStr });
  };

  const handleEventClick = (info) => {
    const { shift } = info.event.extendedProps;
    if (shift) setDetailShift(shift);
  };

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().split("T")[0];
  const todayShifts = shifts.filter((s) => {
    const d = (s.shiftDate ?? "").split("T")[0];
    return d === today;
  });
  const scheduledCount = shifts.filter(
    (s) => (s.shiftStatus ?? "").toUpperCase() === "SCHEDULED",
  ).length;
  const inProgressCount = shifts.filter(
    (s) => (s.shiftStatus ?? "").toUpperCase() === "IN_PROGRESS",
  ).length;

  // ─── Calendar events ───────────────────────────────────────────────────────

  const calendarEvents = shifts.map(toCalendarEvent);
  // Debug: xem events được tạo ra
  if (calendarEvents.length > 0) {
    console.log("[calendarEvents]", calendarEvents);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full min-h-0 gap-0 -m-6">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quản lý ca trực
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Kéo nhân viên từ sidebar vào lịch để tạo ca
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Lot selector */}
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={selectedLotId}
                onChange={(e) => setSelectedLotId(e.target.value)}
                className="pl-8 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none min-w-[180px]"
              >
                <option value="">-- Chọn bãi xe --</option>
                {parkingLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Bulk assign */}
            <button
              onClick={() => setShowBulkAssign(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              Gán nhóm
            </button>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              title="Tải lại"
            >
              <RefreshCw
                className={`w-4 h-4 ${shiftsLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="flex gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <StatChip
            icon={<Calendar className="w-4 h-4 text-blue-500" />}
            label="Hôm nay"
            value={todayShifts.length}
            color="bg-blue-50 text-blue-700"
          />
          <StatChip
            icon={<Clock className="w-4 h-4 text-gray-500" />}
            label="Đã lên lịch"
            value={scheduledCount}
            color="bg-gray-100 text-gray-700"
          />
          <StatChip
            icon={<AlertCircle className="w-4 h-4 text-emerald-500" />}
            label="Đang làm"
            value={inProgressCount}
            color="bg-emerald-50 text-emerald-700"
          />
          <StatChip
            icon={<Users className="w-4 h-4 text-violet-500" />}
            label="Tổng ca"
            value={shifts.length}
            color="bg-violet-50 text-violet-700"
          />
        </div>

        {/* ── Main content ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <StaffSidebar
            staff={allStaff}
            loading={staffLoading}
            onRetry={loadStaff}
          />

          {/* Calendar */}
          <div className="flex-1 overflow-auto p-4 bg-gray-50">
            <DroppableCalendar>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {!selectedLotId && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                    <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                      Chọn bãi xe ở góc trên để tải ca trực — bạn vẫn có thể kéo
                      nhân viên vào lịch
                    </p>
                  </div>
                )}
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale={viLocale}
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                  }}
                  events={calendarEvents}
                  eventContent={renderEventContent}
                  eventClick={handleEventClick}
                  dateClick={handleDateClick}
                  height="auto"
                  dayMaxEvents={4}
                  moreLinkText={(n) => `+${n} ca`}
                  nowIndicator
                  buttonText={{
                    today: "Hôm nay",
                    month: "Tháng",
                    week: "Tuần",
                    day: "Ngày",
                  }}
                  eventDisplay="block"
                />
              </div>
            </DroppableCalendar>
          </div>
        </div>
      </div>

      {/* ── Drag overlay ── */}
      <DragOverlay>
        {activeStaff && <StaffDragOverlayCard staff={activeStaff} />}
      </DragOverlay>

      {/* ── Modals ── */}
      {createModal && (
        <CreateShiftModal
          staff={createModal.staff}
          date={createModal.date}
          parkingLots={parkingLots}
          onClose={() => setCreateModal(null)}
          onSuccess={handleRefresh}
        />
      )}

      {detailShift && (
        <ShiftDetailPopup
          shift={detailShift}
          onClose={() => setDetailShift(null)}
          onDelete={handleRefresh}
        />
      )}

      {showBulkAssign && (
        <BulkAssignModal
          allStaff={allStaff}
          parkingLots={parkingLots}
          onClose={() => setShowBulkAssign(false)}
          onSuccess={handleRefresh}
        />
      )}
    </DndContext>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ icon, label, value, color }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${color}`}>
      {icon}
      <span className="text-xs font-medium">{label}:</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

export default Shifts;
