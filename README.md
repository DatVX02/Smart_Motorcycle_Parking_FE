# MotoGuard Admin Dashboard

Hệ thống quản lý bãi giữ xe máy thông minh tích hợp nhận dạng biển số và khuôn mặt

## Tính năng

### Chức năng Admin

- ✅ Dashboard với thống kê tổng quan
- ✅ Quản lý tài khoản: admin, staff, user
- ✅ Quản lý bãi đỗ xe
- ✅ Quản lý giao dịch điện tử và hóa đơn
- ✅ Quản lý và lên lịch ca trực cho nhân viên
- ✅ Quản lý nhật ký hệ thống
- ✅ Quản lý điểm thưởng
- ✅ Thiết lập bảng giá phí đỗ xe
- ✅ Quản lý thiết bị IoT

## Công nghệ sử dụng

- **Frontend**: ReactJS 18 + Vite
- **Styling**: TailwindCSS 3
- **Routing**: React Router DOM 6
- **Icons**: Lucide React
- **Charts**: Recharts
- **Date Handling**: date-fns

## Cài đặt

### Yêu cầu

- Node.js >= 18.0.0
- npm hoặc yarn

### Các bước cài đặt

1. Cài đặt dependencies:

```bash
npm install
```

2. Chạy development server:

```bash
npm run dev
```

3. Build cho production:

```bash
npm run build
```

4. Preview production build:

```bash
npm run preview
```

## Cấu trúc dự án

```
src/
├── components/          # Các component tái sử dụng
│   ├── common/         # Components chung (Button, Card, Table...)
│   ├── layout/         # Layout components (Sidebar, Header...)
│   └── dashboard/      # Dashboard-specific components
├── pages/              # Các trang chính
│   ├── Dashboard/
│   ├── Accounts/
│   ├── ParkingLots/
│   ├── Transactions/
│   ├── Shifts/
│   ├── SystemLogs/
│   ├── RewardPoints/
│   ├── PriceList/
│   └── IoTDevices/
├── utils/              # Utility functions
├── data/               # Mock data & constants
├── App.jsx             # Main App component
└── main.jsx            # Entry point
```

## Tài khoản mặc định

- **Admin**: admin@motoguard.com / admin123
- **Staff**: staff@motoguard.com / staff123

## License

© 2026 FPT University - Team MotoGuard
