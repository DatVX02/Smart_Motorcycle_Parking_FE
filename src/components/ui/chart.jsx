import * as React from "react";
import {
  Legend as RechartsLegend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "@/lib/utils";

const ChartContext = React.createContext(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

const ChartContainer = React.forwardRef(
  ({ id, className, config = {}, style, children, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

    const cssVars = React.useMemo(() => {
      const vars = {};
      Object.entries(config).forEach(([key, item]) => {
        if (item?.color) {
          vars[`--color-${key}`] = item.color;
        }
      });
      return vars;
    }, [config]);

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          ref={ref}
          data-chart={chartId}
          className={cn("w-full", className)}
          style={{ ...cssVars, ...style }}
          {...props}
        >
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  },
);
ChartContainer.displayName = "ChartContainer";

const ChartTooltip = RechartsTooltip;

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  formatter,
  labelFormatter,
  hideLabel = false,
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  const resolvedLabel = hideLabel
    ? null
    : labelFormatter
      ? labelFormatter(label, payload)
      : label;

  return (
    <div
      className={cn(
        "min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md",
        className,
      )}
    >
      {resolvedLabel != null && (
        <p className="mb-1.5 text-xs font-medium text-slate-500">
          {resolvedLabel}
        </p>
      )}

      <div className="space-y-1">
        {payload.map((entry, index) => {
          const key = String(entry.dataKey ?? entry.name ?? "");
          const cfg = config[key] ?? {};
          const itemColor =
            entry.color ??
            entry.stroke ??
            entry.fill ??
            cfg.color ??
            `var(--color-${key})`;

          let valueNode = entry.value;
          let labelNode = cfg.label ?? entry.name ?? key;

          if (formatter) {
            const formatted = formatter(
              entry.value,
              entry.name,
              entry,
              entry.payload,
            );
            if (Array.isArray(formatted)) {
              valueNode = formatted[0];
              labelNode = formatted[1] ?? labelNode;
            } else {
              valueNode = formatted;
            }
          }

          return (
            <div key={`${key}-${index}`} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-[2px]"
                style={{ backgroundColor: itemColor }}
              />
              <span className="text-slate-600">{labelNode}</span>
              <span className="ml-auto font-semibold text-slate-800">
                {valueNode}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsLegend;

function ChartLegendContent({ className, payload }) {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div
      className={cn(
        "mt-1 flex flex-wrap items-center justify-center gap-4",
        className,
      )}
    >
      {payload.map((entry) => {
        const key = String(entry.dataKey ?? entry.value ?? "");
        const cfg = config[key] ?? {};
        const color = entry.color ?? cfg.color ?? `var(--color-${key})`;
        const text = cfg.label ?? entry.value;

        return (
          <div
            key={key}
            className="flex items-center gap-1.5 text-sm text-slate-700"
          >
            <span
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
            {text}
          </div>
        );
      })}
    </div>
  );
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
