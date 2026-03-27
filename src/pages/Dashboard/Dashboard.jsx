import { useEffect, useState } from "react";
import { Bike, TrendingUp, AlertTriangle } from "lucide-react";
import { useAdminHub } from "../../hooks/useAdminHub";
import StatCard from "./StatCard";
import parkingLotService from "../../services/parkingLotService";
import iotDeviceService from "../../services/iotDeviceService";

export default function Dashboard() {
  const [lots, setLots] = useState([]);
  const apiBaseUrl = (
    import.meta?.env?.VITE_API_BASE_URL || "https://localhost:7015"
  ).replace(/\/+$/, "");

  const {
    spotsMap,
    occupancyMap,
    deviceEvents,
    sessionEvents,
    hubStatus,
    connectionId,
    adminJoined,
  } = useAdminHub();

  const [initialDeviceEvents, setInitialDeviceEvents] = useState([]);

  // load parking lots
  useEffect(() => {
    let cancelled = false;
    parkingLotService
      .getAllParkingLots()
      .then((items) => {
        if (!cancelled) setLots(items ?? []);
      })
      .catch((err) => {
        // 401 sẽ được interceptor trong `src/config/api.js` tự redirect /login
        console.error(err);
        if (!cancelled) setLots([]);
      });

    // load snapshot trạng thái thiết bị để không bị mất khi F5
    iotDeviceService
      .getAll()
      .then((devices) => {
        if (cancelled) return;
        const snapshot = (devices ?? [])
          .filter((d) => {
            const status = (
              d.status ??
              d.connectionStatus ??
              d.eventStatus ??
              ""
            )
              .toString()
              .toLowerCase();
            return status !== "online";
          })
          .map((d) => ({
            deviceId: d.deviceId ?? d.id,
            status:
              d.status ?? d.connectionStatus ?? d.eventStatus ?? "Unknown",
            lotId: d.lotId ?? d.parkingLotId ?? null,
            timestamp: d.lastUpdated ?? d.updatedAt ?? d.createdAt ?? null,
            _source: "snapshot",
          }));
        setInitialDeviceEvents(snapshot);
      })
      .catch((err) => {
        console.error("Load iot devices error:", err);
        if (!cancelled) setInitialDeviceEvents([]);
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  // Tổng số chỗ trống (cộng tất cả các bãi, ưu tiên realtime)
  const totalAvailableSpots = lots.reduce((sum, lot) => {
    const rtAvailable = spotsMap[lot.lotId];
    const available =
      typeof rtAvailable === "number"
        ? rtAvailable
        : Math.max(
            0,
            (lot.totalCapacity ?? lot.totalSpots ?? lot.capacity ?? 0) -
              (lot.currentOccupancy ?? lot.occupiedSpots ?? 0),
          );
    return sum + available;
  }, 0);

  // Tỉ lệ lấp đầy TB: ưu tiên realtime, fallback API
  const hasRealtimeOcc = Object.values(occupancyMap).length > 0;
  const avgOccupancyRealtime = hasRealtimeOcc
    ? (
        Object.values(occupancyMap).reduce((a, b) => a + b, 0) /
        Object.values(occupancyMap).length
      ).toFixed(1)
    : null;

  const avgOccupancyFromApi = (() => {
    if (lots.length === 0) return "0";
    const totalCapacity = lots.reduce((sum, lot) => {
      const total = lot.totalCapacity ?? lot.totalSpots ?? lot.capacity ?? 0;
      return sum + (total || 0);
    }, 0);
    if (totalCapacity === 0) return "0";
    const totalOccupied = lots.reduce((sum, lot) => {
      const occupied = lot.currentOccupancy ?? lot.occupiedSpots ?? 0;
      return sum + (occupied || 0);
    }, 0);
    const pct = (totalOccupied / totalCapacity) * 100;
    return pct.toFixed(1);
  })();

  const avgOccupancy = avgOccupancyRealtime ?? avgOccupancyFromApi;

  const mergedDeviceEvents = [...initialDeviceEvents, ...deviceEvents].slice(
    0,
    50,
  );

  const faultyCount = mergedDeviceEvents.filter((e) => {
    const status = (e.status ?? e.eventStatus ?? "").toString().toLowerCase();
    return status !== "online";
  }).length;

  const stats = [
    {
      title: "Tổng chỗ trống",
      value: totalAvailableSpots || "0",
      icon: Bike,
      color: "bg-blue-500",
      bgTint: "white",
      iconColor: "text-blue-600",
    },
    {
      title: "Tỉ lệ lấp đầy TB",
      value: avgOccupancy + "%",
      icon: TrendingUp,
      color: "bg-green-500",
      bgTint: "green",
      iconColor: "text-green-600",
    },
    {
      title: "Tổng thiết bị",
      value: faultyCount,
      icon: AlertTriangle,
      color: "bg-orange-500",
      bgTint: "amber",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Thẻ thống kê — style giống Quản lý bãi xe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {lots.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Chi tiết chỗ trống theo từng bãi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {lots.map((lot) => {
              const rtAvailable = spotsMap[lot.lotId];
              const available =
                typeof rtAvailable === "number"
                  ? rtAvailable
                  : Math.max(
                      0,
                      (lot.totalCapacity ??
                        lot.totalSpots ??
                        lot.capacity ??
                        0) - (lot.currentOccupancy ?? lot.occupiedSpots ?? 0),
                    );
              const rtOccPct = occupancyMap[lot.lotId];
              const occPct =
                typeof rtOccPct === "number"
                  ? rtOccPct
                  : (() => {
                      const total =
                        lot.totalCapacity ??
                        lot.totalSpots ??
                        lot.capacity ??
                        0;
                      const occupied =
                        lot.currentOccupancy ?? lot.occupiedSpots ?? 0;
                      if (!total) return 0;
                      return (occupied / total) * 100;
                    })();
              const totalSpots =
                lot.totalCapacity ?? lot.totalSpots ?? lot.capacity ?? 0;
              const occupied = Math.max(0, totalSpots - available);

              return (
                <div
                  key={lot.lotId ?? lot.id}
                  className="rounded-2xl border border-gray-200 p-5 shadow-sm bg-white hover:shadow-md transition-shadow"
                >
                  <div className="font-semibold text-gray-900 mb-3">
                    {lot.lotName}
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tổng chỗ</span>
                      <span className="font-medium text-gray-900">
                        {totalSpots}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Đang dùng</span>
                      <span className="font-medium text-orange-600">
                        {occupied}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Chỗ trống</span>
                      <span className="font-medium text-green-600">
                        {available}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Lấp đầy</span>
                      <span className="font-semibold text-gray-900">
                        {occPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* <div className="bg-white p-6 rounded-xl shadow">

        <h2 className="text-xl font-semibold mb-4">
          Trạng thái bãi xe
        </h2>

        {lots.length === 0 ? (

          <p className="text-gray-400">
            Đang tải dữ liệu...
          </p>

        ) : (

          <div className="space-y-3">

            {lots.map(lot => (

              <div
                key={lot.lotId}
                className="flex justify-between border-b pb-2"
              >

                <span className="font-medium">
                  {lot.lotName}
                </span>

                <span>
                  Chỗ trống:{" "}
                  {spotsMap[lot.lotId] ?? Math.max(0, (lot.totalCapacity ?? 0) - (lot.currentOccupancy ?? 0))}
                </span>

                <span>
                  Lấp đầy:{" "}
                  {occupancyMap[lot.lotId] != null
                    ? occupancyMap[lot.lotId].toFixed(1)
                    : "0"}
                  %
                </span>

              </div>

            ))}

          </div>

        )}

      </div> */}

      <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Hoạt động gần đây
        </h2>

        {sessionEvents.length === 0 ? (
          <p className="text-gray-400">Chưa có hoạt động</p>
        ) : (
          <div className="space-y-2">
            {sessionEvents.slice(0, 10).map((e, i) => (
              <p key={i} className="text-sm">
                [{e.lotId}] Xe <b>{e.status ?? e.sessionStatus}</b> lúc{" "}
                {new Date(e.timestamp).toLocaleTimeString()}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Cảnh báo thiết bị
        </h2>

        {mergedDeviceEvents.filter((e) => {
          const status = (e.status ?? e.eventStatus ?? "")
            .toString()
            .toLowerCase();
          return status !== "online";
        }).length === 0 ? (
          <p className="text-green-600">
            Tất cả thiết bị hoạt động bình thường
          </p>
        ) : (
          <div className="space-y-2">
            {mergedDeviceEvents
              .filter((e) => {
                const status = (e.status ?? e.eventStatus ?? "")
                  .toString()
                  .toLowerCase();
                return status !== "online";
              })
              .map((e, i) => (
                <p key={i} className="text-red-600">
                  Thiết bị {e.deviceId}: {e.status ?? e.eventStatus}
                </p>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
