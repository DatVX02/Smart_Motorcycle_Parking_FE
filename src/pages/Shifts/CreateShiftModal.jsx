import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Repeat,
  ChevronRight,
  AlertCircle,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import workShiftService from "../../services/workShiftService";
import parkingLotService from "../../services/parkingLotService";

const SHIFT_PRESETS = [
  {
    type: "Morning",
    label: "Ca sáng",
    startTime: "06:00",
    endTime: "14:00",
    bg: "bg-blue-50 border-blue-200 text-blue-700",
    activeBg: "bg-blue-500 border-blue-500 text-white",
    dot: "bg-blue-500",
  },
  {
    type: "Afternoon",
    label: "Ca chiều",
    startTime: "14:00",
    endTime: "22:00",
    bg: "bg-amber-50 border-amber-200 text-amber-700",
    activeBg: "bg-amber-500 border-amber-500 text-white",
    dot: "bg-amber-500",
  },
  {
    type: "Night",
    label: "Ca đêm",
    startTime: "22:00",
    endTime: "06:00",
    bg: "bg-violet-50 border-violet-200 text-violet-700",
    activeBg: "bg-violet-500 border-violet-500 text-white",
    dot: "bg-violet-500",
  },
  {
    type: "Full Day",
    label: "Cả ngày",
    startTime: "07:00",
    endTime: "19:00",
    bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
    activeBg: "bg-emerald-500 border-emerald-500 text-white",
    dot: "bg-emerald-500",
  },
];

const DAYS_OF_WEEK = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
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

