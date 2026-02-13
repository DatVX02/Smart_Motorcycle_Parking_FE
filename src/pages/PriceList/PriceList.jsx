import { useState } from "react";
import { DollarSign, Plus, Edit, Trash2, Clock, Calendar } from "lucide-react";
import PriceModal from "./PriceModal";

function PriceList() {
  const [showModal, setShowModal] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(null);

  const prices = [
    {
      id: 1,
      name: "Giờ đầu tiên",
      type: "hourly",
      duration: "1 giờ",
      price: 5000,
      description: "Áp dụng cho giờ đầu tiên",
      status: "active",
    },
    {
      id: 2,
      name: "Giờ tiếp theo",
      type: "hourly",
      duration: "Mỗi giờ",
      price: 3000,
      description: "Áp dụng từ giờ thứ 2 trở đi",
      status: "active",
    },
    {
      id: 3,
      name: "Gói nửa ngày",
      type: "package",
      duration: "4 giờ",
      price: 15000,
      description: "Gói ưu đãi 4 giờ",
      status: "active",
    },
    {
      id: 4,
      name: "Gói cả ngày",
      type: "package",
      duration: "8 giờ",
      price: 25000,
      description: "Gói ưu đãi cả ngày",
      status: "active",
    },
    {
      id: 5,
      name: "Gói qua đêm",
      type: "package",
      duration: "12 giờ",
      price: 30000,
      description: "Từ 18:00 đến 06:00 sáng hôm sau",
      status: "active",
    },
    {
      id: 6,
      name: "Vé tuần",
      type: "subscription",
      duration: "7 ngày",
      price: 150000,
      description: "Không giới hạn số lần đỗ",
      status: "active",
    },
    {
      id: 7,
      name: "Vé tháng",
      type: "subscription",
      duration: "30 ngày",
      price: 500000,
      description: "Không giới hạn số lần đỗ",
      status: "active",
    },
    {
      id: 8,
      name: "Vé quý",
      type: "subscription",
      duration: "90 ngày",
      price: 1350000,
      description: "Tiết kiệm 10% so với vé tháng",
      status: "active",
    },
  ];

  const typeColors = {
    hourly: "bg-blue-100 text-blue-800",
    package: "bg-green-100 text-green-800",
    subscription: "bg-purple-100 text-purple-800",
  };

  const typeLabels = {
    hourly: "Theo giờ",
    package: "Gói giờ",
    subscription: "Vé định kỳ",
  };

  const typeIcons = {
    hourly: Clock,
    package: Clock,
    subscription: Calendar,
  };

  const handleEdit = (price) => {
    setSelectedPrice(price);
    setShowModal(true);
  };

  const handleDelete = (price) => {
    if (confirm(`Bạn có chắc muốn xóa "${price.name}"?`)) {
      console.log("Deleting price:", price.id);
    }
  };

  const handleAddNew = () => {
    setSelectedPrice(null);
    setShowModal(true);
  };

  const hourlyPrices = prices.filter((p) => p.type === "hourly");
  const packagePrices = prices.filter((p) => p.type === "package");
  const subscriptionPrices = prices.filter((p) => p.type === "subscription");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bảng giá phí đỗ xe
          </h1>
          <p className="text-gray-600 mt-1">Thiết lập và quản lý giá dịch vụ</p>
        </div>
        <button
          onClick={handleAddNew}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm giá mới</span>
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {prices.length}
              </p>
              <p className="text-sm text-gray-600">Tổng bảng giá</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {hourlyPrices.length}
              </p>
              <p className="text-sm text-gray-600">Giá theo giờ</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {packagePrices.length}
              </p>
              <p className="text-sm text-gray-600">Gói giờ</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {subscriptionPrices.length}
              </p>
              <p className="text-sm text-gray-600">Vé định kỳ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Prices */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span>Giá theo giờ</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hourlyPrices.map((price) => (
            <div
              key={price.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {price.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {price.description}
                  </p>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-bold text-primary-600">
                      {price.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500">
                      đ / {price.duration}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(price)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(price)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Package Prices */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-green-600" />
          <span>Gói giờ ưu đãi</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packagePrices.map((price) => (
            <div
              key={price.id}
              className="border-2 border-green-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-green-50"
            >
              <div className="text-center mb-3">
                <span className="badge bg-green-100 text-green-800 mb-2">
                  Gói ưu đãi
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {price.name}
                </h3>
                <p className="text-sm text-gray-600">{price.description}</p>
              </div>
              <div className="text-center mb-4">
                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-3xl font-bold text-green-600">
                    {price.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">đ</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{price.duration}</p>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => handleEdit(price)}
                  className="flex-1 btn btn-secondary btn-sm"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(price)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Prices */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          <span>Vé định kỳ</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscriptionPrices.map((price) => (
            <div
              key={price.id}
              className="border-2 border-purple-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-purple-50"
            >
              <div className="text-center mb-3">
                <span className="badge bg-purple-100 text-purple-800 mb-2">
                  Vé định kỳ
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {price.name}
                </h3>
                <p className="text-sm text-gray-600">{price.description}</p>
              </div>
              <div className="text-center mb-4">
                <div className="flex items-baseline justify-center space-x-1">
                  <span className="text-3xl font-bold text-purple-600">
                    {price.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">đ</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{price.duration}</p>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => handleEdit(price)}
                  className="flex-1 btn btn-secondary btn-sm"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(price)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <PriceModal
          price={selectedPrice}
          onClose={() => setShowModal(false)}
          onSave={(data) => {
            console.log("Saving price:", data);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

export default PriceList;
