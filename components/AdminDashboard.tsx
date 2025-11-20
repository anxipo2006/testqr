
import React, { useState, useEffect } from 'react';
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
  deleteJobTitle,
  getInitialData,
  processAttendanceRequest,
} from '../services/attendanceService';
import type { Employee, AttendanceRecord, Shift, Location, JobTitle, AttendanceRequest } from '../types';
import { AttendanceStatus, RequestStatus } from '../types';
import QRCodeGenerator from './QRCodeGenerator';
import { QrCodeIcon, UserGroupIcon, ListBulletIcon, LogoutIcon, ClockIcon, CalendarDaysIcon, XCircleIcon, MapPinIcon, BuildingOffice2Icon, LoadingIcon, CameraIcon, ArrowPathIcon, CurrencyDollarIcon, TagIcon, EyeIcon, InboxStackIcon, ExclamationTriangleIcon, CubeIcon, ClipboardDocumentListIcon, CheckCircleIcon } from './icons';
import { formatTimestamp, formatDateForDisplay, getWeekRange, getMonthRange, formatTimeToHHMM, calculateHours } from '../utils/date';
import { MenuManager, OrderList } from './FnbManagement';


type Tab = 'timesheet' | 'logs' | 'employees' | 'shifts' | 'locations' | 'jobTitles' | 'payroll' | 'qrcode' | 'requests' | 'menu' | 'orders';

