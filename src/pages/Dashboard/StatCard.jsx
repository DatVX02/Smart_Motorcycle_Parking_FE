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
    <div className={`rounded-3xl p-6 shadow border ${tint}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-8 h-8 flex-shrink-0 ${resolvedIconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
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
                <span className="text-emerald-500">↑</span>
              ) : (
                <span className="text-rose-500">↓</span>
              )}
              <span
                className={`text-sm font-semibold ${
                  trend === "up" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {change}
              </span>
              <span className="text-xs text-slate-400">so với hôm qua</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatCard;
