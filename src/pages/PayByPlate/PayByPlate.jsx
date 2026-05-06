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
import PayByPlateDetailCard from "./PayByPlateDetailCard";
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

  const isLockedAfterPayment = Boolean(result);

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

    const cancelVal = searchParams.get("cancel")?.trim().toLowerCase();
    // Ưu tiên kiểm tra cancel từ URL param của PayOS
    const isCancelled =
      cancelVal === "true" ||
      cancelVal === "1" ||
      ["FAILED", "CANCEL", "CANCELED", "CANCELLED", "ERROR"].includes(status);

    const isSuccess =
      !isCancelled &&
      (searchParams.get("success")?.toLowerCase() === "true" ||
        (code === "00" && (cancelVal === "false" || !cancelVal)) ||
        [
          "PAID",
          "SUCCESS",
          "SUCCEEDED",
          "COMPLETED",
          "OVERTIMEPAID",
          "OVERTIME_PAID",
          "PREPAID",
        ].includes(status));

    console.log("PayOS Callback Debug:", {
      code,
      status,
      cancelVal,
      isCancelled,
      isSuccess,
    });

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
      // Nếu hủy, chỉ cần khôi phục biển số (để tiện lợi) nhưng đóng modal/card chi tiết để quay về trạng thái ban đầu
      if (pending?.licensePlate) {
        setLicensePlate(String(pending.licensePlate).toUpperCase());
      }
      setPreview(null);
      setPreviewForPlate("");
      setIsDetailModalOpen(false);
      toast.error("Thanh toán bị hủy");
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
    if (isLockedAfterPayment) return;
    setLicensePlate(value.toUpperCase());
    setPreview(null);
    setPreviewForPlate("");
    setResult(null);
    setIsDetailModalOpen(false);
    setIsResultModalOpen(false);
  };

  const handleToggleImmediate = (immediate) => {
    if (isLockedAfterPayment) return;
    setIsImmediate(immediate);
    if (immediate) {
      setExpectedCheckoutTime("");
    }
    setResult(null);
    setIsResultModalOpen(false);
    setPreview(null);
    setPreviewForPlate("");
    setIsDetailModalOpen(false);
  };

  const handleExpectedCheckoutTimeChange = (value) => {
    if (isLockedAfterPayment) return;
    setExpectedCheckoutTime(value);
    setResult(null);
    setIsResultModalOpen(false);
    setPreview(null);
    setPreviewForPlate("");
    setIsDetailModalOpen(false);
  };

  /** Cùng payload với xác nhận thanh toán — lấy đúng DTO từ POST /pay-by-plate */
  const buildPayByPlatePayload = () => {
    const returnUrl = `${window.location.origin}/pay-by-plate`;
    const payload = {
      licensePlate: normalizedPlate,
      paymentMethod: "payos",
      platform: "web",
      returnUrl,
      cancelUrl: returnUrl,
      successUrl: returnUrl,
      failureUrl: returnUrl,
    };

    if (!isImmediate) {
      if (!expectedCheckoutTime) {
        return { error: "Vui lòng chọn thời gian ra" };
      }
      const parsedCheckoutTime = new Date(expectedCheckoutTime);
      if (Number.isNaN(parsedCheckoutTime.getTime())) {
        return { error: "Thời gian ra không hợp lệ" };
      }
      payload.expectedCheckoutTime = parsedCheckoutTime.toISOString();
    }

    return { payload };
  };

  const handleLookup = async (event) => {
    event.preventDefault();
    if (isLockedAfterPayment) {
      toast.error("Vui lòng bấm 'Giao dịch mới' để thực hiện thanh toán khác");
      return;
    }
    if (!normalizedPlate) {
      toast.error("Vui lòng nhập biển số xe");
      return;
    }

    const built = buildPayByPlatePayload();
    if (built.error) {
      toast.error(built.error);
      return;
    }

    setPreviewLoading(true);
    try {
      setResult(null);
      setIsResultModalOpen(false);
      const response = await parkingSessionService.payByPlate(built.payload);
      const normalizedPreview = normalizePreviewResponse(response);

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
    if (isLockedAfterPayment) {
      toast.error("Vui lòng bấm 'Giao dịch mới' để thực hiện thanh toán khác");
      return;
    }
    if (!normalizedPlate) {
      toast.error("Vui lòng nhập biển số xe");
      return;
    }
    if (!canPay) {
      toast.error("Vui lòng bấm Xem chi tiết trước khi thanh toán");
      return;
    }

    const built = buildPayByPlatePayload();
    if (built.error) {
      toast.error(built.error);
      return;
    }

    const samePlate = previewForPlate === normalizedPlate;
    const existingUrl = String(preview?.paymentUrl ?? "").trim();
    const reusePayByPlateResult =
      samePlate && Boolean(existingUrl && preview?.raw);

    setPaymentLoading(true);
    try {
      const response = reusePayByPlateResult
        ? { data: preview.raw, success: true }
        : await parkingSessionService.payByPlate(built.payload);

      const normalized = normalizeResponse(response);

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
        window.location.href = normalized.paymentUrl;
        toast.success("Đang chuyển đến cổng thanh toán PayOS...");
      } else if (normalized.totalAmount === 0) {
        localStorage.removeItem(PAY_BY_PLATE_PENDING_KEY);
        setPreview(null);
        setPreviewForPlate("");
        setResult(normalized);
        setIsResultModalOpen(true);
        toast.success("Không cần thanh toán thêm");
      } else {
        localStorage.removeItem(PAY_BY_PLATE_PENDING_KEY);
        setPreview(null);
        setPreviewForPlate("");
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

  const handleNewPayment = () => {
    setLicensePlate("");
    setIsImmediate(true);
    setExpectedCheckoutTime("");
    setPreviewLoading(false);
    setPaymentLoading(false);
    setPreview(null);
    setPreviewForPlate("");
    setResult(null);
    setIsDetailModalOpen(false);
    setIsResultModalOpen(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-50 font-sans p-4 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/parking-lot.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-slate-900/55" />

      <div
        className={`relative z-10 w-full transition-all duration-300 ${
          isDetailModalOpen ? "max-w-6xl" : "max-w-2xl"
        }`}
      >
        <div
          className={`grid gap-6 items-stretch ${
            isDetailModalOpen ? "lg:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {/* Card Thanh toán */}
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 h-full flex flex-col">
            <CardHeader className="text-center space-y-6 pt-10 pb-8">
              <div className="mx-auto mb-4">
                <img
                  src="/logo_motorguard.png"
                  alt="MotoGuard"
                  className="w-64 h-44 object-contain mx-auto"
                />
              </div>
              <div className="space-y-3">
                <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
                  Thanh toán gửi xe theo biển số
                </CardTitle>
                <CardDescription className="text-slate-500 text-base font-medium max-w-md mx-auto leading-relaxed">
                  Dành cho khách vãng lai. Nhập biển số xe để tra cứu phiên gửi
                  và thực hiện thanh toán.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-10 sm:px-10 flex-1 flex flex-col">
              <PayByPlateForm
                licensePlate={licensePlate}
                onLicensePlateChange={handlePlateChange}
                locked={isLockedAfterPayment}
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

          {/* Card chi tiết - hiện bên cạnh khi có dữ liệu */}
          {isDetailModalOpen && detailView && (
            <PayByPlateDetailCard
              detailView={detailView}
              normalizedPlate={normalizedPlate}
              onPay={handlePayment}
              onClose={() => setIsDetailModalOpen(false)}
              paymentLoading={paymentLoading}
              previewLoading={previewLoading}
              canPay={canPay}
            />
          )}
        </div>

        <PayByPlateResultCard
          result={result}
          isImmediate={isImmediate}
          paymentTypeText={paymentTypeText}
          open={isResultModalOpen}
          onOpenChange={setIsResultModalOpen}
          onNewPayment={handleNewPayment}
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
