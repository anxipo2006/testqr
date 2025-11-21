
import React, { useState, useEffect } from 'react';
import { getAllOrdersHistory } from '../services/posService';
import type { Order } from '../types';
import { OrderStatus } from '../types';
import { formatTimestamp } from '../utils/date';
import { LoadingIcon, PrinterIcon, BanknotesIcon, ChartBarIcon, ClipboardDocumentListIcon, ArrowPathIcon } from './icons';

export const RevenueReport: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const data = await getAllOrdersHistory();
        setOrders(data);
        setIsLoading(false);
    };

    const getStats = () => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const todayOrders = orders.filter(o => o.timestamp >= startOfDay && o.status === OrderStatus.COMPLETED);
        const monthOrders = orders.filter(o => o.timestamp >= startOfMonth && o.status === OrderStatus.COMPLETED);

        const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const monthRevenue = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const totalOrdersCount = orders.length;

        // Top items
        const itemMap = new Map<string, number>();
        monthOrders.forEach(o => {
            o.items.forEach(i => {
                itemMap.set(i.productName, (itemMap.get(i.productName) || 0) + i.quantity);
            });
        });
        
        const topItems = Array.from(itemMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return { todayRevenue, monthRevenue, totalOrdersCount, topItems, todayCount: todayOrders.length };
    };

    const stats = getStats();

    if (isLoading) return <div className="flex justify-center p-10"><LoadingIcon className="h-10 w-10 text-primary-500"/></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-green-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm dark:text-gray-400">Doanh thu hôm nay</p>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{new Intl.NumberFormat('vi-VN').format(stats.todayRevenue)}đ</h3>
                        </div>
                        <BanknotesIcon className="h-8 w-8 text-green-500 opacity-50" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{stats.todayCount} đơn hàng đã hoàn thành</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm dark:text-gray-400">Doanh thu tháng này</p>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{new Intl.NumberFormat('vi-VN').format(stats.monthRevenue)}đ</h3>
                        </div>
                        <ChartBarIcon className="h-8 w-8 text-blue-500 opacity-50" />
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border-l-4 border-purple-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm dark:text-gray-400">Tổng đơn hàng (Toàn thời gian)</p>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stats.totalOrdersCount}</h3>
                        </div>
                        <ClipboardDocumentListIcon className="h-8 w-8 text-purple-500 opacity-50" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Top Món Bán Chạy (Tháng này)</h3>
                <div className="space-y-4">
                    {stats.topItems.length === 0 ? (
                        <p className="text-gray-500">Chưa có dữ liệu.</p>
                    ) : (
                        stats.topItems.map(([name, qty], index) => (
                            <div key={name} className="flex items-center">
                                <span className="w-6 text-gray-500 font-bold">{index + 1}.</span>
                                <div className="flex-1 ml-2">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{name}</span>
                                        <span className="text-sm text-gray-500">{qty} đã bán</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${(qty / stats.topItems[0][1]) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export const InvoiceManagement: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const data = await getAllOrdersHistory();
        setOrders(data);
        setIsLoading(false);
    };

    const handlePrint = (order: Order) => {
       setSelectedOrder(order);
    };

    const InvoiceModal = ({ order, onClose }: { order: Order, onClose: () => void }) => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm text-gray-800">
                <div className="text-center mb-4 border-b border-dashed pb-4">
                    <h2 className="text-xl font-bold uppercase">Hóa Đơn Thanh Toán</h2>
                    <p className="text-sm text-gray-500">{formatTimestamp(order.timestamp)}</p>
                    <p className="text-sm text-gray-500">Mã đơn: #{order.id.slice(-6).toUpperCase()}</p>
                </div>
                <div className="space-y-2 mb-4 text-sm">
                    {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                            <span>{item.productName} <span className="text-xs text-gray-500">x{item.quantity}</span></span>
                            <span>{new Intl.NumberFormat('vi-VN').format(item.price * item.quantity)}</span>
                        </div>
                    ))}
                </div>
                <div className="border-t border-dashed pt-2 mb-4">
                    <div className="flex justify-between font-bold text-lg">
                        <span>Tổng cộng</span>
                        <span>{new Intl.NumberFormat('vi-VN').format(order.totalAmount)}đ</span>
                    </div>
                </div>
                <div className="text-center text-xs text-gray-500 mb-4">
                    <p>Nhân viên: {order.staffName || 'N/A'}</p>
                    <p>Cảm ơn quý khách!</p>
                </div>
                <div className="flex gap-2 print:hidden">
                    <button onClick={() => window.print()} className="flex-1 bg-primary-600 text-white py-2 rounded hover:bg-primary-700 flex items-center justify-center gap-2">
                        <PrinterIcon className="h-4 w-4"/> In
                    </button>
                    <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300">Đóng</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                 <h3 className="text-lg font-bold text-gray-800 dark:text-white">Lịch sử Hóa đơn</h3>
                 <button onClick={loadData} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowPathIcon className="h-5 w-5"/></button>
             </div>
             
             {isLoading ? <LoadingIcon className="h-8 w-8 mx-auto" /> : (
                 <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Mã</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Thời gian</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Tổng tiền</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Trạng thái</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-300">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td className="px-4 py-3 font-mono dark:text-gray-300">#{order.id.slice(-4).toUpperCase()}</td>
                                    <td className="px-4 py-3 dark:text-gray-300">{formatTimestamp(order.timestamp)}</td>
                                    <td className="px-4 py-3 font-bold dark:text-white">{new Intl.NumberFormat('vi-VN').format(order.totalAmount)}đ</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            order.status === OrderStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                                            order.status === OrderStatus.CANCELLED ? 'bg-gray-100 text-gray-600' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handlePrint(order)} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                                            <PrinterIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             )}
             {selectedOrder && <InvoiceModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </div>
    );
};
