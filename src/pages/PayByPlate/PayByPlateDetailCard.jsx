import { Loader2, X, Info } from "lucide-react";
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
  const paymentStatusKey = normalizeKey(detailView.paymentStatus);
  const isInLot = sessionStatusKey === "active" || sessionStatusKey === "inprogress";
  const isPrepayment =
    sessionStatusText === "Thanh toán trước" ||
    sessionStatusKey === "prepaid" ||
    sessionStatusKey === "parkingprepayment";
  const hasPendingPayment = paymentStatusKey === "pending";
  
  const isAlreadyPaid =
    !hasPendingPayment &&
    !isInLot &&
    (isSessionCompleted(detailView.sessionStatus) ||
      isPrepayment ||
      ["Hoàn thành", "Thanh toán trước", "Thanh toán quá giờ"].includes(
        sessionStatusText,
      ) ||
      ["completed", "paid", "prepaid", "overtimepaid", "overtime"].includes(
        paymentStatusKey,
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
        <div className="space-y-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm">
          {/* Nhóm 1: Thông tin chung */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Biển số xe</span>
              <span className="font-semibold text-slate-900">
                {detailView.licensePlate || normalizedPlate}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Bãi gửi xe</span>
              <span className="text-right font-medium text-slate-900">
                {detailView.lotName || "Không xác định"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Trạng thái phiên</span>
              <Badge
                variant={sessionStatusBadgeVariant(detailView.sessionStatus)}
                className={sessionStatusBadgeClass(detailView.sessionStatus)}
              >
                {sessionStatusLabel(detailView.sessionStatus)}
              </Badge>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Nhóm 2: Cấu trúc thời gian */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Thời gian vào</span>
              <span className="font-medium text-slate-900">
                {formatDateTime(detailView.checkInTime, 7)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Thời gian ra dự kiến</span>
              <span className="font-medium text-slate-900">
                {formatDateTime(detailView.expectedCheckoutTime, 7)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Thời gian ra thực tế</span>
              <span className="font-medium text-slate-900">
                {formatDateTime(detailView.checkOutTime)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 font-medium">Tổng thời gian</span>
              <span className="font-semibold text-indigo-600">
                {formatHours(detailView.totalHours)}
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          {/* Nhóm 3: Cấu trúc tài chính */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Đơn giá theo giờ</span>
              <span className="font-medium text-slate-900">
                {formatVnd(detailView.hourlyRate)}
              </span>
            </div>
            
            {detailView.overtimeAmount > 0 && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-orange-600">
                  <span className="font-medium">Phí quá giờ</span>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 cursor-help opacity-70" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[11px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xl">
                      Tính dựa trên số giờ quá hạn
                    </div>
                  </div>
                </div>
                <span className="font-bold text-orange-600">
                  {formatVnd(detailView.overtimeAmount)}
                </span>
              </div>
            )}

            {detailView.overtimeHours > 0 && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Số giờ quá hạn</span>
                <span className="font-medium text-orange-600">
                  {formatHours(detailView.overtimeHours)}
                </span>
              </div>
            )}

            {detailView.prepaidAmount > 0 && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Đã thanh toán trước</span>
                <span className="font-medium text-emerald-600">
                  -{formatVnd(detailView.prepaidAmount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-slate-500">Tổng cộng</span>
              <span className="font-medium text-slate-900">
                {formatVnd(detailView.totalAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-200">
              <span className="text-slate-900 font-bold text-base">
                Số tiền cần thanh toán
              </span>
              <span className="text-2xl font-black text-indigo-700 tracking-tight">
                {formatVnd(detailView.remainingAmount ?? detailView.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* {detailView.message && (
          <p className="mt-3 text-sm text-slate-700">{detailView.message}</p>
        )} */}

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
