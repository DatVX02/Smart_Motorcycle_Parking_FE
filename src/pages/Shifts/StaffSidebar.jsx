import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, User, GripVertical, Info, Phone, Mail } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-green-500",
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

const ROLE_LABELS = {
  STAFF: "Nhân viên",
  Staff: "Nhân viên",
  staff: "Nhân viên",
  ADMIN: "Admin",
  Admin: "Admin",
  admin: "Admin",
};

function StaffInfoTooltip({ email, phone, anchorRect }) {
  if (!anchorRect || (!email && !phone)) return null;

  const top = anchorRect.bottom + 6;
  const left = anchorRect.right - 200;

  return createPortal(
    <div
      className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-52 pointer-events-none"
      style={{ top, left }}
    >
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Thông tin liên hệ
      </p>
      {email && (
        <div className="flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-xs text-gray-700 truncate">{email}</span>
        </div>
      )}
      {phone && (
        <div className={`flex items-center gap-2 ${email ? "mt-1.5" : ""}`}>
          <Phone className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          <span className="text-xs text-gray-700">{phone}</span>
        </div>
      )}
    </div>,
    document.body,
  );
}

function DraggableStaffCard({ staff }) {
  const staffId = staff.staffId ?? staff.id ?? "";
  const name = staff.fullName ?? staff.name ?? "Nhân viên";
  const role = staff.role ?? "STAFF";
  const email = staff.email ?? "";
  const phone = staff.phoneContact ?? staff.phone ?? staff.phoneNumber ?? "";
  const avatarUrl =
    staff.faceImageUrl ?? staff.avatarUrl ?? staff.imageUrl ?? "";

  const roleLabel =
    ROLE_LABELS[role] ?? ROLE_LABELS[role?.toUpperCase()] ?? role;

  const [tooltipRect, setTooltipRect] = useState(null);
  const infoRef = useRef(null);

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

  const handleInfoEnter = useCallback(() => {
    if (infoRef.current) {
      setTooltipRect(infoRef.current.getBoundingClientRect());
    }
  }, []);

  const handleInfoLeave = useCallback(() => {
    setTooltipRect(null);
  }, []);

  const hasContact = email || phone;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="group flex items-center gap-2.5 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm
        hover:shadow-md hover:border-blue-200 transition-all select-none cursor-grab active:cursor-grabbing"
    >
      {/* Drag handle */}
      <div
        className="text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0"
        title="Kéo vào lịch để gán ca"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Avatar */}
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
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(staffId)}`}
        >
          {getInitials(name)}
        </div>
      )}

      {/* Name + role only */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
          {name}
        </p>
        <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">
          {roleLabel}
        </p>
      </div>

      {/* Info icon – hover to show contact popup */}
      {hasContact && (
        <div
          ref={infoRef}
          className="flex-shrink-0"
          onMouseEnter={handleInfoEnter}
          onMouseLeave={handleInfoLeave}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 group-hover:text-blue-400 transition-colors">
            <Info className="w-3.5 h-3.5" />
          </div>
          <StaffInfoTooltip
            email={email}
            phone={phone}
            anchorRect={tooltipRect}
          />
        </div>
      )}
    </div>
  );
}

function StaffSidebar({ staff, loading, onRetry, filteredByRange }) {
  const [search, setSearch] = useState("");

  const filtered = staff.filter((s) => {
    const name = (s.fullName ?? s.name ?? "").toLowerCase();
    const email = (s.email ?? "").toLowerCase();
    const phone = (
      s.phoneContact ??
      s.phone ??
      s.phoneNumber ??
      ""
    ).toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q);
  });

  return (
    <div className="w-[260px] flex-shrink-0 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-base font-semibold text-gray-800">
            Tổng nhân viên
          </span>
          <span
            className={`ml-auto text-sm font-medium px-2.5 py-1 rounded-lg whitespace-nowrap ${
              filteredByRange
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-500"
            }`}
            title={filteredByRange ? "Đang lọc theo khoảng ngày đã chọn" : ""}
          >
            {staff.length} nhân viên
          </span>
        </div>
        {filteredByRange && (
          <p className="text-xs text-blue-600 mb-2">
            Chỉ hiển thị nhân viên chưa có ca (rảnh) trong khoảng ngày đã chọn
          </p>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              placeholder:text-gray-400 bg-gray-50"
          />
        </div>
      </div>

      {/* List - scroll khi có từ 5 nhân viên trở lên (hiển thị ít nhất 4) */}
      <div
        className={`flex-1 overflow-y-auto p-3 space-y-2 min-h-0 ${
          filtered.length >= 5 ? "max-h-[352px]" : ""
        }`}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[52px] bg-gray-100 rounded-xl animate-pulse"
            />
          ))
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <User className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-500">Chưa tải được nhân viên</p>
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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <User className="w-10 h-10 text-gray-200 mb-2" />
            <p className="text-sm text-gray-500">
              {filteredByRange
                ? "Tất cả nhân viên đều đã có ca trong khoảng này"
                : "Không tìm thấy nhân viên"}
            </p>
          </div>
        ) : (
          filtered.map((s) => (
            <DraggableStaffCard key={s.staffId ?? s.id} staff={s} />
          ))
        )}
      </div>
    </div>
  );
}

export default StaffSidebar;
