import { ConfigProvider, DatePicker } from "antd";
import dayjs from "dayjs";
import viVN from "antd/es/locale/vi_VN";
import { CheckCircle2, Clock3, Loader2, Motorbike, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PayByPlateForm({
  licensePlate,
  onLicensePlateChange,
  locked = false,
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
}) {
  return (
    <form className="mx-auto w-full max-w-2xl space-y-6" onSubmit={onLookup}>
      <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
        <div className="space-y-2">
          <Label htmlFor="licensePlate">Biển số xe *</Label>
          <div className="relative">
            <Motorbike className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="licensePlate"
              value={licensePlate}
              onChange={(event) => onLicensePlateChange(event.target.value)}
              placeholder="VD: 59A-123.45"
              autoComplete="off"
              className="h-11 pl-10"
              required
              disabled={locked || previewLoading || paymentLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Chọn thời gian ra</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isImmediate ? "default" : "outline"}
              onClick={() => onToggleImmediate(true)}
              className="h-11 min-w-[150px] flex-1 sm:flex-none"
              disabled={locked || previewLoading || paymentLoading}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Ra bãi ngay
            </Button>
            <Button
              type="button"
              variant={isImmediate ? "outline" : "default"}
              onClick={() => onToggleImmediate(false)}
              className="h-11 min-w-[150px] flex-1 sm:flex-none"
              disabled={locked || previewLoading || paymentLoading}
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
                  className="h-11 w-full"
                  placeholder="dd/mm/yyyy hh:mm"
                  inputReadOnly
                  required
                  disabled={locked || previewLoading || paymentLoading}
                />
              </div>
            </ConfigProvider>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="submit"
          variant="outline"
          className="h-11 w-full sm:w-auto sm:min-w-48"
          disabled={locked || previewLoading || paymentLoading}
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

        {!canPay && (
          <p className="text-xs text-red-700 sm:text-right">
            Bạn cần tra cứu biển số để xem chi tiết trước khi thanh toán.
          </p>
        )}
      </div>
    </form>
  );
}
