import {
  RECOGNITION_TYPE_BADGE_CLASSES,
  RECOGNITION_TYPE_LABELS,
} from "./recognitionLogsConstants";

function toNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function isLikelyDurationMs(value) {
  if (!Number.isFinite(value) || value < 0) return false;
  // Duration above one day is likely not a processing duration.
  return value <= 24 * 60 * 60 * 1000;
}

export function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function parseResultData(rawValue) {
  if (!rawValue) return null;
  if (typeof rawValue === "object") return rawValue;
  if (typeof rawValue !== "string") return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

export function getRecognitionTypeLabel(type) {
  return RECOGNITION_TYPE_LABELS[type] ?? type ?? "";
}

export function getRecognitionTypeBadgeClass(type) {
  return (
    RECOGNITION_TYPE_BADGE_CLASSES[type] ??
    "bg-gray-100 text-gray-700 border border-gray-200"
  );
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatConfidence(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";

  if (n <= 1) return `${(n * 100).toFixed(2)}%`;
  return `${n.toFixed(2)}%`;
}

export function resolveProcessingTimeMs(processingTimeMs, resultData) {
  const direct = toNumber(processingTimeMs);
  if (direct != null && isLikelyDurationMs(direct)) return direct;

  const parsed = parseResultData(resultData);
  const fallback = toNumber(parsed?.processingTimeMs);
  if (fallback != null && isLikelyDurationMs(fallback)) return fallback;

  return null;
}

export function formatProcessingTime(processingTimeMs, resultData) {
  const value = resolveProcessingTimeMs(processingTimeMs, resultData);
  if (value == null) return "";
  return `${Math.round(value).toLocaleString("vi-VN")} ms`;
}

export function buildLotOptions(parkingLots = [], logs = []) {
  const map = new Map();

  for (const lot of parkingLots) {
    const id = String(lot?.id ?? lot?.lotId ?? "").trim();
    const name = String(lot?.name ?? lot?.lotName ?? "").trim();
    if (!id) continue;
    map.set(id, name || id);
  }

  for (const item of logs) {
    const id = String(item?.lotId ?? "").trim();
    const name = String(item?.lotName ?? "").trim();
    if (!id) continue;
    if (!map.has(id)) map.set(id, name || id);
  }

  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
}

export function calculateRecognitionStats(items = [], totalItems = 0) {
  let faceCheckIn = 0;
  let faceCheckOut = 0;
  let plateCheckIn = 0;
  let plateCheckOut = 0;

  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const item of items) {
    const type = String(item?.recognitionType ?? "");
    if (type === "FaceCheckIn") faceCheckIn += 1;
    if (type === "FaceCheckOut") faceCheckOut += 1;
    if (type === "PlateCheckIn") plateCheckIn += 1;
    if (type === "PlateCheckOut") plateCheckOut += 1;

    const confidence = Number(item?.confidenceScore);
    if (Number.isFinite(confidence)) {
      confidenceSum += confidence <= 1 ? confidence * 100 : confidence;
      confidenceCount += 1;
    }
  }

  return {
    totalItems,
    currentPageItems: items.length,
    avgConfidence: confidenceCount > 0 ? confidenceSum / confidenceCount : 0,
    faceCheckIn,
    faceCheckOut,
    plateCheckIn,
    plateCheckOut,
  };
}
