import { useState, useEffect } from "react";
import { Search, Users, UserCheck, UserX, Plus } from "lucide-react";
import image_waiting from "../../../public/avatar_comingsoon.png";
import staffService from "@/services/staffService";
import { Image, Pagination, Tag } from "antd";

function AccountStaff() {
    const [searchTerm, setSearchTerm] = useState("");
    const [accounts, setAccounts] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(4);

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // FETCH DATA
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

    // search
    const filteredAccounts = accounts.filter((account) => {
        const name = account.fullName?.toLowerCase() || "";
        const email = account.email?.toLowerCase() || "";

        return (
            name.includes(searchTerm.toLowerCase()) ||
            email.includes(searchTerm.toLowerCase())
        );
    });

    // pagnition
    const startIndex = (currentPage - 1) * pageSize;

    const paginatedAccounts = filteredAccounts.slice(
        startIndex,
        startIndex + pageSize
    );

    const activeCount = accounts.filter((a) => a.isActive).length;
    const inactiveCount = accounts.length - activeCount;

    return (
        <div className="space-y-10">

            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold text-gray-900">
                    Quản lý nhân viên
                </h1>

                <button className="btn btn-primary flex items-center gap-3 rounded-2xl">
                    <Plus className="w-4 h-4" />
                    Thêm nhân viên

                </button>
            </div>

            {/* statictics */}
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
                            <p className="text-3xl font-bold text-green-600">
                                {activeCount}
                            </p>
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
                            <p className="text-gray-500">Bị khóa</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* search */}
            <div className="bg-white rounded-3xl p-6 shadow border flex items-center gap-4">

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

            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">

                <table className="w-full text-sm text-center">

                    <thead className="bg-gray-100 text-gray-600">
                        <tr>
                            <th className="p-3">STT</th>
                            <th className="p-3">Hình khuôn mặt</th>
                            <th className="p-3">Họ tên</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">SĐT</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Trạng thái</th>
                        </tr>
                    </thead>

                    <tbody>

                        {paginatedAccounts.map((account, index) => (

                            <tr
                                key={account.staffId}
                                className="border-b hover:bg-gray-50"
                            >

                                <td className="p-3">
                                    {startIndex + index + 1}
                                </td>

                                <td className="p-3">
                                    <Image
                                        src={account.faceImageUrl || image_waiting}
                                        width={40}
                                        height={40}
                                        className="rounded-full"
                                    />
                                </td>

                                <td className="p-3 font-semibold">
                                    {account.fullName}
                                </td>

                                <td className="p-3 text-gray-600">
                                    {account.email}
                                </td>

                                <td className="p-3">
                                    {account.phoneContact || "-"}
                                </td>

                                <td className="p-3">
                                    {account.role == "Admin" ? <Tag color="blue">Admin</Tag> : <Tag color="green">Staff</Tag>}
                                </td>

                                <td className="p-3">

                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold
                    ${account.isActive
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-600"
                                            }`}
                                    >
                                        {account.isActive ? "Hoạt động" : "Bị khóa"}
                                    </span>

                                </td>

                                {/* <td>

                                </td> */}

                            </tr>

                        ))}

                        {paginatedAccounts.length === 0 && (
                            <tr>
                                <td colSpan="7" className="p-6 text-gray-400">
                                    Không có dữ liệu
                                </td>
                            </tr>
                        )}

                    </tbody>

                </table>

            </div>

            {/* PAGINATION */}
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

        </div>
    );
}

export default AccountStaff;