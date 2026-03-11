import { TrendingUp, TrendingDown } from "lucide-react";

function StatCard({ title, value, change, icon: Icon, color, trend }) {
  const colorMap = {
    "bg-blue-500": "from-blue-500 to-blue-600",
    "bg-green-500": "from-emerald-500 to-emerald-600",
    "bg-purple-500": "from-violet-500 to-violet-600",
    "bg-orange-500": "from-amber-500 to-amber-600",
  };
  const bgGradient = colorMap[color] ?? "from-blue-500 to-blue-600";

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60 transition-all duration-300 hover:shadow-lg hover:ring-slate-300/80">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
          {change != null && (
            <div className="mt-3 flex items-center gap-1.5">
              {trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-500" />
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
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${bgGradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default StatCard;
