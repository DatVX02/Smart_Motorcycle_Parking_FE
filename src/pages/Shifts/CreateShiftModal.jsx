import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { format, parse } from "date-fns";
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
    bg: "bg-green-50 border-green-200 text-green-700",
    activeBg: "bg-green-500 border-green-500 text-white",
    dot: "bg-green-500",
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
  "bg-green-500",
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

/** Input ngày hiển thị theo format dd/mm/yyyy */
function DateInputDDMMYYYY({ label, value, min, onChange, placeholder }) {
  const displayValue =
    value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? (() => {
          try {
            const d = parse(value, "yyyy-MM-dd", new Date());
            return format(d, "dd/MM/yyyy");
          } catch {
            return value;
          }
        })()
      : "";

  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5" />
        {label}
      </label>
      <div className="relative">
        <div
          className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm flex items-center gap-2 bg-white min-h-[42px] ${
            displayValue ? "text-slate-800" : "text-slate-400"
          }`}
        >
          <span>{displayValue || placeholder}</span>
          <Calendar className="w-4 h-4 text-slate-400 ml-auto flex-shrink-0" />
        </div>
        <input
          type="date"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={label}
        />
      </div>
    </div>
  );
}

/** Chuyển "HH:mm" thành số phút từ 0h */
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

/** * Hàm xê dịch giờ (Hỗ trợ đọc từ chuỗi ISO như "2026-04-21T23:00:00Z")
 */
function shiftTimeByHours(value, deltaHours, withSeconds = false) {
  const raw = String(value ?? "").trim();
  // Bóc tách lấy phần giờ:phút:giây nếu chuỗi có định dạng ISO date
  const timePart = raw.includes("T") ? raw.split("T")[1].replace("Z", "") : raw;
  const match = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!match) return raw;

  const [, hh, mm, ss = "00"] = match;
  const minutesInDay = 24 * 60;
  const originalMinutes = Number(hh) * 60 + Number(mm);
  const shiftedMinutes =
    (((originalMinutes + deltaHours * 60) % minutesInDay) + minutesInDay) %
    minutesInDay;

  const shiftedHour = String(Math.floor(shiftedMinutes / 60)).padStart(2, "0");
  const shiftedMinute = String(shiftedMinutes % 60).padStart(2, "0");

  if (withSeconds) {
    return `${shiftedHour}:${shiftedMinute}:${String(Number(ss)).padStart(2, "0")}`;
  }
  return `${shiftedHour}:${shiftedMinute}`;
}

/**
 * Trả về YYYY-MM-DD theo giờ local (UTC+7) từ dữ liệu shift.
 * DB lưu ngày UTC, khi startTime UTC >= 17h thì local date = UTC date + 1.
 */
function getLocalDateFromShift(shift) {
  const raw =
    shift?.shiftDate ??
    shift?.workDate ??
    shift?.date ??
    shift?.ShiftDate ??
    "";
  let d = raw ? raw.split("T")[0] : "";
  if (!d) return d;

  const rawSt = String(shift?.startTime ?? shift?.StartTime ?? "").trim();
  const tp = rawSt.includes("T") ? rawSt.split("T")[1].replace("Z", "") : rawSt;
  const hm = tp.match(/^(\d{1,2}):/);
  const utcH = hm ? Number(hm[1]) : -1;
  if (utcH >= 17) {
    const dt = new Date(d + "T00:00:00");
    dt.setDate(dt.getDate() + 1);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    d = `${yy}-${mm}-${dd}`;
  }
  return d;
}

/**
 * Kiểm tra 2 khoảng giờ (HH:mm) có trùng nhau không.
 * Hỗ trợ ca qua đêm (end <= start → cộng thêm 24h).
 */
function hasTimeOverlap(s1, e1, s2, e2) {
  let start1 = timeToMinutes(s1);
  let end1 = timeToMinutes(e1);
  let start2 = timeToMinutes(s2);
  let end2 = timeToMinutes(e2);
  if (end1 <= start1) end1 += 24 * 60;
  if (end2 <= start2) end2 += 24 * 60;
  return start1 < end2 && start2 < end1;
}

const STANDARD_SHIFT_HOURS = 8;
const SHORT_DAY_SHIFT_HOURS = 6;
const MIN_NIGHT_SHIFT_HOURS = 4;

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
  if (is24h) return null;
  const openMin = timeToMinutes(startTime);
  const closeMin = timeToMinutes(endTime); // Tạm xử lý local để so sánh

  const bOpenMin = timeToMinutes(openingTime);
  const bCloseMin = timeToMinutes(closingTime);

  if (closeMin <= openMin) {
    return "Ca qua đêm không phù hợp với bãi xe có giờ đóng cửa cố định. Vui lòng chọn ca trong khung giờ mở cửa.";
  }
  if (openMin < bOpenMin) {
    return `Giờ bắt đầu phải từ ${openingTime} (giờ mở cửa) trở đi`;
  }
  if (closeMin > bCloseMin) {
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

  // Khi sửa ca: nếu giờ UTC >= 17:00 (cộng 7h sẽ vượt qua nửa đêm sang ngày hôm sau),
  // cần cộng thêm 1 ngày để hiển thị đúng ngày local
  const [editDate, setEditDate] = useState(() => {
    if (!isEdit) return date;
    const rawStart = String(editingShift?.startTime ?? "").trim();
    const timePart = rawStart.includes("T")
      ? rawStart.split("T")[1].replace("Z", "")
      : rawStart;
    const hMatch = timePart.match(/^(\d{1,2}):/);
    const utcHour = hMatch ? Number(hMatch[1]) : 0;
    if (utcHour >= 17) {
      // Cộng 7h sẽ vượt 24h → ngày local = ngày UTC + 1
      const d = new Date(date + "T00:00:00");
      d.setDate(d.getDate() + 1);
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    }
    return date;
  });
  const editDateInputRef = useRef(null);

  const [selectedPreset, setSelectedPreset] = useState(
    isEdit
      ? mapShiftTypeToPreset(editingShift?.shiftType ?? editingShift?.ShiftType)
      : "Morning",
  );

  // FETCH: CỘNG THÊM 7 TIẾNG NẾU LÀ SỬA CA ĐỂ HIỂN THỊ GIỜ LOCAL
  const [startTime, setStartTime] = useState(
    isEdit ? shiftTimeByHours(editingShift?.startTime ?? "23:00", 7) : "06:00",
  );
  const [endTime, setEndTime] = useState(
    isEdit ? shiftTimeByHours(editingShift?.endTime ?? "07:00", 7) : "14:00",
  );

  const [lotId, setLotId] = useState(
    isEdit
      ? (editingShift?.lotId ?? editingShift?.LotId ?? "")
      : (initialLotId ?? parkingLots[0]?.id ?? parkingLots[0]?.lotId ?? ""),
  );
  const [shiftStatus] = useState(
    isEdit
      ? (
          editingShift?.shiftStatus ??
          editingShift?.ShiftStatus ??
          "SCHEDULED"
        ).toUpperCase()
      : "SCHEDULED",
  );
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

  const shiftSuggestions = lotOperatingHours
    ? calculateShiftSuggestions(
        lotOperatingHours.openingTime,
        lotOperatingHours.closingTime,
        lotOperatingHours.is24h,
      )
    : null;

  useEffect(() => {
    if (!lotId || !lotOperatingHours || isEdit) return; // Nếu edit thì không tự động đè giờ
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
  }, [lotId, lotOperatingHours, selectedPreset, isEdit]);

  const [endDate, setEndDate] = useState(initialEndDate ?? "");
  const allowedDays = useMemo(() => {
    if (!endDate || !date) return [];
    const daysInRange = new Set();
    const cur = new Date(date + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    while (cur <= end) {
      daysInRange.add(cur.getDay());
      cur.setDate(cur.getDate() + 1);
    }
    return Array.from(daysInRange);
  }, [endDate, date]);

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

  const needsStaffSelection = !staff && !editingShift;
  const [selectedStaffId, setSelectedStaffId] = useState("");

  useEffect(() => {
    if (allowedDays.length === 0) {
      setWorkingDays([]);
      return;
    }
    setWorkingDays((prev) => prev.filter((d) => allowedDays.includes(d)));
  }, [allowedDays]);

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

  const toggleDay = (day) => {
    if (!allowedDays.includes(day)) return;
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const activeDate = isEdit ? editDate : date;

  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const isToday = useMemo(() => {
    if (!activeDate) return false;
    const now = new Date();
    const yy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}` === activeDate;
  }, [activeDate]);

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30_000);
    return () => clearInterval(id);
  }, [isToday]);

  const isPresetEnded = useMemo(() => {
    if (!isToday) return () => false;
    return (preset) => {
      const suggested = shiftSuggestions?.[preset.type];
      const start = suggested?.start ?? preset.startTime;
      const end = suggested?.end ?? preset.endTime;
      let startMin = timeToMinutes(start);
      let endMin = timeToMinutes(end);
      if (endMin <= startMin) endMin += 24 * 60; // ca qua đêm
      return nowMinutes >= endMin;
    };
  }, [isToday, nowMinutes, shiftSuggestions]);

  useEffect(() => {
    if (!isToday) return;
    const current = SHIFT_PRESETS.find((p) => p.type === selectedPreset);
    if (!current) return;
    const suggested = shiftSuggestions?.[current.type];
    const isAvailable = !shiftSuggestions || suggested !== null;
    if (!isAvailable || isPresetEnded(current)) {
      const next = SHIFT_PRESETS.find((p) => {
        const s = shiftSuggestions?.[p.type];
        const avail = !shiftSuggestions || s !== null;
        return avail && !isPresetEnded(p);
      });
      if (next) handlePresetSelect(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, nowMinutes]);

  const handleSubmit = async () => {
    if (!staffId) {
      toast.error("Vui lòng chọn nhân viên");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(activeDate + "T00:00:00") < today) {
      toast.error("Chỉ được chia lịch từ hôm nay trở đi");
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

    // KIỂM TRA TRÙNG CA: nhân viên đã có ca trong cùng ngày & giờ chưa?
    try {
      const existingShifts = await workShiftService.getByStaff(staffId);
      const shiftsArr = Array.isArray(existingShifts)
        ? existingShifts
        : (existingShifts?.items ?? existingShifts?.data ?? []);

      for (const s of shiftsArr) {
        // Bỏ qua ca đã hủy/từ chối
        const st = (s.shiftStatus ?? s.ShiftStatus ?? "").toUpperCase();
        if (st === "CANCELLED" || st === "REJECTED") continue;

        // Bỏ qua chính ca đang sửa
        if (
          isEdit &&
          String(s.shiftId ?? s.ShiftId ?? s.id) === String(shiftId)
        )
          continue;

        // So sánh ngày local
        const existingLocalDate = getLocalDateFromShift(s);
        if (existingLocalDate !== activeDate) continue;

        // Cùng ngày → kiểm tra trùng giờ
        const existingStart = shiftTimeByHours(s.startTime ?? s.StartTime, 7);
        const existingEnd = shiftTimeByHours(s.endTime ?? s.EndTime, 7);

        if (hasTimeOverlap(startTime, endTime, existingStart, existingEnd)) {
          toast.error(
            `${staffName} đã có ca (${existingStart} – ${existingEnd}) vào ngày ${activeDate}. Không thể tạo ca trùng giờ.`,
          );
          return;
        }
      }
    } catch (checkErr) {
      // Nếu kiểm tra thất bại, vẫn cho phép tạo (backend sẽ validate)
      console.warn("Không thể kiểm tra trùng ca:", checkErr);
    }

    // SAVE: LUÔN TRỪ ĐI 7 TIẾNG ĐỂ LƯU VÀO DB VỚI CHUẨN UTC
    const apiStartTime = shiftTimeByHours(startTime, -7, true);
    const apiEndTime = shiftTimeByHours(endTime, -7, true);

    // Khi trừ 7h, nếu giờ local < 07:00 thì giờ UTC sẽ lùi sang ngày hôm trước
    // Ví dụ: 06:00 local → 23:00 UTC ngày hôm trước
    const startMinutes = timeToMinutes(startTime);
    const needsDateAdjust = startMinutes < 7 * 60;

    /** Lùi ngày đi 1 nếu giờ UTC vượt qua nửa đêm */
    const adjustDate = (dateStr) => {
      if (!needsDateAdjust) return dateStr;
      const d = new Date(dateStr + "T00:00:00");
      d.setDate(d.getDate() - 1);
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    };

    const apiShiftDate = adjustDate(activeDate);

    const payload = {
      staffId,
      lotId,
      shiftDate: apiShiftDate,
      shiftType: (selectedPreset || "Morning").replace(" ", "_").toUpperCase(),
      startTime: apiStartTime,
      endTime: apiEndTime,
      shiftStatus,
    };

    setLoading(true);
    try {
      if (isEdit && shiftId) {
        await workShiftService.update(shiftId, payload);
        toast.success(`Đã cập nhật ca cho ${staffName} ngày ${activeDate}`);
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

        // Lùi ngày + lùi workingDays nếu giờ UTC vượt qua nửa đêm
        const apiWorkingDays = needsDateAdjust
          ? workingDays.map((d) => (d - 1 + 7) % 7)
          : workingDays.map(Number);

        const bulkPayload = {
          staffId: String(staffId),
          lotId: String(lotId),
          startDate: adjustDate(date),
          endDate: adjustDate(endDate),
          shiftType: (selectedPreset || "Morning")
            .replace(" ", "_")
            .toUpperCase(),
          startTime: apiStartTime,
          endTime: apiEndTime,
          workingDays: apiWorkingDays,
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
      let msg =
        data?.message ??
        data?.title ??
        err?.message ??
        "Không thể tạo ca trực. Vui lòng thử lại.";
      if (data?.errors && typeof data.errors === "object") {
        const parts = Object.entries(data.errors)
          .flatMap(([, v]) => (Array.isArray(v) ? v : [v]))
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
      return new Date(activeDate + "T00:00:00").toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return activeDate;
    }
  })();

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/60 w-full max-w-md overflow-hidden my-auto">
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
          {needsStaffSelection && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
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

          {isEdit ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const el = editDateInputRef.current;
                  if (!el) return;
                  if (typeof el.showPicker === "function") el.showPicker();
                  else el.click();
                }}
                className="w-full flex items-center gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:border-blue-400 hover:shadow-sm transition-all text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-600/80 font-medium">
                    Ngày làm việc
                  </p>
                  <p className="text-sm font-semibold text-slate-800 capitalize">
                    {displayDate}
                  </p>
                </div>
                <span className="text-xs text-blue-500 font-medium flex-shrink-0">
                  Thay đổi ›
                </span>
              </button>
              <input
                ref={editDateInputRef}
                type="date"
                value={editDate}
                min={(() => {
                  const t = new Date();
                  const yy = t.getFullYear();
                  const mm = String(t.getMonth() + 1).padStart(2, "0");
                  const dd = String(t.getDate()).padStart(2, "0");
                  return `${yy}-${mm}-${dd}`;
                })()}
                onChange={(e) => setEditDate(e.target.value)}
                className="sr-only"
                aria-label="Ngày làm việc"
              />
            </>
          ) : (
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
          )}

          {tab === "bulk" && (
            <DateInputDDMMYYYY
              label="Đến ngày"
              value={endDate}
              min={date}
              onChange={setEndDate}
              placeholder="dd/mm/yyyy"
            />
          )}

          {tab === "bulk" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Ngày trong tuần
              </label>
              {!endDate && (
                <p className="text-xs text-amber-600 mb-2">
                  Vui lòng chọn &quot;Đến ngày&quot; trước để chọn ngày trong
                  tuần
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
                    ? "bg-green-50 text-green-700 border border-green-100"
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

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Loại ca
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SHIFT_PRESETS.map((preset) => {
                const suggested = shiftSuggestions?.[preset.type];
                const isAvailable = !shiftSuggestions || suggested !== null;
                const isEnded = isPresetEnded(preset);
                const isDisabled = !isAvailable || isEnded;
                const isSelected = selectedPreset === preset.type;
                return (
                  <button
                    key={preset.type}
                    onClick={() => !isDisabled && handlePresetSelect(preset)}
                    disabled={isDisabled}
                    className={`p-3 text-left rounded-xl border-2 transition-all flex flex-col gap-1 ${
                      isDisabled
                        ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                        : isSelected
                          ? preset.activeBg
                          : `${preset.bg} hover:border-opacity-80 hover:shadow-sm`
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isDisabled ? "bg-gray-300" : isSelected ? "bg-white/70" : preset.dot}`}
                      />
                      <span className="text-sm font-bold">{preset.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Giờ bắt đầu
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <div className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 font-medium cursor-default select-none">
                  {startTime || "--:--"}
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Giờ kết thúc
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <div className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-700 font-medium cursor-default select-none">
                  {endTime || "--:--"}
                </div>
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
    </div>,
    document.body,
  );
}

export default CreateShiftModal;
