import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Users, MapPin, Clock, Calendar, Check, Search } from "lucide-react";
import toast from "react-hot-toast";
import workShiftService from "../../services/workShiftService";
import parkingLotService from "../../services/parkingLotService";

const SHIFT_PRESETS = [
  {
    type: "Morning",
    label: "Ca sáng",
    startTime: "06:00",
    endTime: "14:00",
    color: "bg-blue-500",
  },
  {
    type: "Afternoon",
    label: "Ca chiều",
    startTime: "14:00",
    endTime: "22:00",
    color: "bg-amber-500",
  },
  {
    type: "Night",
    label: "Ca đêm",
    startTime: "22:00",
    endTime: "06:00",
    color: "bg-violet-500",
  },
  {
    type: "Full Day",
    label: "Cả ngày",
    startTime: "07:00",
    endTime: "19:00",
    color: "bg-green-500",
  },
];

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-indigo-500",
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

function timeToMinutes(t) {
  if (!t || typeof t !== "string") return 0;
  const [h, m] = t.substring(0, 5).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function isShiftWithinOperatingHours(
  startTime,
  endTime,
  openingTime,
  closingTime,
  is24h,
) {
  if (is24h) return null;
  const openMin = timeToMinutes(openingTime);
  const closeMin = timeToMinutes(closingTime);
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (endMin <= startMin) {
    return "Ca qua đêm không phù hợp với bãi xe có giờ đóng cửa cố định. Vui lòng chọn ca trong khung giờ mở cửa.";
  }
  if (startMin < openMin) {
    return `Giờ bắt đầu phải từ ${openingTime} (giờ mở cửa) trở đi`;
  }
  if (endMin > closeMin) {
    return `Giờ kết thúc phải trước ${closingTime} (giờ đóng cửa)`;
  }
  return null;
}

function BulkAssignModal({ allStaff, parkingLots, onClose, onSuccess }) {
  const [search, setSearch] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const getMinShiftDate = () => {
    const t = new Date();
    const yy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };
  const [shiftDate, setShiftDate] = useState(getMinShiftDate);
  const [lotId, setLotId] = useState(
    parkingLots[0]?.id ?? parkingLots[0]?.lotId ?? "",
  );
  const [selectedPreset, setSelectedPreset] = useState("MORNING");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("14:00");
  const [shiftStatus, setShiftStatus] = useState("SCHEDULED");
  const [loading, setLoading] = useState(false);
  const [lotOperatingHours, setLotOperatingHours] = useState(null);

  useEffect(() => {
    if (!lotId) {
      setLotOperatingHours(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const detail = await parkingLotService.getParkingLotDetail(lotId);
        const lotInfo = detail?.lotInfo ?? detail;
        if (cancelled) return;
        setLotOperatingHours({
          openingTime: lotInfo?.openingTime?.substring(0, 5) || "00:00",
          closingTime: lotInfo?.closingTime?.substring(0, 5) || "23:59",
          is24h: !!lotInfo?.is24h,
        });
      } catch {
        if (!cancelled) setLotOperatingHours(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lotId]);

  useEffect(() => {
    if (selectedPreset && lotOperatingHours && !lotOperatingHours.is24h) {
      const p = selectedPreset.toUpperCase();
      if (p === "MORNING") {
        setStartTime(lotOperatingHours.openingTime);
      } else if (p === "NIGHT") {
        setEndTime(lotOperatingHours.closingTime);
      }
    }
  }, [lotOperatingHours, selectedPreset]);

  const filteredStaff = allStaff.filter((s) => {
    const name = (s.fullName ?? s.name ?? "").toLowerCase();
    const email = (s.email ?? "").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const toggleStaff = (id) =>
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const shiftTimeError =
    lotId && lotOperatingHours && !lotOperatingHours.is24h
      ? isShiftWithinOperatingHours(
          startTime,
          endTime,
          lotOperatingHours.openingTime,
          lotOperatingHours.closingTime,
          false,
        )
      : null;

  const toggleAll = () => {
    const allIds = filteredStaff.map((s) => s.staffId ?? s.id);
    const allSelected = allIds.every((id) => selectedStaffIds.includes(id));
    if (allSelected) {
      setSelectedStaffIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedStaffIds((prev) => [...new Set([...prev, ...allIds])]);
    }
  };

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.type);
    let start = preset.startTime;
    let end = preset.endTime;
    if (lotOperatingHours && !lotOperatingHours.is24h) {
      if (preset.type === "Morning") {
        start = lotOperatingHours.openingTime;
      } else if (preset.type === "Night") {
        end = lotOperatingHours.closingTime;
      }
    }
    setStartTime(start);
    setEndTime(end);
  };

  const handleSubmit = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(shiftDate + "T00:00:00") < today) {
      toast.error("Chỉ được chia lịch từ hôm nay trở đi");
      return;
    }
    if (selectedStaffIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 nhân viên");
      return;
    }
    if (!lotId) {
      toast.error("Vui lòng chọn bãi xe");
      return;
    }

    if (lotOperatingHours) {
      const err = isShiftWithinOperatingHours(
        startTime,
        endTime,
        lotOperatingHours.openingTime,
        lotOperatingHours.closingTime,
        lotOperatingHours.is24h,
      );
      if (err) {
        toast.error(err);
        return;
      }
    }

    setLoading(true);
    try {
      const result = await workShiftService.bulkAssign({
        staffIds: selectedStaffIds,
        lotId,
        shiftDate,
        shiftType: selectedPreset || "MORNING",
        startTime,
        endTime,
        shiftStatus,
      });
      const count = Array.isArray(result)
        ? result.length
        : selectedStaffIds.length;
      toast.success(`Đã gán ca cho ${count} nhân viên ngày ${shiftDate}`);
      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.title ??
        err?.message ??
        "Không thể gán ca trực hàng loạt. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Gán ca nhóm
            </h2>
            <p className="text-sm text-gray-500">
              Gán cùng 1 ca cho nhiều nhân viên
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left - Staff selection */}
          <div className="w-72 border-r border-gray-100 flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm nhân viên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
              </div>
              <button
                onClick={toggleAll}
                className="w-full py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {filteredStaff.every((s) =>
                  selectedStaffIds.includes(s.staffId ?? s.id),
                )
                  ? "Bỏ chọn tất cả"
                  : "Chọn tất cả"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredStaff.map((s) => {
                const id = s.staffId ?? s.id;
                const name = s.fullName ?? s.name ?? "Nhân viên";
                const isSelected = selectedStaffIds.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleStaff(id)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left ${
                      isSelected
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(id)}`}
                    >
                      {getInitials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${isSelected ? "text-blue-700" : "text-gray-700"}`}
                      >
                        {name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {s.role ?? "Staff"}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-200"
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected count */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-center text-gray-500">
                Đã chọn{" "}
                <span className="font-bold text-blue-600">
                  {selectedStaffIds.length}
                </span>{" "}
                nhân viên
              </p>
            </div>
          </div>

          {/* Right - Shift config */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Date */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Ngày làm việc
              </label>
              <input
                type="date"
                value={shiftDate}
                min={getMinShiftDate()}
                onChange={(e) => setShiftDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Parking lot */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Bãi xe
              </label>
              <select
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Chọn bãi xe --</option>
                {parkingLots.map((lot) => (
                  <option key={lot.id ?? lot.lotId} value={lot.id ?? lot.lotId}>
                    {lot.name ?? lot.lotName}
                  </option>
                ))}
              </select>
              {lotId && lotOperatingHours && (
                <p className="text-xs text-gray-500 mt-1.5 px-1">
                  {lotOperatingHours.is24h ? (
                    "Bãi hoạt động 24/7"
                  ) : (
                    <>
                      Giờ mở cửa: {lotOperatingHours.openingTime} –{" "}
                      {lotOperatingHours.closingTime}
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Shift type */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Loại ca
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SHIFT_PRESETS.map((preset) => (
                  <button
                    key={preset.type}
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${
                      selectedPreset === preset.type
                        ? `${preset.color} border-transparent text-white`
                        : "border-gray-100 hover:border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        selectedPreset === preset.type
                          ? "bg-white/70"
                          : preset.color
                      }`}
                    />
                    <span
                      className={`text-sm font-bold ${selectedPreset === preset.type ? "text-white" : "text-gray-700"}`}
                    >
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Giờ bắt đầu
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setSelectedPreset("");
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Giờ kết thúc
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setSelectedPreset("");
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {shiftTimeError && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                {shiftTimeError}
              </p>
            )}

            {/* Status */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Trạng thái
              </label>
              <select
                value={shiftStatus}
                onChange={(e) => setShiftStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="SCHEDULED">Đã lên lịch</option>
                <option value="IN_PROGRESS">Đang làm việc</option>
                <option value="COMPLETED">Hoàn thành</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 bg-white rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              loading || selectedStaffIds.length === 0 || !!shiftTimeError
            }
            className="flex-1 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
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
                Đang gán...
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Gán ca ({selectedStaffIds.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default BulkAssignModal;
