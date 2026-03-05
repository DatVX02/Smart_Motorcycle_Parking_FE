import { useState, useEffect } from "react";
import {
  ParkingCircle,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  DoorOpen,
  Camera,
} from "lucide-react";
import toast from "react-hot-toast";
import ParkingLotModal from "./ParkingLotModal";
import ParkingLotDetailModal from "./ParkingLotDetailModal";
import parkingLotService from "../../services/parkingLotService";
import gateService from "../../services/gateService";
import iotDeviceService from "../../services/iotDeviceService";
import { API_BASE_URL } from "../../config/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function ParkingLots() {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirm, setConfirm] = useState({ open: false, lot: null });

  // Fetch parking lots on component mount
  useEffect(() => {
    fetchParkingLots();
  }, [refreshKey]);

  // Transform response từ GET /api/v1/parking-lots sang format UI
  const parseCount = (val) => {
    if (Array.isArray(val)) return val.length;
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
  };

  const transformParkingLot = (lot) => ({
    id: lot.lotId ?? lot.id,
    name: lot.lotName ?? lot.name ?? "",
    location: lot.fullAddress ?? lot.address ?? lot.location ?? "",
    totalSpots:
      parseInt(lot.totalCapacity ?? lot.totalSpots ?? lot.capacity ?? 0, 10) ||
      0,
    occupiedSpots:
      parseInt(lot.currentOccupancy ?? lot.occupiedSpots ?? 0, 10) || 0,
    gates: parseCount(
      lot.totalGates ?? lot.gateCount ?? lot.numberOfGates ?? lot.gates,
    ),
    cameras: parseCount(
      lot.totalDevices ??
        lot.deviceCount ??
        lot.totalCameras ??
        lot.cameraCount ??
        lot.cameras ??
        lot.devices,
    ),
    status: String(lot.status ?? "active").toLowerCase(),
  });

  const fetchParkingLots = async (showToast = false) => {
    try {
      setLoading(true);
      const data = await parkingLotService.getAllParkingLots();
      const parkingLotsArray = Array.isArray(data) ? data : [];

      // 2 request tổng: parking-lots + iot-devices
      const allDevices = await iotDeviceService.getAll().catch(() => []);

      // Group thiết bị & đếm cổng duy nhất theo lotId client-side
      const deviceCountByLot = {};
      const gateSetByLot = {};
      allDevices.forEach((d) => {
        const lid = d.lotId ?? d.parkingLotId;
        if (!lid) return;
        deviceCountByLot[lid] = (deviceCountByLot[lid] ?? 0) + 1;
        if (d.gateId) {
          if (!gateSetByLot[lid]) gateSetByLot[lid] = new Set();
          gateSetByLot[lid].add(d.gateId);
        }
      });

      const transformedData = parkingLotsArray.map((lot) => {
        const lotId = lot.lotId ?? lot.id;
        return {
          ...transformParkingLot(lot),
          gates: gateSetByLot[lotId]?.size ?? 0,
          cameras: deviceCountByLot[lotId] ?? 0,
        };
      });
      setParkingLots(transformedData);

      if (showToast) {
        toast.success(`Đã tải ${transformedData.length} bãi đỗ xe`);
      }
    } catch (error) {
      const isNetworkError =
        error?.code === "ERR_NETWORK" ||
        error?.message === "Network Error" ||
        error?.message?.includes("ERR_EMPTY_RESPONSE");
      if (isNetworkError) {
        toast.error(
          `Không kết nối được máy chủ. Kiểm tra backend đã chạy tại ${API_BASE_URL} chưa.`,
          { duration: 6000 },
        );
      } else {
        toast.error(
          error?.response?.data?.message || "Không thể tải danh sách bãi đỗ xe",
        );
      }
      console.error(
        "Error fetching parking lots:",
        error?.response?.data ?? error?.message,
      );
      setParkingLots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lot) => {
    setSelectedLot(lot);
    setShowModal(true);
  };

  const handleDelete = (lot) => {
    setConfirm({ open: true, lot });
  };

  const handleConfirmDelete = async () => {
    const lot = confirm.lot;
    try {
      // Kiểm tra trước xem còn cổng nào không — backend sẽ 500 nếu còn cổng
      const gates = await gateService.getByLot(lot.id).catch(() => []);
      if (gates.length > 0) {
        const gateNames = gates
          .map((g) => g.gateName || g.name || `Cổng ${g.gateId ?? g.id}`)
          .join(", ");
        toast.error(
          `Không thể xóa bãi đỗ vì còn ${gates.length} cổng chưa được xóa: ${gateNames}. Vui lòng xóa tất cả cổng trước.`,
          { duration: 6000 },
        );
        return;
      }

      await parkingLotService.deleteParkingLot(lot.id);
      toast.success(`Đã xóa bãi đỗ "${lot.name}" thành công`);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      const data = error.response?.data;
      const errorMessage =
        data?.message ||
        data?.title ||
        data?.detail ||
        (error.response?.status === 500
          ? "Lỗi máy chủ — Bãi đỗ có thể vẫn còn cổng hoặc dữ liệu liên quan. Vui lòng kiểm tra lại."
          : "Không thể xóa bãi đỗ xe");
      toast.error(errorMessage, { duration: 6000 });
      console.error("Error deleting parking lot:", error);
      console.error("Backend response:", JSON.stringify(data, null, 2));
    }
  };

  const handleAddNew = () => {
    setSelectedLot(null);
    setShowModal(true);
  };

  const handleSave = async (formData) => {
    try {
      if (selectedLot) {
        // PUT endpoint chỉ nhận flat lotInfo (không có wrapper lotInfo/cameraSetup)
        const updatePayload = formData.lotInfo ?? formData;
        await parkingLotService.updateParkingLot(selectedLot.id, updatePayload);
        toast.success("Đã cập nhật bãi đỗ xe thành công");
      } else {
        await parkingLotService.createParkingLot(formData);
        toast.success("Đã thêm bãi đỗ xe mới thành công");
      }
      setShowModal(false);
      setSelectedLot(null);
      await fetchParkingLots(false);
    } catch (error) {
      const data = error.response?.data;
      const statusCode = error.response?.status;

      let errorMessage = `Không thể ${selectedLot ? "cập nhật" : "tạo"} bãi đỗ xe`;

      if (
        data?.message &&
        data.message !== "Bạn cần gỡ các thiết bị IoT trước"
      ) {
        errorMessage = data.message;
      } else if (data?.title) {
        errorMessage = data.title;
      } else if (data?.reason) {
        errorMessage = data.reason;
      } else if (statusCode === 500) {
        errorMessage =
          "Lỗi máy chủ (500) — Có thể IP hoặc mã thiết bị đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.";
      } else if (statusCode === 409) {
        errorMessage =
          "Dữ liệu bị trùng — IP Address hoặc mã thiết bị đã tồn tại";
      }

      // Hiển thị chi tiết lỗi validation từ API (vd: .NET 400)
      if (data?.errors && typeof data.errors === "object") {
        const parts = [];
        for (const [key, messages] of Object.entries(data.errors)) {
          const list = Array.isArray(messages) ? messages : [messages];
          parts.push(`${key}: ${list.join(", ")}`);
        }
        if (parts.length) errorMessage = parts.join(" • ");
      }

      toast.error(errorMessage, { duration: 5000 });
      console.error("Error saving parking lot:", error);
      console.error("Backend response body:", JSON.stringify(data, null, 2));
      throw error; // Re-throw để modal biết có lỗi
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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => fetchParkingLots(true)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="w-4 h-4" /> Thêm bãi đỗ
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            Icon: ParkingCircle,
            bg: "bg-blue-100",
            ic: "text-blue-600",
            val: totalLots,
            label: "Tổng bãi đỗ",
          },
          {
            Icon: MapPin,
            bg: "bg-green-100",
            ic: "text-green-600",
            val: totalSpots,
            label: "Tổng chỗ đỗ",
          },
          {
            Icon: ParkingCircle,
            bg: "bg-orange-100",
            ic: "text-orange-600",
            val: totalOccupied,
            label: "Đang sử dụng",
          },
          {
            Icon: ParkingCircle,
            bg: "bg-purple-100",
            ic: "text-purple-600",
            val: totalAvailable,
            label: "Còn trống",
          },
        ].map(({ Icon, bg, ic, val, label }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-6 h-6 ${ic}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{val}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Parking Lots Grid */}
      {parkingLots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
              <ParkingCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Chưa có bãi đỗ xe nào
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Bắt đầu bằng cách thêm bãi đỗ xe đầu tiên của bạn
            </p>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="w-4 h-4" /> Thêm bãi đỗ
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parkingLots.map((lot) => {
            const occupancyRate =
              lot.totalSpots > 0
                ? (lot.occupiedSpots / lot.totalSpots) * 100
                : 0;
            const availableSpots = lot.totalSpots - lot.occupiedSpots;
            const statusMap = {
              active: { label: "Hoạt động", variant: "success" },
              inactive: { label: "Không hoạt động", variant: "destructive" },
              maintenance: { label: "Bảo trì", variant: "warning" },
            };
            const { label: statusLabel, variant: statusVariant } = statusMap[
              lot.status?.toLowerCase()
            ] ?? { label: lot.status ?? "—", variant: "secondary" };

            return (
              <Card
                key={lot.id}
                className="flex flex-col hover:shadow-lg transition-shadow duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 flex-shrink-0 bg-primary-50 border border-primary-100 rounded-xl flex items-center justify-center">
                        <ParkingCircle className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 leading-tight truncate">
                          {lot.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{lot.location}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={statusVariant}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pb-4 flex-1 space-y-4">
                  {/* Occupancy Bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500">Tỷ lệ lấp đầy</span>
                      <span
                        className={`font-semibold ${
                          occupancyRate > 80
                            ? "text-red-600"
                            : occupancyRate > 50
                              ? "text-orange-600"
                              : "text-green-600"
                        }`}
                      >
                        {occupancyRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          occupancyRate > 80
                            ? "bg-red-500"
                            : occupancyRate > 50
                              ? "bg-orange-500"
                              : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        val: lot.totalSpots,
                        label: "Tổng chỗ",
                        color: "text-gray-900",
                      },
                      {
                        val: availableSpots,
                        label: "Còn trống",
                        color: "text-green-600",
                      },
                      {
                        val: lot.gates,
                        label: "Số cổng",
                        color: "text-blue-600",
                        Icon: DoorOpen,
                      },
                      {
                        val: lot.cameras,
                        label: "Thiết bị",
                        color: "text-purple-600",
                        Icon: Camera,
                      },
                    ].map(({ val, label, color, Icon }) => (
                      <div
                        key={label}
                        className="bg-gray-50 rounded-lg p-3 flex items-center gap-2"
                      >
                        {Icon && (
                          <Icon
                            className={`w-4 h-4 flex-shrink-0 ${color} opacity-70`}
                          />
                        )}
                        <div>
                          <p
                            className={`text-xl font-bold leading-none ${color}`}
                          >
                            {val ?? 0}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="pt-0 border-t border-gray-100 gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => handleViewDetail(lot)}
                  >
                    <Eye className="w-4 h-4" /> Xem chi tiết
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Chỉnh sửa"
                    onClick={() => handleEdit(lot)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    title="Xóa"
                    onClick={() => handleDelete(lot)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
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

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, lot: null })}
        onConfirm={handleConfirmDelete}
        title="Xóa bãi đỗ xe"
        description={`Bạn có chắc muốn xóa bãi đỗ "${confirm.lot?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
      />
    </div>
  );
}

export default ParkingLots;
