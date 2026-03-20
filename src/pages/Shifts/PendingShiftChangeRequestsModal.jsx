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

/* ── Modal phụ khi Duyệt (cần chọn ca mới) ── */
function ApproveModal({
  request,
  parkingLots,
  availableShifts,
  onClose,
  onSuccess,
}) {
  const [newShiftId, setNewShiftId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(false);

  const notificationId =
    request?.notificationId ?? request?.id ?? request?.notification?.id;
  const parsed = parseShiftChangeMessage(request?.message ?? "");
  const staffName =
    parsed.staffName ??
    request?.staffName ??
    request?.staff?.fullName ??
    "Nhân viên";
  const proposedDate = parsed.proposedDate ?? request?.proposedDate ?? "";
  const proposedShiftType =
    parsed.proposedShiftType ?? request?.proposedShiftType ?? "";

  const handleSubmit = async () => {
    if (!notificationId) return;
    setLoading(true);
    try {
      await workShiftService.processShiftChangeRequest({
        notificationId,
        decision: "Approved",
        newShiftId: newShiftId || undefined,
        adminNote: adminNote.trim() || undefined,
      });
      toast.success("Đã duyệt yêu cầu đổi ca");
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

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Duyệt yêu cầu đổi ca
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{staffName}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Chọn ca mới để đổi
            </label>
            <select
              value={newShiftId}
              onChange={(e) => setNewShiftId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">-- Chọn ca (tùy chọn) --</option>
              {(availableShifts ?? []).map((s) => {
                const id = s.shiftId ?? s.ShiftId ?? s.id;
                const date = (s.shiftDate ?? s.workDate ?? "").split("T")[0];
                const type = s.shiftType ?? s.ShiftType ?? "Morning";
                const lot = parkingLots?.find(
                  (l) => (l.id ?? l.lotId) === (s.lotId ?? s.LotId),
                );
                const lotName = lot?.name ?? lot?.lotName ?? s.lotName ?? "";
                return (
                  <option key={id} value={id}>
                    {date} · {SHIFT_TYPE_LABELS[type] ?? type} · {lotName}
                  </option>
                );
              })}
            </select>
            {(proposedDate || proposedShiftType) && (
              <p className="text-xs text-gray-500 mt-1">
                Nhân viên đề xuất:{" "}
                <span className="font-medium">{proposedDate}</span>{" "}
                {SHIFT_TYPE_LABELS[proposedShiftType] ?? proposedShiftType}
              </p>
            )}
          </div>

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

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 bg-white rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" /> Xác nhận duyệt
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
function RequestCard({
  req,
  idx,
  parkingLots,
  availableShifts,
  cardState,
  onProcessed,
}) {
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
      await workShiftService.processShiftChangeRequest({
        notificationId,
        decision: "Rejected",
        adminNote: rejectNote.trim() || undefined,
      });
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
          availableShifts={availableShifts}
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
  const [availableShifts, setAvailableShifts] = useState([]);
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

  // Load available shifts for approve modal
  useEffect(() => {
    if (requests.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const lots = parkingLots ?? [];
        const allRaw = [];
        for (const lot of lots) {
          const id = lot.id ?? lot.lotId;
          if (!id) continue;
          const data = await workShiftService.getByLot(id, {});
          const arr = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : (data?.items ?? []);
          allRaw.push(...arr);
        }
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const slotKey = (s) => {
          const date = (s.shiftDate ?? s.workDate ?? "").split("T")[0];
          const lotId = s.lotId ?? s.LotId ?? "";
          const type = s.shiftType ?? s.ShiftType ?? "Morning";
          return `${lotId}|${date}|${type}`;
        };
        const countBySlot = {};
        for (const s of allRaw) {
          const date = (s.shiftDate ?? s.workDate ?? "").split("T")[0];
          if (!date || new Date(date + "T00:00:00") < tomorrow) continue;
          const key = slotKey(s);
          if (!countBySlot[key]) countBySlot[key] = { count: 0, shift: s };
          countBySlot[key].count += 1;
        }
        const available = Object.values(countBySlot)
          .filter((x) => x.count < 4)
          .map((x) => x.shift);
        if (!cancelled) setAvailableShifts(available);
      } catch {
        if (!cancelled) setAvailableShifts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requests, parkingLots]);

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
                  availableShifts={availableShifts}
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
