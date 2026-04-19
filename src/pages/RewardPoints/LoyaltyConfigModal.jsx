import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Calendar } from "lucide-react";
import { format, parseISO, isValid, isBefore, isEqual } from "date-fns";

const DISPLAY_FORMAT = "dd/MM/yyyy HH:mm";
const STORAGE_FORMAT = "yyyy-MM-dd'T'HH:mm";

/** Hiển thị giá trị YYYY-MM-DDTHH:mm thành dd/MM/yyyy HH:mm */
const formatForDisplay = (val) => {
  if (!val) return "";
  try {
    const d = typeof val === "string" ? parseISO(val) : new Date(val);
    return isValid(d) ? format(d, DISPLAY_FORMAT) : "";
  } catch {
    return "";
  }
};

/** Parse dd/MM/yyyy HH:mm hoặc dd-MM-yyyy HH:mm thành ISO */
const parseFromDisplay = (str) => {
  if (!str || !str.trim()) return "";
  const s = str.trim();
  const match = s.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{2})$/,
  );
  if (!match) return "";
  const [, dd, mm, yyyy, hh, min] = match;
  const d = new Date(+yyyy, +mm - 1, +dd, +hh, +min);
  return isValid(d) ? format(d, STORAGE_FORMAT) : "";
};

/** Parse formatted string (vi-VN: 10.000 hoặc 1,5) về số */
const parseFormattedNumber = (s) => {
  if (s == null || s === "") return null;
  const str = String(s).trim();
  if (!str) return null;
  const hasComma = str.includes(",");
  let cleaned;
  if (hasComma) {
    const [intPart, decPart] = str.split(",");
    cleaned = (intPart || "0").replace(/\./g, "") + "." + (decPart || "0");
  } else {
    cleaned = str.replace(/\./g, "");
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

/** Format số thành chuỗi có dấu phân cách (vi-VN) */
const formatNumberInput = (n) => {
  if (n == null || n === "") return "";
  const num = typeof n === "number" ? n : parseFormattedNumber(n);
  return num != null ? Number(num).toLocaleString("vi-VN") : "";
};

/** Format số tiền có hậu tố VNĐ */
const formatMoneyInput = (n) => {
  const formatted = formatNumberInput(n);
  return formatted ? `${formatted} VNĐ` : "";
};

/** Chuyển ISO string hoặc Date sang giá trị nội bộ (YYYY-MM-DDTHH:mm) */
const toDateTimeLocalValue = (val) => {
  if (!val) return "";
  try {
    const d = typeof val === "string" ? parseISO(val) : new Date(val);
    return isValid(d) ? format(d, STORAGE_FORMAT) : "";
  } catch {
    return "";
  }
};

/** Input chọn ngày giờ - hiển thị dd/MM/yyyy HH:mm */
function DateTimeInput({ value, onChange, placeholder = "dd/mm/yy" }) {
  const inputRef = useRef(null);
  const [display, setDisplay] = useState(() => formatForDisplay(value));

  useEffect(() => {
    setDisplay(formatForDisplay(value));
  }, [value]);

  const handleOpenPicker = () => {
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === "function") {
        inputRef.current.showPicker();
      } else {
        inputRef.current.click();
      }
    }
  };

  const handleNativeChange = (e) => {
    const v = e.target.value;
    onChange(v);
  };

  const handleBlur = () => {
    if (display !== formatForDisplay(value)) {
      if (!display.trim()) {
        onChange("");
      } else {
        const parsed = parseFromDisplay(display);
        if (parsed) onChange(parsed);
        else setDisplay(formatForDisplay(value));
      }
    }
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        onBlur={handleBlur}
        onClick={handleOpenPicker}
        placeholder={placeholder}
        className="input w-full pr-10"
      />
      <input
        ref={inputRef}
        type="datetime-local"
        value={value}
        onChange={handleNativeChange}
        className="sr-only"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={handleOpenPicker}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
        title="Chọn ngày giờ"
      >
        <Calendar className="w-4 h-4" />
      </button>
    </div>
  );
}

