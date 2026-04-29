import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Edit,
  Clock,
  CheckCircle,
  Calendar,
  CircleParking,
} from "lucide-react";
import { ConfigProvider, DatePicker, InputNumber, Modal } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import viVN from "antd/es/locale/vi_VN";
import "dayjs/locale/vi";
import toast from "react-hot-toast";
import parkingLotService from "../../services/parkingLotService";

dayjs.extend(utc);
dayjs.locale("vi");

const toNumberOrNull = (...values) => {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const formatVnd = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `${n.toLocaleString("vi-VN")} VNĐ`;
};

const formatDateTimeVi = (value) => {
  const parsed = parseApiScheduledDate(value);
  return parsed ? parsed.format("DD/MM/YYYY HH:mm") : "";
};

const parseApiScheduledDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const parsed = hasTimezone ? dayjs(raw) : dayjs.utc(raw);
  if (!parsed.isValid()) return null;
  return parsed.local();
};

const extractLotPriceInfo = (lot) => {
  const lotInfo = lot?.lotInfo ?? lot?.parkingLotInfo ?? lot;
  return {
    id: String(lot?.lotId ?? lot?.id ?? lotInfo?.lotId ?? lotInfo?.id ?? ""),
    name:
      lot?.lotName ??
      lot?.name ??
      lotInfo?.lotName ??
      lotInfo?.name ??
      "Bãi xe",
    hourlyRate: toNumberOrNull(
      lot?.hourlyRate,
      lot?.currentHourlyRate,
      lotInfo?.hourlyRate,
      lotInfo?.currentHourlyRate,
      lot?.ratePerHour,
      lotInfo?.ratePerHour,
    ),
    monthlyRate: toNumberOrNull(
      lot?.monthlyRate,
      lotInfo?.monthlyRate,
      lot?.monthRate,
      lotInfo?.monthRate,
    ),
    scheduledPriceUpdateDate:
      lot?.scheduledPriceUpdateDate ??
      lot?.nextPriceUpdateDate ??
      lot?.upcomingPriceUpdateDate ??
      lotInfo?.scheduledPriceUpdateDate ??
      lotInfo?.nextPriceUpdateDate ??
      lotInfo?.upcomingPriceUpdateDate ??
      null,
    scheduledHourlyRate: toNumberOrNull(
      lot?.scheduledHourlyRate,
      lot?.newHourlyRate,
      lot?.pendingHourlyRate,
      lot?.nextHourlyRate,
      lotInfo?.scheduledHourlyRate,
      lotInfo?.newHourlyRate,
      lotInfo?.pendingHourlyRate,
      lotInfo?.nextHourlyRate,
    ),
  };
};

