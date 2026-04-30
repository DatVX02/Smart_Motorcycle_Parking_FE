import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";

function normalizeOccupancyData(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
  if (arr.length === 0) return [];
  return arr.map((item) => ({
    time: item.time ?? item.hour ?? `${item.label ?? item.x ?? ""}h`,
    vehicles: Number(item.vehicles ?? item.count ?? item.value ?? 0),
  }));
}

function OccupancyChart({ data: rawData, loading }) {
  const chartData =
    rawData && rawData.length > 0
      ? normalizeOccupancyData(rawData)
      : [
          { time: "6h", vehicles: 0 },
          { time: "9h", vehicles: 0 },
          { time: "12h", vehicles: 0 },
          { time: "15h", vehicles: 0 },
          { time: "18h", vehicles: 0 },
          { time: "21h", vehicles: 0 },
          { time: "24h", vehicles: 0 },
        ];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
          <BarChart3 className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Mức độ sử dụng bãi gửi xe
          </h2>
          <p className="text-xs text-slate-500">Số xe theo giờ</p>
        </div>
      </div>
      {loading ? (
        <div className="flex h-[300px] items-center justify-center rounded-xl bg-slate-50/50">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            <span className="text-sm text-slate-500">Đang tải...</span>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="time"
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
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value) => [`${value} xe`, "Số lượng"]}
              labelStyle={{ color: "#64748b" }}
            />
            <Bar dataKey="vehicles" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default OccupancyChart;
