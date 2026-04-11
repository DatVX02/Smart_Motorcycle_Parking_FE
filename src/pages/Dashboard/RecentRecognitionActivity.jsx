import { Camera, Motorbike, ShieldCheck, ShieldX } from "lucide-react";

function ImageThumb({ src, alt, fallbackIcon: FallbackIcon }) {
  if (!src) {
    return (
      <div className="flex h-12 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
        <FallbackIcon className="h-4 w-4" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-12 w-16 rounded-lg border border-slate-200 bg-slate-50 object-cover"
    />
  );
}

function LabeledImageThumb({ label, src, alt, fallbackIcon }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <ImageThumb src={src} alt={alt} fallbackIcon={fallbackIcon} />
      <span className="text-[10px] font-medium text-slate-500">{label}</span>
    </div>
  );
}

function RecentRecognitionActivity({ data = [], loading = false }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Lượt nhận diện gần nhất
        </h2>
        <p className="text-xs text-slate-500">
          Khuôn mặt, biển số và trạng thái nhận diện theo thời gian thực
        </p>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
            <Camera className="h-3 w-3" />
            Khuôn mặt
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
            <Motorbike className="h-3 w-3" />
            Biển số
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
            >
              <div className="h-12 w-16 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-12 w-16 animate-pulse rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                <div className="h-2.5 w-24 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
          Chưa có bản ghi nhận diện gần đây.
        </div>
      ) : (
        <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {data.map((item) => {
            const isWarning = item.statusTone === "warning";
            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <LabeledImageThumb
                    label="Khuôn mặt"
                    src={item.faceImage}
                    alt={`Khuôn mặt ${item.plate}`}
                    fallbackIcon={Camera}
                  />

                  <LabeledImageThumb
                    label="Biển số"
                    src={item.plateImage}
                    alt={`Biển số ${item.plate}`}
                    fallbackIcon={Motorbike}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {item.plate}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.lotName} • {item.timeLabel}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isWarning
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {isWarning ? (
                      <ShieldX className="h-3.5 w-3.5" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    )}
                    {item.statusLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RecentRecognitionActivity;
