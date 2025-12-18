
import React, { useState, useEffect, useMemo } from 'react';
import { getAllOrdersHistory } from '../services/posService';
import type { Order } from '../types';
import { OrderStatus } from '../types';
import { formatTimestamp } from '../utils/date';
import { LoadingIcon, PrinterIcon, BanknotesIcon, ChartBarIcon, ClipboardDocumentListIcon, ArrowPathIcon, TagIcon, UserGroupIcon } from './icons';

// --- COLORS ---
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// --- CUSTOM SVG CHARTS ---

const AreaChart = ({ data, labels, color = "#3b82f6", height = 200 }: { data: number[], labels: string[], color?: string, height?: number }) => {
    const max = Math.max(...data, 1) * 1.1; // Add 10% padding
    const points = data.map((val, idx) => {
        const x = (idx / (data.length - 1)) * 100;
        const y = height - (val / max) * height;
        return `${x},${y}`;
    }).join(" ");

    return (
        <div className="w-full flex flex-col justify-end">
            <div className="relative w-full" style={{ height: `${height}px` }}>
                <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
                        <line key={i} x1="0" y1={height * t} x2="100" y2={height * t} stroke="#e5e7eb" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                    ))}
                    
                    {/* Area */}
                    <polygon
                        fill={color}
                        fillOpacity="0.15"
                        points={`0,${height} ${points} 100,${height}`}
                        vectorEffect="non-scaling-stroke"
                    />
                    {/* Line */}
                    <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        points={points}
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {/* Dots */}
                    {data.map((val, idx) => {
                        const x = (idx / (data.length - 1)) * 100;
                        const y = height - (val / max) * height;
                        return (
                             <g key={idx} className="group">
                                <circle cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" className="transition-all duration-200 group-hover:r-5" />
                                {/* Simple Tooltip */}
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                    <rect x={x - 15} y={y - 30} width="30" height="20" rx="4" fill="#1f2937" vectorEffect="non-scaling-stroke" />
                                    <text x={x} y={y - 16} textAnchor="middle" fill="white" fontSize="10" vectorEffect="non-scaling-stroke">
                                        {new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(val)}
                                    </text>
                                </g>
                             </g>
                        )
                    })}
                </svg>
            </div>
            <div className="flex justify-between mt-3 text-[10px] text-gray-400 uppercase tracking-wider">
                 {labels.map((l, idx) => (
                     // Show only some labels if too many
                     (data.length > 10 && idx % 2 !== 0) ? null : <span key={idx}>{l}</span>
                 ))}
            </div>
        </div>
    );
};