function LoyaltyConfigModal({
  config,
  lots,
  existingConfigs = [],
  onClose,
  onSave,
}) {
  const isEdit = Boolean(config);
  const availableLots = lots ?? [];
  const currentConfigId = config?.id ?? config?.configId ?? null;

  const initNum = (val) =>
    val != null && val !== "" ? formatNumberInput(Number(val)) : "";
  const initMoney = (val) =>
    val != null && val !== "" ? formatMoneyInput(Number(val)) : "";

  const [formData, setFormData] = useState({
    lotId: config?.lotId ?? config?.parkingLotId ?? "",
    pointsPer1000Vnd: initNum(
      config?.pointsPer1000vnd ?? config?.pointsPer1000Vnd,
    ),
    vndPerPoint: initMoney(config?.vndPerPoint),
    isActive: config?.isActive ?? true,
    startDate: toDateTimeLocalValue(config?.startDate),
    endDate: toDateTimeLocalValue(config?.endDate),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!formData.lotId && availableLots.length > 0) {
      const firstId = availableLots[0].lotId ?? availableLots[0].id ?? "";
      setFormData((prev) => ({ ...prev, lotId: firstId }));
    }
  }, [availableLots, formData.lotId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field, rawValue, withMoneySuffix = false) => {
    const parsed = parseFormattedNumber(rawValue);
    const formatter = withMoneySuffix ? formatMoneyInput : formatNumberInput;
    const display =
      rawValue === "" || rawValue === null
        ? ""
        : parsed != null
          ? formatter(parsed)
          : rawValue;
    setFormData((prev) => ({ ...prev, [field]: display }));
  };

  const handleNumberBlur = (field, withMoneySuffix = false) => {
    const val = formData[field];
    if (val === "" || val == null) return;
    const parsed = parseFormattedNumber(val);
    if (parsed != null) {
      const formatter = withMoneySuffix ? formatMoneyInput : formatNumberInput;
      setFormData((prev) => ({ ...prev, [field]: formatter(parsed) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.lotId) {
      setError("Vui lòng chọn bãi gửi xe.");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError("Vui lòng nhập ngày bắt đầu và kết thúc.");
      return;
    }
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (!isValid(start) || !isValid(end)) {
      setError("Ngày không hợp lệ.");
      return;
    }
    if (isBefore(end, start) || isEqual(end, start)) {
      setError("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }

    /* Check trùng khoảng thời gian với cấu hình khác của cùng bãi xe */
    const selectedLotId = String(formData.lotId);
    const overlapped = existingConfigs.find((c) => {
      const cId = c.id ?? c.configId ?? null;
      if (cId && cId === currentConfigId) return false;
      const cLotId = String(c.lotId ?? c.parkingLotId ?? "");
      if (cLotId !== selectedLotId) return false;
      if (!c.startDate || !c.endDate) return false;
      const cStart = new Date(c.startDate);
      const cEnd = new Date(c.endDate);
      if (!isValid(cStart) || !isValid(cEnd)) return false;
      return start <= cEnd && cStart <= end;
    });
    if (overlapped) {
      const fmt = (d) =>
        format(new Date(d), "dd/MM/yyyy HH:mm");
      setError(
        `Khoảng thời gian bị trùng với cấu hình đã có (${fmt(overlapped.startDate)} - ${fmt(overlapped.endDate)}). Vui lòng chọn khoảng thời gian khác.`,
      );
      return;
    }

    const pts = parseFormattedNumber(formData.pointsPer1000Vnd);
    const vnd = parseFormattedNumber(formData.vndPerPoint);
    if (pts == null || pts <= 0) {
      setError("Vui lòng nhập tỷ lệ tích điểm (số > 0).");
      return;
    }
    if (vnd == null || vnd <= 0) {
      setError("Vui lòng nhập giá trị quy đổi (số > 0).");
      return;
    }

    const lotIdVal = String(formData.lotId).trim();
    const payload = {
      lotId: lotIdVal,
      parkingLotId: lotIdVal,
      pointsPer1000Vnd: pts,
      vndPerPoint: vnd,
      monthlyPassValue: 0,
      isActive: formData.isActive,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
    };

    setLoading(true);
    try {
      await onSave(payload);
    } catch (err) {
      const errData = err?.response?.data;
      const msg =
        errData?.message ??
        errData?.title ??
        (errData?.errors && typeof errData.errors === "object"
          ? Object.entries(errData.errors)
              .map(([k, v]) => `${k}: ${[].concat(v).join(", ")}`)
              .join(" | ")
          : null) ??
        err?.message ??
        "Có lỗi xảy ra, vui lòng thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit
              ? "Chỉnh sửa cấu hình điểm thưởng"
              : "Thêm cấu hình điểm thưởng"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bãi gửi xe <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.lotId}
              onChange={(e) => handleChange("lotId", e.target.value)}
              className="input"
              required
            >
              <option value="">-- Chọn bãi gửi xe --</option>
              {availableLots.map((lot) => {
                const id = lot.lotId ?? lot.id ?? "";
                const label = lot.lotName ?? lot.name ?? id;
                return (
                  <option key={id} value={id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tỷ lệ tích điểm (Điểm / 1.000VNĐ){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Nhập số điểm..."
                value={formData.pointsPer1000Vnd}
                onChange={(e) =>
                  handleNumberChange("pointsPer1000Vnd", e.target.value)
                }
                onBlur={() => handleNumberBlur("pointsPer1000Vnd")}
                className="input mt-auto"
              />
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giá trị quy đổi (VNĐ / 1 điểm){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ví dụ: 1.000 VNĐ"
                value={formData.vndPerPoint}
                onChange={(e) =>
                  handleNumberChange("vndPerPoint", e.target.value, true)
                }
                onBlur={() => handleNumberBlur("vndPerPoint", true)}
                className="input mt-auto"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <DateTimeInput
                value={formData.startDate}
                onChange={(v) => handleChange("startDate", v)}
                placeholder="dd/mm/yy"
              />
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <DateTimeInput
                value={formData.endDate}
                onChange={(v) => handleChange("endDate", v)}
                placeholder="dd/mm/yy"
              />
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded"
              />
              <label
                htmlFor="isActive"
                className="text-sm font-medium text-gray-700"
              >
                Đang hoạt động
              </label>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </span>
              ) : isEdit ? (
                "Cập nhật"
              ) : (
                "Thêm mới"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export default LoyaltyConfigModal;
