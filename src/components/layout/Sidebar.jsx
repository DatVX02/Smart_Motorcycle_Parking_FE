import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, ConfigProvider, Avatar } from "antd";
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
  { title: "Quản lý bãi đỗ xe", icon: ParkingCircle, path: "/parking-lots" },
  { title: "Giao dịch", icon: Receipt, path: "/transactions" },
  { title: "Lịch ca trực", icon: Calendar, path: "/shifts" },
  { title: "Nhật ký thiết bị", icon: ScrollText, path: "/device-events" },
  { title: "Điểm thưởng", icon: Award, path: "/reward-points" },
  { title: "Bảng giá phí", icon: DollarSign, path: "/price-list" },
  { title: "Vé tháng", icon: Ticket, path: "/monthly-passes" },
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
  const navigate = useNavigate();
  const location = useLocation();

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
              itemColor: "#64748b",
              itemHoverColor: "#0f172a",
              itemHoverBg: "#f1f5f9",
              itemSelectedColor: "#2563eb",
              itemSelectedBg: "#eff6ff",
              itemBorderRadius: 8,
              itemMarginInline: 12,
              activeBarBorderWidth: 0,
            },
            Layout: {
              siderBg: "#ffffff",
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
          className="h-full relative z-50 border-r border-slate-200"
          style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.02)" }}
        >
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-50 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md lg:hidden transition-colors"
            >
              <X size={18} />
            </button>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3.5 top-9 z-50 hidden lg:flex items-center justify-center w-7 h-7 bg-white text-slate-400 hover:text-blue-600 border border-slate-200 rounded-full shadow-sm transition-all hover:scale-105"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          <div className="flex flex-col h-full bg-white">
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
                  <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-none mb-1">
                    MotoGuard
                  </h1>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-2">
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
