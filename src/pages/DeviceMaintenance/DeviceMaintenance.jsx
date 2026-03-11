import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import iotDeviceService from "../../services/iotDeviceService";
import MaintenanceDetailModal from "../../components/DeviceMaintenance/MaintenanceDetailModal";
import dayjs from "dayjs";
import { ConfigProvider } from "antd";
import viVN from "antd/es/locale/vi_VN";
import { Button } from "@/components/ui/button";
import CompleteMaintenanceModal from "../../components/DeviceMaintenance/CompleteMaintenanceModal";
import UpdateNextMaintenanceModal from "../../components/DeviceMaintenance/UpdateNextMaintenanceModal";
import { Cpu, Wifi, WifiOff, AlertTriangle } from "lucide-react";

const DeviceMaintenance = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMaintenanceId, setSelectedMaintenanceId] = useState(null);
    const [completeMaintenanceId, setCompleteMaintenanceId] = useState(null);
    const [updateMaintenanceId, setUpdateMaintenanceId] = useState(null);
    const [filterStatus, setFilterStatus] = useState("All");
    const [searchId, setSearchId] = useState("");
    const [filterLot, setFilterLot] = useState("all");

    const [lots, setLots] = useState([]);

    const total = devices.length;
    const pending = devices.filter(d => d.status === "Pending").length;
    const inProgress = devices.filter(d => d.status === "InProgress").length;
    const completed = devices.filter(d => d.status === "Completed").length;
    const overdue = devices.filter(d => d.status === "Cancelled").length;

    const getStatusColor = (status) => {
        const map = {
            Pending: "bg-yellow-100 text-yellow-700",
            InProgress: "bg-yellow-100 text-black",
            Completed: "bg-green-100 text-black",
            Cancelled: "bg-red-100 text-red-600",
        };
        return map[status] || "bg-gray-100 text-gray-600";
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
                iotDeviceService.getAll()
            ]);

            const maintenanceItems =
                maintenanceRes?.data?.items || maintenanceRes?.items || [];

            const deviceMap = new Map();

            deviceRes.forEach(d => {
                deviceMap.set(d.deviceId, {
                    lotId: d.lotId,
                    lotName: d.lotName
                });
            });

            const merged = maintenanceItems.map(m => {
                const device = deviceMap.get(m.deviceId);

                return {
                    ...m,
                    lotId: device?.lotId || null,
                    lotName: device?.lotName || "Chưa gán bãi"
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
            res.forEach(d => {
                if (
                    d.lotId &&
                    d.lotName &&
                    d.lotName.trim() !== ""
                ) {
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

    if (loading)
        return (
            <div className="flex justify-center items-center h-60">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
        );

    const filteredDevices = devices.filter((d) => {

        const lotOk =
            filterLot === "all" || d.lotId === filterLot;

        const statusOk =
            filterStatus === "All" || d.status === filterStatus;

        const searchOk =
            !searchId ||
            d.deviceName?.toLowerCase().includes(searchId.toLowerCase());

        return lotOk && statusOk && searchOk;

    });

    let lotsForSelect = lots.length
        ? lots
        : [
            ...new Map(
                devices
                    .filter(d => d.lotId && d.lotName && d.lotName.trim() !== "")
                    .map((d) => [
                        d.lotId,
                        {
                            lotId: d.lotId,
                            lotName: d.lotName,
                        }
                    ])
            ).values(),
        ];

    return (
        <ConfigProvider locale={viVN}>
            <div className="space-y-8">

                {devices.length === 0 && (
                    <div className="bg-white rounded-3xl p-10 shadow border text-center">
                        <p className="text-gray-500">Không có thiết bị nào cần bảo trì</p>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <Stat
                        icon={Cpu}
                        title="Tổng thiết bị"
                        value={total}
                        color="text-blue-600"
                    />
                    <Stat
                        icon={Wifi}
                        title="Chờ bảo trì"
                        value={pending}
                        color="text-green-600"
                    />
                    <Stat
                        icon={WifiOff}
                        title="Đang bảo trì"
                        value={inProgress}
                        color="text-red-600"
                    />

                    <Stat
                        icon={Wifi}
                        title="Đã bảo trì"
                        value={completed}
                        color="text-green-600"
                    />

                    <Stat
                        icon={AlertTriangle}
                        title="Quá hạn"
                        value={overdue}
                        color="text-gray-600"
                    />
                </div>

                <div className="bg-white rounded-3xl shadow border p-5 flex flex-wrap gap-4 items-center">
                    <input
                        type="text"
                        placeholder="Tìm theo tên thiết bị..."
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="border rounded-lg px-3 py-2 w-72"
                    />

                    <select
                        value={filterLot}
                        onChange={(e) => setFilterLot(e.target.value)}
                        className="border rounded-lg px-3 py-2"
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
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="All">Tất cả</option>
                        <option value="Pending">Chờ bảo trì</option>
                        <option value="InProgress">Đang bảo trì</option>
                        <option value="Completed">Đã bảo trì</option>
                        <option value="Cancelled">Quá hạn</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDevices.map((item) => {
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
                                        <p className="text-xs text-gray-500">
                                            {item.deviceCode}
                                        </p>
                                        <p className="text-xs text-gray-400 italic">
                                            {item.lotName && item.lotName.trim() !== "" ? item.lotName : "Chưa gán bãi"}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-xs px-3 py-1 rounded-full font-medium text-center min-w-[80px] whitespace-nowrap ${getStatusColor(
                                            item.status
                                        )}`}
                                    >
                                        {item.status === "Pending"
                                            ? "Chờ bảo trì"
                                            : item.status === "InProgress"
                                                ? "Đang bảo trì"
                                                : item.status === "Completed"
                                                    ? "Đã bảo trì"
                                                    : "Quá hạn"}
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

                                    {item.status !== "InProgress" && item.nextMaintenanceDate && item.status === "Completed" && (
                                        <Row
                                            label="Bảo trì tiếp theo"
                                            value={format(item.nextMaintenanceDate)}
                                        />
                                    )}

                                    {daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
                                        <div className="mt-3 text-yellow-600 text-sm font-medium">
                                            Còn {daysLeft} ngày nữa đến hạn bảo trì
                                        </div>
                                    )}

                                    {daysLeft !== null && daysLeft < 0 && (
                                        <div className="mt-3 text-red-600 text-sm font-medium">
                                            Thiết bị đã quá hạn bảo trì
                                        </div>
                                    )}
                                </div>

                                <div
                                    className={`mt-4 flex gap-2 ${item.status === "InProgress" ? "flex-row" : "flex-col"
                                        }`}
                                >
                                    <Button
                                        variant="outline"
                                        className="mt-4 w-full"
                                        onClick={() => setSelectedMaintenanceId(item.maintenanceId)}
                                    >
                                        Xem chi tiết
                                    </Button>

                                    {item.status === "InProgress" && (
                                        <Button
                                            className="mt-4 w-full"
                                            onClick={() => setCompleteMaintenanceId(item.maintenanceId)}
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

        </ConfigProvider >
    );
};

const Row = ({ label, value }) => (
    <div className="flex justify-between">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-800">{value}</span>
    </div>
);

const Stat = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-3xl p-6 shadow border">
        <div className="flex items-center gap-4">
            <Icon className={`w-7 h-7 ${color}`} />
            <div>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-gray-500 text-sm">{title}</p>
            </div>
        </div>
    </div>
);

export default DeviceMaintenance;