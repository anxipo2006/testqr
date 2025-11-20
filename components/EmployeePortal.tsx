
import React, { useState, useEffect } from 'react';
import type { Employee, AttendanceRecord, JobTitle, CurrentUser } from '../types';
import { AttendanceStatus } from '../types';
import { getRecordsForEmployee, getLastRecordForEmployee, getShifts, getLocations, getJobTitles } from '../services/attendanceService';
import AttendanceScanner from './AttendanceScanner';
import { POSTerminal, OrderList } from './FnbManagement';
import { formatTimestamp, getWeekRange, getMonthRange, getYearRange, calculateHours, formatDateForDisplay } from '../utils/date';
import { LogoutIcon, MapPinIcon, LoadingIcon, CurrencyDollarIcon, CalendarDaysIcon, ArrowUturnLeftIcon, ShoppingBagIcon, ClipboardDocumentListIcon } from './icons';

interface EmployeePortalProps {
  employee: Employee;
  onLogout: () => void;
  impersonatingAdmin: CurrentUser | null;
  onStopImpersonation: () => void;
}

type Period = 'week' | 'month' | 'year';
type EmployeeTab = 'attendance' | 'pos' | 'orders';

const EmployeePortal: React.FC<EmployeePortalProps> = ({ employee, onLogout, impersonatingAdmin, onStopImpersonation }) => {
  const [activeTab, setActiveTab] = useState<EmployeeTab>('attendance');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [lastStatus, setLastStatus] = useState<AttendanceStatus | null>(null);
  const [shiftInfo, setShiftInfo] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<JobTitle | null>(null);
  const [periodHours, setPeriodHours] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  const handleDateChange = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
        const newDate = new Date(prev);
        const amount = direction === 'prev' ? -1 : 1;
        switch(period) {
            case 'month':
                newDate.setMonth(prev.getMonth() + amount);
                break;
            case 'year':
                newDate.setFullYear(prev.getFullYear() + amount);
                break;
            case 'week':
            default:
                newDate.setDate(prev.getDate() + (amount * 7));
                break;
        }
        return newDate;
    });
  };

  const renderDateHeader = () => {
     switch (period) {
        case 'month':
            return currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
        case 'year':
            return currentDate.getFullYear();
        case 'week':
        default:
             const { weekStart, weekEnd } = getWeekRange(currentDate);
             return `${formatDateForDisplay(weekStart)} - ${formatDateForDisplay(weekEnd)}`;
    }
  }

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const [employeeRecords, lastRecord, allShifts, allLocations, allJobTitles] = await Promise.all([
            getRecordsForEmployee(employee.id),
            getLastRecordForEmployee(employee.id),
            getShifts(),
            getLocations(),
            getJobTitles(),
        ]);

        setRecords(employeeRecords);
        setLastStatus(lastRecord ? lastRecord.status : null);

        // Set shift info
        if (employee.shiftId) {
            const currentShift = allShifts.find(s => s.id === employee.shiftId);
            setShiftInfo(currentShift ? `${currentShift.name} (${currentShift.startTime} - ${currentShift.endTime})` : "Ca làm việc đã bị xóa");
        } else {
            setShiftInfo("Chưa được phân ca");
        }
        
        // Set location info
        if(employee.locationId) {
            const currentLocation = allLocations.find(l => l.id === employee.locationId);
            setLocationInfo(currentLocation ? currentLocation.name : "Địa điểm đã bị xóa");
        } else {
            setLocationInfo("Chưa được phân địa điểm");
        }

        // Set job title info
        if (employee.jobTitleId) {
            const currentJobTitle = allJobTitles.find(jt => jt.id === employee.jobTitleId);
            setJobTitle(currentJobTitle || null);
        } else {
            setJobTitle(null);
        }
    } catch (err: any) {
        console.error("Failed to load employee data:", err);
        let errorMessage = "Không thể tải dữ liệu của bạn. Vui lòng thử đăng nhập lại hoặc liên hệ quản trị viên.";
        if (err && err.code === 'permission-denied') {
            errorMessage = "Lỗi quyền truy cập. Quản trị viên của bạn cần phải cập nhật Firestore Security Rules để cho phép nhân viên đọc dữ liệu.";
        } else if (err && err.code) {
            errorMessage = `Lỗi cơ sở dữ liệu: ${err.code}.`;
        }
        setError(errorMessage);
        setShiftInfo("Lỗi tải dữ liệu");
        setLocationInfo("Lỗi tải dữ liệu");
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employee.id]);

  useEffect(() => {
    let range;
    switch (period) {
        case 'month':
            const { monthStart, monthEnd } = getMonthRange(currentDate);
            range = { start: monthStart, end: monthEnd };
            break;
        case 'year':
            const { yearStart, yearEnd } = getYearRange(currentDate);
            range = { start: yearStart, end: yearEnd };
            break;
        case 'week':
        default:
            const { weekStart, weekEnd } = getWeekRange(currentDate);
            range = { start: weekStart, end: weekEnd };
            break;
    }

    const periodRecords = records.filter(r => r.timestamp >= range.start.getTime() && r.timestamp <= range.end.getTime());
    
    const checkInMap = new Map<string, number>();
    periodRecords.forEach(record => {
        const day = new Date(record.timestamp).toDateString();
        if (record.status === AttendanceStatus.CHECK_IN) {
            if (!checkInMap.has(day)) {
                checkInMap.set(day, record.timestamp);
            }
        }
    });
    
    let totalHours = 0;
    for (const [day, checkInTime] of checkInMap.entries()) {
        const dayStart = new Date(day).getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

        const checkOuts = periodRecords
        .filter(r => r.status === AttendanceStatus.CHECK_OUT && r.timestamp >= dayStart && r.timestamp <= dayEnd)
        .sort((a,b) => b.timestamp - a.timestamp);
        
        if (checkOuts.length > 0) {
            totalHours += calculateHours(checkInTime, checkOuts[0].timestamp);
        }
    }
    setPeriodHours(parseFloat(totalHours.toFixed(2)));

  }, [records, period, currentDate]);

  const nextActionText = lastStatus === AttendanceStatus.CHECK_IN ? 'Check-out' : 'Check-in';
  const estimatedSalary = jobTitle ? periodHours * jobTitle.hourlyRate : 0;
  const periodLabel = period === 'week' ? 'tuần' : period === 'month' ? 'tháng' : 'năm';

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col ${impersonatingAdmin ? 'pt-12' : ''}`}>
       {impersonatingAdmin && (
            <div className="bg-yellow-100 dark:bg-yellow-900/50 border-b-2 border-yellow-500 text-yellow-800 dark:text-yellow-200 text-center p-2 fixed top-0 left-0 right-0 z-50 shadow-lg">
                <div className="container mx-auto flex justify-center items-center gap-4 text-sm sm:text-base">
                    <span>Bạn đang xem với tư cách <strong>{employee.name}</strong>.</span>
                    <button onClick={onStopImpersonation} className="flex items-center gap-1.5 font-semibold hover:underline bg-yellow-200 dark:bg-yellow-800/50 px-3 py-1 rounded-md">
                        <ArrowUturnLeftIcon className="h-4 w-4" />
                        Quay lại trang Admin
                    </button>
                </div>
            </div>
        )}
       
       {/* Navigation Header */}
       <header className="bg-white dark:bg-gray-800 shadow-md z-10">
        <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
                <div>
                    <h1 className="text-lg font-bold text-gray-800 dark:text-white truncate">
                        {employee.name}
                    </h1>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {employee.username} | {employee.deviceCode}
                    </div>
                </div>
                
                <div className="hidden md:flex space-x-4">
                    <NavButton 
                        active={activeTab === 'attendance'} 
                        onClick={() => setActiveTab('attendance')} 
                        icon={<CalendarDaysIcon className="h-5 w-5" />}
                        label="Chấm công"
                    />
                    <NavButton 
                        active={activeTab === 'pos'} 
                        onClick={() => setActiveTab('pos')} 
                        icon={<ShoppingBagIcon className="h-5 w-5" />}
                        label="Bán hàng"
                    />
                    <NavButton 
                        active={activeTab === 'orders'} 
                        onClick={() => setActiveTab('orders')} 
                        icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                        label="Đơn hàng"
                    />
                </div>

                <button onClick={onLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600">
                   <LogoutIcon className="h-5 w-5"/>
                   <span className="hidden sm:inline">Đăng xuất</span>
                </button>
            </div>
        </div>
        {/* Mobile Nav */}
        <div className="md:hidden border-t dark:border-gray-700 flex justify-around p-2 bg-gray-50 dark:bg-gray-900">
            <NavButtonMobile 
                active={activeTab === 'attendance'} 
                onClick={() => setActiveTab('attendance')} 
                icon={<CalendarDaysIcon className="h-6 w-6" />}
                label="Chấm công"
            />
            <NavButtonMobile 
                active={activeTab === 'pos'} 
                onClick={() => setActiveTab('pos')} 
                icon={<ShoppingBagIcon className="h-6 w-6" />}
                label="Bán hàng"
            />
            <NavButtonMobile 
                active={activeTab === 'orders'} 
                onClick={() => setActiveTab('orders')} 
                icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
                label="Đơn hàng"
            />
        </div>
       </header>

       <main className="flex-grow container mx-auto p-4">
            {isLoading && activeTab === 'attendance' ? (
                <div className="flex justify-center mt-16">
                    <LoadingIcon className="h-12 w-12 text-primary-500"/>
                </div>
            ) : error && activeTab === 'attendance' ? (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-6 rounded-lg shadow" role="alert">
                    <p className="font-bold text-lg">Đã xảy ra lỗi</p>
                    <p className="mt-2">{error}</p>
                </div>
            ) : (
                <>
                    {/* Attendance Tab Content */}
                    {activeTab === 'attendance' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-8">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                                    <h2 className="text-lg font-semibold mb-4">Quét mã chấm công</h2>
                                    <AttendanceScanner employee={employee} onScanComplete={loadData} />
                                    
                                    <div className="mt-6 text-sm text-left text-gray-500 dark:text-gray-400 space-y-1 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                        <p>Ca làm việc: <strong>{shiftInfo}</strong></p>
                                        <p>Địa điểm: <strong>{locationInfo}</strong></p>
                                        <p>Trạng thái: <strong className={lastStatus === AttendanceStatus.CHECK_IN ? 'text-green-600' : 'text-red-600'}>{lastStatus === AttendanceStatus.CHECK_IN ? 'Đang làm việc' : 'Đã ra về'}</strong></p>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                            <CurrencyDollarIcon className="h-6 w-6 text-primary-500"/>
                                            <span>Thông tin lương</span>
                                        </h2>
                                        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                            <PeriodButton label="Tuần" isActive={period === 'week'} onClick={() => setPeriod('week')} />
                                            <PeriodButton label="Tháng" isActive={period === 'month'} onClick={() => setPeriod('month')} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4 justify-center">
                                        <button onClick={() => handleDateChange('prev')} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">{'<'}</button>
                                        <span className="font-semibold text-sm w-32 text-center">{renderDateHeader()}</span>
                                        <button onClick={() => handleDateChange('next')} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">{'>'}</button>
                                    </div>
                                    <div className="space-y-3 text-gray-700 dark:text-gray-300">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Chức vụ:</span>
                                            <span className="font-semibold">{jobTitle?.name || 'Chưa phân công'}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-t dark:border-gray-700 pt-3 mt-3">
                                            <span className="font-medium">Giờ công ({periodLabel}):</span>
                                            <span className="font-semibold text-lg text-blue-600 dark:text-blue-400">{periodHours} giờ</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/50 p-3 rounded-lg">
                                            <span className="font-bold">Lương ước tính:</span>
                                            <span className="font-bold text-xl text-green-600 dark:text-green-400">{formatCurrency(estimatedSalary)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Lịch sử chấm công</h2>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CalendarDaysIcon className="h-5 w-5 text-gray-400"/>
                                        <span>{records.length} bản ghi</span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto max-h-[70vh]">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Thời gian</th>
                                        <th scope="col" className="px-6 py-3">Trạng thái</th>
                                        <th scope="col" className="px-6 py-3">Vị trí</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {records.map(record => (
                                        <tr key={record.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4">{formatTimestamp(record.timestamp)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.status === AttendanceStatus.CHECK_IN ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                            {record.status === AttendanceStatus.CHECK_IN ? 'Check-in' : 'Check-out'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {record.latitude && record.longitude ? (
                                            <a href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                                                <MapPinIcon className="h-4 w-4" />
                                                <span>Xem vị trí</span>
                                            </a>
                                            ) : (
                                            <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                {records.length === 0 && <p className="text-center py-8 text-gray-500">Chưa có dữ liệu chấm công.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* POS Tab Content */}
                    {activeTab === 'pos' && (
                        <div className="h-full">
                            <POSTerminal currentUser={{ name: employee.name, id: employee.id }} />
                        </div>
                    )}

                    {/* Orders Tab Content */}
                    {activeTab === 'orders' && (
                        <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow">
                            <OrderList />
                        </div>
                    )}
                </>
            )}
       </main>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            active 
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const NavButtonMobile: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full py-2 ${
            active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
        }`}
    >
        {icon}
        <span className="text-xs mt-1">{label}</span>
    </button>
);

const PeriodButton: React.FC<{ label: string, isActive: boolean, onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            isActive 
            ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm' 
            : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
    >
        {label}
    </button>
);

export default EmployeePortal;
