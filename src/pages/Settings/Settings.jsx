import { useEffect, useMemo, useState } from "react";
import { Clock3, KeyRound, Shield, Upload, UserCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import authService from "@/services/authService";
import staffService from "@/services/staffService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// const THEME_KEY = "motoguard_theme";
const AVATAR_KEY = "motoguard_profile_avatar";
const AVATAR_UPDATED_AT_KEY = "motoguard_profile_avatar_updated_at";
const LOGIN_HISTORY_KEY = "motoguard_login_history";
const LAST_LOGIN_AT_KEY = "motoguard_last_login_at";
const REMEMBER_LOGIN_KEY = "motoguard_remember_login";
const PROFILE_UPDATED_EVENT = "motoguard:user-updated";

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function normalizeProfile(raw) {
  const base = raw?.staff ?? raw?.user ?? raw ?? {};
  return {
    id: pickFirst(base.staffId, base.id, base.userId, base.accountId, ""),
    fullName: pickFirst(base.fullName, base.name, base.displayName, ""),
    email: pickFirst(base.email, base.emailAddress, ""),
    phoneContact: pickFirst(
      base.phoneContact,
      base.phoneNumber,
      base.phone,
      "",
    ),
    avatarUrl: pickFirst(
      base.avatarUrl,
      base.faceImageUrl,
      base.profileImage,
      base.imageUrl,
      "",
    ),
  };
}

// function applyThemePreference(mode) {
//   const prefersDark =
//     typeof window !== "undefined" &&
//     window.matchMedia &&
//     window.matchMedia("(prefers-color-scheme: dark)").matches;

//   const resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
//   document.documentElement.setAttribute("data-theme", resolved);
//   document.documentElement.classList.toggle("dark", resolved === "dark");
// }

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function describeBrowser(ua = "") {
  const raw = String(ua);
  if (raw.includes("Edg/")) return "Microsoft Edge";
  if (raw.includes("Chrome/") && !raw.includes("Edg/")) return "Google Chrome";
  if (raw.includes("Firefox/")) return "Mozilla Firefox";
  if (raw.includes("Safari/") && !raw.includes("Chrome/")) return "Safari";
  return "Trình duyệt khác";
}

export default function Settings() {
  const currentUser = useMemo(() => authService.getCurrentUser() ?? {}, []);

  const [profile, setProfile] = useState({
    id: "",
    fullName: "",
    email: "",
    phoneContact: "",
    avatarUrl: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  //   const [themeMode, setThemeMode] = useState(
  //     () => localStorage.getItem(THEME_KEY) ?? "light",
  //   );
  const [loginHistory, setLoginHistory] = useState([]);

  useEffect(() => {
    const base = normalizeProfile(currentUser);
    const localAvatar = localStorage.getItem(AVATAR_KEY) ?? "";
    setProfile({
      ...base,
      avatarUrl: localAvatar || base.avatarUrl,
    });

    let cancelled = false;

    authService
      .getProfile()
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data?.data ?? res?.data ?? res;
        const normalized = normalizeProfile(payload);
        const avatar = localStorage.getItem(AVATAR_KEY) ?? normalized.avatarUrl;
        setProfile((prev) => ({
          ...prev,
          ...normalized,
          avatarUrl: avatar || normalized.avatarUrl,
        }));
      })
      .catch(() => {
        if (cancelled) return;
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  //   useEffect(() => {
  //     localStorage.setItem(THEME_KEY, themeMode);
  //     applyThemePreference(themeMode);

  //     if (themeMode !== "system" || !window.matchMedia) return undefined;

  //     const media = window.matchMedia("(prefers-color-scheme: dark)");
  //     const listener = () => applyThemePreference("system");

  //     if (typeof media.addEventListener === "function") {
  //       media.addEventListener("change", listener);
  //       return () => media.removeEventListener("change", listener);
  //     }

  //     media.addListener(listener);
  //     return () => media.removeListener(listener);
  //   }, [themeMode]);

  const readLoginHistory = () => {
    try {
      const raw = localStorage.getItem(LOGIN_HISTORY_KEY);
      const list = JSON.parse(raw ?? "[]");
      if (!Array.isArray(list)) return [];
      return list
        .filter((item) => item && typeof item === "object")
        .sort(
          (a, b) =>
            new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime(),
        );
    } catch {
      return [];
    }
  };

  useEffect(() => {
    setLoginHistory(readLoginHistory());
  }, []);

  const lastLoginAt = localStorage.getItem(LAST_LOGIN_AT_KEY);

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file hình ảnh hợp lệ");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh đại diện không được vượt quá 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const avatar = String(reader.result ?? "");
      setProfile((prev) => ({ ...prev, avatarUrl: avatar }));
      localStorage.setItem(AVATAR_KEY, avatar);
      setAvatarFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profile.fullName.trim()) {
      toast.error("Vui lòng nhập họ và tên");
      return;
    }

    setSavingProfile(true);

    try {
      let userId = pickFirst(
        profile.id,
        currentUser.staffId,
        currentUser.id,
        currentUser.userId,
        currentUser.accountId,
      );

      if (!userId && profile.email) {
        const allRes = await staffService.getAllStaff();
        const items =
          allRes?.data?.data?.items ??
          allRes?.data?.items ??
          allRes?.items ??
          [];
        const matched = items.find(
          (item) =>
            String(item?.email ?? "")
              .trim()
              .toLowerCase() === String(profile.email).trim().toLowerCase(),
        );
        userId = pickFirst(matched?.staffId, matched?.id, matched?.userId, "");
      }

      if (!userId) {
        throw new Error("Không xác định được mã tài khoản để cập nhật hồ sơ");
      }

      const payload = new FormData();
      payload.append("Id", String(userId));
      payload.append("Email", profile.email || currentUser.email || "");
      payload.append("FullName", profile.fullName.trim());
      payload.append("PhoneContact", profile.phoneContact.trim());
      if (avatarFile) {
        payload.append("FaceImage", avatarFile);
      }

      const updateRes = await staffService.updateStaff(userId, payload);
      const updated = normalizeProfile(
        updateRes?.data?.data ?? updateRes?.data ?? {},
      );
      const serverAvatar = pickFirst(
        updated.avatarUrl,
        updateRes?.data?.data?.faceImageUrl,
        updateRes?.data?.faceImageUrl,
        "",
      );
      const persistedAvatar = serverAvatar || profile.avatarUrl;
      if (persistedAvatar) {
        setProfile((prev) => ({ ...prev, avatarUrl: persistedAvatar }));
        localStorage.setItem(AVATAR_KEY, persistedAvatar);
        localStorage.setItem(AVATAR_UPDATED_AT_KEY, String(Date.now()));
      }

      const nextUser = {
        ...currentUser,
        fullName: profile.fullName.trim(),
        name: profile.fullName.trim(),
        phoneContact: profile.phoneContact.trim(),
        avatarUrl: persistedAvatar,
        faceImageUrl: persistedAvatar,
      };
      localStorage.setItem("user_info", JSON.stringify(nextUser));
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      setAvatarFile(null);
      toast.success("Đã lưu thông tin cá nhân");
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404 || status === 405) {
        toast.error("API cập nhật hồ sơ chưa sẵn sàng trên backend");
      } else {
        toast.error("Không thể lưu thông tin cá nhân");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Vui lòng nhập đầy đủ thông tin mật khẩu");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới cần tối thiểu 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Xác nhận mật khẩu không khớp");
      return;
    }

    setChangingPassword(true);

    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Đổi mật khẩu thành công");
    } catch (error) {
      const status = error?.response?.status;
      const validationErrors = error?.response?.data?.errors;
      const firstValidationMessage =
        validationErrors && typeof validationErrors === "object"
          ? Object.values(validationErrors)
              .flat()
              .map((v) => String(v))
              .find(Boolean)
          : "";
      if (status === 400) {
        toast.error(
          firstValidationMessage ||
            error?.response?.data?.message ||
            "Mật khẩu hiện tại không đúng hoặc mật khẩu mới không hợp lệ",
        );
      } else if (status === 404 || status === 405) {
        toast.error("Không tìm thấy API đổi mật khẩu trên backend");
      } else {
        toast.error(error?.response?.data?.message || "Không thể đổi mật khẩu");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem(LOGIN_HISTORY_KEY);
    setLoginHistory([]);
    toast.success("Đã xóa lịch sử đăng nhập");
  };

  const handleClearRememberedLogin = () => {
    localStorage.removeItem(REMEMBER_LOGIN_KEY);
    toast.success("Đã xóa thông tin đăng nhập được ghi nhớ");
  };

  //   const themeOptions = [
  //     { value: "light", label: "Sáng", Icon: Sun },
  //     { value: "dark", label: "Tối", Icon: Moon },
  //   ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <UserCircle2 className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Thông tin cá nhân
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 h-full">
              <div className="w-28 h-28 rounded-full overflow-hidden border border-gray-200 mx-auto bg-white flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle2 className="w-16 h-16 text-gray-300" />
                )}
              </div>

              <label className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                <Upload className="w-4 h-4" />
                Tải ảnh đại diện
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </label>
              <p className="mt-2 text-xs text-gray-500 text-center">
                JPG/PNG, tối đa 2MB.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ và tên</Label>
              <Input
                id="fullName"
                value={profile.fullName}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, fullName: e.target.value }))
                }
                placeholder="Nhập họ và tên"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneContact">Số điện thoại</Label>
              <Input
                id="phoneContact"
                value={profile.phoneContact}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    phoneContact: e.target.value,
                  }))
                }
                placeholder="Nhập số điện thoại"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (không thể chỉnh sửa)</Label>
              <Input id="email" value={profile.email} disabled />
            </div>

            <div className="pt-1">
              <Button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? "Đang lưu..." : "Lưu thông tin"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Shield className="w-5 h-5 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-900">Bảo mật</h2>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Đổi mật khẩu</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>

            <Button
              type="button"
              onClick={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </Button>
          </div>

          <div className="rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">
                Lịch sử đăng nhập / Thiết bị
              </h3>
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">Lần đăng nhập gần nhất:</span>{" "}
                {formatDateTime(lastLoginAt)}
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {loginHistory.length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-500">
                  Chưa có lịch sử đăng nhập.
                </p>
              ) : (
                loginHistory.map((item) => (
                  <div
                    key={item.id ?? `${item.at}-${item.emailOrPhone}`}
                    className="px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-gray-800">
                      {item.fullName || "Admin"}
                    </p>
                    <p className="text-gray-500">{formatDateTime(item.at)}</p>
                    <p className="text-gray-500">
                      {describeBrowser(item.userAgent)} -{" "}
                      {item.platform || "N/A"}
                    </p>
                    <p className="text-gray-500">{item.emailOrPhone || "-"}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearHistory}
              >
                Xóa lịch sử đăng nhập
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearRememberedLogin}
              >
                Gỡ ghi nhớ đăng nhập
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Palette className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Giao diện</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ">
          {themeOptions.map(({ value, label, Icon }) => {
            const active = themeMode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setThemeMode(value)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div> */}
    </div>
  );
}
