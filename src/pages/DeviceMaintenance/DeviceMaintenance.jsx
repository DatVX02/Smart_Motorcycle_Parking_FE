import React, { useEffect, useState } from "react";
import { AlertTriangle, Wrench, Calendar, X } from "lucide-react";
import toast from "react-hot-toast";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import dayjs from "dayjs";
import viVN from "antd/es/locale/vi_VN";
import { Button } from "@/components/ui/button";
import { ConfigProvider } from "antd";
dayjs.locale("vi");
const DeviceMaintenance = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    const getStatusColor = (status) => {
        const map = {
            Pending: "bg-yellow-100 text-yellow-700",
            InProgress: "bg-yellow-100 text-black",
            Completed: "bg-green-100 text-black",
            Cancelled: "bg-red-100 text-gray-600",
        };
        return map[status] || "bg-gray-100 text-gray-600";
    };

    const fetchDevices = async () => {
        try {
            const res = await DeviceMaintenanceService.getAll();
            setDevices(res?.data?.items || []);
        } catch (err) {
            console.error(err);
            toast.error("Không thể tải danh sách bảo trì");
        } finally {
            setLoading(false);
        }
    };

    const handleNextMaintenance = async (id, date) => {
        try {

            await DeviceMaintenanceService.update(id, {
                nextMaintenanceDate: date
            });

            toast.success("Cập nhật ngày bảo trì tiếp theo");

            fetchDevices();

        } catch (err) {

            console.error(err);
            toast.error("Không thể cập nhật");

        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    if (loading)
        return (
            <div className="flex justify-center items-center h-60">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
        );

    return (
        <ConfigProvider locale={viVN}>
            <div className="space-y-8">

                {devices.length === 0 && (
                    <div className="bg-white rounded-3xl p-10 shadow border text-center">
                        <p className="text-gray-500">Không có thiết bị nào cần bảo trì</p>
                    </div>
                )}

                {/* List */}
                {devices.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {devices.map((item) => (
                            <div
                                key={item.maintenanceId}
                                className="bg-white rounded-3xl shadow border p-6 hover:shadow-lg transition"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                Tên thiết bị: {item.deviceName}
                                            </h3>
                                            <p className="text-xs text-gray-500">Mã thiết bị: {item.deviceCode}</p>
                                        </div>
                                    </div>

                                    <span
                                        className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                                            item.status
                                        )}`}
                                    >
                                        {item.status === "Pending" ? "Chờ bảo trì" : item.status === "InProgress" ? "Đang bảo trì" : item.status === "Completed" ? "Đã bảo trì" : "Quá hạn"}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="space-y-1 text-sm">
                                    <Row label="Loại bảo trì" value={item.maintenanceType} />
                                    <Row label="Mô tả" value={item.description} />
                                    {(item.status === "InProgress" || item.status === "Completed") && (
                                        <Row
                                            label="Ngày thực hiện"
                                            value={dayjs().format("DD/MM/YYYY HH:mm:ss")}
                                        />

                                    )}

                                    {item.status === "Completed" ? (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Bảo trì tiếp theo</span>
                                            <input
                                                type="date"
                                                format="DD/MM/YYYY"
                                                className="border rounded px-2 py-1 text-sm"
                                                defaultValue={item.nextMaintenanceDate ? dayjs(item.nextMaintenanceDate).format("DD-MM-YYYY") : ""}
                                                onChange={(e) =>
                                                    handleNextMaintenance(item.maintenanceId, e.target.value)
                                                }
                                            />
                                        </div>
                                    ) : (
                                        item.status === "InProgress" && (
                                            < Row
                                                label="Ngày bảo trì tiếp theo"
                                                value={formatDate(item.nextMaintenanceDate)}
                                            />
                                        )
                                    )}
                                </div>
                                {item.status === "Cancelled" && (
                                    <div className="flex items-center gap-2 mt-4 text-xs text-orange-600">
                                        <Button variant="destructive">
                                            <X />
                                            Hủy bảo trì
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ConfigProvider>
    );
};

const Row = ({ label, value }) => (
    <div className="flex justify-between">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-800">{value}</span>
    </div>
);

const formatDate = (date) =>
    date ? dayjs(date).format("DD/MM/YYYY HH:mm:ss") : "-";

export default DeviceMaintenance;