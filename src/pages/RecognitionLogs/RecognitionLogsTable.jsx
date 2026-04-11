import { ChevronLeft, ChevronRight, Clock3, Eye, XCircle } from "lucide-react";
import {
  formatConfidence,
  formatDateTime,
  formatProcessingTime,
  getRecognitionTypeBadgeClass,
  getRecognitionTypeLabel,
} from "./recognitionLogsUtils";

function buildPageNumbers(currentPage, totalPages) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
}

function RecognitionLogsTable({
  logs,
  loading,
  currentPage,
  pageSize,
  totalPages,
  totalItems,
  onPageChange,
  onOpenDetail,
}) {
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-center">
              {[
                "STT",
                "Biển số",
                "Loại nhận diện",
                "Bãi xe",
                "Thời gian tạo",
                "Độ tin cậy",
                "Xử lý",
                "",
              ].map((header) => (
                <th
                  key={header}
                  className="p-3 text-center text-sm font-semibold whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 animate-pulse">
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div
                        className="h-3.5 bg-gray-100 rounded"
                        style={{ width: `${50 + ((j * 17) % 40)}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-300">
                    <XCircle className="w-12 h-12" />
                    <p className="text-gray-400 text-sm font-medium">
                      Không có dữ liệu nhật ký nhận diện
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((item, idx) => {
                return (
                  <tr
                    key={item?.logId ?? `${item?.sessionId ?? "log"}-${idx}`}
                    className={`hover:bg-blue-50/40 transition-colors cursor-default ${
                      idx < logs.length - 1 ? "border-b border-gray-50" : ""
                    }`}
                  >
                    <td className="p-3 text-center text-gray-500 font-semibold">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    <td className="p-3 text-center font-semibold text-gray-900 whitespace-nowrap">
                      {item?.licensePlate || "-"}
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getRecognitionTypeBadgeClass(item?.recognitionType)}`}
                      >
                        {getRecognitionTypeLabel(item?.recognitionType)}
                      </span>
                    </td>

                    <td className="p-3 text-center text-gray-600 min-w-[240px]">
                      <p className="font-medium text-gray-900">
                        {item?.lotName || "-"}
                      </p>
                    </td>

                    <td className="p-3 text-center text-gray-500 whitespace-nowrap">
                      {formatDateTime(item?.createdAt)}
                    </td>

                    <td className="p-3 text-center font-semibold text-gray-900 whitespace-nowrap">
                      {formatConfidence(item?.confidenceScore)}
                    </td>

                    <td className="p-3 text-center text-gray-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="w-4 h-4 text-gray-400" />
                        {formatProcessingTime(
                          item?.processingTimeMs,
                          item?.resultData,
                        )}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => onOpenDetail(item)}
                        className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalItems > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>
              Trang{" "}
              <span className="font-semibold text-gray-700">{currentPage}</span>
              /{" "}
              <span className="font-semibold text-gray-700">{totalPages}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span>
              Tổng{" "}
              <span className="font-semibold text-gray-700">{totalItems}</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-40"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageNumbers.map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  pageNum === currentPage
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-40"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecognitionLogsTable;
