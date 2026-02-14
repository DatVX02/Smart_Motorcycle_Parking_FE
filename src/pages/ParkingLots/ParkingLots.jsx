import { useState, useEffect } from "react";
import {
  ParkingCircle,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import ParkingLotModal from "./ParkingLotModal";
import ParkingLotDetailModal from "./ParkingLotDetailModal";
import parkingLotService from "../../services/parkingLotService";

function ParkingLots() {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch parking lots on component mount
  useEffect(() => {
    fetchParkingLots();
  }, [refreshKey]);

  // Transform backend data to UI format
  const transformParkingLot = (lot) => ({
    id: lot.lotId || lot.id,
    name: lot.lotName || lot.name,
    location: lot.fullAddress || lot.location,
    totalSpots: lot.totalCapacity || lot.totalSpots || 0,
    occupiedSpots: lot.currentOccupancy || lot.occupiedSpots || 0,
    gates: lot.gates || 1,
    status: lot.status?.toLowerCase() || "active",
    cameras: lot.cameras || 1,
  });

  const fetchParkingLots = async (showToast = false) => {
    try {
      setLoading(true);
      const data = await parkingLotService.getAllParkingLots();

      // Ensure data is an array and transform it
      const parkingLotsArray = Array.isArray(data) ? data : [];
      const transformedData = parkingLotsArray.map(transformParkingLot);

      console.log("Transformed parking lots:", transformedData);
      setParkingLots(transformedData);

      if (showToast) {
        toast.success("Đã tải danh sách bãi đỗ xe");
      }
    } catch (error) {
      toast.error("Không thể tải danh sách bãi đỗ xe");
      console.error("Error fetching parking lots:", error);
      setParkingLots([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lot) => {
    setSelectedLot(lot);
    setShowModal(true);
  };

  const handleDelete = async (lot) => {
    if (confirm(`Bạn có chắc muốn xóa bãi đỗ "${lot.name}"?`)) {
      try {
        await parkingLotService.deleteParkingLot(lot.id);
        toast.success(`Đã xóa bãi đỗ "${lot.name}" thành công`);
        setRefreshKey((prev) => prev + 1); // Trigger re-fetch
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Không thể xóa bãi đỗ xe";
        toast.error(errorMessage);
        console.error("Error deleting parking lot:", error);
      }
    }
  };

  const handleAddNew = () => {
    setSelectedLot(null);
    setShowModal(true);
  };

  const handleSave = async (formData) => {
    try {
      if (selectedLot) {
        // Update existing parking lot
        await parkingLotService.updateParkingLot(selectedLot.id, formData);
        toast.success("Đã cập nhật bãi đỗ xe thành công");
      } else {
        // Create new parking lot
        await parkingLotService.createParkingLot(formData);
        toast.success("Đã thêm bãi đỗ xe mới thành công");
      }
      setShowModal(false);
      setRefreshKey((prev) => prev + 1); // Trigger re-fetch
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        `Không thể ${selectedLot ? "cập nhật" : "tạo"} bãi đỗ xe`;
      toast.error(errorMessage);
      console.error("Error saving parking lot:", error);
    }
  };

  const handleViewDetail = (lot) => {
    setSelectedLot(lot);
    setShowDetailModal(true);
  };

  // Calculate statistics
  const totalLots = parkingLots.length;
  const totalSpots = parkingLots.reduce(
    (sum, lot) => sum + (lot.totalSpots || 0),
    0,
  );
  const totalOccupied = parkingLots.reduce(
    (sum, lot) => sum + (lot.occupiedSpots || 0),
    0,
  );
  const totalAvailable = totalSpots - totalOccupied;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Quản lý bãi đỗ xe
          </h1>
          <p className="text-gray-600 mt-1">
            Theo dõi và quản lý các bãi đỗ xe
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchParkingLots(true)}
            className="btn btn-secondary flex items-center space-x-2"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={handleAddNew}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Thêm bãi đỗ</span>
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ParkingCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalLots}</p>
              <p className="text-sm text-gray-600">Tổng bãi đỗ</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalSpots}</p>
              <p className="text-sm text-gray-600">Tổng chỗ đỗ</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <ParkingCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {totalOccupied}
              </p>
              <p className="text-sm text-gray-600">Đang sử dụng</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ParkingCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {totalAvailable}
              </p>
              <p className="text-sm text-gray-600">Còn trống</p>
            </div>
          </div>
        </div>
      </div>

      {/* Parking Lots Grid */}
      {parkingLots.length === 0 ? (
        <div className="card text-center py-12">
          <ParkingCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Chưa có bãi đỗ xe nào
          </h3>
          <p className="text-gray-600 mb-4">
            Bắt đầu bằng cách thêm bãi đỗ xe đầu tiên của bạn
          </p>
          <button
            onClick={handleAddNew}
            className="btn btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Thêm bãi đỗ</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parkingLots.map((lot) => {
            const occupancyRate = (lot.occupiedSpots / lot.totalSpots) * 100;
            const availableSpots = lot.totalSpots - lot.occupiedSpots;

            return (
              <div
                key={lot.id}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <ParkingCircle className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {lot.name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {lot.location}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Occupancy Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Tỷ lệ sử dụng</span>
                    <span className="font-semibold text-gray-900">
                      {occupancyRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        occupancyRate > 80
                          ? "bg-red-500"
                          : occupancyRate > 50
                            ? "bg-orange-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${occupancyRate}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {lot.totalSpots}
                    </p>
                    <p className="text-xs text-gray-600">Tổng chỗ</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {availableSpots}
                    </p>
                    <p className="text-xs text-gray-600">Còn trống</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {lot.gates}
                    </p>
                    <p className="text-xs text-gray-600">Cổng</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {lot.cameras}
                    </p>
                    <p className="text-xs text-gray-600">Camera</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleViewDetail(lot)}
                    className="flex-1 btn btn-secondary flex items-center justify-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Xem</span>
                  </button>
                  <button
                    onClick={() => handleEdit(lot)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(lot)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <ParkingLotModal
          lot={selectedLot}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLot && (
        <ParkingLotDetailModal
          lot={selectedLot}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}

export default ParkingLots;
