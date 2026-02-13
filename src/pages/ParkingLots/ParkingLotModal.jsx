import { useState } from "react";
import { X } from "lucide-react";

function ParkingLotModal({ lot, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: lot?.name || "",
    location: lot?.location || "",
    totalSpots: lot?.totalSpots || 0,
    gates: lot?.gates || 1,
    cameras: lot?.cameras || 1,
    status: lot?.status || "active",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {lot ? "Chỉnh sửa bãi đỗ" : "Thêm bãi đỗ mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên bãi đỗ
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vị trí
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tổng số chỗ đỗ
            </label>
            <input
              type="number"
              value={formData.totalSpots}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalSpots: parseInt(e.target.value),
                })
              }
              className="input"
              min="1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số cổng
              </label>
              <input
                type="number"
                value={formData.gates}
                onChange={(e) =>
                  setFormData({ ...formData, gates: parseInt(e.target.value) })
                }
                className="input"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số camera
              </label>
              <input
                type="number"
                value={formData.cameras}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cameras: parseInt(e.target.value),
                  })
                }
                className="input"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="input"
            >
              <option value="active">Hoạt động</option>
              <option value="inactive">Không hoạt động</option>
              <option value="maintenance">Bảo trì</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{lot ? "Đang cập nhật..." : "Đang thêm..."}</span>
                </span>
              ) : (
                <span>{lot ? "Cập nhật" : "Thêm mới"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ParkingLotModal;
