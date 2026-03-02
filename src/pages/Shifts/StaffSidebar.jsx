import { useState } from "react";
import { Search, User, GripVertical, ChevronRight } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

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
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name = "") {
  return name
    .split(" ")
    .slice(-2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

function DraggableStaffCard({ staff }) {
  const staffId = staff.staffId ?? staff.id ?? "";
  const name = staff.fullName ?? staff.name ?? "Nhân viên";
  const role = staff.role ?? "STAFF";
  const email = staff.email ?? "";

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `staff-${staffId}`,
      data: staff,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.25 : 1,
    position: "relative",
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm
        hover:shadow-md hover:border-blue-200 transition-all select-none"
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="text-gray-200 group-hover:text-gray-400 transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
        title="Kéo để gán ca"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(staffId)}`}
      >
        {getInitials(name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
          {name}
        </p>
        <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">
          {email || role}
        </p>
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-blue-400 transition-colors flex-shrink-0" />
    </div>
  );
}

function StaffSidebar({ staff, loading, onRetry }) {
  const [search, setSearch] = useState("");

  const filtered = staff.filter((s) => {
    const name = (s.fullName ?? s.name ?? "").toLowerCase();
    const email = (s.email ?? "").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="w-[264px] flex-shrink-0 flex flex-col bg-white border-r border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-sm font-semibold text-gray-700">
            Nhân viên
          </span>
          <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {staff.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              placeholder:text-gray-300 bg-gray-50"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[58px] bg-gray-100 rounded-xl animate-pulse"
            />
          ))
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <User className="w-8 h-8 text-gray-200" />
            <p className="text-sm text-gray-400">Chưa tải được nhân viên</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Thử lại
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <User className="w-8 h-8 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Không tìm thấy nhân viên</p>
          </div>
        ) : (
          filtered.map((s) => (
            <DraggableStaffCard key={s.staffId ?? s.id} staff={s} />
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Kéo thẻ nhân viên vào lịch để tạo ca trực
        </p>
      </div>
    </div>
  );
}

export default StaffSidebar;
