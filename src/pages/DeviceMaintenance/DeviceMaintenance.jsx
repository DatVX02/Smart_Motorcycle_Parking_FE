import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import iotDeviceService from "../../services/iotDeviceService";
import MaintenanceDetailModal from "../../components/DeviceMaintenance/MaintenanceDetailModal";
import dayjs from "dayjs";
import { ConfigProvider, Pagination } from "antd";
import viVN from "antd/es/locale/vi_VN";
import { Button } from "@/components/ui/button";
import CompleteMaintenanceModal from "../../components/DeviceMaintenance/CompleteMaintenanceModal";
import UpdateNextMaintenanceModal from "../../components/DeviceMaintenance/UpdateNextMaintenanceModal";
import {
  LayoutGrid,
  CalendarCheck,
  Clock,
  Wrench,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { EyeTwoTone } from "@ant-design/icons";

function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  valueSuffix,
  bgTint,
}) {
  const bgClass = bgTint ?? "bg-white";
  return (
    <div className={`rounded-3xl p-6 shadow border ${bgClass}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-7 h-7 flex-shrink-0 ${iconColor}`} />
          <p className="text-sm font-semibold text-gray-700">{label}</p>
        </div>
        <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
          {value}
          {valueSuffix && (
            <span className="text-base font-medium text-gray-600">
              {valueSuffix}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

const DeviceMaintenance = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState(null);
  const [completeMaintenanceId, setCompleteMaintenanceId] = useState(null);
  const [updateMaintenanceId, setUpdateMaintenanceId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchId, setSearchId] = useState("");
  const [filterLot, setFilterLot] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [lots, setLots] = useState([]);
  const PAGE_SIZE = 9;

  const total = devices.length;
  const pending = devices.filter((d) => d.status === "Pending").length;
  const inProgress = devices.filter((d) => d.status === "InProgress").length;
  const completed = devices.filter((d) => d.status === "Completed").length;
  const overdue = devices.filter((d) => {
    const s = (d.status || "").toString().trim();
    return s === "Cancelled" || s === "Overdue";
  }).length;
  const scheduled = devices.filter((d) => {
    const s = (d.status || "").toString().trim().toLowerCase();
    return s === "scheduled" || s === "đã lên lịch";
  }).length;

  const getStatusColor = (status) => {
    const s = (status || "").toString().trim();
    const map = {
      Pending: "bg-yellow-100 text-yellow-700",
      Scheduled: "bg-blue-100 text-blue-700",
      "Đã lên lịch": "bg-blue-100 text-blue-700",
      "đã lên lịch": "bg-blue-100 text-blue-700",
      InProgress: "bg-yellow-100 text-black",
      Completed: "bg-green-100 text-black",
      Cancelled: "bg-red-100 text-red-600",
      Overdue: "bg-red-100 text-red-600",
    };
    if (map[s]) return map[s];
    const key = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return map[key] || "bg-gray-100 text-gray-600";
  };

  const getStatusLabel = (status) => {
    const s = (status || "").toString().trim();
    const map = {
      Pending: "Chờ bảo trì",
      Scheduled: "Đã lên lịch",
      "Đã lên lịch": "Đã lên lịch",
      "đã lên lịch": "Đã lên lịch",
      InProgress: "Đang bảo trì",
      Completed: "Đã bảo trì",
      Cancelled: "Quá hạn",
      Overdue: "Quá hạn",
    };
    if (map[s]) return map[s];
    const key = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return map[key] || s || "—";
  };

  const formatDate = (date) => {
    if (!date || date.startsWith("0001")) return "";
    return dayjs(date).format("DD/MM/YYYY HH:mm:ss");
  };

  const format = (date) => {
    if (!date || date.startsWith("0001")) return "";
    return dayjs(date).format("DD/MM/YYYY");
  };

  //get device
  const fetchDevices = async () => {
    try {
      const [maintenanceRes, deviceRes] = await Promise.all([
        DeviceMaintenanceService.getAll(),
        iotDeviceService.getAll(),
      ]);

      const maintenanceItems =
        maintenanceRes?.data?.items || maintenanceRes?.items || [];

      const deviceMap = new Map();

      deviceRes.forEach((d) => {
        deviceMap.set(d.deviceId, {
          lotId: d.lotId,
          lotName: d.lotName,
        });
      });

      const merged = maintenanceItems.map((m) => {
        const device = deviceMap.get(m.deviceId);

        return {
          ...m,
          lotId: device?.lotId || null,
          lotName: device?.lotName || "Chưa gán bãi",
        };
      });

      setDevices(merged);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách bảo trì", { duration: 1000 });
    } finally {
      setLoading(false);
    }
  };

  //get lot
  const fetchLots = async () => {
    try {
      const res = await iotDeviceService.getAll();
      const lotsMap = new Map();
      res.forEach((d) => {
        if (d.lotId && d.lotName && d.lotName.trim() !== "") {
          lotsMap.set(d.lotId, {
            lotId: d.lotId,
            lotName: d.lotName,
          });
        }
      });
      setLots(Array.from(lotsMap.values()));
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách bãi", { duration: 1000 });
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchLots();
  }, []);

  const filteredDevices = devices.filter((d) => {
    const lotOk = filterLot === "all" || d.lotId === filterLot;
    const itemStatus = (d.status || "").toString().trim();
    const statusOk =
      filterStatus === "All" ||
      itemStatus === filterStatus ||
      (filterStatus === "Scheduled" &&
        (itemStatus.toLowerCase() === "scheduled" ||
          itemStatus === "đã lên lịch"));
    const searchOk =
      !searchId || d.deviceName?.toLowerCase().includes(searchId.toLowerCase());
    return lotOk && statusOk && searchOk;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterLot, searchId]);

  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  if (loading)
    return (
      <div className="flex justify-center items-center h-60">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );

  let lotsForSelect = lots.length
    ? lots
    : [
        ...new Map(
          devices
            .filter((d) => d.lotId && d.lotName && d.lotName.trim() !== "")
            .map((d) => [
              d.lotId,
              {
                lotId: d.lotId,
                lotName: d.lotName,
              },
            ]),
        ).values(),
      ];

  return (
    <ConfigProvider locale={viVN}>
      <div className="space-y-5">
        {devices.length === 0 && (
          <div className="bg-white rounded-3xl p-10 shadow border text-center">
            <p className="text-gray-500">Không có thiết bị nào cần bảo trì</p>
          </div>
        )}

        {/* Statistics - giống Quản lý thiết bị */}
        <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 sm:grid sm:grid-cols-6 sm:overflow-visible sm:mx-0 sm:px-0">
          <div className="flex-shrink-0 w-[140px] sm:w-auto sm:min-w-0">
            <StatCard
              icon={LayoutGrid}
              iconColor="text-blue-600"
              label="Tổng thiết bị"
              value={total}
              valueSuffix="Lịch"
            />
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto sm:min-w-0">
            <StatCard
              icon={CalendarCheck}
              iconColor="text-blue-600"
              label="Đã lên lịch"
              value={scheduled}
              valueSuffix="Lịch"
              bgTint="bg-blue-500/30"
            />
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto sm:min-w-0">
            <StatCard
              icon={Clock}
              iconColor="text-amber-600"
              label="Chờ bảo trì"
              value={pending}
              valueSuffix="Lịch"
              bgTint="bg-amber-500/30"
            />
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto sm:min-w-0">
            <StatCard
              icon={Wrench}
              iconColor="text-orange-600"
              label="Đang bảo trì"
              value={inProgress}
              valueSuffix="Lịch"
              bgTint="bg-orange-500/30"
            />
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto sm:min-w-0">
            <StatCard
              icon={CheckCircle}
              iconColor="text-green-600"
              label="Đã bảo trì"
              value={completed}
              valueSuffix="Lịch"
              bgTint="bg-green-500/30"
            />
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto sm:min-w-0">
            <StatCard
              icon={AlertTriangle}
              iconColor="text-red-600"
              label="Quá hạn"
              value={overdue}
              valueSuffix="Lịch"
              bgTint="bg-red-500/30"
            />
          </div>
        </div>

        {/* Filters - giống Quản lý thiết bị */}
        <div
          lang="vi"
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Tìm theo tên thiết bị..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="input text-sm w-72"
            />
            <select
              value={filterLot}
              onChange={(e) => setFilterLot(e.target.value)}
              className="input text-sm w-48"
            >
              <option value="all">Tất cả bãi đỗ</option>
              {lotsForSelect.map((lot) => (
                <option key={lot.lotId} value={lot.lotId}>
                  {lot.lotName}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input text-sm w-48"
            >
              <option value="All">Tất cả</option>
              <option value="Scheduled">Đã lên lịch</option>
              <option value="Pending">Chờ bảo trì</option>
              <option value="InProgress">Đang bảo trì</option>
              <option value="Completed">Đã bảo trì</option>
              <option value="Cancelled">Quá hạn</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedDevices.map((item) => {
            const daysLeft = item.nextMaintenanceDate
              ? dayjs(item.nextMaintenanceDate).diff(dayjs(), "day")
              : null;

            return (
              <div
                key={item.maintenanceId}
                className="bg-white rounded-3xl shadow border p-6 hover:shadow-lg transition flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {item.deviceName}
                    </h3>
                    <p className="text-xs text-gray-500">{item.deviceCode}</p>
                    <p className="text-xs text-gray-400 italic">
                      {item.lotName && item.lotName.trim() !== ""
                        ? item.lotName
                        : "Chưa gán bãi"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium text-center min-w-[80px] whitespace-nowrap ${getStatusColor(
                      item.status,
                    )}`}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                </div>

                <div className="space-y-1 text-sm flex-1">
                  <Row label="Loại bảo trì" value={item.maintenanceType} />
                  <Row label="Mô tả" value={item.description} />

                  {item.performedAt && (
                    <Row
                      label="Ngày thực hiện"
                      value={formatDate(item.performedAt)}
                    />
                  )}

                  {item.status !== "InProgress" &&
                    item.nextMaintenanceDate &&
                    item.status === "Completed" && (
                      <Row
                        label="Bảo trì tiếp theo"
                        value={format(item.nextMaintenanceDate)}
                      />
                    )}

                  {daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && (
                    <div className="mt-3 text-yellow-600 text-sm font-medium">
                      Còn {daysLeft} ngày nữa đến hạn bảo trì
                    </div>
                  )}

                  {daysLeft !== null && daysLeft === 0 && (
                    <div className="mt-3 text-yellow-600 text-sm font-medium">
                      Tới hạn bảo trì
                    </div>
                  )}

                  {daysLeft !== null && daysLeft < 0 && (
                    <div className="mt-3 text-red-600 text-sm font-medium">
                      Thiết bị đã quá hạn bảo trì
                    </div>
                  )}
                </div>

                <div
                  className={`mt-4 flex gap-2 ${
                    item.status === "InProgress" ? "flex-row" : "flex-col"
                  }`}
                >
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => setSelectedMaintenanceId(item.maintenanceId)}
                  >
                    <EyeTwoTone className="w-4 h-4 mr-2" />
                    Xem chi tiết
                  </Button>

                  {item.status === "InProgress" && (
                    <Button
                      className="mt-4 w-full"
                      onClick={() =>
                        setCompleteMaintenanceId(item.maintenanceId)
                      }
                    >
                      Hoàn thành bảo trì
                    </Button>
                  )}

                  {/* {(item.status === "Completed" || item.status === "Cancelled") && (
                                    <Button
                                        className="mt-2 w-full"
                                        onClick={() => setUpdateMaintenanceId(item.maintenanceId)}
                                    >
                                        Cập nhật ngày bảo trì tiếp theo
                                    </Button>
                                )} */}
                </div>
              </div>
            );
          })}
        </div>
        {filteredDevices.length > PAGE_SIZE && (
          <div className="flex justify-end mt-6">
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={filteredDevices.length}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {selectedMaintenanceId && (
        <MaintenanceDetailModal
          maintenanceId={selectedMaintenanceId}
          mode="complete"
          onClose={() => setSelectedMaintenanceId(null)}
          onUpdated={fetchDevices}
        />
      )}

      {completeMaintenanceId && (
        <CompleteMaintenanceModal
          maintenanceId={completeMaintenanceId}
          onClose={() => setCompleteMaintenanceId(null)}
          onUpdated={fetchDevices}
        />
      )}

      {updateMaintenanceId && (
        <UpdateNextMaintenanceModal
          maintenanceId={updateMaintenanceId}
          onClose={() => setUpdateMaintenanceId(null)}
          onUpdated={fetchDevices}
        />
      )}
    </ConfigProvider>
  );
};

const Row = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-400">{label}</span>
    <span className="text-gray-800">{value}</span>
  </div>
);

export default DeviceMaintenance;
