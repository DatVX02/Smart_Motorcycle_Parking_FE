import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import iotDeviceService from "../../services/iotDeviceService";
import dayjs from "dayjs";
import { Image } from "antd";

const MaintenanceDetailModal = ({ maintenanceId, onClose, onUpdated }) => {

    const [maintenance, setMaintenance] = useState(null);
    const [deviceDetail, setDeviceDetail] = useState(null);
    const [nextMaintenanceDate, setNextMaintenanceDate] = useState(null);
    const formatDate = (date) => {
        if (!date || date.startsWith("0001")) return "-";
        return dayjs(date).format("DD/MM/YYYY HH:mm:ss");
    };

    const format = (date) => {
        if (!date || date.startsWith("0001")) return "-";
        return dayjs(date).format("DD/MM/YYYY");
    };

    const fetchDetail = async () => {
        try {

            const res = await DeviceMaintenanceService.getById(maintenanceId);

            const data = res?.data || res;

            setMaintenance(data);

            if (data?.deviceId) {

                const device = await iotDeviceService.getById(data.deviceId);

                setDeviceDetail(device);

            }

        } catch {

            toast.error("Không thể tải chi tiết", {duration: 1000});

        }
    };

    const updateNextMaintenance = async (date) => {

        try {

            await DeviceMaintenanceService.update(maintenanceId, {
                nextMaintenanceDate: date
            });

            toast.success("Cập nhật thành công", {duration: 1000});

            fetchDetail();

            onUpdated();

        } catch {

            toast.error("Không thể cập nhật", {duration: 1000});

        }

    };

    const handleComplete = async () => {

        try {

            await DeviceMaintenanceService.complete(
                maintenanceId,
                nextMaintenanceDate,
                image
            );

            toast.success("Đã hoàn thành bảo trì", {duration: 1000});

            onUpdated();
            onClose();

        } catch (err) {

            console.error(err);

            toast.error("Không thể cập nhật bảo trì", {duration: 1000});

        }

    };

    useEffect(() => {
        fetchDetail();
    }, [maintenanceId]);

    if (!maintenance) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white rounded-2xl p-6 w-[500px] shadow-lg">

                <div className="flex justify-between mb-4">

                    <h2 className="text-lg font-semibold">
                        Chi tiết bảo trì
                    </h2>

                    <button onClick={onClose}>
                        <X />
                    </button>

                </div>

                <div className="space-y-2 text-sm">
                    <Row label="Tên bãi" value={deviceDetail?.lotName || "-"} />
                    <Row label="Tên thiết bị" value={maintenance.deviceName} />

                    <Row label="Mã thiết bị" value={maintenance.deviceCode} />

                    <Row label="Loại bảo trì" value={maintenance.maintenanceType} />

                    <Row label="Mô tả" value={maintenance.description} />

                    <Row label="Hình ảnh bảo trì" value={maintenance.imageUrl ? (
                        <Image
                            src={maintenance.imageUrl}
                            width={150}
                            height={100}
                            className="mt-2 rounded-xl border"
                        />
                    ) : "-"}>
                    </Row>
                    <Row
                        label="Ngày thực hiện"
                        value={formatDate(maintenance.performedAt)}
                    />
                    {maintenance.status !== "Cancelled" && (
                        <Row
                            label="Ngày bảo trì tiếp theo"
                            value={format(maintenance.nextMaintenanceDate)}
                        />
                    )}
                    {/* <div className="flex justify-between items-center">

                        <span className="text-gray-400">
                            Bảo trì tiếp theo
                        </span>

                        <input
                            type="date"
                            className="border rounded px-2 py-1 text-sm"
                            defaultValue={maintenance.nextMaintenanceDate || ""}
                            onChange={(e) =>
                                updateNextMaintenance(e.target.value)
                            }
                        />

                    </div> */}

                    {deviceDetail && (
                        <>
                            <hr className="my-2" />

                            <Row label="Model" value={deviceDetail.model} />

                            <Row label="IP Address" value={deviceDetail.ipAddress} />

                            <Row label="MAC Address" value={deviceDetail.macAddress} />

                            <Row label="Firmware" value={deviceDetail.firmwareVersion} />


                            <Row label="Trạng thái kết nối" value={deviceDetail.connectionStatus ? "Trực tuyến" : "Ngoại tuyến"} />
                        </>
                    )}

                </div>

            </div>

        </div >
    );
};

const Row = ({ label, value }) => (
    <div className="flex justify-between">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-800">{value}</span>
    </div>
);

export default MaintenanceDetailModal;