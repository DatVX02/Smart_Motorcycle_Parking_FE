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
  MapPin,
  AlertCircle,
  LayoutGrid,
  SquareDashedBottom,
  Columns2,
  Columns3,
  Columns4,
  Maximize2,
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

// ─── Transform shift to FullCalendar event ───
function toCalendarEvent(shift) {
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

// ─── Droppable wrapper modified to hold Lot ID ───
function DroppableLotCalendar({ lotId, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: `calendar-${lotId}` });
  return (
    <div
      ref={setNodeRef}
      data-lot-id={lotId} // Cực kỳ quan trọng để dò tìm Lot ID khi thả chuột
      className={`relative bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full transition-all duration-200 ${
        isOver ? "ring-2 ring-blue-500 bg-blue-50/20" : ""
      }`}
    >
      {children}
    </div>
  );
}


function StaffDragOverlayCard({ staff }) {
  /* ... Giữ nguyên ... */
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
          Thả vào ngày & bãi xe
        </p>
      </div>
    </div>
  );
}

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

// ─── Main component ───
function Shifts() {
  const [allStaff, setAllStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [parkingLots, setParkingLots] = useState([]);

  // State mới: Lưu trữ ca trực của TẤT CẢ bãi xe dạng { lotId: [shifts] }
  const [shiftsByLot, setShiftsByLot] = useState({});
  const [shiftsLoading, setShiftsLoading] = useState(false);

  // Layout Controls
  const [viewMode, setViewMode] = useState("tab"); // "tab" hoặc "grid"
  const [gridCols, setGridCols] = useState(2); // Số cột khi ở chế độ Grid
  const [activeTabLotId, setActiveTabLotId] = useState(""); // Lot đang chọn nếu ở chế độ Tab

  const [activeStaff, setActiveStaff] = useState(null);
  const [createModal, setCreateModal] = useState(null); // { staff, date, lotId, endDate, useRange }
  const [detailShift, setDetailShift] = useState(null);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Range được chọn bằng cách kéo trên lịch
  const [selectedRange, setSelectedRange] = useState(null); // { start: "YYYY-MM-DD", end: "YYYY-MM-DD" }

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
  }, []);

  useEffect(() => {
    if (parkingLots.length > 0) loadAllShifts(parkingLots);
  }, [parkingLots, refreshKey]);

  // APIs Functions
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
      setAllStaff(arr);
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
      if (normalized.length > 0 && !activeTabLotId)
        setActiveTabLotId(normalized[0].id);
    } catch (err) {
      toast.error("Lỗi tải bãi xe");
    }
  };

  const loadAllShifts = async (lots) => {
    setShiftsLoading(true);
    try {
      const results = {};
      await Promise.all(
        lots.map(async (lot) => {
          const data = await workShiftService.getByLot(lot.id);
          let arr = Array.isArray(data)
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
    } finally {
      setShiftsLoading(false);
    }
  };

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const todayStr = new Date().toISOString().split("T")[0];

  // ─── Range select trên lịch ───
  const handleRangeSelect = useCallback((selectInfo) => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    if (selectInfo.start < todayDate) {
      selectInfo.view.calendar.unselect();
      toast.error("Không thể chọn ngày trong quá khứ");
      return;
    }
    // FullCalendar dayGrid: end exclusive → lùi 1 ngày
    // Dùng selectInfo.endStr để tránh bug timezone offset khi dùng toISOString()
    const endExclusive = new Date(selectInfo.endStr + "T00:00:00");
    endExclusive.setDate(endExclusive.getDate() - 1);
    const endStr = `${endExclusive.getFullYear()}-${String(endExclusive.getMonth() + 1).padStart(2, "0")}-${String(endExclusive.getDate()).padStart(2, "0")}`;
    setSelectedRange({ start: selectInfo.startStr, end: endStr });
    selectInfo.view.calendar.unselect();
  }, []);

  const clearRange = () => setSelectedRange(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = useCallback(({ active }) => {
    setActiveStaff(active.data.current ?? null);
  }, []);

  const handleDragEnd = useCallback(({ active }) => {
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

    // Validate ngày quá khứ
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    if (new Date(targetDate + "T00:00:00") < todayMidnight) {
      toast.error("Không thể tạo ca cho ngày trong quá khứ");
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
  }, [selectedRange]);

  const handleDateClick = (info, lotId) => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    if (new Date(info.dateStr + "T00:00:00") < todayMidnight) {
      toast.error("Không thể tạo ca cho ngày trong quá khứ");
      return;
    }
    const range = selectedRange;
    setSelectedRange(null);
    setCreateModal({
      staff: null,
      date: range?.start ?? info.dateStr,
      lotId,
      endDate: range?.end ?? null,
      useRange: !!range,
    });
  };

  const handleEventClick = (info) => {
    if (info.event.extendedProps.shift)
      setDetailShift(info.event.extendedProps.shift);
  };

  const allShiftsArray = Object.values(shiftsByLot).flat();
  const today = new Date().toISOString().split("T")[0];
  const todayShifts = allShiftsArray.filter(
    (s) => (s.shiftDate ?? "").split("T")[0] === today,
  );
  const scheduledCount = allShiftsArray.filter(
    (s) => (s.shiftStatus ?? "").toUpperCase() === "SCHEDULED",
  ).length;
  const inProgressCount = allShiftsArray.filter(
    (s) => (s.shiftStatus ?? "").toUpperCase() === "IN_PROGRESS",
  ).length;

  const gridLayoutClass =
    {
      1: "grid-cols-1",
      2: "grid-cols-1 xl:grid-cols-2",
      3: "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    }[gridCols] || "grid-cols-1";

  const visibleLots =
    viewMode === "tab"
      ? parkingLots.filter((l) => l.id === activeTabLotId)
      : parkingLots;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full min-h-0 gap-0 -m-6 bg-gray-50/50">
        {/* ── Top bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-6 py-3 md:py-4 bg-white border-b border-gray-100 flex-shrink-0 z-10">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Quản lý Lịch Bãi Xe
            </h1>
            <p className="text-xs md:text-sm text-gray-500 mt-0.5">
              Kéo nhân sự thả vào lịch của từng bãi xe tương ứng
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("tab")}
                className={`p-1.5 sm:p-2 rounded-lg flex items-center gap-1 sm:gap-1.5 transition-all ${viewMode === "tab" ? "bg-white shadow text-blue-600 font-semibold" : "text-gray-500 hover:text-gray-800"}`}
                title="Dạng Tab"
              >
                <SquareDashedBottom className="w-4 h-4" />
                <span className="text-xs sm:text-sm hidden xs:inline">Tab</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 sm:p-2 rounded-lg flex items-center gap-1 sm:gap-1.5 transition-all ${viewMode === "grid" ? "bg-white shadow text-blue-600 font-semibold" : "text-gray-500 hover:text-gray-800"}`}
                title="Dạng Lưới"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-xs sm:text-sm hidden xs:inline">Grid</span>
              </button>
            </div>

            {/* Grid Size Controls (Only show in Grid mode) */}
            {viewMode === "grid" && (
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setGridCols(1)}
                  className={`p-1.5 rounded-lg ${gridCols === 1 ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridCols(2)}
                  className={`p-1.5 rounded-lg ${gridCols === 2 ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <Columns2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridCols(3)}
                  className={`p-1.5 rounded-lg hidden sm:block ${gridCols === 3 ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <Columns3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridCols(4)}
                  className={`p-1.5 rounded-lg hidden md:block ${gridCols === 4 ? "bg-white shadow text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <Columns4 className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={() => setShowBulkAssign(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Gán nhóm</span>
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
            >
              <RefreshCw
                className={`w-5 h-5 ${shiftsLoading ? "animate-spin text-blue-500" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="flex flex-wrap gap-2 md:gap-4 px-4 md:px-6 py-2 md:py-3 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm z-10">
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
            value={allShiftsArray.length}
            color="bg-violet-50 text-violet-700"
          />
        </div>

        {/* ── Main content ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar Nhân viên — hidden on mobile */}
          <div className="hidden sm:block flex-shrink-0 h-full overflow-hidden">
            <StaffSidebar
              staff={allStaff}
              loading={staffLoading}
              onRetry={loadStaff}
            />
          </div>

          {/* Vùng Lịch Center */}
          <div className="flex-1 flex flex-col min-w-0 bg-gray-100 overflow-hidden relative">
            {/* Nếu là dạng Tab, hiển thị thanh Tabs điều hướng */}
            {viewMode === "tab" && (
              <div className="flex overflow-x-auto gap-2 p-4 pb-0 scrollbar-hide flex-shrink-0">
                {parkingLots.map((lot) => (
                  <button
                    key={lot.id}
                    onClick={() => setActiveTabLotId(lot.id)}
                    className={`px-4 py-2 rounded-t-xl text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                      activeTabLotId === lot.id
                        ? "bg-white text-blue-600 border-blue-600"
                        : "bg-gray-200/50 text-gray-500 border-transparent hover:bg-gray-200"
                    }`}
                  >
                    {lot.name}
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-500">
                      {(shiftsByLot[lot.id] || []).length} ca
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Banner range đã chọn */}
            {selectedRange && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border-b border-blue-200 flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                <p className="text-sm text-blue-700 flex-1">
                  <span className="font-semibold">Đã chọn range:</span>{" "}
                  {new Date(selectedRange.start + "T00:00:00").toLocaleDateString("vi-VN", { day: "numeric", month: "long" })}
                  {" → "}
                  {new Date(selectedRange.end + "T00:00:00").toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}
                  {" · "}
                  <span className="text-blue-500">Kéo nhân viên vào lịch để gán cả khoảng này</span>
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

            {/* Khung chứa các Lịch */}
            <div
              className={`flex-1 overflow-auto p-4 ${viewMode === "grid" ? `grid gap-6 ${gridLayoutClass}` : "block bg-white border-t border-gray-200"}`}
            >
              {visibleLots.length === 0 && (
                <div className="text-gray-400 p-10 text-center">
                  Chưa có bãi xe nào.
                </div>
              )}

              {visibleLots.map((lot) => {
                const lotShifts = shiftsByLot[lot.id] || [];
                const calendarEvents = lotShifts.map(toCalendarEvent);

                // Ở dạng nhiều cột, ta cần làm gọn Header của lịch để không bị tràn
                const isSmallGrid = viewMode === "grid" && gridCols >= 3;

                return (
                  <div key={lot.id} className="h-[700px] flex flex-col">
                    {/* Tiêu đề Bãi Xe (Chỉ hiện trong dạng lưới) */}
                    {viewMode === "grid" && (
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
                        plugins={[
                          dayGridPlugin,
                          timeGridPlugin,
                          interactionPlugin,
                        ]}
                        initialView="dayGridMonth"
                        locale={viLocale}
                        headerToolbar={
                          isSmallGrid
                            ? {
                                // Rút gọn thanh công cụ nếu chia 3-4 cột
                                left: "title",
                                right: "prev,next",
                              }
                            : {
                                left: "prev,next today",
                                center: "title",
                                right: "dayGridMonth,timeGridWeek",
                              }
                        }
                        events={calendarEvents}
                        eventContent={renderEventContent}
                        eventClick={handleEventClick}
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
                        select={handleRangeSelect}
                        selectAllow={(selectInfo) => {
                          const d = new Date();
                          d.setHours(0, 0, 0, 0);
                          return selectInfo.start >= d;
                        }}
                        dayCellClassNames={(arg) => {
                          const d = new Date();
                          d.setHours(0, 0, 0, 0);
                          return arg.date < d ? ["fc-past-disabled"] : [];
                        }}
                      />
                    </DroppableLotCalendar>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Drag overlay ── */}
      <DragOverlay>
        {activeStaff && <StaffDragOverlayCard staff={activeStaff} />}
      </DragOverlay>

      {/* ── Modals ── */}
      {/* LƯU Ý: Đảm bảo CreateShiftModal của bạn nhận prop `lotId` hoặc `initialLotId` để tự động Set bãi xe nhé */}
      {createModal && (
        <CreateShiftModal
          staff={createModal.staff}
          date={createModal.date}
          initialLotId={createModal.lotId}
          initialEndDate={createModal.endDate}
          initialTab={createModal.useRange ? "bulk" : "single"}
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

// ─── Shift Detail Popup ───────────────────────────────────────────────────────

function ShiftDetailPopup({ shift, onClose, onDelete }) {
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
  const statusKey = (shift.shiftStatus ?? shift.ShiftStatus ?? shift.status ?? "").toUpperCase();
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
      toast.error(err?.response?.data?.message ?? err?.message ?? "Xóa thất bại");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="h-1.5" style={{ background: barColor }} />

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${getAvatarColor(staffId)}`}>
              {getInitials(name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
              <p className="text-xs text-gray-400">
                {SHIFT_TYPE_LABELS[shift.shiftType] ?? shift.shiftType ?? "Ca trực"}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Details */}
          <div className="px-5 pb-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">Ngày</span>
                </div>
                <span className="text-xs text-gray-700 capitalize">{displayDate}</span>
              </div>
              <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">Giờ làm</span>
                </div>
                <span className="text-xs text-gray-700">
                  {(shift.startTime ?? "—").slice(0,5)} → {(shift.endTime ?? "—").slice(0,5)}
                </span>
              </div>
            </div>

            {shift.lotName && (
              <div className="flex flex-col gap-1 bg-gray-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">Bãi xe</span>
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
              <span className="font-semibold text-gray-700 capitalize">{displayDate}</span>?
              <span className="text-red-500 text-xs mt-1 block">Hành động này không thể hoàn tác.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onOpenChange={setShowDeleteDialog} disabled={deleting} />
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Đang xóa...
                </span>
              ) : "Xóa ca trực"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatChip({ icon, label, value, color }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${color}`}>
      {icon} <span className="text-xs font-medium">{label}:</span>{" "}
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

export default Shifts;
