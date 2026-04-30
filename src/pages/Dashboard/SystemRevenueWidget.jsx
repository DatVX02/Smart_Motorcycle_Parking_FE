import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  CircleDollarSign,
  CalendarDays,
  Landmark,
  Motorbike,
} from "lucide-react";
import { ConfigProvider, DatePicker } from "antd";
import viVN from "antd/es/locale/vi_VN";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

dayjs.locale("vi");

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
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

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "0 VNĐ";
  return `${amount.toLocaleString("vi-VN")} VNĐ`;
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
    transaction.createdAt ?? transaction.paymentTime ?? transaction.updatedAt;
  if (!raw) return null;
  const ms = parseBackendDateToMs(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms);
}

function matchesPeriod(date, mode, selectedDate, selectedMonth, selectedYear) {
  if (!date) return false;
  const d = dayjs(date);
  if (!d.isValid()) return false;

  if (mode === "day") {
    return d.isSame(selectedDate, "day");
  }

  if (mode === "month") {
    return d.isSame(selectedMonth, "month");
  }

  return d.isSame(selectedYear, "year");
}

function modeLabel(mode) {
  if (mode === "day") return "Theo ngày";
  if (mode === "month") return "Theo tháng";
  return "Theo năm";
}

function normalizeLotLabel(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function formatTargetTypeLabel(type, empty = "") {
  if (!type) return empty;
  const normalized = String(type).trim().toLowerCase();
  if (["parking-session", "parkingsession"].includes(normalized)) {
    return "Phí gửi xe";
  }
  if (["monthly-pass", "monthlypass"].includes(normalized)) return "Vé tháng";
  if (["wallet-deposit", "walletdeposit"].includes(normalized)) {
    return "Nạp ví";
  }
  if (["wallet-withdraw", "walletwithdraw"].includes(normalized)) {
    return "Rút tiền";
  }
  return String(type);
}

function getStatusBucket(status) {
  const s = normalizeStatus(status);
  if (isSuccessfulPaymentStatus(s)) return "success";
  if (isFailedPaymentStatus(s)) return "failed";
  if (s === "pending") return "pending";
  if (s === "cancelled") return "cancelled";
  return "other";
}

function formatStatusLabel(status) {
  const s = normalizeStatus(status);
  if (s === "completed") return "Hoàn thành";
  if (s === "overtimepaid") return "Quá giờ";
  if (s === "prepaid") return "Thanh toán trước";
  if (s === "pending") return "Chờ thanh toán";
  if (s === "failed") return "Thất bại";
  if (s === "cancelled") return "Đã hủy";
  return "Khác";
}

function getRevenueSourceGroup(targetType) {
  const normalized = normalizeTargetTypeParam(targetType);
  if (normalized === "parking-session") return "walkIn";
  if (normalized === "monthly-pass") return "monthly";
  return "other";
}

const REVENUE_AXIS_TICKS = [0, 100000, 200000, 300000, 400000];
const REVENUE_AXIS_MAX = 400000;

const chartConfigByDay = {
  revenue: {
    label: "Doanh thu theo ngày",
    color: "#0ea5e9",
  },
};

const chartConfigByLot = {
  revenue: {
    label: "Doanh thu",
    color: "#0ea5e9",
  },
};

const chartConfigWalletFlow = {
  deposit: {
    label: "Nạp ví",
    color: "#16a34a",
  },
  withdraw: {
    label: "Rút tiền",
    color: "#f97316",
  },
};

function formatFixedRevenueAxis(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  const inK = Math.round(n / 1000);
  if (inK === 0) return "0";
  return `${inK}K`;
}

function formatHourTick(label) {
  const text = String(label ?? "");
  const hour = Number(text.split(":")[0]);
  if (!Number.isFinite(hour)) return "";
  return hour % 4 === 0 ? `${String(hour).padStart(2, "0")}:00` : "";
}

function formatTransactionTime(value) {
  if (!value) return "";
  const d = dayjs(value);
  if (!d.isValid()) return "";
  return d.format("HH:mm DD/MM/YYYY");
}

function SystemRevenueWidget({
  transactions = [],
  lots = [],
  loading = false,
}) {
  const [tab, setTab] = useState("parking"); // parking | wallet
  const [mode, setMode] = useState("day");
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [selectedYear, setSelectedYear] = useState(dayjs());
  const [selectedLotId, setSelectedLotId] = useState("all");
  const [expandedLotKey, setExpandedLotKey] = useState("");

  const lotNameMap = useMemo(() => {
    const map = new Map();
    for (const lot of lots) {
      const id = String(lot.lotId ?? lot.id ?? "");
      if (!id) continue;
      map.set(id, lot.lotName ?? lot.name ?? `Bãi ${id}`);
    }
    return map;
  }, [lots]);

  const parkingStats = useMemo(() => {
    const sourceItems = extractItems(transactions);
    const revenueByLot = new Map();
    const revenueByDay = new Map();
    const revenueByHour = new Map();
    const revenueByMonth = new Map();
    let totalRevenue = 0;
    let transactionCount = 0;
    const statusCounts = {
      success: 0,
      failed: 0,
      pending: 0,
      cancelled: 0,
      other: 0,
    };
    const sourceRevenue = {
      walkIn: 0,
      monthly: 0,
      other: 0,
    };

    for (const tx of sourceItems) {
      const txDate = getTransactionDate(tx);
      if (
        !matchesPeriod(txDate, mode, selectedDate, selectedMonth, selectedYear)
      ) {
        continue;
      }

      const txLotId = String(tx.lotId ?? tx.parkingLotId ?? "unknown");
      const txLotNameRaw =
        tx.lotName ?? tx.parkingLotName ?? lotNameMap.get(txLotId) ?? "";

      if (selectedLotId !== "all" && tab === "parking") {
        const selectedLotName = lotNameMap.get(selectedLotId) ?? "";
        const sameId = txLotId === selectedLotId;
        const sameName =
          normalizeLotLabel(txLotNameRaw) ===
          normalizeLotLabel(selectedLotName);
        if (!sameId && !sameName) continue;
      }

      const latestStatus = getPaymentStatusValue(tx);
      if (!isSuccessfulPaymentStatus(latestStatus)) continue;

      const statusBucket = getStatusBucket(latestStatus);
      statusCounts[statusBucket] += 1;

      const txTargetType = getTargetTypeValue(tx);
      const normalizedTargetType = normalizeTargetTypeParam(txTargetType);
      if (!["parking-session", "monthly-pass"].includes(normalizedTargetType)) {
        continue;
      }

      transactionCount += 1;

      const netRevenue = getNetCashAmountWithFailed(tx, txTargetType);
      if (!Number.isFinite(netRevenue) || netRevenue === 0) continue;

      const sourceGroup = getRevenueSourceGroup(txTargetType);
      sourceRevenue[sourceGroup] += netRevenue;

      const lotId = txLotId;
      const lotName =
        txLotNameRaw ??
        lotNameMap.get(lotId) ??
        (lotId === "unknown" ? "Không rõ bãi" : `Bãi ${lotId}`);

      const lotKey = normalizeLotLabel(lotName) || lotId;

      const current = revenueByLot.get(lotKey) ?? {
        lotKey,
        lotName,
        revenue: 0,
        transactions: 0,
        details: [],
      };

      current.revenue += netRevenue;
      current.transactions += 1;
      current.details.push({
        id: String(
          pickFirst(
            tx.transactionId,
            tx.id,
            tx.referenceId,
            tx.targetId,
            `${lotKey}-${current.transactions}`,
          ),
        ),
        plate: pickFirst(
          tx.licensePlate,
          tx.vehicleLicensePlate,
          tx.vehiclePlate,
          tx.plate,
          tx.targetLabel,
          "",
        ),
        targetTypeLabel: formatTargetTypeLabel(txTargetType),
        statusLabel: formatStatusLabel(latestStatus),
        amount: netRevenue,
        createdAt: tx.createdAt ?? tx.paymentTime ?? tx.updatedAt,
      });
      revenueByLot.set(lotKey, current);

      totalRevenue += netRevenue;

      if (mode === "month") {
        const day = dayjs(txDate).date();
        revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + netRevenue);
      } else if (mode === "day") {
        const hour = txDate.getHours();
        revenueByHour.set(hour, (revenueByHour.get(hour) ?? 0) + netRevenue);
      } else if (mode === "year") {
        const month = dayjs(txDate).month() + 1; // 1-12
        revenueByMonth.set(
          month,
          (revenueByMonth.get(month) ?? 0) + netRevenue,
        );
      }
    }

    const rows = Array.from(revenueByLot.values())
      .map((row) => ({
        ...row,
        detailRows: row.details
          .sort(
            (a, b) =>
              dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf(),
          )
          .slice(0, 8),
        contributionPct:
          totalRevenue > 0
            ? Math.max(0, (row.revenue / totalRevenue) * 100)
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const daysInMonth = selectedMonth.daysInMonth();
    const trendRows =
      mode === "month"
        ? Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            return {
              day,
              label: String(day).padStart(2, "0"),
              revenue: revenueByDay.get(day) ?? 0,
            };
          })
        : mode === "day"
          ? Array.from({ length: 24 }, (_, i) => ({
              hour: i,
              label: `${String(i).padStart(2, "0")}:00`,
              revenue: revenueByHour.get(i) ?? 0,
            }))
          : mode === "year"
            ? Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                return {
                  month,
                  label: `Tháng ${month}`,
                  revenue: revenueByMonth.get(month) ?? 0,
                };
              })
            : [];

    return {
      totalRevenue,
      transactionCount,
      statusCounts,
      sourceRevenue,
      rows,
      chartRows: rows.slice(0, 8),
      trendRows,
    };
  }, [
    transactions,
    mode,
    selectedDate,
    selectedMonth,
    selectedYear,
    selectedLotId,
    lotNameMap,
  ]);

  const walletStats = useMemo(() => {
    const sourceItems = extractItems(transactions);
    const now = new Date();
    const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      deposit: 0,
      withdraw: 0,
    }));

    const depositByDay = new Map();
    const withdrawByDay = new Map();
    const depositByMonth = new Map();
    const withdrawByMonth = new Map();

    let depositTotal = 0;
    let withdrawTotal = 0;
    let transactionCount = 0;
    const details = [];

    for (const tx of sourceItems) {
      const txDate = getTransactionDate(tx);
      if (
        !matchesPeriod(txDate, mode, selectedDate, selectedMonth, selectedYear)
      ) {
        continue;
      }

      const latestStatus = getPaymentStatusValue(tx);
      if (!isSuccessfulPaymentStatus(latestStatus)) continue;

      const txTargetType = getTargetTypeValue(tx);
      const normalizedTargetType = normalizeTargetTypeParam(txTargetType);
      if (
        !["wallet-deposit", "wallet-withdraw"].includes(normalizedTargetType)
      ) {
        continue;
      }

      const netAmount = getNetCashAmountWithFailed(tx, txTargetType);
      if (!Number.isFinite(netAmount) || netAmount === 0) continue;

      const absAmount = Math.abs(netAmount);
      const isWithdraw = normalizedTargetType === "wallet-withdraw";

      transactionCount += 1;
      if (isWithdraw) withdrawTotal += absAmount;
      else depositTotal += absAmount;

      if (mode === "day") {
        const hour = txDate ? txDate.getHours() : now.getHours();
        const bucket = hourlyBuckets[hour];
        if (bucket) {
          if (isWithdraw) bucket.withdraw += absAmount;
          else bucket.deposit += absAmount;
        }
      } else if (mode === "month") {
        const day = dayjs(txDate).date();
        if (isWithdraw) {
          withdrawByDay.set(day, (withdrawByDay.get(day) ?? 0) + absAmount);
        } else {
          depositByDay.set(day, (depositByDay.get(day) ?? 0) + absAmount);
        }
      } else {
        const month = dayjs(txDate).month() + 1; // 1-12
        if (isWithdraw) {
          withdrawByMonth.set(
            month,
            (withdrawByMonth.get(month) ?? 0) + absAmount,
          );
        } else {
          depositByMonth.set(
            month,
            (depositByMonth.get(month) ?? 0) + absAmount,
          );
        }
      }

      details.push({
        id: String(
          pickFirst(
            tx.transactionId,
            tx.id,
            tx.referenceId,
            tx.targetId,
            `${normalizedTargetType}-${details.length + 1}`,
          ),
        ),
        targetTypeLabel: formatTargetTypeLabel(normalizedTargetType),
        statusLabel: formatStatusLabel(latestStatus),
        amount: absAmount,
        createdAt: tx.createdAt ?? tx.paymentTime ?? tx.updatedAt,
      });
    }

    const daysInMonth = selectedMonth.daysInMonth();
    const trendRows =
      mode === "day"
        ? hourlyBuckets
        : mode === "month"
          ? Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              return {
                day,
                label: String(day).padStart(2, "0"),
                deposit: depositByDay.get(day) ?? 0,
                withdraw: withdrawByDay.get(day) ?? 0,
              };
            })
          : Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              return {
                month,
                label: `T${month}`,
                deposit: depositByMonth.get(month) ?? 0,
                withdraw: withdrawByMonth.get(month) ?? 0,
              };
            });

    const detailRows = details
      .sort(
        (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf(),
      )
      .slice(0, 12);

    return {
      depositTotal,
      withdrawTotal,
      netFlow: depositTotal - withdrawTotal,
      transactionCount,
      trendRows,
      detailRows,
    };
  }, [transactions, mode, selectedDate, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!expandedLotKey) return;
    const exists = parkingStats.rows.some(
      (row) => row.lotKey === expandedLotKey,
    );
    if (!exists) setExpandedLotKey("");
  }, [parkingStats.rows, expandedLotKey]);

  const cycleLabel =
    mode === "day"
      ? selectedDate.format("DD/MM/YYYY")
      : mode === "month"
        ? `Tháng ${selectedMonth.format("MM/YYYY")}`
        : `Năm ${selectedYear.format("YYYY")}`;

  const walletAxis = useMemo(() => {
    const rows = Array.isArray(walletStats.trendRows)
      ? walletStats.trendRows
      : [];
    let maxValue = 0;
    for (const row of rows) {
      const d = Number(row?.deposit ?? 0);
      const w = Number(row?.withdraw ?? 0);
      if (Number.isFinite(d)) maxValue = Math.max(maxValue, d);
      if (Number.isFinite(w)) maxValue = Math.max(maxValue, w);
    }

    const STEP = 10000;
    const MIN_MAX = 30000;
    const axisMax = Math.max(
      MIN_MAX,
      Math.ceil(Math.max(0, maxValue) / STEP) * STEP,
    );
    const ticks = Array.from(
      { length: Math.floor(axisMax / STEP) + 1 },
      (_, i) => i * STEP,
    );
    return { axisMax, ticks };
  }, [walletStats.trendRows]);

  //   const selectedLotLabel =
  //     selectedLotId === "all"
  //       ? "Tất cả bãi xe"
  //       : (lots.find((lot) => String(lot.lotId ?? lot.id ?? "") === selectedLotId)
  //           ?.lotName ??
  //         lots.find((lot) => String(lot.lotId ?? lot.id ?? "") === selectedLotId)
  //           ?.name ??
  //         `Bãi ${selectedLotId}`);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Doanh thu hệ thống
          </h2>
          <p className="text-xs text-slate-500">
            Theo dõi doanh thu dịch vụ và biến động dòng tiền ví toàn hệ thống
          </p>

          <div className="mt-3 inline-flex rounded-xl bg-slate-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab("parking")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                tab === "parking"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Doanh thu giữ xe
            </button>
            <button
              type="button"
              onClick={() => setTab("wallet")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                tab === "wallet"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Giao dịch ví
            </button>
          </div>
        </div>

        <ConfigProvider locale={viVN}>
          <div className="flex flex-wrap items-center gap-2">
            {["day", "month", "year"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {modeLabel(m)}
              </button>
            ))}

            {mode === "day" && (
              <DatePicker
                value={selectedDate}
                onChange={(date) => {
                  if (date) setSelectedDate(date);
                }}
                format="DD/MM/YYYY"
                className="h-9"
              />
            )}

            {mode === "month" && (
              <DatePicker
                picker="month"
                value={selectedMonth}
                onChange={(date) => {
                  if (date) setSelectedMonth(date);
                }}
                format="MM/YYYY"
                className="h-9"
              />
            )}

            {mode === "year" && (
              <DatePicker
                picker="year"
                value={selectedYear}
                onChange={(date) => {
                  if (date) setSelectedYear(date);
                }}
                format="YYYY"
                className="h-9 w-28"
              />
            )}

            <select
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(e.target.value)}
              disabled={tab !== "parking"}
              className={`h-9 min-w-[220px] rounded-lg border px-3 text-sm ${
                tab !== "parking"
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-200 text-slate-700"
              }`}
            >
              <option value="all">Tất cả bãi xe</option>
              {lots.map((lot) => {
                const id = String(lot.lotId ?? lot.id ?? "");
                if (!id) return null;
                return (
                  <option key={id} value={id}>
                    {lot.lotName ?? lot.name ?? `Bãi ${id}`}
                  </option>
                );
              })}
            </select>
          </div>
        </ConfigProvider>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {tab === "parking" ? (
          <>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs text-green-700">Tổng doanh thu giữ xe</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-bold text-green-800">
                <CircleDollarSign className="h-5 w-5" />
                {formatCurrency(parkingStats.totalRevenue)}
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs text-blue-700">Số lượt xe đã gửi</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-bold text-blue-800">
                <Motorbike className="h-5 w-5" />
                {parkingStats.transactionCount.toLocaleString("vi-VN")} Lượt
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs text-green-700">Tổng tiền nạp</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-bold text-green-800">
                <CircleDollarSign className="h-5 w-5" />
                {formatCurrency(walletStats.depositTotal)}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-100 p-4">
              <p className="text-xs text-amber-700">Tổng tiền rút</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-bold text-amber-800">
                <CircleDollarSign className="h-5 w-5" />
                {formatCurrency(walletStats.withdrawTotal)}
              </p>
            </div>
          </>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-600">
            {tab === "parking" ? "Chu kỳ đang xem" : "Dòng tiền ròng"}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-800">
            <CalendarDays className="h-5 w-5" />
            {tab === "parking"
              ? cycleLabel
              : formatCurrency(walletStats.netFlow)}
          </p>
          {/* <p className="mt-1 text-xs text-slate-500">
            Bộ lọc bãi: {selectedLotLabel}
          </p> */}
        </div>
      </div>

      {loading ? (
        <div className="flex h-[300px] items-center justify-center rounded-xl bg-slate-50/70">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : tab === "parking" ? (
        parkingStats.rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            Chưa có dữ liệu doanh thu giữ xe cho bộ lọc này.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="mb-1 text-right text-xs font-medium text-slate-500">
                Đơn vị: VNĐ
              </p>

              {mode === "month" ? (
                <div className="h-[286px]">
                  <ChartContainer
                    config={chartConfigByDay}
                    className="h-full w-full"
                  >
                    <AreaChart
                      data={parkingStats.trendRows}
                      margin={{ top: 12, right: 12, left: -8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        interval={2}
                        fontSize={11}
                      />
                      <YAxis
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        domain={[0, "auto"]}
                        allowDecimals={false}
                        tickFormatter={formatFixedRevenueAxis}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => [
                              formatCurrency(value),
                              "Doanh thu",
                            ]}
                            labelFormatter={(label) => `Ngày ${label}`}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Doanh thu theo ngày"
                        stroke="var(--color-revenue)"
                        fill="var(--color-revenue)"
                        fillOpacity={0.15}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="h-[286px]">
                  <ChartContainer
                    config={chartConfigByDay}
                    className="h-full w-full"
                  >
                    <BarChart
                      data={parkingStats.trendRows}
                      margin={{ top: 12, right: 8, left: -10, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={mode === "year" ? -12 : 0}
                        textAnchor={mode === "year" ? "end" : "middle"}
                        height={mode === "year" ? 56 : 30}
                        fontSize={11}
                        tickFormatter={(value) =>
                          mode === "day" ? formatHourTick(value) : value
                        }
                      />
                      <YAxis
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        domain={[0, "auto"]}
                        allowDecimals={false}
                        tickFormatter={formatFixedRevenueAxis}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            formatter={(value) => [
                              formatCurrency(value),
                              "Doanh thu",
                            ]}
                            labelFormatter={(label) =>
                              mode === "day"
                                ? `Giờ ${label}`
                                : mode === "year"
                                  ? label
                                  : label
                            }
                          />
                        }
                      />
                      <Bar
                        dataKey="revenue"
                        fill="var(--color-revenue)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}
            </div>

            <div className="max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 p-3">
              <div className="space-y-2">
                {parkingStats.rows.map((row) => (
                  <div
                    key={row.lotKey}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLotKey((prev) =>
                            prev === row.lotKey ? "" : row.lotKey,
                          )
                        }
                        className="text-left text-sm font-semibold text-slate-800 hover:text-blue-700"
                      >
                        {row.lotName}
                      </button>
                      <p className="text-sm font-bold text-green-700">
                        {formatCurrency(row.revenue)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {row.transactions.toLocaleString("vi-VN")} lượt thanh toán
                    </p>

                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Tỷ trọng đóng góp</span>
                        <span>{row.contributionPct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{
                            width: `${Math.min(100, row.contributionPct)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {expandedLotKey === row.lotKey && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2">
                        <p className="mb-2 text-xs font-semibold text-slate-700">
                          Chi tiết giao dịch gần đây của {row.lotName}
                        </p>
                        <div className="space-y-1.5">
                          {row.detailRows.map((detail) => (
                            <div
                              key={detail.id}
                              className="grid grid-cols-12 items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs"
                            >
                              <span className="col-span-2 font-medium text-slate-700">
                                {detail.plate}
                              </span>
                              <span className="col-span-2 text-slate-500">
                                {detail.targetTypeLabel}
                              </span>
                              <span className="col-span-3 text-slate-500">
                                {formatTransactionTime(detail.createdAt)}
                              </span>
                              <span
                                className={`col-span-2 rounded-full px-2 py-0.5 text-center ${
                                  detail.statusLabel === "Thất bại"
                                    ? "bg-amber-100 text-amber-700"
                                    : detail.statusLabel === "Chờ thanh toán"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-green-100 text-green-700"
                                }`}
                              >
                                {detail.statusLabel}
                              </span>
                              <span className="col-span-3 text-right font-semibold text-slate-800">
                                {formatCurrency(detail.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : walletStats.transactionCount === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
          Chưa có dữ liệu nạp/rút ví cho bộ lọc này.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-1 text-right text-xs font-medium text-slate-500">
              Đơn vị: VNĐ
            </p>
            <div className="h-[286px]">
              <ChartContainer
                config={chartConfigWalletFlow}
                className="h-full w-full"
              >
                <LineChart
                  data={walletStats.trendRows}
                  margin={{ top: 12, right: 12, left: -8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    tickLine={false}
                    axisLine={false}
                    interval={mode === "day" ? 3 : 2}
                    fontSize={11}
                  />
                  <YAxis
                    stroke="#64748b"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    domain={[0, walletAxis.axisMax]}
                    ticks={walletAxis.ticks}
                    allowDecimals={false}
                    tickFormatter={formatFixedRevenueAxis}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [
                          formatCurrency(value),
                          name === "deposit" ? "Nạp ví" : "Rút tiền",
                        ]}
                        labelFormatter={(label) =>
                          mode === "day"
                            ? `Giờ ${label}`
                            : mode === "month"
                              ? `Ngày ${label}`
                              : `Tháng ${label.replace("T", "")}`
                        }
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="deposit"
                    name="Nạp ví"
                    stroke="var(--color-deposit)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="withdraw"
                    name="Rút tiền"
                    stroke="var(--color-withdraw)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">
              Giao dịch ví gần đây trong kỳ
            </p>
            <div className="mb-2 grid grid-cols-12 items-center gap-2 px-2 text-[11px] font-semibold text-slate-400">
              <span className="col-span-3">Loại giao dịch</span>
              <span className="col-span-4">Thời gian</span>
              <span className="col-span-2 text-center">Trạng thái</span>
              <span className="col-span-3 text-right">Số tiền</span>
            </div>
            <div className="space-y-1.5">
              {walletStats.detailRows.map((detail) => (
                <div
                  key={detail.id}
                  className="grid grid-cols-12 items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs"
                >
                  <span className="col-span-3 font-medium text-slate-700">
                    {detail.targetTypeLabel}
                  </span>
                  <span className="col-span-4 text-slate-500">
                    {formatTransactionTime(detail.createdAt)}
                  </span>
                  <span
                    className={`col-span-2 rounded-full px-2 py-0.5 text-center ${
                      detail.statusLabel === "Thất bại"
                        ? "bg-amber-100 text-amber-700"
                        : detail.statusLabel === "Chờ thanh toán"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {detail.statusLabel}
                  </span>
                  <span className="col-span-3 text-right font-semibold text-slate-800">
                    {formatCurrency(detail.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemRevenueWidget;
