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
} from "lucide-react";
import toast from "react-hot-toast";
import workShiftService from "../../services/workShiftService";

const SHIFT_TYPE_LABELS = {
  Morning: "Ca sáng",
  Afternoon: "Ca chiều",
  Night: "Ca đêm",
  FullDay: "Cả ngày",
};

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

function ProcessRequestModal({
  request,
  parkingLots,
  availableShifts,
  onClose,
  onSuccess,
}) {
  const [decision, setDecision] = useState(null);
  const [newShiftId, setNewShiftId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(false);

  const notificationId =
    request?.notificationId ?? request?.id ?? request?.notification?.id;

  const handleSubmit = async () => {
    if (!decision || !notificationId) return;
    setLoading(true);
    try {
      await workShiftService.processShiftChangeRequest({
        notificationId,
        decision,
        newShiftId: decision === "Approved" ? newShiftId || undefined : undefined,
        adminNote: adminNote.trim() || undefined,
      });
      toast.success(
        decision === "Approved" ? "Đã duyệt yêu cầu đổi ca" : "Đã từ chối yêu cầu"
      );
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

  const staffName =
    request?.staffName ??
    request?.staff?.fullName ??
    request?.staff?.name ??
    "Nhân viên";
  const proposedDate = request?.proposedDate ?? request?.proposedShiftDate ?? "";
  const proposedShiftType =
    request?.proposedShiftType ?? request?.proposedShift ?? "Morning";

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">
            Xử lý yêu cầu đổi ca
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{staffName}</p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">
              Quyết định
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDecision("Approved")}
                className={`flex-1 py-2.5 rounded-xl border-2 font-medium flex items-center justify-center gap-2 transition-all ${
                  decision === "Approved"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 hover:border-emerald-300 text-gray-600"
                }`}
              >
                <Check className="w-4 h-4" /> Duyệt
              </button>
              <button
                onClick={() => setDecision("Rejected")}
                className={`flex-1 py-2.5 rounded-xl border-2 font-medium flex items-center justify-center gap-2 transition-all ${
                  decision === "Rejected"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-gray-200 hover:border-red-300 text-gray-600"
                }`}
              >
                <XCircle className="w-4 h-4" /> Từ chối
              </button>
            </div>
          </div>

          {decision === "Approved" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Chọn ca mới để đổi
              </label>
              <select
                value={newShiftId}
                onChange={(e) => setNewShiftId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Chọn ca --</option>
                {(availableShifts ?? []).map((s) => {
                  const id = s.shiftId ?? s.ShiftId ?? s.id;
                  const date = (s.shiftDate ?? s.workDate ?? "").split("T")[0];
                  const type = s.shiftType ?? s.ShiftType ?? "Morning";
                  const lot = parkingLots?.find(
                    (l) => (l.id ?? l.lotId) === (s.lotId ?? s.LotId)
                  );
                  const lotName = lot?.name ?? lot?.lotName ?? s.lotName ?? "";
                  return (
                    <option key={id} value={id}>
                      {date} · {SHIFT_TYPE_LABELS[type] ?? type} · {lotName}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Nhân viên đề xuất: {proposedDate}{" "}
                {SHIFT_TYPE_LABELS[proposedShiftType] ?? proposedShiftType}
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              Ghi chú (gửi cho nhân viên)
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder={
                decision === "Rejected"
                  ? "Lý do từ chối..."
                  : "Ghi chú cho nhân viên..."
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
            disabled={loading || !decision}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 ${
              decision === "Rejected"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {decision === "Approved" ? (
                  <><Check className="w-4 h-4" /> Duyệt</>
                ) : (
                  <><XCircle className="w-4 h-4" /> Từ chối</>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PendingShiftChangeRequestsModal({
  parkingLots,
  onClose,
  onSuccess,
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [availableShifts, setAvailableShifts] = useState([]);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await workShiftService.getPendingShiftChangeRequests();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : data?.data ?? [];
      setRequests(arr);
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.title ??
        err?.message ??
        "Không tải được danh sách yêu cầu";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  useEffect(() => {
    if (!processingRequest) return;
    let cancelled = false;
    (async () => {
      try {
        const lots = parkingLots ?? [];
        const allRaw = [];
        for (const lot of lots) {
          const id = lot.id ?? lot.lotId;
          if (!id) continue;
          const data = await workShiftService.getByLot(id, { pageSize: 9999 });
          const arr = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : data?.items ?? [];
          allRaw.push(...arr);
        }
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // Group by (lotId, date, shiftType) to count staff per slot; keep slots with < 4
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
  }, [processingRequest, parkingLots]);

  const handleProcessSuccess = () => {
    setProcessingRequest(null);
    loadPending();
    onSuccess?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Yêu cầu đổi ca chờ xử lý
            </h2>
            <p className="text-sm text-gray-500">
              Duyệt hoặc từ chối yêu cầu đổi lịch từ nhân viên
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Đang tải...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-12 h-12 text-gray-300 mb-3" />
              <p className="font-medium text-gray-600">Không có yêu cầu chờ xử lý</p>
              <p className="text-sm text-gray-400 mt-1">
                Các yêu cầu đổi ca từ nhân viên sẽ hiển thị tại đây
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req, idx) => {
                const staffName =
                  req.staffName ??
                  req.staff?.fullName ??
                  req.staff?.name ??
                  "Nhân viên";
                const staffId = req.staffId ?? req.staff?.staffId ?? req.staff?.id ?? idx;
                const currentDate =
                  (req.currentShiftDate ?? req.shiftDate ?? req.workDate ?? "").split(
                    "T"
                  )[0];
                const currentShiftType =
                  req.currentShiftType ?? req.shiftType ?? "Morning";
                const lotName =
                  req.lotName ??
                  req.parkingLotName ??
                  parkingLots?.find(
                    (l) =>
                      (l.id ?? l.lotId) === (req.lotId ?? req.LotId)
                  )?.name ??
                  "";
                const proposedDate =
                  req.proposedDate ?? req.proposedShiftDate ?? "";
                const proposedShiftType =
                  req.proposedShiftType ?? req.proposedShift ?? "Morning";
                const additionalNote =
                  req.additionalNote ?? req.note ?? req.reason ?? "";

                return (
                  <div
                    key={req.notificationId ?? req.id ?? idx}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${getAvatarColor(staffId)}`}
                      >
                        {getInitials(staffName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{staffName}</p>
                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                          <p className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>Ca hiện tại:</span>{" "}
                            {currentDate
                              ? new Date(
                                  currentDate + "T00:00:00"
                                ).toLocaleDateString("vi-VN")
                              : "—"}{" "}
                            · {SHIFT_TYPE_LABELS[currentShiftType] ?? currentShiftType}
                            {lotName && (
                              <>
                                {" "}
                                · <MapPin className="w-3 h-3 inline" /> {lotName}
                              </>
                            )}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Đề xuất đổi sang:</span>{" "}
                            {proposedDate
                              ? new Date(
                                  proposedDate + "T00:00:00"
                                ).toLocaleDateString("vi-VN")
                              : "—"}{" "}
                            · {SHIFT_TYPE_LABELS[proposedShiftType] ?? proposedShiftType}
                          </p>
                          {additionalNote && (
                            <p className="flex items-start gap-1.5 mt-1">
                              <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                              <span>{additionalNote}</span>
                            </p>
                          )}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setProcessingRequest(req)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Xử lý
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {processingRequest && (
        <ProcessRequestModal
          request={processingRequest}
          parkingLots={parkingLots}
          availableShifts={availableShifts}
          onClose={() => setProcessingRequest(null)}
          onSuccess={handleProcessSuccess}
        />
      )}
    </div>,
    document.body
  );
}

export default PendingShiftChangeRequestsModal;