/** Chuyển "HH:mm" thành số phút từ 0h (vd: "06:30" → 390) */
function timeToMinutes(t) {
  if (!t || typeof t !== "string") return 0;
  const [h, m] = t.substring(0, 5).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(min) {
  const h = Math.floor(Math.max(0, min) / 60) % 24;
  const m = Math.floor(Math.max(0, min) % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const STANDARD_SHIFT_HOURS = 8;
const SHORT_DAY_SHIFT_HOURS = 6; // Khi < 14h thì chia 6 tiếng/ca, thời gian còn lại cộng vào ca chiều
const MIN_NIGHT_SHIFT_HOURS = 4; // Nếu thời gian còn lại < 4h thì cộng vào ca chiều

function calculateShiftSuggestions(openingTime, closingTime, is24h) {
  if (is24h) {
    return {
      Morning: { start: "06:00", end: "14:00" },
      Afternoon: { start: "14:00", end: "22:00" },
      Night: { start: "22:00", end: "06:00" },
      "Full Day": { start: "00:00", end: "23:59" },
    };
  }

  const openMin = timeToMinutes(openingTime);
  const closeMin = timeToMinutes(closingTime);
  let totalMinutes = closeMin - openMin;
  if (totalMinutes <= 0) totalMinutes += 24 * 60;
  const totalHours = totalMinutes / 60;
  const eightHours = STANDARD_SHIFT_HOURS * 60;
  const sixHours = SHORT_DAY_SHIFT_HOURS * 60;

  if (totalHours <= 6) {
    return {
      Morning: null,
      Afternoon: null,
      Night: null,
      "Full Day": { start: openingTime, end: closingTime },
    };
  }

  if (totalHours > 6 && totalHours < 14) {
    const morningStart = openMin;
    const morningEnd = openMin + sixHours;
    const afternoonStart = morningEnd;
    const afternoonEnd = closeMin;

    return {
      Morning: {
        start: minutesToTime(morningStart),
        end: minutesToTime(morningEnd),
      },
      Afternoon: {
        start: minutesToTime(afternoonStart),
        end: minutesToTime(afternoonEnd),
      },
      Night: null,
      "Full Day": { start: openingTime, end: closingTime },
    };
  }

  if (totalHours >= 14 && totalHours <= 16) {
    const morningStart = openMin;
    const morningEnd = openMin + eightHours;
    const afternoonStart = morningEnd;
    const afternoonEnd = closeMin;

    return {
      Morning: {
        start: minutesToTime(morningStart),
        end: minutesToTime(morningEnd),
      },
      Afternoon: {
        start: minutesToTime(afternoonStart),
        end: minutesToTime(afternoonEnd),
      },
      Night: null,
      "Full Day": { start: openingTime, end: closingTime },
    };
  }

  if (totalHours > 16) {
    const morningStart = openMin;
    const morningEnd = openMin + eightHours;
    const afternoonStart = morningEnd;
    const remainingMinutes = closeMin - afternoonStart - eightHours;
    const remainingHours = remainingMinutes / 60;

    if (remainingHours < MIN_NIGHT_SHIFT_HOURS) {
      const afternoonEnd = closeMin;
      return {
        Morning: {
          start: minutesToTime(morningStart),
          end: minutesToTime(morningEnd),
        },
        Afternoon: {
          start: minutesToTime(afternoonStart),
          end: minutesToTime(afternoonEnd),
        },
        Night: null,
        "Full Day": { start: openingTime, end: closingTime },
      };
    }

    const afternoonEnd = afternoonStart + eightHours;
    const nightStart = afternoonEnd;
    const nightEnd = closeMin;

    return {
      Morning: {
        start: minutesToTime(morningStart),
        end: minutesToTime(morningEnd),
      },
      Afternoon: {
        start: minutesToTime(afternoonStart),
        end: minutesToTime(afternoonEnd),
      },
      Night: { start: minutesToTime(nightStart), end: minutesToTime(nightEnd) },
      "Full Day": { start: openingTime, end: closingTime },
    };
  }

  return {
    Morning: { start: "06:00", end: "14:00" },
    Afternoon: { start: "14:00", end: "22:00" },
    Night: { start: "22:00", end: "06:00" },
    "Full Day": { start: openingTime, end: closingTime },
  };
}

/** Kiểm tra ca làm có nằm trong giờ mở/đóng cửa của bãi không */
function isShiftWithinOperatingHours(
  startTime,
  endTime,
  openingTime,
  closingTime,
  is24h,
) {
  if (is24h) return null; // Không cần validate
  const openMin = timeToMinutes(openingTime);
  const closeMin = timeToMinutes(closingTime);
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  // Ca qua đêm (end < start): không hợp lệ với bãi không 24/7
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

function mapShiftTypeToPreset(shiftType) {
  const t = (shiftType ?? "").toUpperCase().replace(/_/g, " ");
  if (t.includes("MORNING")) return "Morning";
  if (t.includes("AFTERNOON")) return "Afternoon";
  if (t.includes("NIGHT")) return "Night";
  if (t.includes("FULL") || t.includes("DAY")) return "Full Day";
  return "Morning";
}

function CreateShiftModal({
  staff,
  staffList = [],
  date,
  initialLotId,
  initialEndDate,
  initialTab,
  parkingLots,
  editingShift,
  onClose,
  onSuccess,
}) {
  const isEdit = !!editingShift;
  const shiftId =
    editingShift?.shiftId ?? editingShift?.ShiftId ?? editingShift?.id;
  const [tab, setTab] = useState(isEdit ? "single" : (initialTab ?? "single"));
  const [selectedPreset, setSelectedPreset] = useState(
    isEdit
      ? mapShiftTypeToPreset(editingShift?.shiftType ?? editingShift?.ShiftType)
      : "Morning",
  );
  const [startTime, setStartTime] = useState(
    isEdit ? (editingShift?.startTime ?? "06:00").slice(0, 5) : "06:00",
  );
  const [endTime, setEndTime] = useState(
    isEdit ? (editingShift?.endTime ?? "14:00").slice(0, 5) : "14:00",
  );
  const [lotId, setLotId] = useState(
    isEdit
      ? (editingShift?.lotId ?? editingShift?.LotId ?? "")
      : (initialLotId ?? parkingLots[0]?.id ?? parkingLots[0]?.lotId ?? ""),
  );
  const [shiftStatus, setShiftStatus] = useState(
    isEdit
      ? (
          editingShift?.shiftStatus ??
          editingShift?.ShiftStatus ??
          "SCHEDULED"
        ).toUpperCase()
      : "SCHEDULED",
  );
  const [loading, setLoading] = useState(false);
  const [lotOperatingHours, setLotOperatingHours] = useState(null); // { openingTime, closingTime, is24h }

  // Lấy giờ mở/đóng cửa khi chọn bãi xe
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

  // Tính gợi ý ca tự động dựa trên giờ mở/đóng cửa
  const shiftSuggestions = lotOperatingHours
    ? calculateShiftSuggestions(
        lotOperatingHours.openingTime,
        lotOperatingHours.closingTime,
        lotOperatingHours.is24h,
      )
    : null;

  // Cập nhật giờ khi đổi bãi xe theo preset đang chọn
  useEffect(() => {
    if (!lotId || !lotOperatingHours) return;
    const suggestions = calculateShiftSuggestions(
      lotOperatingHours.openingTime,
      lotOperatingHours.closingTime,
      lotOperatingHours.is24h,
    );
    const suggested = suggestions[selectedPreset];
    if (suggested) {
      setStartTime(suggested.start);
      setEndTime(suggested.end);
    }
  }, [lotId, lotOperatingHours, selectedPreset]);

  // Bulk fields
  const [endDate, setEndDate] = useState(initialEndDate ?? "");
  // Các ngày trong tuần nằm trong khoảng [date, endDate] - chỉ được chọn những ngày này
  const allowedDays = (() => {
    if (!endDate || !date) return [];
    const daysInRange = new Set();
    const cur = new Date(date + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    while (cur <= end) {
      daysInRange.add(cur.getDay());
      cur.setDate(cur.getDate() + 1);
    }
    return Array.from(daysInRange);
  })();

  const [workingDays, setWorkingDays] = useState(() => {
    if (!initialEndDate) return [];
    const daysInRange = new Set();
    const cur = new Date(date + "T00:00:00");
    const end = new Date(initialEndDate + "T00:00:00");
    while (cur <= end) {
      daysInRange.add(cur.getDay());
      cur.setDate(cur.getDate() + 1);
    }
    return Array.from(daysInRange);
  });

  // Khi mở từ click ngày (staff null), cho phép chọn nhân viên
  const needsStaffSelection = !staff && !editingShift;
  const [selectedStaffId, setSelectedStaffId] = useState("");

  // Khi endDate hoặc date đổi, chỉ giữ lại workingDays nằm trong khoảng mới
  useEffect(() => {
    if (allowedDays.length === 0) {
      setWorkingDays([]);
      return;
    }
    setWorkingDays((prev) => prev.filter((d) => allowedDays.includes(d)));
  }, [endDate, date]);

  const staffId =
    staff?.staffId ??
    staff?.id ??
    selectedStaffId ??
    editingShift?.staffId ??
    editingShift?.StaffId ??
    "";
  const selectedStaff = staffList.find(
    (s) => String(s.staffId ?? s.id ?? "") === String(staffId),
  );
  const staffName =
    staff?.fullName ??
    staff?.name ??
    selectedStaff?.fullName ??
    selectedStaff?.name ??
    editingShift?.staffName ??
    editingShift?.StaffName ??
    "Nhân viên";

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.type);
    let start = preset.startTime;
    let end = preset.endTime;
    if (shiftSuggestions) {
      const suggested = shiftSuggestions[preset.type];
      if (suggested) {
        start = suggested.start;
        end = suggested.end;
      }
    }
    setStartTime(start);
    setEndTime(end);
  };

  const handleTimeChange = (field, value) => {
    if (field === "start") setStartTime(value);
    else setEndTime(value);
    setSelectedPreset("");
  };

  const toggleDay = (day) => {
    if (!allowedDays.includes(day)) return;
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSubmit = async () => {
    if (!staffId) {
      toast.error("Vui lòng chọn nhân viên");
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    if (new Date(date + "T00:00:00") < tomorrow) {
      toast.error("Chỉ được chia lịch từ ngày mai trở đi");
      return;
    }
    if (!lotId) {
      toast.error("Vui lòng chọn bãi xe");
      return;
    }

    // Validate ca làm nằm trong giờ mở/đóng cửa của bãi
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

    const payload = {
      staffId,
      lotId,
      shiftDate: date,
      shiftType: (selectedPreset || "Morning").replace(" ", "_").toUpperCase(),
      startTime,
      endTime,
      shiftStatus,
    };

    setLoading(true);
    try {
      if (isEdit && shiftId) {
        await workShiftService.update(shiftId, payload);
        toast.success(`Đã cập nhật ca cho ${staffName} ngày ${date}`);
      } else if (tab === "single") {
        await workShiftService.create(payload);
        toast.success(`Đã tạo ca cho ${staffName} ngày ${date}`);
      } else {
        if (!endDate) {
          toast.error("Vui lòng chọn ngày kết thúc");
          setLoading(false);
          return;
        }
        if (workingDays.length === 0) {
          toast.error("Vui lòng chọn ít nhất 1 ngày trong tuần");
          setLoading(false);
          return;
        }
        const bulkPayload = {
          staffId: String(staffId),
          lotId: String(lotId),
          startDate: date,
          endDate,
          shiftType: (selectedPreset || "Morning")
            .replace(" ", "_")
            .toUpperCase(),
          startTime: startTime.length === 5 ? startTime : `${startTime}:00`,
          endTime: endTime.length === 5 ? endTime : `${endTime}:00`,
          workingDays: workingDays.map(Number),
          shiftStatus,
        };
        const result = await workShiftService.bulkCreate(bulkPayload);
        const count = Array.isArray(result) ? result.length : "nhiều";
        toast.success(`Đã tạo ${count} ca cho ${staffName}`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      const data = err?.response?.data;
      let msg = data?.message ?? data?.title ?? err?.message ?? "Có lỗi xảy ra";
      // ASP.NET Core validation: errors = { "FieldName": ["Error1", "Error2"] }
      if (data?.errors && typeof data.errors === "object") {
        const parts = Object.entries(data.errors)
          .flatMap(([k, v]) => (Array.isArray(v) ? v : [v]))
          .filter(Boolean);
        if (parts.length > 0) msg = parts.join(". ");
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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

  const displayDate = (() => {
    try {
      return new Date(date + "T00:00:00").toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return date;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/60 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(staffId)}`}
          >
            {getInitials(staffName)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              {isEdit ? "Cập nhật ca trực" : "Tạo ca trực"}
            </h2>
            <p className="text-sm text-gray-500 truncate">{staffName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs - ẩn khi sửa ca */}
        {!isEdit && (
          <div className="flex border-b border-slate-100 bg-slate-50/30">
            <button
              onClick={() => setTab("single")}
              className={`flex-1 py-3 text-sm font-semibold transition-all ${
                tab === "single"
                  ? "border-b-2 border-blue-500 text-blue-600 bg-white/50"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Ca đơn
            </button>
            <button
              onClick={() => setTab("bulk")}
              className={`flex-1 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                tab === "bulk"
                  ? "border-b-2 border-blue-500 text-blue-600 bg-white/50"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              Theo tuần
            </button>
          </div>
        )}

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Chọn nhân viên - khi mở từ click ngày (chưa kéo nhân viên) */}
          {needsStaffSelection && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Nhân viên
              </label>
              <select
                value={staffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-shadow"
              >
                <option value="">-- Chọn nhân viên --</option>
                {staffList.map((s) => {
                  const id = String(s.staffId ?? s.id ?? "");
                  const name = s.fullName ?? s.name ?? "Nhân viên";
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Date info */}
          <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/80">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-600/80 font-medium">
                {tab === "single" ? "Ngày làm việc" : "Ngày bắt đầu"}
              </p>
              <p className="text-sm font-semibold text-slate-800 capitalize">
                {displayDate}
              </p>
            </div>
          </div>

          {/* End date - bulk only */}
          {tab === "bulk" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Đến ngày
              </label>
              <input
                type="date"
                value={endDate}
                min={date}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-shadow"
              />
            </div>
          )}

          {/* Days of week - bulk only */}
          {tab === "bulk" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Ngày trong tuần
              </label>
              {!endDate && (
                <p className="text-xs text-amber-600 mb-2">
                  Vui lòng chọn "Đến ngày" trước để chọn ngày trong tuần
                </p>
              )}
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map((d) => {
                  const isInRange = allowedDays.includes(d.value);
                  const isSelected = workingDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      disabled={!isInRange}
                      className={`flex-1 py-2 text-xs rounded-lg border font-semibold transition-all ${
                        !isInRange
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                          : isSelected
                            ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                            : "bg-white text-gray-500 border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              {/* Preview số ca sẽ tạo */}
              {endDate &&
                workingDays.length > 0 &&
                (() => {
                  let count = 0;
                  const cur = new Date(date + "T00:00:00");
                  const end = new Date(endDate + "T00:00:00");
                  while (cur <= end) {
                    if (workingDays.includes(cur.getDay())) count++;
                    cur.setDate(cur.getDate() + 1);
                  }
                  return (
                    <p className="text-xs text-blue-600 font-medium mt-1.5 bg-blue-50 px-2.5 py-1.5 rounded-lg">
                      Sẽ tạo <span className="font-bold">{count} ca</span> trong
                      khoảng này
                    </p>
                  );
                })()}
            </div>
          )}

          {/* Parking lot */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Bãi xe
            </label>
            <select
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 bg-white transition-shadow hover:border-slate-300"
            >
              <option value="">-- Chọn bãi xe --</option>
              {parkingLots.map((lot) => (
                <option key={lot.id ?? lot.lotId} value={lot.id ?? lot.lotId}>
                  {lot.name ?? lot.lotName}
                </option>
              ))}
            </select>
            {lotId && lotOperatingHours && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  lotOperatingHours.is24h
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-slate-50 text-slate-700 border border-slate-100"
                }`}
              >
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                {lotOperatingHours.is24h ? (
                  "Bãi hoạt động 24/7"
                ) : (
                  <>
                    Giờ mở cửa:{" "}
                    <span className="font-semibold">
                      {lotOperatingHours.openingTime} –{" "}
                      {lotOperatingHours.closingTime}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Shift type presets - Auto-suggest dựa trên giờ mở cửa */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Loại ca
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SHIFT_PRESETS.map((preset) => {
                const suggested = shiftSuggestions?.[preset.type];
                const isAvailable = !shiftSuggestions || suggested !== null;
                const isSelected = selectedPreset === preset.type;
                return (
                  <button
                    key={preset.type}
                    onClick={() => isAvailable && handlePresetSelect(preset)}
                    disabled={!isAvailable}
                    className={`p-3 text-left rounded-xl border-2 transition-all flex flex-col gap-1 ${
                      !isAvailable
                        ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                        : isSelected
                          ? preset.activeBg
                          : `${preset.bg} hover:border-opacity-80 hover:shadow-sm`
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${!isAvailable ? "bg-gray-300" : isSelected ? "bg-white/70" : preset.dot}`}
                      />
                      <span className="text-sm font-bold">{preset.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Giờ bắt đầu
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleTimeChange("start", e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-shadow"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Giờ kết thúc
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleTimeChange("end", e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-shadow"
                />
              </div>
            </div>
          </div>
          {shiftTimeError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200/80">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium">
                {shiftTimeError}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:border-slate-300 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              loading || !!shiftTimeError || (needsStaffSelection && !staffId)
            }
            className="flex-1 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20"
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
                {isEdit ? "Đang cập nhật..." : "Đang tạo..."}
              </>
            ) : (
              <>
                {isEdit
                  ? "Cập nhật"
                  : tab === "single"
                    ? "Tạo ca"
                    : "Tạo lịch tuần"}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateShiftModal;
