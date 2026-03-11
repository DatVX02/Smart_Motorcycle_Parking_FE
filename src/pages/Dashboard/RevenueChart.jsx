import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function normalizeRevenueData(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
  if (arr.length === 0) return [];
  return arr.map((item) => ({
    name:
      item.name ??
      item.label ??
      DAY_LABELS[item.day ?? item.weekday ?? 0] ??
      item.date ??
      "",
    revenue: Number(
      item.revenue ?? item.value ?? item.amount ?? item.total ?? 0,
    ),
  }));
}

function RevenueChart({ data: rawData, loading }) {
  const chartData =
    rawData && rawData.length > 0
      ? normalizeRevenueData(rawData)
      : [
          { name: "T2", revenue: 0 },
          { name: "T3", revenue: 0 },
          { name: "T4", revenue: 0 },
          { name: "T5", revenue: 0 },
          { name: "T6", revenue: 0 },
          { name: "T7", revenue: 0 },
          { name: "CN", revenue: 0 },
        ];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
          <span className="text-lg font-bold text-blue-600">$</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Doanh thu 7 ngày qua
          </h2>
          <p className="text-xs text-slate-500">Million VNĐ</p>
        </div>
      </div>
      {loading ? (
        <div className="flex h-[300px] items-center justify-center rounded-xl bg-slate-50/50">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm text-slate-500">Đang tải...</span>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value) => [`${value}M VND`, "Doanh thu"]}
              labelStyle={{ color: "#64748b" }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#0ea5e9"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default RevenueChart;
