import { useState, useEffect } from "react";
import { X, MapPin, ParkingCircle, Camera, DoorOpen, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import parkingLotService from "../../services/parkingLotService";

function ParkingLotDetailModal({ lot, onClose }) {
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState(null);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    if (lot?.id) fetchDetailData();
  }, [lot?.id]);

  const fetchDetailData = async () => {
    try {
      setLoading(true);
      const [detail, stats] = await Promise.all([
        parkingLotService.getParkingLotDetail(lot.id),
        parkingLotService.getParkingLotStatistics(lot.id),
      ]);
      setDetailData(detail);
      setStatistics(stats);
    } catch (error) {
      toast.error("Không thể tải thông tin chi tiết");
      console.error("Error fetching detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const occupancyRate = lot.totalSpots
    ? ((lot.occupiedSpots / lot.totalSpots) * 100).toFixed(1)
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{lot.name}</h2>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {lot.location}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Status Badge */}
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  lot.status === "active"
                    ? "bg-green-100 text-green-700"
                    : lot.status === "inactive"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {lot.status === "active"
                  ? "Hoạt động"
                  : lot.status === "inactive"
                  ? "Không hoạt động"
                  : "Bảo trì"}
              </span>
            </div>

            {/* Occupancy Rate */}
            <div className="card bg-gradient-to-br from-primary-50 to-primary-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Tỷ lệ sử dụng
                </h3>
                <span className="text-2xl font-bold text-primary-600">
                  {occupancyRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${
                    occupancyRate > 80
                      ? "bg-red-500"
                      : occupancyRate > 50
                      ? "bg-orange-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${occupancyRate}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                <span>
                  {lot.occupiedSpots} / {lot.totalSpots} chỗ đang sử dụng
                </span>
                <span>{lot.totalSpots - lot.occupiedSpots} chỗ còn trống</span>
              </div>
            </div>

            {/* Infrastructure Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Cơ sở hạ tầng
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card bg-blue-50">
                  <ParkingCircle className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {lot.totalSpots}
                  </p>
                  <p className="text-sm text-gray-600">Tổng chỗ đỗ</p>
                </div>
                <div className="card bg-green-50">
                  <ParkingCircle className="w-8 h-8 text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {lot.totalSpots - lot.occupiedSpots}
                  </p>
                  <p className="text-sm text-gray-600">Còn trống</p>
                </div>
                <div className="card bg-purple-50">
                  <DoorOpen className="w-8 h-8 text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {lot.gates}
                  </p>
                  <p className="text-sm text-gray-600">Cổng</p>
                </div>
                <div className="card bg-orange-50">
                  <Camera className="w-8 h-8 text-orange-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {lot.cameras}
                  </p>
                  <p className="text-sm text-gray-600">Camera</p>
                </div>
              </div>
            </div>

            {/* Statistics - GET /api/v1/parking-lots/{id}/statistics */}
            {statistics && Object.keys(statistics).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Thống kê
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(statistics.todayVehicles ?? statistics.totalVehicles ?? statistics.vehicleCount) != null && (
                    <div className="card bg-indigo-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            Số lượt xe
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {statistics.todayVehicles ?? statistics.totalVehicles ?? statistics.vehicleCount}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-indigo-600" />
                      </div>
                    </div>
                  )}
                  {(statistics.todayRevenue ?? statistics.revenue ?? statistics.totalRevenue) != null && (
                    <div className="card bg-green-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            Doanh thu
                          </p>
                          <p className="text-2xl font-bold text-gray-900">
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(statistics.todayRevenue ?? statistics.revenue ?? statistics.totalRevenue ?? 0)}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Details */}
            {detailData && detailData.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Mô tả
                </h3>
                <p className="text-gray-600">{detailData.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="btn btn-secondary">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParkingLotDetailModal;
