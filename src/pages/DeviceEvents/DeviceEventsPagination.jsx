import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WINDOW = 5;

/**
 * Cửa sổ tối đa 5 số trang.
 * Có totalPages: giống Quản lý giao dịch.
 * Không có totalPages: chỉ hiện trang đã biết chắc (không vẽ thêm trang 5 nếu thực tế chỉ có 4).
 */
function pageNumbersWindow(currentPage, totalPages, canGoNext) {
  if (totalPages != null && totalPages >= 1) {
    const count = Math.min(WINDOW, totalPages);
    const start = Math.max(
      1,
      Math.min(currentPage - 2, totalPages - (count - 1)),
    );
    return Array.from({ length: count }, (_, i) => start + i);
  }
  /*
   * API không trả tổng trang:
   * - Hết trang sau (đủ ít bản ghi): coi tổng = currentPage → vd trang 4 cuối hiện 1…4.
   * - Còn trang sau: chỉ chắc có tới currentPage+1, không giả định trang 5,6… (tránh hiện 5 khi chỉ có 4 trang).
   */
  if (!canGoNext) {
    const tp = Math.max(1, currentPage);
    const count = Math.min(WINDOW, tp);
    const start = Math.max(1, Math.min(currentPage - 2, tp - (count - 1)));
    return Array.from({ length: count }, (_, i) => start + i);
  }
  const maxKnown = currentPage + 1;
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(start + WINDOW - 1, maxKnown);
  const len = Math.max(1, end - start + 1);
  return Array.from({ length: len }, (_, i) => start + i);
}

/**
 * Thanh phân trang: trái "Trang x / y", phải ◀ [số trang] ▶
 *
 * @param {number} currentPage — trang hiện tại (bắt đầu 1)
 * @param {number|null|undefined} totalPages — tổng số trang; null nếu API không trả tổng
 * @param {(page: number) => void} onPageChange
 * @param {boolean} [loading]
 * @param {boolean} [canGoNext] — bắt buộc khi totalPages == null (còn trang sau)
 */
export default function DeviceEventsPagination({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  canGoNext = false,
}) {
  const pageNums = useMemo(
    () => pageNumbersWindow(currentPage, totalPages, canGoNext),
    [currentPage, totalPages, canGoNext],
  );

  const hasTotal = totalPages != null && totalPages >= 1;
  const bestKnownTotal = hasTotal
    ? totalPages
    : Math.max(currentPage, pageNums.at(-1) ?? currentPage);
  const canPrev = currentPage > 1;
  const canNext = hasTotal ? currentPage < totalPages : Boolean(canGoNext);

  const go = (p) => {
    if (loading) return;
    onPageChange(p);
  };

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>
          Trang{" "}
          <span className="font-semibold text-gray-700">{currentPage}</span> /{" "}
          {bestKnownTotal}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Trang trước"
          onClick={() => go(Math.max(1, currentPage - 1))}
          disabled={!canPrev || loading}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pageNums.map((p) => {
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              disabled={loading}
              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "hover:bg-gray-200 text-gray-700"
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          aria-label="Trang sau"
          onClick={() =>
            go(
              hasTotal
                ? Math.min(totalPages, currentPage + 1)
                : currentPage + 1,
            )
          }
          disabled={!canNext || loading}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
