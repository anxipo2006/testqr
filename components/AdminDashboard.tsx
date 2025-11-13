

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
} from '../services/attendanceService';
import type { Employee, AttendanceRecord, Shift, Location, JobTitle } from '../types';
import { AttendanceStatus } from '../types';
import QRCodeGenerator from './QRCodeGenerator';
import { QrCodeIcon, UserGroupIcon, ListBulletIcon, LogoutIcon, ClockIcon, CalendarDaysIcon, DocumentArrowDownIcon, PencilIcon, XCircleIcon, MapPinIcon, BuildingOffice2Icon, LoadingIcon, CameraIcon, ArrowPathIcon, CurrencyDollarIcon, TagIcon } from './icons';
import { formatTimestamp, formatDateForDisplay, getWeekRange, formatTimeToHHMM, calculateHours } from '../utils/date';



type Tab = 'timesheet' | 'logs' | 'employees' | 'shifts' | 'locations' | 'jobTitles' | 'payroll' | 'qrcode';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('timesheet');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
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
      const { employees, records, shifts, locations, jobTitles } = await getInitialData();
      setEmployees(employees);
      setRecords(records);
      setShifts(shifts);
      setLocations(locations);
      setJobTitles(jobTitles);
    } catch (err: any) {
      console.error("Failed to load data:", err);
      let errorMessage = "Không thể tải dữ liệu. Vui lòng thử lại.";
      if (err && err.code === 'permission-denied') {
          errorMessage = "Lỗi quyền truy cập (permission-denied). Hãy đảm bảo Firestore Security Rules của bạn cho phép đọc dữ liệu. Ví dụ: `allow read, write: if true;` để cho phép truy cập công khai cho mục đích phát triển.";
      } else if (err && err.code) {
          errorMessage = `Lỗi cơ sở dữ liệu: ${err.code}. Vui lòng kiểm tra console để biết thêm chi tiết.`;
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
    // FIX: Handle error safely, ensuring a string message is returned.
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
      default: return 'Bảng điều khiển';
    }
  };

  const renderContent = () => {
    if (isLoading) {
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
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <nav className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col">
          <div className="p-4 border-b dark:border-gray-700">
            <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">Bảng điều khiển Admin</h1>
          </div>
          <ul className="flex-grow p-2 space-y-1">
            <TabButton icon={<CalendarDaysIcon className="h-6 w-6"/>} label="Bảng chấm công" isActive={activeTab === 'timesheet'} onClick={() => { setActiveTab('timesheet'); }} />
            <TabButton icon={<CurrencyDollarIcon className="h-6 w-6"/>} label="Bảng lương" isActive={activeTab === 'payroll'} onClick={() => { setActiveTab('payroll'); }} />
            <TabButton icon={<ListBulletIcon className="h-6 w-6"/>} label="Nhật ký Chấm công" isActive={activeTab === 'logs'} onClick={() => { setActiveTab('logs'); }} />
            <TabButton icon={<UserGroupIcon className="h-6 w-6"/>} label="Quản lý Nhân viên" isActive={activeTab === 'employees'} onClick={() => { setActiveTab('employees'); }} />
            <TabButton icon={<ClockIcon className="h-6 w-6"/>} label="Quản lý Ca làm việc" isActive={activeTab === 'shifts'} onClick={() => { setActiveTab('shifts'); }} /> 
            <TabButton icon={<BuildingOffice2Icon className="h-6 w-6"/>} label="Quản lý Địa điểm" isActive={activeTab === 'locations'} onClick={() => { setActiveTab('locations'); }} />
            <TabButton icon={<TagIcon className="h-6 w-6"/>} label="Quản lý Chức vụ" isActive={activeTab === 'jobTitles'} onClick={() => { setActiveTab('jobTitles'); }} />
            <TabButton icon={<QrCodeIcon className="h-6 w-6"/>} label="Mã QR Chấm công" isActive={activeTab === 'qrcode'} onClick={() => setActiveTab('qrcode')} />
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
            </div>
            <div className="flex-grow overflow-auto pr-2">
                {renderContent()}
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
             <img src={viewingImage} alt="Ảnh selfie chấm công" className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" />
             <button onClick={() => setViewingImage(null)} className="absolute -top-4 -right-4 text-white bg-gray-800 rounded-full p-1">
                <XCircleIcon className="w-8 h-8"/>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const TabButton: React.FC<{icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void}> = ({ icon, label, isActive, onClick }) => (
  <li>
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 ${
        isActive
          ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  </li>
);

const AttendanceLog: React.FC<{records: AttendanceRecord[], onViewImage: (imageUrl: string) => void}> = ({ records, onViewImage }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
          <tr>
            <th scope="col" className="px-6 py-3">Tên đăng nhập</th>
            <th scope="col" className="px-6 py-3">Tên nhân viên</th>
            <th scope="col" className="px-6 py-3">Thời gian</th>
            <th scope="col" className="px-6 py-3">Ảnh Selfie</th>
            <th scope="col" className="px-6 py-3">Ca làm việc</th>
            <th scope="col" className="px-6 py-3">Trạng thái</th>
            <th scope="col" className="px-6 py-3">Vị trí</th>
            <th scope="col" className="px-6 py-3">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {records.map(record => (
            <tr key={record.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
              <td className="px-6 py-4 font-mono text-sm text-gray-500 dark:text-gray-400">{record.username}</td>
              <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{record.employeeName}</td>
              <td className="px-6 py-4">{formatTimestamp(record.timestamp)}</td>
              <td className="px-6 py-4">
                {record.selfieImage ? (
                  <img 
                    src={record.selfieImage} 
                    alt="Selfie" 
                    className="h-10 w-10 rounded-full object-cover cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => onViewImage(record.selfieImage!)}
                  />
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4">{record.shiftName || 'Không có'}</td>
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
                    <span className="text-xs text-gray-400">({record.accuracy?.toFixed(0)}m)</span>
                  </a>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm font-medium">
                {record.isLate && <span className="text-red-500">Đi trễ</span>}
                {record.isEarly && <span className="text-yellow-600 dark:text-yellow-400">Về sớm</span>}
                {!record.isLate && !record.isEarly && <span className="text-gray-400">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 && <p className="text-center py-8 text-gray-500">Chưa có dữ liệu chấm công.</p>}
    </div>
  </div>
);

const EmployeeManagement: React.FC<{
  employees: Employee[],
  shifts: Shift[],
  locations: Location[],
  jobTitles: JobTitle[],
  onAddEmployee: (employeeData: Omit<Employee, 'id' | 'deviceCode'>) => Promise<void>,
  onDeleteEmployee: (id: string) => Promise<void>,
  onEditEmployee: (employee: Employee) => void,
}> = ({ employees, shifts, locations, jobTitles, onAddEmployee, onDeleteEmployee, onEditEmployee }) => {
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeUsername, setNewEmployeeUsername] = useState('');
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedJobTitleId, setSelectedJobTitleId] = useState('');
  const [employeeAddError, setEmployeeAddError] = useState('');

  const shiftMap = new Map(shifts.map(s => [s.id, s.name]));
  const locationMap = new Map(locations.map(l => [l.id, l.name]));
  const jobTitleMap = new Map(jobTitles.map(j => [j.id, j.name]));

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmployeeAddError('');
    try {
      await onAddEmployee({
        name: newEmployeeName,
        username: newEmployeeUsername,
        password: newEmployeePassword,
        shiftId: selectedShiftId || null,
        locationId: selectedLocationId || null,
        jobTitleId: selectedJobTitleId || null,
      });
      setNewEmployeeName('');
      setNewEmployeeUsername('');
      setNewEmployeePassword('');
      setSelectedShiftId('');
      setSelectedLocationId('');
      setSelectedJobTitleId('');
    // FIX: Handle error safely by checking if it's an instance of Error.
    } catch (error) {
      if (error instanceof Error) {
        setEmployeeAddError(error.message);
      } else {
        setEmployeeAddError('An unknown error occurred.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Thêm Nhân viên mới</h3>
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormInput id="emp-name" label="Tên hiển thị" value={newEmployeeName} onChange={e => setNewEmployeeName(e.target.value)} placeholder="VD: Nguyễn Văn A" required />
            <FormInput id="emp-username" label="Tên đăng nhập" value={newEmployeeUsername} onChange={e => setNewEmployeeUsername(e.target.value)} placeholder="VD: nguyenvana" required />
            <FormInput id="emp-password" label="Mật khẩu" type="password" value={newEmployeePassword} onChange={e => setNewEmployeePassword(e.target.value)} placeholder="••••••••" required />
            
             <FormSelect id="job-title-select" label="Chức vụ" value={selectedJobTitleId} onChange={e => setSelectedJobTitleId(e.target.value)}>
              <option value="">Chưa phân công</option>
              {jobTitles.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
            </FormSelect>

            <FormSelect id="shift-select" label="Ca làm việc" value={selectedShiftId} onChange={e => setSelectedShiftId(e.target.value)}>
              <option value="">Không phân ca</option>
              {shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.name} ({shift.startTime} - {shift.endTime})</option>)}
            </FormSelect>
            
            <FormSelect id="location-select" label="Địa điểm" value={selectedLocationId} onChange={e => setSelectedLocationId(e.target.value)}>
              <option value="">Không có</option>
              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </FormSelect>
          </div>
          <button type="submit" className="mt-4 w-full sm:w-auto px-6 py-2 font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Thêm nhân viên</button>
          {employeeAddError && <p className="text-red-500 text-sm mt-2">{employeeAddError}</p>}
        </form>
      </div>

      <div className="space-y-4">
        {employees.map(employee => (
          <div key={employee.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-grow">
               <p className="font-bold text-lg text-gray-900 dark:text-white">{employee.name}</p>
               <div className="flex items-center gap-2">
                 <p className="font-mono text-sm text-primary-600 dark:text-primary-400">{employee.username}</p>
                 <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">{employee.jobTitleId && jobTitleMap.get(employee.jobTitleId) || 'Chưa có chức vụ'}</span>
               </div>
               <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex items-center gap-2"><strong>Mã:</strong> <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{employee.deviceCode}</span></div>
                  <div className="flex items-center gap-2 truncate"><strong>Ca:</strong> <span className="truncate">{employee.shiftId && shiftMap.get(employee.shiftId) || 'Chưa phân'}</span></div>
                  <div className="flex items-center gap-2 truncate col-span-2"><strong>Địa điểm:</strong> <span className="truncate">{employee.locationId && locationMap.get(employee.locationId) || 'Chưa phân'}</span></div>
               </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <button onClick={() => onEditEmployee(employee)} className="p-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 dark:text-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors">
                    <PencilIcon className="h-5 w-5" />
                </button>
                <button onClick={() => onDeleteEmployee(employee.id)} className="p-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
            </div>
          </div>
        ))}
      </div>
     {employees.length === 0 && <p className="text-center py-8 text-gray-500">Chưa có nhân viên nào.</p>}
    </div>
  );
};

const ShiftManagement: React.FC<{
  shifts: Shift[],
  onAddShift: (name: string, startTime: string, endTime: string) => Promise<void>,
  onDeleteShift: (id: string) => Promise<void>,
  onEditShift: (shift: Shift) => void,
}> = ({ shifts, onAddShift, onDeleteShift, onEditShift }) => {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await onAddShift(name, startTime, endTime);
      setName('');
      setStartTime('');
      setEndTime('');
    // FIX: Handle error safely by checking if it's an instance of Error.
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    }
  }

  return (
    <div className="space-y-6">
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Thêm Ca làm việc mới</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
                <FormInput id="shift-name" label="Tên ca" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Ca Sáng" required />
            </div>
            <FormInput id="start-time" label="Giờ bắt đầu" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
            <FormInput id="end-time" label="Giờ kết thúc" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
          </div>
          <button type="submit" className="mt-4 px-6 py-2 font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700">Thêm ca</button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
      </div>
       <div className="space-y-3">
        {shifts.map(shift => (
          <div key={shift.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {shift.name} <span className="text-gray-500 dark:text-gray-400 font-normal">({shift.startTime} - {shift.endTime})</span>
            </span>
            <div className="flex items-center gap-2">
                <button onClick={() => onEditShift(shift)} className="p-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 dark:text-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">
                    <PencilIcon className="h-5 w-5" />
                </button>
                <button onClick={() => onDeleteShift(shift.id)} className="p-2 text-white bg-red-600 rounded-md hover:bg-red-700">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
            </div>
          </div>
        ))}
      </div>
      {shifts.length === 0 && <p className="text-center py-8 text-gray-500">Chưa có ca làm việc nào.</p>}
    </div>
  );
};

const LocationManagement: React.FC<{
  locations: Location[],
  onAddLocation: (location: Omit<Location, 'id'>) => Promise<void>,
  onDeleteLocation: (id: string) => Promise<void>,
  onEditLocation: (location: Location) => void,
}> = ({ locations, onAddLocation, onDeleteLocation, onEditLocation }) => {
    const [name, setName] = useState('');
    const [latitude, setLatitude] = useState<number | ''>('');
    const [longitude, setLongitude] = useState<number | ''>('');
    const [radius, setRadius] = useState<number | ''>(50);
    const [requireSelfie, setRequireSelfie] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    
    const handleGetCurrentLocation = () => {
      setIsFetchingLocation(true);
      setMessage(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setIsFetchingLocation(false);
        },
        (error) => {
          setMessage({ type: 'error', text: `Lỗi khi lấy vị trí: ${error.message}` });
          setIsFetchingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (name.trim() === '' || latitude === '' || longitude === '' || radius === '' || radius <= 0) {
            setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin và bán kính phải là số dương.' });
            return;
        }
        await onAddLocation({ name, latitude, longitude, radius, requireSelfie });
        setName('');
        setLatitude('');
        setLongitude('');
        setRadius(50);
        setRequireSelfie(false);
    }
    
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Thêm Địa điểm mới</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <FormInput id="loc-name" label="Tên địa điểm" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Văn phòng chính" required />
                        </div>
                        <FormInput id="loc-lat" label="Vĩ độ (Latitude)" type="number" step="any" value={latitude} onChange={e => setLatitude(parseFloat(e.target.value) || '')} required />
                        <FormInput id="loc-lon" label="Kinh độ (Longitude)" type="number" step="any" value={longitude} onChange={e => setLongitude(parseFloat(e.target.value) || '')} required />
                        <div className="sm:col-span-2">
                            <button type="button" onClick={handleGetCurrentLocation} disabled={isFetchingLocation} className="text-sm font-medium text-primary-600 hover:underline disabled:text-gray-400 disabled:cursor-wait">
                                {isFetchingLocation ? 'Đang lấy vị trí...' : 'Lấy vị trí hiện tại'}
                            </button>
                        </div>
                        <FormInput id="loc-radius" label="Bán kính (mét)" type="number" value={radius} onChange={e => setRadius(parseInt(e.target.value, 10) || '')} required />
                        <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                            <input id="require-selfie" type="checkbox" checked={requireSelfie} onChange={e => setRequireSelfie(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                            <label htmlFor="require-selfie" className="text-sm font-medium text-gray-700 dark:text-gray-300">Yêu cầu ảnh selfie khi chấm công</label>
                        </div>
                    </div>
                    <button type="submit" className="mt-4 px-6 py-2 font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700">Thêm Địa điểm</button>
                    {message && <p className={`text-sm mt-2 text-center ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{message.text}</p>}
                </form>
            </div>
            <div className="space-y-3">
                {locations.map(loc => (
                    <div key={loc.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{loc.name}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                               <span>Bán kính: {loc.radius}m</span>
                               {loc.requireSelfie && <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400"><CameraIcon className="h-4 w-4"/> Yêu cầu Selfie</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => onEditLocation(loc)} className="p-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 dark:text-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">
                                <PencilIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => onDeleteLocation(loc.id)} className="p-2 text-white bg-red-600 rounded-md hover:bg-red-700">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
             {locations.length === 0 && <p className="text-center py-8 text-gray-500">Chưa có địa điểm nào được cấu hình.</p>}
        </div>
    );
};


const JobTitleManagement: React.FC<{
  jobTitles: JobTitle[],
  onAddJobTitle: (name: string, hourlyRate: number) => Promise<void>,
  onDeleteJobTitle: (id: string) => Promise<void>,
  onEditJobTitle: (jobTitle: JobTitle) => void,
}> = ({ jobTitles, onAddJobTitle, onDeleteJobTitle, onEditJobTitle }) => {
  const [name, setName] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number | ''>('');
  const [error, setError] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (hourlyRate === '' || hourlyRate <= 0) {
        setError('Mức lương phải là một số dương.');
        return;
    }
    try {
      await onAddJobTitle(name, hourlyRate);
      setName('');
      setHourlyRate('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    }
  }

  return (
    <div className="space-y-6">
       <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Thêm Chức vụ mới</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput id="job-title-name" label="Tên chức vụ" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Phục vụ" required />
            <FormInput id="hourly-rate" label="Lương theo giờ (VND)" type="number" value={hourlyRate} onChange={e => setHourlyRate(parseInt(e.target.value, 10) || '')} placeholder="VD: 25000" required />
          </div>
          <button type="submit" className="mt-4 px-6 py-2 font-semibold text-white bg-primary-600 rounded-md hover:bg-primary-700">Thêm chức vụ</button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </form>
      </div>
       <div className="space-y-3">
        {jobTitles.map(jt => (
          <div key={jt.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between">
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {jt.name} <span className="text-gray-500 dark:text-gray-400 font-normal">({formatCurrency(jt.hourlyRate)}/giờ)</span>
            </span>
            <div className="flex items-center gap-2">
                <button onClick={() => onEditJobTitle(jt)} className="p-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 dark:text-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">
                    <PencilIcon className="h-5 w-5" />
                </button>
                <button onClick={() => onDeleteJobTitle(jt.id)} className="p-2 text-white bg-red-600 rounded-md hover:bg-red-700">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                </button>
            </div>
          </div>
        ))}
      </div>
      {jobTitles.length === 0 && <p className="text-center py-8 text-gray-500">Chưa có chức vụ nào.</p>}
    </div>
  );
};


interface DailyAttendance {
  checkIn: number | null;
  checkOut: number | null;
  hours: number;
  isLate: boolean;
  isEarly: boolean;
}

interface WeeklyAttendanceData {
  employeeName: string;
  dailyData: DailyAttendance[];
  totalHours: number;
}

const AttendanceTimesheet: React.FC<{ employees: Employee[], records: AttendanceRecord[] }> = ({ employees, records }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [processedData, setProcessedData] = useState<Map<string, WeeklyAttendanceData>>(new Map());

  useEffect(() => {
    const { weekStart } = getWeekRange(currentDate);
    const data = new Map<string, WeeklyAttendanceData>();

    employees.forEach(employee => {
      const weeklyRecords: DailyAttendance[] = [];
      let totalWeekHours = 0;

      for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        const dayStart = new Date(day).setHours(0, 0, 0, 0);
        const dayEnd = new Date(day).setHours(23, 59, 59, 999);

        const dayRecords = records.filter(r =>
          r.employeeId === employee.id &&
          r.timestamp >= dayStart &&
          r.timestamp <= dayEnd
        );

        const checkIns = dayRecords
            .filter(r => r.status === AttendanceStatus.CHECK_IN)
            .sort((a, b) => a.timestamp - b.timestamp);
        const checkOuts = dayRecords
            .filter(r => r.status === AttendanceStatus.CHECK_OUT)
            .sort((a, b) => b.timestamp - a.timestamp);

        const firstCheckInRecord = checkIns.length > 0 ? checkIns[0] : null;
        const lastCheckOutRecord = checkOuts.length > 0 ? checkOuts[0] : null;

        const firstCheckIn = firstCheckInRecord ? firstCheckInRecord.timestamp : null;
        const lastCheckOut = lastCheckOutRecord ? lastCheckOutRecord.timestamp : null;
        
        const dayHours = calculateHours(firstCheckIn, lastCheckOut);
        totalWeekHours += dayHours;
        
        weeklyRecords.push({ 
            checkIn: firstCheckIn, 
            checkOut: lastCheckOut, 
            hours: dayHours,
            isLate: firstCheckInRecord?.isLate || false,
            isEarly: lastCheckOutRecord?.isEarly || false,
        });
      }

      data.set(employee.id, {
        employeeName: employee.name,
        dailyData: weeklyRecords,
        totalHours: parseFloat(totalWeekHours.toFixed(2)),
      });
    });

    setProcessedData(data);
  }, [currentDate, employees, records]);

  const handlePrevWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  };
  
  const handleExport = () => {
    const { weekStart } = getWeekRange(currentDate);
    const headers = ['Nhân viên', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật', 'Tổng giờ làm'];
    const rows = [headers.join(',')];

    processedData.forEach((data) => {
      const rowData = [data.employeeName];
      data.dailyData.forEach(day => {
        if (day.checkIn && day.checkOut) {
          rowData.push(`"${formatTimeToHHMM(day.checkIn)} - ${formatTimeToHHMM(day.checkOut)}"`);
        } else if (day.checkIn) {
          rowData.push(`"${formatTimeToHHMM(day.checkIn)} - "`);
        } else {
          rowData.push('-');
        }
      });
      rowData.push(data.totalHours.toString());
      rows.push(rowData.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + '\uFEFF' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_cao_cham_cong_tuan_${formatDateForDisplay(weekStart).replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { weekStart } = getWeekRange(currentDate);
  const weekDays = [...Array(7)].map((_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const today = new Date();
  today.setHours(0,0,0,0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
             <button onClick={handlePrevWeek} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">{'<'}</button>
             <span>{formatDateForDisplay(weekStart)} - {formatDateForDisplay(getWeekRange(currentDate).weekEnd)}</span>
             <button onClick={handleNextWeek} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">{'>'}</button>
          </div>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
<DocumentArrowDownIcon className="h-5 w-5" />
          <span>Xuất CSV</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 border-collapse">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-3 sticky left-0 bg-gray-50 dark:bg-gray-700 min-w-[200px]">Nhân viên</th>
              {weekDays.map((day, i) => (
                <th key={i} scope="col" className={`px-4 py-3 text-center min-w-[150px] ${day.getTime() === today.getTime() ? 'bg-primary-100 dark:bg-primary-900/50' : ''}`}>
                  <div>{dayLabels[i]}</div>
                  <div className="font-normal">{formatDateForDisplay(day)}</div>
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right">Tổng giờ</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(processedData.entries()).map(([employeeId, data]) => (
              <tr key={employeeId} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-4 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white sticky left-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-600">{data.employeeName}</td>
                {data.dailyData.map((day, i) => (
                  <td key={i} className={`px-4 py-4 text-center ${weekDays[i].getTime() === today.getTime() ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                    {day.checkIn && day.checkOut ? (
                      <div>
                        <span>{formatTimeToHHMM(day.checkIn)} - {formatTimeToHHMM(day.checkOut)}</span>
                        <div className="text-xs text-gray-500">({day.hours}h)</div>
                         {day.isLate && <div className="text-xs text-red-500">Đi trễ</div>}
                         {day.isEarly && <div className="text-xs text-yellow-500">Về sớm</div>}
                      </div>
                    ) : day.checkIn ? (
                       <span>{formatTimeToHHMM(day.checkIn)} - ?</span>
                    ) : '-'}
                  </td>
                ))}
                <td className="px-4 py-4 font-bold text-right text-gray-800 dark:text-gray-200">{data.totalHours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && <p className="text-center py-8 text-gray-500">Chưa có nhân viên nào để hiển thị.</p>}
      </div>
    </div>
  );
};


interface PayrollData {
  employeeName: string;
  jobTitle: string;
  hourlyRate: number;
  totalHours: number;
  totalSalary: number;
}

const Payroll: React.FC<{ employees: Employee[], records: AttendanceRecord[], jobTitles: JobTitle[] }> = ({ employees, records, jobTitles }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);

  const jobTitleMap = new Map(jobTitles.map(jt => [jt.id, jt]));
  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  
  useEffect(() => {
    const { weekStart, weekEnd } = getWeekRange(currentDate);

    const processed = employees.map(employee => {
      const employeeRecords = records.filter(r => 
        r.employeeId === employee.id && 
        r.timestamp >= weekStart.getTime() && 
        r.timestamp <= weekEnd.getTime()
      );

      const checkInMap = new Map<string, number>();
      employeeRecords.forEach(record => {
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

        const checkOuts = employeeRecords
          .filter(r => r.status === AttendanceStatus.CHECK_OUT && r.timestamp >= dayStart && r.timestamp <= dayEnd)
          .sort((a,b) => b.timestamp - a.timestamp);
        
        if (checkOuts.length > 0) {
            totalHours += calculateHours(checkInTime, checkOuts[0].timestamp);
        }
      }

      const jobTitle = employee.jobTitleId ? jobTitleMap.get(employee.jobTitleId) : null;
      const hourlyRate = jobTitle?.hourlyRate || 0;
      const totalSalary = totalHours * hourlyRate;

      return {
        employeeName: employee.name,
        jobTitle: jobTitle?.name || 'Chưa phân công',
        hourlyRate,
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalSalary
      };
    });

    setPayrollData(processed);
  }, [currentDate, employees, records, jobTitles, jobTitleMap]);

   const handlePrevWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  };

  const handleExport = () => {
    const { weekStart } = getWeekRange(currentDate);
    const headers = ['Nhân viên', 'Chức vụ', 'Lương/giờ', 'Tổng giờ', 'Tổng lương'];
    const rows = [headers.join(',')];

    payrollData.forEach((data) => {
        rows.push([
            data.employeeName,
            data.jobTitle,
            data.hourlyRate,
            data.totalHours,
            data.totalSalary
        ].join(','));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + '\uFEFF' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bang_luong_tuan_${formatDateForDisplay(weekStart).replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const { weekStart, weekEnd } = getWeekRange(currentDate);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
         <div>
          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
             <button onClick={handlePrevWeek} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">{'<'}</button>
             <span>{formatDateForDisplay(weekStart)} - {formatDateForDisplay(weekEnd)}</span>
             <button onClick={handleNextWeek} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">{'>'}</button>
          </div>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
            <DocumentArrowDownIcon className="h-5 w-5" />
            <span>Xuất CSV</span>
        </button>
      </div>
       <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Nhân viên</th>
              <th scope="col" className="px-6 py-3">Chức vụ</th>
              <th scope="col" className="px-6 py-3">Lương/giờ</th>
              <th scope="col" className="px-6 py-3">Tổng giờ</th>
              <th scope="col" className="px-6 py-3">Tổng lương</th>
            </tr>
          </thead>
          <tbody>
            {payrollData.map((data, index) => (
              <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{data.employeeName}</td>
                <td className="px-6 py-4">{data.jobTitle}</td>
                <td className="px-6 py-4">{formatCurrency(data.hourlyRate)}</td>
                <td className="px-6 py-4">{data.totalHours}h</td>
                <td className="px-6 py-4 font-bold text-primary-600 dark:text-primary-400">{formatCurrency(data.totalSalary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
         {employees.length === 0 && <p className="text-center py-8 text-gray-500">Chưa có nhân viên nào để tính lương.</p>}
      </div>
    </div>
  );
};



const EditEmployeeModal: React.FC<{
  employee: Employee;
  shifts: Shift[];
  locations: Location[];
  jobTitles: JobTitle[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Employee>) => Promise<{ success: boolean, message?: string }>;
}> = ({ employee, shifts, locations, jobTitles, onClose, onSave }) => {
  const [name, setName] = useState(employee.name);
  const [username, setUsername] = useState(employee.username);
  const [password, setPassword] = useState('');
  const [shiftId, setShiftId] = useState(employee.shiftId || '');
  const [locationId, setLocationId] = useState(employee.locationId || '');
  const [jobTitleId, setJobTitleId] = useState(employee.jobTitleId || '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    const updates: Partial<Employee> = {};
    if (name !== employee.name) updates.name = name;
    if (username !== employee.username) updates.username = username;
    if (password) updates.password = password;
    updates.shiftId = shiftId || null;
    updates.locationId = locationId || null;
    updates.jobTitleId = jobTitleId || null;
    
    const result = await onSave(employee.id, updates);
    if (!result.success) {
        setError(result.message || 'Lỗi không xác định.');
    }
    
    setIsSaving(false);
    if(result.success) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Chỉnh sửa Nhân viên</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput label="Tên hiển thị" value={name} onChange={e => setName(e.target.value)} required />
          <FormInput label="Tên đăng nhập" value={username} onChange={e => setUsername(e.target.value)} required />
          <FormInput label="Mật khẩu mới" type="password" onChange={e => setPassword(e.target.value)} placeholder="Để trống nếu không đổi" />
          <FormSelect label="Chức vụ" value={jobTitleId} onChange={e => setJobTitleId(e.target.value)}>
            <option value="">Chưa phân công</option>
            {jobTitles.map(jt => <option key={jt.id} value={jt.id}>{jt.name}</option>)}
          </FormSelect>
          <FormSelect label="Ca làm việc" value={shiftId} onChange={e => setShiftId(e.target.value)}>
            <option value="">Không phân ca</option>
            {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </FormSelect>
          <FormSelect label="Địa điểm" value={locationId} onChange={e => setLocationId(e.target.value)}>
            <option value="">Không có địa điểm</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </FormSelect>
           {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-primary-400">
                {isSaving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Chỉnh sửa Ca làm việc</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormInput label="Tên ca" value={name} onChange={e => setName(e.target.value)} required />
                    <FormInput label="Giờ bắt đầu" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                    <FormInput label="Giờ kết thúc" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

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
        if(requireSelfie !== location.requireSelfie) updates.requireSelfie = requireSelfie;
        await onSave(location.id, updates);
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Chỉnh sửa Địa điểm</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormInput label="Tên địa điểm" value={name} onChange={e => setName(e.target.value)} required />
                    <FormInput label="Vĩ độ" type="number" step="any" value={latitude} onChange={e => setLatitude(parseFloat(e.target.value))} required />
                    <FormInput label="Kinh độ" type="number" step="any" value={longitude} onChange={e => setLongitude(parseFloat(e.target.value))} required />
                    <FormInput label="Bán kính (mét)" type="number" value={radius} onChange={e => setRadius(parseInt(e.target.value, 10))} required />
                    <div className="flex items-center gap-2">
                        <input id="edit-require-selfie" type="checkbox" checked={requireSelfie} onChange={e => setRequireSelfie(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        <label htmlFor="edit-require-selfie" className="text-sm font-medium text-gray-700 dark:text-gray-300">Yêu cầu ảnh selfie</label>
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
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Chỉnh sửa Chức vụ</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormInput label="Tên chức vụ" value={name} onChange={e => setName(e.target.value)} required />
                    <FormInput label="Lương/giờ (VND)" type="number" value={hourlyRate} onChange={e => setHourlyRate(parseInt(e.target.value, 10) || 0)} required />
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Hủy</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Lưu</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Reusable Form Components ---
const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <input
      id={id}
      {...props}
      className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
    />
  </div>
);

const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, id, children, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <select
      id={id}
      {...props}
      className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {children}
    </select>
  </div>
);

export default AdminDashboard;