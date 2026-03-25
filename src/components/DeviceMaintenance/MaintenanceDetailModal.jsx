import React, { useEffect, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import iotDeviceService from "../../services/iotDeviceService";
import dayjs from "dayjs";
import { Image } from "antd";

const MaintenanceDetailModal = ({ maintenanceId, onClose, onUpdated, onBack }) => {
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
      toast.error("Không thể tải chi tiết", { duration: 1000 });
    }
  };

  const updateNextMaintenance = async (date) => {
    try {
      await DeviceMaintenanceService.update(maintenanceId, {
        nextMaintenanceDate: date,
      });

      toast.success("Cập nhật thành công", { duration: 1000 });

      fetchDetail();

      onUpdated();
    } catch {
      toast.error("Không thể cập nhật", { duration: 1000 });
    }
  };

  const handleComplete = async () => {
    try {
      await DeviceMaintenanceService.complete(
        maintenanceId,
        nextMaintenanceDate,
        image,
      );

      toast.success("Đã hoàn thành bảo trì", { duration: 1000 });

      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);

      toast.error("Không thể cập nhật bảo trì", { duration: 1000 });
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [maintenanceId]);

  if (!maintenance) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-[520px] shadow-lg">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold">Chi tiết bảo trì</h2>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <Row label="Tên bãi" value={deviceDetail?.lotName || "-"} />
          <Row label="Tên thiết bị" value={maintenance.deviceName} />

          <Row label="Mã thiết bị" value={maintenance.deviceCode} />

          <Row label="Loại bảo trì" value={maintenance.maintenanceType} />

          <Row label="Mô tả" value={maintenance.description} />

          <Row
            label="Hình ảnh bảo trì"
            value={
              maintenance.imageUrl ? (
                <Image
                  src={maintenance.imageUrl}
                  width={150}
                  height={100}
                  className="mt-2 rounded-xl border"
                />
              ) : (
                "-"
              )
            }
          ></Row>
          <Row
            label="Ngày thực hiện"
            value={formatDate(maintenance.performedAt)}
          />
          {maintenance.status !== "Cancelled" &&
            maintenance.nextMaintenanceDate && (
              <Row
                label="Ngày bảo trì tiếp theo"
                value={(() => {
                  const daysLeft = dayjs(maintenance.nextMaintenanceDate).diff(
                    dayjs(),
                    "day",
                  );
                  const dateStr = format(maintenance.nextMaintenanceDate);
                  if (daysLeft === 0)
                    return (
                      <span>
                        <span className="text-amber-600 font-medium">
                          Tới hạn bảo trì
                        </span>{" "}
                        ({dateStr})
                      </span>
                    );
                  if (daysLeft < 0)
                    return (
                      <span>
                        <span className="text-red-600 font-medium">
                          Quá hạn
                        </span>{" "}
                        ({dateStr})
                      </span>
                    );
                  return dateStr;
                })()}
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
              <hr className="my-4 border-gray-100" />

              <Row label="Model" value={deviceDetail.model} />

              <Row label="IP Address" value={deviceDetail.ipAddress} />

              <Row label="MAC Address" value={deviceDetail.macAddress} />

              <Row label="Firmware" value={deviceDetail.firmwareVersion} />

              <Row
                label="Trạng thái kết nối"
                value={
                  deviceDetail.connectionStatus ? "Trực tuyến" : "Ngoại tuyến"
                }
              />
            </>
          )}
        </div>

        {onBack && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="grid grid-cols-[130px_1fr] gap-4 items-start min-h-[24px]">
    <span className="text-gray-500 shrink-0 pt-0.5">{label}</span>
    <span className="text-gray-900 break-words">{value}</span>
  </div>
);

export default MaintenanceDetailModal;
