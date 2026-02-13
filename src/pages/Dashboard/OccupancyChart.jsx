import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function OccupancyChart() {
  const data = [
    { time: "6h", vehicles: 45 },
    { time: "9h", vehicles: 120 },
    { time: "12h", vehicles: 158 },
    { time: "15h", vehicles: 142 },
    { time: "18h", vehicles: 167 },
    { time: "21h", vehicles: 89 },
    { time: "24h", vehicles: 34 },
  ];

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Mức độ sử dụng bãi đỗ
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
            }}
            formatter={(value) => [`${value} xe`, "Số lượng"]}
          />
          <Bar dataKey="vehicles" fill="#22c55e" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OccupancyChart;
