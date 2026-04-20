import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Plus,
  X,
  User,
  Loader2,
  Mail,
  Phone,
} from "lucide-react";
import staffService from "@/services/staffService";
import authService from "@/services/authService";
import {
  Image,
  Pagination,
  Tag,
  Form,
  Input,
  Upload,
  Button,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteFilled,
  DeleteTwoTone,
  EditTwoTone,
  EyeTwoTone,
  StopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import toast from "react-hot-toast";

const AVATAR_KEY = "motoguard_profile_avatar";
const AVATAR_UPDATED_AT_KEY = "motoguard_profile_avatar_updated_at";
const PROFILE_UPDATED_EVENT = "motoguard:user-updated";

function AccountStaff() {
  const [searchTerm, setSearchTerm] = useState("");
  const [accounts, setAccounts] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(null);

  const [form] = Form.useForm();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  /** Dùng khi xem chi tiết: Form không mount nên không dùng Form.useWatch được */
  const [staffViewSnapshot, setStaffViewSnapshot] = useState(null);

  const formatDetailText = (value) => {
    if (value == null) return "/";
    const s = String(value).trim();
    return s.length ? s : "/";
  };

  const staffFieldLabel = (text, { required = false } = {}) => (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
        {text}
      </span>
      {required ? (
        <span className="text-red-500 text-xs font-semibold leading-none translate-y-px">
          *
        </span>
      ) : null}
    </span>
  );

  const inputClass =
    "!rounded-xl !h-10 !px-3 !border-gray-200 hover:!border-gray-300";

  const currentUser = authService.getCurrentUser();
  const currentUserEmail = String(currentUser?.email ?? "")
    .trim()
    .toLowerCase();
  const currentUserLocalAvatar = localStorage.getItem(AVATAR_KEY) ?? "";
  const currentUserAvatarUpdatedAt =
    localStorage.getItem(AVATAR_UPDATED_AT_KEY) ?? "";

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    const refreshAvatar = () => setAvatarVersion((v) => v + 1);
    window.addEventListener(PROFILE_UPDATED_EVENT, refreshAvatar);
    window.addEventListener("storage", refreshAvatar);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, refreshAvatar);
      window.removeEventListener("storage", refreshAvatar);
    };
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

  const buildAvatarSrc = (account) => {
    const accountEmail = String(account?.email ?? "")
      .trim()
      .toLowerCase();
    const isCurrentUser = currentUserEmail && accountEmail === currentUserEmail;

    if (isCurrentUser && currentUserLocalAvatar) {
      return currentUserLocalAvatar;
    }

    const base = account?.faceImageUrl || "/avatar_comingsoon.png";
    if (!base || /^data:/i.test(base)) return base;

    const version =
      (isCurrentUser && currentUserAvatarUpdatedAt) ||
      account?.updatedAt ||
      account?.lastUpdated ||
      "";

    if (!version) return base;
    const delimiter = base.includes("?") ? "&" : "?";
    return `${base}${delimiter}v=${encodeURIComponent(String(version))}`;
  };

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
    setStaffViewSnapshot(null);
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

      setStaffViewSnapshot({
        fullName: staff.fullName,
        email: staff.email,
        phoneContact: staff.phoneContact,
      });

      setPreview(staff.faceImageUrl);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không lấy được thông tin nhân viên.",
      );
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
      const msg =
        error?.response?.data?.message ??
        error?.response?.data?.title ??
        error?.response?.data?.errors?.[0] ??
        error?.message ??
        "Không thể thêm nhân viên. Vui lòng thử lại.";
      toast.error(msg);
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

      setStaffViewSnapshot({
        fullName: staff.fullName,
        email: staff.email,
        phoneContact: staff.phoneContact,
      });

      setPreview(staff.faceImageUrl);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không lấy được thông tin nhân viên.",
      );
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
      const msg =
        error?.response?.data?.message ??
        error?.response?.data?.title ??
        error?.response?.data?.errors?.[0] ??
        error?.message ??
        "Không thể cập nhật nhân viên. Vui lòng thử lại.";
      toast.error(msg);
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
      setStaffViewSnapshot(null);
      setIsModalOpen(true);

      form.setFieldsValue({
        fullName: staff.fullName,
        email: staff.email,
        phoneContact: staff.phoneContact,
      });

      setPreview(staff.faceImageUrl);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không lấy được thông tin nhân viên.",
      );
    }
  };

  // delete staff
  const confirm = async (id) => {
    try {
      await staffService.deleteStaff(id);

      toast.success("Xóa tài khoản thành công");

      await fetchAccounts();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Không thể xóa nhân viên. Vui lòng thử lại.",
      );
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await staffService.toggleStatus(id);

      toast.success("Cập nhật trạng thái thành công", { duration: 1500 });

      await fetchAccounts();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Không thể cập nhật trạng thái nhân viên. Vui lòng thử lại.",
      );
    }
  };

  return (
    <div className="space-y-10">
      {/* Statistics — Tiêu đề trên, số + đơn vị dưới */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow border">
          <div className="flex items-center gap-4">
            <Users className="w-8 h-8 flex-shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Tổng nhân viên
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {accounts.length}
                <span className="text-base font-medium text-gray-600">
                  Nhân viên
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-500/30 rounded-3xl p-6 shadow border">
          <div className="flex items-center gap-4">
            <UserCheck className="w-8 h-8 flex-shrink-0 text-green-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Đang hoạt động
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {activeCount}
                <span className="text-base font-medium text-gray-600">
                  Nhân viên
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-500/30 rounded-3xl p-6 shadow border">
          <div className="flex items-center gap-4">
            <UserX className="w-8 h-8 flex-shrink-0 text-gray-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Ngưng hoạt động
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {inactiveCount}
                <span className="text-base font-medium text-gray-600">
                  Nhân viên
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow border">
        <div className="flex justify-between items-center">
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

          <div className="">
            <button
              className="btn btn-primary flex items-center gap-3 rounded-2xl"
              onClick={() => {
                setIsViewMode(false);
                setIsEditMode(false);
                setStaffViewSnapshot(null);
                setIsModalOpen(true);
                form.resetFields();
              }}
            >
              <Plus className="w-4 h-4" />
              Thêm nhân viên
            </button>
          </div>
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
                      key={`${account.staffId}-${avatarVersion}`}
                      src={buildAvatarSrc(account)}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </td>

                  <td className="p-3 font-semibold">{account.fullName}</td>

                  <td className="p-3 text-gray-600">{account.email}</td>

                  <td className="p-3">{account.phoneContact || ""}</td>

                  <td className="p-3">
                    {account.role == "Admin" ? (
                      <Tag color="blue">Admin</Tag>
                    ) : (
                      <Tag color="green">Nhân viên</Tag>
                    )}
                  </td>

                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        account.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {account.isActive ? "Hoạt động" : "Ngưng hoạt động"}
                    </span>
                  </td>

                  <td>
                    <Button
                      type="text"
                      // style={{ marginRight: "8px" }}
                      onClick={() => handleViewStaff(account.staffId)}
                    >
                      <EyeTwoTone />
                    </Button>

                    <Button
                      type="text"
                      // style={{ marginRight: "8px" }}
                      onClick={() => handleEditStaff(account.staffId)}
                    >
                      <EditTwoTone />
                    </Button>
                    {account.role === "Admin" ? (
                      <Button type="text" disabled title="Không thể xóa Admin">
                        <DeleteTwoTone twoToneColor="#d9d9d9" />
                      </Button>
                    ) : (
                      <Popconfirm
                        title="Đổi trạng thái tài khoản"
                        description={`Bạn muốn ${
                          account.isActive ? "ngưng hoạt động" : "kích hoạt"
                        } tài khoản "${account.fullName}"?`}
                        onConfirm={() => handleToggleStatus(account.staffId)}
                        okText="Xác nhận"
                        cancelText="Hủy"
                      >
                        <span className="cursor-pointer">
                          {account.isActive ? (
                            <Button
                              icon={<StopOutlined />}
                              title="Ngưng hoạt động"
                              style={{
                                backgroundColor: "#f5222d",
                                color: "white",
                              }}
                            />
                          ) : (
                            <Button
                              icon={<CheckCircleOutlined />}
                              title="Kích hoạt"
                              style={{
                                backgroundColor: "#52c41a",
                                color: "white",
                              }}
                            />
                          )}
                        </span>
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

      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeModal}
            />
            <div
              className={`relative bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
                isViewMode ? "max-w-2xl" : "max-w-2xl"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {isViewMode
                      ? "Chi tiết nhân viên"
                      : isEditMode
                        ? "Chỉnh sửa nhân viên"
                        : "Thêm nhân viên"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {isViewMode ? (
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Cột trái: Thông tin văn bản */}
                    <div className="flex-1 space-y-6 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Họ và tên
                          </p>
                          <div className="flex items-center gap-2 text-gray-900">
                            <User className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold text-base">
                              {formatDetailText(staffViewSnapshot?.fullName)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Chức vụ
                          </p>
                          <div>
                            {/* Giả sử bạn có role trong snapshot, nếu không có thể mặc định hoặc truyền từ account */}
                            <Tag
                              color="blue"
                              className="rounded-lg px-3 py-0.5 font-medium"
                            >
                              Nhân viên
                            </Tag>
                          </div>
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Địa chỉ Email
                          </p>
                          <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <Mail className="w-4 h-4 text-gray-400" />{" "}
                            {/* Nên đổi thành Mail icon */}
                            <span className="text-sm italic">
                              {formatDetailText(staffViewSnapshot?.email)}
                            </span>
                          </div>
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Số điện thoại liên hệ
                          </p>
                          <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <Phone className="w-4 h-4 text-gray-400" />{" "}
                            <span className="text-sm font-medium">
                              {formatDetailText(
                                staffViewSnapshot?.phoneContact,
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cột phải: Ảnh chân dung */}
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider self-start md:self-center">
                        Ảnh khuôn mặt
                      </p>
                      <div className="w-40 h-52 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        {preview ? (
                          <Image
                            src={preview}
                            alt="Staff face"
                            className="w-full h-full object-cover"
                            preview={true} // Cho phép nhấn vào để xem ảnh to
                          />
                        ) : (
                          <User className="w-12 h-12 text-gray-300" />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Form
                    form={form}
                    layout="vertical"
                    disabled={submitting}
                    requiredMark={false}
                    className="mt-4"
                  >
                    <div className="flex flex-col md:flex-row gap-8">
                      {/* Cột trái: Form thông tin */}
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <Form.Item
                            label={staffFieldLabel("Họ tên", {
                              required: true,
                            })}
                            name="fullName"
                            rules={[
                              {
                                required: true,
                                message: "Vui lòng nhập họ tên",
                              },
                            ]}
                          >
                            <Input
                              className={inputClass}
                              placeholder="Nguyễn Văn A"
                            />
                          </Form.Item>

                          <Form.Item
                            label={staffFieldLabel("Email", { required: true })}
                            name="email"
                            rules={[
                              {
                                required: true,
                                message: "Vui lòng nhập email",
                              },
                              { type: "email", message: "Email không hợp lệ" },
                            ]}
                          >
                            <Input
                              className={inputClass}
                              placeholder="example@gmail.com"
                            />
                          </Form.Item>

                          <Form.Item
                            label={staffFieldLabel("Số điện thoại")}
                            name="phoneContact"
                          >
                            <Input
                              className={inputClass}
                              placeholder="098..."
                            />
                          </Form.Item>

                          {/* Nếu là mode thêm mới thì hiện password ở đây */}
                          {!isEditMode && (
                            <Form.Item
                              label={staffFieldLabel("Mật khẩu", {
                                required: true,
                              })}
                              name="password"
                              // ... rules
                            >
                              <Input.Password className={inputClass} />
                            </Form.Item>
                          )}
                        </div>
                      </div>

                      {/* Cột phải: Ảnh đại diện */}
                      <div className="flex flex-col items-center space-y-4">
                        <div className="relative group">
                          <div className="w-40 h-52 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center transition-all group-hover:border-blue-400">
                            {preview ? (
                              <img
                                src={preview}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center p-4">
                                <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-400">
                                  Chưa có ảnh
                                </p>
                              </div>
                            )}

                            {/* Overlay khi hover để upload */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <Upload
                                beforeUpload={handleBeforeUpload}
                                showUploadList={false}
                                maxCount={1}
                              >
                                <div className="text-white text-center">
                                  <UploadOutlined className="text-xl" />
                                  <p className="text-xs font-medium">
                                    Thay đổi ảnh
                                  </p>
                                </div>
                              </Upload>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 italic text-center">
                          Định dạng hỗ trợ: JPG, PNG <br /> Tối đa 2MB
                        </p>
                      </div>
                    </div>
                  </Form>
                )}
              </div>

              {/* Footer */}
              {!isViewMode && (
                <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="btn btn-secondary"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        if (isEditMode) {
                          await handleUpdateStaff();
                        } else {
                          await handleSubmit();
                        }
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isEditMode ? "Cập nhật" : "Thêm nhân viên"}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default AccountStaff;
