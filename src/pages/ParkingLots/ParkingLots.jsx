import { useState, useEffect, useCallback } from "react";
import {
  ParkingCircle,
  MapPin,
  Plus,
  DoorOpen,
  Camera,
  Search,
  ArrowUpDown,
  Power,
  PowerOff,
  Loader2,
} from "lucide-react";
import { EyeTwoTone, EditTwoTone, DeleteTwoTone } from "@ant-design/icons";
import toast from "react-hot-toast";
import ParkingLotModal from "./ParkingLotModal";
import ParkingLotDetailModal from "./ParkingLotDetailModal";
import parkingLotService from "../../services/parkingLotService";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import { useAdminHub } from "../../hooks/useAdminHub";
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

// Transform response từ GET /api/v1/parking-lots sang format UI
const parseCount = (val) => {
  if (Array.isArray(val)) return val.length;
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
};

const formatCount = (value) => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("vi-VN");
};

const transformParkingLot = (lot) => ({
  id: lot.lotId ?? lot.id,
  name: lot.lotName ?? lot.name ?? "",
  location: lot.fullAddress ?? lot.address ?? lot.location ?? "",
  totalSpots:
    parseInt(lot.totalCapacity ?? lot.totalSpots ?? lot.capacity ?? 0, 10) || 0,
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

function ParkingLots() {
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirm, setConfirm] = useState({ open: false, lot: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [togglingLotId, setTogglingLotId] = useState(null);

  const { spotsMap, occupancyMap } = useAdminHub();

  const fetchParkingLots = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const data = await parkingLotService.getAllParkingLots();
      const parkingLotsArray = Array.isArray(data) ? data : [];

      // Fetch song song: IoT devices + gates của từng bãi
      const allDevices = await iotDeviceService.getAll().catch(() => []);

      /** Số cổng theo từng bãi; `null` = API /gates/lot lỗi → dùng totalGates từ GET parking-lots */
      const gateCountByLot = {};
      await Promise.all(
        parkingLotsArray.map(async (lot) => {
          const lotId = lot.lotId ?? lot.id;
          try {
            const gates = await gateService.getByLot(lotId);
            gateCountByLot[lotId] = Array.isArray(gates) ? gates.length : 0;
          } catch {
            gateCountByLot[lotId] = null;
          }
        }),
      );

      // Đếm thiết bị theo lotId — chỉ tính thiết bị còn gắn vào một cổng (đã assign)
      const deviceCountByLot = {};
      allDevices.forEach((d) => {
        const lid = d.lotId ?? d.parkingLotId;
        if (!lid) return;
        const gateId =
          d.gateId ?? d.gate_id ?? d.gate?.gateId ?? d.gate?.id ?? null;
        if (gateId == null || String(gateId).trim() === "") return;
        deviceCountByLot[lid] = (deviceCountByLot[lid] ?? 0) + 1;
      });

      const transformedData = parkingLotsArray.map((lot) => {
        const lotId = lot.lotId ?? lot.id;
        const base = transformParkingLot(lot);
        const gatesFromApi =
          gateCountByLot[lotId] != null ? gateCountByLot[lotId] : base.gates;
        return {
          ...base,
          gates: gatesFromApi,
          cameras: deviceCountByLot[lotId] ?? base.cameras,
        };
      });
      setParkingLots(transformedData);

      if (showToast) {
        toast.success(`Đã tải ${transformedData.length} bãi gửi xe`);
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
          error?.response?.data?.message ||
            "Không thể tải danh sách bãi gửi xe",
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
  }, []);

  // Fetch parking lots on component mount / refresh
  useEffect(() => {
    fetchParkingLots();
  }, [fetchParkingLots, refreshKey]);

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
      const info = await parkingLotService.getParkingLotDeletionInfo(lot.id);
      if (info && typeof info === "object") {
        const canDelete = info.canDelete ?? info.CanDelete ?? info.isDeletable;
        if (canDelete === false) {
          const msg =
            info.message ??
            info.Message ??
            info.reason ??
            info.Reason ??
            info.detail ??
            "Bãi gửi không thể xóa (còn cổng hoặc dữ liệu liên quan).";
          toast.error(String(msg), { duration: 7000 });
          return;
        }
      }

      let gates = [];
      try {
        const g = await gateService.getByLot(lot.id);
        gates = Array.isArray(g) ? g : [];
      } catch {
        toast.error(
          "Không kiểm tra được cổng: API GET /api/v1/gates/lot đang lỗi (500). Không xóa bãi an toàn được — cần sửa backend. Nếu bãi vẫn còn cổng trong DB, xóa cổng trước (Swagger) rồi thử lại.",
          { duration: 9000 },
        );
        return;
      }

      if (gates.length > 0) {
        const gateNames = gates
          .map((g) => g.gateName || g.name || `Cổng ${g.gateId ?? g.id}`)
          .join(", ");
        toast.error(
          `Không thể xóa bãi gửi vì còn ${gates.length} cổng chưa được xóa: ${gateNames}. Vui lòng xóa tất cả cổng trước.`,
          { duration: 6000 },
        );
        return;
      }

      const lotDevices = await iotDeviceService
        .getByLot(lot.id)
        .catch(() => []);
      const deviceIds = lotDevices
        .map((d) => d.deviceId ?? d.id)
        .filter(Boolean);
      let maintenanceDeleted = 0;
      let deletedDevices = 0;
      if (deviceIds.length > 0) {
        const maintResult =
          await DeviceMaintenanceService.deleteAllSchedulesForDevices(
            deviceIds,
          );
        if (maintResult.total === -1) {
          toast.error(
            "Không tải được danh sách bảo trì — dừng xóa bãi. Thử lại sau.",
            { duration: 6000 },
          );
          return;
        }
        if (maintResult.total > 0 && maintResult.deleted === 0) {
          toast.error(
            "Không xóa được lịch bảo trì của thiết bị trong bãi — dừng xóa bãi.",
            { duration: 7000 },
          );
          return;
        }
        maintenanceDeleted = maintResult.deleted;
        if (maintResult.failed > 0) {
          toast(
            `Đã xóa ${maintResult.deleted}/${maintResult.total} lịch bảo trì; ${maintResult.failed} lịch lỗi — vẫn thử xóa bãi.`,
            { duration: 6000 },
          );
        }

        const failedDeviceNames = [];
        for (const dev of lotDevices) {
          const devId = dev?.deviceId ?? dev?.id;
          if (!devId) continue;
          try {
            await iotDeviceService.delete(devId);
            deletedDevices += 1;
          } catch (deleteErr) {
            try {
              await iotDeviceService.unassign(devId);
              await iotDeviceService.delete(devId);
              deletedDevices += 1;
            } catch {
              failedDeviceNames.push(
                dev?.deviceName ??
                  dev?.name ??
                  dev?.deviceCode ??
                  String(devId),
              );
            }
          }
        }

        if (failedDeviceNames.length > 0) {
          toast.error(
            `Không thể xóa ${failedDeviceNames.length} thiết bị còn gắn với bãi: ${failedDeviceNames.join(", ")}. Vui lòng xử lý thiết bị trước rồi thử lại.`,
            { duration: 8000 },
          );
          return;
        }
      }

      await parkingLotService.deleteParkingLot(lot.id);
      const hints = [];
      if (deletedDevices > 0) hints.push(`đã xóa ${deletedDevices} thiết bị`);
      if (maintenanceDeleted > 0)
        hints.push(`đã gỡ ${maintenanceDeleted} lịch bảo trì`);
      const detailHint = hints.length > 0 ? ` (${hints.join(", ")})` : "";
      toast.success(`Đã xóa bãi gửi "${lot.name}" thành công${detailHint}`);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      const data = error.response?.data;
      const errorMessage =
        data?.message ||
        data?.title ||
        data?.detail ||
        (error.response?.status === 500
          ? "Lỗi máy chủ — Bãi gửi có thể vẫn còn cổng hoặc dữ liệu liên quan. Vui lòng kiểm tra lại."
          : "Không thể xóa bãi gửi xe");
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
        toast.success("Đã cập nhật bãi gửi xe thành công");
      } else {
        const created = await parkingLotService.createParkingLot(formData);
        toast.success("Đã thêm bãi gửi xe mới thành công");
        const lotId = created?.lotId ?? created?.id;
        if (lotId) {
          try {
            const detail = await parkingLotService.getParkingLotDetail(lotId);
            const devices = detail?.devices ?? [];
            for (const dev of devices) {
              const devId = dev?.deviceId ?? dev?.id;
              if (devId) {
                await DeviceMaintenanceService.generateSchedule(devId);
              }
            }
            if (devices.length > 0) {
              toast.success(
                `Đã tạo lịch bảo trì cho ${devices.length} thiết bị`,
                { duration: 3000 },
              );
            }
          } catch (err) {
            console.warn("Tạo lịch bảo trì thất bại:", err);
          }
        }
      }
      setShowModal(false);
      setSelectedLot(null);
      await fetchParkingLots(false);
    } catch (error) {
      const data = error.response?.data;
      const statusCode = error.response?.status;

      let errorMessage = `Không thể ${selectedLot ? "cập nhật" : "tạo"} bãi gửi xe`;

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

  const handleToggleStatus = async (lot, occupiedSpotsCount) => {
    const isCurrentlyActive =
      (lot.status ?? "active").toLowerCase() !== "inactive";
    const newStatus = isCurrentlyActive ? "inactive" : "active";

    if (newStatus === "inactive" && occupiedSpotsCount > 0) {
      toast.error(
        "Không thể ngừng hoạt động khi còn xe đang gửi. Vui lòng đợi tất cả xe ra hết.",
        { duration: 5000 },
      );
      return;
    }

    setTogglingLotId(lot.id);
    try {
      await parkingLotService.updateParkingLot(lot.id, { status: newStatus });
      toast.success(
        newStatus === "active"
          ? `Đã bật hoạt động bãi "${lot.name}"`
          : `Đã ngừng hoạt động bãi "${lot.name}"`,
      );
      setParkingLots((prev) =>
        prev.map((l) => (l.id === lot.id ? { ...l, status: newStatus } : l)),
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        "Không thể chuyển trạng thái bãi gửi.";
      toast.error(msg, { duration: 5000 });
    } finally {
      setTogglingLotId(null);
    }
  };

  // Filter + sort
  const filteredLots = parkingLots
    .filter((lot) => lot.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const rateA =
        a.totalSpots > 0 ? (a.occupiedSpots / a.totalSpots) * 100 : 0;
      const rateB =
        b.totalSpots > 0 ? (b.occupiedSpots / b.totalSpots) * 100 : 0;
      if (sortBy === "occ_desc") return rateB - rateA;
      if (sortBy === "occ_asc") return rateA - rateB;
      if (sortBy === "name_az") return a.name.localeCompare(b.name, "vi");
      return 0;
    });

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
    <div className="space-y-10">
      {/* Statistics — Tiêu đề trên, số + đơn vị dưới (giống màn hình Giao dịch) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Tổng bãi gửi xe",
            value: totalLots,
            unit: "Bãi",
            Icon: ParkingCircle,
            iconColor: "text-blue-600",
            bgTint: "bg-white",
          },
          {
            label: "Tổng chỗ gửi xe",
            value: totalSpots,
            unit: "Chỗ",
            Icon: MapPin,
            iconColor: "text-green-600",
            bgTint: "bg-white",
          },
          {
            label: "Đang gửi xe",
            value: totalOccupied,
            unit: "Xe",
            Icon: DoorOpen,
            iconColor: "text-green-600",
            bgTint: "bg-green-500/30",
          },
          {
            label: "Còn trống",
            value: totalAvailable,
            unit: "Chỗ",
            Icon: ParkingCircle,
            iconColor: "text-orange-600",
            bgTint: "bg-amber-500/30",
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
                  {formatCount(value)}
                  <span className="text-base font-medium text-gray-600">
                    {unit}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Sort Bar + Thêm bãi gửi */}
      {parkingLots.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1 min-w-0 sm:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên bãi xe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none cursor-pointer"
              >
                <option value="default">Mặc định</option>
                <option value="occ_desc">Lấp đầy cao nhất</option>
                <option value="occ_asc">Lấp đầy thấp nhất</option>
                <option value="name_az">Tên A → Z</option>
              </select>
            </div>
          </div>
          <Button
            onClick={handleAddNew}
            className="gap-2 rounded-2xl shrink-0 bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Plus className="w-4 h-4" /> Thêm bãi gửi xe
          </Button>
        </div>
      )}

      {/* Parking Lots Grid */}
      {parkingLots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
              <ParkingCircle className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Chưa có bãi gửi xe nào
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Bắt đầu bằng cách thêm bãi gửi xe đầu tiên của bạn
            </p>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="w-4 h-4" /> Thêm bãi gửi xe
            </Button>
          </CardContent>
        </Card>
      ) : filteredLots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Search className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">
              Không tìm thấy bãi xe nào khớp với &quot;{searchQuery}&quot;
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLots.map((lot) => {
            const rtAvailable = spotsMap[lot.id];
            const availableSpots =
              typeof rtAvailable === "number"
                ? rtAvailable
                : lot.totalSpots - lot.occupiedSpots;
            const rtOccupancyPct = occupancyMap[lot.id];
            const occupancyRate =
              typeof rtOccupancyPct === "number"
                ? rtOccupancyPct
                : lot.totalSpots > 0
                  ? (lot.occupiedSpots / lot.totalSpots) * 100
                  : 0;
            const occupiedSpots =
              typeof rtAvailable === "number"
                ? Math.max(0, lot.totalSpots - rtAvailable)
                : lot.occupiedSpots;

            const isCritical = occupancyRate >= 90;
            const isWarning = occupancyRate >= 70 && occupancyRate < 90;

            const barColor = isCritical
              ? "bg-red-500"
              : isWarning
                ? "bg-amber-400"
                : "bg-green-500";
            const rateColor = isCritical
              ? "text-red-600"
              : isWarning
                ? "text-amber-600"
                : "text-green-600";

            const statusMap = {
              active: { label: "Hoạt động", variant: "success" },
              inactive: { label: "Ngừng hoạt động", variant: "secondary" },
              maintenance: { label: "Bảo trì", variant: "warning" },
            };
            // Tự động: 100% lấp đầy (chỗ trống = 0) → Ngừng hoạt động; còn chỗ trống > 0 → Hoạt động
            const isFull = availableSpots <= 0 || occupancyRate >= 100;
            const displayStatus = isFull
              ? { label: "Ngừng hoạt động", variant: "secondary" }
              : (statusMap[lot.status?.toLowerCase()] ?? {
                  label: lot.status ?? "Hoạt động",
                  variant: "success",
                });
            const { label: statusLabel, variant: statusVariant } =
              displayStatus;

            return (
              <Card
                key={lot.id}
                className={`flex flex-col transition-all duration-200 hover:shadow-lg ${
                  isCritical
                    ? "ring-2 ring-red-400 shadow-red-100 shadow-md"
                    : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center border ${
                          isCritical
                            ? "bg-red-50 border-red-100"
                            : "bg-primary-50 border-primary-100"
                        }`}
                      >
                        <ParkingCircle
                          className={`w-5 h-5 ${isCritical ? "text-red-500" : "text-primary-600"}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1 break-words">
                        <h3 className="font-semibold text-gray-900 leading-tight break-words">
                          {lot.name}
                        </h3>
                        <div className="flex items-start gap-1 text-xs text-gray-500 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span className="break-words">{lot.location}</span>
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
                      <span className={`font-semibold ${rateColor}`}>
                        {occupancyRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 border border-gray-300 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${barColor}`}
                        style={{
                          width: `${Math.min(occupancyRate, 100)}%`,
                          minWidth: occupancyRate > 0 ? "6px" : "0",
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats: Cụm Sức chứa */}
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Sức chứa
                    </p>
                    <div className="flex divide-x divide-gray-200">
                      {[
                        {
                          val: lot.totalSpots,
                          label: "Tổng chỗ",
                          color: "text-gray-900",
                        },
                        {
                          val: occupiedSpots,
                          label: "Đang dùng",
                          color: "text-orange-600",
                        },
                        {
                          val: availableSpots,
                          label: "Còn trống",
                          color: "text-green-600",
                        },
                      ].map(({ val, label, color }, i) => (
                        <div
                          key={label}
                          className={`flex-1 text-center ${i > 0 ? "pl-3" : ""} ${i < 2 ? "pr-3" : ""}`}
                        >
                          <p className="text-[10px] text-gray-400 mb-1">
                            {label}
                          </p>
                          <p
                            className={`text-xl font-bold leading-none ${color}`}
                          >
                            {formatCount(val)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats: Cụm Phần cứng */}
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Phần cứng
                    </p>
                    <div className="flex divide-x divide-gray-200">
                      {[
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
                      ].map(({ val, label, color, Icon }, i) => (
                        <div
                          key={label}
                          className={`flex-1 flex items-center gap-2 ${i > 0 ? "pl-4" : ""} ${i < 1 ? "pr-4" : ""}`}
                        >
                          <Icon
                            className={`w-4 h-4 flex-shrink-0 ${color} opacity-70`}
                          />
                          <div>
                            <p className="text-[10px] text-gray-400 mb-0.5">
                              {label}
                            </p>
                            <p
                              className={`text-xl font-bold leading-none ${color}`}
                            >
                              {formatCount(val)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0 border-t border-gray-100 gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => handleViewDetail(lot)}
                  >
                    <EyeTwoTone twoToneColor="#2563eb" /> Xem chi tiết
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(lot, occupiedSpots)}
                    disabled={
                      togglingLotId === lot.id ||
                      (occupiedSpots > 0 &&
                        (lot.status ?? "active").toLowerCase() !== "inactive")
                    }
                    title={
                      (lot.status ?? "active").toLowerCase() === "inactive"
                        ? "Bật hoạt động"
                        : occupiedSpots > 0
                          ? "Không thể ngừng khi còn xe đang gửi"
                          : "Ngừng hoạt động"
                    }
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      (lot.status ?? "active").toLowerCase() === "inactive"
                        ? "text-gray-400 hover:bg-green-50 hover:text-green-600"
                        : occupiedSpots > 0
                          ? "text-amber-500 cursor-not-allowed"
                          : "text-green-600 hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    {togglingLotId === lot.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (lot.status ?? "active").toLowerCase() ===
                      "inactive" ? (
                      <Power className="w-4 h-4" />
                    ) : (
                      <PowerOff className="w-4 h-4" />
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Chỉnh sửa"
                    onClick={() => handleEdit(lot)}
                  >
                    <EditTwoTone twoToneColor="#2563eb" />
                  </Button>
                  {/* <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Xóa"
                    onClick={() => handleDelete(lot)}
                  >
                    <DeleteTwoTone twoToneColor="#ef4444" />
                  </Button> */}
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
      {/* <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, lot: null })}
        onConfirm={handleConfirmDelete}
        title="Xóa bãi gửi xe"
        description={`Bạn có chắc muốn xóa bãi gửi "${confirm.lot?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
      /> */}
    </div>
  );
}

export default ParkingLots;
