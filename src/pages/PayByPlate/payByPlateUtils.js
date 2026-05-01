function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function parseBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return Boolean(value);
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Gộp object gốc với `session` / `parkingSession` nếu BE trả lồng nhau */
function flattenSessionPayload(merged) {
  const nested =
    merged.session ??
    merged.parkingSession ??
    merged.Session ??
    merged.ParkingSession;
  if (nested && typeof nested === "object") {
    return { ...merged, ...nested };
  }
  return merged;
}

/** Suy tổng giờ khi API không gửi totalHours (ví dụ chỉ có mốc thời gian) */
function inferTotalHoursFromTimes(src) {
  const start =
    src.checkInTime ??
    src.entryTime ??
    src.startTime ??
    src.CheckInTime ??
    src.EntryTime;
  if (!start) return null;
  const t0 = new Date(start).getTime();
  if (Number.isNaN(t0)) return null;
  const end =
    src.checkOutTime ??
    src.exitTime ??
    src.CheckOutTime ??
    src.ExitTime ??
    src.expectedCheckoutTime ??
    src.ExpectedCheckoutTime ??
    src.plannedCheckoutTime;
  const t1 = end != null && end !== "" ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(t1) || t1 < t0) return null;
  return (t1 - t0) / 3600000;
}

export function formatVnd(value) {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "";
  return `${amount.toLocaleString("vi-VN")} VNĐ`;
}

export function paymentTypeLabel(value) {
  const key = normalizeKey(value);
  if (key === "parkingovertime") return "Thanh toán quá giờ";
  if (key === "parkingprepayment") return "Thanh toán trước";
  if (key === "parkingcheckout") return "Thanh toán khi ra bãi";
  if (key === "parkingsession") return "Phí gửi xe";
  if (!key) return "Không xác định";
  return String(value);
}

export function formatDateTime(value, offsetHoursOrLegacy = 0) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  // Backward compatible:
  // - `true`  => +7h (legacy behavior)
  // - `false` => 0h
  // - number  => offset hours (can be negative)
  const offsetHours =
    typeof offsetHoursOrLegacy === "number"
      ? offsetHoursOrLegacy
      : offsetHoursOrLegacy
        ? 7
        : 0;

  const adjusted =
    offsetHours === 0
      ? parsed
      : new Date(parsed.getTime() + offsetHours * 60 * 60 * 1000);

  return adjusted.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatHours(value) {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "";
  if (amount === 0) return "0 giờ";
  if (amount < 0) return "0 giờ";
  /* Giá trị rất nhỏ (< 1 phút) vẫn hiển thị, tránh nhầm với “trống” */
  if (amount > 0 && amount < 1 / 60) {
    return "< 1 phút";
  }
  if (amount < 1) {
    const mins = Math.round(amount * 60);
    return `${mins} phút`;
  }
  return `${amount.toFixed(2)} giờ`;
}

/** Trạng thái phiên tương ứng nhãn "Hoàn thành" — không còn thanh toán thêm */
export function isSessionCompleted(value) {
  const key = normalizeKey(value);
  return (
    key === "completed" ||
    key === "paid" ||
    key === "prepaid" ||
    key === "overtimepaid" ||
    key === "overtime"
  );
}

export function sessionStatusLabel(value) {
  const key = normalizeKey(value);
  if (key === "active" || key === "inprogress") return "Đang trong bãi";
  if (key === "completed" || key === "paid") return "Hoàn thành";
  if (key === "cancel" || key === "cancelled" || key === "canceled") {
    return "Đã hủy";
  }
  if (key === "prepaid") return "Thanh toán trước";
  if (key === "overtimepaid" || key === "overtime") {
    return "Thanh toán quá giờ";
  }
  if (key === "pending") return "Chờ thanh toán";
  if (key === "failed") return "Thất bại";
  return value || "Không xác định";
}

export function sessionStatusBadgeVariant(value) {
  const key = normalizeKey(value);
  if (key === "active" || key === "inprogress") return "warning";
  if (key === "completed" || key === "paid") return "success";
  if (key === "prepaid") return "secondary";
  if (key === "overtimepaid" || key === "overtime") return "secondary";
  if (
    key === "cancel" ||
    key === "cancelled" ||
    key === "canceled" ||
    key === "failed"
  ) {
    return "destructive";
  }
  if (key === "pending") return "warning";
  return "secondary";
}

export function sessionStatusBadgeClass(value) {
  const key = normalizeKey(value);
  if (key === "active" || key === "inprogress") {
    return "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200";
  }
  if (key === "prepaid") {
    return "border-transparent bg-cyan-100 text-cyan-700 hover:bg-cyan-200";
  }
  if (key === "overtimepaid" || key === "overtime") {
    return "border-transparent bg-purple-100 text-purple-700 hover:bg-purple-200";
  }
  if (key === "pending") {
    return "border-transparent bg-yellow-100 text-yellow-700 hover:bg-yellow-200";
  }
  if (
    key === "failed" ||
    key === "cancel" ||
    key === "cancelled" ||
    key === "canceled"
  ) {
    return "border-transparent bg-red-100 text-red-700 hover:bg-red-200";
  }
  return "";
}

export function paymentStatusLabel(value, sessionStatus) {
  const key = normalizeKey(value);
  if (key === "pending") return "Chờ thanh toán";
  if (key === "completed" || key === "paid") return "Đã thanh toán";
  if (key === "overtimepaid") {
    return "Thanh toán quá giờ";
  }
  if (key === "failed") return "Thanh toán thất bại";
  if (key === "cancel" || key === "cancelled" || key === "canceled") {
    return "Đã hủy";
  }
  if (key === "prepaid") return "Thanh toán trước";

  /* Phiên đang trong bãi mà chưa có trạng thái thanh toán → "Chưa thanh toán" */
  const sessionKey = normalizeKey(sessionStatus);
  if (!key && (sessionKey === "active" || sessionKey === "inprogress")) {
    return "Chưa thanh toán";
  }

  return value || "Không xác định";
}

