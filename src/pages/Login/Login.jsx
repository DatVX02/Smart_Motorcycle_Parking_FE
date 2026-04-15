import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import toast from "react-hot-toast";
import authService from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "antd";

const REMEMBER_LOGIN_KEY = "motoguard_remember_login";
const LOGIN_HISTORY_KEY = "motoguard_login_history";
const LAST_LOGIN_AT_KEY = "motoguard_last_login_at";
const CURRENT_SESSION_KEY = "motoguard_current_session";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  // Trang muốn vào trước khi bị redirect về login
  const from = location.state?.from?.pathname ?? "/dashboard";
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    emailOrPhone: "",
    password: "",
    rememberMe: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
      if (!raw) return;

      const remembered = JSON.parse(raw);
      setFormData((prev) => ({
        ...prev,
        emailOrPhone: remembered?.emailOrPhone ?? "",
        password: remembered?.password ?? "",
        rememberMe: true,
      }));
    } catch {
      localStorage.removeItem(REMEMBER_LOGIN_KEY);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.login({
        emailOrPhone: formData.emailOrPhone,
        password: formData.password,
      });

      const token =
        response.data?.accessToken || response.accessToken || response.token;

      // Lưu thông tin user
      const userInfo =
        response.data?.staff || response.data?.user || response.user || null;

      if (token && userInfo) {
        if (userInfo.role === "Admin") {
          authService.setToken(token);
          localStorage.setItem("user_info", JSON.stringify(userInfo));

          if (formData.rememberMe) {
            localStorage.setItem(
              REMEMBER_LOGIN_KEY,
              JSON.stringify({
                emailOrPhone: formData.emailOrPhone,
                password: formData.password,
              }),
            );
          } else {
            localStorage.removeItem(REMEMBER_LOGIN_KEY);
          }

          const adminName =
            userInfo.fullName ??
            userInfo.name ??
            userInfo.displayName ??
            userInfo.userName ??
            "Admin";

          try {
            const now = new Date().toISOString();
            const sessionId =
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `session-${Date.now()}`;

            sessionStorage.setItem(CURRENT_SESSION_KEY, sessionId);
            localStorage.setItem(LAST_LOGIN_AT_KEY, now);

            const historyRaw = localStorage.getItem(LOGIN_HISTORY_KEY);
            const history = Array.isArray(JSON.parse(historyRaw ?? "[]"))
              ? JSON.parse(historyRaw ?? "[]")
              : [];

            const entry = {
              id: sessionId,
              at: now,
              fullName: adminName,
              emailOrPhone: formData.emailOrPhone,
              rememberMe: formData.rememberMe,
              userAgent:
                typeof navigator !== "undefined" ? navigator.userAgent : "",
              platform:
                typeof navigator !== "undefined" ? navigator.platform : "",
            };

            localStorage.setItem(
              LOGIN_HISTORY_KEY,
              JSON.stringify([entry, ...history].slice(0, 20)),
            );
          } catch {
            // Không chặn đăng nhập nếu không lưu được lịch sử phiên.
          }

          toast.success(`Chào mừng ${adminName} quay trở lại!`, {
            duration: 2000,
          });
          navigate(from, { replace: true });
        } else {
          toast.error("Tài khoản không có quyền truy cập.", { duration: 2000 });
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Đăng nhập thất bại", {
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-white overflow-hidden">
      {/* Banner/Hình ảnh minh họa (desktop: nằm bên phải) */}
      <div className="hidden lg:flex lg:order-2 flex-1 relative flex-col items-center justify-center border-l border-slate-200 overflow-hidden">
        {/* Ảnh nền bãi xe */}
        <div className="absolute inset-0 bg-[url('/parking-lot.jpg')] bg-cover bg-center"></div>
        {/* Lớp phủ giúp chữ dễ đọc */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/65 via-slate-900/45 to-slate-900/65"></div>

        <div className="relative z-10 p-12 flex flex-col items-center text-center">
          <div className="mb-8 flex items-center justify-center">
            <img
              src="/logo_motorguard.png"
              alt="MotoGuard Logo"
              className="w-60 h-45 object-cover drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)] mt-10"
            />
          </div>
          <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">
            Hệ Thống MotoGuard
          </h2>
          <p className="text-slate-200 text-lg max-w-md leading-relaxed">
            Quản lý bãi đỗ xe thông minh ứng dụng công nghệ nhận diện khuôn mặt
            và biển số xe, mang lại sự an toàn và tiện lợi tối đa.
          </p>
        </div>
      </div>

      {/* Form Đăng nhập (desktop: nằm bên trái) */}
      <div className="flex-1 lg:order-1 flex flex-col items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-[400px]">
          {/* Logo hiển thị bù khi ở Mobile (lg:hidden) */}
          <div className="lg:hidden text-center mb-8">
            <img
              src="/logo_motorguard.png"
              alt="MotoGuard"
              className="w-20 h-20 mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-slate-900">
              MotoGuard Admin
            </h2>
          </div>

          <div className="mb-8 hidden lg:block text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Đăng nhập hệ thống
            </h1>
            <p className="text-slate-500 mt-1">
              Vui lòng nhập thông tin quản trị viên
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Label
                htmlFor="emailOrPhone"
                className="text-slate-700 font-semibold text-xs uppercase tracking-wide"
              >
                Email / Số điện thoại
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <Input
                  id="emailOrPhone"
                  name="emailOrPhone"
                  value={formData.emailOrPhone}
                  onChange={handleChange}
                  placeholder="admin@motoguard.com"
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 pl-10 h-12 rounded-lg focus-visible:bg-white focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="password"
                  className="text-slate-700 font-semibold text-xs uppercase tracking-wide"
                >
                  Mật khẩu
                </Label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 pl-10 pr-10 h-12 rounded-lg focus-visible:bg-white focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={(e) =>
                  setFormData({ ...formData, rememberMe: e.target.checked })
                }
              >
                <span className="text-sm text-slate-600 select-none cursor-pointer">
                  Ghi nhớ đăng nhập
                </span>
              </Checkbox>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-12 text-center lg:text-left">
            <p className="text-xs text-slate-400 font-medium text-center">
              © 2026 MotoGuard Team · FPT University
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
