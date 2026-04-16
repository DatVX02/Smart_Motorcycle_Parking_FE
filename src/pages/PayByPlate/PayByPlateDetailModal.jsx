import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDateTime,
  formatHours,
  formatVnd,
  paymentStatusLabel,
  sessionStatusBadgeClass,
  sessionStatusBadgeVariant,
  sessionStatusLabel,
} from "./payByPlateUtils";

export default function PayByPlateDetailModal({
  open,
  onOpenChange,
  detailView,
  normalizedPlate,
  onPay,
  paymentLoading,
  previewLoading,
  canPay,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Chi tiết phiên gửi xe</DialogTitle>
          <DialogDescription>
            Xác nhận thông tin trước khi thực hiện thanh toán.
          </DialogDescription>
        </DialogHeader>

        {detailView && (
          <>
            <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
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
                  {formatDateTime(detailView.checkInTime, true)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Thời gian ra dự kiến</span>
                <span className="font-medium text-slate-900">
                  {formatDateTime(detailView.expectedCheckoutTime, true)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Thời gian ra thực tế</span>
                <span className="font-medium text-slate-900">
                  {formatDateTime(detailView.checkOutTime, true)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Trạng thái thanh toán</span>
                <span className="font-medium text-slate-900">
                  {paymentStatusLabel(detailView.paymentStatus)}
                </span>
              </div>
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
                  {formatVnd(
                    detailView.remainingAmount ?? detailView.totalAmount,
                  )}
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
              <p className="mt-3 text-sm text-slate-700">
                {detailView.message}
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Đóng
              </Button>
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
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
