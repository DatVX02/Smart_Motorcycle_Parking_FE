const bgTintMap = {
  white: "bg-white",
  green: "bg-green-500/30",
  amber: "bg-amber-500/30",
};

const iconColorMap = {
  blue: "text-blue-600",
  green: "text-green-600",
  orange: "text-orange-600",
};

function StatCard({
  title,
  value,
  unit,
  change,
  icon: Icon,
  color,
  trend,
  bgTint = "white",
  iconColor,
  infoTooltip,
}) {
  const tint = bgTintMap[bgTint] ?? "bg-white";
  const resolvedIconColor =
    iconColor ??
    (color === "bg-blue-500"
      ? "text-blue-600"
      : color === "bg-green-500"
        ? "text-green-600"
        : "text-orange-600");

  return (
    <div className={`rounded-3xl p-6 shadow border ${tint} relative group`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-8 h-8 flex-shrink-0 ${resolvedIconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            {infoTooltip ? (
              <button
                type="button"
                aria-label="Xem chi tiết"
                className="relative -mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/60"
              >
                <span className="text-[13px] leading-none">ⓘ</span>
              </button>
            ) : null}
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
            {value}
            {unit ? (
              <span className="text-base font-medium text-gray-600">
                {unit}
              </span>
            ) : null}
          </p>
          {change != null && (
            <div className="mt-2 flex items-center gap-1.5">
              {trend === "up" ? (
                <span className="text-green-500">↑</span>
              ) : (
                <span className="text-rose-500">↓</span>
              )}
              <span
                className={`text-sm font-semibold ${
                  trend === "up" ? "text-green-600" : "text-rose-600"
                }`}
              >
                {change}
              </span>
              <span className="text-xs text-slate-400">so với hôm qua</span>
            </div>
          )}
        </div>
      </div>

      {infoTooltip ? (
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-3 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="relative w-max min-w-[240px] max-w-[320px] rounded-2xl bg-white px-3 py-2.5 text-[13px] leading-relaxed text-slate-900 shadow-xl ring-1 ring-slate-200/90">
            <div className="absolute -top-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-b-8 border-x-transparent border-b-white drop-shadow-sm" />
            <div className="space-y-1">
              {String(infoTooltip)
                .split("\n")
                .map((line, idx) => (
                  <div
                    key={idx}
                    className="whitespace-nowrap text-[13px] text-slate-900"
                  >
                    {line || "\u00A0"}
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StatCard;
