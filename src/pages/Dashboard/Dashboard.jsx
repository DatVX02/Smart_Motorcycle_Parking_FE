import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  Motorbike,
  ShieldAlert,
  TrendingUp,
  WifiOff,
} from "lucide-react";
import { useAdminHub } from "../../hooks/useAdminHub";
import StatCard from "./StatCard";
import parkingLotService from "../../services/parkingLotService";
import iotDeviceService from "../../services/iotDeviceService";
import dashboardService from "../../services/dashboardService";
import recognitionLogService from "../../services/recognitionLogService";
import transactionService from "../../services/transactionService";
import { API_BASE_URL } from "../../config/api";
import TrafficTrendChart from "./TrafficTrendChart";
import RecentRecognitionActivity from "./RecentRecognitionActivity";
import SecurityMonitoringWidget from "./SecurityMonitoringWidget";
import SystemRevenueWidget from "./SystemRevenueWidget";

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function asDate(value) {
  if (!isValidDate(value)) return null;
  return new Date(value);
}

function toArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.sessions)) return raw.sessions;
  return [];
}

function normalizeDeviceStatus(status) {
  return String(status ?? "")
    .trim()
    .toLowerCase();
}

function isOnlineStatus(status) {
  const s = normalizeDeviceStatus(status);
  return ["online", "ready", "active", "running", "ok"].includes(s);
}

function inferDeviceName(deviceCode) {
  const code = String(deviceCode ?? "")
    .trim()
    .toLowerCase();
  if (!code) return "Thiết bị không rõ";
  if (code.includes("camera") && code.includes("in")) return "Camera cổng vào";
  if (code.includes("camera") && code.includes("out")) return "Camera cổng ra";
  if (code.includes("barrier") && code.includes("in"))
    return "Barrier cổng vào";
  if (code.includes("barrier") && code.includes("out"))
    return "Barrier cổng ra";
  if (code.includes("lcd") && code.includes("in")) return "LCD cổng vào";
  if (code.includes("lcd") && code.includes("out")) return "LCD cổng ra";
  if (code.includes("sensor") && code.includes("in"))
    return "Cảm biến cổng vào";
  if (code.includes("sensor") && code.includes("out"))
    return "Cảm biến cổng ra";
  return "Thiết bị không rõ";
}