interface AdminDashboardProps {
  onLogout: () => void;
  onImpersonate: (employee: Employee) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onImpersonate }) => {
  const [activeTab, setActiveTab] = useState<Tab>('timesheet');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [requestsError, setRequestsError] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingJobTitle, setEditingJobTitle] = useState<JobTitle | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getInitialData();
      setEmployees(data.employees);
      setRecords(data.records);
      setShifts(data.shifts);
      setLocations(data.locations);
      setJobTitles(data.jobTitles);
      setRequests(data.requests);
      
      if (data.requestsError) {
          setRequestsError(data.requestsError);
      } else {
          setRequestsError(null);
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
      let errorMessage = "Không thể tải dữ liệu. Vui lòng thử lại.";
      if (err && err.code === 'permission-denied') {
          errorMessage = "Lỗi quyền truy cập (permission-denied). Hãy đảm bảo Firestore Security Rules của bạn cho phép đọc dữ liệu.";
      } else if (err && err.code) {
          errorMessage = `Lỗi cơ sở dữ liệu: ${err.code}.`;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddEmployee = async (employeeData: Omit<Employee, 'id' | 'deviceCode'>) => {
      await addEmployee(employeeData.name, employeeData.username, employeeData.password, employeeData.shiftId || undefined, employeeData.locationId || undefined, employeeData.jobTitleId || undefined);
      await loadData();
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này? Tất cả dữ liệu chấm công của họ cũng sẽ bị xóa.')) {
      await deleteEmployee(id);
      await loadData();
    }
  };

  const handleUpdateEmployee = async (id: string, updates: Partial<Employee>): Promise<{ success: boolean, message?: string }> => {
    try {
      await updateEmployee(id, updates);
      setEditingEmployee(null);
      await loadData();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      return { success: false, message };
    }
  };
  
  const handleAddShift = async (name: string, startTime: string, endTime: string) => {
    await addShift(name, startTime, endTime);
    await loadData();
  };

  const handleDeleteShift = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa ca làm việc này? Nhân viên được phân công vào ca này sẽ không còn ca làm việc.')) {
      await deleteShift(id);
      await loadData();
    }
  };

  const handleUpdateShift = async (id: string, updates: Partial<Shift>) => {
    await updateShift(id, updates);
    setEditingShift(null);
    await loadData();
  };
  
  const handleAddLocation = async (location: Omit<Location, 'id'>) => {
    await addLocation(location);
    await loadData();
  };

  const handleDeleteLocation = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa địa điểm này? Nhân viên được phân công vào địa điểm này sẽ không còn địa điểm làm việc.')) {
      await deleteLocation(id);
      await loadData();
    }
  };
  
  const handleUpdateLocation = async (id: string, updates: Partial<Location>) => {
    await updateLocation(id, updates);
    setEditingLocation(null);
    await loadData();
  }

  const handleAddJobTitle = async (name: string, hourlyRate: number) => {
    await addJobTitle(name, hourlyRate);
    await loadData();
  };

  const handleDeleteJobTitle = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chức vụ này? Nhân viên có chức vụ này sẽ không còn được phân công.')) {
        await deleteJobTitle(id);
        await loadData();
    }
  };

  const handleUpdateJobTitle = async (id: string, updates: Partial<JobTitle>) => {
    await updateJobTitle(id, updates);
    setEditingJobTitle(null);
    await loadData();
  };

  const handleProcessRequest = async (request: AttendanceRequest, action: 'approve' | 'reject') => {
      if (window.confirm(`Bạn có chắc chắn muốn ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu này không?`)) {
          try {
              setIsLoading(true);
              await processAttendanceRequest(request, action);
              await loadData();
          } catch (e: any) {
              setIsLoading(false);
              if (e.message && (e.message.includes("permission-denied") || e.message.includes("Lỗi quyền truy cập"))) {
                  setRequestsError(e);
                  alert("Lỗi: Không có quyền ghi dữ liệu vào hệ thống. Vui lòng xem hướng dẫn sửa lỗi vừa hiển thị trên màn hình.");
              } else {
                  alert(`Lỗi: ${e.message}`);
              }
          }
      }
  }


  const getTabTitle = (tab: Tab): string => {
    switch (tab) {
      case 'timesheet': return 'Bảng chấm công';
      case 'logs': return 'Nhật ký Chấm công';
      case 'employees': return 'Quản lý Nhân viên';
      case 'shifts': return 'Quản lý Ca làm việc';
      case 'locations': return 'Quản lý Địa điểm';
      case 'jobTitles': return 'Quản lý Chức vụ';
      case 'payroll': return 'Bảng lương';
      case 'qrcode': return 'Mã QR Chấm công';
      case 'requests': return 'Yêu cầu Hỗ trợ';
      case 'menu': return 'Quản lý Thực đơn';
      case 'orders': return 'Bếp / Đơn hàng';
      default: return 'Bảng điều khiển';
    }
  };
  
  const pendingRequestsCount = requests.filter(r => r.status === RequestStatus.PENDING).length;

  const renderContent = () => {
    if (isLoading && !['menu', 'orders'].includes(activeTab)) {
        return (
            <div className="flex items-center justify-center h-full">
                <LoadingIcon className="h-10 w-10 text-primary-500" />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-r-lg" role="alert">
                <p className="font-bold">Lỗi tải dữ liệu</p>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    switch (activeTab) {
      case 'logs':
        return <AttendanceLog records={records} onViewImage={setViewingImage} />;
      case 'employees':
        return <EmployeeManagement 
                 employees={employees} 
                 shifts={shifts}
                 locations={locations}
                 jobTitles={jobTitles}
                 onAddEmployee={handleAddEmployee}
                 onDeleteEmployee={handleDeleteEmployee} 
                 onEditEmployee={setEditingEmployee}
                 onImpersonate={onImpersonate}
               />;
      case 'shifts':
        return <ShiftManagement 
                  shifts={shifts}
                  onAddShift={handleAddShift}
                  onDeleteShift={handleDeleteShift}
                  onEditShift={setEditingShift}
               />;
      case 'locations':
        return <LocationManagement
                  locations={locations}
                  onAddLocation={handleAddLocation}
                  onDeleteLocation={handleDeleteLocation}
                  onEditLocation={setEditingLocation}
                />;
       case 'jobTitles':
        return <JobTitleManagement 
                  jobTitles={jobTitles}
                  onAddJobTitle={handleAddJobTitle}
                  onDeleteJobTitle={handleDeleteJobTitle}
                  onEditJobTitle={setEditingJobTitle}
                />
      case 'timesheet':
        return <AttendanceTimesheet employees={employees} records={records} />;
      case 'payroll':
        return <Payroll employees={employees} records={records} jobTitles={jobTitles} />;
      case 'qrcode':
        return <QRCodeGenerator locations={locations} />;
      case 'requests':
        return <RequestManagement 
                  requests={requests} 
                  onProcess={handleProcessRequest} 
                  onViewImage={setViewingImage} 
                  error={requestsError}
                />;
      case 'menu':
        return <MenuManager />;
      case 'orders':
        return <OrderList />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <nav className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col overflow-y-auto">
          <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3">
             <div className="bg-primary-600 p-2 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-white"/>
            </div>
            <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">System</h1>
          </div>
          
          <ul className="flex-grow p-2 space-y-1">
            {/* F&B Group */}
            <div className="pt-2 pb-1 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Quản lý F&B
            </div>
            <TabButton icon={<ClipboardDocumentListIcon className="h-5 w-5"/>} label="Bếp / Đơn hàng" isActive={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
            <TabButton icon={<CubeIcon className="h-5 w-5"/>} label="Thực đơn" isActive={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />

            <div className="border-t my-2 dark:border-gray-700"></div>

            {/* HRM Group */}
            <div className="pt-2 pb-1 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                Quản trị Nhân sự
            </div>
            <TabButton icon={<CalendarDaysIcon className="h-5 w-5"/>} label="Bảng chấm công" isActive={activeTab === 'timesheet'} onClick={() => { setActiveTab('timesheet'); }} />
            <TabButton 
                icon={<InboxStackIcon className="h-5 w-5"/>} 
                label="Yêu cầu" 
                isActive={activeTab === 'requests'} 
                onClick={() => { setActiveTab('requests'); }} 
                badge={pendingRequestsCount > 0 ? pendingRequestsCount : undefined}
            />
            <TabButton icon={<CurrencyDollarIcon className="h-5 w-5"/>} label="Bảng lương" isActive={activeTab === 'payroll'} onClick={() => { setActiveTab('payroll'); }} />
            <TabButton icon={<ListBulletIcon className="h-5 w-5"/>} label="Nhật ký" isActive={activeTab === 'logs'} onClick={() => { setActiveTab('logs'); }} />
            <TabButton icon={<UserGroupIcon className="h-5 w-5"/>} label="Nhân viên" isActive={activeTab === 'employees'} onClick={() => { setActiveTab('employees'); }} />
            <TabButton icon={<ClockIcon className="h-5 w-5"/>} label="Ca làm việc" isActive={activeTab === 'shifts'} onClick={() => { setActiveTab('shifts'); }} /> 
            <TabButton icon={<BuildingOffice2Icon className="h-5 w-5"/>} label="Địa điểm" isActive={activeTab === 'locations'} onClick={() => { setActiveTab('locations'); }} />
            <TabButton icon={<TagIcon className="h-5 w-5"/>} label="Chức vụ" isActive={activeTab === 'jobTitles'} onClick={() => { setActiveTab('jobTitles'); }} />
            <TabButton icon={<QrCodeIcon className="h-5 w-5"/>} label="Mã QR" isActive={activeTab === 'qrcode'} onClick={() => setActiveTab('qrcode')} />
          </ul>

          <div className="p-2 border-t dark:border-gray-700">
             <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <LogoutIcon className="h-5 w-5"/>
              <span>Đăng xuất</span>
            </button>
          </div>
        </nav>
        
        <main className="flex-1 p-6 lg:p-10 flex flex-col overflow-hidden">
             <div className="flex-shrink-0 flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                {getTabTitle(activeTab)}
                </h2>
                {!['menu', 'orders'].includes(activeTab) && (
                    <button
                    onClick={loadData}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-wait"
                    >
                    {isLoading ? (
                        <LoadingIcon className="h-5 w-5" />
                    ) : (
                        <ArrowPathIcon className="h-5 w-5" />
                    )}
                    <span>Tải lại</span>
                    </button>
                )}
            </div>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                 <div className="mx-auto max-w-7xl">
                    {renderContent()}
                </div>
            </div>
        </main>
      </div>
      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          shifts={shifts}
          locations={locations}
          jobTitles={jobTitles}
          onClose={() => setEditingEmployee(null)}
          onSave={handleUpdateEmployee}
        />
      )}
      {editingShift && (
        <EditShiftModal
          shift={editingShift}
          onClose={() => setEditingShift(null)}
          onSave={handleUpdateShift}
        />
      )}
      {editingLocation && (
        <EditLocationModal
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSave={handleUpdateLocation}
        />
      )}
      {editingJobTitle && (
        <EditJobTitleModal
          jobTitle={editingJobTitle}
          onClose={() => setEditingJobTitle(null)}
          onSave={handleUpdateJobTitle}
        />
      )}
      {viewingImage && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setViewingImage(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
             <img src={viewingImage} alt="Ảnh bằng chứng" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" />
             <button onClick={() => setViewingImage(null)} className="absolute -top-4 -right-4 text-white bg-gray-800 rounded-full p-1">
                <XCircleIcon className="w-8 h-8"/>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const TabButton: React.FC<{icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, badge?: number}> = ({ icon, label, isActive, onClick, badge }) => (
  <li>
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 ${
        isActive
          ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-bold'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      <div className="flex items-center gap-3">
          {icon}
          <span>{label}</span>
      </div>
      {badge !== undefined && (
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </button>
  </li>
);

const AttendanceLog: React.FC<{ records: AttendanceRecord[], onViewImage: (url: string) => void }> = ({ records, onViewImage }) => {
    return (
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nhân viên</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thời gian</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Loại</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {records.map((record) => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{record.employeeName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatTimestamp(record.timestamp)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                   <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === AttendanceStatus.CHECK_IN ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {record.status === AttendanceStatus.CHECK_IN ? 'Check-in' : 'Check-out'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {record.isLate && <span className="text-red-500 mr-2">Đi muộn</span>}
                  {record.isEarly && <span className="text-orange-500">Về sớm</span>}
                  {!record.isLate && !record.isEarly && <span className="text-green-500">Đúng giờ</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 flex gap-2">
                   {record.latitude && (
                       <a href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800"><MapPinIcon className="h-5 w-5"/></a>
                   )}
                   {record.selfieImage && (
                       <button onClick={() => onViewImage(record.selfieImage!)} className="text-blue-600 hover:text-blue-800"><CameraIcon className="h-5 w-5"/></button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
};

const EmployeeManagement: React.FC<any> = ({ employees, shifts, locations, jobTitles, onAddEmployee, onDeleteEmployee, onEditEmployee, onImpersonate }) => {
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
                                <h3 className="font-bold text-lg dark:text-white">{emp.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">@{emp.username}</p>
                            </div>
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded font-mono">{emp.deviceCode}</span>
                        </div>
                        <div className="mt-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                            <p>Ca: {shifts.find((s: any) => s.id === emp.shiftId)?.name || 'N/A'}</p>
                            <p>Vị trí: {locations.find((l: any) => l.id === emp.locationId)?.name || 'N/A'}</p>
                            <p>Chức vụ: {jobTitles.find((j: any) => j.id === emp.jobTitleId)?.name || 'N/A'}</p>
                        </div>
                        <div className="mt-4 flex gap-2 border-t pt-4 dark:border-gray-700">
                            <button onClick={() => onEditEmployee(emp)} className="text-blue-600 hover:text-blue-800 text-sm">Sửa</button>
                            <button onClick={() => onImpersonate(emp)} className="text-yellow-600 hover:text-yellow-800 text-sm">Giả lập</button>
                            <button onClick={() => onDeleteEmployee(emp.id)} className="text-red-600 hover:text-red-800 text-sm ml-auto">Xóa</button>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Thêm Nhân viên</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input placeholder="Họ tên" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} required />
                            <input placeholder="Tên đăng nhập" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newEmployee.username} onChange={e => setNewEmployee({...newEmployee, username: e.target.value})} required />
                            <input type="password" placeholder="Mật khẩu" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newEmployee.password} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})} required />
                            <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newEmployee.shiftId} onChange={e => setNewEmployee({...newEmployee, shiftId: e.target.value})}>
                                <option value="">-- Chọn Ca --</option>
                                {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newEmployee.locationId} onChange={e => setNewEmployee({...newEmployee, locationId: e.target.value})}>
                                <option value="">-- Chọn Địa điểm --</option>
                                {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newEmployee.jobTitleId} onChange={e => setNewEmployee({...newEmployee, jobTitleId: e.target.value})}>
                                <option value="">-- Chọn Chức vụ --</option>
                                {jobTitles.map((j: any) => <option key={j.id} value={j.id}>{j.name}</option>)}
                            </select>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-gray-800">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Thêm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const ShiftManagement: React.FC<any> = ({ shifts, onAddShift, onDeleteShift, onEditShift }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newShift, setNewShift] = useState({ name: '', startTime: '', endTime: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddShift(newShift.name, newShift.startTime, newShift.endTime);
        setNewShift({ name: '', startTime: '', endTime: '' });
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
             <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">Thêm ca làm việc</button>
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tên ca</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Bắt đầu</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kết thúc</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {shifts.map((shift: Shift) => (
                            <tr key={shift.id}>
                                <td className="px-6 py-4 dark:text-white">{shift.name}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{shift.startTime}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{shift.endTime}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => onEditShift(shift)} className="text-blue-600 hover:text-blue-800">Sửa</button>
                                    <button onClick={() => onDeleteShift(shift.id)} className="text-red-600 hover:text-red-800">Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Thêm Ca Làm Việc</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input placeholder="Tên ca" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} required />
                            <input type="time" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newShift.startTime} onChange={e => setNewShift({...newShift, startTime: e.target.value})} required />
                            <input type="time" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newShift.endTime} onChange={e => setNewShift({...newShift, endTime: e.target.value})} required />
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-gray-800">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Thêm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
};

const LocationManagement: React.FC<any> = ({ locations, onAddLocation, onDeleteLocation, onEditLocation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newLocation, setNewLocation] = useState({ name: '', latitude: '', longitude: '', radius: '', requireSelfie: false });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddLocation({
            name: newLocation.name,
            latitude: parseFloat(newLocation.latitude),
            longitude: parseFloat(newLocation.longitude),
            radius: parseFloat(newLocation.radius),
            requireSelfie: newLocation.requireSelfie
        });
        setNewLocation({ name: '', latitude: '', longitude: '', radius: '', requireSelfie: false });
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
             <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">Thêm địa điểm</button>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((loc: Location) => (
                    <div key={loc.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg dark:text-white">{loc.name}</h3>
                            {loc.requireSelfie && (
                                <div title="Yêu cầu Selfie">
                                    <CameraIcon className="h-5 w-5 text-blue-500" />
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Lat: {loc.latitude}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Long: {loc.longitude}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Bán kính: {loc.radius}m</p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => onEditLocation(loc)} className="text-blue-600 hover:text-blue-800 text-sm">Sửa</button>
                            <button onClick={() => onDeleteLocation(loc.id)} className="text-red-600 hover:text-red-800 text-sm">Xóa</button>
                        </div>
                    </div>
                ))}
             </div>
             {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Thêm Địa Điểm</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input placeholder="Tên địa điểm" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} required />
                            <input type="number" step="any" placeholder="Vĩ độ" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newLocation.latitude} onChange={e => setNewLocation({...newLocation, latitude: e.target.value})} required />
                            <input type="number" step="any" placeholder="Kinh độ" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newLocation.longitude} onChange={e => setNewLocation({...newLocation, longitude: e.target.value})} required />
                            <input type="number" placeholder="Bán kính (m)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newLocation.radius} onChange={e => setNewLocation({...newLocation, radius: e.target.value})} required />
                             <div className="flex items-center gap-2">
                                <input type="checkbox" id="reqSelfie" checked={newLocation.requireSelfie} onChange={e => setNewLocation({...newLocation, requireSelfie: e.target.checked})} className="h-4 w-4" />
                                <label htmlFor="reqSelfie" className="text-sm dark:text-gray-300">Yêu cầu chụp ảnh Selfie</label>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-gray-800">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Thêm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
};

const JobTitleManagement: React.FC<any> = ({ jobTitles, onAddJobTitle, onDeleteJobTitle, onEditJobTitle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newJob, setNewJob] = useState({ name: '', hourlyRate: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddJobTitle(newJob.name, parseFloat(newJob.hourlyRate));
        setNewJob({ name: '', hourlyRate: '' });
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
             <button onClick={() => setIsModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">Thêm chức vụ</button>
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Chức vụ</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lương/giờ</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {jobTitles.map((job: JobTitle) => (
                            <tr key={job.id}>
                                <td className="px-6 py-4 dark:text-white">{job.name}</td>
                                <td className="px-6 py-4 dark:text-gray-300">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(job.hourlyRate)}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => onEditJobTitle(job)} className="text-blue-600 hover:text-blue-800">Sửa</button>
                                    <button onClick={() => onDeleteJobTitle(job.id)} className="text-red-600 hover:text-red-800">Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Thêm Chức Vụ</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input placeholder="Tên chức vụ" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newJob.name} onChange={e => setNewJob({...newJob, name: e.target.value})} required />
                            <input type="number" placeholder="Lương theo giờ" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newJob.hourlyRate} onChange={e => setNewJob({...newJob, hourlyRate: e.target.value})} required />
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-gray-800">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Thêm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
};

const AttendanceTimesheet: React.FC<{ employees: Employee[], records: AttendanceRecord[] }> = ({ employees, records }) => {
    // Simplistic implementation for Timesheet
    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Bảng chấm công tổng hợp</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Hiển thị trạng thái chấm công gần nhất của nhân viên.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map(emp => {
                    const empRecords = records.filter(r => r.employeeId === emp.id).sort((a, b) => b.timestamp - a.timestamp);
                    const lastRecord = empRecords[0];
                    const status = lastRecord ? lastRecord.status : null;
                    
                    return (
                        <div key={emp.id} className={`p-4 rounded border-l-4 shadow-sm ${status === AttendanceStatus.CHECK_IN ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 bg-gray-50 dark:bg-gray-700/50'}`}>
                            <div className="flex justify-between items-center">
                                <span className="font-bold dark:text-white">{emp.name}</span>
                                {status === AttendanceStatus.CHECK_IN ? (
                                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">Online</span>
                                ) : (
                                    <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">Offline</span>
                                )}
                            </div>
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                {lastRecord ? (
                                    <>
                                        <p>{status === AttendanceStatus.CHECK_IN ? 'Check-in' : 'Check-out'} lúc: {formatTimeToHHMM(lastRecord.timestamp)}</p>
                                        <p className="text-xs text-gray-400">{formatDateForDisplay(new Date(lastRecord.timestamp))}</p>
                                    </>
                                ) : (
                                    <p>Chưa có dữ liệu chấm công</p>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

const Payroll: React.FC<{ employees: Employee[], records: AttendanceRecord[], jobTitles: JobTitle[] }> = ({ employees, records, jobTitles }) => {
    // Basic payroll calculation logic
    const [period, setPeriod] = useState<'month' | 'week'>('month');
    const now = new Date();
    const { monthStart, monthEnd } = getMonthRange(now);
    const { weekStart, weekEnd } = getWeekRange(now);
    
    const start = period === 'month' ? monthStart : weekStart;
    const end = period === 'month' ? monthEnd : weekEnd;

    return (
        <div className="space-y-4">
            <div className="flex justify-end gap-2">
                <button onClick={() => setPeriod('week')} className={`px-3 py-1 text-sm rounded ${period === 'week' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Tuần này</button>
                <button onClick={() => setPeriod('month')} className={`px-3 py-1 text-sm rounded ${period === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Tháng này</button>
            </div>
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <table className="min-w-full">
                     <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nhân viên</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Chức vụ</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tổng giờ</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lương ước tính</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {employees.map(emp => {
                            const job = jobTitles.find(j => j.id === emp.jobTitleId);
                            const empRecords = records.filter(r => r.employeeId === emp.id && r.timestamp >= start.getTime() && r.timestamp <= end.getTime());
                            
                            // Calc hours
                            let totalHours = 0;
                            const checkInMap = new Map<string, number>();
                            empRecords.forEach(r => {
                                const day = new Date(r.timestamp).toDateString();
                                if (r.status === AttendanceStatus.CHECK_IN && !checkInMap.has(day)) {
                                    checkInMap.set(day, r.timestamp);
                                }
                            });
                            for (const [day, checkInTime] of checkInMap.entries()) {
                                const dayStart = new Date(day).getTime();
                                const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
                                const checkOut = empRecords.find(r => r.status === AttendanceStatus.CHECK_OUT && r.timestamp >= dayStart && r.timestamp <= dayEnd);
                                if (checkOut) {
                                    totalHours += calculateHours(checkInTime, checkOut.timestamp);
                                }
                            }

                            const salary = job ? totalHours * job.hourlyRate : 0;

                            return (
                                <tr key={emp.id}>
                                    <td className="px-6 py-4 dark:text-white">{emp.name}</td>
                                    <td className="px-6 py-4 dark:text-gray-300">{job?.name || '-'}</td>
                                    <td className="px-6 py-4 dark:text-gray-300">{totalHours.toFixed(1)}h</td>
                                    <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salary)}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
};

const RequestManagement: React.FC<{ requests: AttendanceRequest[], onProcess: (req: AttendanceRequest, action: 'approve' | 'reject') => void, onViewImage: (url: string) => void, error: any }> = ({ requests, onProcess, onViewImage, error }) => {
    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800 text-center">
                <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Lỗi quyền truy cập</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">Hệ thống chưa có quyền đọc/ghi vào bộ sưu tập 'requests' trên Firebase.</p>
                <div className="bg-gray-800 text-left p-4 rounded text-xs font-mono text-green-400 overflow-x-auto">
                    <p>{`match /requests/{requestId} {`}</p>
                    <p className="pl-4">{`allow read, write: if true; // Warning: For development only`}</p>
                    <p>{`}`}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nhân viên</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Loại Yêu Cầu</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Lý do</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Bằng chứng</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Trạng thái</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Hành động</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {requests.map(req => (
                        <tr key={req.id}>
                            <td className="px-6 py-4 dark:text-white">
                                <div>{req.employeeName}</div>
                                <div className="text-xs text-gray-500">{formatTimestamp(req.timestamp)}</div>
                            </td>
                            <td className="px-6 py-4 dark:text-gray-300">
                                {req.type === AttendanceStatus.CHECK_IN ? 'Check-in' : 'Check-out'}
                            </td>
                             <td className="px-6 py-4 dark:text-gray-300 text-sm max-w-xs truncate" title={req.reason}>
                                {req.reason}
                            </td>
                            <td className="px-6 py-4">
                                <button onClick={() => onViewImage(req.evidenceImage)} className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                                    <EyeIcon className="h-4 w-4" /> Xem ảnh
                                </button>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    req.status === RequestStatus.PENDING ? 'bg-yellow-100 text-yellow-800' :
                                    req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                    {req.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                                {req.status === RequestStatus.PENDING && (
                                    <>
                                        <button onClick={() => onProcess(req, 'approve')} className="text-green-600 hover:text-green-800"><CheckCircleIcon className="h-5 w-5"/></button>
                                        <button onClick={() => onProcess(req, 'reject')} className="text-red-600 hover:text-red-800"><XCircleIcon className="h-5 w-5"/></button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                    {requests.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">Không có yêu cầu nào.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

const EditEmployeeModal: React.FC<{ employee: Employee, shifts: Shift[], locations: Location[], jobTitles: JobTitle[], onClose: () => void, onSave: (id: string, updates: Partial<Employee>) => void }> = ({ employee, shifts, locations, jobTitles, onClose, onSave }) => {
    const [updates, setUpdates] = useState<Partial<Employee>>({});

    const handleChange = (key: keyof Employee, value: any) => {
        setUpdates(prev => ({ ...prev, [key]: value }));
    }

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(employee.id, updates);
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Sửa thông tin nhân viên</h3>
                <form onSubmit={handleSave} className="space-y-3">
                     <FormInput label="Tên" value={updates.name !== undefined ? updates.name : employee.name} onChange={(e: any) => handleChange('name', e.target.value)} />
                     <FormInput label="Username" value={updates.username !== undefined ? updates.username : employee.username} onChange={(e: any) => handleChange('username', e.target.value)} />
                     <FormSelect label="Ca làm việc" value={updates.shiftId !== undefined ? updates.shiftId : (employee.shiftId || '')} onChange={(e: any) => handleChange('shiftId', e.target.value)}>
                        <option value="">-- Chọn --</option>
                        {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </FormSelect>
                     <FormSelect label="Địa điểm" value={updates.locationId !== undefined ? updates.locationId : (employee.locationId || '')} onChange={(e: any) => handleChange('locationId', e.target.value)}>
                        <option value="">-- Chọn --</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                     </FormSelect>
                     <FormSelect label="Chức vụ" value={updates.jobTitleId !== undefined ? updates.jobTitleId : (employee.jobTitleId || '')} onChange={(e: any) => handleChange('jobTitleId', e.target.value)}>
                        <option value="">-- Chọn --</option>
                        {jobTitles.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                     </FormSelect>

                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded text-gray-800">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const EditShiftModal: React.FC<{
  shift: Shift;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Shift>) => Promise<void>;
}> = ({ shift, onClose, onSave }) => {
    const [name, setName] = useState(shift.name);
    const [startTime, setStartTime] = useState(shift.startTime);
    const [endTime, setEndTime] = useState(shift.endTime);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const updates: Partial<Shift> = {};
        if (name !== shift.name) updates.name = name;
        if (startTime !== shift.startTime) updates.startTime = startTime;
        if (endTime !== shift.endTime) updates.endTime = endTime;
        await onSave(shift.id, updates);
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Chỉnh sửa Ca làm việc</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormInput label="Tên ca" value={name} onChange={(e: any) => setName(e.target.value)} required />
                    <FormInput label="Giờ bắt đầu" type="time" value={startTime} onChange={(e: any) => setStartTime(e.target.value)} required />
                    <FormInput label="Giờ kết thúc" type="time" value={endTime} onChange={(e: any) => setEndTime(e.target.value)} required />
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditLocationModal: React.FC<{
    location: Location;
    onClose: () => void;
    onSave: (id: string, updates: Partial<Location>) => Promise<void>;
}> = ({ location, onClose, onSave }) => {
    const [name, setName] = useState(location.name);
    const [latitude, setLatitude] = useState(location.latitude);
    const [longitude, setLongitude] = useState(location.longitude);
    const [radius, setRadius] = useState(location.radius);
    const [requireSelfie, setRequireSelfie] = useState(location.requireSelfie || false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const updates: Partial<Location> = {};
        if (name !== location.name) updates.name = name;
        if (latitude !== location.latitude) updates.latitude = latitude;
        if (longitude !== location.longitude) updates.longitude = longitude;
        if (radius !== location.radius) updates.radius = radius;
        if (requireSelfie !== location.requireSelfie) updates.requireSelfie = requireSelfie;
        await onSave(location.id, updates);
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Chỉnh sửa Địa điểm</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormInput label="Tên địa điểm" value={name} onChange={(e: any) => setName(e.target.value)} required />
                    <FormInput label="Vĩ độ" type="number" step="any" value={latitude} onChange={(e: any) => setLatitude(parseFloat(e.target.value))} required />
                    <FormInput label="Kinh độ" type="number" step="any" value={longitude} onChange={(e: any) => setLongitude(parseFloat(e.target.value))} required />
                    <FormInput label="Bán kính (m)" type="number" value={radius} onChange={(e: any) => setRadius(parseFloat(e.target.value))} required />
                    <div className="flex items-center gap-2 pt-2">
                        <input id="edit-require-selfie" type="checkbox" checked={requireSelfie} onChange={e => setRequireSelfie(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        <label htmlFor="edit-require-selfie" className="text-sm font-medium text-gray-700 dark:text-gray-300">Yêu cầu Selfie</label>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditJobTitleModal: React.FC<{
    jobTitle: JobTitle;
    onClose: () => void;
    onSave: (id: string, updates: Partial<JobTitle>) => Promise<void>;
}> = ({ jobTitle, onClose, onSave }) => {
    const [name, setName] = useState(jobTitle.name);
    const [hourlyRate, setHourlyRate] = useState(jobTitle.hourlyRate);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const updates: Partial<JobTitle> = {};
        if (name !== jobTitle.name) updates.name = name;
        if (hourlyRate !== jobTitle.hourlyRate) updates.hourlyRate = hourlyRate;
        await onSave(jobTitle.id, updates);
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Chỉnh sửa Chức vụ</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormInput label="Tên chức vụ" value={name} onChange={(e: any) => setName(e.target.value)} required />
                    <FormInput label="Lương/giờ" type="number" value={hourlyRate} onChange={(e: any) => setHourlyRate(parseFloat(e.target.value))} required />
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Shared Form Components
const FormInput = ({ id, label, ...props }: any) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <input
      id={id}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      {...props}
    />
  </div>
);

const FormSelect = ({ id, label, children, ...props }: any) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <select
      id={id}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      {...props}
    >
      {children}
    </select>
  </div>
);

export default AdminDashboard;