function PriceList() {
  const [loadingLots, setLoadingLots] = useState(true);
  const [parkingLots, setParkingLots] = useState([]);
  const [editingLot, setEditingLot] = useState(null);
  const [editHourlyRate, setEditHourlyRate] = useState(null);
  const [editScheduledAt, setEditScheduledAt] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [cancellingSchedule, setCancellingSchedule] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const loadLots = useCallback(async () => {
    try {
      setLoadingLots(true);
      const data = await parkingLotService.getAllParkingLots();
      const rawLots = Array.isArray(data) ? data : [];
      const baseLots = rawLots.map(extractLotPriceInfo).filter((lot) => lot.id);

      // Bổ sung giá còn thiếu bằng API chi tiết từng bãi để hiển thị đúng giá hiện tại.
      const normalized = await Promise.all(
        baseLots.map(async (lot) => {
          if (lot.hourlyRate != null || lot.monthlyRate != null) return lot;
          try {
            const detail = await parkingLotService.getParkingLotById(lot.id);
            return {
              ...lot,
              ...extractLotPriceInfo(detail),
              id: lot.id,
              name: lot.name,
            };
          } catch {
            return lot;
          }
        }),
      );

      const validLots = normalized.filter((lot) => lot.id);
      setParkingLots(validLots);
      return validLots;
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          err?.message ??
          "Không thể tải danh sách bãi xe. Vui lòng thử lại.",
      );
      return [];
    } finally {
      setLoadingLots(false);
    }
  }, []);

  useEffect(() => {
    loadLots();
  }, [loadLots]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const openEditModal = (lot) => {
    setEditingLot(lot);
    setEditHourlyRate(lot.hourlyRate ?? null);
    setEditScheduledAt(parseApiScheduledDate(lot.scheduledPriceUpdateDate));
  };

  const closeEditModal = () => {
    if (scheduling || cancellingSchedule) return;
    setEditingLot(null);
    setEditHourlyRate(null);
    setEditScheduledAt(null);
  };

  const syncEditingLotFromLatest = (latestLots, lotId) => {
    const matched = latestLots.find((item) => item.id === lotId);
    if (!matched) {
      closeEditModal();
      return;
    }
    setEditingLot(matched);
    setEditHourlyRate(matched.hourlyRate ?? null);
    setEditScheduledAt(parseApiScheduledDate(matched.scheduledPriceUpdateDate));
  };

  const handleSchedulePriceUpdate = async () => {
    if (!editingLot?.id) {
      toast.error("Không tìm thấy bãi xe để cập nhật");
      return;
    }

    const parsedRate = Number(editHourlyRate ?? NaN);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      toast.error("Giá theo giờ mới phải lớn hơn 0");
      return;
    }

    /* Giá mới không được trùng giá hiện tại */
    const currentRate = Number(editingLot.hourlyRate);
    if (Number.isFinite(currentRate) && parsedRate === currentRate) {
      toast.error(
        "Giá theo giờ mới phải khác với giá hiện tại. Vui lòng nhập giá khác.",
      );
      return;
    }

    /* Giá mới không được trùng giá đã lên lịch */
    const scheduledRate = Number(editingLot.scheduledHourlyRate);
    if (Number.isFinite(scheduledRate) && parsedRate === scheduledRate) {
      toast.error(
        "Giá theo giờ mới trùng với lịch đã đặt trước đó. Vui lòng nhập giá khác.",
      );
      return;
    }

    if (!editScheduledAt) {
      toast.error("Vui lòng chọn thời điểm áp dụng");
      return;
    }

    const scheduledDate = editScheduledAt.toDate();
    if (Number.isNaN(scheduledDate.getTime())) {
      toast.error("Thời điểm áp dụng không hợp lệ");
      return;
    }

    if (scheduledDate <= new Date()) {
      toast.error("Thời điểm áp dụng phải lớn hơn hiện tại");
      return;
    }

    setScheduling(true);
    try {
      await parkingLotService.schedulePriceUpdate(editingLot.id, {
        newHourlyRate: parsedRate,
        scheduledPriceUpdateDate: scheduledDate.toISOString(),
      });
      toast.success("Đã lên lịch cập nhật giá theo giờ");
      const latestLots = await loadLots();
      syncEditingLotFromLatest(latestLots, editingLot.id);
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ?? err?.response?.data?.title ?? "";
      const isGenericError =
        !apiMessage || /error\s*id/i.test(apiMessage);
      toast.error(
        isGenericError
          ? "Không thể lên lịch cập nhật giá. Giá mới có thể đang trùng hoặc hệ thống gặp sự cố. Vui lòng thử lại."
          : apiMessage,
      );
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelScheduledPriceUpdate = async () => {
    if (!editingLot?.id) {
      toast.error("Không tìm thấy bãi xe để hủy lịch");
      return;
    }

    setCancellingSchedule(true);
    try {
      await parkingLotService.cancelScheduledPriceUpdate(editingLot.id);
      toast.success("Đã hủy lịch cập nhật giá");
      const latestLots = await loadLots();
      syncEditingLotFromLatest(latestLots, editingLot.id);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          err?.message ??
          "Không thể hủy lịch cập nhật giá. Vui lòng thử lại.",
      );
    } finally {
      setCancellingSchedule(false);
    }
  };

  const openCancelScheduleConfirm = () => {
    if (!editingLot?.id) {
      toast.error("Không tìm thấy bãi xe để hủy lịch");
      return;
    }
    Modal.confirm({
      title: "Hủy lịch cập nhật giá",
      content: "Bạn có chắc muốn hủy lịch cập nhật giá đã đặt cho bãi xe này?",
      okText: "Xác nhận hủy",
      cancelText: "Đóng",
      okButtonProps: { danger: true },
      centered: true,
      zIndex: 2200,
      onOk: () => handleCancelScheduledPriceUpdate(),
    });
  };

  const disabledScheduleDate = (current) =>
    current && current.startOf("day").isBefore(dayjs().startOf("day"));

  const disabledScheduleTime = (current) => {
    if (!current) return {};
    const now = dayjs();
    if (!current.isSame(now, "day")) return {};

    const disabledHours = () =>
      Array.from({ length: now.hour() }, (_, idx) => idx);
    const disabledMinutes = (selectedHour) =>
      selectedHour === now.hour()
        ? Array.from({ length: now.minute() + 1 }, (_, idx) => idx)
        : [];

    return { disabledHours, disabledMinutes };
  };

  const effectiveParkingLots = useMemo(() => {
    return parkingLots.map((lot) => {
      const scheduledAt = parseApiScheduledDate(lot.scheduledPriceUpdateDate);
      const shouldApplyScheduledPrice =
        scheduledAt &&
        Number.isFinite(lot.scheduledHourlyRate) &&
        scheduledAt.valueOf() <= nowTick;

      if (!shouldApplyScheduledPrice) return lot;

      return {
        ...lot,
        hourlyRate: lot.scheduledHourlyRate,
        scheduledHourlyRate: null,
        scheduledPriceUpdateDate: null,
      };
    });
  }, [nowTick, parkingLots]);

  const hasUpcomingSchedule = useMemo(() => {
    if (!editingLot?.scheduledPriceUpdateDate) return false;
    const scheduledAt = parseApiScheduledDate(editingLot.scheduledPriceUpdateDate);
    return Boolean(scheduledAt && scheduledAt.valueOf() > nowTick);
  }, [editingLot, nowTick]);

  const totalLots = effectiveParkingLots.length;
  const configuredLots = effectiveParkingLots.filter(
    (lot) => lot.hourlyRate != null,
  ).length;
  const scheduledLots = effectiveParkingLots.filter(
    (lot) => !!lot.scheduledPriceUpdateDate,
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow border">
          <div className="flex items-center gap-4">
            <CircleParking className="w-8 h-8 flex-shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Tổng bãi xe
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {totalLots}
                <span className="text-base font-medium text-gray-600">
                  Bãi xe
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-500/30 rounded-3xl p-6 shadow border">
          <div className="flex items-center gap-4">
            <CheckCircle className="w-8 h-8 flex-shrink-0 text-green-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Đã cấu hình giá giờ
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {configuredLots}
                <span className="text-base font-medium text-gray-600">
                  Bãi xe
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-500/30 rounded-3xl p-6 shadow border">
          <div className="flex items-center gap-4">
            <Calendar className="w-8 h-8 flex-shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Lịch cập nhật
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {scheduledLots}
                <span className="text-base font-medium text-gray-600">
                  Lịch hẹn
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Giá gửi xe hiện tại theo bãi
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Dữ liệu lấy trực tiếp từ cấu hình hiện tại của từng bãi xe.
            </p>
          </div>
        </div>

        {loadingLots ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
            Đang tải dữ liệu giá gửi xe...
          </div>
        ) : effectiveParkingLots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            Chưa tải được danh sách bãi xe.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {effectiveParkingLots.map((lot) => (
              <div
                key={lot.id}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900 truncate flex-1">
                    {lot.name}
                  </p>
                  <button
                    onClick={() => openEditModal(lot)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Chỉnh sửa
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-[1fr_160px] items-center gap-3 text-sm">
                    <span className="text-gray-500">Giá theo giờ</span>
                    <span className="font-semibold text-green-700 text-right tabular-nums">
                      {formatVnd(lot.hourlyRate)}
                    </span>
                  </div>

                  {lot.scheduledPriceUpdateDate && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-2 text-xs text-amber-700 flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        Sẽ thay đổi thành{" "}
                        <span className="font-semibold">
                          {formatVnd(
                            lot.scheduledHourlyRate ?? lot.hourlyRate ?? null,
                          )}
                        </span>{" "}
                        vào ngày{" "}
                        <span className="font-semibold">
                          {formatDateTimeVi(lot.scheduledPriceUpdateDate)}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(editingLot)}
        onCancel={closeEditModal}
        footer={null}
        title={
          editingLot ? `Chỉnh sửa giá - ${editingLot.name}` : "Chỉnh sửa giá"
        }
        destroyOnHidden
      >
        {editingLot && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 px-3 py-2.5 bg-gray-50">
              <p className="text-xs text-gray-500">Giá theo giờ hiện tại</p>
              <p className="text-sm font-semibold text-blue-700 mt-1">
                {formatVnd(editingLot.hourlyRate)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giá theo giờ mới (VNĐ)
              </label>
              <InputNumber
                value={editHourlyRate}
                onChange={(value) => setEditHourlyRate(value)}
                min={1}
                step={500}
                controls={false}
                className="!w-full !h-[42px]"
                formatter={(value) => {
                  if (value == null || value === "") return "";
                  const numeric = String(value).replace(/\D/g, "");
                  if (!numeric) return "";
                  return `${Number(numeric).toLocaleString("vi-VN")} VNĐ`;
                }}
                parser={(value) => String(value ?? "").replace(/\D/g, "")}
                placeholder="Nhập giá theo giờ mới"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời điểm áp dụng
              </label>
              <ConfigProvider locale={viVN}>
                <DatePicker
                  value={editScheduledAt}
                  onChange={(value) => setEditScheduledAt(value)}
                  showTime={{ format: "HH:mm" }}
                  format="DD/MM/YYYY HH:mm"
                  placeholder="Chọn ngày giờ áp dụng"
                  disabledDate={disabledScheduleDate}
                  disabledTime={disabledScheduleTime}
                  className="w-full h-[42px]"
                  allowClear
                />
              </ConfigProvider>
            </div>

            {hasUpcomingSchedule && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-start gap-1.5">
                <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Lịch hiện tại:{" "}
                  <span className="font-semibold">
                    {formatVnd(
                      editingLot.scheduledHourlyRate ?? editingLot.hourlyRate,
                    )}
                  </span>{" "}
                  vào{" "}
                  <span className="font-semibold">
                    {formatDateTimeVi(editingLot.scheduledPriceUpdateDate)}
                  </span>
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleSchedulePriceUpdate}
                disabled={scheduling}
                className="btn btn-primary disabled:opacity-60"
              >
                {scheduling ? "Đang lưu lịch..." : "Lưu lịch cập nhật"}
              </button>
              <button
                onClick={openCancelScheduleConfirm}
                disabled={cancellingSchedule || !hasUpcomingSchedule}
                className="btn btn-secondary disabled:opacity-60"
              >
                {cancellingSchedule ? "Đang hủy..." : "Hủy lịch hiện tại"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PriceList;
