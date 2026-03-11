import { useState, useEffect } from "react";
import {
  Ticket,
  Plus,
  MapPin,
  Package,
  Calendar,
  RefreshCw,
  Edit,
  Trash2,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import monthlyPassService from "../../services/monthlyPassService";
import parkingLotService from "../../services/parkingLotService";
import CreateMonthlyPassModal from "./CreateMonthlyPassModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function MonthlyPasses() {
  const [packages, setPackages] = useState([]);
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [filterLotId, setFilterLotId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState({ open: false, pkg: null });

  const fetchData = async () => {
    try {
      setLoading(true);
      const lots = await parkingLotService.getAllParkingLots();
      const lotsArray = Array.isArray(lots) ? lots : [];
      setParkingLots(lotsArray);

      let pkgs = [];
      if (lotsArray.length > 0) {
        const byLot = await Promise.all(
          lotsArray.map(async (lot) => {
            const id = lot.id ?? lot.lotId;
            const items = await monthlyPassService.getByLotId(id).catch(() => []);
            return (items || []).map((p) => ({
              ...p,
              _lotName: lot.name ?? lot.lotName,
              _lotId: id,
            }));
          }),
        );
        pkgs = byLot.flat();
      }
      setPackages(pkgs);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? "Không thể tải danh sách gói vé tháng",
      );
      setPackages([]);
      setParkingLots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = (pkg) => setConfirmDelete({ open: true, pkg });

  const handleConfirmDelete = async () => {
    const pkg = confirmDelete.pkg;
    if (!pkg?.id) return;
    try {
      await monthlyPassService.delete(pkg.id);
      toast.success("Đã xóa gói vé tháng");
      setConfirmDelete({ open: false, pkg: null });
      fetchData();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? "Không thể xóa gói vé tháng",
      );
    }
  };

  const filteredPackages = filterLotId
    ? packages.filter((p) => (p._lotId ?? p.lotId) === filterLotId)
    : packages;

  const formatPrice = (val) => {
    const n = parseInt(val, 10);
    return isNaN(n) ? "—" : n.toLocaleString("vi-VN") + " VNĐ";
  };

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex justify-end items-center">
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-3 rounded-2xl"
        >
          <Plus className="w-4 h-4" />
          Tạo gói vé tháng
        </button>
      </div>

      {/* Stats - giống trang quản lý bãi đỗ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-8 shadow border">
          <div className="flex items-center gap-5">
            <Ticket className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-3xl font-bold text-gray-900">{packages.length}</p>
              <p className="text-gray-500">Tổng gói vé tháng</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow border">
          <div className="flex items-center gap-5">
            <MapPin className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {new Set(packages.map((p) => p._lotId ?? p.lotId)).size}
              </p>
              <p className="text-gray-500">Bãi có gói vé</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow border">
          <div className="flex items-center gap-5">
            <Package className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-3xl font-bold text-green-600">
                {packages.filter((p) => p.isActive !== false).length}
              </p>
              <p className="text-gray-500">Gói đang hoạt động</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      {parkingLots.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterLotId}
            onChange={(e) => setFilterLotId(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white"
          >
            <option value="">Tất cả bãi xe</option>
            {parkingLots.map((lot) => (
              <option key={lot.id ?? lot.lotId} value={lot.id ?? lot.lotId}>
                {lot.name ?? lot.lotName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Package list */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <RefreshCw className="w-10 h-10 animate-spin mb-3" />
            <p>Đang tải danh sách gói vé tháng...</p>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Ticket className="w-8 h-8 text-slate-400" />
            </div>
            <p className="font-medium text-slate-600">Chưa có gói vé tháng</p>
            <p className="text-sm mt-1">Tạo gói vé tháng đầu tiên để bắt đầu</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition-colors"
            >
              Tạo gói vé tháng
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
            {filteredPackages.map((pkg, index) => (
              <div
                key={pkg.id ?? pkg.packageId ?? `pkg-${(pkg._lotId ?? pkg.lotId) ?? "lot"}-${index}`}
                className="group bg-white rounded-lg border border-gray-200 p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-500 hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between mb-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold ${
                      pkg.isActive !== false
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {pkg.isActive !== false ? "Đang bán" : "Tạm dừng"}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingPkg(pkg)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Sửa"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {pkg.packageName ?? pkg.name ?? "Gói vé tháng"}
                </h3>
                <p className="text-base text-gray-500 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  {pkg._lotName ?? "—"}
                </p>
                {pkg.description && (
                  <p className="text-base text-gray-600 mb-4 line-clamp-2">
                    {pkg.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-gray-600">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="text-base font-semibold">
                      {pkg.monthCount ?? 1} tháng
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {formatPrice(pkg.price)}
                    </p>
                    <p className="text-sm text-gray-500">/ gói</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(showCreateModal || editingPkg) && (
        <CreateMonthlyPassModal
          parkingLots={parkingLots}
          editingPkg={editingPkg}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPkg(null);
          }}
          onSuccess={() => {
            fetchData();
            setEditingPkg(null);
          }}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, pkg: null })}
        onConfirm={handleConfirmDelete}
        title="Xóa gói vé tháng"
        description={`Bạn có chắc muốn xóa gói "${confirmDelete.pkg?.packageName ?? confirmDelete.pkg?.name ?? ""}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
      />
    </div>
  );
}

export default MonthlyPasses;
