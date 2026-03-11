import { Clock, CheckCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DEFAULT_TRANSACTIONS = [
  { id: "1", plate: "29A-12345", user: "Nguyễn Văn A", amount: "15,000 VND", time: "10:32 AM", status: "success" },
  { id: "2", plate: "30B-98765", user: "Trần Thị B", amount: "25,000 VND", time: "10:28 AM", status: "success" },
  { id: "3", plate: "51C-55555", user: "Lê Văn C", amount: "10,000 VND", time: "10:15 AM", status: "success" },
  { id: "4", plate: "92D-11111", user: "Phạm Thị D", amount: "20,000 VND", time: "10:05 AM", status: "success" },
];

function normalizeTransaction(item) {
  if (!item) return null;
  const id = item.id ?? item.transactionId ?? item.transaction_id ?? "";
  const plate = item.plate ?? item.licensePlate ?? item.license_plate ?? item.plateNumber ?? "";
  const user = item.user ?? item.userName ?? item.user_name ?? item.customerName ?? "";
  const amount = typeof item.amount === "number" ? `${item.amount.toLocaleString("vi-VN")} VND` : (item.amount ?? item.total ?? "");
  const time = item.time ?? item.createdAt ?? item.created_at ?? item.timestamp ?? "";
  return { id, plate, user, amount, time, status: item.status ?? "success" };
}

function RecentTransactions({ data, loading }) {
  const navigate = useNavigate();
  const raw = Array.isArray(data) ? data : data?.items ?? data?.transactions ?? [];
  const transactions = raw.length > 0
    ? raw.slice(0, 5).map(normalizeTransaction).filter(Boolean)
    : DEFAULT_TRANSACTIONS;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Giao dịch gần đây
            </h2>
            <p className="text-xs text-slate-500">5 giao dịch mới nhất</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/transactions")}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
        >
          Xem tất cả
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {loading ? (
        <div className="flex flex-col gap-3 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between rounded-xl border border-slate-100 p-4 transition-all hover:border-slate-200 hover:bg-slate-50/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {transaction.plate}
                  </p>
                  <p className="text-sm text-slate-500">{transaction.user}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">
                  {transaction.amount}
                </p>
                <div className="flex items-center justify-end gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  {transaction.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecentTransactions;
