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

export function isActiveOperationalStatus(status) {
  const s = normStatus(status);
  if (!s || s === "—") return false;
  return ["active", "online", "running", "enabled", "ok"].includes(s);
}

export function isInactiveOperationalStatus(status) {
  const s = normStatus(status);
  if (!s || s === "—") return false;
  return [
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

function mapSeverityToLevel(value) {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["error", "err", "failed", "failure", "critical", "danger"].includes(s)) {
    return "error";
  }
  if (["warning", "warn"].includes(s)) {
    return "warning";
  }
  if (
    [
      "info",
      "information",
      "informational",
      "debug",
      "trace",
      "active",
      "success",
      "succeeded",
      "ok",
      "completed",
    ].includes(s)
  ) {
    return "info";
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
  const eventType = String(raw.eventType ?? "").trim() || "—";
  const eventStatus = String(raw.eventStatus ?? "").trim() || "—";
  const eventSource = String(raw.eventSource ?? "").trim() || "—";
  const level = mapSeverityToLevel(raw.eventType ?? raw.eventStatus);
  const { summary, pretty } = parseEventData(raw.eventData);

  const deviceId = raw.deviceId != null ? String(raw.deviceId) : "—";
  const deviceName = raw.deviceName != null ? String(raw.deviceName) : "—";
  const lotId = raw.lotId != null ? String(raw.lotId) : "—";
  const lotName = raw.lotName != null ? String(raw.lotName) : "—";

  return {
    id: eventId,
    eventId,
    deviceId,
    deviceName,
    lotId,
    lotName,
    eventType,
    eventSource,
    eventStatus,
    eventDataSummary: summary,
    eventDataPretty: pretty,
    occurredAtRaw: raw.occurredAt,
    createdAtRaw: raw.createdAt,
    occurredAtFriendly: formatFriendlyDateTime(raw.occurredAt),
    createdAtFriendly: formatFriendlyDateTime(raw.createdAt),
    level,
  };
}
