
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  addEmployee, 
  deleteEmployee, 
  updateEmployee,
  addShift,
  deleteShift,
  updateShift,
  addLocation,
  updateLocation,
  deleteLocation,
  addJobTitle,
  updateJobTitle,
  getInitialData,
  processAttendanceRequest,
} from '../services/attendanceService';
import { loadFaceModels, detectFace } from '../services/faceService';
import type { Employee, AttendanceRecord, Shift, Location, JobTitle, AttendanceRequest, AdminAccount } from '../types';
import { AttendanceStatus, RequestStatus } from '../types';
import QRCodeGenerator from './QRCodeGenerator';
import { QrCodeIcon, UserGroupIcon, ListBulletIcon, LogoutIcon, ClockIcon, CalendarDaysIcon, XCircleIcon, MapPinIcon, BuildingOffice2Icon, LoadingIcon, CameraIcon, ArrowPathIcon, CurrencyDollarIcon, TagIcon, EyeIcon, InboxStackIcon, ExclamationTriangleIcon, CubeIcon, ClipboardDocumentListIcon, CheckCircleIcon, ChartBarIcon, ReceiptPercentIcon } from './icons';
import { formatTimestamp, formatDateForDisplay, getWeekRange, getMonthRange, formatTimeToHHMM, calculateHours } from '../utils/date';
import { MenuManager, OrderList } from './FnbManagement';
import { RevenueReport, InvoiceManagement } from './FnbAnalytics';

type Tab = 'timesheet' | 'logs' | 'employees' | 'shifts' | 'locations' | 'jobTitles' | 'payroll' | 'qrcode' | 'requests' | 'menu' | 'orders' | 'invoices' | 'reports';

interface AdminDashboardProps {
  admin: AdminAccount;
  onLogout: () => void;
  onImpersonate: (employee: Employee) => void;
}

const FaceSmileIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
    </svg>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ admin, onLogout, onImpersonate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('timesheet');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [enrollingEmployee, setEnrollingEmployee] = useState<Employee | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getInitialData(admin.companyId);
      setEmployees(data.employees);
      setRecords(data.records);
      setShifts(data.shifts);
      setLocations(data.locations);
      setJobTitles(data.jobTitles);
      setRequests(data.requests);
    } catch (err: any) {
      setError("Không thể tải dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [admin.companyId]);

  const handleAddEmployee = async (e: any) => {
      await addEmployee(admin.companyId, e.name, e.username, e.password, e.shiftId, e.locationId, e.jobTitleId);
      loadData();
  };

  const handleAddShift = async (name: string, start: string, end: string) => {
    await addShift(admin.companyId, name, start, end);
    loadData();
  };

  const handleAddLocation = async (loc: any) => {
    await addLocation(admin.companyId, loc);
    loadData();
  };

  const handleAddJobTitle = async (name: string, rate: number) => {
    await addJobTitle(admin.companyId, name, rate);
    loadData();
  };

  const renderContent = () => {
    if (isLoading) return <LoadingIcon className="h-10 w-10 mx-auto" />;
    switch (activeTab) {
      case 'timesheet': return <AttendanceTimesheet employees={employees} records={records} />;
      case 'employees': return <EmployeeManagement employees={employees} shifts={shifts} locations={locations} jobTitles={jobTitles} onAddEmployee={handleAddEmployee} onDeleteEmployee={async (id:string) => { await deleteEmployee(id); loadData(); }} onImpersonate={onImpersonate} onEnrollFace={setEnrollingEmployee} onEditEmployee={setEditingEmployee} />;
      case 'shifts': return <ShiftManagement shifts={shifts} onAddShift={handleAddShift} onDeleteShift={async (id:string) => { await deleteShift(id); loadData(); }} />;
      case 'locations': return <LocationManagement locations={locations} onAddLocation={handleAddLocation} onDeleteLocation={async (id:string) => { await deleteLocation(id); loadData(); }} />;
      case 'jobTitles': return <JobTitleManagement jobTitles={jobTitles} onAddJobTitle={handleAddJobTitle} />;
      case 'qrcode': return <QRCodeGenerator locations={locations} />;
      case 'requests': return <RequestManagement requests={requests} onProcess={async (req, action) => { await processAttendanceRequest(req, action); loadData(); }} onViewImage={setViewingImage} error={null} />;
      case 'payroll': return <Payroll employees={employees} records={records} jobTitles={jobTitles} />;
      case 'logs': return <AttendanceLog records={records} onViewImage={setViewingImage} />;
      case 'menu': return <MenuManager companyId={admin.companyId} />;
      case 'orders': return <OrderList companyId={admin.companyId} />;
      case 'invoices': return <InvoiceManagement companyId={admin.companyId} />;
      case 'reports': return <RevenueReport companyId={admin.companyId} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col overflow-y-auto">
        <div className="p-4 border-b dark:border-gray-700 flex flex-col">
          <div className="bg-primary-600 p-2 rounded-lg w-fit mb-2"><UserGroupIcon className="h-6 w-6 text-white"/></div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white truncate">{admin.name}</h1>
          <p className="text-xs text-gray-500 uppercase">Admin công ty</p>
        </div>
        <ul className="flex-grow p-2 space-y-1">
          <TabButton icon={<CalendarDaysIcon className="h-5 w-5"/>} label="Bảng chấm công" isActive={activeTab === 'timesheet'} onClick={() => setActiveTab('timesheet')} />
          <TabButton icon={<InboxStackIcon className="h-5 w-5"/>} label="Yêu cầu" isActive={activeTab === 'requests'} onClick={() => setActiveTab('requests')} />
          <TabButton icon={<UserGroupIcon className="h-5 w-5"/>} label="Nhân viên" isActive={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
          <TabButton icon={<ClockIcon className="h-5 w-5"/>} label="Ca làm việc" isActive={activeTab === 'shifts'} onClick={() => setActiveTab('shifts')} />
          <TabButton icon={<BuildingOffice2Icon className="h-5 w-5"/>} label="Địa điểm" isActive={activeTab === 'locations'} onClick={() => setActiveTab('locations')} />
          <TabButton icon={<QrCodeIcon className="h-5 w-5"/>} label="Mã QR" isActive={activeTab === 'qrcode'} onClick={() => setActiveTab('qrcode')} />
          <div className="border-t my-2 dark:border-gray-700"></div>
          <TabButton icon={<ChartBarIcon className="h-5 w-5"/>} label="Báo cáo F&B" isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <TabButton icon={<CubeIcon className="h-5 w-5"/>} label="Thực đơn" isActive={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
        </ul>
        <div className="p-2 border-t dark:border-gray-700"><button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100"><LogoutIcon className="h-5 w-5"/> Đăng xuất</button></div>
      </nav>
      <main className="flex-1 p-10 overflow-y-auto">{renderContent()}</main>
      {enrollingEmployee && <FaceEnrollmentModal employee={enrollingEmployee} onClose={() => setEnrollingEmployee(null)} onSave={async (id, up) => { await updateEmployee(id, up); loadData(); }} />}
    </div>
  );
};

const TabButton: React.FC<{icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void}> = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md ${isActive ? 'bg-primary-100 text-primary-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
    {icon} <span>{label}</span>
  </button>
);

const AttendanceLog: React.FC<{ records: AttendanceRecord[], onViewImage: (url: string) => void }> = ({ records, onViewImage }) => {
    return (
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nhân viên</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Thời gian</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Loại</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {records.map((record) => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{record.employeeName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatTimestamp(record.timestamp)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === AttendanceStatus.CHECK_IN ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {record.status === AttendanceStatus.CHECK_IN ? 'Check-in' : 'Check-out'}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                   {record.latitude && <a href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`} target="_blank" rel="noreferrer" className="text-blue-600"><MapPinIcon className="h-5 w-5"/></a>}
                   {record.selfieImage && <button onClick={() => onViewImage(record.selfieImage!)} className="text-blue-600"><CameraIcon className="h-5 w-5"/></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
};

const EmployeeManagement: React.FC<any> = ({ employees, shifts, locations, jobTitles, onAddEmployee, onDeleteEmployee, onEditEmployee, onEnrollFace, onImpersonate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState({ name: '', username: '', password: '', shiftId: '', locationId: '', jobTitleId: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddEmployee(newEmployee);
        setNewEmployee({ name: '', username: '', password: '', shiftId: '', locationId: '', jobTitleId: '' });
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">Thêm nhân viên</button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((emp: Employee) => (
                    <div key={emp.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow relative">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                    {emp.name} {emp.faceDescriptor && <span className="text-green-500"><FaceSmileIcon className="h-5 w-5" /></span>}
                                </h3>
                                <p className="text-sm text-gray-500">@{emp.username}</p>
                            </div>
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 text-xs px-2 py-1 rounded font-mono">{emp.deviceCode}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                             <button onClick={() => onEnrollFace(emp)} className="text-xs px-2 py-1 rounded border border-gray-200">Face ID</button>
                             <button onClick={() => onImpersonate(emp)} className="text-yellow-600 text-xs ml-auto">Giả lập</button>
                             <button onClick={() => onDeleteEmployee(emp.id)} className="text-red-600 text-xs">Xóa</button>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-3">
                        <h3 className="text-lg font-bold">Thêm Nhân viên</h3>
                        <input placeholder="Họ tên" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} required />
                        <input placeholder="Username" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={newEmployee.username} onChange={e => setNewEmployee({...newEmployee, username: e.target.value})} required />
                        <input type="password" placeholder="Mật khẩu" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={newEmployee.password} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} required />
                        <select className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={newEmployee.shiftId} onChange={e => setNewEmployee({...newEmployee, shiftId: e.target.value})}>
                            <option value="">-- Chọn Ca --</option>
                            {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500">Hủy</button>
                            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Thêm</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const ShiftManagement: React.FC<any> = ({ shifts, onAddShift, onDeleteShift }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newShift, setNewShift] = useState({ name: '', start: '', end: '' });
    return (
        <div className="space-y-6">
             <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md">Thêm ca</button>
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                    <thead><tr className="text-left text-xs uppercase text-gray-500"><th className="px-6 py-3">Tên ca</th><th className="px-6 py-3">Vào</th><th className="px-6 py-3">Ra</th><th className="px-6 py-3"></th></tr></thead>
                    <tbody className="divide-y dark:divide-gray-700">
                        {shifts.map((s: Shift) => (
                            <tr key={s.id}><td className="px-6 py-4 dark:text-white">{s.name}</td><td className="px-6 py-4 dark:text-gray-300">{s.startTime}</td><td className="px-6 py-4 dark:text-gray-300">{s.endTime}</td><td className="px-6 py-4 text-right"><button onClick={() => onDeleteShift(s.id)} className="text-red-500">Xóa</button></td></tr>
                        ))}
                    </tbody>
                </table>
             </div>
             {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={(e)=>{e.preventDefault(); onAddShift(newShift.name, newShift.start, newShift.end); setIsModalOpen(false);}} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-3">
                        <h3 className="text-lg font-bold">Thêm Ca</h3>
                        <input placeholder="Tên ca" className="w-full p-2 border rounded dark:bg-gray-700" value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} required />
                        <div className="flex gap-2">
                          <input type="time" className="flex-1 p-2 border rounded dark:bg-gray-700" value={newShift.start} onChange={e => setNewShift({...newShift, start: e.target.value})} required />
                          <input type="time" className="flex-1 p-2 border rounded dark:bg-gray-700" value={newShift.end} onChange={e => setNewShift({...newShift, end: e.target.value})} required />
                        </div>
                        <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded">Lưu</button>
                    </form>
                </div>
            )}
        </div>
    )
};

const LocationManagement: React.FC<any> = ({ locations, onAddLocation, onDeleteLocation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newLoc, setNewLoc] = useState({ name: '', lat: '', lng: '', radius: '100' });
    return (
        <div className="space-y-6">
             <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md">Thêm địa điểm</button>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {locations.map((loc: Location) => (
                    <div key={loc.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h3 className="font-bold dark:text-white mb-2">{loc.name}</h3>
                        <p className="text-xs text-gray-500">R: {loc.radius}m | Lat: {loc.latitude}</p>
                        <button onClick={() => onDeleteLocation(loc.id)} className="mt-4 text-red-500 text-xs">Xóa</button>
                    </div>
                ))}
             </div>
             {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={(e)=>{e.preventDefault(); onAddLocation({name:newLoc.name, latitude:parseFloat(newLoc.lat), longitude:parseFloat(newLoc.lng), radius:parseFloat(newLoc.radius)}); setIsModalOpen(false);}} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-3">
                        <h3 className="text-lg font-bold">Thêm Địa điểm</h3>
                        <input placeholder="Tên" className="w-full p-2 border rounded dark:bg-gray-700" value={newLoc.name} onChange={e => setNewLoc({...newLoc, name: e.target.value})} required />
                        <input placeholder="Vĩ độ" className="w-full p-2 border rounded dark:bg-gray-700" value={newLoc.lat} onChange={e => setNewLoc({...newLoc, lat: e.target.value})} required />
                        <input placeholder="Kinh độ" className="w-full p-2 border rounded dark:bg-gray-700" value={newLoc.lng} onChange={e => setNewLoc({...newLoc, lng: e.target.value})} required />
                        <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded">Lưu</button>
                    </form>
                </div>
            )}
        </div>
    )
};

const JobTitleManagement: React.FC<any> = ({ jobTitles, onAddJobTitle }) => {
    return <div className="p-10 text-center text-gray-400 border-2 border-dashed rounded-lg">Quản lý chức vụ - Đang phát triển</div>
};

const SimpleBarChart = ({ data, labels, color = "#3b82f6", height = 150 }: { data: number[], labels: string[], color?: string, height?: number }) => {
    const max = Math.max(...data, 1) * 1.1; 
    return (
        <div className="w-full flex flex-col justify-end">
            <div className="relative w-full flex items-end justify-between gap-1" style={{ height: `${height}px` }}>
                {data.map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col justify-end group relative">
                        <div className="w-full rounded-t-sm transition-all duration-300 opacity-80 hover:opacity-100" style={{ height: `${(val / max) * 100}%`, backgroundColor: val > 0 ? color : '#e5e7eb' }}></div>
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">{val}h</div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                 {labels.map((l, idx) => (idx % 3 === 0) ? <span key={idx} className="text-center w-full">{l}</span> : null)}
            </div>
        </div>
    );
};

const AttendanceTimesheet: React.FC<{ employees: Employee[], records: AttendanceRecord[] }> = ({ employees, records }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const attendanceMap = useMemo(() => {
        const map: Record<string, Record<number, { status: string, isLate: boolean, isEarly: boolean, checkIn?: number, checkOut?: number }>> = {};
        records.forEach(r => {
            const d = new Date(r.timestamp);
            if (d.getMonth() === month && d.getFullYear() === year) {
                const day = d.getDate();
                if (!map[r.employeeId]) map[r.employeeId] = {};
                if (!map[r.employeeId][day]) map[r.employeeId][day] = { status: 'absent', isLate: false, isEarly: false };
                if (r.status === AttendanceStatus.CHECK_IN) { map[r.employeeId][day].checkIn = r.timestamp; if (r.isLate) map[r.employeeId][day].isLate = true; }
                else if (r.status === AttendanceStatus.CHECK_OUT) { map[r.employeeId][day].checkOut = r.timestamp; if (r.isEarly) map[r.employeeId][day].isEarly = true; }
            }
        });
        return map;
    }, [records, month, year]);

    const selectedEmployeeStats = useMemo(() => {
        if (!selectedEmployeeId) return null;
        const employeeName = employees.find(e => e.id === selectedEmployeeId)?.name || 'N/A';
        const empMap = attendanceMap[selectedEmployeeId] || {};
        const dailyData = daysArray.map(day => {
            const data = empMap[day];
            let hours = 0;
            if (data?.checkIn && data?.checkOut) hours = calculateHours(data.checkIn, data.checkOut);
            return { day, hours, ...data }
        });
        return { name: employeeName, dailyData, totalHours: dailyData.reduce((sum, d) => sum + d.hours, 0), labels: daysArray.map(d => `${d}`), hoursData: dailyData.map(d => d.hours) }
    }, [selectedEmployeeId, attendanceMap, employees, daysArray]);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(month-1)))} className="p-2 font-bold">&lt;</button>
                        <h3 className="text-xl font-bold dark:text-white capitalize">{selectedDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h3>
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(month+1)))} className="p-2 font-bold">&gt;</button>
                    </div>
                </div>
                <div className="overflow-x-auto border rounded-lg max-h-[400px]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-20">
                            <tr>
                                <th className="px-4 py-3 text-left sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">Nhân viên</th>
                                {daysArray.map(day => <th key={day} className="px-2 py-3 text-center min-w-[36px]">{day}</th>)}
                                <th className="px-4 py-3 text-center">Tổng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {employees.map(emp => {
                                let presentCount = 0;
                                return (
                                    <tr key={emp.id} className={`hover:bg-blue-50 cursor-pointer ${selectedEmployeeId === emp.id ? 'bg-blue-100' : ''}`} onClick={() => setSelectedEmployeeId(emp.id)}>
                                        <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-800 font-bold">{emp.name}</td>
                                        {daysArray.map(day => {
                                            const record = attendanceMap[emp.id]?.[day];
                                            if (record?.checkIn) presentCount++;
                                            return <td key={day} className="p-2 text-center">{record?.checkIn ? <span className={`w-3 h-3 rounded-full block mx-auto ${record.isLate ? 'bg-orange-400' : 'bg-green-500'}`}></span> : <span className="w-1.5 h-1.5 bg-gray-100 rounded-full block mx-auto"></span>}</td>
                                        })}
                                        <td className="px-4 py-3 text-center font-bold text-green-600">{presentCount}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedEmployeeStats && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-in slide-in-from-bottom duration-300">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b">
                        <div><h3 className="text-xl font-bold">{selectedEmployeeStats.name}</h3><p className="text-sm text-gray-500">Tháng {month + 1}/{year}</p></div>
                        <div className="text-right"><p className="text-sm text-gray-500">Tổng giờ công</p><p className="text-2xl font-bold text-blue-600">{selectedEmployeeStats.totalHours.toFixed(1)}h</p></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg"><SimpleBarChart data={selectedEmployeeStats.hoursData} labels={selectedEmployeeStats.labels} height={200} /></div>
                        <div className="lg:col-span-2 overflow-y-auto max-h-[300px] border rounded-lg">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0"><tr><th className="px-3 py-2 text-left">Ngày</th><th className="px-3 py-2">Vào</th><th className="px-3 py-2">Ra</th><th className="px-3 py-2">Giờ</th></tr></thead>
                                <tbody className="divide-y">
                                    {selectedEmployeeStats.dailyData.map((d) => (
                                        <tr key={d.day}>
                                            <td className="px-3 py-2 font-medium">{d.day}</td>
                                            <td className="px-3 py-2 text-center">{d.checkIn ? formatTimeToHHMM(d.checkIn) : '-'}</td>
                                            <td className="px-3 py-2 text-center">{d.checkOut ? formatTimeToHHMM(d.checkOut) : '-'}</td>
                                            <td className="px-3 py-2 text-center font-bold">{d.hours > 0 ? d.hours.toFixed(1) : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Payroll: React.FC<{ employees: Employee[], records: AttendanceRecord[], jobTitles: JobTitle[] }> = ({ employees, records, jobTitles }) => {
    return <div className="p-10 text-center text-gray-400">Bảng lương - Đang phát triển</div>
};

const RequestManagement: React.FC<{ requests: AttendanceRequest[], onProcess: (req: AttendanceRequest, action: 'approve' | 'reject') => void, onViewImage: (url: string) => void, error: any }> = ({ requests, onProcess, onViewImage }) => {
    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700"><tr className="text-left text-xs uppercase text-gray-500"><th className="px-6 py-3">Nhân viên</th><th className="px-6 py-3">Lý do</th><th className="px-6 py-3">Trạng thái</th><th className="px-6 py-3"></th></tr></thead>
                <tbody className="divide-y dark:divide-gray-700">
                    {requests.map(req => (
                        <tr key={req.id}>
                            <td className="px-6 py-4 dark:text-white"><div>{req.employeeName}</div><div className="text-xs text-gray-500">{formatTimestamp(req.timestamp)}</div></td>
                            <td className="px-6 py-4 dark:text-gray-300 text-sm max-w-xs truncate">{req.reason}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${req.status === RequestStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{req.status}</span></td>
                            <td className="px-6 py-4 text-right space-x-2">
                                {req.status === RequestStatus.PENDING && (
                                    <><button onClick={() => onProcess(req, 'approve')} className="text-green-600 font-bold">Duyệt</button><button onClick={() => onProcess(req, 'reject')} className="text-red-600 font-bold">Từ chối</button></>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const FaceEnrollmentModal: React.FC<{ employee: Employee, onClose: () => void, onSave: (id: string, updates: Partial<Employee>) => Promise<any> }> = ({ employee, onClose, onSave }) => {
    const [step, setStep] = useState<'camera' | 'processing' | 'success'>('camera');
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true }).then(s => { if (videoRef.current) videoRef.current.srcObject = s; });
        loadFaceModels();
        return () => { (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop()); };
    }, []);
    const handleCapture = async () => {
        if (!videoRef.current) return;
        setStep('processing');
        const d = await detectFace(videoRef.current);
        if (d) {
            await onSave(employee.id, { faceDescriptor: JSON.stringify(Array.from(d.descriptor)) });
            setStep('success');
        } else { alert("Không tìm thấy mặt!"); setStep('camera'); }
    };
    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Đăng ký Face ID: {employee.name}</h3>
                {step === 'camera' && (
                    <div className="space-y-4">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video bg-black rounded object-cover" />
                        <div className="flex gap-2"><button onClick={onClose} className="flex-1 py-2 bg-gray-200 rounded">Hủy</button><button onClick={handleCapture} className="flex-1 py-2 bg-blue-600 text-white rounded">Chụp</button></div>
                    </div>
                )}
                {step === 'processing' && <div className="py-10 text-center"><LoadingIcon className="h-10 w-10 mx-auto text-blue-500" /><p className="mt-2">Đang xử lý...</p></div>}
                {step === 'success' && <div className="py-10 text-center"><CheckCircleIcon className="h-12 w-12 mx-auto text-green-500" /><p className="mt-2 font-bold">Thành công!</p><button onClick={onClose} className="mt-4 px-6 py-2 bg-green-600 text-white rounded">Đóng</button></div>}
            </div>
        </div>
    );
};

export default AdminDashboard;
