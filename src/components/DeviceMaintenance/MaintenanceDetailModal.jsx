import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import iotDeviceService from "../../services/iotDeviceService";
import dayjs from "dayjs";
import { Image } from "antd";

function maintenanceStatusVi(statusRaw) {
  const s = String(statusRaw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (s === "completed") return "Đã bảo trì";
  if (s === "cancelled") return "Đã hủy";
  if (s === "pending") return "Chờ xử lý";
  if (s === "inprogress") return "Đang bảo trì";
  if (s === "overdue") return "Quá hạn";
  if (s === "scheduled") return "Đã lên lịch";
  return statusRaw && String(statusRaw).trim() !== "" ? String(statusRaw) : "";
}

function isMaintenanceTerminalStatus(statusRaw) {
  const k = String(statusRaw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return k === "completed" || k === "cancelled";
}

const MAX_IMAGE_MB = 8;

const MaintenanceDetailModal = ({
  maintenanceId,
  onClose,
  onUpdated,
  onBack,
}) => {
  const [maintenance, setMaintenance] = useState(null);
  const [deviceDetail, setDeviceDetail] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const formatDate = (date) => {
    if (!date || date.startsWith("0001")) return "";
    return dayjs(date).format("DD/MM/YYYY HH:mm:ss");
  };

  const format = (date) => {
    if (!date || date.startsWith("0001")) return "";
    return dayjs(date).format("DD/MM/YYYY");
  };

  const fetchDetail = useCallback(async () => {
    try {
      const res = await DeviceMaintenanceService.getById(maintenanceId);

      const data = res?.data || res;

      setMaintenance(data);

      if (data?.deviceId) {
        const device = await iotDeviceService.getById(data.deviceId);

        setDeviceDetail(device);
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Không thể tải chi tiết bảo trì. Vui lòng thử lại.",
      );
    }
  }, [maintenanceId]);

  const handleMarkMaintained = async () => {
    if (!imageFile) {
      toast.error("Vui lòng chọn ảnh minh chứng trước khi cập nhật", {
        duration: 2000,
      });
      return;
    }

    if (imageFile && imageFile.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Ảnh tối đa ${MAX_IMAGE_MB} MB`, { duration: 2000 });
      return;
    }
    setUpdating(true);
    try {
      await DeviceMaintenanceService.markAsMaintained(maintenanceId, {
        imageFile: imageFile ?? null,
      });
      toast.success("Đã cập nhật — trạng thái: đã bảo trì", { duration: 2000 });
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchDetail();
      onUpdated?.();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Không thể cập nhật trạng thái bảo trì. Vui lòng thử lại.";
      toast.error(msg, { duration: 2500 });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

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
          <Row label="Tên bãi" value={deviceDetail?.lotName || ""} />
          <Row label="Tên thiết bị" value={maintenance.deviceName} />

          <Row label="Mã thiết bị" value={maintenance.deviceCode} />

          <Row label="Loại bảo trì" value={maintenance.maintenanceType} />

          <Row label="Mô tả" value={maintenance.description} />

          <Row
            label="Trạng thái"
            value={
              <span className="font-medium text-gray-900">
                {maintenanceStatusVi(maintenance.status)}
              </span>
            }
          />

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
          <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
            {!isMaintenanceTerminalStatus(maintenance.status) && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                <span className="text-gray-600 shrink-0">
                  Ảnh minh chứng <span className="text-red-500">*</span>
                </span>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={updating}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Chọn ảnh
                  </Button>
                  {imageFile ? (
                    <span className="text-xs text-gray-700 truncate max-w-[220px]">
                      {imageFile.name}
                    </span>
                  ) : (
                    <span className="text-xs text-red-500">
                      Vui lòng tải hình ảnh bảo trì trước khi cập nhật
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={onBack}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
              {!isMaintenanceTerminalStatus(maintenance.status) && (
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  disabled={updating}
                  onClick={handleMarkMaintained}
                >
                  {updating ? "Đang cập nhật…" : "Cập nhật"}
                </Button>
              )}
            </div>
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
