import { useState } from "react";
import { X } from "lucide-react";

function RewardModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    action: "add",
    points: 0,
    reason: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      userId: user.id,
      ...formData,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Điều chỉnh điểm thưởng
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Người dùng</p>
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-600 mt-2">Điểm hiện tại</p>
            <p className="text-2xl font-bold text-primary-600">
              {user.points} điểm
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hành động
            </label>
            <select
              value={formData.action}
              onChange={(e) =>
                setFormData({ ...formData, action: e.target.value })
              }
              className="input"
              required
            >
              <option value="add">Cộng điểm</option>
              <option value="subtract">Trừ điểm</option>
              <option value="set">Đặt điểm</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điểm
            </label>
            <input
              type="number"
              value={formData.points}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  points: parseInt(e.target.value) || 0,
                })
              }
              className="input"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lý do
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              className="input"
              rows="3"
              placeholder="Nhập lý do điều chỉnh..."
              required
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Điểm sau khi điều chỉnh</p>
            <p className="text-2xl font-bold text-blue-600">
              {formData.action === "add"
                ? user.points + formData.points
                : formData.action === "subtract"
                ? Math.max(0, user.points - formData.points)
                : formData.points}{" "}
              điểm
            </p>
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
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RewardModal;
