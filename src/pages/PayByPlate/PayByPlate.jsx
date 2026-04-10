import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function PayByPlate() {
  const navigate = useNavigate();
  const [licensePlate, setLicensePlate] = useState("");
  const [isImmediate, setIsImmediate] = useState(true);
  const [expectedCheckoutTime, setExpectedCheckoutTime] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewForPlate, setPreviewForPlate] = useState("");
  const [result, setResult] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
  };

  const handleToggleImmediate = (immediate) => {
    setIsImmediate(immediate);
    if (immediate) {
      setExpectedCheckoutTime("");
    }
    setResult(null);
  };

  const handleExpectedCheckoutTimeChange = (value) => {
    setExpectedCheckoutTime(value);
    setResult(null);
  };

  const handleLookup = async (event) => {
    event.preventDefault();
    if (!normalizedPlate) {
      toast.error("Vui lòng nhập biển số xe");
      return;
    }

    setPreviewLoading(true);
    try {
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
      setResult(normalized);

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
        window.open(normalized.paymentUrl, "_blank", "noopener,noreferrer");
        toast.success("Đã tạo liên kết PayOS");
      } else if (normalized.totalAmount === 0) {
        toast.success("Không cần thanh toán thêm");
      } else {
        toast.success("Đã xử lý thanh toán");
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể xử lý thanh toán";
      toast.error(message);
      setResult(null);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-black px-4 py-10 sm:py-14">
      <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-4xl space-y-6">
        <Card className="rounded-2xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-3 text-center">
            <img
              src="/logo_motorguard.png"
              alt="MotoGuard"
              className="mx-auto w-20 drop-shadow-md"
            />
            <CardTitle className="text-2xl text-slate-900">
              Thanh toán gửi xe theo biển số
            </CardTitle>
            <CardDescription className="text-slate-600">
              Dành cho khách vãng lai. Nhập biển số xe để tra cứu phiên gửi và
              thực hiện thanh toán.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              onBackToLogin={() => navigate("/login")}
            />
          </CardContent>
        </Card>

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
        />

        <p className="text-center text-xs text-white/60">
          © 2026 FPT University · MotoGuard Team
        </p>
      </div>
    </div>
  );
}
