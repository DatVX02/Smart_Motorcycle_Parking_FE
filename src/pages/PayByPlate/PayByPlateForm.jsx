import { ConfigProvider, DatePicker } from "antd";
import dayjs from "dayjs";
import viVN from "antd/es/locale/vi_VN";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  LogOut,
  Motorbike,
  Search,
  UserRound,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PayByPlateForm({
  licensePlate,
  onLicensePlateChange,
  isImmediate,
  onToggleImmediate,
  expectedCheckoutTime,
  onExpectedCheckoutTimeChange,
  disabledPastDate,
  disabledPastTime,
  previewLoading,
  paymentLoading,
  canPay,
  onLookup,
  onBackToLogin,
}) {
  return (
    <form className="space-y-5" onSubmit={onLookup}>
      <div className="space-y-2">
        <Label htmlFor="licensePlate">Biển số xe *</Label>
        <div className="relative">
          <Motorbike className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="licensePlate"
            value={licensePlate}
            onChange={(event) => onLicensePlateChange(event.target.value)}
            placeholder="VD: 59A-123.45"
            autoComplete="off"
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Loại khách</Label>
          <p className="inline-flex w-full items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <UserRound className="mr-2 h-4 w-4" />
            Khách vãng lai
          </p>
        </div>

        <div className="space-y-2">
          <Label>Phương thức thanh toán</Label>
          <p className="inline-flex w-full items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <Wallet className="mr-2 h-4 w-4" />
            PayOS
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Thời gian ra</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={isImmediate ? "default" : "outline"}
            onClick={() => onToggleImmediate(true)}
            className="min-w-36"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Ra bãi ngay
          </Button>
          <Button
            type="button"
            variant={isImmediate ? "outline" : "default"}
            onClick={() => onToggleImmediate(false)}
            className="min-w-36"
          >
            <Clock3 className="mr-2 h-4 w-4" />
            Hẹn giờ
          </Button>
        </div>

        {!isImmediate && (
          <ConfigProvider locale={viVN}>
            <div className="pt-2">
              <DatePicker
                id="expectedCheckoutTime"
                value={
                  expectedCheckoutTime ? dayjs(expectedCheckoutTime) : null
                }
                onChange={(value) =>
                  onExpectedCheckoutTimeChange(
                    value ? value.toDate().toISOString() : "",
                  )
                }
                format="DD/MM/YYYY HH:mm"
                showTime={{ format: "HH:mm", minuteStep: 1 }}
                needConfirm
                showNow
                disabledDate={disabledPastDate}
                disabledTime={disabledPastTime}
                className="mt-2 h-10 w-full max-w-sm"
                placeholder="dd/mm/yyyy hh:mm"
                inputReadOnly
                required
              />
            </div>
          </ConfigProvider>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          type="submit"
          variant="outline"
          className="min-w-44"
          disabled={previewLoading || paymentLoading}
        >
          {previewLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tra cứu...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Xem chi tiết
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="min-w-44 sm:ml-auto"
          onClick={onBackToLogin}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Quay lại đăng nhập
        </Button>
      </div>

      {!canPay && (
        <p className="text-xs text-red-700">
          Bạn cần tra cứu biển số để xem chi tiết trước khi thanh toán.
        </p>
      )}
    </form>
  );
}
