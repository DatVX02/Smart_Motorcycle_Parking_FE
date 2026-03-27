import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Clock,
  Calendar,
  User,
  FileText,
  Check,
  XCircle,
  RefreshCw,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import workShiftService from "../../services/workShiftService";
import staffService from "../../services/staffService";

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
  FULLDAY: "Cả ngày",
  fullday: "Cả ngày",
};

function parseShiftChangeMessage(message = "") {
  const result = {};
  const lines = message
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const nameMatch = (lines[0] ?? "").match(/^Nhân viên (.+?) yêu cầu/);
  if (nameMatch) result.staffName = nameMatch[1];
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).trim();
    const val = line.substring(colonIdx + 1).trim();
    if (key === "Bãi xe") result.lotName = val;
    else if (key === "Ca hiện tại") {
      const dashIdx = val.indexOf(" - ");
      if (dashIdx !== -1) {
        result.currentShiftType = val.substring(0, dashIdx).trim();
        result.currentShiftDate = val
          .substring(dashIdx + 3)
          .split(" ")[0]
          ?.trim();
      }
    } else if (key === "Lý do") result.reason = val;
    else if (key === "Ngày đề xuất") result.proposedDate = val;
    else if (key === "Ca đề xuất") result.proposedShiftType = val;
    else if (key === "Ghi chú") result.note = val;
  }
  return result;
}

// Chuyển "dd/MM/yyyy" → "yyyy-MM-dd"; nếu đã là ISO thì giữ nguyên
function toIsoDate(dateStr = "") {
  if (!dateStr) return "";
  // dd/MM/yyyy
  const viMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (viMatch) {
    const [, d, m, y] = viMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-MM-dd hoặc ISO đầy đủ
  return dateStr.split("T")[0];
}

function getAvatarColor(id = "") {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
  ];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + h * 31;
  return colors[Math.abs(h) % colors.length];
}

