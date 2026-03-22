import { useState, useEffect } from "react";
import { Search, Users, UserCheck, UserX } from "lucide-react";
import AccountModal from "./AccountModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import userService from "@/services/userService";
import { Image, Pagination, Tag } from "antd";

function Accounts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, account: null });
  const [accounts, setAccounts] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchAccounts = async () => {
    try {
      const response = await userService.getAllUser();
      const users = response?.data?.data?.items || [];
      setAccounts(users);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setAccounts([]);
    }
  };

  // Filter
  const filteredAccounts = accounts.filter((account) => {
    const name = account.fullName?.toLowerCase() || "";
    const email = account.email?.toLowerCase() || "";

    return (
      name.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase())
    );
  });

  // Pagination
  const startIndex = (currentPage - 1) * pageSize;

  const paginatedAccounts = filteredAccounts.slice(
    startIndex,
    startIndex + pageSize,
  );

  const activeCount = accounts.filter((a) => a.isActive).length;
  const inactiveCount = accounts.length - activeCount;

  // const handleEdit = (account) => {
  //   setSelectedAccount(account);
  //   setShowModal(true);
  // };

  // const handleDelete = (account) => {
  //   setConfirm({ open: true, account });
  // };

  const handleConfirmDelete = async () => {
    try {
      await userService.deleteUser(confirm.account.userId);
      fetchAccounts();
      setConfirm({ open: false, account: null });
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  // const handleAddNew = () => {
  //   setSelectedAccount(null);
  //   setShowModal(true);
  // };

  return (
    <div className="space-y-10">
      {/* Statistics — Tiêu đề trên, số + đơn vị dưới */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow border">
          <div className="flex items-center gap-4">
            <Users className="w-8 h-8 flex-shrink-0 text-blue-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Tổng người dùng
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {accounts.length}
                <span className="text-base font-medium text-gray-600">
                  Tài khoản
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
                  Tài khoản
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
                Ngưng hoạt động / Xóa tài khoản
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight flex flex-wrap items-baseline gap-x-1">
                {inactiveCount}
                <span className="text-base font-medium text-gray-600">
                  Tài khoản
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
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

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-x-auto mt-4">
          <table className="w-full text-sm text-center">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className=" text-center">STT</th>
                <th className="p-3">Hình đại diện </th>
                <th className="p-3">Họ tên</th>
                <th className="p-3">Email</th>
                <th className="p-3">Số điện thoại </th>
                <th className="p-3">Ngày sinh</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-center">Trạng thái</th>
                <th className="p-3">Ngày tạo</th>
                <th className="p-3">Ngày cập nhật</th>
                <th className="p-3 "></th>
              </tr>
            </thead>

            <tbody>
              {paginatedAccounts.map((account, index) => (
                <tr key={account.userId} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-center">{startIndex + index + 1}</td>

                  <td className="p-3">
                    <Image
                      src={account.avatarUrl || "/avatar_comingsoon.png"}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </td>

                  <td className="p-3 font-semibold">{account.fullName}</td>

                  <td className="p-3 text-gray-600">{account.email}</td>

                  <td className="p-3">{account.phoneNumber}</td>

                  <td className="p-3">
                    {account.dateOfBirth
                      ? new Date(account.dateOfBirth).toLocaleDateString(
                          "vi-VN",
                        )
                      : "-"}
                  </td>

                  <td className="p-3 text-center">
                    {account.role == "user" ? (
                      <Tag color="green"></Tag>
                    ) : (
                      <Tag color="blue">Khách hàng</Tag>
                    )}
                  </td>

                  <td className="p-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold
                    ${
                      account.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                    >
                      {account.isActive
                        ? "Hoạt động"
                        : "Ngưng hoạt động/Xóa tài khoản"}
                    </span>
                  </td>

                  <td className="p-3 text-gray-500">
                    {new Date(account.createdAt).toLocaleDateString("vi-VN")}
                  </td>

                  <td className="p-3 text-gray-500">
                    {new Date(account.updatedAt).toLocaleDateString("vi-VN")}
                  </td>

                  {/* <td className="p-3">
                  <div className="flex justify-center gap-2">

                    <button
                      onClick={() => handleEdit(account)}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(account)}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>
                </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-end">
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={filteredAccounts.length}
          // showSizeChanger
          // pageSizeOptions={["5", "10", "20", "50"]}
          onChange={(page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <AccountModal
          account={selectedAccount}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            try {
              if (selectedAccount) {
                await userService.updateUser(selectedAccount.userId, data);
              } else {
                await userService.createUser(data);
              }

              fetchAccounts();
              setShowModal(false);
            } catch (error) {
              console.error("Save error:", error);
            }
          }}
        />
      )}

      {/* Confirm */}
      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, account: null })}
        onConfirm={handleConfirmDelete}
        title="Xóa tài khoản"
        description={`Bạn có chắc muốn xóa "${confirm.account?.fullName}"?`}
        confirmLabel="Xóa"
      />
    </div>
  );
}

export default Accounts;
