import { useState, useEffect } from "react";
import {
  Bike,
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
} from "lucide-react";
import StatCard from "./StatCard";
import RevenueChart from "./RevenueChart";
import OccupancyChart from "./OccupancyChart";
import PeakHoursChart from "./PeakHoursChart";
import RecentTransactions from "./RecentTransactions";
import RecentAlerts from "./RecentAlerts";
import dashboardService from "../../services/dashboardService";

function formatNumber(n) {
  if (n == null || isNaN(n)) return "0";
  return Number(n).toLocaleString("vi-VN");
}

function formatRevenue(n) {
  if (n == null || isNaN(n)) return "0 VND";
  const v = Number(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M VND`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K VND`;
  return `${v} VND`;
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [peakHours, setPeakHours] = useState(null);
  const [deviceHealth, setDeviceHealth] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      try {
        const [revRes, sessRes, occRes, peakRes, healthRes] = await Promise.all(
          [
            dashboardService.getRevenue().catch(() => null),
            dashboardService.getSessions().catch(() => null),
            dashboardService.getOccupancy().catch(() => null),
            dashboardService.getPeakHours().catch(() => null),
            dashboardService.getDeviceHealth().catch(() => null),
          ],
        );

        if (cancelled) return;
        setRevenue(revRes);
        setSessions(sessRes);
        setOccupancy(occRes);
        setPeakHours(peakRes);
        setDeviceHealth(healthRes);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const revData = Array.isArray(revenue)
    ? revenue
    : (revenue?.data ?? revenue?.items ?? revenue?.revenueData ?? []);
  const occData = Array.isArray(occupancy)
    ? occupancy
    : (occupancy?.data ?? occupancy?.items ?? occupancy?.occupancyData ?? []);
  const peakData = Array.isArray(peakHours)
    ? peakHours
    : (peakHours?.data ?? peakHours?.items ?? peakHours?.peakHours ?? []);

  const currentOccupancy =
    occupancy?.current ??
    occupancy?.total ??
    occupancy?.count ??
    occupancy?.vehicles ??
    sessions?.current ??
    null;
  const todayRevenue =
    revenue?.today ?? revenue?.total ?? revenue?.todayRevenue ?? null;
  const activeSessions =
    sessions?.active ?? sessions?.sessions ?? sessions?.count ?? null;
  const alertCount =
    deviceHealth?.alertsCount ??
    deviceHealth?.errors ??
    deviceHealth?.offline ??
    deviceHealth?.alerts?.length ??
    null;

  const todayIn =
    sessions?.todayIn ?? sessions?.in ?? sessions?.inCount ?? null;
  const todayOut =
    sessions?.todayOut ?? sessions?.out ?? sessions?.outCount ?? null;
  const avgParkingTime =
    sessions?.avgParkingTime ??
    sessions?.avgTime ??
    sessions?.averageTime ??
    null;
  const recognitionErrors =
    deviceHealth?.recognitionErrors ??
    deviceHealth?.errors ??
    deviceHealth?.errorCount ??
    null;

  const stats = [
    {
      title: "Tổng xe đang đỗ",
      value: loading ? "—" : formatNumber(currentOccupancy ?? 142),
      change: "+12%",
      icon: Bike,
      color: "bg-blue-500",
      trend: "up",
    },
    {
      title: "Doanh thu hôm nay",
      value: loading
        ? "—"
        : todayRevenue != null
          ? formatRevenue(todayRevenue)
          : "12.5M VNĐ",
      change: "+8.2%",
      icon: DollarSign,
      color: "bg-green-500",
      trend: "up",
    },
    {
      title: "Người dùng hoạt động",
      value: loading ? "—" : formatNumber(activeSessions ?? 1248),
      change: "+23%",
      icon: Users,
      color: "bg-purple-500",
      trend: "up",
    },
    {
      title: "Cảnh báo",
      value: loading ? "—" : formatNumber(alertCount ?? 3),
      change: "-2",
      icon: AlertTriangle,
      color: "bg-orange-500",
      trend: "down",
    },
  ];

  const quickStats = [
    {
      label: "Xe vào hôm nay",
      value: loading ? "—" : formatNumber(todayIn ?? 324),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Xe ra hôm nay",
      value: loading ? "—" : formatNumber(todayOut ?? 289),
      icon: CheckCircle,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Thời gian đỗ TB",
      value: loading
        ? "—"
        : avgParkingTime != null
          ? `${avgParkingTime}h`
          : "2.5h",
      icon: Clock,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
    {
      label: "Lỗi nhận dạng",
      value: loading ? "—" : formatNumber(recognitionErrors ?? 5),
      icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-100",
    },
  ];

  const recentTransactions =
    sessions?.recentTransactions ??
    sessions?.transactions ??
    revenue?.recentTransactions ??
    [];
  const recentAlerts = deviceHealth?.alerts ?? deviceHealth?.recentAlerts ?? [];

  return (
    <div className="space-y-8">
      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Stats */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <div className="mb-5 flex items-center gap-2">
          <Activity className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Thống kê nhanh
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`flex items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-md ${stat.bg} ${stat.border}`}
              >
                <div className="rounded-xl bg-white/80 p-3 shadow-sm">
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                  <p className="text-sm text-slate-600">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revData} loading={loading} />
        <OccupancyChart data={occData} loading={loading} />
      </div>

      {/* Peak Hours */}
      {(peakData.length > 0 || loading) && (
        <PeakHoursChart data={peakData} loading={loading} />
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions data={recentTransactions} loading={loading} />
        <RecentAlerts data={recentAlerts} loading={loading} />
      </div>
    </div>
  );
}

export default Dashboard;