function firstText(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function parseResultData(rawValue) {
  if (!rawValue) return null;
  if (typeof rawValue === "object") return rawValue;
  if (typeof rawValue !== "string") return null;
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function resolveImageUrl(rawUrl, apiBaseUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const url = rawUrl.trim();
  if (!url) return "";
  if (/^(https?:|data:image|blob:)/i.test(url)) return url;
  return `${apiBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

function getHourlyTrafficData(sessionItems, sessionEvents) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    inCount: 0,
    outCount: 0,
  }));

  const inRegex = /(check.?in|entry|\bin\b|vao)/i;
  const outRegex = /(check.?out|exit|\bout\b|ra)/i;

  const countIfToday = (rawTime, key) => {
    const date = asDate(rawTime);
    if (!date) return;
    if (
      date.getFullYear() !== currentYear ||
      date.getMonth() !== currentMonth ||
      date.getDate() !== currentDate
    ) {
      return;
    }

    const hour = date.getHours();
    if (hour < 0 || hour > 23) return;
    buckets[hour][key] += 1;
  };

  for (const session of sessionItems) {
    const inTime =
      session.checkInTime ?? session.entryTime ?? session.createdAt ?? null;
    const outTime = session.checkOutTime ?? session.exitTime ?? null;
    countIfToday(inTime, "inCount");
    countIfToday(outTime, "outCount");
  }

  for (const event of sessionEvents) {
    const time =
      event.timestamp ?? event.occurredAt ?? event.createdAt ?? event.time;
    const directionHints = [
      event.direction,
      event.action,
      event.type,
      event.status,
      event.sessionStatus,
      event.eventType,
    ]
      .filter(Boolean)
      .join(" ");

    if (outRegex.test(directionHints)) {
      countIfToday(time, "outCount");
      continue;
    }

    if (inRegex.test(directionHints)) {
      countIfToday(time, "inCount");
    }
  }

  return buckets;
}

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString("vi-VN");
}

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function normalizeTargetTypeParam(value) {
  if (!value) return "";
  const normalized = String(value).trim().toLowerCase();
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

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
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

function getTargetTypeValue(item) {
  if (!item || typeof item !== "object") return undefined;
  return normalizeTargetTypeParam(
    pickFirst(item.targetType, item.referenceType, item.entityType),
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

function getNetCashAmountWithFailed(item) {
  if (!item || typeof item !== "object") return 0;

  const resolvedTargetType = getTargetTypeValue(item);

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

function getTransactionDate(transaction) {
  const raw =
    transaction?.createdAt ??
    transaction?.paymentTime ??
    transaction?.updatedAt;
  if (!raw) return null;
  const ms = parseBackendDateToMs(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms);
}

function sumTodayRevenueFromTransactions(transactions) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  let sum = 0;
  let hasTodayTransaction = false;

  for (const tx of transactions) {
    const txDate = getTransactionDate(tx);
    if (!txDate) continue;

    if (
      txDate.getFullYear() !== y ||
      txDate.getMonth() !== m ||
      txDate.getDate() !== d
    ) {
      continue;
    }

    sum += getNetCashAmountWithFailed(tx);
    hasTodayTransaction = true;
  }

  return hasTodayTransaction ? sum : null;
}

function extractTodayRevenue(rawRevenue, sessions, revenueTransactions) {
  const directKeys = [
    "todayRevenue",
    "revenueToday",
    "dailyRevenue",
    "todayTotal",
    "estimatedRevenueToday",
  ];

  for (const key of directKeys) {
    const value = Number(rawRevenue?.[key]);
    if (Number.isFinite(value)) return value;
  }

  const rows = toArray(rawRevenue);
  if (rows.length > 0) {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    let sum = 0;
    let hasTodayRow = false;

    for (const row of rows) {
      const dt = asDate(row.date ?? row.day ?? row.createdAt ?? row.time);
      if (!dt) continue;
      if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
        const amount = Number(
          row.revenue ?? row.total ?? row.amount ?? row.value ?? 0,
        );
        if (Number.isFinite(amount)) {
          hasTodayRow = true;
          sum += amount;
        }
      }
    }

    if (hasTodayRow) return sum;
  }

  const revenueFromTransactions = sumTodayRevenueFromTransactions(
    Array.isArray(revenueTransactions) ? revenueTransactions : [],
  );
  if (Number.isFinite(revenueFromTransactions)) {
    return revenueFromTransactions;
  }

  let sessionRevenue = 0;
  for (const session of sessions) {
    const paidTime = asDate(
      session.checkOutTime ?? session.exitTime ?? session.updatedAt,
    );
    if (!paidTime) continue;

    const now = new Date();
    if (
      paidTime.getFullYear() !== now.getFullYear() ||
      paidTime.getMonth() !== now.getMonth() ||
      paidTime.getDate() !== now.getDate()
    ) {
      continue;
    }

    const amount = Number(
      session.totalAmount ??
        session.totalFee ??
        session.amount ??
        session.fee ??
        0,
    );
    if (Number.isFinite(amount)) sessionRevenue += amount;
  }

  return sessionRevenue;
}

function getDeviceAlertVariant(status) {
  const s = normalizeDeviceStatus(status);
  if (["offline", "inactive", "disconnected", "down"].includes(s)) {
    return {
      textClass: "text-red-700",
      badgeClass: "bg-red-100 text-red-800 border border-red-200 animate-pulse",
      containerClass: "border-red-200 bg-red-50/70",
      label: "Khẩn cấp",
    };
  }

  if (["broken", "error", "failed", "warning", "maintenance"].includes(s)) {
    return {
      textClass: "text-amber-700",
      badgeClass: "bg-amber-100 text-amber-800 border border-amber-200",
      containerClass: "border-amber-200 bg-amber-50/70",
      label: "Cần xử lý",
    };
  }

  return {
    textClass: "text-slate-700",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
    containerClass: "border-slate-200 bg-slate-50",
    label: "Theo dõi",
  };
}

function buildSecurityAlerts(recognitionLogs, sessions) {
  const now = Date.now();
  const list = [];

  for (const item of recognitionLogs) {
    const parsed = parseResultData(item.resultData);
    const confidenceRaw = Number(
      item.confidenceScore ?? parsed?.confidenceScore,
    );
    const confidence = Number.isFinite(confidenceRaw)
      ? confidenceRaw > 1
        ? confidenceRaw
        : confidenceRaw * 100
      : null;
    const isLowConfidence = confidence != null && confidence < 70;
    const isBlackListMatch =
      parsed?.isBlacklisted === true ||
      parsed?.blacklistMatch === true ||
      parsed?.watchlistMatched === true ||
      parsed?.inBlacklist === true;

    const recognitionType = String(item.recognitionType ?? "").toLowerCase();
    const isUnknownFace =
      recognitionType.includes("face") &&
      (parsed?.isFaceMatched === false ||
        parsed?.faceMatched === false ||
        isLowConfidence);

    if (isBlackListMatch) {
      list.push({
        id: `sec-bl-${item.logId ?? Math.random()}`,
        severity: "critical",
        title: "Cảnh báo danh sách đen",
        description: `Biển số ${item.licensePlate || "không rõ"} vừa được phát hiện trong danh sách theo dõi.`,
        time: item.createdAt,
      });
    } else if (isUnknownFace) {
      list.push({
        id: `sec-face-${item.logId ?? Math.random()}`,
        severity: "high",
        title: "Khuôn mặt lạ",
        description: `Phát hiện khuôn mặt chưa xác thực tại ${item.lotName || "bãi không rõ"}.`,
        time: item.createdAt,
      });
    }
  }

  for (const session of sessions) {
    const checkOut = session.checkOutTime ?? session.exitTime;
    if (checkOut) continue;

    const startAt = asDate(
      session.checkInTime ?? session.entryTime ?? session.createdAt,
    );
    if (!startAt) continue;

    const hours = (now - startAt.getTime()) / (1000 * 60 * 60);
    if (hours >= 48) {
      list.push({
        id: `sec-48h-${session.sessionId ?? Math.random()}`,
        severity: "critical",
        title: "Xe trong bãi quá 48 giờ",
        description: `${
          session.licensePlate ?? session.vehiclePlate ?? "Xe không rõ biển số"
        } đang ở bãi ${session.lotName ?? session.lotId ?? "không rõ"} hơn ${Math.floor(hours)} giờ.`,
        time: startAt.toISOString(),
      });
    } else if (hours >= 24) {
      list.push({
        id: `sec-24h-${session.sessionId ?? Math.random()}`,
        severity: "high",
        title: "Xe trong bãi quá 24 giờ",
        description: `${
          session.licensePlate ?? session.vehiclePlate ?? "Xe không rõ biển số"
        } đang ở bãi ${session.lotName ?? session.lotId ?? "không rõ"} khoảng ${Math.floor(hours)} giờ.`,
        time: startAt.toISOString(),
      });
    }
  }

  return list
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDelta =
        (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
      if (severityDelta !== 0) return severityDelta;
      return new Date(b.time ?? 0).getTime() - new Date(a.time ?? 0).getTime();
    })
    .slice(0, 8);
}

function normalizeRecentRecognition(log, apiBaseUrl) {
  const parsed = parseResultData(log.resultData);
  const recognitionType = String(log.recognitionType ?? "");

  const faceRaw =
    firstText(log, [
      "checkInFaceImageUrl",
      "entryFaceImageUrl",
      "checkOutFaceImageUrl",
      "exitFaceImageUrl",
      "faceImage",
      "faceImageUrl",
      "customerFaceImage",
      "customerFaceImageUrl",
      "userFaceImage",
      "userFaceImageUrl",
    ]) ||
    firstText(parsed, [
      "faceImageUrl",
      "faceCropImageUrl",
      "checkInFaceImageUrl",
      "checkOutFaceImageUrl",
    ]);

  const plateRaw =
    firstText(log, [
      "checkInPlateImageUrl",
      "entryPlateImageUrl",
      "checkOutPlateImageUrl",
      "exitPlateImageUrl",
      "plateImage",
      "plateImageUrl",
      "licensePlateImage",
      "licensePlateImageUrl",
      "vehiclePlateImage",
      "vehiclePlateImageUrl",
    ]) ||
    firstText(parsed, [
      "plateImageUrl",
      "plateCropImageUrl",
      "checkInPlateImageUrl",
      "checkOutPlateImageUrl",
    ]);

  const inputImageRaw = firstText(log, ["inputImageUrl"]);

  const confidenceRaw = Number(log.confidenceScore ?? parsed?.confidenceScore);
  const confidence = Number.isFinite(confidenceRaw)
    ? confidenceRaw > 1
      ? confidenceRaw
      : confidenceRaw * 100
    : null;

  const isWarning =
    parsed?.isBlacklisted === true ||
    parsed?.blacklistMatch === true ||
    parsed?.watchlistMatched === true ||
    parsed?.isFaceMatched === false ||
    parsed?.faceMatched === false ||
    (confidence != null && confidence < 70);

  const isFaceType = recognitionType.toLowerCase().includes("face");
  const isPlateType = recognitionType.toLowerCase().includes("plate");

  const fallbackFace = isFaceType ? inputImageRaw : "";
  const fallbackPlate = isPlateType ? inputImageRaw : "";

  const faceImage = resolveImageUrl(faceRaw || fallbackFace, apiBaseUrl);
  const plateImage = resolveImageUrl(plateRaw || fallbackPlate, apiBaseUrl);

  return {
    id:
      log.logId ??
      `${log.licensePlate ?? "unknown"}-${log.createdAt ?? Date.now()}`,
    faceImage,
    plateImage,
    lotName: log.lotName ?? log.lotId ?? "Bãi không rõ",
    plate: log.licensePlate ?? "Không rõ biển số",
    recognitionType,
    time: log.createdAt,
    statusLabel: isWarning ? "Cảnh báo" : "Hợp lệ",
    statusTone: isWarning ? "warning" : "valid",
  };
}

function formatTime(value) {
  const date = asDate(value);
  if (!date) return "Không rõ thời gian";
  return date.toLocaleString("vi-VN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function Dashboard() {
  const [lots, setLots] = useState([]);
  const apiBaseUrl = API_BASE_URL.replace(/\/+$/, "");

  const { spotsMap, occupancyMap, deviceEvents, sessionEvents } = useAdminHub();

  const [initialDeviceEvents, setInitialDeviceEvents] = useState([]);
  const [devices, setDevices] = useState([]);
  const [sessionsFromApi, setSessionsFromApi] = useState([]);
  const [revenueTransactions, setRevenueTransactions] = useState([]);
  const [recognitionLogs, setRecognitionLogs] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);

  // load parking lots
  useEffect(() => {
    let cancelled = false;
    parkingLotService
      .getAllParkingLots()
      .then((items) => {
        if (!cancelled) setLots(items ?? []);
      })
      .catch((err) => {
        // 401 sẽ được interceptor trong `src/config/api.js` tự redirect /login
        console.error(err);
        if (!cancelled) setLots([]);
      });

    // load snapshot trạng thái thiết bị để không bị mất khi F5
    iotDeviceService
      .getAll()
      .then((devices) => {
        if (cancelled) return;
        setDevices(Array.isArray(devices) ? devices : []);
        const snapshot = (devices ?? [])
          .filter((d) => {
            const status = (
              d.status ??
              d.connectionStatus ??
              d.eventStatus ??
              ""
            )
              .toString()
              .toLowerCase();
            return status !== "online";
          })
          .map((d) => ({
            deviceId: d.deviceId ?? d.id,
            status:
              d.status ?? d.connectionStatus ?? d.eventStatus ?? "Unknown",
            lotId: d.lotId ?? d.parkingLotId ?? null,
            timestamp: d.lastUpdated ?? d.updatedAt ?? d.createdAt ?? null,
            _source: "snapshot",
          }));
        setInitialDeviceEvents(snapshot);
      })
      .catch((err) => {
        console.error("Load iot devices error:", err);
        if (!cancelled) {
          setInitialDeviceEvents([]);
          setDevices([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSnapshots(true);

    Promise.allSettled([
      dashboardService.getSessions(),
      dashboardService.getRevenue(),
      recognitionLogService.getAll({ page: 1, pageSize: 20 }),
      transactionService.getPaymentBreakdowns({ pageSize: 9999 }),
    ])
      .then((results) => {
        if (cancelled) return;

        const sessionsResult = results[0];
        const revenueResult = results[1];
        const recognitionResult = results[2];
        const revenueTransactionsResult = results[3];

        if (sessionsResult.status === "fulfilled") {
          setSessionsFromApi(toArray(sessionsResult.value));
        } else {
          setSessionsFromApi([]);
        }

        if (revenueResult.status === "fulfilled") {
          setRevenueData(revenueResult.value);
        } else {
          setRevenueData(null);
        }

        if (recognitionResult.status === "fulfilled") {
          const items = Array.isArray(recognitionResult.value?.items)
            ? recognitionResult.value.items
            : [];
          setRecognitionLogs(items);
        } else {
          setRecognitionLogs([]);
        }

        if (revenueTransactionsResult.status === "fulfilled") {
          const payload = revenueTransactionsResult.value;
          const items = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.items)
              ? payload.items
              : Array.isArray(payload?.data)
                ? payload.data
                : [];
          setRevenueTransactions(items);
        } else {
          setRevenueTransactions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSnapshots(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Tổng số chỗ trống (cộng tất cả các bãi, ưu tiên realtime)
  const totalAvailableSpots = lots.reduce((sum, lot) => {
    const rtAvailable = spotsMap[lot.lotId];
    const available =
      typeof rtAvailable === "number"
        ? rtAvailable
        : Math.max(
            0,
            (lot.totalCapacity ?? lot.totalSpots ?? lot.capacity ?? 0) -
              (lot.currentOccupancy ?? lot.occupiedSpots ?? 0),
          );
    return sum + available;
  }, 0);

  // Tỉ lệ lấp đầy TB: ưu tiên realtime, fallback API
  const hasRealtimeOcc = Object.values(occupancyMap).length > 0;
  const avgOccupancyRealtime = hasRealtimeOcc
    ? (
        Object.values(occupancyMap).reduce((a, b) => a + b, 0) /
        Object.values(occupancyMap).length
      ).toFixed(1)
    : null;

  const avgOccupancyFromApi = (() => {
    if (lots.length === 0) return "0";
    const totalCapacity = lots.reduce((sum, lot) => {
      const total = lot.totalCapacity ?? lot.totalSpots ?? lot.capacity ?? 0;
      return sum + (total || 0);
    }, 0);
    if (totalCapacity === 0) return "0";
    const totalOccupied = lots.reduce((sum, lot) => {
      const occupied = lot.currentOccupancy ?? lot.occupiedSpots ?? 0;
      return sum + (occupied || 0);
    }, 0);
    const pct = (totalOccupied / totalCapacity) * 100;
    return pct.toFixed(1);
  })();

  const avgOccupancy = avgOccupancyRealtime ?? avgOccupancyFromApi;

  const mergedDeviceEvents = [...initialDeviceEvents, ...deviceEvents].slice(
    0,
    50,
  );

  const deviceNameMap = useMemo(() => {
    const map = new Map();
    for (const d of devices) {
      const id = d.deviceId ?? d.id;
      if (id == null) continue;
      const name =
        d.deviceName ??
        d.name ??
        d.deviceLabel ??
        inferDeviceName(d.deviceCode);
      map.set(String(id), name || "Thiết bị không rõ");
    }
    return map;
  }, [devices]);

  const lotNameMap = useMemo(() => {
    const map = new Map();
    for (const lot of lots) {
      const id = lot.lotId ?? lot.id;
      if (id == null) continue;
      map.set(String(id), lot.lotName ?? lot.name ?? `Bãi ${id}`);
    }
    return map;
  }, [lots]);

  const deviceAlerts = useMemo(
    () =>
      mergedDeviceEvents
        .map((event, idx) => {
          const status =
            event.status ?? event.eventStatus ?? event.connectionStatus;
          const normStatus = normalizeDeviceStatus(status);
          if (isOnlineStatus(normStatus)) return null;

          const deviceId = String(
            event.deviceId ?? event.id ?? `unknown-${idx}`,
          );
          const deviceName =
            event.deviceName ??
            deviceNameMap.get(deviceId) ??
            inferDeviceName(event.deviceCode);
          const lotName =
            event.lotName ??
            lotNameMap.get(String(event.lotId ?? event.parkingLotId ?? "")) ??
            "Bãi không rõ";

          return {
            id: `${deviceId}-${event.timestamp ?? event.createdAt ?? idx}`,
            deviceName,
            deviceId,
            lotName,
            status: status || "Unknown",
            time:
              event.timestamp ??
              event.occurredAt ??
              event.updatedAt ??
              event.createdAt ??
              null,
            variant: getDeviceAlertVariant(status),
          };
        })
        .filter(Boolean)
        .slice(0, 10),
    [mergedDeviceEvents, deviceNameMap, lotNameMap],
  );

  const faultyCount = deviceAlerts.length;

  const todayRevenue = useMemo(
    () =>
      extractTodayRevenue(revenueData, sessionsFromApi, revenueTransactions),
    [revenueData, sessionsFromApi, revenueTransactions],
  );

  const trafficData = useMemo(
    () => getHourlyTrafficData(sessionsFromApi, sessionEvents),
    [sessionsFromApi, sessionEvents],
  );

  const recentRecognition = useMemo(
    () =>
      recognitionLogs
        .slice(0, 12)
        .map((log) => normalizeRecentRecognition(log, apiBaseUrl)),
    [recognitionLogs, apiBaseUrl],
  );

  const securityAlerts = useMemo(
    () => buildSecurityAlerts(recognitionLogs, sessionsFromApi),
    [recognitionLogs, sessionsFromApi],
  );

  const stats = [
    {
      title: "Tổng chỗ trống",
      value: Number(totalAvailableSpots || 0).toLocaleString("vi-VN"),
      unit: "Chỗ",
      icon: Motorbike,
      color: "bg-blue-500",
      bgTint: "white",
      iconColor: "text-blue-600",
    },
    {
      title: "Tỉ lệ lấp đầy TB",
      value: String(avgOccupancy ?? "0"),
      unit: "%",
      icon: TrendingUp,
      color: "bg-green-500",
      bgTint: "green",
      iconColor: "text-green-600",
    },
    {
      title: "Tổng thiết bị",
      value: Number(faultyCount || 0).toLocaleString("vi-VN"),
      unit: "Thiết bị",
      icon: AlertTriangle,
      color: "bg-orange-500",
      bgTint: "amber",
      iconColor: "text-orange-600",
    },
    {
      title: "Doanh thu tạm tính hôm nay",
      value: formatCurrency(todayRevenue),
      unit: "VNĐ",
      icon: CircleDollarSign,
      color: "bg-emerald-500",
      bgTint: "green",
      iconColor: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Thẻ thống kê — style giống Quản lý bãi xe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <SystemRevenueWidget
        transactions={revenueTransactions}
        lots={lots}
        loading={loadingSnapshots}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TrafficTrendChart data={trafficData} loading={loadingSnapshots} />
        </div>
        <RecentRecognitionActivity
          data={recentRecognition.map((item) => ({
            ...item,
            timeLabel: formatTime(item.time),
          }))}
          loading={loadingSnapshots}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SecurityMonitoringWidget
          alerts={securityAlerts.map((alert) => ({
            ...alert,
            timeLabel: formatTime(alert.time),
          }))}
          loading={loadingSnapshots}
        />

        <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-red-600" />
            Cảnh báo thiết bị
          </h2>

          {deviceAlerts.length === 0 ? (
            <p className="text-green-600">
              Tất cả thiết bị hoạt động bình thường
            </p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {deviceAlerts.map((event) => (
                <div
                  key={event.id}
                  className={`rounded-xl border p-3 ${event.variant.containerClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-semibold ${event.variant.textClass}`}>
                        {event.deviceName}
                      </p>
                      <p className="text-xs text-slate-500">{event.lotName}</p>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-1 rounded-full font-semibold ${event.variant.badgeClass}`}
                    >
                      {event.variant.label}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {event.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatTime(event.time)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lots.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Chi tiết chỗ trống theo từng bãi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {lots.map((lot) => {
              const rtAvailable = spotsMap[lot.lotId];
              const available =
                typeof rtAvailable === "number"
                  ? rtAvailable
                  : Math.max(
                      0,
                      (lot.totalCapacity ??
                        lot.totalSpots ??
                        lot.capacity ??
                        0) - (lot.currentOccupancy ?? lot.occupiedSpots ?? 0),
                    );
              const rtOccPct = occupancyMap[lot.lotId];
              const occPct =
                typeof rtOccPct === "number"
                  ? rtOccPct
                  : (() => {
                      const total =
                        lot.totalCapacity ??
                        lot.totalSpots ??
                        lot.capacity ??
                        0;
                      const occupied =
                        lot.currentOccupancy ?? lot.occupiedSpots ?? 0;
                      if (!total) return 0;
                      return (occupied / total) * 100;
                    })();
              const occupancyPercent = Math.max(0, Math.min(100, occPct || 0));
              const progressColor =
                occupancyPercent >= 100
                  ? "bg-red-500"
                  : occupancyPercent > 80
                    ? "bg-amber-500"
                    : "bg-green-500";
              const totalSpots =
                lot.totalCapacity ?? lot.totalSpots ?? lot.capacity ?? 0;
              const occupied = Math.max(0, totalSpots - available);

              return (
                <div
                  key={lot.lotId ?? lot.id}
                  className="rounded-2xl border border-gray-200 p-5 shadow-sm bg-white hover:shadow-md transition-shadow"
                >
                  <div className="font-semibold text-gray-900 mb-3">
                    {lot.lotName}
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tổng chỗ</span>
                      <span className="font-medium text-gray-900">
                        {totalSpots}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Đang dùng</span>
                      <span className="font-medium text-orange-600">
                        {occupied}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Chỗ trống</span>
                      <span className="font-medium text-green-600">
                        {available}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Lấp đầy</span>
                      <span className="font-semibold text-gray-900">
                        {occPct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                          style={{ width: `${occupancyPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {securityAlerts.length === 0 && recognitionLogs.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-2 text-emerald-700">
          <ShieldAlert className="w-5 h-5" />
          <span className="text-sm font-medium">
            Chưa phát hiện cảnh báo an ninh nổi bật trong các bản ghi gần đây.
          </span>
        </div>
      )}
    </div>
  );
}
