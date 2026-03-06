import {
  Bike,
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import StatCard from "./StatCard";
import RevenueChart from "./RevenueChart";
import OccupancyChart from "./OccupancyChart";
import RecentTransactions from "./RecentTransactions";
import RecentAlerts from "./RecentAlerts";

function Dashboard() {
  // Mock statistics
  const stats = [
    {
      title: "Tổng xe đang đỗ",
      value: "142",
      change: "+12%",
      icon: Bike,
      color: "bg-blue-500",
      trend: "up",
    },
    {
      title: "Doanh thu hôm nay",
      value: "12.5M VND",
      change: "+8.2%",
      icon: DollarSign,
      color: "bg-green-500",
      trend: "up",
    },
    {
      title: "Người dùng hoạt động",
      value: "1,248",
      change: "+23%",
      icon: Users,
      color: "bg-purple-500",
      trend: "up",
    },
    {
      title: "Cảnh báo",
      value: "3",
      change: "-2",
      icon: AlertTriangle,
      color: "bg-orange-500",
      trend: "down",
    },
  ];

  const quickStats = [
    {
      label: "Xe vào hôm nay",
      value: "324",
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      label: "Xe ra hôm nay",
      value: "289",
      icon: CheckCircle,
      color: "text-blue-600",
    },
    {
      label: "Thời gian đỗ TB",
      value: "2.5h",
      icon: Clock,
      color: "text-purple-600",
    },
    {
      label: "Lỗi nhận dạng",
      value: "5",
      icon: XCircle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Tổng quan hệ thống quản lý bãi đỗ xe
        </p>
      </div>

      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Stats */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Thống kê nhanh
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg"
              >
                <Icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <OccupancyChart />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions />
        <RecentAlerts />
      </div>
    </div>
  );
}

export default Dashboard;
