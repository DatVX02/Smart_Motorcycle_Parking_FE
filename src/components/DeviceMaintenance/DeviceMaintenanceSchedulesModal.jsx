import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import dayjs from "dayjs";

const SEGMENT_COLORS = {
  Overdue: "#dc2626",
  InProgress: "#d97706",
  Scheduled: "#2563eb",
  Completed: "#16a34a",
  Cancelled: "#64748b",
  Pending: "#64748b",
};

function segmentColorForStatus(effective) {
  return SEGMENT_COLORS[effective] || "#94a3b8";
}

/** Xuống dòng theo độ dài (ưu tiên cắt tại dấu cách), không dùng dấu … */
function wrapMaintenanceTypeLines(text, maxCharsPerLine) {
  if (!text?.trim()) return ["—"];
  const s = String(text).trim();
  const lines = [];
  let remaining = s;
  while (remaining.length > 0) {
    if (remaining.length <= maxCharsPerLine) {
      lines.push(remaining);
      break;
    }
    const slice = remaining.slice(0, maxCharsPerLine);
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > maxCharsPerLine * 0.35) {
      lines.push(remaining.slice(0, lastSpace).trim());
      remaining = remaining.slice(lastSpace + 1).trim();
    } else {
      lines.push(remaining.slice(0, maxCharsPerLine));
      remaining = remaining.slice(maxCharsPerLine).trim();
    }
  }
  return lines;
}

/**
 * Vòng tròn nhiều cung: mỗi cung = một lịch; nhãn ngoài vòng (Lần N, ngày, loại) giống infographic lịch định kỳ.
 */
