import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, ConfigProvider } from "antd";
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
  X,
  Ticket,
  AlertTriangle,
} from "lucide-react";
const { Sider } = Layout;

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  {
    title: "Quản lý tài khoản",
    icon: Users,
    children: [
      { title: "Danh sách tài khoản khách hàng", path: "/accounts" },
      { title: "Danh sách tài khoản nhân viên", path: "/accounts/staff" },
    ],
  },
  {
    title: "Quản lý gửi xe",
    icon: ParkingCircle,
    children: [
      { title: "Quản lý bãi gửi xe", path: "/parking-lots" },
      { title: "Quản lý phiên gửi xe", path: "/parking-sessions" },
      { title: "Quản lý phương tiện", path: "/parking-vehicles" },
    ],
  },
  {
    title: "Quản lý giao dịch",
    icon: Receipt,
    children: [
      { title: "Giao dịch", path: "/transactions" },
      { title: "Rút tiền", path: "/withdraw-requests" },
    ],
  },
  { title: "Lịch ca trực", icon: Calendar, path: "/shifts" },
  {
    title: "Nhật ký",
    icon: ScrollText,
    children: [
      { title: "Nhật ký thiết bị", path: "/device-events" },
      { title: "Nhật ký nhận diện", path: "/recognition-logs" },
    ],
  },
  { title: "Báo cáo sự cố", icon: AlertTriangle, path: "/incident-reports" },
  { title: "Điểm thưởng", icon: Award, path: "/reward-points" },
  { title: "Bảng giá phí", icon: DollarSign, path: "/price-list" },
  {
    title: "Quản lý vé tháng",
    icon: Ticket,
    children: [
      { title: "Quản lý vé tháng bãi xe", path: "/monthly-passes/packages" },
      { title: "Quản lý vé tháng người dùng", path: "/monthly-passes/users" },
    ],
  },
  {
    title: "Thiết bị IoT",
    icon: Cpu,
    path: "/iot-devices",
    children: [
      { title: "Danh sách thiết bị", path: "/iot-devices" },
      { title: "Bảo trì thiết bị", path: "/device-maintenance" },
    ],
  },
];

function Sidebar({ onClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark",
  );
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => {
      setIsDarkTheme(root.getAttribute("data-theme") === "dark");
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const getMenuItems = () => {
    return menuItems.map((item) => {
      const Icon = item.icon;
      if (item.children) {
        return {
          key: item.title,
          icon: <Icon size={18} strokeWidth={1.5} />,
          label: <span className="font-medium">{item.title}</span>,
          children: item.children.map((child) => ({
            key: child.path,
            label: <span className="font-medium">{child.title}</span>,
          })),
        };
      }
      return {
        key: item.path,
        icon: <Icon size={18} strokeWidth={1.5} />,
        label: <span className="font-medium">{item.title}</span>,
      };
    });
  };

  const handleMenuClick = ({ key }) => {
    if (key.startsWith("/")) {
      navigate(key);
      if (window.innerWidth < 1024 && onClose) onClose();
    }
  };

  return (
    <>
      <ConfigProvider
        theme={{
          components: {
            Menu: {
              itemBg: "transparent",
              subMenuItemBg: "transparent",
              itemColor: isDarkTheme ? "#e2e8f0" : "#64748b",
              itemHoverColor: isDarkTheme ? "#ffffff" : "#0f172a",
              itemHoverBg: isDarkTheme ? "#1f2937" : "#f1f5f9",
              itemSelectedColor: isDarkTheme ? "#93c5fd" : "#2563eb",
              itemSelectedBg: isDarkTheme ? "#1e3a8a" : "#eff6ff",
              itemBorderRadius: 8,
              itemMarginInline: 12,
              activeBarBorderWidth: 0,
            },
            Layout: {
              siderBg: isDarkTheme ? "#0b1220" : "#ffffff",
            },
          },
        }}
      >
        <Sider
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={300}
          collapsedWidth={80}
          className={`h-full relative z-50 border-r ${isDarkTheme ? "border-slate-700 custom-sidebar" : "border-slate-200 custom-sidebar"}`}
          style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.02)" }}
        >
          {onClose && (
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 z-50 p-1.5 rounded-md lg:hidden transition-colors ${
                isDarkTheme
                  ? "text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700"
                  : "text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <X size={18} />
            </button>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`absolute -right-3.5 top-9 z-50 hidden lg:flex items-center justify-center w-7 h-7 border rounded-full shadow-sm transition-all hover:scale-105 ${
              isDarkTheme
                ? "bg-slate-900 text-slate-300 hover:text-blue-300 border-slate-700"
                : "bg-white text-slate-400 hover:text-blue-600 border-slate-200"
            }`}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <div
            className={`flex flex-col h-full ${isDarkTheme ? "bg-slate-950" : "bg-white"}`}
          >
            <div className="h-20 flex items-center px-5 mt-2">
              <div
                className={`flex items-center justify-center rounded-lg text-white transition-all duration-300 ${collapsed ? "w-10 h-10" : "w-20 h-20"}`}
              >
                <img
                  src="/logo_motorguard.png"
                  alt="MotoGuard"
                  className="w-full h-full object-contain p-1"
                />
              </div>

              {!collapsed && (
                <div className="flex flex-col overflow-hidden whitespace-nowrap">
                  <h1
                    className={`text-2xl font-bold tracking-tight leading-none mb-1 ${
                      isDarkTheme ? "text-white" : "text-slate-800"
                    }`}
                  >
                    MotoGuard
                  </h1>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-2">
              <Menu
                mode="inline"
                items={getMenuItems()}
                selectedKeys={[location.pathname]}
                onClick={handleMenuClick}
                className="border-none custom-sidebar-menu"
              />
            </div>
          </div>
        </Sider>
      </ConfigProvider>
    </>
  );
}

export default Sidebar;
