import { useState, useEffect } from "react";
import { Search, Users, UserCheck, UserX, Plus } from "lucide-react";
import staffService from "@/services/staffService";
import {
  Image,
  Pagination,
  Tag,
  Modal,
  Form,
  Input,
  Upload,
  Button,
  Popconfirm,
} from "antd";
import {
  DeleteFilled,
  DeleteTwoTone,
  EditTwoTone,
  EyeTwoTone,
  UploadOutlined,
} from "@ant-design/icons";
import toast from "react-hot-toast";

function AccountStaff() {
  const [searchTerm, setSearchTerm] = useState("");
  const [accounts, setAccounts] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(null);

  const [form] = Form.useForm();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  //get all staff
  const fetchAccounts = async () => {
    try {
      const response = await staffService.getAllStaff();

      const users =
        response?.data?.data?.items ||
        response?.data?.items ||
        response?.items ||
        [];

      setAccounts(users);
    } catch (error) {
      console.error("Error fetching staff:", error);
      setAccounts([]);
    }
  };

  // search name, email
  const filteredAccounts = accounts.filter((account) => {
    const name = account.fullName?.toLowerCase() || "";
    const email = account.email?.toLowerCase() || "";

    return (
      name.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase())
    );
  });

  // pagination
  const startIndex = (currentPage - 1) * pageSize;

  const paginatedAccounts = filteredAccounts.slice(
    startIndex,
    startIndex + pageSize,
  );

  const activeCount = accounts.filter((a) => a.isActive).length;
  const inactiveCount = accounts.length - activeCount;

  // upload image
  const handleBeforeUpload = (file) => {
    setFile(file);

    const reader = new FileReader();

    reader.onload = (e) => {
      setPreview(e.target.result);
    };

    reader.readAsDataURL(file);

    return false;
  };

  // close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setIsViewMode(false);
    setIsEditMode(false);
    setSelectedStaffId(null);
    setFile(null);
    setPreview(null);
    form.resetFields();
  };

  // view staff
  const handleViewStaff = async (id) => {
    try {
      const res = await staffService.getStaffById(id);
      const staff = res?.data?.data;

      setSelectedStaffId(id);
      setIsViewMode(true);
      setIsEditMode(false);
      setIsModalOpen(true);

      form.setFieldsValue({
        fullName: staff.fullName,
        email: staff.email,
        phoneContact: staff.phoneContact,
      });

      setPreview(staff.faceImageUrl);
    } catch {
      toast.error("Không lấy được thông tin staff");
    }
  };

  // create staff
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const formData = new FormData();

      formData.append("Email", values.email);
      formData.append("Password", values.password);
      formData.append("FullName", values.fullName);
      formData.append("PhoneContact", values.phoneContact || "");

      if (file) {
        formData.append("FaceImage", file);
      }

      await staffService.createAccountStaff(formData);

      await fetchAccounts();

      toast.success("Thêm nhân viên thành công");

      closeModal();
    } catch (error) {
      console.error(error);
      toast.error("Thêm nhân viên thất bại");
    }
  };

  // get staff by id
  const handleGetStaffById = async (id) => {
    try {
      const res = await staffService.getStaffById(id);

      const staff = res?.data?.data;

      setSelectedStaffId(id);
      setIsViewMode(true);
      setIsModalOpen(true);

      form.setFieldsValue({
        fullName: staff.fullName,
        email: staff.email,
        phoneContact: staff.phoneContact,
      });

      setPreview(staff.faceImageUrl);
    } catch (error) {
      toast.error("Không lấy được thông tin staff");
    }
  };

  // update staff
  const handleUpdateStaff = async () => {
    try {
      const values = await form.validateFields();

      const formData = new FormData();

      formData.append("Id", selectedStaffId);
      formData.append("Email", values.email);
      formData.append("FullName", values.fullName);
      formData.append("PhoneContact", values.phoneContact || "");

      if (file) {
        formData.append("FaceImage", file);
      }

      await staffService.updateStaff(selectedStaffId, formData);

      toast.success("Cập nhật nhân viên thành công");

      await fetchAccounts();

      closeModal();
    } catch (error) {
      console.error(error);
      toast.error("Cập nhật thất bại");
    }
  };

  // edit staff
  const handleEditStaff = async (id) => {
    try {
      const res = await staffService.getStaffById(id);
      const staff = res?.data?.data;

      setSelectedStaffId(id);
      setIsEditMode(true);
      setIsViewMode(false);
      setIsModalOpen(true);

      form.setFieldsValue({
        fullName: staff.fullName,
        email: staff.email,
        phoneContact: staff.phoneContact,
      });

      setPreview(staff.faceImageUrl);
    } catch (error) {
      toast.error("Không lấy được thông tin staff");
    }
  };

  // delete staff
  const confirm = async (id) => {
    try {
      await staffService.deleteStaff(id);

      toast.success("Xóa tài khoản thành công");

      await fetchAccounts();
    } catch (error) {
      toast.error("Xóa thất bại");
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Quản lý tài khoản nhân viên
        </h1>

        <button
          className="btn btn-primary flex items-center gap-3 rounded-2xl"
          onClick={() => {
            setIsViewMode(false);
            setIsEditMode(false);
            setIsModalOpen(true);
            form.resetFields();
          }}
        >
          <Plus className="w-4 h-4" />
          Thêm nhân viên
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-8 shadow border">
          <div className="flex items-center gap-5">
            <Users className="w-8 h-8 text-blue-600" />

            <div>
              <p className="text-3xl font-bold">{accounts.length}</p>
              <p className="text-gray-500">Tổng nhân viên</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow border">
          <div className="flex items-center gap-5">
            <UserCheck className="w-8 h-8 text-green-600" />

            <div>
              <p className="text-3xl font-bold text-green-600">{activeCount}</p>
              <p className="text-gray-500">Đang hoạt động</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow border">
          <div className="flex items-center gap-5">
            <UserX className="w-8 h-8 text-gray-600" />

            <div>
              <p className="text-3xl font-bold text-gray-600">
                {inactiveCount}
              </p>
              <p className="text-gray-500">Ngưng hoạt động</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 py-3 bg-gray-50 border rounded-xl focus:outline-none"
          />
        </div>

        <div className="bg-white shadow rounded-lg overflow-x-auto mt-4">
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-3">STT</th>
                <th className="p-3">Hình khuôn mặt</th>
                <th className="p-3">Họ tên</th>
                <th className="p-3">Email</th>
                <th className="p-3">Số điện thoại</th>
                <th className="p-3">Role</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3"></th>
              </tr>
            </thead>

            <tbody>
              {paginatedAccounts.map((account, index) => (
                <tr key={account.staffId} className="border-b hover:bg-gray-50">
                  <td className="p-3">{startIndex + index + 1}</td>

                  <td className="p-3">
                    <Image
                      src={account.faceImageUrl || "/avatar_comingsoon.png"}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </td>

                  <td className="p-3 font-semibold">{account.fullName}</td>

                  <td className="p-3 text-gray-600">{account.email}</td>

                  <td className="p-3">{account.phoneContact || "-"}</td>

                  <td className="p-3">
                    {account.role == "Admin" ? (
                      <Tag color="blue">Admin</Tag>
                    ) : (
                      <Tag color="green">Staff</Tag>
                    )}
                  </td>

                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold
                                        ${
                                          account.isActive
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-600"
                                        }`}
                    >
                      {account.isActive ? "Hoạt động" : "Ngưng hoạt động"}
                    </span>
                  </td>

                  <td className="p-3">
                    <Button
                      style={{ marginRight: "8px" }}
                      onClick={() => handleViewStaff(account.staffId)}
                    >
                      <EyeTwoTone />
                    </Button>

                    <Button
                      style={{ marginRight: "8px" }}
                      onClick={() => handleEditStaff(account.staffId)}
                    >
                      <EditTwoTone />
                    </Button>
                    {account.role === "Admin" ? (
                      <Button disabled title="Không thể xóa Admin">
                        <DeleteTwoTone twoToneColor="#d9d9d9" />
                      </Button>
                    ) : (
                      <Popconfirm
                        title="Xóa tài khoản"
                        description={`Bạn có chắc chắn muốn xóa tài khoản "${account.fullName}"`}
                        onConfirm={() => confirm(account.staffId)}
                        okText="Xóa"
                        cancelText="Hủy"
                        icon={<DeleteFilled style={{ color: "red" }} />}
                      >
                        <Button>
                          <DeleteTwoTone />
                        </Button>
                      </Popconfirm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={filteredAccounts.length}
          onChange={(page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }}
        />
      </div>

      <Modal
        title={
          isViewMode
            ? "Xem chi tiết nhân viên"
            : isEditMode
              ? "Cập nhật nhân viên"
              : "Thêm nhân viên"
        }
        open={isModalOpen}
        onCancel={closeModal}
        onOk={
          isViewMode
            ? closeModal
            : isEditMode
              ? handleUpdateStaff
              : handleSubmit
        }
        okText={isEditMode ? "Cập nhật" : "Thêm nhân viên"}
        cancelText="Hủy"
        okButtonProps={{
          style: { display: isViewMode ? "none" : "inline-block" },
        }}
        cancelButtonProps={{
          style: { display: isViewMode ? "none" : "inline-block" },
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Họ tên"
            name="fullName"
            rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
          >
            <Input disabled={isViewMode} />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Vui lòng nhập email" }]}
          >
            <Input disabled={isViewMode} />
          </Form.Item>

          <Form.Item label="Số điện thoại" name="phoneContact">
            <Input disabled={isViewMode} />
          </Form.Item>

          {!isEditMode && !isViewMode && (
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Vui lòng nhập password" }]}
            >
              <Input.Password disabled={isViewMode} />
            </Form.Item>
          )}

          <Form.Item label="Ảnh khuôn mặt" name="faceImageUrl">
            <Upload
              beforeUpload={handleBeforeUpload}
              maxCount={1}
              showUploadList={false}
            >
              <button
                type="button"
                className="btn border"
                disabled={isViewMode}
              >
                <UploadOutlined /> Tải lên ảnh khuôn mặt
              </button>
            </Upload>

            {preview && (
              <div className="mt-4">
                <Image
                  src={preview}
                  alt="preview"
                  className="w-32 border shadow"
                />
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AccountStaff;
