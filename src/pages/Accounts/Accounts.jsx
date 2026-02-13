import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Shield,
  User as UserIcon,
} from "lucide-react";
import AccountModal from "./AccountModal";

function Accounts() {
  const [selectedRole, setSelectedRole] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Mock data
  const accounts = [
    {
      id: 1,
      name: "Nguyễn Văn Admin",
      email: "admin@motoguard.com",
      phone: "0901234567",
      role: "admin",
      status: "active",
      createdAt: "2024-01-15",
      lastLogin: "2024-02-03 10:30",
    },
    {
      id: 2,
      name: "Trần Thị Staff 1",
      email: "staff1@motoguard.com",
      phone: "0912345678",
      role: "staff",
      status: "active",
      createdAt: "2024-01-20",
      lastLogin: "2024-02-03 09:15",
    },
    {
      id: 3,
      name: "Lê Văn Staff 2",
      email: "staff2@motoguard.com",
      phone: "0923456789",
      role: "staff",
      status: "active",
      createdAt: "2024-01-25",
      lastLogin: "2024-02-03 08:00",
    },
    {
      id: 4,
      name: "Phạm Thị User",
      email: "user1@gmail.com",
      phone: "0934567890",
      role: "user",
      status: "active",
      createdAt: "2024-02-01",
      lastLogin: "2024-02-03 07:45",
    },
    {
      id: 5,
      name: "Hoàng Văn User",
      email: "user2@gmail.com",
      phone: "0945678901",
      role: "user",
      status: "inactive",
      createdAt: "2024-02-02",
      lastLogin: "2024-02-01 18:20",
    },
  ];

  const roleColors = {
    admin: "bg-purple-100 text-purple-800",
    staff: "bg-blue-100 text-blue-800",
    user: "bg-green-100 text-green-800",
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
  };

  const filteredAccounts = accounts.filter((account) => {
    const matchesRole = selectedRole === "all" || account.role === selectedRole;
    const matchesSearch =
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleEdit = (account) => {
    setSelectedAccount(account);
    setShowModal(true);
  };

  const handleDelete = (account) => {
    if (confirm(`Bạn có chắc muốn xóa tài khoản "${account.name}"?`)) {
      console.log("Deleting account:", account.id);
    }
  };

  const handleAddNew = () => {
    setSelectedAccount(null);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Quản lý tài khoản
          </h1>
          <p className="text-gray-600 mt-1">Quản lý Admin, Staff và User</p>
        </div>
        <button
          onClick={handleAddNew}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm tài khoản</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {accounts.filter((a) => a.role === "admin").length}
              </p>
              <p className="text-sm text-gray-600">Admin</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {accounts.filter((a) => a.role === "staff").length}
              </p>
              <p className="text-sm text-gray-600">Staff</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {accounts.filter((a) => a.role === "user").length}
              </p>
              <p className="text-sm text-gray-600">User</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {accounts.filter((a) => a.status === "active").length}
              </p>
              <p className="text-sm text-gray-600">Đang hoạt động</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Họ tên</th>
                <th className="table-header-cell">Email</th>
                <th className="table-header-cell">Số điện thoại</th>
                <th className="table-header-cell">Vai trò</th>
                <th className="table-header-cell">Trạng thái</th>
                <th className="table-header-cell">Đăng nhập cuối</th>
                <th className="table-header-cell">Hành động</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-semibold">
                          {account.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {account.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-gray-600">{account.email}</td>
                  <td className="table-cell text-gray-600">{account.phone}</td>
                  <td className="table-cell">
                    <span className={`badge ${roleColors[account.role]}`}>
                      {account.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${statusColors[account.status]}`}>
                      {account.status === "active"
                        ? "Hoạt động"
                        : "Không hoạt động"}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600 text-sm">
                    {account.lastLogin}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(account)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(account)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <AccountModal
          account={selectedAccount}
          onClose={() => setShowModal(false)}
          onSave={(data) => {
            console.log("Saving account:", data);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

export default Accounts;
