import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ParkingCircle,
  Receipt,
  Calendar,
  ScrollText,
  Award,
  DollarSign,
  Cpu,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    title: "Quản lý tài khoản",
    icon: Users,
    path: "/accounts",
  },
  {
    title: "Quản lý bãi đỗ xe",
    icon: ParkingCircle,
    path: "/parking-lots",
  },
  {
    title: "Giao dịch & Hóa đơn",
    icon: Receipt,
    path: "/transactions",
  },
  {
    title: "Lịch ca trực",
    icon: Calendar,
    path: "/shifts",
  },
  {
    title: "Nhật ký hệ thống",
    icon: ScrollText,
    path: "/system-logs",
  },
  {
    title: "Điểm thưởng",
    icon: Award,
    path: "/reward-points",
  },
  {
    title: "Bảng giá phí",
    icon: DollarSign,
    path: "/price-list",
  },
  {
    title: "Thiết bị IoT",
    icon: Cpu,
    path: "/iot-devices",
  },
];

function Sidebar() {
  return (
    <aside className="w-64 bg-gradient-to-b from-primary-800 to-primary-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <img
            src="/logo_motorguard.png"
            alt="MotoGuard Logo"
            className="w-16 h-16 object-contain flex-shrink-0"
          />
          <div className="flex flex-col justify-center">
            <h1 className="text-lg font-bold leading-tight">MotoGuard</h1>
            <p className="text-xs text-primary-200 mt-0.5">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-white text-primary-700 shadow-lg"
                        : "text-primary-100 hover:bg-primary-700 hover:text-white"
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.title}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-primary-700">
        <div className="text-xs text-primary-300 text-center">
          <p>© 2026 FPT University</p>
          <p className="mt-1">Team MotoGuard</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
