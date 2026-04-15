import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import iotDeviceService from "../../services/iotDeviceService";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { DatePicker } from "antd";

dayjs.locale("vi");
const CompleteMaintenanceModal = ({
    maintenanceId,
    onClose,
    onUpdated
}) => {

    const [maintenance, setMaintenance] = useState(null);
    const [nextMaintenanceDate, setNextMaintenanceDate] = useState("");
    const [status, setStatus] = useState("Completed");
    const [imageFile, setImageFile] = useState(null);

    const formatDate = (date) => {
        if (!date) return "";
        return dayjs(date).format("DD-MMMM-YY");
    };

    // const [reason, setReason] = useState("");
    useEffect(() => {

        const fetchDetail = async () => {

            try {

                const res = await DeviceMaintenanceService.getById(maintenanceId);
                const data = res?.data || res;

                setMaintenance(data);

            } catch {

                toast.error("Không thể tải dữ liệu", {duration: 1000});

            }

        };

        fetchDetail();

    }, [maintenanceId]);

    const handleSave = async () => {

        try {

            const formData = new FormData();

            formData.append("status", status);
            formData.append("nextMaintenanceDate", nextMaintenanceDate);

            if (imageFile) {
                formData.append("image", imageFile);
            }

            await DeviceMaintenanceService.update(maintenanceId, formData);

            const deviceIdForSync =
                maintenance?.deviceId ?? maintenance?.device_id;
            if (status === "Completed" && deviceIdForSync != null) {
                try {
                    await iotDeviceService.update(deviceIdForSync, {
                        connectionStatus: "READY",
                    });
                } catch (syncErr) {
                    console.error(syncErr);
                    toast.error(
                        "Đã lưu bảo trì nhưng không cập nhật được trạng thái thiết bị trên danh sách quản lý",
                        { duration: 2500 },
                    );
                    onUpdated();
                    onClose();
                    return;
                }
            }

            toast.success("Cập nhật bảo trì thành công", {duration: 1000});

            onUpdated();
            onClose();

        } catch {

            toast.error("Không thể cập nhật", {duration: 1000});

        }

    };

    if (!maintenance) return null;

    return (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white rounded-3xl w-[500px] p-6">

                <h2 className="text-lg font-semibold mb-6">
                    Hoàn thành bảo trì
                </h2>

                {/* Device info (read only) */}

                <div className="space-y-2 text-sm mb-4">

                    <Row label="Thiết bị" value={maintenance.deviceName} />
                    <Row label="Mã thiết bị" value={maintenance.deviceCode} />
                    <Row label="Loại bảo trì" value={maintenance.maintenanceType} />

                </div>


                {/* Image */}

                {maintenance.imageUrl && (

                    <div className="mb-4">
                        <label className="text-sm text-gray-400">
                            Ảnh bảo trì
                        </label>

                        {maintenance?.imageUrl ? (
                            <img
                                src={maintenance.imageUrl}
                                className="mt-2 rounded-xl border max-h-52"
                            />
                        ) : (
                            <p className="text-sm text-gray-400 mt-1">
                                Chưa có ảnh bảo trì
                            </p>
                        )}
                    </div>
                )}

                {/* {!maintenance?.imageUrl && (
                    <div className="mt-3">
                        <label className="text-sm text-red-500">
                            Lý do chưa có ảnh bảo trì
                        </label>

                        <textarea
                            className="w-full border rounded-lg p-2 mt-1"
                            placeholder="Nhập lý do..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                )} */}

                {/* Next maintenance */}

                <div className="mb-4">

                    <label className="text-sm text-gray-400">
                        Ngày bảo trì tiếp theo
                    </label>
                    {maintenance?.imageUrl && (
                        <DatePicker
                            className="w-full"
                            format="DD-MM-YYYY"
                            value={nextMaintenanceDate ? dayjs(nextMaintenanceDate) : null}
                            onChange={(date) =>
                                setNextMaintenanceDate(date.format("YYYY-MM-DD"))
                            }
                            disabledDate={(current) => current && current < dayjs().endOf('day').subtract(1, 'day')}
                        />
                    )}
                </div>

                {!maintenance?.imageUrl && (
                    <div className="mt-3 mb-4">
                        <label className="text-sm text-red-500 ">
                            Lý do: chưa có ảnh bảo trì
                        </label>
                    </div>
                )}


                {/* Status */}
                {maintenance?.imageUrl && (
                    <div className="mb-6">

                        <label className="text-sm text-gray-400">
                            Trạng thái
                        </label>

                        <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={status}
                            onChange={(e) =>
                                setStatus(e.target.value)
                            }
                        >

                            <option value="Completed">Đã bảo trì</option>
                            <option value="Cancelled">Đã hủy</option>

                        </select>

                    </div>
                )}

                {/* Actions */}

                <div className="flex gap-3">

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={onClose}
                    >
                        Hủy
                    </Button>
                    {maintenance?.imageUrl && (
                        <Button
                            className="w-full"
                            onClick={handleSave}
                        >
                            Cập nhật hoàn thành
                        </Button>
                    )}

                </div>

            </div>

        </div>

    );
};

const Row = ({ label, value }) => (

    <div className="flex justify-between">

        <span className="text-gray-400">
            {label}
        </span>

        <span>
            {value}
        </span>

    </div>

);

export default CompleteMaintenanceModal;