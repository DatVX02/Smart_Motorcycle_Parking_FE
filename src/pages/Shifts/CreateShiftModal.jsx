import { useState } from "react";
import { X, Calendar, Clock, MapPin, Repeat, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import workShiftService from "../../services/workShiftService";

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

function CreateShiftModal({ staff, date, parkingLots, onClose, onSuccess }) {
  const [tab, setTab] = useState("single");
  const [selectedPreset, setSelectedPreset] = useState("MORNING");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("14:00");
  const [lotId, setLotId] = useState(
    parkingLots[0]?.id ?? parkingLots[0]?.lotId ?? "",
  );
  const [shiftStatus, setShiftStatus] = useState("SCHEDULED");
  const [loading, setLoading] = useState(false);

  // Bulk fields
  const [endDate, setEndDate] = useState("");
  const [workingDays, setWorkingDays] = useState([1, 3, 5]);

  const staffId = staff?.staffId ?? staff?.id ?? "";
  const staffName = staff?.fullName ?? staff?.name ?? "Nhân viên";

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset.type);
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
  };

  const handleTimeChange = (field, value) => {
    if (field === "start") setStartTime(value);
    else setEndTime(value);
    setSelectedPreset("");
  };

  const toggleDay = (day) =>
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  const handleSubmit = async () => {
    if (!lotId) {
      toast.error("Vui lòng chọn bãi xe");
      return;
    }

    setLoading(true);
    try {
      if (tab === "single") {
        await workShiftService.create({
          staffId,
          lotId,
          shiftDate: date,
          shiftType: selectedPreset || "MORNING",
          startTime,
          endTime,
          shiftStatus,
        });
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
        const result = await workShiftService.bulkCreate({
          staffId,
          lotId,
          startDate: date,
          endDate,
          shiftType: selectedPreset || "MORNING",
          startTime,
          endTime,
          workingDays,
        });
        const count = Array.isArray(result) ? result.length : "nhiều";
        toast.success(`Đã tạo ${count} ca cho ${staffName}`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.title ??
        err?.message ??
        "Có lỗi xảy ra";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(staffId)}`}
          >
            {getInitials(staffName)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 leading-tight">
              Tạo ca trực
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

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab("single")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "single"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Ca đơn
          </button>
          <button
            onClick={() => setTab("bulk")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === "bulk"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            Theo tuần
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Date info */}
          <div className="flex items-center gap-2.5 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-blue-400 font-medium">
                {tab === "single" ? "Ngày làm việc" : "Ngày bắt đầu"}
              </p>
              <p className="text-sm font-semibold text-blue-700 capitalize">
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
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Days of week - bulk only */}
          {tab === "bulk" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Ngày trong tuần
              </label>
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => toggleDay(d.value)}
                    className={`flex-1 py-2 text-xs rounded-lg border font-semibold transition-all ${
                      workingDays.includes(d.value)
                        ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                        : "bg-white text-gray-500 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parking lot */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              Bãi xe
            </label>
            <select
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">-- Chọn bãi xe --</option>
              {parkingLots.map((lot) => (
                <option key={lot.id ?? lot.lotId} value={lot.id ?? lot.lotId}>
                  {lot.name ?? lot.lotName}
                </option>
              ))}
            </select>
          </div>

          {/* Shift type presets */}
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
                  className={`p-3 text-left rounded-xl border-2 transition-all ${
                    selectedPreset === preset.type ? preset.activeBg : preset.bg
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div
                      className={`w-2 h-2 rounded-full ${selectedPreset === preset.type ? "bg-white/70" : preset.dot}`}
                    />
                    <span className="text-xs font-bold">{preset.label}</span>
                  </div>
                  <p className="text-xs opacity-70 pl-3.5">
                    {preset.startTime} → {preset.endTime}
                  </p>
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
                onChange={(e) => handleTimeChange("start", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Giờ kết thúc
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => handleTimeChange("end", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status - single only */}
          {tab === "single" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Trạng thái
              </label>
              <select
                value={shiftStatus}
                onChange={(e) => setShiftStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="SCHEDULED">Đã lên lịch</option>
                <option value="IN_PROGRESS">Đang làm việc</option>
                <option value="COMPLETED">Hoàn thành</option>
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                Đang tạo...
              </>
            ) : (
              <>
                {tab === "single" ? "Tạo ca" : "Tạo lịch tuần"}
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
