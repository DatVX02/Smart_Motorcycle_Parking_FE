import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import toast from "react-hot-toast";
import parkingSessionService from "@/services/parkingSessionService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import PayByPlateDetailModal from "./PayByPlateDetailModal";
import PayByPlateForm from "./PayByPlateForm";
import PayByPlateResultCard from "./PayByPlateResultCard";
import {
  mergePreviewData,
  normalizePreviewResponse,
  normalizeResponse,
  paymentTypeLabel,
} from "./payByPlateUtils";

dayjs.locale("vi");

const PAY_BY_PLATE_PENDING_KEY = "payByPlatePendingPayment";

function isTruthyQueryValue(value) {
  return ["1", "true", "yes", "y"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

function isFalsyQueryValue(value) {
  return ["0", "false", "no", "n"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

export default function PayByPlate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [licensePlate, setLicensePlate] = useState("");
  const [isImmediate, setIsImmediate] = useState(true);
  const [expectedCheckoutTime, setExpectedCheckoutTime] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewForPlate, setPreviewForPlate] = useState("");
  const [result, setResult] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  const normalizedPlate = useMemo(
    () => licensePlate.trim().toUpperCase(),
    [licensePlate],
  );

  const canPay = Boolean(preview) && previewForPlate === normalizedPlate;

  const paymentTypeText = useMemo(
    () => paymentTypeLabel(result?.paymentType),
    [result?.paymentType],
  );

  const detailView = useMemo(() => {
    if (!preview) return null;
    if (!result?.raw) return preview;

    const paymentDetail = normalizePreviewResponse(result.raw);
    return mergePreviewData(preview, paymentDetail);
  }, [preview, result?.raw]);

  useEffect(() => {
    const hasParams = Array.from(searchParams.keys()).length > 0;
    if (!hasParams) return;

    const status = String(
      searchParams.get("status") ??
        searchParams.get("paymentStatus") ??
        searchParams.get("payment_status") ??
        "",
    )
      .trim()
      .toUpperCase();
    const code = String(
      searchParams.get("code") ?? searchParams.get("resultCode") ?? "",
    )
      .trim()
      .toUpperCase();

    const isSuccess =
      code === "00" ||
      isTruthyQueryValue(searchParams.get("success")) ||
      [
        "PAID",
        "SUCCESS",
        "SUCCEEDED",
        "COMPLETED",
        "OVERTIMEPAID",
        "OVERTIME_PAID",
        "PREPAID",
      ].includes(status) ||
      (isFalsyQueryValue(searchParams.get("cancel")) &&
        [
          "PAID",
          "SUCCESS",
          "COMPLETED",
          "OVERTIMEPAID",
          "OVERTIME_PAID",
          "PREPAID",
          "",
        ].includes(status));

    const isCancelled =
      isTruthyQueryValue(searchParams.get("cancel")) ||
      ["FAILED", "CANCEL", "CANCELED", "CANCELLED", "ERROR"].includes(status);

    if (!isSuccess && !isCancelled) return;

    let pending = null;
    try {
      const raw = localStorage.getItem(PAY_BY_PLATE_PENDING_KEY);
      pending = raw ? JSON.parse(raw) : null;
    } catch {
      pending = null;
    }

    if (isSuccess) {
      if (pending?.result) {
        const restoredResult = {
          ...pending.result,
          message: "Thanh toán thành công",
        };
        setResult(restoredResult);
        if (pending?.licensePlate) {
          const restoredPlate = String(pending.licensePlate).toUpperCase();
          setLicensePlate(restoredPlate);
          setPreviewForPlate(restoredPlate);
        }
        setIsResultModalOpen(true);
      }
      toast.success("Thanh toán thành công");
    } else {
      toast.error("Thanh toán chưa hoàn tất");
    }

    localStorage.removeItem(PAY_BY_PLATE_PENDING_KEY);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const disabledPastDate = (current) =>
    Boolean(current && current < dayjs().startOf("day"));

  const disabledPastTime = (current) => {
    if (!current || !current.isSame(dayjs(), "day")) return {};

    const now = dayjs();
    const disabledHours = () => Array.from({ length: now.hour() }, (_, i) => i);
    const disabledMinutes = (selectedHour) => {
      if (selectedHour !== now.hour()) return [];
      return Array.from({ length: now.minute() }, (_, i) => i);
    };

    return {
      disabledHours,
      disabledMinutes,
      disabledSeconds: () => [],
    };
  };

  const handlePlateChange = (value) => {
    setLicensePlate(value.toUpperCase());
    setPreview(null);
    setPreviewForPlate("");
    setResult(null);
    setIsDetailModalOpen(false);
    setIsResultModalOpen(false);
  };

  const handleToggleImmediate = (immediate) => {
    setIsImmediate(immediate);
    if (immediate) {
      setExpectedCheckoutTime("");
    }
    setResult(null);
    setIsResultModalOpen(false);
  };

  const handleExpectedCheckoutTimeChange = (value) => {
    setExpectedCheckoutTime(value);
    setResult(null);
    setIsResultModalOpen(false);
  };

  const handleLookup = async (event) => {
    event.preventDefault();
    if (!normalizedPlate) {
      toast.error("Vui lòng nhập biển số xe");
      return;
    }

    setPreviewLoading(true);
    try {
      setResult(null);
      setIsResultModalOpen(false);
      const statusResponse =
        await parkingSessionService.getStatusByPlate(normalizedPlate);
      let normalizedPreview = normalizePreviewResponse(statusResponse);

      if (normalizedPreview.sessionId) {
        try {
          const detailResponse = await parkingSessionService.getById(
            normalizedPreview.sessionId,
          );
          const detailPreview = normalizePreviewResponse(detailResponse);
          normalizedPreview = mergePreviewData(
            normalizedPreview,
            detailPreview,
          );
        } catch {
          // Keep status-by-plate data if detail API is unavailable
        }
      }

      setPreview(normalizedPreview);
      setPreviewForPlate(normalizedPlate);
      setIsDetailModalOpen(true);
      toast.success("Đã tải chi tiết phiên gửi xe");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể lấy chi tiết biển số";
      toast.error(message);
      setPreview(null);
      setPreviewForPlate("");
      setIsDetailModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!normalizedPlate) {
      toast.error("Vui lòng nhập biển số xe");
      return;
    }
    if (!canPay) {
      toast.error("Vui lòng bấm Xem chi tiết trước khi thanh toán");
      return;
    }

    const payload = {
      licensePlate: normalizedPlate,
      paymentMethod: "payos",
    };

    if (!isImmediate) {
      if (!expectedCheckoutTime) {
        toast.error("Vui lòng chọn thời gian ra");
        return;
      }

      const parsedCheckoutTime = new Date(expectedCheckoutTime);
      if (Number.isNaN(parsedCheckoutTime.getTime())) {
        toast.error("Thời gian ra không hợp lệ");
        return;
      }

      payload.expectedCheckoutTime = parsedCheckoutTime.toISOString();
    }

    setPaymentLoading(true);
    try {
      const response = await parkingSessionService.payByPlate(payload);
      const normalized = normalizeResponse(response);

      const paymentPreview = normalizePreviewResponse(response);
      setPreview((prev) =>
        mergePreviewData(
          prev ?? { licensePlate: normalizedPlate },
          paymentPreview,
        ),
      );
      setPreviewForPlate(normalizedPlate);
      setIsDetailModalOpen(false);

      if (normalized.totalAmount > 0 && normalized.paymentUrl) {
        localStorage.setItem(
          PAY_BY_PLATE_PENDING_KEY,
          JSON.stringify({
            licensePlate: normalizedPlate,
            isImmediate,
            expectedCheckoutTime,
            result: normalized,
            createdAt: new Date().toISOString(),
          }),
        );
        window.open(normalized.paymentUrl, "_blank", "noopener,noreferrer");
        toast.success("Đã tạo liên kết PayOS");
      } else if (normalized.totalAmount === 0) {
        localStorage.removeItem(PAY_BY_PLATE_PENDING_KEY);
        setResult(normalized);
        setIsResultModalOpen(true);
        toast.success("Không cần thanh toán thêm");
      } else {
        localStorage.removeItem(PAY_BY_PLATE_PENDING_KEY);
        setResult(normalized);
        setIsResultModalOpen(true);
        toast.success("Đã xử lý thanh toán");
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể xử lý thanh toán";
      toast.error(message);
      setResult(null);
      setIsResultModalOpen(false);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-50 font-sans p-4 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/parking-lot.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-slate-900/55" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Card Thanh toán: Đồng bộ nền trắng, viền mỏng, đổ bóng giống form đăng nhập */}
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <CardHeader className="text-center space-y-2 pt-8 pb-4">
            <div className="mx-auto mb-2">
              <img
                src="/logo_motorguard.png"
                alt="MotoGuard"
                className="w-60 h-40 object-contain mx-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
              Thanh toán gửi xe theo biển số
            </CardTitle>
            <CardDescription className="text-slate-500 text-sm font-medium">
              Dành cho khách vãng lai. Nhập biển số xe để tra cứu phiên gửi và
              thực hiện thanh toán.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8 sm:px-10">
            <PayByPlateForm
              licensePlate={licensePlate}
              onLicensePlateChange={handlePlateChange}
              isImmediate={isImmediate}
              onToggleImmediate={handleToggleImmediate}
              expectedCheckoutTime={expectedCheckoutTime}
              onExpectedCheckoutTimeChange={handleExpectedCheckoutTimeChange}
              disabledPastDate={disabledPastDate}
              disabledPastTime={disabledPastTime}
              previewLoading={previewLoading}
              paymentLoading={paymentLoading}
              canPay={canPay}
              onLookup={handleLookup}
            />
          </CardContent>
        </Card>

        {/* Các Modal và Footer giữ nguyên */}
        <PayByPlateDetailModal
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          detailView={detailView}
          normalizedPlate={normalizedPlate}
          onPay={handlePayment}
          paymentLoading={paymentLoading}
          previewLoading={previewLoading}
          canPay={canPay}
        />

        <PayByPlateResultCard
          result={result}
          isImmediate={isImmediate}
          paymentTypeText={paymentTypeText}
          open={isResultModalOpen}
          onOpenChange={setIsResultModalOpen}
        />

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-200 font-medium tracking-wide">
            © 2026 FPT University · MotoGuard Team
          </p>
        </div>
      </div>
    </div>
  );
}
