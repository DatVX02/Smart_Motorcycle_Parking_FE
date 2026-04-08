import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import iotDeviceService from "../../services/iotDeviceService";
import MaintenanceDetailModal from "../../components/DeviceMaintenance/MaintenanceDetailModal";
import DeviceMaintenanceSchedulesModal from "../../components/DeviceMaintenance/DeviceMaintenanceSchedulesModal";
import dayjs from "dayjs";
import { ConfigProvider, Pagination } from "antd";
import viVN from "antd/es/locale/vi_VN";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import UpdateNextMaintenanceModal from "../../components/DeviceMaintenance/UpdateNextMaintenanceModal";
import {
  LayoutGrid,
  CalendarCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { EyeTwoTone } from "@ant-design/icons";

function normalizeMaintenanceStatus(s) {
  return String(s ?? "").trim();
}

/**
 * Chuẩn hoá status từ API (vd. "In Progress", IN_PROGRESS) → key dùng cho map UI & so sánh.
 */
function toUiStatusKey(statusRaw) {
  const s = normalizeMaintenanceStatus(statusRaw);
  const compact = s.toLowerCase().replace(/[\s_-]+/g, "");
  if (compact === "inprogress") return "InProgress";
  if (compact === "completed") return "Completed";
  if (compact === "cancelled") return "Cancelled";
  if (compact === "pending") return "Pending";
  if (compact === "overdue") return "Overdue";
  if (compact === "scheduled") return "Scheduled";
  if (isScheduledLikeStatus(s)) return "Scheduled";
  return s;
}

function isScheduledLikeStatus(statusRaw) {
  const s = normalizeMaintenanceStatus(statusRaw).toLowerCase();
  return s === "scheduled" || s === "đã lên lịch";
}

function isNextMaintenancePastDue(item) {
  const raw = item?.nextMaintenanceDate;
  if (!raw || String(raw).startsWith("0001")) return false;
  const d = dayjs(raw);
  if (!d.isValid()) return false;
  return d.diff(dayjs(), "day") < 0;
}

/**
 * Trạng thái hiển thị / thống kê.
 * Nếu đã quá nextMaintenanceDate mà chưa hoàn thành/hủy → luôn coi là Quá hạn
 * (kể cả API vẫn trả Scheduled hoặc In Progress).
 */
function getEffectiveMaintenanceStatus(item) {
  const key = toUiStatusKey(item?.status);
  if (key === "Pending") return "Scheduled";
  if (key === "Completed" || key === "Cancelled") {
    return key;
  }
  if (key === "Overdue") return "Overdue";
  if (isNextMaintenancePastDue(item)) return "Overdue";
  return key;
}

/** Badge tóm tắt trên thẻ thiết bị: ưu tiên Quá hạn → Đang bảo trì → Đã lên lịch → … */
function aggregateGroupStatus(schedules) {
  if (!schedules?.length) return "Scheduled";
  const effects = schedules.map((s) => getEffectiveMaintenanceStatus(s));
  if (effects.some((e) => e === "Overdue")) return "Overdue";
  if (effects.some((e) => e === "InProgress")) return "InProgress";
  if (effects.some((e) => e === "Scheduled")) return "Scheduled";
  if (effects.every((e) => e === "Completed")) return "Completed";
  if (effects.every((e) => e === "Cancelled")) return "Cancelled";
  if (effects.some((e) => e === "Cancelled")) return "Scheduled";
  return effects[0];
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState(null);
  const [schedulesGroupForBack, setSchedulesGroupForBack] = useState(null);
  const [deviceGroupModal, setDeviceGroupModal] = useState(null);
  const [updateMaintenanceId, setUpdateMaintenanceId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchId, setSearchId] = useState("");
  const [filterLot, setFilterLot] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [autoOpenedFromQuery, setAutoOpenedFromQuery] = useState(false);

  const [lots, setLots] = useState([]);
  const PAGE_SIZE = 9;

  const total = devices.length;
  const completed = devices.filter(
    (d) => toUiStatusKey(d.status) === "Completed",
  ).length;
  const overdue = devices.filter(
    (d) => getEffectiveMaintenanceStatus(d) === "Overdue",
  ).length;
  const cancelled = devices.filter((d) => {
    const s = (d.status || "").toString().trim();
    return s === "Cancelled";
  }).length;
  const scheduled = devices.filter(
    (d) => getEffectiveMaintenanceStatus(d) === "Scheduled",
  ).length;

  const getStatusColor = (status) => {
    const key = toUiStatusKey(status);
    const map = {
      Scheduled: "bg-blue-100 text-blue-700",
      "Đã lên lịch": "bg-blue-100 text-blue-700",
      "đã lên lịch": "bg-blue-100 text-blue-700",
      InProgress: "bg-yellow-100 text-black",
      Completed: "bg-green-100 text-black",
      Cancelled: "bg-slate-100 text-slate-700",
      Pending: "bg-blue-100 text-blue-700",
      Overdue: "bg-red-100 text-red-600",
    };
    if (map[key]) return map[key];
    return "bg-gray-100 text-gray-600";
  };

  const getStatusLabel = (status) => {
    const key = toUiStatusKey(status);
    const map = {
      Scheduled: "Đã lên lịch",
      "Đã lên lịch": "Đã lên lịch",
      "đã lên lịch": "Đã lên lịch",
      InProgress: "Đang bảo trì",
      Completed: "Đã bảo trì",
      Cancelled: "Đã hủy",
      Pending: "Đã lên lịch",
      Overdue: "Quá hạn",
    };
    return map[key] || normalizeMaintenanceStatus(status) || "—";
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
    const effective = getEffectiveMaintenanceStatus(d);
    const statusOk =
      filterStatus === "All" ||
      (filterStatus === "Cancelled" && itemStatus === "Cancelled") ||
      (filterStatus !== "All" &&
        filterStatus !== "Cancelled" &&
        effective === filterStatus);
    const searchOk =
      !searchId || d.deviceName?.toLowerCase().includes(searchId.toLowerCase());
    return lotOk && statusOk && searchOk;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterLot, searchId]);

  const deviceGroups = useMemo(() => {
    const map = new Map();
    for (const item of filteredDevices) {
      const rawId = item.deviceId ?? item.device_id;
      const key =
        rawId != null && String(rawId) !== ""
          ? String(rawId)
          : `code:${item.deviceCode || "unknown"}:${item.maintenanceId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          deviceId: rawId,
          deviceName: item.deviceName,
          deviceCode: item.deviceCode,
          lotName: item.lotName,
          lotId: item.lotId,
          schedules: [],
        });
      }
      map.get(key).schedules.push(item);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.deviceName || "").localeCompare(b.deviceName || "", "vi"),
    );
  }, [filteredDevices]);

  const paginatedGroups = deviceGroups.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    if (autoOpenedFromQuery || loading || deviceGroups.length === 0) return;

    const shouldOpen = searchParams.get("openSchedules") === "1";
    const targetDeviceId = searchParams.get("deviceId");
    if (!shouldOpen || !targetDeviceId) return;

    const targetGroup = deviceGroups.find((group) => {
      const groupDeviceId = group.deviceId ?? group.device_id;
      return String(groupDeviceId ?? "") === String(targetDeviceId);
    });

    if (!targetGroup) return;

    setDeviceGroupModal(targetGroup);
    setAutoOpenedFromQuery(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("openSchedules");
    nextParams.delete("deviceId");
    setSearchParams(nextParams, { replace: true });
  }, [
    autoOpenedFromQuery,
    loading,
    deviceGroups,
    searchParams,
    setSearchParams,
  ]);

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
        <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 sm:grid sm:grid-cols-5 sm:overflow-visible sm:mx-0 sm:px-0">
          <div className="flex-shrink-0 w-[140px] sm:w-auto sm:min-w-0">
            <StatCard
              icon={LayoutGrid}
              iconColor="text-blue-600"
              label="Tổng lịch bảo trì"
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
          <div className="flex-shrink-0 w-[140px] sm:w-auto sm:min-w-0">
            <StatCard
              icon={XCircle}
              iconColor="text-slate-600"
              label="Đã hủy"
              value={cancelled}
              valueSuffix="Lịch"
              bgTint="bg-slate-400/25"
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
              <option value="all">Tất cả bãi gửi xe</option>
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
              <option value="InProgress">Đang bảo trì</option>
              <option value="Completed">Đã bảo trì</option>
              <option value="Overdue">Quá hạn</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedGroups.length === 0 && devices.length > 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
              Không có thiết bị phù hợp bộ lọc.
            </div>
          )}
          {paginatedGroups.map((group) => {
            const groupDisplay = aggregateGroupStatus(group.schedules);
            const overdueCount = group.schedules.filter(
              (s) => getEffectiveMaintenanceStatus(s) === "Overdue",
            ).length;
            const preview = group.schedules
              .slice(0, 3)
              .map((s) => s.maintenanceType)
              .filter(Boolean)
              .join(" · ");

            return (
              <div
                key={group.key}
                className="bg-white rounded-3xl shadow border p-6 hover:shadow-lg transition flex flex-col"
              >
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {group.deviceName}
                    </h3>
                    <p className="text-xs text-gray-500">{group.deviceCode}</p>
                    <p className="text-xs text-gray-400 italic truncate">
                      {group.lotName && group.lotName.trim() !== ""
                        ? group.lotName
                        : "Chưa gán bãi"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium text-center min-w-[80px] flex-shrink-0 whitespace-nowrap ${getStatusColor(
                      groupDisplay,
                    )}`}
                  >
                    {getStatusLabel(groupDisplay)}
                  </span>
                </div>

                <div className="space-y-1 text-sm flex-1">
                  <Row
                    label="Số lịch"
                    value={`${group.schedules.length} lịch bảo trì`}
                  />
                  {preview && (
                    <div className="pt-1">
                      <span className="text-gray-400 text-xs block mb-0.5">
                        Gồm
                      </span>
                      <p className="text-gray-800 text-sm leading-snug line-clamp-3">
                        {preview}
                        {group.schedules.length > 3 ? "…" : ""}
                      </p>
                    </div>
                  )}
                  {overdueCount > 0 && (
                    <div className="mt-2 text-red-600 text-sm font-medium">
                      {overdueCount} lịch quá hạn
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => setDeviceGroupModal(group)}
                  >
                    <EyeTwoTone className="w-4 h-4 mr-2" />
                    Xem chi tiết
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {deviceGroups.length > PAGE_SIZE && (
          <div className="flex justify-end mt-6">
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={deviceGroups.length}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>

      {deviceGroupModal && (
        <DeviceMaintenanceSchedulesModal
          group={deviceGroupModal}
          onClose={() => setDeviceGroupModal(null)}
          onCreated={fetchDevices}
          getEffectiveStatus={getEffectiveMaintenanceStatus}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
          format={format}
          formatDate={formatDate}
          onSelectSchedule={(id) => {
            setSchedulesGroupForBack(deviceGroupModal);
            setDeviceGroupModal(null);
            setSelectedMaintenanceId(id);
          }}
        />
      )}

      {selectedMaintenanceId && (
        <MaintenanceDetailModal
          maintenanceId={selectedMaintenanceId}
          mode="complete"
          onClose={() => {
            setSelectedMaintenanceId(null);
            setSchedulesGroupForBack(null);
          }}
          onBack={
            schedulesGroupForBack
              ? () => {
                  setSelectedMaintenanceId(null);
                  setDeviceGroupModal(schedulesGroupForBack);
                  setSchedulesGroupForBack(null);
                }
              : undefined
          }
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
