import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Wallet,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatVnd } from "./payByPlateUtils";

export default function PayByPlateResultCard({
  result,
  open,
  onOpenChange,
  isImmediate,
  paymentTypeText,
}) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <Card className="rounded-2xl border-0 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900">
              Kết quả thanh toán
            </CardTitle>
            <CardDescription>
              Hệ thống hiển thị đúng luồng phát sinh quá giờ hoặc thanh toán
              trước.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.hasAdditionalFee && (
              <Alert variant="warning" className="border-amber-200">
                <CircleAlert className="mb-2 h-4 w-4" />
                <AlertTitle>Có phí phát sinh quá giờ</AlertTitle>
                <AlertDescription>
                  Hệ thống xác định đây là khoản phí phát sinh quá giờ.
                </AlertDescription>
              </Alert>
            )}

            {!result.hasAdditionalFee && result.totalAmount === 0 && (
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
                  {formatVnd(result.totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 md:col-span-2">
                <span className="text-slate-600">Thông báo</span>
                <span className="text-right font-medium text-slate-800">
                  {result.message || "Không có thông báo"}
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
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-slate-600">
                  <Wallet className="h-4 w-4" /> Đã trả bằng ví
                </span>
                <span className="font-medium text-slate-800">
                  {formatVnd(result.paidWithWallet)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-slate-600">
                  <Clock3 className="h-4 w-4" /> Đã trả bằng điểm
                </span>
                <span className="font-medium text-slate-800">
                  {result.paidWithPoints.toLocaleString("vi-VN")}
                </span>
              </div>
            </div>

            {result.totalAmount > 0 && result.paymentUrl && (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700"
                  onClick={() =>
                    window.location.href = result.paymentUrl
                  }
                >
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Mở liên kết PayOS
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
