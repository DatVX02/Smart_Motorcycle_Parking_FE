import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Clock } from "lucide-react";

function normalizePeakHoursData(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
  if (arr.length === 0) return [];
  return arr.map((item) => ({
    hour: item.hour ?? item.time ?? item.label ?? item.x ?? "",
    count: Number(item.count ?? item.value ?? item.sessions ?? 0),
  }));
}

function PeakHoursChart({ data: rawData, loading }) {
  const chartData = rawData && rawData.length > 0 ? normalizePeakHoursData(rawData) : [];

  if (chartData.length === 0 && !loading) return null;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
          <Clock className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Giờ cao điểm
          </h2>
          <p className="text-xs text-slate-500">Lượt xe theo khung giờ</p>
        </div>
      </div>
      {loading ? (
        <div className="flex h-[250px] items-center justify-center rounded-xl bg-slate-50/50">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            <span className="text-sm text-slate-500">Đang tải...</span>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="hour" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value) => [`${value}`, "Số lượng"]}
            />
            <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default PeakHoursChart;
