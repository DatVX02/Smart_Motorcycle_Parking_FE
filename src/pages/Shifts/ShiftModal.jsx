import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function ShiftModal({ shift, onClose, onSave }) {
  const [formData, setFormData] = useState({
    staff: shift?.staff || "",
    date: shift?.date || "",
    startTime: shift?.startTime || "",
    endTime: shift?.endTime || "",
    location: shift?.location || "",
    gate: shift?.gate || "",
    status: shift?.status || "scheduled",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md my-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {shift ? "Chỉnh sửa ca trực" : "Thêm ca trực mới"}
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
              Nhân viên
            </label>
            <select
              value={formData.staff}
              onChange={(e) =>
                setFormData({ ...formData, staff: e.target.value })
              }
              className="input"
              required
            >
              <option value="">Chọn nhân viên</option>
              <option value="Trần Thị Staff 1">Trần Thị Staff 1</option>
              <option value="Lê Văn Staff 2">Lê Văn Staff 2</option>
              <option value="Nguyễn Văn Staff 3">Nguyễn Văn Staff 3</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giờ bắt đầu
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giờ kết thúc
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vị trí
            </label>
            <select
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              className="input"
              required
            >
              <option value="">Chọn bãi đỗ</option>
              <option value="Bãi đỗ Tòa A">Bãi đỗ Tòa A</option>
              <option value="Bãi đỗ Tòa B">Bãi đỗ Tòa B</option>
              <option value="Bãi đỗ ngoài trời">Bãi đỗ ngoài trời</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cổng
            </label>
            <select
              value={formData.gate}
              onChange={(e) =>
                setFormData({ ...formData, gate: e.target.value })
              }
              className="input"
              required
            >
              <option value="">Chọn cổng</option>
              <option value="Cổng A1">Cổng A1</option>
              <option value="Cổng A2">Cổng A2</option>
              <option value="Cổng B1">Cổng B1</option>
              <option value="Cổng C1">Cổng C1</option>
            </select>
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
              <option value="scheduled">Đã lên lịch</option>
              <option value="in-progress">Đang làm</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              {shift ? "Cập nhật" : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default ShiftModal;
