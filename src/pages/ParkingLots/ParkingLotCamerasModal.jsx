import { useEffect, useMemo, useState } from "react";
import { Camera, ExternalLink, Eye, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import parkingLotService from "../../services/parkingLotService";
import iotDeviceService from "../../services/iotDeviceService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function asText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function pick(obj, keys) {
  for (const k of keys) {
    const val = obj?.[k];
    if (val !== null && val !== undefined && String(val).trim() !== "")
      return val;
  }
  return "";
}

function normalizeConn(value) {
  const s = String(value ?? "").trim();
  const u = s.toUpperCase();
  if (!u) return { label: "Không rõ", variant: "secondary" };
  if (["ONLINE", "READY", "ACTIVE", "CONNECTED"].includes(u))
    return { label: s, variant: "success" };
  if (["OFFLINE", "DISCONNECTED", "INACTIVE"].includes(u))
    return { label: s, variant: "destructive" };
  if (["WARNING", "MAINTENANCE"].includes(u))
    return { label: s, variant: "warning" };
  return { label: s, variant: "outline" };
}

function cameraKindFrom(c) {
  const hay = `${asText(c?.id)} ${asText(c?.name)}`.toLowerCase();
  if (
    hay.includes("plate") ||
    hay.includes("biển số") ||
    hay.includes("bien so")
  )
    return "plate";
  if (
    hay.includes("face") ||
    hay.includes("khuôn mặt") ||
    hay.includes("khuon mat")
  )
    return "face";
  return "unknown";
}

function cameraLaneFrom(c) {
  const hay = `${asText(c?.id)} ${asText(c?.name)}`.toLowerCase();
  if (
    /(^|[\s_])in($|[\s_])/.test(hay) ||
    hay.includes("vào") ||
    hay.includes("vao")
  )
    return "in";
  if (/(^|[\s_])out($|[\s_])/.test(hay) || hay.includes("ra")) return "out";
  return "unknown";
}

function statusDotClass(variant) {
  const color =
    variant === "online"
      ? "bg-green-500"
      : variant === "offline"
        ? "bg-red-500"
        : "bg-gray-300";
  return `inline-block w-2.5 h-2.5 rounded-full ${color}`;
}

function shortCameraName(kind) {
  if (kind === "face") return "Camera Khuôn mặt";
  if (kind === "plate") return "Camera Biển số";
  return "Camera";
}

function parseIpFromUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    return u.hostname || "";
  } catch {
    const m = raw.match(/@(\d{1,3}(?:\.\d{1,3}){3})/);
    return m?.[1] ?? "";
  }
}

function normalizeIp(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  // If it's already a URL, extract host
  if (/^https?:\/\//i.test(raw)) return parseIpFromUrl(raw);
  // Remove port (e.g. 192.168.1.10:8081)
  const noPort = raw.includes(":") ? raw.split(":")[0] : raw;
  return noPort.trim();
}

function connVariantFromStatus(status) {
  const u = String(status ?? "")
    .trim()
    .toUpperCase();
  if (!u) return "unknown";
  if (["ONLINE", "READY", "ACTIVE", "CONNECTED", "WARNING"].includes(u))
    return "online";
  if (
    ["OFFLINE", "DISCONNECTED", "INACTIVE", "BROKEN", "MAINTENANCE"].includes(u)
  )
    return "offline";
  return "unknown";
}

function stripUserInfoFromUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    // Trình duyệt hiện đại chặn user:pass@ trong src của <img>/<iframe>
    u.username = "";
    u.password = "";
    return u.toString();
  } catch {
    // Fallback: loại bỏ "user:pass@" nếu có
    return raw.replace(/^(\w+:\/\/)([^@\/]+@)/i, "$1");
  }
}

