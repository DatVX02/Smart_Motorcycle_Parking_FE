import { useState } from "react";
import { Receipt, Download, Eye, Search, Filter, Calendar } from "lucide-react";

function Transactions() {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const transactions = [
    {
      id: "TX-2024020301",
      date: "2024-02-03 10:32",
      plate: "29A-12345",
      user: "Nguyễn Văn A",
      entryTime: "08:15",
      exitTime: "10:30",
      duration: "2h 15m",
      amount: 15000,
      paymentMethod: "Momo",
      status: "completed",
      invoiceNumber: "INV-001234",
    },
    {
      id: "TX-2024020302",
      date: "2024-02-03 10:28",
      plate: "30B-98765",
      user: "Trần Thị B",
      entryTime: "07:30",
      exitTime: "10:25",
      duration: "2h 55m",
      amount: 25000,
      paymentMethod: "VNPay",
      status: "completed",
      invoiceNumber: "INV-001235",
    },
    {
      id: "TX-2024020303",
      date: "2024-02-03 10:15",
      plate: "51C-55555",
      user: "Lê Văn C",
      entryTime: "09:00",
      exitTime: "10:10",
      duration: "1h 10m",
      amount: 10000,
      paymentMethod: "Wallet",
      status: "completed",
      invoiceNumber: "INV-001236",
    },
    {
      id: "TX-2024020304",
      date: "2024-02-03 09:45",
      plate: "92D-11111",
      user: "Phạm Thị D",
      entryTime: "08:00",
      exitTime: "09:40",
      duration: "1h 40m",
      amount: 20000,
      paymentMethod: "Momo",
      status: "pending",
      invoiceNumber: "-",
    },
    {
      id: "TX-2024020305",
      date: "2024-02-03 09:30",
      plate: "59E-77777",
      user: "Võ Văn E",
      entryTime: "06:30",
      exitTime: null,
      duration: "Đang đỗ",
      amount: 0,
      paymentMethod: "-",
      status: "in-progress",
      invoiceNumber: "-",
    },
  ];

  const statusColors = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    "in-progress": "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
  };

  const statusLabels = {
    completed: "Hoàn thành",
    pending: "Chờ thanh toán",
    "in-progress": "Đang đỗ",
    failed: "Thất bại",
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesStatus =
      selectedStatus === "all" || tx.status === selectedStatus;
    const matchesType =
      selectedType === "all" ||
      tx.paymentMethod.toLowerCase() === selectedType.toLowerCase();
    const matchesSearch =
      tx.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const totalRevenue = transactions
    .filter((tx) => tx.status === "completed")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const todayTransactions = transactions.length;
  const completedTransactions = transactions.filter(
    (tx) => tx.status === "completed"
  ).length;
  const pendingTransactions = transactions.filter(
    (tx) => tx.status === "pending"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Giao dịch & Hóa đơn
        </h1>
        <p className="text-gray-600 mt-1">
          Quản lý giao dịch thanh toán và hóa đơn điện tử
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {todayTransactions}
              </p>
              <p className="text-sm text-gray-600">Giao dịch hôm nay</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {totalRevenue.toLocaleString()} đ
              </p>
              <p className="text-sm text-gray-600">Doanh thu hôm nay</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {completedTransactions}
              </p>
              <p className="text-sm text-gray-600">Đã hoàn thành</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {pendingTransactions}
              </p>
              <p className="text-sm text-gray-600">Chờ thanh toán</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm giao dịch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Hoàn thành</option>
              <option value="pending">Chờ thanh toán</option>
              <option value="in-progress">Đang đỗ</option>
              <option value="failed">Thất bại</option>
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input"
            >
              <option value="all">Tất cả phương thức</option>
              <option value="momo">Momo</option>
              <option value="vnpay">VNPay</option>
              <option value="wallet">Ví điện tử</option>
            </select>
            <button className="btn btn-secondary flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Lọc theo ngày</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Mã GD</th>
                <th className="table-header-cell">Biển số</th>
                <th className="table-header-cell">Người dùng</th>
                <th className="table-header-cell">Thời gian vào</th>
                <th className="table-header-cell">Thời gian ra</th>
                <th className="table-header-cell">Thời lượng</th>
                <th className="table-header-cell">Số tiền</th>
                <th className="table-header-cell">Phương thức</th>
                <th className="table-header-cell">Trạng thái</th>
                <th className="table-header-cell">Hành động</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {tx.id}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="font-semibold text-gray-900">
                      {tx.plate}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600">{tx.user}</td>
                  <td className="table-cell text-gray-600">{tx.entryTime}</td>
                  <td className="table-cell text-gray-600">
                    {tx.exitTime || "-"}
                  </td>
                  <td className="table-cell">
                    <span className="font-medium text-gray-900">
                      {tx.duration}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="font-semibold text-gray-900">
                      {tx.amount > 0 ? `${tx.amount.toLocaleString()} đ` : "-"}
                    </span>
                  </td>
                  <td className="table-cell">{tx.paymentMethod}</td>
                  <td className="table-cell">
                    <span className={`badge ${statusColors[tx.status]}`}>
                      {statusLabels[tx.status]}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {tx.invoiceNumber !== "-" && (
                        <button
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Tải hóa đơn"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Transactions;
