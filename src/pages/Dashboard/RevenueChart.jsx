import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function RevenueChart() {
  const data = [
    { name: "T2", revenue: 4.2 },
    { name: "T3", revenue: 5.1 },
    { name: "T4", revenue: 4.8 },
    { name: "T5", revenue: 6.3 },
    { name: "T6", revenue: 7.9 },
    { name: "T7", revenue: 9.2 },
    { name: "CN", revenue: 8.5 },
  ];

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Doanh thu 7 ngày qua
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
            }}
            formatter={(value) => [`${value}M VND`, "Doanh thu"]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#0ea5e9"
            strokeWidth={3}
            dot={{ fill: "#0ea5e9", r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RevenueChart;
