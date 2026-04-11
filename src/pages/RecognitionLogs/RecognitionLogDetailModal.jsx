import { ScrollText, X } from "lucide-react";
import {
  formatConfidence,
  formatDateTime,
  formatProcessingTime,
  getRecognitionTypeLabel,
  parseResultData,
} from "./recognitionLogsUtils";

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
    </div>
  );
}

function formatSource(rawSource, recognitionType) {
  const source = String(rawSource ?? "")
    .trim()
    .toLowerCase();
  const type = String(recognitionType ?? "")
    .trim()
    .toLowerCase();

  if (source.includes("checkout") || type.includes("checkout")) {
    return "Check-Out";
  }

  if (source.includes("checkin") || type.includes("checkin")) {
    return "Check-In";
  }

  return "—";
}

function RecognitionLogDetailModal({ log, onClose }) {
  if (!log) return null;

  const parsedResult = parseResultData(log?.resultData);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-4 sm:py-8">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-[96vw] max-w-5xl bg-white border border-gray-200 shadow-2xl rounded-none sm:rounded-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        <div>
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70">
            <div className="flex items-center gap-3 pr-8">
              <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <ScrollText className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Chi tiết nhật ký nhận diện
              </h2>
            </div>
          </div>

          <div className="space-y-4 px-5 pb-5 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              <Field label="Biển số" value={log?.licensePlate || "—"} />
              <Field
                label="Loại nhận diện"
                value={getRecognitionTypeLabel(log?.recognitionType)}
              />
              <Field label="Bãi xe" value={log?.lotName || "—"} />
              <Field
                label="Độ tin cậy"
                value={formatConfidence(log?.confidenceScore)}
              />
              <Field
                label="Thời gian xử lý"
                value={formatProcessingTime(
                  log?.processingTimeMs,
                  log?.resultData,
                )}
              />
              <Field
                label="Thời gian tạo"
                value={formatDateTime(log?.createdAt)}
              />
              <Field
                label="Nguồn"
                value={formatSource(parsedResult?.source, log?.recognitionType)}
              />
              <Field
                label="Biển số nhận diện"
                value={parsedResult?.detectedPlate || "—"}
              />
            </div>

            <div className="border-t border-gray-100" />

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
              <div className="rounded-xl border border-gray-200 p-2.5">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Ảnh đầu vào
                </p>
                {log?.inputImageUrl ? (
                  <a href={log.inputImageUrl} target="_blank" rel="noreferrer">
                    <img
                      src={log.inputImageUrl}
                      alt="Ảnh đầu vào"
                      className="h-full w-full rounded-lg border border-gray-100 object-contain bg-gray-50"
                    />
                  </a>
                ) : (
                  <div className="h-60 w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                    Chưa có hình ảnh
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecognitionLogDetailModal;
