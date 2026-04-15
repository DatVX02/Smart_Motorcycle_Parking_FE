import { Camera, Eye, Motorbike, Receipt } from "lucide-react";
import RecognitionLogStatCard from "./RecognitionLogStatCard";

function RecognitionLogsStats({ loading, stats }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`recognition-stats-skeleton-${i}`}
            className="bg-white rounded-3xl border p-6 shadow flex items-center gap-3 animate-pulse"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-8 bg-gray-100 rounded w-16" />
              <div className="h-4 bg-gray-100 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <RecognitionLogStatCard
        icon={Receipt}
        iconColor="text-blue-600"
        label="Tổng bản ghi"
        value={Number(stats.totalItems).toLocaleString("vi-VN")}
        valueSuffix="Bản ghi"
      />
      <RecognitionLogStatCard
        icon={Eye}
        iconColor="text-green-600"
        label="Độ tin cậy trung bình"
        value={Number(stats.avgConfidence).toFixed(2)}
        valueSuffix="%"
      />
      <RecognitionLogStatCard
        icon={Camera}
        iconColor="text-green-600"
        label="Khuôn mặt vào"
        value={Number(stats.faceCheckIn).toLocaleString("vi-VN")}
        valueSuffix="Bản ghi"
        bgTint="bg-green-500/30"
      />
      <RecognitionLogStatCard
        icon={Camera}
        iconColor="text-cyan-600"
        label="Khuôn mặt ra"
        value={Number(stats.faceCheckOut).toLocaleString("vi-VN")}
        valueSuffix="Bản ghi"
        bgTint="bg-cyan-500/30"
      />
      <RecognitionLogStatCard
        icon={Motorbike}
        iconColor="text-blue-600"
        label="Biển số vào"
        value={Number(stats.plateCheckIn).toLocaleString("vi-VN")}
        valueSuffix="Bản ghi"
        bgTint="bg-blue-500/30"
      />
      <RecognitionLogStatCard
        icon={Motorbike}
        iconColor="text-purple-600"
        label="Biển số ra"
        value={Number(stats.plateCheckOut).toLocaleString("vi-VN")}
        valueSuffix="Bản ghi"
        bgTint="bg-purple-500/30"
      />
    </div>
  );
}

export default RecognitionLogsStats;