export function normalizeResponse(raw) {
  const root = raw?.data ?? raw ?? {};
  const data = root?.data ?? {};
  const merged = {
    ...root,
    ...data,
  };

  return {
    hasAdditionalFee: parseBool(
      merged.hasAdditionalFee ?? merged.isAdditionalFee,
    ),
    paymentType: merged.paymentType ?? "",
    totalAmount: parseNumber(merged.totalAmount),
    paymentUrl: String(merged.paymentUrl ?? "").trim(),
    message: String(merged.message ?? root?.message ?? "").trim(),
    paidWithWallet: parseNumber(merged.paidWithWallet),
    paidWithPoints: parseNumber(merged.paidWithPoints),
    raw: merged,
  };
}

export function normalizePreviewResponse(raw) {
  const root = raw?.data ?? raw ?? {};
  const data = root?.data ?? {};
  const merged = flattenSessionPayload({
    ...root,
    ...data,
  });

  const lotName =
    merged.lotName ??
    merged.parkingLotName ??
    merged.LotName ??
    merged.lot?.name ??
    "";
  const sessionStatus =
    merged.sessionStatus ??
    merged.status ??
    merged.session_state ??
    merged.SessionStatus ??
    "";
  const paymentStatus =
    merged.paymentStatus ??
    merged.payment?.status ??
    merged.statusPayment ??
    merged.PaymentStatus ??
    "";

  let totalHours = parseNumberOrNull(
    merged.totalHours ??
      merged.TotalHours ??
      merged.durationHours ??
      merged.DurationHours ??
      merged.duration_hours,
  );
  if (totalHours === null || totalHours === undefined) {
    const inferred = inferTotalHoursFromTimes(merged);
    if (inferred != null) totalHours = inferred;
  }

  const hourlyRate = parseNumberOrNull(
    merged.hourlyRate ??
      merged.HourlyRate ??
      merged.ratePerHour ??
      merged.RatePerHour,
  );

  const totalAmount = parseNumberOrNull(
    merged.totalAmount ??
      merged.TotalAmount ??
      merged.remainingAmount ??
      merged.RemainingAmount ??
      merged.estimatedFee ??
      merged.EstimatedFee ??
      merged.estimatedAmount ??
      merged.EstimatedAmount,
  );

  let remainingAmount = parseNumberOrNull(
    merged.remainingAmount ?? merged.RemainingAmount,
  );
  if (remainingAmount === null || remainingAmount === undefined) {
    remainingAmount = parseNumberOrNull(
      merged.totalAmount ??
        merged.TotalAmount ??
        merged.amountDue ??
        merged.AmountDue ??
        merged.pendingAmount ??
        merged.PendingAmount ??
        merged.estimatedFee ??
        merged.EstimatedFee,
    );
  }

  return {
    sessionId:
      merged.sessionId ??
      merged.parkingSessionId ??
      merged.SessionId ??
      merged.id ??
      "",
    lotId: merged.lotId ?? merged.parkingLotId ?? merged.LotId ?? "",
    licensePlate: String(
      merged.licensePlate ?? merged.LicensePlate ?? "",
    ).trim(),
    lotName: String(lotName ?? "").trim(),
    checkInTime:
      merged.checkInTime ??
      merged.entryTime ??
      merged.startTime ??
      merged.createdAt ??
      merged.CheckInTime ??
      merged.EntryTime ??
      null,
    checkOutTime:
      merged.checkOutTime ??
      merged.exitTime ??
      merged.CheckOutTime ??
      merged.ExitTime ??
      null,
    expectedCheckoutTime:
      merged.expectedCheckoutTime ??
      merged.plannedCheckoutTime ??
      merged.ExpectedCheckoutTime ??
      null,
    sessionStatus: String(sessionStatus ?? "").trim(),
    paymentStatus: String(paymentStatus ?? "").trim(),
    paymentMethod: String(
      merged.paymentMethod ?? merged.PaymentMethod ?? "",
    ).trim(),
    totalHours,
    hourlyRate,
    overtimeHours: parseNumberOrNull(
      merged.overtimeHours ?? merged.OvertimeHours,
    ),
    overtimeAmount: parseNumberOrNull(
      merged.overtimeAmount ?? merged.OvertimeAmount,
    ),
    isOvertime: parseBool(merged.isOvertime ?? merged.IsOvertime),
    totalAmount,
    remainingAmount,
    orderCode: String(merged.orderCode ?? merged.OrderCode ?? "").trim(),
    paymentUrl: String(merged.paymentUrl ?? merged.PaymentUrl ?? "").trim(),
    paymentType: String(merged.paymentType ?? merged.PaymentType ?? "").trim(),
    message: String(merged.message ?? root?.message ?? "").trim(),
    raw: merged,
  };
}

export function mergePreviewData(baseData, detailData) {
  const merged = { ...baseData };
  for (const [key, value] of Object.entries(detailData)) {
    const isUsefulString = typeof value === "string" && value.trim() !== "";
    const isUsefulNumber =
      typeof value === "number" && !Number.isNaN(value) && value !== null;
    const isUsefulBoolean = typeof value === "boolean";
    const isUsefulObject =
      value && typeof value === "object" && Object.keys(value).length > 0;

    if (isUsefulString || isUsefulNumber || isUsefulBoolean || isUsefulObject) {
      merged[key] = value;
    }
  }
  return merged;
}

export { normalizeKey };
