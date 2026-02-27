import { useState } from "react";
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
  ChevronRight,
  ChevronLeft,
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
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside
      className={`bg-gradient-to-b from-primary-800 to-primary-900 text-white flex flex-col transition-all duration-300 ease-in-out relative ${
        isExpanded ? "w-64" : "w-20"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-24 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-1.5 shadow-lg z-10 transition-all"
        title={isExpanded ? "Thu gọn" : "Mở rộng"}
      >
        {isExpanded ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Logo */}
      <div className="p-5 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <img
            src="/logo_motorguard.png"
            alt="MotoGuard Logo"
            className={`object-contain flex-shrink-0 transition-all duration-300 ${
              isExpanded ? "w-16 h-16" : "w-10 h-10"
            }`}
            title="MotoGuard"
          />
          <div
            className={`flex flex-col justify-center overflow-hidden transition-all duration-300 ${
              isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
            }`}
          >
            <h1 className="text-lg font-bold leading-tight whitespace-nowrap">
              MotoGuard
            </h1>
            <p className="text-xs text-primary-200 mt-0.5 whitespace-nowrap">
              Admin Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center ${isExpanded ? "space-x-3 px-4" : "justify-center px-3"} py-3 rounded-lg transition-all duration-200 group relative ${
                      isActive
                        ? "bg-white text-primary-700 shadow-lg"
                        : "text-primary-100 hover:bg-primary-700 hover:text-white"
                    }`
                  }
                  title={!isExpanded ? item.title : ""}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span
                    className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                      isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                    }`}
                  >
                    {item.title}
                  </span>
                  
                  {/* Tooltip khi collapsed */}
                  {!isExpanded && (
                    <span className="absolute left-full ml-6 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50 shadow-lg">
                      {item.title}
                      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></span>
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-primary-700">
        <div
          className={`text-xs text-primary-300 text-center transition-all duration-300 ${
            isExpanded ? "opacity-100" : "opacity-0"
          }`}
        >
          {isExpanded && (
            <>
              <p>© 2026 FPT University</p>
              <p className="mt-1">Team MotoGuard</p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
