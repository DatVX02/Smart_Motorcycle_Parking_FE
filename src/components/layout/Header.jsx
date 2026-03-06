import { Bell, Search, User, LogOut, Settings, Menu } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import authService from "../../services/authService";

function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentUser = authService.getCurrentUser();
  const displayName =
    currentUser?.fullName ??
    currentUser?.name ??
    currentUser?.email?.split("@")[0] ??
    "Admin";
  const displayEmail = currentUser?.email ?? "admin@motoguard.com";
  const displayRole = currentUser?.role ?? "ADMIN";
  const initials = displayName
    .split(" ")
    .slice(-2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase() || "A";

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      await authService.logout();
    } catch {
      // bỏ qua lỗi API logout
    } finally {
      authService.clearAuth();
      toast.success("Đã đăng xuất thành công");
      navigate("/login", { replace: true });
    }
  };

  const notifications = [
    { id: 1, message: "Có phương tiện mới vào bãi đỗ", time: "2 phút trước", unread: true },
    { id: 2, message: "Thanh toán thành công #TX-1234", time: "15 phút trước", unread: true },
    { id: 3, message: "Phát hiện bất thường tại cổng A", time: "1 giờ trước", unread: false },
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-3">
        {/* Left: hamburger + search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Hamburger — only on mobile */}
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 lg:hidden"
            title="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Thông báo</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${notif.unread ? "bg-blue-50" : ""}`}
                      >
                        <p className="text-sm text-gray-900">{notif.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center border-t border-gray-200">
                    <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                      Xem tất cả
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white text-xs md:text-sm font-bold">{initials}</span>
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{displayName}</p>
                <p className="text-xs text-gray-400 leading-tight">{displayEmail}</p>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{displayEmail}</p>
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
                      {displayRole}
                    </span>
                  </div>
                  <button className="w-full flex items-center space-x-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Cài đặt</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-4 py-2.5 hover:bg-red-50 transition-colors border-t border-gray-100 text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">Đăng xuất</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
