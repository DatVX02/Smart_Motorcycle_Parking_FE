import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDateTime,
  formatHours,
  formatVnd,
  isSessionCompleted,
  sessionStatusBadgeClass,
  sessionStatusBadgeVariant,
  sessionStatusLabel,
  normalizeKey,
} from "./payByPlateUtils";

export default function PayByPlateDetailCard({
  detailView,
  normalizedPlate,
  onPay,
  onClose,
  paymentLoading,
  previewLoading,
  canPay,
}) {
  if (!detailView) return null;

  const sessionStatusText = sessionStatusLabel(detailView.sessionStatus);
  const sessionStatusKey = normalizeKey(detailView.sessionStatus);
  const isInLot = sessionStatusKey === "active" || sessionStatusKey === "inprogress";
  const isPrepayment =
    sessionStatusText === "Thanh toán trước" ||
    sessionStatusKey === "prepaid" ||
    sessionStatusKey === "parkingprepayment";
  const isAlreadyPaid =
    !isInLot &&
    (isSessionCompleted(detailView.sessionStatus) ||
      isPrepayment ||
      ["Hoàn thành", "Thanh toán trước", "Thanh toán quá giờ"].includes(
        sessionStatusText,
      ) ||
      ["completed", "paid", "prepaid", "overtimepaid", "overtime"].includes(
        normalizeKey(detailView.paymentStatus),
      ));

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 h-full flex flex-col">
      <CardHeader className="relative space-y-2 pt-8 pb-4 px-6 sm:px-8">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Đóng chi tiết"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
          Chi tiết phiên gửi xe
        </CardTitle>
        <CardDescription className="text-slate-500 text-sm font-medium">
          Xác nhận thông tin trước khi thực hiện thanh toán.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-8 sm:px-8">
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Biển số xe</span>
            <span className="font-medium text-slate-900">
              {detailView.licensePlate || normalizedPlate}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Bãi gửi xe</span>
            <span className="text-right font-medium text-slate-900">
              {detailView.lotName || "Không xác định"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Trạng thái phiên</span>
            <Badge
              variant={sessionStatusBadgeVariant(detailView.sessionStatus)}
              className={sessionStatusBadgeClass(detailView.sessionStatus)}
            >
              {sessionStatusLabel(detailView.sessionStatus)}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Thời gian vào</span>
            <span className="font-medium text-slate-900">
              {formatDateTime(detailView.checkInTime, 7)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Thời gian ra dự kiến</span>
            <span className="font-medium text-slate-900">
              {formatDateTime(detailView.expectedCheckoutTime, 7)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Thời gian ra thực tế</span>
            <span className="font-medium text-slate-900">
              {formatDateTime(detailView.checkOutTime)}
            </span>
          </div>
          {/* <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Trạng thái thanh toán</span>
            <span className="font-medium text-slate-900">
              {paymentStatusLabel(
                detailView.paymentStatus,
                detailView.sessionStatus,
              )}
            </span>
          </div> */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Tổng thời gian</span>
            <span className="font-medium text-slate-900">
              {formatHours(detailView.totalHours)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Đơn giá theo giờ</span>
            <span className="font-medium text-slate-900">
              {formatVnd(detailView.hourlyRate)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Tạm tính hiện tại</span>
            <span className="font-semibold text-slate-900">
              {formatVnd(detailView.remainingAmount ?? detailView.totalAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Phí quá giờ</span>
            <span className="font-medium text-slate-900">
              {formatVnd(detailView.overtimeAmount)}
            </span>
          </div>
        </div>

        {detailView.message && (
          <p className="mt-3 text-sm text-slate-700">{detailView.message}</p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose}>
              Đóng
            </Button>
          )}
          {!isAlreadyPaid && (
            <Button
              type="button"
              onClick={onPay}
              className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700"
              disabled={paymentLoading || previewLoading || !canPay}
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo thanh toán...
                </>
              ) : (
                "Xác nhận thanh toán"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
