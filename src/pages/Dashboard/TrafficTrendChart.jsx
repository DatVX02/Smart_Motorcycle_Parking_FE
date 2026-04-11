import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

function TrafficTrendChart({ data = [], loading = false }) {
  const hasData = data.some((item) => item.inCount > 0 || item.outCount > 0);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Lưu lượng xe vào/ra theo giờ
          </h2>
          <p className="text-xs text-slate-500">
            So sánh theo khung giờ trong ngày để bố trí nhân sự trực cổng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <ArrowUpCircle className="h-3.5 w-3.5" />
            Vào
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            <ArrowDownCircle className="h-3.5 w-3.5" />
            Ra
          </span>
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
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient
                  id="trafficOutGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.03} />
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
                stroke="#059669"
                fill="url(#trafficInGradient)"
                strokeWidth={2.2}
                name="inCount"
              />
              <Area
                type="monotone"
                dataKey="outCount"
                stroke="#0284c7"
                fill="url(#trafficOutGradient)"
                strokeWidth={2.2}
                name="outCount"
              />
            </AreaChart>
          </ResponsiveContainer>

          {!hasData && (
            <p className="mt-3 text-sm text-slate-500">
              Chưa có dữ liệu giao dịch trong hôm nay. Biểu đồ sẽ tự cập nhật
              khi có xe vào/ra.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default TrafficTrendChart;
