# MotoGuard Admin Dashboard

Hệ thống quản lý bãi gửi xe máy thông minh (Admin Dashboard), tích hợp theo dõi hoạt động bãi xe, giao dịch, thiết bị IoT và nhật ký nhận dạng.

## Tính năng chính

- **Dashboard**: thống kê tổng quan, biểu đồ doanh thu/lưu lượng, cảnh báo gần đây
- **Tài khoản**: quản lý admin/staff/user
- **Bãi xe**: quản lý bãi, camera/thiết bị liên quan
- **Phiên gửi xe & giao dịch**: danh sách/chi tiết, lọc & xem lịch sử
- **Ca trực**: tạo/phan công/duyệt thay đổi ca
- **Thiết bị IoT & sự kiện thiết bị**: theo dõi trạng thái, lịch bảo trì
- **Nhận dạng & nhật ký**: xem log/chi tiết log nhận dạng
- **Điểm thưởng / cấu hình** và **bảng giá**

## Công nghệ sử dụng

- **React 18 + Vite 5**
- **TailwindCSS** (kèm `tailwind-merge`, `tailwindcss-animate`)
- **UI**: Ant Design + shadcn/ui (Radix primitives)
- **Routing**: `react-router-dom`
- **HTTP**: `axios` (có interceptor auth)
- **Realtime**: SignalR (`@microsoft/signalr`)
- **Charts / Calendar**: Recharts, FullCalendar

## Yêu cầu môi trường

- **Node.js**: khuyến nghị **>= 18**
- **npm** (repo có `package-lock.json`)

## Cấu hình môi trường

Dự án đọc API base URL từ biến môi trường `VITE_API_BASE_URL` (xem `src/config/api.js`).

- **Tạo file `.env` tại root** (hoặc chỉnh file hiện có):

```bash
VITE_API_BASE_URL=https://your-api.example.com
```

- **Mặc định** (nếu không set env): `https://localhost:5156`

## Cài đặt & chạy dự án

Cài dependencies:

```bash
npm install
```

Chạy dev server (Vite, mặc định mở ở **port 3000**):

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Kiểm tra lint:

```bash
npm run lint
```

## Cấu trúc thư mục (thực tế)

```text
src/
  components/
    layout/                 # Header/Sidebar/Layout
    ui/                     # shadcn/ui components
    DeviceMaintenance/      # modal/khối UI bảo trì thiết bị
    ProtectedRoute.jsx
  config/
    api.js                  # axios instance + VITE_API_BASE_URL
  hooks/
  lib/
    utils.js                # shadcn utility helpers
  pages/
    Accounts/
    Dashboard/
    DeviceEvents/
    DeviceMaintenance/
    IncidentReports/
    IoTDevices/
    Login/
    MonthlyPasses/
    ParkingLots/
    ParkingSessions/
    ParkingVehicles/
    PayByPlate/
    PriceList/
    RecognitionLogs/
    RewardPoints/
    Settings/
    Shifts/
    Transactions/
    WithdrawRequest/
  services/                 # gọi API theo domain (auth, transactions, iot, ...)
  utils/                    # helpers tính toán/format
  App.jsx
  main.jsx
```

## Quy ước import

- **Alias**: `@` trỏ tới `src` (cấu hình trong `vite.config.js`)
  - Ví dụ: `import apiClient from "@/config/api"`

## Deploy (SPA)

Repo có `vercel.json` với rewrite về `/` để hỗ trợ React Router trên Vercel. Khi deploy, đảm bảo đã cấu hình biến môi trường `VITE_API_BASE_URL` ở môi trường hosting.

## Troubleshooting

- **Mọi request bị 401 và tự quay về `/login`**: kiểm tra `access_token` trong `localStorage` và API base URL (`VITE_API_BASE_URL`).
- **Chạy dev nhưng không đúng port**: Vite đang cấu hình `server.port = 3000` trong `vite.config.js`.

## License

© 2026 FPT University - Team MotoGuard