function MaintenanceDonut({
  schedules,
  deviceName,
  formatDateShort,
  getEffectiveStatus,
  getStatusLabel,
  hoveredIndex,
  onHoverIndex,
  onSelectSchedule,
}) {
  const n = schedules.length;
  if (n === 0) return null;

  const VB = 140;
  const cx = VB / 2;
  const cy = VB / 2;
  const rOuter = 40;
  const rInner = 24;
  const rOuterLabel = rOuter + 18;
  const fontOuter = n > 7 ? 2.65 : n > 5 ? 3 : 3.35;

  let angle = -90;

  const segments = schedules.map((item, i) => {
    const eff = getEffectiveStatus(item);
    const fill = segmentColorForStatus(eff);
    const sweep = 360 / n;
    const startDeg = angle;
    const start = (angle * Math.PI) / 180;
    const end = ((angle + sweep) * Math.PI) / 180;

    const x1o = cx + rOuter * Math.cos(start);
    const y1o = cy + rOuter * Math.sin(start);
    const x2o = cx + rOuter * Math.cos(end);
    const y2o = cy + rOuter * Math.sin(end);
    const x1i = cx + rInner * Math.cos(end);
    const y1i = cy + rInner * Math.sin(end);
    const x2i = cx + rInner * Math.cos(start);
    const y2i = cy + rInner * Math.sin(start);

    const largeArc = sweep > 180 ? 1 : 0;
    const d = [
      `M ${x1o} ${y1o}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2i} ${y2i}`,
      "Z",
    ].join(" ");

    const midDeg = startDeg + sweep / 2;
    const midRad = (midDeg * Math.PI) / 180;
    const lx = cx + rOuterLabel * Math.cos(midRad);
    const ly = cy + rOuterLabel * Math.sin(midRad);

    angle += sweep;

    const dimmed =
      hoveredIndex !== null && hoveredIndex !== undefined && hoveredIndex !== i;

    const nextRaw = item.nextMaintenanceDate;
    const dateLine =
      nextRaw && !String(nextRaw).startsWith("0001")
        ? formatDateShort(nextRaw)
        : "—";

    const maxChars = n > 7 ? 11 : n > 5 ? 13 : n > 4 ? 15 : 18;
    const typeLines = wrapMaintenanceTypeLines(item.maintenanceType, maxChars);
    const lineGap = fontOuter * (typeLines.length > 4 ? 0.92 : 1.06);

    return {
      key: item.maintenanceId ?? i,
      maintenanceId: item.maintenanceId,
      d,
      fill,
      lx,
      ly,
      index: i,
      dimmed,
      title: `${getStatusLabel(eff)} — ${item.maintenanceType || "Lịch " + (i + 1)}`,
      ariaLabel: `Lịch ${i + 1}, ${item.maintenanceType || "chi tiết"}. ${getStatusLabel(eff)}. Nhấn để xem chi tiết`,
      outerLine1: `Lần ${i + 1}`,
      outerLine2: dateLine,
      typeLines,
      lineGap,
    };
  });

  const openDetail = (maintenanceId) => {
    if (maintenanceId != null) onSelectSchedule?.(maintenanceId);
  };

  const centerLines = wrapMaintenanceTypeLines(deviceName || "Thiết bị", 11);

  return (
    <div className="flex flex-col items-center py-4 border-b border-gray-100">
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        className="w-full max-w-[min(22rem,92vw)] aspect-square drop-shadow-sm touch-manipulation"
        role="img"
        aria-label="Vòng lịch bảo trì — nhấn từng phần để xem chi tiết"
      >
        <title>
          Nhấn vào từng phần trên vòng để mở chi tiết lịch tương ứng
        </title>
        {segments.map((seg) => (
          <g key={seg.key}>
            <path
              d={seg.d}
              fill={seg.fill}
              stroke="#fff"
              strokeWidth="1"
              opacity={seg.dimmed ? 0.35 : 1}
              className="cursor-pointer transition-[opacity] duration-150 outline-none"
              style={{ outline: "none" }}
              role="button"
              tabIndex={0}
              aria-label={seg.ariaLabel}
              onMouseEnter={() => onHoverIndex?.(seg.index)}
              onMouseLeave={() => onHoverIndex?.(null)}
              onClick={() => openDetail(seg.maintenanceId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openDetail(seg.maintenanceId);
                }
              }}
            >
              <title>{seg.title}</title>
            </path>
            <g
              transform={`translate(${seg.lx}, ${seg.ly})`}
              className="pointer-events-none select-none"
            >
              {(() => {
                const lg = seg.lineGap;
                const totalLines = 2 + seg.typeLines.length;
                const y0 = -((totalLines - 1) * lg) / 2;
                return (
                  <text
                    textAnchor="middle"
                    fill="#0f172a"
                    style={{ fontSize: fontOuter, fontWeight: 600 }}
                  >
                    <tspan x={0} y={y0}>
                      {seg.outerLine1}
                    </tspan>
                    <tspan x={0} dy={lg} style={{ fontWeight: 500 }}>
                      {seg.outerLine2}
                    </tspan>
                    {seg.typeLines.map((line, li) => (
                      <tspan
                        key={li}
                        x={0}
                        dy={lg}
                        style={{ fontWeight: 400, fill: "#475569" }}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                );
              })()}
            </g>
          </g>
        ))}
        <g
          className="pointer-events-none select-none"
          transform={`translate(${cx}, ${cy})`}
        >
          <text textAnchor="middle">
            <tspan
              x={0}
              y={-10}
              fill="#0f172a"
              style={{
                fontSize: 4.2,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              LỊCH BẢO TRÌ
            </tspan>
            <tspan
              x={0}
              dy={6}
              fill="#dc2626"
              style={{
                fontSize: 5.2,
                fontWeight: 800,
                letterSpacing: "0.02em",
              }}
            >
              ĐỊNH KỲ
            </tspan>
            {centerLines.map((ln, ci) => (
              <tspan
                key={ci}
                x={0}
                dy={ci === 0 ? 5.5 : 3.6}
                fill="#334155"
                style={{ fontSize: 3.4, fontWeight: 500 }}
              >
                {ln}
              </tspan>
            ))}
          </text>
        </g>
      </svg>
    </div>
  );
}

export default function DeviceMaintenanceSchedulesModal({
  group,
  onClose,
  getEffectiveStatus,
  getStatusColor,
  getStatusLabel,
  format,
  formatDate,
  onSelectSchedule,
}) {
  if (!group) return null;

  const [hoveredIndex, setHoveredIndex] = useState(null);

  const sorted = [...group.schedules].sort((a, b) => {
    const da = a.nextMaintenanceDate
      ? dayjs(a.nextMaintenanceDate).valueOf()
      : Number.MAX_SAFE_INTEGER;
    const db = b.nextMaintenanceDate
      ? dayjs(b.nextMaintenanceDate).valueOf()
      : Number.MAX_SAFE_INTEGER;
    return da - db;
  });

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col my-auto">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 leading-tight">
              Lịch bảo trì thiết bị
            </h2>
            <p className="text-sm font-medium text-gray-800 mt-1 truncate">
              {group.deviceName || "—"}
            </p>
            <p className="text-xs text-gray-500">{group.deviceCode}</p>
            <p className="text-xs text-gray-400 italic mt-0.5">
              {group.lotName?.trim() ? group.lotName : "Chưa gán bãi"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5">
          <MaintenanceDonut
            schedules={sorted}
            deviceName={group.deviceName}
            formatDateShort={format}
            getEffectiveStatus={getEffectiveStatus}
            getStatusLabel={getStatusLabel}
            hoveredIndex={hoveredIndex}
            onHoverIndex={setHoveredIndex}
            onSelectSchedule={onSelectSchedule}
          />

          <ul className="space-y-3 py-4">
            {sorted.map((item, index) => {
              const eff = getEffectiveStatus(item);
              const rowActive = hoveredIndex === index;
              return (
                <li
                  key={item.maintenanceId}
                  className={`rounded-xl border bg-gray-50/80 p-3 transition-shadow ${
                    rowActive
                      ? "border-blue-300 ring-2 ring-blue-200 shadow-sm"
                      : "border-gray-100"
                  }`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500">
                      Lịch {index + 1}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getStatusColor(
                        eff,
                      )}`}
                    >
                      {getStatusLabel(eff)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.maintenanceType || "—"}
                  </p>
                  {item.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                    {item.nextMaintenanceDate &&
                      !String(item.nextMaintenanceDate).startsWith("0001") && (
                        <p>
                          Bảo trì tiếp theo:{" "}
                          <span className="text-gray-800">
                            {format(item.nextMaintenanceDate)}
                          </span>
                        </p>
                      )}
                    {item.performedAt &&
                      !String(item.performedAt).startsWith("0001") && (
                        <p>
                          Ngày thực hiện:{" "}
                          <span className="text-gray-800">
                            {formatDate(item.performedAt)}
                          </span>
                        </p>
                      )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectSchedule(item.maintenanceId)}
                    className="mt-3 w-full text-sm py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 font-medium"
                  >
                    Xem chi tiết lịch này
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
