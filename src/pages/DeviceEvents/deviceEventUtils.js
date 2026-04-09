export function labelFromMap(map, key, fallback) {
  const k = String(key ?? "")
    .trim()
    .toLowerCase();
  if (!k || k === "—") return fallback;
  return map[k] ?? fallback;
}

export function normStatus(status) {
  return String(status ?? "")
    .trim()
    .toLowerCase();
}

/** EventStatus API: còn mở / đang xử lý (thống kê «Hoạt động»). */
export function isActiveOperationalStatus(status) {
  const s = normStatus(status);
  if (!s || s === "—") return false;
  return [
    "active",
    "processing",
    "pending",
    "online",
    "running",
    "enabled",
    "ok",
  ].includes(s);
}

/** EventStatus API: đã kết thúc / đóng (thống kê «Ngừng hoạt động»). */
export function isInactiveOperationalStatus(status) {
  const s = normStatus(status);
  if (!s || s === "—") return false;
  return [
    "resolved",
    "ignored",
    "success",
    "failed",
    "acknowledged",
    "inactive",
    "offline",
    "stopped",
    "disabled",
    "disconnected",
    "deactivated",
    "down",
    "cancelled",
    "expired",
  ].includes(s);
}

/** Mức hiển thị (màu / icon) theo EventType — không dùng EventStatus để tránh nhầm Active với mức Lỗi. */
function mapSeverityToLevel(eventType) {
  const s = String(eventType ?? "")
    .trim()
    .toLowerCase();
  if (["error", "err", "failed", "failure", "critical", "danger"].includes(s)) {
    return "error";
  }
  if (
    ["warning", "warn", "maintenance", "offline", "devicereset"].includes(s)
  ) {
    return "warning";
  }
  return "info";
}

function formatFriendlyDateTime(value) {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inferDeviceNameFromCode(deviceCode) {
  const c = String(deviceCode ?? "")
    .trim()
    .toLowerCase();
  if (!c) return "";

  if (c.startsWith("face_camera_in_")) return "Face Camera In";
  if (c.startsWith("plate_camera_in_")) return "Plate Camera In";
  if (c.startsWith("face_camera_out_")) return "Face Camera Out";
  if (c.startsWith("plate_camera_out_")) return "Plate Camera Out";

  if (c.startsWith("sensor_in_1_")) return "Sensor In 1";
  if (c.startsWith("sensor_in_2_")) return "Sensor In 2";
  if (c.startsWith("barrier_in_")) return "Barrier In";
  if (c.startsWith("lcd_in_")) return "LCD In";

  if (c.startsWith("sensor_out_1_")) return "Sensor Out 1";
  if (c.startsWith("sensor_out_2_")) return "Sensor Out 2";
  if (c.startsWith("barrier_out_")) return "Barrier Out";
  if (c.startsWith("lcd_out_")) return "LCD Out";

  return "";
}

function pickText(...values) {
  for (const value of values) {
    if (value == null) continue;
    const s = String(value).trim();
    if (s) return s;
  }
  return "";
}

/** Không hiển thị khối JSON trùng với dòng chữ đã rút gọn */
function parseEventData(eventData) {
  if (eventData == null || eventData === "") {
    return { summary: "—", pretty: "" };
  }
  const s = String(eventData).trim();
  try {
    const o = JSON.parse(s);
    if (o && typeof o === "object") {
      const msg = o.message ?? o.Message ?? o.detail ?? o.Detail;
      const summary =
        msg != null && String(msg).trim() !== ""
          ? String(msg)
          : JSON.stringify(o);
      const keys = Object.keys(o);
      const onlyMessage =
        keys.length === 1 &&
        String(keys[0]).toLowerCase() === "message" &&
        String(o.message ?? "") === summary;
      const pretty = onlyMessage ? "" : JSON.stringify(o, null, 2);
      return { summary, pretty };
    }
  } catch {
    /* not JSON */
  }
  return { summary: s || "—", pretty: s.length > 80 ? s : "" };
}

export function normalizeDeviceEvent(raw, index) {
  const eventId = raw.eventId ?? raw.id ?? `evt-${index}`;
  const eventType =
    pickText(raw.eventType, raw.event_type, raw.type, raw.eventName) || "—";
  const eventStatus =
    pickText(raw.eventStatus, raw.event_status, raw.status, raw.state) || "—";
  const eventSource =
    pickText(raw.eventSource, raw.event_source, raw.source) || "—";
  const level = mapSeverityToLevel(eventType);
  const { summary, pretty } = parseEventData(raw.eventData ?? raw.event_data);

  const deviceCode = pickText(raw.deviceCode, raw.device_code, raw.code);
  const deviceId = pickText(raw.deviceId, raw.device_id, deviceCode) || "—";
  const inferredName = inferDeviceNameFromCode(deviceCode);
  const deviceName =
    pickText(raw.deviceName, raw.device_name, inferredName) || "—";
  const lotId = pickText(raw.lotId, raw.lot_id, raw.parkingLotId) || "—";
  const lotName =
    pickText(raw.lotName, raw.lot_name, raw.parkingLotName) || "—";

  return {
    id: eventId,
    eventId,
    deviceId,
    deviceCode: deviceCode || "—",
    deviceName,
    lotId,
    lotName,
    eventType,
    eventSource,
    eventStatus,
    eventDataSummary: summary,
    eventDataPretty: pretty,
    occurredAtRaw: raw.occurredAt ?? raw.occurred_at,
    createdAtRaw: raw.createdAt ?? raw.created_at,
    occurredAtFriendly: formatFriendlyDateTime(
      raw.occurredAt ?? raw.occurred_at,
    ),
    createdAtFriendly: formatFriendlyDateTime(raw.createdAt ?? raw.created_at),
    level,
  };
}
