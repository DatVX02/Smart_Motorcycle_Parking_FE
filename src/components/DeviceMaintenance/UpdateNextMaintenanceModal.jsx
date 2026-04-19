import React, { useState } from "react";
import toast from "react-hot-toast";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import { Button } from "@/components/ui/button";

const UpdateNextMaintenanceModal = ({
    maintenanceId,
    onClose,
    onUpdated
}) => {

    const [date, setDate] = useState("");

    const handleUpdate = async () => {

        if (!date) {
            toast.error("Vui lòng chọn ngày");
            return;
        }

        try {

            await DeviceMaintenanceService.update(maintenanceId, {
                status,
                nextMaintenanceDate,
                reason: reason || null
            });

            toast.success("Cập nhật ngày bảo trì thành công", {duration: 1500});

            onUpdated();
            onClose();

        } catch (err) {

            toast.error(
                err?.response?.data?.message ||
                    "Không thể cập nhật ngày bảo trì. Vui lòng thử lại.",
            );

        }

    };

    return (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

            <div className="bg-white rounded-3xl w-[400px] p-6">

                <h2 className="text-lg font-semibold mb-4">
                    Cập nhật ngày bảo trì
                </h2>

                <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />

                <div className="flex gap-3 mt-6">

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={onClose}
                    >
                        Hủy
                    </Button>

                    <Button
                        className="w-full"
                        onClick={handleUpdate}
                    >
                        Lưu
                    </Button>

                </div>

            </div>

        </div>

    );
};

export default UpdateNextMaintenanceModal;