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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function asText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function pick(obj, keys) {
  for (const k of keys) {
    const val = obj?.[k];
    if (val !== null && val !== undefined && String(val).trim() !== "") return val;
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
  if (["WARNING", "MAINTENANCE"].includes(u)) return { label: s, variant: "warning" };
  return { label: s, variant: "outline" };
}

function cameraKindFrom(c) {
  const hay = `${asText(c?.id)} ${asText(c?.name)}`.toLowerCase();
  if (hay.includes("plate") || hay.includes("biển số") || hay.includes("bien so"))
    return "plate";
  if (hay.includes("face") || hay.includes("khuôn mặt") || hay.includes("khuon mat"))
    return "face";
  return "unknown";
}

function cameraLaneFrom(c) {
  const hay = `${asText(c?.id)} ${asText(c?.name)}`.toLowerCase();
  if (/(^|[\s_])in($|[\s_])/.test(hay) || hay.includes("vào") || hay.includes("vao"))
    return "in";
  if (/(^|[\s_])out($|[\s_])/.test(hay) || hay.includes("ra"))
    return "out";
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
  const u = String(status ?? "").trim().toUpperCase();
  if (!u) return "unknown";
  if (["ONLINE", "READY", "ACTIVE", "CONNECTED", "WARNING"].includes(u))
    return "online";
  if (
    ["OFFLINE", "DISCONNECTED", "INACTIVE", "BROKEN", "MAINTENANCE"].includes(u)
  )
    return "offline";
  return "unknown";
}

export default function ParkingLotCamerasModal({ lot, onClose }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedFace, setSelectedFace] = useState(null); // { lane, url }
  const [selectedPlate, setSelectedPlate] = useState(null); // { lane, url }
  const [connByIp, setConnByIp] = useState({});

  useEffect(() => {
    if (!lot?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setSelectedFace(null);
        setSelectedPlate(null);
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
        setSelectedFace(null);
        setSelectedPlate(null);
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
        const conn = pick(c, ["connectionStatus", "status", "connection_status"]);
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

  const handlePick = (camera) => {
    const url = asText(camera?.streamUrl).trim();
    if (!url) return;
    if (camera.kind === "face") setSelectedFace({ lane: camera.lane, url });
    else setSelectedPlate({ lane: camera.lane, url });
  };

  const leftGroups = [
    { title: "LỐI VÀO", lane: "in" },
    { title: "LỐI RA", lane: "out" },
  ];

  return (
    <Dialog open onOpenChange={() => onClose?.()}>
      <DialogContent className="w-[92vw] max-w-4xl rounded-2xl px-0 py-0 overflow-hidden">
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

        <div className="px-5 py-4">
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
            <div className="flex gap-4">
              {/* Left list (≈30%) */}
              <div className="w-full lg:w-[30%]">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                  Camera
                </div>
                <div className="space-y-3">
                  {leftGroups.map((grp) => {
                    const faceCam = grouped?.[grp.lane]?.face;
                    const plateCam = grouped?.[grp.lane]?.plate;
                    const rows = [
                      { kind: "face", cam: faceCam },
                      { kind: "plate", cam: plateCam },
                    ];

                    return (
                      <div
                        key={grp.title}
                        className="rounded-2xl border border-gray-100 bg-white overflow-hidden"
                      >
                        <div className="px-3 py-2.5 bg-gray-50/70 border-b border-gray-100">
                          <p className="text-[11px] font-bold text-gray-600 tracking-wide">
                            {grp.title}
                          </p>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {rows.map(({ kind, cam }) => {
                            const url = asText(cam?.streamUrl).trim();
                            const v = connVariantByUrl[url] ?? "unknown";
                            const isActive =
                              (kind === "face" &&
                                selectedFace?.lane === grp.lane &&
                                selectedFace?.url === url) ||
                              (kind === "plate" &&
                                selectedPlate?.lane === grp.lane &&
                                selectedPlate?.url === url);

                            return (
                              <div
                                key={`${grp.lane}-${kind}`}
                                className={`px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                                  isActive
                                    ? "bg-blue-50"
                                    : "hover:bg-gray-50/70"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={statusDotClass(v)}
                                      title={
                                        v === "online"
                                          ? "Hoạt động"
                                          : v === "offline"
                                            ? "Ngoại tuyến"
                                            : "Không rõ"
                                      }
                                      aria-label={
                                        v === "online"
                                          ? "Hoạt động"
                                          : v === "offline"
                                            ? "Ngoại tuyến"
                                            : "Không rõ"
                                      }
                                    />
                                    <p
                                      className={`text-sm truncate ${
                                        isActive
                                          ? "font-bold text-gray-900"
                                          : "font-semibold text-gray-800"
                                      }`}
                                      title={shortCameraName(kind)}
                                    >
                                      {shortCameraName(kind)}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={!url}
                                  onClick={() => handlePick({ ...cam, kind, lane: grp.lane })}
                                  className={`p-2 rounded-lg transition-colors ${
                                    url
                                      ? "text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                      : "text-gray-300 cursor-not-allowed"
                                  }`}
                                  title="Xem"
                                  aria-label="Xem"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right players (≈70%) */}
              <div className="w-full lg:flex-1 space-y-4">
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700">
                        {selectedFace?.lane === "out"
                          ? "Lối Ra - Khuôn mặt"
                          : "Lối Vào - Khuôn mặt"}
                      </p>
                    </div>
                    {selectedFace?.url ? (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(selectedFace.url, "_blank", "noreferrer")
                        }
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Mở tab mới"
                        aria-label="Mở tab mới"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                  {selectedFace?.url ? (
                    <iframe
                      title="camera-preview-face"
                      src={selectedFace.url}
                      className="w-full h-[260px] bg-black"
                    />
                  ) : (
                    <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
                      Chọn một camera để xem
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700">
                        {selectedPlate?.lane === "out"
                          ? "Lối Ra - Biển số"
                          : "Lối Vào - Biển số"}
                      </p>
                    </div>
                    {selectedPlate?.url ? (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(selectedPlate.url, "_blank", "noreferrer")
                        }
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Mở tab mới"
                        aria-label="Mở tab mới"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                  {selectedPlate?.url ? (
                    <iframe
                      title="camera-preview-plate"
                      src={selectedPlate.url}
                      className="w-full h-[260px] bg-black"
                    />
                  ) : (
                    <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
                      Chọn một camera để xem
                    </div>
                  )}
                </div>
              </div>
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

