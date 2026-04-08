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
    lotName: "Bãi xe Tòa nhà Bitexco",
    fullAddress: "2 Hải Triều, Bến Nghé, Quận 1, TP.HCM",
    totalCapacity: "850",
    hourlyRate: "20000",
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
  {
    lotName: "Bãi xe Trung Tâm Thương Mại VinCom",
    fullAddress: "72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM",
    totalCapacity: "1200",
    hourlyRate: "25000",
    monthlyRate: "600000",
    openingTime: "06:00",
    closingTime: "23:00",
    is24h: false,
    gates: [
      newGate({
        gateName: "Cổng Vào Tầng Hầm",
        gateType: "entry",
        devices: [
          newDevice({
            deviceCode: "CAM-VIN-01",
            deviceName: "Camera LPR Cổng Vào",
            deviceType: "LPR_CAMERA",
            model: "Dahua ITC215",
            ipAddress: "192.168.1.100",
            macAddress: "00:1B:44:11:3A:C7",
            firmwareVersion: "V3.2.1",
          }),
          newDevice({
            deviceCode: "BAR-VIN-01",
            deviceName: "Barie Cổng Vào",
            deviceType: "BARRIER",
            model: "ZKTeco PB4030",
            ipAddress: "192.168.1.101",
            macAddress: "00:1B:44:11:3A:C8",
            firmwareVersion: "V1.0.2",
          }),
        ],
      }),
      newGate({
        gateName: "Cổng Ra Tầng Hầm",
        gateType: "exit",
        devices: [
          newDevice({
            deviceCode: "CAM-VIN-02",
            deviceName: "Camera LPR Cổng Ra",
            deviceType: "LPR_CAMERA",
            model: "Hikvision DS-2CD4A26",
            ipAddress: "192.168.1.102",
            macAddress: "00:1B:44:11:3A:C9",
            firmwareVersion: "V5.5.82",
          }),
        ],
      }),
    ],
  },
  {
    lotName: "Bãi xe Sân bay Tân Sơn Nhất",
    fullAddress: "Trường Sơn, Phường 2, Tân Bình, TP.HCM",
    totalCapacity: "2000",
    hourlyRate: "15000",
    monthlyRate: "400000",
    openingTime: "00:00",
    closingTime: "23:59",
    is24h: true,
    gates: [
      newGate({
        gateName: "Cổng Vào Khu A",
        gateType: "entry",
        devices: [
          newDevice({
            deviceCode: "CAM-SBN-A1",
            deviceName: "Camera LPR Khu A",
            deviceType: "LPR_CAMERA",
            model: "Hikvision DS-2CD2T47G2-L",
            ipAddress: "192.168.10.50",
            macAddress: "A1:B2:C3:D4:E5:F6",
            firmwareVersion: "V5.7.12",
          }),
          newDevice({
            deviceCode: "BAR-SBN-A1",
            deviceName: "Barie Khu A",
            deviceType: "BARRIER",
            model: "ZKTeco PB4030",
            ipAddress: "192.168.10.51",
            macAddress: "A1:B2:C3:D4:E5:F7",
            firmwareVersion: "V1.0.2",
          }),
        ],
      }),
      newGate({
        gateName: "Cổng Ra Khu A",
        gateType: "exit",
        devices: [
          newDevice({
            deviceCode: "CAM-SBN-A2",
            deviceName: "Camera LPR Cổng Ra",
            deviceType: "LPR_CAMERA",
            model: "Dahua ITC215",
            ipAddress: "192.168.10.60",
            macAddress: "00:1B:44:11:3A:C7",
            firmwareVersion: "V3.2.1",
          }),
        ],
      }),
    ],
  },
  {
    lotName: "Bãi xe Chung cư Sunrise",
    fullAddress: "123 Nguyễn Huệ, Bến Nghé, Quận 1, TP.HCM",
    totalCapacity: "350",
    hourlyRate: "10000",
    monthlyRate: "350000",
    openingTime: "07:00",
    closingTime: "22:00",
    is24h: false,
    gates: [
      newGate({
        gateName: "Cổng Vào Tầng Hầm B1",
        gateType: "two_way",
        devices: [
          newDevice({
            deviceCode: "CAM-SUN-01",
            deviceName: "Camera 2 chiều",
            deviceType: "LPR_CAMERA",
            model: "Hikvision DS-2CD4A26",
            ipAddress: "192.168.0.50",
            macAddress: "AA:BB:CC:DD:EE:FF",
            firmwareVersion: "V5.5.82",
          }),
          newDevice({
            deviceCode: "BAR-SUN-01",
            deviceName: "Barie Tự Động",
            deviceType: "BARRIER",
            model: "ZKTeco PB4030",
            ipAddress: "192.168.0.51",
            macAddress: "",
            firmwareVersion: "",
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
