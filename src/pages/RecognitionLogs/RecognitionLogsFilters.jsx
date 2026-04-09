import { RefreshCw, Search } from "lucide-react";
import { RECOGNITION_TYPE_OPTIONS } from "./recognitionLogsConstants";

function RecognitionLogsFilters({
  searchTerm,
  onSearchChange,
  recognitionTypeFilter,
  onRecognitionTypeChange,
  lotFilter,
  onLotChange,
  lotOptions,
  onReset,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Tìm theo biển số, mã log, mã phiên..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input pl-10 w-full text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">
            Loại nhận diện
          </label>
          <select
            value={recognitionTypeFilter}
            onChange={(e) => onRecognitionTypeChange(e.target.value)}
            className="input text-sm"
          >
            <option value="">Tất cả loại nhận diện</option>
            {RECOGNITION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Bãi xe</label>
          <select
            value={lotFilter}
            onChange={(e) => onLotChange(e.target.value)}
            className="input text-sm"
          >
            <option value="">Tất cả bãi</option>
            {lotOptions.map((lot) => (
              <option key={lot.value} value={lot.value}>
                {lot.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          onClick={onReset}
          type="button"
          className="btn btn-secondary text-sm flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Xóa bộ lọc
        </button>
      </div>
    </div>
  );
}

export default RecognitionLogsFilters;
