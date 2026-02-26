import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import toast from "react-hot-toast";
import authService from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      });

      const token =
        response.data?.accessToken ||
        response.accessToken ||
        response.token;

      if (token) {
        authService.setToken(token);

        const userInfo =
          response.data?.staff ||
          response.user ||
          response.data?.user;

        if (userInfo) {
          localStorage.setItem("user_info", JSON.stringify(userInfo));
        }

        toast.success(response.message || "Đăng nhập thành công!");
        navigate("/dashboard");
      } else {
        toast.error("Không nhận được token từ server");
      }
    } catch (error) {
      if (error.response) {
        const message =
          error.response.data?.message ||
          "Email hoặc mật khẩu không đúng";
        toast.error(message);
      } else {
        toast.error("Không thể kết nối server");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black overflow-hidden">
      {/* Background blur blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <Card className="rounded-2xl border border-white/20 bg-white/90 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <CardHeader className="text-center space-y-4 pt-8">
            <img
              src="/logo_motorguard.png"
              alt="MotoGuard"
              className="w-20 mx-auto drop-shadow-lg"
            />
            <CardTitle className="text-2xl font-bold tracking-tight">
              MotoGuard Admin
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Smart Motorcycle Parking System
            </p>
          </CardHeader>

          {/* Content */}
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@motoguard.com"
                    className="pl-9 h-11"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="pl-9 pr-10 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 transition-all"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-white/60">
          © 2026 FPT University · MotoGuard Team
        </p>
      </div>
    </div>
  );
}

export default Login;