const DonutChart = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) return <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>;

    return (
        <div className="flex items-center justify-center gap-8">
            <div className="relative h-48 w-48 flex-shrink-0">
                <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }} className="w-full h-full overflow-visible">
                     {data.map((item, index) => {
                         const percent = item.value / total;
                         const dashArray = percent * 100;
                         const offset = data.slice(0, index).reduce((acc, cur) => acc + (cur.value/total)*100, 0);
                         
                         // Using stroke-dasharray on a circle is easier for donut
                         return (
                             <circle
                                key={index}
                                cx="0" cy="0" r="0.8" // Radius
                                fill="transparent"
                                stroke={item.color}
                                strokeWidth="0.35" // Thickness
                                strokeDasharray={`${dashArray} ${100 - dashArray}`} // [painted, gap] relative to circumference (approx 2*PI*r, but normalized here via pathLength)
                                strokeDashoffset={-offset}
                                pathLength="100"
                                className="hover:opacity-80 transition-opacity"
                             >
                                <title>{item.label}: {new Intl.NumberFormat('vi-VN').format(item.value)}</title>
                             </circle>
                         )
                     })}
                     <circle cx="0" cy="0" r="0.6" fill="white" className="dark:fill-gray-800" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-gray-500">Tổng</span>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">{new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(total)}</span>
                </div>
            </div>
            <div className="space-y-2">
                {data.map((item, idx) => (
                    <div key={idx} className="flex items-center text-sm">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                        <span className="text-gray-600 dark:text-gray-300 flex-1 mr-4">{item.label}</span>
                        <span className="font-bold text-gray-800 dark:text-white">
                            {Math.round((item.value / total) * 100)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HorizontalBarChart = ({ data }: { data: { label: string, value: number, subValue?: string }[] }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="space-y-4">
            {data.map((item, idx) => (
                <div key={idx} className="relative">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                        <span className="font-bold text-gray-900 dark:text-white">{item.subValue || new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(item.value)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                            style={{ width: `${(item.value / max) * 100}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                        ></div>
                    </div>
                </div>
            ))}
             {data.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Chưa có dữ liệu</p>}
        </div>
    );
}

// --- ANALYTICS COMPONENT ---

export const RevenueReport: React.FC<{ companyId: string }> = ({ companyId }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

    useEffect(() => {
        loadData();
    }, [companyId]);

    const loadData = async () => {
        setIsLoading(true);
        const data = await getAllOrdersHistory(companyId);
        setOrders(data);
        setIsLoading(false);
    };

    const stats = useMemo(() => {
        const now = new Date();
        let filteredOrders = orders;
        let labels: string[] = [];
        let revenueData: number[] = [];
        
        // Filter by Time Range
        if (timeRange === 'today') {
            const startOfDay = new Date(now.setHours(0,0,0,0)).getTime();
            filteredOrders = orders.filter(o => o.timestamp >= startOfDay);
            // Hourly Data
            labels = Array.from({length: 24}, (_, i) => `${i}h`);
            revenueData = new Array(24).fill(0);
            filteredOrders.forEach(o => {
                if (o.status === OrderStatus.COMPLETED) {
                    const h = new Date(o.timestamp).getHours();
                    revenueData[h] += o.totalAmount;
                }
            });
        } else if (timeRange === 'week') {
             // Start of 6 days ago
             const d = new Date();
             d.setDate(d.getDate() - 6);
             d.setHours(0,0,0,0);
             const startOfWeek = d.getTime();

             filteredOrders = orders.filter(o => o.timestamp >= startOfWeek);
             // Daily Data (Last 7 days)
             for(let i=6; i>=0; i--) {
                 const d = new Date();
                 d.setDate(new Date().getDate() - i);
                 labels.push(`${d.getDate()}/${d.getMonth()+1}`);
                 const start = new Date(d.setHours(0,0,0,0)).getTime();
                 const end = new Date(d.setHours(23,59,59,999)).getTime();
                 const val = filteredOrders
                    .filter(o => o.timestamp >= start && o.timestamp <= end && o.status === OrderStatus.COMPLETED)
                    .reduce((sum, o) => sum + o.totalAmount, 0);
                 revenueData.push(val);
             }
        } else if (timeRange === 'month') {
             // Current Month
             const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
             filteredOrders = orders.filter(o => o.timestamp >= startOfMonth);
             
             const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
             labels = [];
             for(let i=1; i<=daysInMonth; i++) {
                if (i % 5 === 0 || i === 1 || i === daysInMonth) labels.push(`${i}`);
                else labels.push('');
             }

             revenueData = new Array(daysInMonth).fill(0);
             filteredOrders.forEach(o => {
                 if(o.status === OrderStatus.COMPLETED) {
                     const d = new Date(o.timestamp).getDate();
                     revenueData[d-1] += o.totalAmount;
                 }
             });
        }

        const completedOrders = filteredOrders.filter(o => o.status === OrderStatus.COMPLETED);
        const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const totalCount = filteredOrders.length;
        const avgOrderValue = completedOrders.length ? totalRevenue / completedOrders.length : 0;

        const paymentMap = {'CASH': 0, 'TRANSFER': 0};
        completedOrders.forEach(o => {
            if (o.paymentMethod === 'CASH') paymentMap['CASH']++;
            else paymentMap['TRANSFER']++;
        });
        const paymentData = [
            { label: 'Tiền mặt', value: paymentMap['CASH'], color: '#3b82f6' },
            { label: 'Chuyển khoản', value: paymentMap['TRANSFER'], color: '#10b981' }
        ];

        const staffMap = new Map<string, number>();
        completedOrders.forEach(o => {
            const name = o.staffName || 'Unknown';
            staffMap.set(name, (staffMap.get(name) || 0) + o.totalAmount);
        });
        const staffData = Array.from(staffMap.entries())
            .map(([label, value]) => ({ label, value, subValue: new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(value) + 'đ' }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        const productMap = new Map<string, {qty: number, rev: number}>();
        completedOrders.forEach(o => {
            o.items.forEach(i => {
                const curr = productMap.get(i.productName) || {qty: 0, rev: 0};
                productMap.set(i.productName, { qty: curr.qty + i.quantity, rev: curr.rev + (i.price * i.quantity) });
            });
        });
        const topProductsByRev = Array.from(productMap.entries())
            .map(([label, val]) => ({ label, value: val.rev, subValue: new Intl.NumberFormat('vi-VN').format(val.rev) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        const statusMap = { [OrderStatus.COMPLETED]: 0, [OrderStatus.CANCELLED]: 0, 'OTHER': 0 };
        filteredOrders.forEach(o => {
             if (o.status === OrderStatus.COMPLETED) statusMap[OrderStatus.COMPLETED]++;
             else if (o.status === OrderStatus.CANCELLED) statusMap[OrderStatus.CANCELLED]++;
             else statusMap['OTHER']++;
        });
        const statusData = [
            { label: 'Hoàn thành', value: statusMap[OrderStatus.COMPLETED], color: '#10b981' },
            { label: 'Đã hủy', value: statusMap[OrderStatus.CANCELLED], color: '#ef4444' },
             { label: 'Khác', value: statusMap['OTHER'], color: '#f59e0b' }
        ];

        return {
            totalRevenue,
            totalCount,
            avgOrderValue,
            revenueData,
            labels,
            paymentData,
            staffData,
            topProductsByRev,
            statusData
        };
    }, [orders, timeRange]);

    if (isLoading) return <div className="flex justify-center p-12"><LoadingIcon className="h-12 w-12 text-primary-500" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    <button onClick={() => setTimeRange('today')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${timeRange === 'today' ? 'bg-white dark:bg-gray-600 text-primary-600 shadow' : 'text-gray-500 dark:text-gray-300'}`}>Hôm nay</button>
                    <button onClick={() => setTimeRange('week')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${timeRange === 'week' ? 'bg-white dark:bg-gray-600 text-primary-600 shadow' : 'text-gray-500 dark:text-gray-300'}`}>7 ngày qua</button>
                    <button onClick={() => setTimeRange('month')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${timeRange === 'month' ? 'bg-white dark:bg-gray-600 text-primary-600 shadow' : 'text-gray-500 dark:text-gray-300'}`}>Tháng này</button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-100 font-medium">Tổng doanh thu</p>
                            <h3 className="text-3xl font-bold mt-2">{new Intl.NumberFormat('vi-VN').format(stats.totalRevenue)}đ</h3>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg"><BanknotesIcon className="h-6 w-6"/></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Tổng đơn hàng</p>
                            <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stats.totalCount}</h3>
                        </div>
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><ClipboardDocumentListIcon className="h-6 w-6"/></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Giá trị trung bình/đơn</p>
                            <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(stats.avgOrderValue)}đ</h3>
                        </div>
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><TagIcon className="h-6 w-6"/></div>
                    </div>
                </div>
            </div>

            {/* Main Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <ChartBarIcon className="h-5 w-5 text-primary-500"/>
                        Biểu đồ Doanh thu
                    </h3>
                    <AreaChart data={stats.revenueData} labels={stats.labels} />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Thanh toán</h3>
                    <DonutChart data={stats.paymentData} />
                </div>
            </div>

            {/* Secondary Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <UserGroupIcon className="h-5 w-5 text-purple-500"/> Top Nhân viên
                    </h3>
                    <HorizontalBarChart data={stats.staffData} />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                         <TagIcon className="h-5 w-5 text-orange-500"/> Top Sản phẩm (Doanh thu)
                    </h3>
                    <HorizontalBarChart data={stats.topProductsByRev} />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                     <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Tỷ lệ đơn hàng</h3>
                     <DonutChart data={stats.statusData} />
                </div>
            </div>
        </div>
    );
};

export const InvoiceManagement: React.FC<{ companyId: string }> = ({ companyId }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        loadData();
    }, [companyId]);

    const loadData = async () => {
        setIsLoading(true);
        const data = await getAllOrdersHistory(companyId);
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
                    <p className="text-sm text-gray-500">Mã đơn: #{order.id.slice(-4).toUpperCase()}</p>
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
