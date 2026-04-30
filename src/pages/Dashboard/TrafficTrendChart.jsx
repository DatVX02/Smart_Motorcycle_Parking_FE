import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function formatBusiestDayLabel(day) {
  const d = String(day ?? "")
    .trim()
    .toLowerCase();
  if (!d) return "";
  const map = {
    sunday: "CN",
    monday: "T2",
    tuesday: "T3",
    wednesday: "T4",
    thursday: "T5",
    friday: "T6",
    saturday: "T7",
  };
  return map[d] ?? String(day);
}

function formatHourLabel(hour) {
  const h = Number(hour ?? 0);
  if (!Number.isFinite(h)) return "";
  return `${String(h).padStart(2, "0")}:00`;
}

function TrafficTrendChart({
  peakData = [],
  inOutData = [],
  peakMeta = null,
  loading = false,
}) {
  const hasPeakData = peakData.some(
    (item) => Number(item?.sessionCount ?? 0) > 0,
  );
  const hasInOutData = inOutData.some(
    (item) => Number(item?.inCount ?? 0) > 0 || Number(item?.outCount ?? 0) > 0,
  );

  const [viewMode, setViewMode] = useState(() =>
    hasPeakData ? "peak" : "inout",
  ); // peak | inout

  // Cho phép user gạt qua lại dù dữ liệu của mode đó đang rỗng
  // (sẽ hiển thị empty-state), nên không auto-redirect viewMode nữa.

  const data = viewMode === "peak" ? peakData : inOutData;
  const hasData = viewMode === "peak" ? hasPeakData : hasInOutData;

  const headerTitle =
    viewMode === "peak"
      ? "Lưu lượng xe theo giờ"
      : "Lưu lượng xe vào/ra theo giờ";

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {headerTitle}
          </h2>
          {viewMode === "peak" && peakMeta ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {Number.isFinite(Number(peakMeta?.peakHour)) ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">
                  Giờ cao điểm: {formatHourLabel(peakMeta.peakHour)}
                </span>
              ) : null}
              {Array.isArray(peakMeta?.busiestDays) &&
              peakMeta.busiestDays.length ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700">
                  Ngày bận nhất:{" "}
                  {peakMeta.busiestDays
                    .map(formatBusiestDayLabel)
                    .filter(Boolean)
                    .join(", ")}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("peak")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                viewMode === "peak"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Tổng lưu lượng
            </button>
            <button
              type="button"
              onClick={() => setViewMode("inout")}
              className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                viewMode === "inout"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Chi tiết xe vào/ra
            </button>
          </div>

          {viewMode === "inout" ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <ArrowUpCircle className="h-3.5 w-3.5" />
                Vào
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <ArrowDownCircle className="h-3.5 w-3.5" />
                Ra
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex h-[320px] items-center justify-center rounded-xl bg-slate-50/70">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm text-slate-500">
              Đang tải dữ liệu lưu lượng...
            </span>
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={320}>
            {viewMode === "peak" ? (
              <BarChart
                data={data}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.12)",
                  }}
                  labelStyle={{ color: "#334155", fontWeight: 600 }}
                  formatter={(value) => [`${value} lượt`, "Lượt xe"]}
                />
                <Bar
                  dataKey="sessionCount"
                  fill="#0ea5e9"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            ) : (
              <AreaChart
                data={data}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id="trafficInGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop
                      offset="100%"
                      stopColor="#f59e0b"
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                  <linearGradient
                    id="trafficOutGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop
                      offset="100%"
                      stopColor="#10b981"
                      stopOpacity={0.03}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.12)",
                  }}
                  labelStyle={{ color: "#334155", fontWeight: 600 }}
                  formatter={(value, name) => {
                    if (name === "inCount") return [`${value} lượt`, "Xe vào"];
                    if (name === "outCount") return [`${value} lượt`, "Xe ra"];
                    return [value, name];
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === "inCount" ? "Xe vào" : "Xe ra"
                  }
                />

                <Area
                  type="monotone"
                  dataKey="inCount"
                  stroke="#f59e0b"
                  fill="url(#trafficInGradient)"
                  strokeWidth={2.2}
                  name="inCount"
                />
                <Area
                  type="monotone"
                  dataKey="outCount"
                  stroke="#10b981"
                  fill="url(#trafficOutGradient)"
                  strokeWidth={2.2}
                  name="outCount"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>

          {!hasData && (
            <p className="mt-3 text-sm text-slate-500">
              {viewMode === "peak"
                ? "Chưa có dữ liệu giờ cao điểm cho bộ lọc hiện tại."
                : "Chưa có dữ liệu xe vào/ra trong hôm nay. Biểu đồ sẽ tự cập nhật khi có xe vào/ra."}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default TrafficTrendChart;
