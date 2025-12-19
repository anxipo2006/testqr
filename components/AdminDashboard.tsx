
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
  subscribeToRecentRecords
} from '../services/attendanceService';
import { loadFaceModels, detectFace } from '../services/faceService';
import type { Employee, AttendanceRecord, Shift, Location, JobTitle, AttendanceRequest, AdminAccount } from '../types';
import { AttendanceStatus, RequestStatus } from '../types';
import QRCodeGenerator from './QRCodeGenerator';
import { QrCodeIcon, UserGroupIcon, ListBulletIcon, LogoutIcon, ClockIcon, CalendarDaysIcon, XCircleIcon, MapPinIcon, BuildingOffice2Icon, LoadingIcon, CameraIcon, ArrowPathIcon, CurrencyDollarIcon, TagIcon, EyeIcon, InboxStackIcon, ExclamationTriangleIcon, CubeIcon, ClipboardDocumentListIcon, CheckCircleIcon, ChartBarIcon, ReceiptPercentIcon, PlusIcon, ShoppingBagIcon } from './icons';
import { formatTimestamp, formatTimeToHHMM, calculateHours } from '../utils/date';
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
  
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [enrollingEmployee, setEnrollingEmployee] = useState<Employee | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getInitialData(admin.companyId);
      setEmployees(data.employees);
      setRecords(data.records);
      setShifts(data.shifts);
      setLocations(data.locations);
      setJobTitles(data.jobTitles);
      setRequests(data.requests);
    } catch (err) {
      console.error("Lỗi tải dữ liệu", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Real-time subscription for records
    const unsubscribe = subscribeToRecentRecords(admin.companyId, (newRecords) => {
        setRecords(newRecords);
    });
    
    return () => unsubscribe();
  }, [admin.companyId]);

  const handleUpdateEmployee = async (id: string, updates: Partial<Employee>) => {
    await updateEmployee(id, updates);
    setEditingEmployee(null);
    setEnrollingEmployee(null);
    loadData();
  };

  const handleUpdateLocation = async (id: string, updates: Partial<Location>) => {
    await updateLocation(id, updates);
    setEditingLocation(null);
    loadData();
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-20"><LoadingIcon className="h-12 w-12 text-primary-500" /></div>;
    switch (activeTab) {
      case 'timesheet': return <AttendanceTimesheet employees={employees} records={records} />;
      case 'employees': return <EmployeeManagement employees={employees} shifts={shifts} locations={locations} jobTitles={jobTitles} onAddEmployee={async (e:any) => { await addEmployee(admin.companyId, e.name, e.username, e.password, e.shiftId, e.locationId, e.jobTitleId); loadData(); }} onDeleteEmployee={async (id:string) => { if(confirm("Xóa nhân viên?")) { await deleteEmployee(id); loadData(); } }} onImpersonate={onImpersonate} onEnrollFace={setEnrollingEmployee} onEditEmployee={setEditingEmployee} />;
      case 'shifts': return <ShiftManagement shifts={shifts} onAddShift={async (n:any, s:any, e:any) => { await addShift(admin.companyId, n, s, e); loadData(); }} onDeleteShift={async (id:string) => { await deleteShift(id); loadData(); }} />;
      case 'locations': return <LocationManagement locations={locations} onAddLocation={async (loc:any) => { await addLocation(admin.companyId, loc); loadData(); }} onDeleteLocation={async (id:string) => { await deleteLocation(id); loadData(); }} onEditLocation={setEditingLocation} />;
      case 'jobTitles': return <JobTitleManagement jobTitles={jobTitles} onAddJobTitle={async (n:any, r:any) => { await addJobTitle(admin.companyId, n, r); loadData(); }} />;
      case 'qrcode': return <QRCodeGenerator locations={locations} />;
      case 'requests': return <RequestManagement requests={requests} onProcess={async (req, action) => { await processAttendanceRequest(req, action); loadData(); }} onViewImage={setViewingImage} />;
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
        <div className="p-4 border-b dark:border-gray-700">
          <div className="bg-primary-600 p-2 rounded-lg w-fit mb-2"><UserGroupIcon className="h-6 w-6 text-white"/></div>
          <h1 className="text-xl font-bold dark:text-white truncate">{admin.name}</h1>
          <p className="text-xs text-gray-500 uppercase">Quản lý doanh nghiệp</p>
        </div>
        <ul className="flex-grow p-2 space-y-1">
          <TabButton icon={<CalendarDaysIcon className="h-5 w-5"/>} label="Bảng chấm công" isActive={activeTab === 'timesheet'} onClick={() => setActiveTab('timesheet')} />
          <TabButton icon={<ListBulletIcon className="h-5 w-5"/>} label="Nhật ký (Logs)" isActive={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <TabButton icon={<InboxStackIcon className="h-5 w-5"/>} label="Yêu cầu" isActive={activeTab === 'requests'} onClick={() => setActiveTab('requests')} />
          <TabButton icon={<UserGroupIcon className="h-5 w-5"/>} label="Nhân viên" isActive={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
          <TabButton icon={<ClockIcon className="h-5 w-5"/>} label="Ca làm việc" isActive={activeTab === 'shifts'} onClick={() => setActiveTab('shifts')} />
          <TabButton icon={<BuildingOffice2Icon className="h-5 w-5"/>} label="Địa điểm" isActive={activeTab === 'locations'} onClick={() => setActiveTab('locations')} />
          <TabButton icon={<QrCodeIcon className="h-5 w-5"/>} label="Mã QR" isActive={activeTab === 'qrcode'} onClick={() => setActiveTab('qrcode')} />
          <div className="border-t my-2 dark:border-gray-700"></div>
          <TabButton icon={<ShoppingBagIcon className="h-5 w-5"/>} label="Bếp & Đơn hàng" isActive={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <TabButton icon={<ChartBarIcon className="h-5 w-5"/>} label="Báo cáo F&B" isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <TabButton icon={<CubeIcon className="h-5 w-5"/>} label="Thực đơn" isActive={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
        </ul>
        <div className="p-2 border-t dark:border-gray-700">
           <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100"><LogoutIcon className="h-5 w-5"/> Đăng xuất</button>
        </div>
      </nav>
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto">{renderContent()}</main>
      
      {enrollingEmployee && <FaceEnrollmentModal employee={enrollingEmployee} onClose={() => setEnrollingEmployee(null)} onSave={handleUpdateEmployee} />}
      {editingEmployee && <EditEmployeeModal employee={editingEmployee} shifts={shifts} locations={locations} jobTitles={jobTitles} onClose={() => setEditingEmployee(null)} onSave={handleUpdateEmployee} />}
      {editingLocation && <EditLocationModal location={editingLocation} onClose={() => setEditingLocation(null)} onSave={handleUpdateLocation} />}
      {viewingImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setViewingImage(null)}>
          <img src={viewingImage} className="max-w-full max-h-full rounded shadow-2xl" alt="Bằng chứng" />
        </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void}> = ({ icon, label, isActive, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-primary-100 text-primary-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
    {icon} <span>{label}</span>
  </button>
);

const AttendanceLog: React.FC<{ records: AttendanceRecord[], onViewImage: (url: string) => void }> = ({ records, onViewImage }) => {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
            Nhật ký chấm công
            <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
        </h2>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">Nhân viên</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">Thời gian</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">Loại</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Detail</th>
                </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
                {records.map((record) => (
                <tr key={record.id} className="animate-in slide-in-from-left-2 duration-300">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium dark:text-white">{record.employeeName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatTimestamp(record.timestamp)}</td>
                    <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${record.status === AttendanceStatus.CHECK_IN ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {record.status === AttendanceStatus.CHECK_IN ? 'Check-in' : 'Check-out'}
                    </span>
                    </td>
                    <td className="px-6 py-4 flex gap-3">
                    {record.latitude && <a href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`} target="_blank" rel="noreferrer" className="text-primary-600"><MapPinIcon className="h-5 w-5"/></a>}
                    {record.selfieImage && <button onClick={() => onViewImage(record.selfieImage!)} className="text-primary-600"><CameraIcon className="h-5 w-5"/></button>}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    );
};

const EmployeeManagement: React.FC<any> = ({ employees, shifts, locations, jobTitles, onAddEmployee, onDeleteEmployee, onEditEmployee, onEnrollFace, onImpersonate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEmp, setNewEmp] = useState({ name: '', username: '', password: '', shiftId: '', locationId: '', jobTitleId: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddEmployee(newEmp);
        setNewEmp({ name: '', username: '', password: '', shiftId: '', locationId: '', jobTitleId: '' });
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2 shadow-md">
              <PlusIcon className="h-5 w-5" /> Thêm nhân viên
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((emp: Employee) => (
                    <div key={emp.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                    {emp.name} {emp.faceDescriptor && <span className="text-green-500" title="FaceID active"><FaceSmileIcon className="h-5 w-5" /></span>}
                                </h3>
                                <p className="text-sm text-gray-500">@{emp.username}</p>
                            </div>
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 text-[10px] px-2 py-1 rounded font-mono font-bold uppercase tracking-widest">{emp.deviceCode}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 border-t dark:border-gray-700 pt-4">
                             <button onClick={() => onEnrollFace(emp)} className="text-[10px] px-2 py-1 rounded border border-primary-200 text-primary-600 hover:bg-primary-50">Face ID</button>
                             <button onClick={() => onEditEmployee(emp)} className="text-[10px] px-2 py-1 rounded border border-gray-200 text-gray-600">Sửa</button>
                             <button onClick={() => onImpersonate(emp)} className="text-[10px] px-2 py-1 rounded bg-yellow-50 text-yellow-600 ml-auto">Giả lập</button>
                             <button onClick={() => onDeleteEmployee(emp.id)} className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-600">Xóa</button>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-bold">Thêm Nhân viên mới</h3>
                        <input placeholder="Họ tên" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} required />
                        <input placeholder="Username" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={newEmp.username} onChange={e => setNewEmp({...newEmp, username: e.target.value})} required />
                        <input type="password" placeholder="Mật khẩu" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} required />
                        <select className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={newEmp.shiftId} onChange={e => setNewEmp({...newEmp, shiftId: e.target.value})}>
                            <option value="">-- Chọn Ca --</option>
                            {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={newEmp.locationId} onChange={e => setNewEmp({...newEmp, locationId: e.target.value})}>
                            <option value="">-- Chọn Địa điểm --</option>
                            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <select className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={newEmp.jobTitleId} onChange={e => setNewEmp({...newEmp, jobTitleId: e.target.value})}>
                            <option value="">-- Chọn Chức vụ --</option>
                            {jobTitles.map((j: any) => <option key={j.id} value={j.id}>{j.name}</option>)}
                        </select>
                        <div className="flex justify-end gap-2 pt-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500">Hủy</button>
                            <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded font-bold">Lưu</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const EditEmployeeModal: React.FC<{ employee: Employee, shifts: Shift[], locations: Location[], jobTitles: JobTitle[], onClose: () => void, onSave: (id: string, updates: Partial<Employee>) => Promise<void> }> = ({ employee, shifts, locations, jobTitles, onClose, onSave }) => {
    const [name, setName] = useState(employee.name);
    const [username, setUsername] = useState(employee.username);
    const [shiftId, setShiftId] = useState(employee.shiftId || '');
    const [locationId, setLocationId] = useState(employee.locationId || '');
    const [jobTitleId, setJobTitleId] = useState(employee.jobTitleId || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(employee.id, { name, username, shiftId, locationId, jobTitleId });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                <h3 className="text-xl font-bold">Chỉnh sửa Nhân viên</h3>
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">Họ và tên</label>
                    <input className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">Tên đăng nhập</label>
                    <input className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={username} onChange={e => setUsername(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">Ca làm việc</label>
                        <select className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={shiftId} onChange={e => setShiftId(e.target.value)}>
                            <option value="">-- Không phân ca --</option>
                            {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">Địa điểm</label>
                        <select className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={locationId} onChange={e => setLocationId(e.target.value)}>
                            <option value="">-- Không phân địa điểm --</option>
                            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-gray-500">Hủy</button>
                    <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded font-bold">Cập nhật</button>
                </div>
            </form>
        </div>
    );
};

const LocationManagement: React.FC<any> = ({ locations, onAddLocation, onDeleteLocation, onEditLocation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [newLoc, setNewLoc] = useState({ name: '', lat: '', lng: '', radius: '100', requireSelfie: false });

    const handleGetCurrentLocation = () => {
        setIsFetching(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setNewLoc(prev => ({ ...prev, lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }));
                setIsFetching(false);
            },
            (err) => { alert("Lỗi GPS: " + err.message); setIsFetching(false); },
            { enableHighAccuracy: true }
        );
    };

    return (
        <div className="space-y-6">
             <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md flex items-center gap-2"><PlusIcon className="h-5 w-5" /> Thêm địa điểm</button>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((loc: Location) => (
                    <div key={loc.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold dark:text-white flex items-center gap-2"><MapPinIcon className="h-4 w-4 text-primary-500" />{loc.name}</h3>
                            {loc.requireSelfie && <CameraIcon className="h-4 w-4 text-blue-500" />}
                        </div>
                        <div className="text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                            <p>Bán kính: {loc.radius}m</p>
                            <p className="font-mono">Lat: {loc.latitude}</p>
                            <p className="font-mono">Lng: {loc.longitude}</p>
                        </div>
                        <div className="mt-4 flex gap-3">
                            <button onClick={() => onEditLocation(loc)} className="text-primary-600 text-xs font-bold">Sửa</button>
                            <button onClick={() => onDeleteLocation(loc.id)} className="text-red-500 text-xs font-bold ml-auto">Xóa</button>
                        </div>
                    </div>
                ))}
             </div>
             {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={(e)=>{e.preventDefault(); onAddLocation({name:newLoc.name, latitude:parseFloat(newLoc.lat), longitude:parseFloat(newLoc.lng), radius:parseFloat(newLoc.radius), requireSelfie: newLoc.requireSelfie}); setIsModalOpen(false);}} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-bold">Thêm Địa điểm</h3>
                        <input placeholder="Tên địa điểm" className="w-full p-2 border rounded dark:bg-gray-700" value={newLoc.name} onChange={e => setNewLoc({...newLoc, name: e.target.value})} required />
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input placeholder="Vĩ độ" className="flex-1 p-2 border rounded dark:bg-gray-700 font-mono text-sm" value={newLoc.lat} onChange={e => setNewLoc({...newLoc, lat: e.target.value})} required />
                                <input placeholder="Kinh độ" className="flex-1 p-2 border rounded dark:bg-gray-700 font-mono text-sm" value={newLoc.lng} onChange={e => setNewLoc({...newLoc, lng: e.target.value})} required />
                            </div>
                            <button type="button" onClick={handleGetCurrentLocation} disabled={isFetching} className="w-full py-2 bg-gray-50 dark:bg-gray-700 rounded text-xs flex items-center justify-center gap-2 font-bold text-primary-600 border border-primary-100">
                                {isFetching ? <LoadingIcon className="h-4 w-4" /> : <MapPinIcon className="h-4 w-4" />}
                                Lấy GPS hiện tại của tôi
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-end">
                            <div><label className="text-[10px] uppercase font-bold text-gray-400">Bán kính (m)</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700" value={newLoc.radius} onChange={e => setNewLoc({...newLoc, radius: e.target.value})} required /></div>
                            <div className="flex items-center gap-2 pb-2"><input type="checkbox" id="rs" className="h-5 w-5" checked={newLoc.requireSelfie} onChange={e => setNewLoc({...newLoc, requireSelfie: e.target.checked})} /><label htmlFor="rs" className="text-sm">Selfie</label></div>
                        </div>
                        <div className="flex gap-2 pt-2">
                             <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-gray-500">Hủy</button>
                             <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded font-bold">Lưu</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
};

const EditLocationModal: React.FC<{ location: Location, onClose: () => void, onSave: (id: string, updates: Partial<Location>) => Promise<void> }> = ({ location, onClose, onSave }) => {
    const [name, setName] = useState(location.name);
    const [lat, setLat] = useState(location.latitude.toString());
    const [lng, setLng] = useState(location.longitude.toString());
    const [radius, setRadius] = useState(location.radius.toString());
    const [requireSelfie, setRequireSelfie] = useState(location.requireSelfie || false);
    const [isFetching, setIsFetching] = useState(false);

    const handleGetCurrentLocation = () => {
        setIsFetching(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => { setLat(pos.coords.latitude.toString()); setLng(pos.coords.longitude.toString()); setIsFetching(false); },
            (err) => { alert("Lỗi GPS: " + err.message); setIsFetching(false); },
            { enableHighAccuracy: true }
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <form onSubmit={async (e)=>{e.preventDefault(); await onSave(location.id, {name, latitude:parseFloat(lat), longitude:parseFloat(lng), radius:parseFloat(radius), requireSelfie});}} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                <h3 className="text-lg font-bold">Chỉnh sửa Địa điểm</h3>
                <input placeholder="Tên" className="w-full p-2 border rounded dark:bg-gray-700" value={name} onChange={e => setName(e.target.value)} required />
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input className="flex-1 p-2 border rounded dark:bg-gray-700 font-mono text-sm" value={lat} onChange={e => setLat(e.target.value)} required />
                        <input className="flex-1 p-2 border rounded dark:bg-gray-700 font-mono text-sm" value={lng} onChange={e => setLng(e.target.value)} required />
                    </div>
                    <button type="button" onClick={handleGetCurrentLocation} disabled={isFetching} className="w-full py-2 bg-gray-50 dark:bg-gray-700 rounded text-xs flex items-center justify-center gap-2 font-bold text-primary-600">
                        {isFetching ? <LoadingIcon className="h-4 w-4" /> : <MapPinIcon className="h-4 w-4" />} Cập nhật GPS tại chỗ
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4 items-end">
                    <div><label className="text-[10px] uppercase font-bold text-gray-400">Bán kính (m)</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700" value={radius} onChange={e => setRadius(e.target.value)} required /></div>
                    <div className="flex items-center gap-2 pb-2"><input type="checkbox" id="ers" className="h-5 w-5" checked={requireSelfie} onChange={e => setRequireSelfie(e.target.checked)} /><label htmlFor="ers" className="text-sm">Selfie</label></div>
                </div>
                <div className="flex gap-2 pt-2">
                     <button type="button" onClick={onClose} className="flex-1 py-2 text-gray-500">Hủy</button>
                     <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded font-bold">Lưu thay đổi</button>
                </div>
            </form>
        </div>
    );
};

const ShiftManagement: React.FC<any> = ({ shifts, onAddShift, onDeleteShift }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [n, setN] = useState('');
    const [s, setS] = useState('');
    const [e, setE] = useState('');
    return (
        <div className="space-y-6">
             <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow-md"><PlusIcon className="h-5 w-5" /> Thêm ca</button>
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700"><tr className="text-left text-xs uppercase text-gray-500 font-bold"><th className="px-6 py-3">Tên ca</th><th className="px-6 py-3">Vào</th><th className="px-6 py-3">Ra</th><th className="px-6 py-3"></th></tr></thead>
                    <tbody className="divide-y dark:divide-gray-700">
                        {shifts.map((shift: Shift) => (
                            <tr key={shift.id}>
                                <td className="px-6 py-4 dark:text-white font-medium">{shift.name}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{shift.startTime}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{shift.endTime}</td>
                                <td className="px-6 py-4 text-right"><button onClick={() => onDeleteShift(shift.id)} className="text-red-500 hover:underline font-bold text-xs">Xóa</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={(ev)=>{ev.preventDefault(); onAddShift(n, s, e); setIsModalOpen(false); setN(''); setS(''); setE('');}} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-bold">Thêm Ca</h3>
                        <input placeholder="Tên ca (Vd: Ca sáng)" className="w-full p-2 border rounded dark:bg-gray-700" value={n} onChange={v => setN(v.target.value)} required />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="time" className="p-2 border rounded dark:bg-gray-700" value={s} onChange={v => setS(v.target.value)} required />
                          <input type="time" className="p-2 border rounded dark:bg-gray-700" value={e} onChange={v => setE(v.target.value)} required />
                        </div>
                        <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded font-bold shadow">Lưu</button>
                    </form>
                </div>
            )}
        </div>
    )
};

const JobTitleManagement: React.FC<any> = ({ jobTitles, onAddJobTitle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [n, setN] = useState('');
    const [r, setR] = useState('');
    return (
        <div className="space-y-6">
            <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow-md"><PlusIcon className="h-5 w-5" /> Thêm chức vụ</button>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700"><tr className="text-left text-xs uppercase text-gray-500 font-bold"><th className="px-6 py-3">Chức vụ</th><th className="px-6 py-3">Lương/h</th></tr></thead>
                    <tbody className="divide-y dark:divide-gray-700">
                        {jobTitles.map((jt: JobTitle) => (
                            <tr key={jt.id}><td className="px-6 py-4 dark:text-white">{jt.name}</td><td className="px-6 py-4 dark:text-gray-300 font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(jt.hourlyRate)}đ</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={(ev)=>{ev.preventDefault(); onAddJobTitle(n, parseFloat(r)); setIsModalOpen(false); setN(''); setR('');}} className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-bold">Thêm Chức vụ</h3>
                        <input placeholder="Tên chức vụ" className="w-full p-2 border rounded dark:bg-gray-700" value={n} onChange={v => setN(v.target.value)} required />
                        <input type="number" placeholder="Lương mỗi giờ" className="w-full p-2 border rounded dark:bg-gray-700" value={r} onChange={v => setR(v.target.value)} required />
                        <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded font-bold shadow">Lưu</button>
                    </form>
                </div>
            )}
        </div>
    )
};

const AttendanceTimesheet: React.FC<{ employees: Employee[], records: AttendanceRecord[] }> = ({ employees, records }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const attendanceMap = useMemo(() => {
        const map: Record<string, Record<number, any>> = {};
        records.forEach(r => {
            const d = new Date(r.timestamp);
            if (d.getMonth() === month && d.getFullYear() === year) {
                const day = d.getDate();
                if (!map[r.employeeId]) map[r.employeeId] = {};
                if (!map[r.employeeId][day]) map[r.employeeId][day] = { cin: null, cout: null };
                if (r.status === AttendanceStatus.CHECK_IN) map[r.employeeId][day].cin = r.timestamp;
                else map[r.employeeId][day].cout = r.timestamp;
            }
        });
        return map;
    }, [records, month, year]);

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(month-1)))} className="p-2 font-bold text-gray-400 hover:text-primary-600">&lt;</button>
                        <h3 className="text-xl font-bold dark:text-white capitalize">{selectedDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h3>
                        <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(month+1)))} className="p-2 font-bold text-gray-400 hover:text-primary-600">&gt;</button>
                    </div>
                </div>
                <div className="overflow-x-auto border dark:border-gray-700 rounded-lg max-h-[500px]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-left sticky left-0 bg-gray-50 dark:bg-gray-700 z-20">Nhân viên</th>
                                {daysArray.map(day => <th key={day} className="px-1 py-3 text-center min-w-[32px]">{day}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {employees.map(emp => (
                                <tr key={emp.id} className={`hover:bg-primary-50 cursor-pointer ${selectedEmployeeId === emp.id ? 'bg-primary-100/50' : ''}`} onClick={() => setSelectedEmployeeId(emp.id)}>
                                    <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-800 font-bold shadow-sm">{emp.name}</td>
                                    {daysArray.map(day => {
                                        const cin = attendanceMap[emp.id]?.[day]?.cin;
                                        return <td key={day} className="p-1 text-center">{cin ? <span className="w-2.5 h-2.5 rounded-full bg-green-500 block mx-auto"></span> : <span className="w-1 h-1 bg-gray-100 rounded-full block mx-auto"></span>}</td>
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const RequestManagement: React.FC<{ requests: AttendanceRequest[], onProcess: (req: AttendanceRequest, action: 'approve' | 'reject') => void, onViewImage: (url: string) => void }> = ({ requests, onProcess, onViewImage }) => {
    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700"><tr className="text-left text-xs uppercase text-gray-500 font-bold"><th className="px-6 py-4">Nhân viên</th><th className="px-6 py-4">Lý do</th><th className="px-6 py-4">Bằng chứng</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4"></th></tr></thead>
                <tbody className="divide-y dark:divide-gray-700">
                    {requests.map(req => (
                        <tr key={req.id}>
                            <td className="px-6 py-4 dark:text-white"><div>{req.employeeName}</div><div className="text-[10px] text-gray-400">{formatTimestamp(req.timestamp)}</div></td>
                            <td className="px-6 py-4 text-sm dark:text-gray-300 italic">"{req.reason}"</td>
                            <td className="px-6 py-4"><button onClick={() => onViewImage(req.evidenceImage)} className="text-primary-600 text-xs font-bold flex items-center gap-1 hover:underline"><CameraIcon className="h-4 w-4"/> Xem ảnh</button></td>
                            <td className="px-6 py-4"><span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${req.status === RequestStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{req.status}</span></td>
                            <td className="px-6 py-4 text-right space-x-3">
                                {req.status === RequestStatus.PENDING && (
                                    <><button onClick={() => onProcess(req, 'approve')} className="text-green-600 hover:text-green-800 transition-colors"><CheckCircleIcon className="h-6 w-6"/></button><button onClick={() => onProcess(req, 'reject')} className="text-red-500 hover:text-red-700 transition-colors"><XCircleIcon className="h-6 w-6"/></button></>
                                )}
                            </td>
                        </tr>
                    ))}
                    {requests.length === 0 && <tr><td colSpan={5} className="text-center py-20 text-gray-400 italic">Không có yêu cầu hỗ trợ nào.</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

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
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-bold mb-4">Đăng ký Face ID: {employee.name}</h3>
                {step === 'camera' && (
                    <div className="space-y-4">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video bg-black rounded-lg object-cover shadow-inner" />
                        <div className="flex gap-2"><button onClick={onClose} className="flex-1 py-2 text-gray-500">Hủy</button><button onClick={handleCapture} className="flex-1 py-2 bg-primary-600 text-white rounded font-bold shadow-md">Chụp khuôn mặt</button></div>
                    </div>
                )}
                {step === 'processing' && <div className="py-10 text-center"><LoadingIcon className="h-10 w-10 mx-auto text-primary-500" /><p className="mt-4">Đang xử lý...</p></div>}
                {step === 'success' && <div className="py-10 text-center"><CheckCircleIcon className="h-16 w-16 mx-auto text-green-500" /><p className="mt-4 font-bold text-green-600">Đăng ký thành công!</p><button onClick={onClose} className="mt-8 w-full py-2 bg-green-600 text-white rounded font-bold">Hoàn tất</button></div>}
            </div>
        </div>
    );
};

export default AdminDashboard;