function getInitials(name = "") {
  return name
    .split(" ")
    .slice(-2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

/* ── Modal phụ khi Duyệt ── */
function ApproveModal({ request, parkingLots, onClose, onSuccess }) {
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [shiftsOnDate, setShiftsOnDate] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [currentShiftId, setCurrentShiftId] = useState(
    String(
      request?.shiftId ?? request?.workShiftId ?? request?.currentShiftId ?? "",
    ),
  );

  const notificationId =
    request?.notificationId ?? request?.id ?? request?.notification?.id;
  const parsed = parseShiftChangeMessage(request?.message ?? "");
  const staffName =
    parsed.staffName ??
    request?.staffName ??
    request?.staff?.fullName ??
    "Nhân viên";
  const staffId = request?.staffId ?? "";
  const proposedDateRaw = parsed.proposedDate ?? request?.proposedDate ?? "";
  const proposedDateIso = toIsoDate(proposedDateRaw);
  const proposedShiftType =
    parsed.proposedShiftType ?? request?.proposedShiftType ?? "";
  const currentDate = parsed.currentShiftDate ?? "";
  const currentDateIso = toIsoDate(currentDate);
  const currentShiftType = parsed.currentShiftType ?? "";
  const lotName = parsed.lotName ?? "";
  const reason = parsed.reason ?? parsed.note ?? "";

  const displayProposedDate = proposedDateIso
    ? new Date(proposedDateIso + "T00:00:00").toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  // Nếu request không có shiftId sẵn → tìm từ API theo staffId + ngày hiện tại
  useEffect(() => {
    if (currentShiftId || !staffId || !currentDateIso) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await workShiftService.getByStaff(staffId);
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : (data?.items ?? data?.data?.items ?? []);
        const match = arr.find(
          (s) =>
            (s.shiftDate ?? s.workDate ?? s.date ?? "").split("T")[0] ===
            currentDateIso,
        );
        if (process.env.NODE_ENV === "development") {
          console.log("[ApproveModal] getByStaff result:", arr);
          console.log("[ApproveModal] currentDateIso:", currentDateIso, "matched:", match);
        }
        if (!cancelled && match) {
          setCurrentShiftId(
            String(
              match.shiftId ??
                match.ShiftId ??
                match.workShiftId ??
                match.WorkShiftId ??
                match.id ??
                "",
            ),
          );
        }
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffId, currentDateIso, currentShiftId]);

  // Load các ca trực trên ngày đề xuất từ tất cả bãi xe
  useEffect(() => {
    if (!proposedDateIso) {
      setLoadingShifts(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingShifts(true);
      try {
        const lots = parkingLots ?? [];
        const allShifts = [];
        for (const lot of lots) {
          const id = lot.id ?? lot.lotId;
          if (!id) continue;
          const data = await workShiftService.getByLot(id, {
            startDate: proposedDateIso,
            endDate: proposedDateIso,
          });
          const arr = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : (data?.items ?? data?.data?.items ?? []);
          if (process.env.NODE_ENV === "development") {
            console.log(
              `[ApproveModal] getByLot(${id}) shifts:`,
              arr.map((s) => ({
                shiftId: s.shiftId,
                ShiftId: s.ShiftId,
                workShiftId: s.workShiftId,
                id: s.id,
                staffName: s.staffName,
                shiftDate: s.shiftDate ?? s.workDate ?? s.date,
                shiftType: s.shiftType,
              })),
            );
          }
          const filtered = arr.filter((s) => {
            const d = (s.shiftDate ?? s.workDate ?? s.date ?? "").split("T")[0];
            if (d !== proposedDateIso) return false;
            // Loại trừ ca của chính nhân viên đang yêu cầu đổi
            if (
              staffId &&
              String(s.staffId ?? s.StaffId ?? "") === String(staffId)
            )
              return false;
            return true;
          });
          filtered.forEach((s) => {
            s._lotName = lot.name ?? lot.lotName ?? "";
            s._lotId = id;
          });
          allShifts.push(...filtered);
        }
        if (!cancelled) setShiftsOnDate(allShifts);
      } catch {
        if (!cancelled) setShiftsOnDate([]);
      } finally {
        if (!cancelled) setLoadingShifts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proposedDateIso, parkingLots]);

  const handleSubmit = async () => {
    if (!notificationId) return;
    if (selectedShiftId && !currentShiftId) {
      toast.error(
        "Không xác định được ca hiện tại của nhân viên. Vui lòng thử lại.",
      );
      return;
    }
    setLoading(true);
    try {
      if (selectedShiftId && currentShiftId) {
        // Có chọn ca để đổi → hoán đổi 2 ca với nhau
        if (process.env.NODE_ENV === "development") {
          console.log("[adminSwapShifts] payload:", {
            shiftId1: currentShiftId,
            shiftId2: selectedShiftId,
          });
          console.log(
            "[adminSwapShifts] all available shifts:",
            shiftsOnDate.map((s) => ({
              shiftId: s.shiftId,
              ShiftId: s.ShiftId,
              workShiftId: s.workShiftId,
              id: s.id,
              staffName: s.staffName,
            })),
          );
        }
        await workShiftService.adminSwapShifts({
          shiftId1: currentShiftId,
          shiftId2: selectedShiftId,
        });
      } else if (currentShiftId && proposedDateIso) {
        // Không có ca để đổi → chỉ chuyển ngày ca hiện tại sang ngày đề xuất
        await workShiftService.update(currentShiftId, {
          shiftDate: proposedDateIso,
        });
      }

      await staffService.updateShiftChangeStatus(
        notificationId,
        "Approved",
      );

      toast.success(
        selectedShiftId
          ? "Đã duyệt và hoán đổi ca trực thành công"
          : "Đã duyệt – ca đã được chuyển sang ngày đề xuất",
      );
      onSuccess();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          err?.response?.data?.title ??
          err?.message ??
          "Có lỗi xảy ra",
      );
    } finally {
      setLoading(false);
    }
  };

  const hasShifts = shiftsOnDate.length > 0;

  const SHIFT_COLORS_MAP = {
    MORNING: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      ring: "ring-blue-400",
      dot: "bg-blue-500",
    },
    AFTERNOON: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      ring: "ring-amber-400",
      dot: "bg-amber-500",
    },
    NIGHT: {
      bg: "bg-violet-50",
      border: "border-violet-200",
      text: "text-violet-700",
      ring: "ring-violet-400",
      dot: "bg-violet-500",
    },
    FULL_DAY: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
      ring: "ring-emerald-400",
      dot: "bg-emerald-500",
    },
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Check className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">
              Duyệt yêu cầu đổi ca
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{staffName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tóm tắt yêu cầu */}
          <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 text-xs">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
              Thông tin yêu cầu
            </p>
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-500">Ca hiện tại:</span>
              <span className="font-semibold">{currentDate || "—"}</span>
              {currentShiftType && (
                <span className="px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium">
                  {SHIFT_TYPE_LABELS[currentShiftType] ?? currentShiftType}
                </span>
              )}
              {lotName && (
                <>
                  <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate text-gray-600">{lotName}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-gray-500">Đề xuất đổi sang:</span>
              <span className="font-semibold text-amber-700">
                {proposedDateRaw || "—"}
              </span>
              {proposedShiftType && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {SHIFT_TYPE_LABELS[proposedShiftType] ?? proposedShiftType}
                </span>
              )}
            </div>
            {reason && (
              <div className="flex items-start gap-2 pt-1.5 border-t border-gray-200 mt-1.5 text-gray-600">
                <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="italic">{reason}</span>
              </div>
            )}
          </div>

          {/* Danh sách ca trên ngày đề xuất */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                Ca có sẵn vào{" "}
                <span className="text-emerald-700 capitalize">
                  {displayProposedDate}
                </span>
              </p>
              {loadingShifts && (
                <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />
              )}
            </div>

            {loadingShifts ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-gray-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : !hasShifts ? (
              <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-sm font-semibold text-amber-700">
                  Không có ca nào vào ngày này
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Khi bấm Xác nhận, ca hiện tại của nhân viên sẽ được
                  <br />
                  <span className="font-semibold">
                    chuyển sang ngày đề xuất
                  </span>
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {shiftsOnDate.map((s) => {
                  const id = String(
                    s.shiftId ??
                      s.ShiftId ??
                      s.workShiftId ??
                      s.WorkShiftId ??
                      s.id ??
                      "",
                  );
                  const type = (
                    s.shiftType ??
                    s.ShiftType ??
                    "MORNING"
                  ).toUpperCase();
                  const colors =
                    SHIFT_COLORS_MAP[type] ?? SHIFT_COLORS_MAP.MORNING;
                  const start = (s.startTime ?? "").slice(0, 5);
                  const end = (s.endTime ?? "").slice(0, 5);
                  const sName = s.staffName ?? s.StaffName ?? "Nhân viên";
                  const sLot = s._lotName ?? s.lotName ?? "";
                  const isSelected = selectedShiftId === id;

                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedShiftId(isSelected ? "" : id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? `${colors.bg} ${colors.border} ring-2 ${colors.ring}`
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {/* Dot màu loại ca */}
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSelected ? colors.dot : "bg-gray-300"}`}
                      />

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${isSelected ? colors.text : "text-gray-800"}`}
                        >
                          {sName}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                          {start && end && (
                            <span>
                              {start} – {end}
                            </span>
                          )}
                          {sLot && (
                            <>
                              <span className="text-gray-300">·</span>
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{sLot}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${isSelected ? `${colors.bg} ${colors.text}` : "bg-gray-100 text-gray-500"}`}
                      >
                        {SHIFT_TYPE_LABELS[type] ?? type}
                      </span>

                      {isSelected && (
                        <CheckCircle2
                          className={`w-4 h-4 flex-shrink-0 ${colors.text}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {hasShifts && !selectedShiftId && (
              <p className="text-[11px] text-gray-400 mt-1.5">
                Chọn ca để hoán đổi, hoặc bỏ qua để chỉ chuyển ngày ca của nhân
                viên.
              </p>
            )}
          </div>

          {/* Ghi chú */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Ghi chú gửi nhân viên
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Ghi chú cho nhân viên (không bắt buộc)..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
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
            disabled={loading || loadingShifts}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                {hasShifts && selectedShiftId
                  ? "Hoán đổi ca"
                  : "Xác nhận duyệt"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Card từng yêu cầu ── */
function RequestCard({ req, idx, parkingLots, cardState, onProcessed }) {
  const [localState, setLocalState] = useState(cardState ?? null); // null | "rejecting" | "approved" | "rejected"
  const [rejectNote, setRejectNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  const parsed = parseShiftChangeMessage(req.message ?? "");
  const staffName =
    parsed.staffName ?? req.staffName ?? req.fullName ?? "Nhân viên";
  const staffId = req.staffId ?? String(idx);
  const currentDate = parsed.currentShiftDate ?? "";
  const currentShiftType = parsed.currentShiftType ?? "Morning";
  const lotName = parsed.lotName ?? req.lotName ?? "";
  const proposedDate = parsed.proposedDate ?? "";
  const proposedShiftType = parsed.proposedShiftType ?? "";
  const additionalNote = parsed.note ?? parsed.reason ?? "";
  const notificationId = req.notificationId ?? req.id ?? req.notification?.id;

  const isProcessed = localState === "approved" || localState === "rejected";

  const handleReject = async () => {
    if (!notificationId) return;
    setLoading(true);
    try {
      await staffService.updateShiftChangeStatus(
        notificationId,
        "Rejected",
      );
      toast.success("Đã từ chối yêu cầu");
      setLocalState("rejected");
      onProcessed(notificationId, "rejected");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          err?.response?.data?.title ??
          err?.message ??
          "Có lỗi xảy ra",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSuccess = () => {
    setShowApproveModal(false);
    setLocalState("approved");
    onProcessed(notificationId, "approved");
  };

  return (
    <>
      <div
        className={`rounded-xl border overflow-hidden transition-all duration-200 ${
          localState === "approved"
            ? "border-emerald-200 bg-emerald-50/40"
            : localState === "rejected"
              ? "border-red-200 bg-red-50/30"
              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
        }`}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getAvatarColor(staffId)}`}
            >
              {getInitials(staffName)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{staffName}</p>
                {localState === "approved" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Đã duyệt
                  </span>
                )}
                {localState === "rejected" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                    <AlertCircle className="w-3 h-3" /> Đã từ chối
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <p className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>Ca hiện tại:</span>
                  <span className="font-medium">{currentDate || "—"}</span>
                  <span>·</span>
                  <span>
                    {SHIFT_TYPE_LABELS[currentShiftType] ?? currentShiftType}
                  </span>
                  {lotName && (
                    <>
                      <span>·</span>
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{lotName}</span>
                    </>
                  )}
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>Đề xuất đổi sang:</span>
                  <span className="font-medium">{proposedDate || "—"}</span>
                  {proposedShiftType && (
                    <>
                      <span>·</span>
                      <span>
                        {SHIFT_TYPE_LABELS[proposedShiftType] ??
                          proposedShiftType}
                      </span>
                    </>
                  )}
                </p>
                {additionalNote && (
                  <p className="flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="italic">{additionalNote}</span>
                  </p>
                )}
              </div>

              {/* Khu vực hành động — chỉ hiện khi chưa xử lý */}
              {!isProcessed && localState !== "rejecting" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" /> Duyệt
                  </button>
                  <button
                    onClick={() => setLocalState("rejecting")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Từ chối
                  </button>
                </div>
              )}

              {/* Inline từ chối */}
              {localState === "rejecting" && (
                <div className="mt-3 space-y-2">
                  <textarea
                    autoFocus
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Lý do từ chối (không bắt buộc)..."
                    rows={2}
                    className="w-full px-3 py-2 border border-red-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-300 resize-none bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Xác nhận từ chối
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setLocalState(null);
                        setRejectNote("");
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showApproveModal && (
        <ApproveModal
          request={req}
          parkingLots={parkingLots}
          onClose={() => setShowApproveModal(false)}
          onSuccess={handleApproveSuccess}
        />
      )}
    </>
  );
}

/* ── Filter tabs ── */
const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ xử lý" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Đã từ chối" },
];

/* ── Modal chính ── */
function PendingShiftChangeRequestsModal({ parkingLots, onClose, onSuccess }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardStates, setCardStates] = useState({}); // { [id]: "approved" | "rejected" }
  const [activeFilter, setActiveFilter] = useState("all");

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await workShiftService.getPendingShiftChangeRequests();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.data?.items)
              ? data.data.items
              : [];
      setRequests(arr);
      setCardStates({});
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          err?.response?.data?.title ??
          err?.message ??
          "Không tải được danh sách yêu cầu",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleProcessed = (id, status) => {
    setCardStates((prev) => ({ ...prev, [id]: status }));
    onSuccess?.();
  };

  const getReqId = (req) => req.notificationId ?? req.id;

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => !cardStates[getReqId(r)]).length,
    approved: requests.filter((r) => cardStates[getReqId(r)] === "approved")
      .length,
    rejected: requests.filter((r) => cardStates[getReqId(r)] === "rejected")
      .length,
  };

  const filteredRequests = requests.filter((req) => {
    const state = cardStates[getReqId(req)];
    if (activeFilter === "pending") return !state;
    if (activeFilter === "approved") return state === "approved";
    if (activeFilter === "rejected") return state === "rejected";
    return true;
  });

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Yêu cầu đổi ca chờ xử lý
              {counts.pending > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {counts.pending}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500">
              Duyệt hoặc từ chối yêu cầu đổi lịch từ nhân viên
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={loadPending}
              title="Tải lại"
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        {!loading && requests.length > 0 && (
          <div className="px-5 pt-3 pb-0 flex items-center gap-1 border-b border-gray-100">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                  activeFilter === tab.key
                    ? "border-amber-500 text-amber-700 bg-amber-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                      activeFilter === tab.key
                        ? "bg-amber-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Đang tải...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-gray-200 mb-3" />
              <p className="font-medium text-gray-600">
                Không có yêu cầu chờ xử lý
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Tất cả yêu cầu đã được xử lý
              </p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="w-10 h-10 text-gray-200 mb-3" />
              <p className="font-medium text-gray-500">
                Không có yêu cầu nào trong mục này
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req, idx) => (
                <RequestCard
                  key={req.notificationId ?? req.id ?? idx}
                  req={req}
                  idx={idx}
                  parkingLots={parkingLots}
                  cardState={cardStates[getReqId(req)] ?? null}
                  onProcessed={handleProcessed}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default PendingShiftChangeRequestsModal;
