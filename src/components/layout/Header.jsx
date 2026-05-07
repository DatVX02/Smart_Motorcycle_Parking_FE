import {
  LogOut,
  Settings,
  Menu,
  Bell,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import authService from "../../services/authService";
import notificationService from "../../services/notificationService";

const AVATAR_KEY = "motoguard_profile_avatar";
const PROFILE_UPDATED_EVENT = "motoguard:user-updated";
const READ_NOTIFICATIONS_KEY = "motoguard:device-notifications-read";

const PAGE_TITLES = {
  "/dashboard": { title: "Dashboard" },
  "/settings": { title: "Cài Đặt Tài Khoản" },
  "/accounts": { title: "Quản Lý Tài Khoản Khách Hàng" },
  "/accounts/staff": { title: "Quản Lý Tài Khoản Nhân Viên" },
  "/parking-lots": { title: "Quản Lý Bãi Gửi Xe" },
  "/parking-sessions": { title: "Quản Lý Phiên Gửi Xe" },
  "/parking-vehicles": { title: "Quản Lý Phương Tiện" },
  "/transactions": { title: "Quản Lý Giao Dịch" },
  "/withdraw-requests": { title: "Quản Lý Rút Tiền" },
  "/shifts": { title: "Quản Lý Lịch Bãi Xe" },
  "/device-events": { title: "Nhật Ký Thiết Bị" },
  "/recognition-logs": { title: "Nhật Ký Nhận Diện" },
  "/reward-points": { title: "Quản Lý Điểm Thưởng" },
  "/price-list": { title: "Bảng Giá Phí Gửi Xe" },
  "/monthly-passes": { title: "Quản Lý Vé Tháng" },
  "/monthly-passes/packages": { title: "Quản Lý Vé Tháng Bãi Xe" },
  "/monthly-passes/users": { title: "Quản Lý Vé Tháng Người Dùng" },
  "/iot-devices": { title: "Quản Lý Danh Sách Thiết Bị" },
  "/device-maintenance": { title: "Bảo Trì Thiết Bị" },
  "/incident-reports": { title: "Báo Cáo Sự Cố" },
};

const NOTIFICATION_PAGE_SIZE = 20;

function formatNotificationTime(value) {
  if (value == null || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${min} ${dd}/${mm}/${yyyy}`;
}

function stripTimestampFromMessage(value) {
  if (value == null) return "";
  let msg = String(value).trim();
  if (!msg) return "";
  msg = msg.replace(/\s+lúc\s+.*$/i, "");
  msg = msg.replace(/^Thiết bị\s+/i, "Thiết bị ");
  msg = msg.replace(/\s+\.$/, ".");
  if (!msg.endsWith(".")) msg += ".";
  return msg;
}

function loadReadNotificationIds() {
  try {
    const raw = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    const parsed = JSON.parse(raw ?? "[]");
    if (Array.isArray(parsed)) return new Set(parsed);
  } catch {
    // ignore storage errors
  }
  return new Set();
}

function saveReadNotificationIds(readSet) {
  try {
    localStorage.setItem(
      READ_NOTIFICATIONS_KEY,
      JSON.stringify(Array.from(readSet)),
    );
  } catch {
    // ignore storage errors
  }
}

function normalizeDeviceStatusNotification(item, index) {
  if (!item || typeof item !== "object") return null;
  const title = String(item.title ?? "").trim();
  const message = String(item.message ?? "").trim();
  const statusSource = `${title} ${message}`.toLowerCase();
  const status = statusSource.includes("offline")
    ? "offline"
    : statusSource.includes("online")
      ? "online"
      : "";
  const deviceName =
    item.deviceName ??
    item.deviceCode ??
    item.deviceId ??
    `Thiết bị ${index + 1}`;
  const time = formatNotificationTime(
    item.createdAt ?? item.timestamp ?? item.time,
  );

  let fallbackMessage = `Thiết bị ${deviceName}`;
  if (status === "offline") {
    fallbackMessage = `Thiết bị ${deviceName} mất kết nối`;
  } else if (status === "online") {
    fallbackMessage = `Thiết bị ${deviceName} hoạt động trở lại`;
  } else if (status) {
    fallbackMessage = `Thiết bị ${deviceName}: ${status}`;
  }

  return {
    id:
      item.id ??
      item.notificationId ??
      item.deviceId ??
      `${deviceName}-${index}`,
    status,
    title: title || "Thông báo thiết bị",
    message: stripTimestampFromMessage(message) || `${fallbackMessage}.`,
    time,
    isRead: Boolean(item.isRead),
  };
}

function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname || "/dashboard";
  const pathMatch = [
    "/settings",
    "/accounts/staff",
    "/accounts",
    "/dashboard",
    "/parking-lots",
    "/parking-sessions",
    "/parking-vehicles",
    "/transactions",
    "/withdraw-requests",
    "/shifts",
    "/device-events",
    "/recognition-logs",
    "/reward-points",
    "/price-list",
    "/monthly-passes/packages",
    "/monthly-passes/users",
    "/monthly-passes",
    "/iot-devices",
    "/device-maintenance",
    "/incident-reports",
  ].find((p) => path === p || path.startsWith(p + "/"));
  const pageInfo = PAGE_TITLES[pathMatch || "/dashboard"] || {
    title: "Dashboard",
  };
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  const [profileVersion, setProfileVersion] = useState(0);
  const currentUser = authService.getCurrentUser();
  const displayName =
    currentUser?.fullName ??
    currentUser?.name ??
    currentUser?.email?.split("@")[0] ??
    "Admin";
  const displayEmail = currentUser?.email ?? "admin@motoguard.com";
  const displayRole = currentUser?.role ?? "ADMIN";
  const initials =
    displayName
      .split(" ")
      .slice(-2)
      .map((n) => n[0] ?? "")
      .join("")
      .toUpperCase() || "A";
  const displayAvatar =
    localStorage.getItem(AVATAR_KEY) ??
    currentUser?.avatarUrl ??
    currentUser?.faceImageUrl ??
    "";

  const loadNotifications = useCallback(async () => {
    setNotificationLoading(true);
    setNotificationError("");
    try {
      const { items } = await notificationService.getAdminDeviceStatus({
        pageNumber: 1,
        pageSize: NOTIFICATION_PAGE_SIZE,
        isRead: false,
      });
      const readSet = loadReadNotificationIds();
      const normalized = (items ?? [])
        .map((item, index) => normalizeDeviceStatusNotification(item, index))
        .filter(Boolean)
        .map((item) => ({
          ...item,
          isRead: item.isRead || readSet.has(item.id),
        }));
      setNotifications(normalized);
    } catch (error) {
      console.error("Failed to load notifications", error);
      setNotifications([]);
      setNotificationError("Không thể tải thông báo thiết bị");
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  useEffect(() => {
    const refreshProfile = () => setProfileVersion((v) => v + 1);
    window.addEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
    window.addEventListener("storage", refreshProfile);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, refreshProfile);
      window.removeEventListener("storage", refreshProfile);
    };
  }, []);

  useEffect(() => {
    // Tải thông báo ngay lập tức khi mount để hiển thị số badge
    loadNotifications();

    // Tự động làm mới sau mỗi 60 giây để cập nhật số lượng thông báo mới
    const interval = setInterval(() => {
      loadNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    // Luôn làm mới khi người dùng click mở danh sách để đảm bảo dữ liệu mới nhất
    if (showNotifications) {
      loadNotifications();
    }
  }, [showNotifications, loadNotifications]);

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      await authService.logout();
    } catch {
      // bỏ qua lỗi API logout
    } finally {
      authService.clearAuth();
      toast.success("Đã đăng xuất thành công", { duration: 1000 });
      navigate("/login", { replace: true });
    }
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const hasNotifications = unreadCount > 0;
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const readSet = loadReadNotificationIds();
      prev.forEach((item) => readSet.add(item.id));
      saveReadNotificationIds(readSet);
      return prev.map((item) => ({ ...item, isRead: true }));
    });
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => {
      const readSet = loadReadNotificationIds();
      readSet.add(id);
      saveReadNotificationIds(readSet);
      return prev.map((item) =>
        item.id === id ? { ...item, isRead: true } : item,
      );
    });
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 md:py-5">
      <div className="flex items-center justify-between gap-3">
        {/* Left: hamburger + page title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Hamburger — only on mobile */}
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 lg:hidden"
            title="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Page title */}
          <div className="flex items-center gap-3 min-w-0">
            {pageInfo.icon && (
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${pageInfo.iconBg ?? "bg-slate-100 text-slate-600"}`}
              >
                {(() => {
                  const Icon = pageInfo.icon;
                  return <Icon className="w-5 h-5" />;
                })()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate tracking-tight">
                {pageInfo.title}
              </h1>
              {pageInfo.subtitle && (
                <p className="text-sm md:text-base text-gray-500 truncate hidden sm:block mt-0.5">
                  {pageInfo.subtitle}
                </p>
              )}
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
              className="relative p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="Thông báo thiết bị"
            >
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white translate-x-1/3 -translate-y-1/3">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">
                        Thông báo thiết bị
                      </h3>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={markAllAsRead}
                          className={`text-xs font-medium transition-colors ${
                            hasNotifications
                              ? "text-emerald-600 hover:text-emerald-700"
                              : "text-gray-300 cursor-not-allowed"
                          }`}
                          type="button"
                          disabled={!hasNotifications}
                        >
                          Đánh dấu tất cả đã đọc
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Hiển thị thông báo chưa đọc
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationLoading ? (
                      <div className="p-4 text-sm text-gray-500">
                        Đang tải thông báo...
                      </div>
                    ) : notificationError ? (
                      <div className="p-4 text-sm text-red-600">
                        {notificationError}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">
                        Chưa có thông báo mới.
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const StatusIcon =
                          notif.status === "offline"
                            ? WifiOff
                            : notif.status === "online"
                              ? CheckCircle
                              : AlertTriangle;
                        const statusColor =
                          notif.status === "offline"
                            ? "text-red-500"
                            : notif.status === "online"
                              ? "text-emerald-500"
                              : "text-amber-500";

                        return (
                          <div
                            key={notif.id}
                            className={`group flex items-start gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 ${
                              notif.isRead ? "" : "bg-blue-50/60"
                            }`}
                            role="button"
                            tabIndex={0}
                            onClick={() => markAsRead(notif.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                markAsRead(notif.id);
                              }
                            }}
                          >
                            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                              <StatusIcon
                                className={`h-4 w-4 ${statusColor}`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900">
                                {notif.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {notif.message}
                              </p>
                            </div>
                            <div className="ml-3 flex flex-col items-end gap-2">
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {notif.time}
                              </span>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  markAsRead(notif.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-emerald-600 transition"
                                title="Đánh dấu đã đọc"
                                type="button"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
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
              <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
                {displayAvatar ? (
                  <img
                    key={`${profileVersion}-${displayAvatar}`}
                    src={displayAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-xs md:text-sm font-bold">
                    {initials}
                  </span>
                )}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {displayName}
                </p>
                <p className="text-xs text-gray-400 leading-tight">
                  {displayEmail}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {displayEmail}
                    </p>
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
                      {displayRole}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate("/settings");
                    }}
                    className="w-full flex items-center space-x-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Cài đặt</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-4 py-2.5 hover:bg-red-50 transition-colors border-t border-gray-100 text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">
                      Đăng xuất
                    </span>
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
