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

export function formatVnd(value) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return `${amount.toLocaleString("vi-VN")} VNĐ`;
}

export function paymentTypeLabel(value) {
  const key = normalizeKey(value);
  if (key === "parkingovertime") return "Thanh toán phí phát sinh";
  if (key === "parkingprepayment") return "Thanh toán trước";
  if (!key) return "Không xác định";
  return String(value);
}

export function formatDateTime(value, addSevenHours = false) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  const adjusted = addSevenHours
    ? new Date(parsed.getTime() + 7 * 60 * 60 * 1000)
    : parsed;

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
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  if (amount <= 0) return "0 giờ";
  return `${amount.toFixed(2)} giờ`;
}

export function sessionStatusLabel(value) {
  const key = normalizeKey(value);
  if (key === "active") return "Đang trong bãi";
  if (key === "completed") return "Đã hoàn tất";
  if (key === "cancel" || key === "cancelled") return "Đã hủy";
  if (key === "prepaid") return "Đã trả trước";
  return value || "Không xác định";
}

export function sessionStatusBadgeVariant(value) {
  const key = normalizeKey(value);
  if (key === "active") return "warning";
  if (key === "completed") return "success";
  if (key === "cancel" || key === "cancelled") return "destructive";
  return "secondary";
}

export function paymentStatusLabel(value) {
  const key = normalizeKey(value);
  if (key === "pending") return "Chờ thanh toán";
  if (key === "completed" || key === "paid") return "Đã thanh toán";
  if (key === "overtimepaid") {
    return "Đã thanh toán quá giờ";
  }
  if (key === "failed") return "Thanh toán thất bại";
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
  const merged = {
    ...root,
    ...data,
  };

  const lotName =
    merged.lotName ?? merged.parkingLotName ?? merged.lot?.name ?? "";
  const sessionStatus =
    merged.sessionStatus ?? merged.status ?? merged.session_state ?? "";
  const paymentStatus =
    merged.paymentStatus ??
    merged.payment?.status ??
    merged.statusPayment ??
    "";

  return {
    sessionId: merged.sessionId ?? merged.parkingSessionId ?? merged.id ?? "",
    lotId: merged.lotId ?? merged.parkingLotId ?? "",
    licensePlate: String(merged.licensePlate ?? "").trim(),
    lotName: String(lotName ?? "").trim(),
    checkInTime:
      merged.checkInTime ??
      merged.entryTime ??
      merged.startTime ??
      merged.createdAt ??
      null,
    checkOutTime: merged.checkOutTime ?? merged.exitTime ?? null,
    expectedCheckoutTime:
      merged.expectedCheckoutTime ?? merged.plannedCheckoutTime ?? null,
    sessionStatus: String(sessionStatus ?? "").trim(),
    paymentStatus: String(paymentStatus ?? "").trim(),
    paymentMethod: String(merged.paymentMethod ?? "").trim(),
    totalHours: parseNumberOrNull(merged.totalHours ?? merged.durationHours),
    hourlyRate: parseNumberOrNull(merged.hourlyRate ?? merged.ratePerHour),
    overtimeHours: parseNumberOrNull(merged.overtimeHours),
    overtimeAmount: parseNumberOrNull(merged.overtimeAmount),
    isOvertime: parseBool(merged.isOvertime),
    totalAmount: parseNumberOrNull(
      merged.totalAmount ?? merged.remainingAmount ?? merged.estimatedFee,
    ),
    remainingAmount: parseNumberOrNull(
      merged.remainingAmount ?? merged.totalAmount,
    ),
    orderCode: String(merged.orderCode ?? "").trim(),
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
