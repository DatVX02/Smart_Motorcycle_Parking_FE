import { ScrollText } from "lucide-react";
import DeviceEventCard from "./DeviceEventCard";

export default function DeviceEventsList({ loading, filteredLogs }) {
  return (
    <div className="p-4 space-y-3">
      {loading
        ? Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-100 p-5 animate-pulse"
            >
              <div className="h-5 bg-gray-100 rounded w-2/3 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))
        : filteredLogs.map((log) => <DeviceEventCard key={log.id} log={log} />)}

      {!loading && filteredLogs.length === 0 && (
        <div className="py-20 text-center">
          <div className="flex flex-col items-center gap-3 text-gray-300">
            <ScrollText className="w-12 h-12" />
            <p className="text-gray-400 text-sm font-medium">
              Không tìm thấy nhật ký nào
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
