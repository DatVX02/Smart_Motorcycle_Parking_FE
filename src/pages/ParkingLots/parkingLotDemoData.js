/**
 * Dữ liệu mẫu cho form Thêm bãi gửi - dùng khi bấm Auto fill
 */

const newId = () => crypto.randomUUID();

const newDevice = (overrides = {}) => ({
  _id: newId(),
  deviceCode: "",
  deviceName: "",
  deviceType: "",
  model: "",
  ipAddress: "",
  macAddress: "",
  firmwareVersion: "",
  ...overrides,
});

const newGate = (overrides = {}) => ({
  _id: newId(),
  gateName: "",
  gateType: "",
  isActive: true,
  devices: [],
  ...overrides,
});

const DEMO_SAMPLES = [
  {
    lotName: "Bãi xe Đại Học FPT",
    fullAddress: "7, Đường D1, Tăng Nhơn Phú, Hồ Chí Minh",
    totalCapacity: "850",
    hourlyRate: "4000",
    monthlyRate: "500000",
    openingTime: "08:00",
    closingTime: "22:00",
    is24h: false,
    gates: [
      newGate({
        gateName: "Cổng Vào Tầng Hầm B1",
        gateType: "entry",
        devices: [
          newDevice({
            deviceCode: "CAM-IN-B1",
            deviceName: "Camera LPR Cổng Vào",
            deviceType: "LPR_CAMERA",
            model: "Hikvision DS-2CD4A26",
            ipAddress: "192.168.10.50",
            macAddress: "A1:B2:C3:D4:E5:F6",
            firmwareVersion: "V5.5.82",
          }),
        ],
      }),
    ],
  },
];

function deepCloneWithNewIds(obj) {
  if (Array.isArray(obj)) {
    return obj.map((item) => deepCloneWithNewIds(item));
  }
  if (obj && typeof obj === "object") {
    const copy = { ...obj };
    if (copy._id) copy._id = newId();
    if (copy.gates) copy.gates = deepCloneWithNewIds(copy.gates);
    if (copy.devices) copy.devices = deepCloneWithNewIds(copy.devices);
    return copy;
  }
  return obj;
}

/**
 * Lấy ngẫu nhiên một mẫu dữ liệu demo (mỗi lần có _id mới)
 * @returns {Object} Mẫu đầy đủ với gates, devices
 */
export function getRandomDemoSample() {
  const sample = DEMO_SAMPLES[Math.floor(Math.random() * DEMO_SAMPLES.length)];
  return deepCloneWithNewIds(sample);
}

/**
 * Lấy mẫu mặc định cố định cho nút Auto fill.
 * Hiện dùng mẫu đầu tiên để đảm bảo ổn định dữ liệu.
 */
export function getDefaultDemoSample() {
  return deepCloneWithNewIds(DEMO_SAMPLES[0]);
}
