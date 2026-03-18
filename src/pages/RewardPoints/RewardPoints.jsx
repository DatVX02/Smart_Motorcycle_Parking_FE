import { useState, useEffect, useCallback } from "react";
import {
  Award,
  Settings,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import LoyaltyConfigModal from "./LoyaltyConfigModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import loyaltyConfigService from "../../services/loyaltyConfigService";
import parkingLotService from "../../services/parkingLotService";

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (num) =>
  num != null ? Number(num).toLocaleString("vi-VN") : "—";

function RewardPoints() {
  const [configs, setConfigs] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterIsActive, setFilterIsActive] = useState("");
  const [filterLotId, setFilterLotId] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState({ open: false, config: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const fetchLots = useCallback(async () => {
    try {
      const data = await parkingLotService.getAllParkingLots();
      setLots(data);
    } catch {
      // lots are optional for filtering
    }
  }, []);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterIsActive !== "") params.isActive = filterIsActive === "true";
      if (filterLotId) params.lotId = filterLotId;
      const data = await loyaltyConfigService.getAll(params);
      setConfigs(data);
    } catch (err) {
      showToast(err?.response?.data?.message || "Không thể tải danh sách cấu hình.", "error");
    } finally {
      setLoading(false);
    }
  }, [filterIsActive, filterLotId]);

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const getLotId = (lot) => lot.lotId ?? lot.id;
  const getLotLabel = (lot) => lot.lotName ?? lot.name ?? getLotId(lot);

  const getLotName = (lotId) => {
    const lot = lots.find((l) => getLotId(l) === lotId);
    return lot ? getLotLabel(lot) : lotId || "—";
  };

  const handleCreate = () => {
    setSelectedConfig(null);
    setShowModal(true);
  };

  const handleEdit = (config) => {
    setSelectedConfig(config);
    setShowModal(true);
  };

  const handleSave = async (payload) => {
    if (selectedConfig) {
      await loyaltyConfigService.update(selectedConfig.id || selectedConfig.configId, payload);
      showToast("Cập nhật cấu hình thành công.");
    } else {
      await loyaltyConfigService.create(payload);
      showToast("Thêm cấu hình điểm thưởng thành công.");
    }
    setShowModal(false);
    fetchConfigs();
  };

  const handleDeleteClick = (config) => {
    setConfirmDelete({ open: true, config });
  };

  const handleConfirmDelete = async () => {
    const { config } = confirmDelete;
    setDeleteLoading(true);
    try {
      await loyaltyConfigService.delete(config.id || config.configId);
      showToast("Đã xóa cấu hình điểm thưởng.");
      setConfirmDelete({ open: false, config: null });
      fetchConfigs();
    } catch (err) {
      showToast(err?.response?.data?.message || "Xóa thất bại, vui lòng thử lại.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const activeCount = configs.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{configs.length}</p>
              <p className="text-sm text-gray-600">Tổng cấu hình</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-sm text-gray-600">Đang hoạt động</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{lots.length}</p>
              <p className="text-sm text-gray-600">Bãi đỗ xe</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header & Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Cấu hình điểm thưởng
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchConfigs}
              className="btn btn-secondary btn-sm flex items-center space-x-1"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Làm mới</span>
            </button>
            <button
              onClick={handleCreate}
              className="btn btn-primary btn-sm flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm mới</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filterLotId}
            onChange={(e) => setFilterLotId(e.target.value)}
            className="input sm:w-52"
          >
            <option value="">Tất cả bãi xe</option>
            {lots.map((lot) => {
              const id = getLotId(lot);
              return (
                <option key={id} value={id}>
                  {getLotLabel(lot)}
                </option>
              );
            })}
          </select>

          <select
            value={filterIsActive}
            onChange={(e) => setFilterIsActive(e.target.value)}
            className="input sm:w-44"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Không hoạt động</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Đang tải...</span>
            </div>
          ) : configs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Award className="w-12 h-12 mb-3" />
              <p className="text-base font-medium">Chưa có cấu hình nào</p>
              <p className="text-sm">Nhấn &quot;Thêm mới&quot; để tạo cấu hình điểm thưởng đầu tiên.</p>
            </div>
          ) : (
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Bãi đỗ xe</th>
                  <th className="table-header-cell">Điểm / 1.000 VND</th>
                  <th className="table-header-cell">VND / Điểm</th>
                  <th className="table-header-cell">GT vé tháng (VND)</th>
                  <th className="table-header-cell">Ngày bắt đầu</th>
                  <th className="table-header-cell">Ngày kết thúc</th>
                  <th className="table-header-cell">Trạng thái</th>
                  <th className="table-header-cell">Hành động</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {configs.map((config) => {
                  const id = config.id || config.configId;
                  return (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium text-gray-900">
                        {config.lotName || getLotName(config.lotId)}
                      </td>
                      <td className="table-cell text-gray-700">
                        <div className="flex items-center space-x-1">
                          <Award className="w-4 h-4 text-yellow-500" />
                          <span>{formatNumber(config.pointsPer1000vnd)}</span>
                        </div>
                      </td>
                      <td className="table-cell text-gray-700">
                        {formatNumber(config.vndPerPoint)}
                      </td>
                      <td className="table-cell text-gray-700">
                        {formatNumber(config.monthlyPassValue)}
                      </td>
                      <td className="table-cell text-gray-600 text-sm">
                        {formatDate(config.startDate)}
                      </td>
                      <td className="table-cell text-gray-600 text-sm">
                        {formatDate(config.endDate)}
                      </td>
                      <td className="table-cell">
                        {config.isActive ? (
                          <span className="badge bg-green-100 text-green-800 flex items-center space-x-1 w-fit">
                            <CheckCircle className="w-3 h-3" />
                            <span>Hoạt động</span>
                          </span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-600 flex items-center space-x-1 w-fit">
                            <XCircle className="w-3 h-3" />
                            <span>Tắt</span>
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(config)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(config)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <LoyaltyConfigModal
          config={selectedConfig}
          lots={lots}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, config: null })}
        onConfirm={handleConfirmDelete}
        title="Xóa cấu hình điểm thưởng"
        description={
          confirmDelete.config
            ? `Bạn có chắc muốn xóa cấu hình của bãi "${getLotName(confirmDelete.config?.lotId)}" không? Hành động này không thể hoàn tác.`
            : "Bạn có chắc muốn xóa cấu hình này không?"
        }
        confirmLabel="Xóa"
        loading={deleteLoading}
      />
    </div>
  );
}

export default RewardPoints;
