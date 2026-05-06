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
    <form className="flex-1 flex flex-col" onSubmit={onLookup}>
      <div className="space-y-8 rounded-xl border border-slate-200 bg-slate-50/40 p-6">
        <div className="space-y-3">
          <Label htmlFor="licensePlate" className="text-slate-700 font-semibold">
            Biển số xe *
          </Label>
          <div className="relative">
            <Motorbike className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              id="licensePlate"
              value={licensePlate}
              onChange={(event) => onLicensePlateChange(event.target.value)}
              placeholder="VD: 59A-123.45"
              autoComplete="off"
              className="h-12 pl-12 text-base border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl"
              required
              disabled={locked || previewLoading || paymentLoading}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-slate-700 font-semibold">Chọn thời gian ra</Label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={isImmediate ? "default" : "outline"}
              onClick={() => onToggleImmediate(true)}
              className={`h-12 flex-1 rounded-xl transition-all ${
                isImmediate
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200"
                  : "hover:bg-slate-100"
              }`}
              disabled={locked || previewLoading || paymentLoading}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Ra bãi ngay
            </Button>
            <Button
              type="button"
              variant={isImmediate ? "outline" : "default"}
              onClick={() => onToggleImmediate(false)}
              className={`h-12 flex-1 rounded-xl transition-all ${
                !isImmediate
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200"
                  : "hover:bg-slate-100"
              }`}
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
                  className="h-12 w-full rounded-xl border-slate-200"
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

      <div className="mt-auto pt-10 space-y-4">
        <Button
          type="submit"
          className="h-14 w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-lg font-bold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] rounded-xl"
          disabled={locked || previewLoading || paymentLoading}
        >
          {previewLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Đang tra cứu...
            </>
          ) : (
            <>
              <Search className="mr-2 h-5 w-5" />
              Xem chi tiết
            </>
          )}
        </Button>

        {!canPay && (
          <p className="text-sm text-center text-slate-500 font-medium italic">
            * Vui lòng tra cứu biển số để xem chi tiết trước khi thanh toán.
          </p>
        )}
      </div>
    </form>
  );
}
