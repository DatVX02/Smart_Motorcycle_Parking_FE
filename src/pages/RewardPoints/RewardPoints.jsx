import { useState } from "react";
import {
  Award,
  TrendingUp,
  Users,
  Gift,
  Search,
  Plus,
  Edit,
} from "lucide-react";
import RewardModal from "./RewardModal";

function RewardPoints() {
  const [showModal, setShowModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const users = [
    {
      id: 1,
      name: "Nguyễn Văn A",
      email: "user1@gmail.com",
      phone: "0901234567",
      points: 450,
      totalEarned: 1250,
      totalRedeemed: 800,
      tier: "gold",
      parkingCount: 125,
    },
    {
      id: 2,
      name: "Trần Thị B",
      email: "user2@gmail.com",
      phone: "0912345678",
      points: 320,
      totalEarned: 850,
      totalRedeemed: 530,
      tier: "silver",
      parkingCount: 85,
    },
    {
      id: 3,
      name: "Lê Văn C",
      email: "user3@gmail.com",
      phone: "0923456789",
      points: 180,
      totalEarned: 450,
      totalRedeemed: 270,
      tier: "bronze",
      parkingCount: 45,
    },
    {
      id: 4,
      name: "Phạm Thị D",
      email: "user4@gmail.com",
      phone: "0934567890",
      points: 95,
      totalEarned: 195,
      totalRedeemed: 100,
      tier: "bronze",
      parkingCount: 20,
    },
  ];

  const rewards = [
    {
      id: 1,
      name: "Giảm 50% phí đỗ xe",
      pointsCost: 100,
      description: "Áp dụng cho 1 lần đỗ xe",
      available: true,
    },
    {
      id: 2,
      name: "Miễn phí 2 giờ đỗ xe",
      pointsCost: 150,
      description: "Áp dụng cho 1 lần đỗ xe",
      available: true,
    },
    {
      id: 3,
      name: "Vé tháng miễn phí",
      pointsCost: 500,
      description: "Miễn phí đỗ xe trong 1 tháng",
      available: true,
    },
    {
      id: 4,
      name: "Voucher 100k",
      pointsCost: 250,
      description: "Voucher mua sắm 100,000 VND",
      available: false,
    },
  ];

  const tierColors = {
    gold: "bg-yellow-100 text-yellow-800",
    silver: "bg-gray-100 text-gray-800",
    bronze: "bg-orange-100 text-orange-800",
  };

  const tierLabels = {
    gold: "Vàng",
    silver: "Bạc",
    bronze: "Đồng",
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalPoints = users.reduce((sum, user) => sum + user.points, 0);
  const totalUsers = users.length;
  const goldUsers = users.filter((u) => u.tier === "gold").length;

  const handleAdjustPoints = (user) => {
    setSelectedReward(user);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
              <p className="text-sm text-gray-600">Người dùng</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalPoints}</p>
              <p className="text-sm text-gray-600">Tổng điểm</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{goldUsers}</p>
              <p className="text-sm text-gray-600">Thành viên Vàng</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Gift className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {rewards.length}
              </p>
              <p className="text-sm text-gray-600">Phần thưởng</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Catalog */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Danh mục phần thưởng
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Gift className="w-5 h-5 text-purple-600" />
                </div>
                {!reward.available && (
                  <span className="badge bg-red-100 text-red-800">Hết</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {reward.name}
              </h3>
              <p className="text-xs text-gray-600 mb-3">{reward.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Award className="w-4 h-4 text-yellow-600" />
                  <span className="font-bold text-gray-900">
                    {reward.pointsCost}
                  </span>
                  <span className="text-xs text-gray-500">điểm</span>
                </div>
                <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Người dùng</th>
                <th className="table-header-cell">Hạng</th>
                <th className="table-header-cell">Điểm hiện tại</th>
                <th className="table-header-cell">Tổng tích lũy</th>
                <th className="table-header-cell">Đã đổi</th>
                <th className="table-header-cell">Số lần đỗ</th>
                <th className="table-header-cell">Hành động</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-semibold">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${tierColors[user.tier]}`}>
                      {tierLabels[user.tier]}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-1">
                      <Award className="w-4 h-4 text-yellow-600" />
                      <span className="font-bold text-gray-900">
                        {user.points}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell text-gray-600">
                    {user.totalEarned}
                  </td>
                  <td className="table-cell text-gray-600">
                    {user.totalRedeemed}
                  </td>
                  <td className="table-cell">
                    <span className="font-medium text-gray-900">
                      {user.parkingCount}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleAdjustPoints(user)}
                      className="btn btn-secondary btn-sm flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Điều chỉnh</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <RewardModal
          user={selectedReward}
          onClose={() => setShowModal(false)}
          onSave={(data) => {
            console.log("Adjusting points:", data);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

export default RewardPoints;
