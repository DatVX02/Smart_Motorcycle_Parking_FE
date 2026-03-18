import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";

const toLocalDatetimeValue = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function LoyaltyConfigModal({ config, lots, onClose, onSave }) {
  const isEdit = Boolean(config);

  const [formData, setFormData] = useState({
    lotId: config?.lotId || (lots?.[0]?.lotId ?? lots?.[0]?.id ?? ""),
    pointsPer1000Vnd: config?.pointsPer1000vnd ?? config?.pointsPer1000Vnd ?? 0,
    vndPerPoint: config?.vndPerPoint ?? 0,
    monthlyPassValue: config?.monthlyPassValue ?? 0,
    isActive: config?.isActive ?? true,
    startDate: toLocalDatetimeValue(config?.startDate) || "",
    endDate: toLocalDatetimeValue(config?.endDate) || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!formData.lotId && lots?.length > 0) {
      const firstId = lots[0].lotId ?? lots[0].id ?? "";
      setFormData((prev) => ({ ...prev, lotId: firstId }));
    }
  }, [lots]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.lotId) {
      setError("Vui lòng chọn bãi đỗ xe.");
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError("Vui lòng nhập ngày bắt đầu và kết thúc.");
      return;
    }
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setError("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }

    const payload = {
      lotId: formData.lotId,
      pointsPer1000Vnd: Number(formData.pointsPer1000Vnd),
      vndPerPoint: Number(formData.vndPerPoint),
      monthlyPassValue: Number(formData.monthlyPassValue),
      isActive: formData.isActive,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
    };

    setLoading(true);
    try {
      await onSave(payload);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-auto">
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
              Bãi đỗ xe <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.lotId}
              onChange={(e) => handleChange("lotId", e.target.value)}
              className="input"
              required
            >
              <option value="">-- Chọn bãi đỗ xe --</option>
              {lots?.map((lot) => {
                const id = lot.lotId ?? lot.id ?? "";
                return (
                  <option key={id} value={id}>
                    {lot.lotName ?? lot.name ?? id}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Điểm / 1.000 VNĐ <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.pointsPer1000Vnd}
                onChange={(e) =>
                  handleChange("pointsPer1000Vnd", e.target.value)
                }
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VNĐ / Điểm <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.vndPerPoint}
                onChange={(e) => handleChange("vndPerPoint", e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá trị vé tháng (VNĐ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.monthlyPassValue}
              onChange={(e) => handleChange("monthlyPassValue", e.target.value)}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
                className="input"
                required
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
