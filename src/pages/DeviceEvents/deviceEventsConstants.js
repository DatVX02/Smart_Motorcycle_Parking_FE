/** Số bản ghi mỗi trang (API + UI phân trang). */
export const PAGE_SIZE = 10;

/**
 * Khớp backend: EventType (PascalCase).
 * [giá trị API, nhãn tiếng Việt]
 */
export const DEVICE_EVENT_TYPE_OPTIONS = [
  ["Detect", "Phát hiện"],
  ["OpenGate", "Mở cổng"],
  ["CloseGate", "Đóng cổng"],
  ["FaceIn", "Khuôn mặt vào"],
  ["FaceOut", "Khuôn mặt ra"],
  ["PlateIn", "Biển số vào"],
  ["PlateOut", "Biển số ra"],
  ["SensorIn", "Cảm biến vào"],
  ["SensorOut", "Cảm biến ra"],
  ["BarrierIn", "Barrier vào"],
  ["BarrierOut", "Barrier ra"],
  ["LcdIn", "LCD vào"],
  ["LcdOut", "LCD ra"],
  ["Error", "Lỗi"],
  ["Warning", "Cảnh báo"],
  ["Info", "Thông tin"],
  ["Maintenance", "Bảo trì"],
  ["Offline", "Mất kết nối"],
  ["Online", "Trực tuyến"],
  ["DeviceReset", "Reset thiết bị"],
  ["DeviceUpdate", "Cập nhật thiết bị"],
];

/**
 * Khớp backend: EventStatus (PascalCase).
 */
export const DEVICE_EVENT_STATUS_OPTIONS = [
  ["Completed", "Hoàn thành"],
  ["Active", "Đang hoạt động"],
  ["Resolved", "Đã xử lý"],
  ["Ignored", "Đã bỏ qua"],
  ["Success", "Thành công"],
  ["Failed", "Thất bại"],
  ["Processing", "Đang xử lý"],
  ["Pending", "Đang chờ"],
  ["Acknowledged", "Đã xác nhận"],
  ["Triggered", "Đã kích hoạt"],
];

/** Map key chữ thường (theo labelFromMap). */
export const EVENT_TYPE_LABELS = Object.fromEntries(
  DEVICE_EVENT_TYPE_OPTIONS.map(([v, label]) => [v.toLowerCase(), label]),
);

/** Giá trị cũ / tương thích */
Object.assign(EVENT_TYPE_LABELS, {
  detect: "Phát hiện",
  success: "Thông tin",
  information: "Thông tin",
  facein: "Khuôn mặt vào",
  faceout: "Khuôn mặt ra",
  platein: "Biển số vào",
  plateout: "Biển số ra",
  sensorin: "Cảm biến vào",
  sensorout: "Cảm biến ra",
  barrierin: "Barrier vào",
  barrierout: "Barrier ra",
  lcdin: "LCD vào",
  lcdout: "LCD ra",
});

export const EVENT_STATUS_LABELS = Object.fromEntries(
  DEVICE_EVENT_STATUS_OPTIONS.map(([v, label]) => [v.toLowerCase(), label]),
);

/** Tương thích dữ liệu cũ */
Object.assign(EVENT_STATUS_LABELS, {
  completed: "Hoàn thành",
  inactive: "Không hoạt động",
  cancelled: "Đã hủy",
  triggered: "Đã kích hoạt",
});

/** Khớp backend: EventSource (PascalCase). */
export const EVENT_SOURCE_LABELS = {
  camera: "Camera",
  gate: "Cổng",
  sensor: "Cảm biến",
  system: "Hệ thống",
  controller: "Bộ điều khiển",
  user: "Người dùng",
  iot: "Thiết bị IoT",
  ai: "AI",
  admin: "Quản trị",
};

/** Màu badge trạng thái xử lý (EventStatus). */
export const EVENT_STATUS_BADGE_CLASSES = {
  active: "text-green-800 bg-green-50 border-green-200",
  triggered: "text-gray-700 bg-slate-50 border-slate-200",
  resolved: "text-slate-700 bg-slate-50 border-slate-200",
  ignored: "text-gray-600 bg-gray-50 border-gray-200",
  success: "text-green-800 bg-green-50 border-green-200",
  failed: "text-red-800 bg-red-50 border-red-200",
  processing: "text-blue-800 bg-blue-50 border-blue-200",
  pending: "text-amber-900 bg-amber-50 border-amber-200",
  acknowledged: "text-violet-800 bg-violet-50 border-violet-200",
  completed: "text-green-800 bg-green-50 border-green-200",
};

export const LEVEL_BORDER = {
  error: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

export const LEVEL_COLORS = {
  error: "bg-red-50 text-red-800 border-red-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  info: "bg-blue-50 text-blue-800 border-blue-200",
};
