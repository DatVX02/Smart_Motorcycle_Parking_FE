import { useState } from "react";
import { Calendar, Plus, Edit, Trash2, Clock, User } from "lucide-react";
import ShiftModal from "./ShiftModal";

function Shifts() {
  const [showModal, setShowModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState("current");

  const shifts = [
    {
      id: 1,
      staff: "Trần Thị Staff 1",
      date: "2024-02-03",
      startTime: "06:00",
      endTime: "14:00",
      location: "Bãi đỗ Tòa A",
      gate: "Cổng A1",
      status: "completed",
    },
    {
      id: 2,
      staff: "Lê Văn Staff 2",
      date: "2024-02-03",
      startTime: "14:00",
      endTime: "22:00",
      location: "Bãi đỗ Tòa A",
      gate: "Cổng A1",
      status: "in-progress",
    },
    {
      id: 3,
      staff: "Trần Thị Staff 1",
      date: "2024-02-04",
      startTime: "06:00",
      endTime: "14:00",
      location: "Bãi đỗ Tòa B",
      gate: "Cổng B1",
      status: "scheduled",
    },
    {
      id: 4,
      staff: "Nguyễn Văn Staff 3",
      date: "2024-02-04",
      startTime: "14:00",
      endTime: "22:00",
      location: "Bãi đỗ Tòa B",
      gate: "Cổng B1",
      status: "scheduled",
    },
    {
      id: 5,
      staff: "Lê Văn Staff 2",
      date: "2024-02-05",
      startTime: "06:00",
      endTime: "14:00",
      location: "Bãi đỗ ngoài trời",
      gate: "Cổng C1",
      status: "scheduled",
    },
  ];

  const statusColors = {
    completed: "bg-green-100 text-green-800",
    "in-progress": "bg-blue-100 text-blue-800",
    scheduled: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statusLabels = {
    completed: "Hoàn thành",
    "in-progress": "Đang làm",
    scheduled: "Đã lên lịch",
    cancelled: "Đã hủy",
  };

  const handleEdit = (shift) => {
    setSelectedShift(shift);
    setShowModal(true);
  };

  const handleDelete = (shift) => {
    if (confirm(`Bạn có chắc muốn xóa ca trực này?`)) {
      console.log("Deleting shift:", shift.id);
    }
  };

  const handleAddNew = () => {
    setSelectedShift(null);
    setShowModal(true);
  };

  const todayShifts = shifts.filter((s) => s.date === "2024-02-03").length;
  const scheduledShifts = shifts.filter((s) => s.status === "scheduled").length;
  const activeStaff = new Set(shifts.map((s) => s.staff)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý ca trực</h1>
          <p className="text-gray-600 mt-1">
            Lên lịch và quản lý ca làm việc của nhân viên
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm ca trực</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayShifts}</p>
              <p className="text-sm text-gray-600">Ca trực hôm nay</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {scheduledShifts}
              </p>
              <p className="text-sm text-gray-600">Ca đã lên lịch</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeStaff}</p>
              <p className="text-sm text-gray-600">Nhân viên hoạt động</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-sm text-gray-600">Ca trống</p>
            </div>
          </div>
        </div>
      </div>

      {/* Week Selector */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Lịch làm việc</h2>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="input"
          >
            <option value="current">Tuần hiện tại</option>
            <option value="next">Tuần sau</option>
            <option value="custom">Tùy chỉnh</option>
          </select>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Nhân viên</th>
                <th className="table-header-cell">Ngày</th>
                <th className="table-header-cell">Giờ bắt đầu</th>
                <th className="table-header-cell">Giờ kết thúc</th>
                <th className="table-header-cell">Thời lượng</th>
                <th className="table-header-cell">Vị trí</th>
                <th className="table-header-cell">Cổng</th>
                <th className="table-header-cell">Trạng thái</th>
                <th className="table-header-cell">Hành động</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {shifts.map((shift) => {
                const start = new Date(`2024-01-01 ${shift.startTime}`);
                const end = new Date(`2024-01-01 ${shift.endTime}`);
                const duration = (end - start) / (1000 * 60 * 60);

                return (
                  <tr key={shift.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-semibold text-sm">
                            {shift.staff.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {shift.staff}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{shift.date}</span>
                      </div>
                    </td>
                    <td className="table-cell">{shift.startTime}</td>
                    <td className="table-cell">{shift.endTime}</td>
                    <td className="table-cell">
                      <span className="font-medium text-gray-900">
                        {duration}h
                      </span>
                    </td>
                    <td className="table-cell text-gray-600">
                      {shift.location}
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-info">{shift.gate}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${statusColors[shift.status]}`}>
                        {statusLabels[shift.status]}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(shift)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(shift)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ShiftModal
          shift={selectedShift}
          onClose={() => setShowModal(false)}
          onSave={(data) => {
            console.log("Saving shift:", data);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

export default Shifts;
