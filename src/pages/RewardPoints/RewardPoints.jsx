import { useState, useEffect, useCallback } from "react";
import {
  Award,
  Settings,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  RefreshCw,
} from "lucide-react";
import { DatePicker, ConfigProvider } from "antd";
import dayjs from "dayjs";
import viVN from "antd/es/locale/vi_VN";
import "dayjs/locale/vi";

dayjs.locale("vi");
import LoyaltyConfigModal from "./LoyaltyConfigModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import loyaltyConfigService from "../../services/loyaltyConfigService";
import parkingLotService from "../../services/parkingLotService";

const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNumber = (num) =>
  num != null ? Number(num).toLocaleString("vi-VN") : "";

function RewardPoints() {
  const [configs, setConfigs] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterIsActive, setFilterIsActive] = useState("");
  const [filterLotId, setFilterLotId] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    config: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
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
      showToast(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể tải danh sách cấu hình điểm thưởng. Vui lòng thử lại.",
        "error",
      );
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
    return lot ? getLotLabel(lot) : lotId || "";
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
      await loyaltyConfigService.update(
        selectedConfig.id || selectedConfig.configId,
        payload,
      );
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
      showToast(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể xóa cấu hình điểm thưởng. Vui lòng thử lại.",
        "error",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  /* Lọc client-side theo search và khoảng thời gian */
  const displayedConfigs = (() => {
    let list = [...configs];
    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase();
      list = list.filter((c) => {
        const name = (c.lotName || getLotName(c.lotId) || "").toLowerCase();
        return name.includes(q);
      });
    }
    if (fromDate || toDate) {
      const from = fromDate ? fromDate.startOf("day").toDate() : null;
      const to = toDate ? toDate.endOf("day").toDate() : null;
      list = list.filter((c) => {
        const start = c.startDate ? new Date(c.startDate) : null;
        const end = c.endDate ? new Date(c.endDate) : null;
        if (!start && !end) return true;
        const configStart = start || new Date(0);
        const configEnd = end || new Date(9999, 11, 31);
        if (from && configEnd < from) return false;
        if (to && configStart > to) return false;
        return true;
      });
    }
    return list;
  })();

  const activeCount = displayedConfigs.filter((c) => c.isActive).length;

  const handleResetFilters = () => {
    setFilterSearch("");
    setFilterLotId("");
    setFilterIsActive("");
    setFromDate(null);
    setToDate(null);
  };

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

      {/* Statistics — Tiêu đề trên, số + đơn vị dưới, icon & text gần nhau */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow border">
          <div className="flex items-center gap-4">
            <Settings className="w-8 h-8 flex-shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Tổng cấu hình
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {displayedConfigs.length}
                <span className="text-base font-medium text-gray-600">
                  Cấu hình
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="bg-green-500/30 rounded-3xl p-6 shadow border">
          <div className="flex items-center gap-4">
            <CheckCircle className="w-8 h-8 flex-shrink-0 text-green-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Đang hoạt động
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {activeCount}
                <span className="text-base font-medium text-gray-600">
                  Cấu hình
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="bg-amber-500/30 rounded-3xl p-6 shadow border">
          <div className="flex items-center gap-4">
            <Award className="w-8 h-8 flex-shrink-0 text-yellow-500" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Tổng bãi xe
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {lots.length}
                <span className="text-base font-medium text-gray-600">
                  Bãi xe
                </span>
              </p>
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
              onClick={handleCreate}
              className="btn btn-primary btn-sm flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm mới</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo tên bãi xe..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="input pl-10 w-full text-sm"
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs font-medium text-gray-500">
                Bãi xe
              </label>
              <select
                value={filterLotId}
                onChange={(e) => setFilterLotId(e.target.value)}
                className="input text-sm w-full"
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
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs font-medium text-gray-500">
                Trạng thái
              </label>
              <select
                value={filterIsActive}
                onChange={(e) => setFilterIsActive(e.target.value)}
                className="input text-sm w-full"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Không hoạt động</option>
              </select>
            </div>

            <ConfigProvider locale={viVN}>
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs font-medium text-gray-500">
                  Từ ngày
                </label>
                <DatePicker
                  value={fromDate}
                  onChange={setFromDate}
                  format="DD/MM/YY"
                  placeholder="dd/mm/yy"
                  className="w-150 text-sm [&.ant-picker]:rounded-lg [&.ant-picker]:border-gray-300 [&.ant-picker]:w-full [&.ant-picker]:min-w-0"
                />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs font-medium text-gray-500">
                  Đến ngày
                </label>
                <DatePicker
                  value={toDate}
                  onChange={setToDate}
                  format="DD/MM/YY"
                  placeholder="dd/mm/yy"
                  className="w-full text-sm [&.ant-picker]:rounded-lg [&.ant-picker]:border-gray-300 [&.ant-picker]:w-full [&.ant-picker]:min-w-0"
                />
              </div>
            </ConfigProvider>

            <button
              onClick={handleResetFilters}
              className="btn btn-secondary text-sm flex items-center gap-1.5 col-span-2 lg:col-span-1 justify-center lg:justify-start"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
          </div>
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
          ) : displayedConfigs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Award className="w-12 h-12 mb-3" />
              <p className="text-base font-medium">
                {configs.length === 0
                  ? "Chưa có cấu hình nào"
                  : "Không tìm thấy cấu hình phù hợp với bộ lọc"}
              </p>
              <p className="text-sm">
                {configs.length === 0
                  ? 'Nhấn "Thêm mới" để tạo cấu hình điểm thưởng đầu tiên.'
                  : "Thử điều chỉnh hoặc xóa bộ lọc để xem thêm kết quả."}
              </p>
            </div>
          ) : (
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">STT</th>
                  <th className="table-header-cell">Bãi gửi xe</th>
                  <th className="table-header-cell !text-right">
                    <span className="block">Tỷ lệ tích điểm</span>
                    <span className="block text-xs font-normal text-gray-500">
                      (/1.000 VNĐ)
                    </span>
                  </th>
                  <th className="table-header-cell !text-right">
                    <span className="block">Giá trị quy đổi</span>
                    <span className="block text-xs font-normal text-gray-500">
                      (1 điểm = … VNĐ)
                    </span>
                  </th>
                  <th className="table-header-cell">Ngày bắt đầu</th>
                  <th className="table-header-cell">Ngày kết thúc</th>
                  <th className="table-header-cell">Trạng thái</th>
                  <th className="table-header-cell">Hành động</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {displayedConfigs.map((config, idx) => {
                  const id = config.id || config.configId;
                  return (
                    <tr key={id} className="hover:bg-gray-50">
                      <td className="p-3 text-center text-gray-500 font-semibold w-12">
                        {idx + 1}
                      </td>
                      <td className="p-3 text-center font-medium text-gray-900">
                        {config.lotName || getLotName(config.lotId)}
                      </td>
                      <td className="p-3 text-right text-gray-700">
                        <div className="flex items-center justify-end gap-1">
                          <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          <span>{formatNumber(config.pointsPer1000vnd)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-gray-700">
                        {formatNumber(config.vndPerPoint)}
                      </td>
                      <td className="p-3 text-center text-gray-600 text-sm whitespace-nowrap">
                        {formatDate(config.startDate)}
                      </td>
                      <td className="p-3 text-center text-gray-600 text-sm whitespace-nowrap">
                        {formatDate(config.endDate)}
                      </td>
                      <td className="p-3 text-center">
                        {config.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            <XCircle className="w-3 h-3" />
                            Ngừng hoạt động
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
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
          existingConfigs={configs}
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
            ? `Bạn có chắc chắn muốn xóa cấu hình của bãi "${getLotName(confirmDelete.config?.lotId)}" không? Việc này sẽ ảnh hưởng đến việc tích điểm hiện tại. Hành động không thể hoàn tác.`
            : "Bạn có chắc chắn muốn xóa cấu hình này không? Việc này sẽ ảnh hưởng đến việc tích điểm hiện tại. Hành động không thể hoàn tác."
        }
        confirmLabel="Xóa"
        loading={deleteLoading}
      />
    </div>
  );
}

export default RewardPoints;
