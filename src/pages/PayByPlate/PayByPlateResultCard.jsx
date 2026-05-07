import { CheckCircle2, CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVnd } from "./payByPlateUtils";

export default function PayByPlateResultCard({
  result,
  open,
  onOpenChange,
  isImmediate,
  paymentTypeText,
  onNewPayment,
}) {
  if (!result) return null;
  const payload = result?.data ?? result;
  const payosUrl = String(payload.paymentUrl ?? "").trim();
  const hasPayosUrl = Boolean(payosUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <Card className="rounded-2xl border-0 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">
              Kết quả thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payload.hasAdditionalFee && (
              <Alert variant="warning" className="border-amber-200">
                <CircleAlert className="mb-2 h-4 w-4" />
                <AlertTitle>Có phí phát sinh quá giờ</AlertTitle>
                <AlertDescription>
                  Hệ thống xác định đây là khoản phí phát sinh quá giờ.
                </AlertDescription>
              </Alert>
            )}
            {!payload.hasAdditionalFee && payload.totalAmount === 0 && (
              <Alert variant="success" className="border-green-200">
                <CheckCircle2 className="mb-2 h-4 w-4" />
                <AlertTitle>Không cần thanh toán thêm</AlertTitle>
                <AlertDescription>
                  Tổng tiền bằng 0, phiên đã được xử lý hoàn tất.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Loại thanh toán</span>
                <Badge variant="secondary">{paymentTypeText}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Tổng tiền</span>
                <span className="font-semibold text-slate-900">
                  {formatVnd(payload.totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 md:col-span-2">
                <span className="text-slate-600">Trạng thái</span>
                <span className="text-right font-medium text-slate-800">
                  {payload.message || "Không có thông báo"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Thời gian ra</span>
                <span className="font-medium text-slate-800">
                  {isImmediate ? "Ra bãi ngay" : "Hẹn giờ"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Phương thức thanh toán</span>
                <span className="font-medium text-slate-800">PayOS</span>
              </div>
            </div>{" "}
            <div className="flex justify-end">
              <div className="flex flex-wrap justify-end gap-2">
                {/* {onNewPayment && (
                  <Button type="button" onClick={onNewPayment}>
                    Giao dịch mới
                  </Button>
                )} */}
                {/* {hasPayosUrl && (
                  <Button
                    type="button"
                    onClick={() =>
                      window.open(payosUrl, "_blank", "noopener,noreferrer")
                    }
                  >
                    Xác nhận thanh toán
                  </Button>
                )} */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange?.(false)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
