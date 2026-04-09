function RecognitionLogStatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  valueSuffix,
  bgTint,
}) {
  const bgClass = bgTint ?? "bg-white";

  return (
    <div className={`rounded-3xl shadow border p-6 ${bgClass}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-8 h-8 flex-shrink-0 ${iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
            {value}
            {valueSuffix && (
              <span className="text-base font-medium text-gray-600">
                {valueSuffix}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default RecognitionLogStatCard;
