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
  PowerOff,
  Power,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import monthlyPassService from "../../services/monthlyPassService";
import parkingLotService from "../../services/parkingLotService";
import CreateMonthlyPassModal from "./CreateMonthlyPassModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function MonthlyPassPackages() {
  const [packages, setPackages] = useState([]);
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [expandedLotIds, setExpandedLotIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    pkg: null,
  });
  const [togglingId, setTogglingId] = useState(null);

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
            const items = await monthlyPassService
              .getByLotId(id)
              .catch(() => []);
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

  const handleToggleActive = async (pkg) => {
    const pkgId = pkg?.id ?? pkg?.packageId;
    if (!pkgId) return;
    const newActive = !(pkg.isActive !== false);
    setTogglingId(pkgId);
    try {
      await monthlyPassService.update(pkgId, { isActive: newActive });
      toast.success(
        newActive ? "Đã kích hoạt gói vé tháng" : "Đã vô hiệu hóa gói vé tháng",
      );
      fetchData();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          "Không thể cập nhật trạng thái gói vé tháng",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    const pkg = confirmDelete.pkg;
    const pkgId = pkg?.id ?? pkg?.packageId;
    if (!pkgId) return;
    try {
      await monthlyPassService.delete(pkgId);
      toast.success("Đã xóa gói vé tháng");
      setConfirmDelete({ open: false, pkg: null });
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Không thể xóa gói vé tháng");
    }
  };

  const toggleLotExpand = (lotId) => {
    setExpandedLotIds((prev) => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  };

  const formatPrice = (val) => {
    const n = parseInt(val, 10);
    return isNaN(n) ? "—" : n.toLocaleString("vi-VN") + " VNĐ";
  };

  return (
    <div className="space-y-10">
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

      {/* Thẻ thống kê — style giống Quản lý bãi xe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            label: "Tổng gói vé tháng",
            value: packages.length,
            unit: "Gói",
            Icon: Ticket,
            iconColor: "text-blue-600",
            bgTint: "bg-white",
          },
          {
            label: "Bãi có gói vé",
            value: new Set(packages.map((p) => p._lotId ?? p.lotId)).size,
            unit: "Bãi",
            Icon: MapPin,
            iconColor: "text-blue-600",
            bgTint: "bg-blue-500/30",
          },
          {
            label: "Gói đang hoạt động",
            value: packages.filter((p) => p.isActive !== false).length,
            unit: "Gói",
            Icon: Package,
            iconColor: "text-green-600",
            bgTint: "bg-green-500/30",
          },
        ].map(({ label, value, unit, Icon, iconColor, bgTint }) => (
          <div
            key={label}
            className={`rounded-3xl p-6 shadow border ${bgTint}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-8 h-8 flex-shrink-0 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {label}
                </p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                  {value}
                  <span className="text-base font-medium text-gray-600">
                    {unit}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Danh sách bãi xe — click để dropdown các gói vé tháng */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <RefreshCw className="w-10 h-10 animate-spin mb-3" />
            <p>Đang tải danh sách gói vé tháng...</p>
          </div>
        ) : parkingLots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
              <MapPin className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Chưa có bãi xe
            </h3>
            <p className="text-gray-500 text-sm">
              Thêm bãi xe trước khi tạo gói vé tháng
            </p>
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
              <Ticket className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Chưa có gói vé tháng
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Tạo gói vé tháng đầu tiên để bắt đầu
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-2 rounded-2xl"
            >
              <Plus className="w-4 h-4" />
              Tạo gói vé tháng
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {parkingLots
              .filter((lot) =>
                packages.some(
                  (p) => (p._lotId ?? p.lotId) === (lot.id ?? lot.lotId),
                ),
              )
              .map((lot) => {
                const lotId = lot.id ?? lot.lotId;
                const lotPackages = packages.filter(
                  (p) => (p._lotId ?? p.lotId) === lotId,
                );
                const isExpanded = expandedLotIds.has(lotId);
                const lotName = lot.name ?? lot.lotName;

                return (
                  <div key={lotId} className="bg-white">
                    {/* Header bãi xe — click để expand/collapse */}
                    <button
                      type="button"
                      onClick={() => toggleLotExpand(lotId)}
                      className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      )}
                      <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-900">
                          {lotName}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({lotPackages.length} gói vé)
                        </span>
                      </div>
                    </button>

                    {/* Dropdown: danh sách gói vé tháng */}
                    {isExpanded && (
                      <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-5">
                        {lotPackages.length === 0 ? (
                          <p className="text-gray-500 text-sm py-2">
                            Chưa có gói vé tháng cho bãi này
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {lotPackages.map((pkg, index) => (
                              <div
                                key={
                                  pkg.id ??
                                  pkg.packageId ??
                                  `pkg-${lotId}-${index}`
                                }
                                className="group bg-white rounded-xl border border-gray-200 p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-200"
                              >
                                <div className="flex items-start justify-between mb-4">
                                  <span
                                    className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold ${
                                      pkg.isActive !== false
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-200 text-gray-600"
                                    }`}
                                  >
                                    {pkg.isActive !== false
                                      ? "Đang bán"
                                      : "Tạm dừng"}
                                  </span>
                                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleToggleActive(pkg)}
                                      disabled={
                                        togglingId ===
                                        (pkg?.id ?? pkg?.packageId)
                                      }
                                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                        pkg.isActive !== false
                                          ? "text-amber-600 hover:bg-amber-50"
                                          : "text-emerald-600 hover:bg-emerald-50"
                                      }`}
                                      title={
                                        pkg.isActive !== false
                                          ? "Vô hiệu hóa gói"
                                          : "Kích hoạt gói"
                                      }
                                    >
                                      {togglingId ===
                                      (pkg?.id ?? pkg?.packageId) ? (
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                      ) : pkg.isActive !== false ? (
                                        <PowerOff className="w-5 h-5" />
                                      ) : (
                                        <Power className="w-5 h-5" />
                                      )}
                                    </button>
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
                                  {pkg.packageName ??
                                    pkg.name ??
                                    "Gói vé tháng"}
                                </h3>
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
                                    <p className="text-sm text-gray-500">
                                      / gói
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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

export default MonthlyPassPackages;
