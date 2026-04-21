/**
 * Cộng dồn doanh thu ròng từ payment breakdown — cùng quy tắc với trang Giao dịch.
 */

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function isSuccessfulPaymentStatus(value) {
  const normalized = normalizeStatus(value);
  return (
    normalized === "completed" ||
    normalized === "overtimepaid" ||
    normalized === "prepaid"
  );
}

function isFailedPaymentStatus(value) {
  return normalizeStatus(value) === "failed";
}

function getPaymentStatusValue(item) {
  if (!item || typeof item !== "object") return "";
  return normalizeStatus(
    item.paymentStatus ??
      item.payment_status ??
      item.status ??
      item.paymentState ??
      item.payment_state ??
      item.state ??
      item.PaymentStatus ??
      item.Status,
  );
}

function normalizeTargetTypeParam(type) {
  if (!type) return "";
  const normalized = String(type).trim().toLowerCase();
  if (["parking", "parking_session", "parkingsession"].includes(normalized)) {
    return "parking-session";
  }
  if (["monthly", "monthly_pass", "monthlypass"].includes(normalized)) {
    return "monthly-pass";
  }
  if (["wallet", "wallet_deposit", "walletdeposit"].includes(normalized)) {
    return "wallet-deposit";
  }
  if (["wallet_withdraw", "walletwithdraw"].includes(normalized)) {
    return "wallet-withdraw";
  }
  return normalized;
}

function getTargetTypeValue(item) {
  if (!item || typeof item !== "object") return undefined;
  return normalizeTargetTypeParam(
    pickFirst(item.targetType, item.referenceType, item.entityType),
  );
}

function getCashAmount(item) {
  return Number(
    pickFirst(
      item?.cashAmount,
      item?.amount,
      item?.totalAmount,
      item?.paidAmount,
      0,
    ),
  );
}

function getCashflowDirection(targetType) {
  const normalized = normalizeTargetTypeParam(targetType);
  if (normalized === "wallet-withdraw") return "out";
  if (
    ["parking-session", "monthly-pass", "wallet-deposit"].includes(normalized)
  ) {
    return "in";
  }
  return "neutral";
}

function getSignedComponentCashAmount(component, targetType) {
  if (!component || typeof component !== "object") return 0;

  const amount = Math.abs(getCashAmount(component));
  const status = getPaymentStatusValue(component);

  if (isFailedPaymentStatus(status)) return -amount;

  if (isSuccessfulPaymentStatus(status)) {
    const direction = getCashflowDirection(targetType);
    if (direction === "out") return -amount;
    if (direction === "in") return amount;
  }

  return 0;
}

function getNetCashAmountWithFailed(item, fallbackTargetType) {
  if (!item || typeof item !== "object") return 0;

  const resolvedTargetType =
    getTargetTypeValue(item) ?? normalizeTargetTypeParam(fallbackTargetType);

  if (Array.isArray(item.components) && item.components.length) {
    return item.components.reduce(
      (sum, component) =>
        sum + getSignedComponentCashAmount(component, resolvedTargetType),
      0,
    );
  }

  const amount = Math.abs(getCashAmount(item));
  const status = getPaymentStatusValue(item);

  if (isFailedPaymentStatus(status)) return -amount;

  if (isSuccessfulPaymentStatus(status)) {
    const direction = getCashflowDirection(resolvedTargetType);
    if (direction === "out") return -amount;
    if (direction === "in") return amount;
  }

  return 0;
}

export function extractPaymentBreakdownItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

/** Tham số ngày đơn theo giờ local, giống trang Giao dịch (YYYY-MM-DDTHH:mm). */
export function toApiDateTimeRangeForLocalDay(date = new Date()) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const da = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${mo}-${da}`;
  return { fromDate: `${dateStr}T00:00`, toDate: `${dateStr}T23:59` };
}

export function sumPaymentBreakdownNetRevenue(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce(
    (sum, tx) => sum + getNetCashAmountWithFailed(tx, getTargetTypeValue(tx)),
    0,
  );
}

function parseBackendDateToMs(value) {
  if (!value) return NaN;
  const raw = String(value).trim();
  if (!raw) return NaN;

  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const matched = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/,
  );

  let date;
  if (hasTimezone) {
    date = new Date(raw);
  } else if (matched) {
    const [, year, month, day, hour, minute, second = "00"] = matched;
    date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ),
    );
  } else {
    date = new Date(raw);
  }

  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

/** Lọc theo createdAt trong [startMs, endMs] — dự phòng khi API chưa lọc đúng ngày. */
export function filterItemsCreatedBetweenMs(items, startMs, endMs) {
  return items.filter((tx) => {
    const ms = parseBackendDateToMs(tx.createdAt);
    return Number.isFinite(ms) && ms >= startMs && ms <= endMs;
  });
}
