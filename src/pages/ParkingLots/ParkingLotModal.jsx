import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

function ParkingLotModal({ lot, onClose, onSave }) {
  const [formData, setFormData] = useState({
    lotName: lot?.name || "",
    fullAddress: lot?.location || "",
    totalCapacity: lot?.totalSpots || 50,
    openingTime: "06:00",
    closingTime: "22:00",
    is24h: false,
    // Gate info
    gateName: "Cổng chính",
    gateType: "Both",
    // Camera info (only Camera type allowed)
    deviceCode: "CAM001",
    deviceName: "Camera cổng chính",
    deviceType: "Camera", // Fixed as Camera
    model: "HIKVISION DS-2CD2345",
    ipAddress: "192.168.1.100",
    // AI Config
    licensePlateThreshold: 85,
    faceRecognitionThreshold: 90,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Validate lot name
    if (!formData.lotName || formData.lotName.trim().length < 3) {
      newErrors.lotName = "Tên bãi đỗ phải có ít nhất 3 ký tự";
    }

    // Validate address
    if (!formData.fullAddress || formData.fullAddress.trim().length < 10) {
      newErrors.fullAddress = "Địa chỉ phải có ít nhất 10 ký tự";
    }

    // Validate capacity
    if (!formData.totalCapacity || formData.totalCapacity < 1) {
      newErrors.totalCapacity = "Số chỗ đỗ phải lớn hơn 0";
    }

    // Validate time if not 24h
    if (!formData.is24h) {
      const opening = formData.openingTime;
      const closing = formData.closingTime;
      
      if (!opening || !closing) {
        newErrors.time = "Vui lòng chọn giờ mở cửa và đóng cửa";
      } else if (opening >= closing) {
        newErrors.time = "Giờ mở cửa phải trước giờ đóng cửa";
      }
    }

    // Validate IP Address
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(formData.ipAddress)) {
      newErrors.ipAddress = "IP Address không hợp lệ (VD: 192.168.1.100)";
    }

    // Validate AI thresholds
    if (formData.licensePlateThreshold < 0 || formData.licensePlateThreshold > 100) {
      newErrors.licensePlateThreshold = "Ngưỡng phải từ 0-100";
    }
    if (formData.faceRecognitionThreshold < 0 || formData.faceRecognitionThreshold > 100) {
      newErrors.faceRecognitionThreshold = "Ngưỡng phải từ 0-100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    setSubmitting(true);
    try {
      // Convert time from HH:mm to HH:mm:ss format
      const formatTime = (time) => {
        if (!time) return "00:00:00";
        return time.length === 5 ? `${time}:00` : time;
      };

      // Transform to backend format
      const backendData = {
        lotInfo: {
          lotName: formData.lotName.trim(),
          fullAddress: formData.fullAddress.trim(),
          totalCapacity: parseInt(formData.totalCapacity),
          openingTime: formData.is24h ? "00:00:00" : formatTime(formData.openingTime),
          closingTime: formData.is24h ? "23:59:00" : formatTime(formData.closingTime),
          is24h: formData.is24h,
        },
        cameraSetup: {
          gates: [
            {
              gateName: formData.gateName,
              gateType: formData.gateType,
              isActive: true,
            },
          ],
          devices: [
            {
              deviceCode: formData.deviceCode,
              deviceName: formData.deviceName,
              deviceType: "Camera",
              gateName: formData.gateName,
              model: formData.model,
              ipAddress: formData.ipAddress,
              macAddress: "00:00:00:00:00:00",
              connectionStatus: "Online",
              firmwareVersion: "1.0.0",
            },
          ],
          aiConfig: {
            licensePlateConfidenceThreshold: parseInt(formData.licensePlateThreshold) || 85,
            faceRecognitionConfidenceThreshold: parseInt(formData.faceRecognitionThreshold) || 90,
          },
        },
      };

      console.log("Sending data to backend:", backendData);
      await onSave(backendData);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {lot ? "Chỉnh sửa bãi đỗ" : "Thêm bãi đỗ mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Lot Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Thông tin bãi đỗ xe
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên bãi đỗ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lotName}
                  onChange={(e) => {
                    setFormData({ ...formData, lotName: e.target.value });
                    if (errors.lotName) setErrors({ ...errors, lotName: null });
                  }}
                  className={`input ${errors.lotName ? 'border-red-500' : ''}`}
                  placeholder="Bãi Đỗ Xe Trung Tâm"
                  required
                />
                {errors.lotName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lotName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ đầy đủ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullAddress}
                  onChange={(e) => {
                    setFormData({ ...formData, fullAddress: e.target.value });
                    if (errors.fullAddress) setErrors({ ...errors, fullAddress: null });
                  }}
                  className={`input ${errors.fullAddress ? 'border-red-500' : ''}`}
                  placeholder="123 Nguyễn Văn A, Quận 1, TP.HCM"
                  required
                />
                {errors.fullAddress && (
                  <p className="text-red-500 text-xs mt-1">{errors.fullAddress}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tổng số chỗ đỗ <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.totalCapacity}
                  onChange={(e) => {
                    setFormData({ ...formData, totalCapacity: e.target.value });
                    if (errors.totalCapacity) setErrors({ ...errors, totalCapacity: null });
                  }}
                  className={`input ${errors.totalCapacity ? 'border-red-500' : ''}`}
                  min="1"
                  required
                />
                {errors.totalCapacity && (
                  <p className="text-red-500 text-xs mt-1">{errors.totalCapacity}</p>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <input
                  id="is24h"
                  type="checkbox"
                  checked={formData.is24h}
                  onChange={(e) =>
                    setFormData({ ...formData, is24h: e.target.checked })
                  }
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is24h" className="text-sm font-medium text-gray-700">
                  Hoạt động 24/7
                </label>
              </div>

              {!formData.is24h && (
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giờ mở cửa <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.openingTime}
                        onChange={(e) => {
                          setFormData({ ...formData, openingTime: e.target.value });
                          if (errors.time) setErrors({ ...errors, time: null });
                        }}
                        className={`input ${errors.time ? 'border-red-500' : ''}`}
                        required={!formData.is24h}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giờ đóng cửa <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.closingTime}
                        onChange={(e) => {
                          setFormData({ ...formData, closingTime: e.target.value });
                          if (errors.time) setErrors({ ...errors, time: null });
                        }}
                        className={`input ${errors.time ? 'border-red-500' : ''}`}
                        required={!formData.is24h}
                      />
                    </div>
                  </div>
                  {errors.time && (
                    <p className="text-red-500 text-xs mt-1">{errors.time}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Gate & Camera Setup */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Cấu hình cổng & Camera
              </h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Loại thiết bị: Camera
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên cổng
                  </label>
                  <input
                    type="text"
                    value={formData.gateName}
                    onChange={(e) =>
                      setFormData({ ...formData, gateName: e.target.value })
                    }
                    className="input"
                    placeholder="Cổng chính"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại cổng
                  </label>
                  <select
                    value={formData.gateType}
                    onChange={(e) =>
                      setFormData({ ...formData, gateType: e.target.value })
                    }
                    className="input"
                    required
                  >
                    <option value="Entry">Cổng vào</option>
                    <option value="Exit">Cổng ra</option>
                    <option value="Both">Cả hai</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã thiết bị
                  </label>
                  <input
                    type="text"
                    value={formData.deviceCode}
                    onChange={(e) =>
                      setFormData({ ...formData, deviceCode: e.target.value })
                    }
                    className="input"
                    placeholder="CAM001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên thiết bị
                  </label>
                  <input
                    type="text"
                    value={formData.deviceName}
                    onChange={(e) =>
                      setFormData({ ...formData, deviceName: e.target.value })
                    }
                    className="input"
                    placeholder="Camera cổng chính"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    className="input"
                    placeholder="HIKVISION DS-2CD2345"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ipAddress}
                    onChange={(e) => {
                      setFormData({ ...formData, ipAddress: e.target.value });
                      if (errors.ipAddress) setErrors({ ...errors, ipAddress: null });
                    }}
                    className={`input ${errors.ipAddress ? 'border-red-500' : ''}`}
                    placeholder="192.168.1.100"
                    required
                  />
                  {errors.ipAddress && (
                    <p className="text-red-500 text-xs mt-1">{errors.ipAddress}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Configuration */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Cấu hình AI
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngưỡng nhận diện biển số (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.licensePlateThreshold}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      licensePlateThreshold: e.target.value,
                    });
                    if (errors.licensePlateThreshold) 
                      setErrors({ ...errors, licensePlateThreshold: null });
                  }}
                  className={`input ${errors.licensePlateThreshold ? 'border-red-500' : ''}`}
                  min="0"
                  max="100"
                  required
                />
                {errors.licensePlateThreshold && (
                  <p className="text-red-500 text-xs mt-1">{errors.licensePlateThreshold}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Khuyến nghị: 80-95% cho độ chính xác tốt
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngưỡng nhận diện khuôn mặt (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.faceRecognitionThreshold}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      faceRecognitionThreshold: e.target.value,
                    });
                    if (errors.faceRecognitionThreshold) 
                      setErrors({ ...errors, faceRecognitionThreshold: null });
                  }}
                  className={`input ${errors.faceRecognitionThreshold ? 'border-red-500' : ''}`}
                  min="0"
                  max="100"
                  required
                />
                {errors.faceRecognitionThreshold && (
                  <p className="text-red-500 text-xs mt-1">{errors.faceRecognitionThreshold}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Khuyến nghị: 85-98% cho độ chính xác tốt
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{lot ? "Đang cập nhật..." : "Đang thêm..."}</span>
                </span>
              ) : (
                <span>{lot ? "Cập nhật" : "Thêm mới"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ParkingLotModal;