export default function ParkingLotCamerasModal({ lot, onClose }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [connByIp, setConnByIp] = useState({});
  const [activeTab, setActiveTab] = useState("all"); // all | in | out

  useEffect(() => {
    if (!lot?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [data, devices] = await Promise.all([
          parkingLotService.getParkingLotCameras(lot.id),
          iotDeviceService.getByLot(lot.id).catch(() => []),
        ]);
        if (cancelled) return;
        setItems(data);
        const map = {};
        for (const d of Array.isArray(devices) ? devices : []) {
          const ip = normalizeIp(d?.ipAddress ?? d?.ip ?? d?.ip_address ?? "");
          if (!ip) continue;
          map[ip] = d?.connectionStatus ?? d?.status ?? "";
        }
        setConnByIp(map);
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setConnByIp({});
        toast.error(
          err?.response?.data?.message ||
            err?.response?.data?.title ||
            "Không thể tải danh sách camera. Vui lòng thử lại.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lot?.id]);

  const cameras = useMemo(() => {
    // API có thể trả về:
    // - Array camera objects
    // - Object map: { face_camera_in: "http://.../video", ... }
    if (Array.isArray(items)) {
      return (items ?? []).map((c, idx) => {
        const id =
          pick(c, ["deviceId", "id", "cameraId", "camera_id", "uuid"]) || idx;
        const name = pick(c, [
          "deviceName",
          "name",
          "cameraName",
          "deviceCode",
          "code",
        ]);
        const ip = pick(c, ["ipAddress", "ip", "ip_address"]);
        const gateName = pick(c, ["gateName", "gate_name"]);
        const model = pick(c, ["model"]);
        const conn = pick(c, [
          "connectionStatus",
          "status",
          "connection_status",
        ]);
        const streamUrl = pick(c, [
          "streamUrl",
          "videoUrl",
          "mjpegUrl",
          "hlsUrl",
          "rtspUrl",
          "url",
        ]);
        const kind = cameraKindFrom({ id, name });
        const lane = cameraLaneFrom({ id, name });
        return {
          raw: c,
          id,
          name: shortCameraName(kind) || name,
          ip,
          gateName,
          model,
          conn,
          streamUrl,
          kind,
          lane,
        };
      });
    }

    if (items && typeof items === "object") {
      return Object.entries(items)
        .filter(([, v]) => typeof v === "string" && v.trim())
        .map(([key, url]) => {
          const kind = cameraKindFrom({ id: key, name: key });
          const lane = cameraLaneFrom({ id: key, name: key });
          return {
            raw: { key, url },
            id: key,
            name: shortCameraName(kind),
            ip: "",
            gateName: "",
            model: "",
            conn: "",
            streamUrl: url,
            kind,
            lane,
          };
        });
    }

    return [];
  }, [items]);

  const grouped = useMemo(() => {
    const make = () => ({
      in: { face: null, plate: null },
      out: { face: null, plate: null },
    });
    const g = make();
    for (const c of cameras) {
      const lane = c.lane === "out" ? "out" : "in";
      const kind = c.kind === "plate" ? "plate" : "face";
      // ưu tiên camera có url
      if (!g[lane][kind] || (!g[lane][kind]?.streamUrl && c.streamUrl)) {
        g[lane][kind] = c;
      }
    }
    return g;
  }, [cameras]);

  const connVariantByUrl = useMemo(() => {
    const map = {};
    for (const c of cameras) {
      const url = asText(c?.streamUrl).trim();
      const ip = parseIpFromUrl(url);
      const st = connByIp[ip] ?? "";
      map[url] = connVariantFromStatus(st);
    }
    return map;
  }, [cameras, connByIp]);

  const tabItems = [
    { key: "all", label: "Tất cả" },
    { key: "in", label: "Lối vào" },
    { key: "out", label: "Lối ra" },
  ];

  const laneTitle = (lane) => (lane === "out" ? "Lối ra" : "Lối vào");

  // Sub-component render từng ô camera
  const RenderCameraBox = ({ cam, defaultLabel }) => {
    const rawUrl = asText(cam?.streamUrl).trim();
    const safeUrl = stripUserInfoFromUrl(rawUrl);
    // Status vẫn map theo url gốc (để không bị lệch với connVariantByUrl)
    const status = rawUrl ? (connVariantByUrl[rawUrl] ?? "unknown") : "unknown";

    return (
      <div className="flex flex-col border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
          <div className="flex items-center gap-2">
            <span
              className={statusDotClass(status)}
              title={
                status === "online"
                  ? "Hoạt động"
                  : status === "offline"
                    ? "Ngoại tuyến"
                    : "Không rõ"
              }
            />
            <span className="text-sm font-semibold text-gray-800">
              {cam?.name || defaultLabel}
            </span>
          </div>
          {safeUrl && (
            <button
              onClick={() => window.open(safeUrl, "_blank", "noreferrer")}
              className="text-gray-400 hover:text-blue-600 transition-colors"
              title="Mở tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="bg-black aspect-video w-full flex items-center justify-center relative overflow-hidden">
          {safeUrl ? (
            <img
              title={cam?.name || defaultLabel}
              src={safeUrl}
              alt={`Luồng video từ ${cam?.name || defaultLabel}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Hiển thị thông báo nếu ảnh không tải được (bị block)
                e.currentTarget.style.display = "none";
                const next = e.currentTarget.nextElementSibling;
                if (next) next.style.display = "block";
              }}
            />
          ) : null}
          <span
            className="text-gray-500 text-sm absolute"
            style={{ display: safeUrl ? "none" : "block" }}
          >
            {safeUrl ? "Không thể tải video" : "Không có luồng video"}
          </span>
        </div>
      </div>
    );
  };

  const LaneSection = ({ lane }) => (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
        {lane === "out" ? "Lối ra" : "Lối vào"}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RenderCameraBox
          cam={grouped?.[lane]?.face}
          defaultLabel={`${laneTitle(lane)} - Khuôn mặt`}
        />
        <RenderCameraBox
          cam={grouped?.[lane]?.plate}
          defaultLabel={`${laneTitle(lane)} - Biển số`}
        />
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={() => onClose?.()}>
      <DialogContent className="w-[96vw] max-w-6xl h-[88vh] rounded-2xl px-0 py-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-3 pr-10">
            <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Camera className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold text-gray-900">
                Camera - {lot?.name ?? ""}
              </DialogTitle>
              <p className="text-xs text-gray-500 truncate">
                {lot?.location ?? ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="absolute right-4 top-4 p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Đóng"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {tabItems.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
        </div>

        <div className="px-5 py-4 flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tải camera...
            </div>
          ) : cameras.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 mx-auto flex items-center justify-center mb-3">
                <Camera className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Chưa có camera nào
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Bãi này chưa có camera được cấu hình hoặc chưa gán vào cổng.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(activeTab === "all" || activeTab === "in") && (
                <LaneSection lane="in" />
              )}
              {(activeTab === "all" || activeTab === "out") && (
                <LaneSection lane="out" />
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex justify-end">
          <Button variant="outline" onClick={() => onClose?.()}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
