import { Clock, CheckCircle } from "lucide-react";

function RecentTransactions() {
  const transactions = [
    {
      id: "TX-1234",
      plate: "29A-12345",
      user: "Nguyễn Văn A",
      amount: "15,000 VND",
      time: "10:32 AM",
      status: "success",
    },
    {
      id: "TX-1235",
      plate: "30B-98765",
      user: "Trần Thị B",
      amount: "25,000 VND",
      time: "10:28 AM",
      status: "success",
    },
    {
      id: "TX-1236",
      plate: "51C-55555",
      user: "Lê Văn C",
      amount: "10,000 VND",
      time: "10:15 AM",
      status: "success",
    },
    {
      id: "TX-1237",
      plate: "92D-11111",
      user: "Phạm Thị D",
      amount: "20,000 VND",
      time: "10:05 AM",
      status: "success",
    },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Giao dịch gần đây
        </h2>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Xem tất cả
        </button>
      </div>
      <div className="space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {transaction.plate}
                </p>
                <p className="text-xs text-gray-600">{transaction.user}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {transaction.amount}
              </p>
              <div className="flex items-center justify-end space-x-1 mt-1">
                <Clock className="w-3 h-3 text-gray-500" />
                <p className="text-xs text-gray-500">{transaction.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentTransactions;
