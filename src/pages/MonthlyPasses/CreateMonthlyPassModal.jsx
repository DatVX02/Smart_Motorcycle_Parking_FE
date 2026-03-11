import { useState, useEffect } from "react";
import { X, MapPin, Package, FileText, Calendar, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import monthlyPassService from "../../services/monthlyPassService";
import parkingLotService from "../../services/parkingLotService";

function CreateMonthlyPassModal({ onClose, onSuccess, parkingLots, editingPkg }) {
  const isEdit = !!editingPkg;
  const [lotId, setLotId] = useState(editingPkg?.lotId ?? editingPkg?._lotId ?? "");
  const [packageName, setPackageName] = useState(editingPkg?.packageName ?? editingPkg?.name ?? "");
  const [description, setDescription] = useState(editingPkg?.description ?? "");
  const [monthCount, setMonthCount] = useState(editingPkg?.monthCount ?? 1);
  const [price, setPrice] = useState(
    editingPkg?.price != null ? parseInt(editingPkg.price, 10).toLocaleString("vi-VN") : "",
  );
  const [loading, setLoading] = useState(false);
  const [lotOptions, setLotOptions] = useState([]);

  useEffect(() => {
    if (editingPkg) {
      setLotId(editingPkg.lotId ?? editingPkg._lotId ?? "");
      setPackageName(editingPkg.packageName ?? editingPkg.name ?? "");
      setDescription(editingPkg.description ?? "");
      setMonthCount(editingPkg.monthCount ?? 1);
      setPrice(
        editingPkg.price != null ? parseInt(editingPkg.price, 10).toLocaleString("vi-VN") : "",
      );
    }
  }, [editingPkg]);

  useEffect(() => {
    if (parkingLots?.length) {
      setLotOptions(parkingLots);
      if (!isEdit && !lotId && parkingLots[0]) {
        setLotId(parkingLots[0].id ?? parkingLots[0].lotId ?? "");
      }
    } else {
      let cancelled = false;
      (async () => {
        try {
          const lots = await parkingLotService.getAllParkingLots();
          if (cancelled) return;
          setLotOptions(Array.isArray(lots) ? lots : []);
          if (!isEdit && lots?.[0]) {
            setLotId(lots[0].id ?? lots[0].lotId ?? "");
          }
        } catch {
          if (!cancelled) setLotOptions([]);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [parkingLots, lotId, isEdit]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (!lotId) {
      toast.error("Vui lòng chọn bãi đỗ xe");
      return;
    }
    if (!packageName?.trim()) {
      toast.error("Vui lòng nhập tên gói");
      return;
    }
    const monthNum = parseInt(monthCount, 10);
    if (isNaN(monthNum) || monthNum <= 0) {
      toast.error("Số tháng phải lớn hơn 0");
      return;
    }
    const priceNum = parseInt(String(price).replace(/\D/g, ""), 10);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Vui lòng nhập giá hợp lệ");
      return;
    }

    const payload = {
      lotId,
      packageName: packageName.trim(),
      description: (description || "").trim(),
      monthCount: monthNum,
      price: priceNum,
    };

    setLoading(true);
    try {
      if (isEdit && editingPkg?.id) {
        await monthlyPassService.update(editingPkg.id, payload);
        toast.success("Đã cập nhật gói vé tháng thành công");
      } else {
        await monthlyPassService.create(payload);
        toast.success("Đã tạo gói vé tháng thành công");
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.title ??
        err?.message ??
        (isEdit ? "Không thể cập nhật gói vé tháng" : "Không thể tạo gói vé tháng");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatPriceInput = (val) => {
    const num = String(val).replace(/\D/g, "");
    if (!num) return "";
    return parseInt(num, 10).toLocaleString("vi-VN");
  };

  const handlePriceChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setPrice(raw ? formatPriceInput(raw) : "");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-lg overflow-hidden">
        {/* Header - đồng bộ với trang chính */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? "Cập nhật gói vé tháng" : "Tạo gói vé tháng"}
            </h2>
            <p className="text-sm text-gray-500">
              {isEdit ? "Chỉnh sửa thông tin gói ưu đãi" : "Thêm gói ưu đãi mới cho bãi đỗ xe"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Bãi đỗ xe */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Bãi đỗ xe
            </label>
            <select
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              <option value="">-- Chọn bãi đỗ xe --</option>
              {lotOptions.map((lot) => (
                <option key={lot.id ?? lot.lotId} value={lot.id ?? lot.lotId}>
                  {lot.name ?? lot.lotName ?? "Bãi xe"}
                </option>
              ))}
            </select>
          </div>

          {/* Tên gói */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Tên gói
            </label>
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="VD: Gói 3 tháng"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Gói ưu đãi 3 tháng đậu xe miễn phí"
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Số tháng & Giá */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Số tháng
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={monthCount}
                onChange={(e) => setMonthCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Giá (VNĐ)
              </label>
              <input
                type="text"
                value={price}
                onChange={handlePriceChange}
                placeholder="600000"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 btn btn-secondary rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 btn btn-primary rounded-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {isEdit ? "Đang cập nhật..." : "Đang tạo..."}
                </>
              ) : isEdit ? (
                "Cập nhật"
              ) : (
                "Tạo gói vé tháng"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateMonthlyPassModal;
