import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Bike } from "lucide-react";
import toast from "react-hot-toast";
import authService from "../../services/authService";

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call login API
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      });

      // Store token (check both response formats)
      const token = response.data?.accessToken || response.accessToken || response.token;
      
      if (token) {
        authService.setToken(token);
        
        // Store user info if available
        const userInfo = response.data?.staff || response.user || response.data?.user;
        if (userInfo) {
          localStorage.setItem("user_info", JSON.stringify(userInfo));
        }

        // Show success message from API or default
        const successMessage = response.message || "Đăng nhập thành công!";
        toast.success(successMessage);
        
        // Navigate to dashboard
        navigate("/dashboard");
      } else {
        toast.error("Không nhận được token từ server");
        console.error("Response data:", response);
      }
    } catch (error) {
      // Log full error for debugging
      console.error("Login error:", error);
      console.error("Error response data:", error.response?.data);
      
      // Handle different error types
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        // Try to get error message from different possible fields
        const message = 
          errorData?.message || 
          errorData?.error || 
          errorData?.msg ||
          errorData?.detail ||
          JSON.stringify(errorData);

        console.log("Backend error message:", message);

        if (status === 401) {
          toast.error(message || "Email hoặc mật khẩu không đúng");
        } else if (status === 400) {
          // Show detailed error for debugging
          toast.error(`Lỗi 400: ${message}`);
        } else if (status === 404) {
          toast.error("Tài khoản không tồn tại");
        } else if (status === 500) {
          toast.error("Lỗi server. Vui lòng thử lại sau");
        } else {
          toast.error(message || "Đăng nhập thất bại. Vui lòng thử lại");
        }
      } else if (error.request) {
        toast.error("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng");
      } else {
        toast.error("Đã xảy ra lỗi. Vui lòng thử lại");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Motorcycle Pattern Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10">
          <Bike className="w-32 h-32 text-white" />
        </div>
        <div className="absolute bottom-10 right-10">
          <Bike className="w-32 h-32 text-white" />
        </div>
        <div className="absolute top-1/2 right-20">
          <Bike className="w-24 h-24 text-white transform rotate-45" />
        </div>
        <div className="absolute bottom-1/3 left-20">
          <Bike className="w-24 h-24 text-white transform -rotate-45" />
        </div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md mx-4 z-10">
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6 animate-float">
              <img
                src="/logo_motorguard.png"
                alt="MotoGuard Logo"
                className="w-32 h-32 object-contain drop-shadow-2xl"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              MotoGuard Admin
            </h1>
            <p className="text-gray-600">Đăng nhập vào hệ thống quản lý</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input pl-10 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  placeholder="admin@motoguard.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input pl-10 pr-10 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 block text-sm text-gray-700 cursor-pointer"
                >
                  Ghi nhớ đăng nhập
                </label>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang đăng nhập...</span>
                </span>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Hoặc tiếp tục với
                </span>
              </div>
            </div>
          </div>

          {/* Social Login (Optional) */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="w-full btn btn-secondary py-2.5 flex items-center justify-center space-x-2 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-medium">Google</span>
            </button>
            <button
              type="button"
              className="w-full btn btn-secondary py-2.5 flex items-center justify-center space-x-2 hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              <span className="text-sm font-medium">GitHub</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-white/80">
            © 2026 FPT University - Team MotoGuard
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
