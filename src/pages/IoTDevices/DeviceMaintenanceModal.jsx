import { useState } from "react";
import { Modal, Form, Input, DatePicker, ConfigProvider } from "antd";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import DeviceMaintenanceService from "../../services/DeviceMaintenanceService";
import viVN from "antd/es/locale/vi_VN";
import "dayjs/locale/vi";

dayjs.locale("vi");

const { TextArea } = Input;

function DeviceMaintenanceModal({ device, open, onClose, onSuccess }) {

    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        try {
      
          const values = await form.validateFields();
      
          const payload = {
            deviceId: device.id ?? device.deviceId,
            maintenanceType: values.maintenanceType,
            description: values.description,
      
            // thời gian hiện tại
            performedAt: new Date().toISOString(),
      
            nextMaintenanceDate: values.nextMaintenanceDate
              ? values.nextMaintenanceDate.toISOString()
              : null
          };
      
          await DeviceMaintenanceService.create(payload);
      
          toast.success("Đã tạo bảo trì", {duration: 1000});
      
          form.resetFields();
          onSuccess();
          onClose();
      
        } catch (err) {
      
          console.error(err);
      
          toast.error(
            err?.response?.data?.message ||
            "Không thể lưu bảo trì"
          );
      
        }
      };

    return (
        <ConfigProvider locale={viVN}>
            <Modal
                title={`Bảo trì: ${device?.deviceName || device?.name}`}
                open={open}
                onCancel={onClose}
                onOk={handleSubmit}
                confirmLoading={loading}
                okText="Lưu"
                cancelText="Hủy"
                width={520}
            >

                <Form
                    form={form}
                    layout="vertical"
                >

                    <Form.Item
                        label="Loại bảo trì"
                        name="maintenanceType"
                        rules={[{ required: true, message: "Vui lòng nhập loại bảo trì" }]}
                    >
                        <Input placeholder="Ví dụ: Vệ sinh camera" />
                    </Form.Item>

                    <Form.Item
                        label="Mô tả"
                        name="description"
                    >
                        <TextArea rows={3} placeholder="Mô tả chi tiết..." />
                    </Form.Item>

                    {/* <Form.Item label="Ngày thực hiện">
                        <Input
                            value={dayjs().format("DD/MM/YYYY HH:mm")}
                            disabled
                        />
                    </Form.Item>

                    <Form.Item
                        label="Ngày bảo trì tiếp theo"
                        name="nextMaintenanceDate"
                    >
                        <DatePicker
                            // showTime
                            className="w-full"
                            format="DD/MM/YYYY HH:mm"
                            placeholder="Ngày bảo trì tiếp theo"
                            disabledDate={(current) => current && current < dayjs().endOf('day').subtract(1, 'day')}

                        />
                    </Form.Item> */}

                </Form>

            </Modal>
        </ConfigProvider>
    );
}

export default DeviceMaintenanceModal;