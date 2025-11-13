

import React, { useState, useEffect } from 'react';
import type { Employee, AttendanceRecord, JobTitle } from '../types';
import { AttendanceStatus } from '../types';
import { getRecordsForEmployee, getLastRecordForEmployee, getShifts, getLocations, getJobTitles } from '../services/attendanceService';
import AttendanceScanner from './AttendanceScanner';
import { formatTimestamp, getWeekRange, calculateHours } from '../utils/date';
import { LogoutIcon, MapPinIcon, LoadingIcon, CurrencyDollarIcon } from './icons';

interface EmployeePortalProps {
  employee: Employee;
  onLogout: () => void;
}

const EmployeePortal: React.FC<EmployeePortalProps> = ({ employee, onLogout }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [lastStatus, setLastStatus] = useState<AttendanceStatus | null>(null);
  const [shiftInfo, setShiftInfo] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<JobTitle | null>(null);
  const [weeklyHours, setWeeklyHours] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

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

        // Calculate weekly hours
        const { weekStart, weekEnd } = getWeekRange(new Date());
        const weeklyRecords = employeeRecords.filter(r => r.timestamp >= weekStart.getTime() && r.timestamp <= weekEnd.getTime());
        
        const checkInMap = new Map<string, number>();
        weeklyRecords.forEach(record => {
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

            const checkOuts = weeklyRecords
            .filter(r => r.status === AttendanceStatus.CHECK_OUT && r.timestamp >= dayStart && r.timestamp <= dayEnd)
            .sort((a,b) => b.timestamp - a.timestamp);
            
            if (checkOuts.length > 0) {
                totalHours += calculateHours(checkInTime, checkOuts[0].timestamp);
            }
        }
        setWeeklyHours(parseFloat(totalHours.toFixed(2)));


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
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, employee.shiftId, employee.locationId, employee.jobTitleId]);

  const nextActionText = lastStatus === AttendanceStatus.CHECK_IN ? 'Check-out' : 'Check-in';

  const estimatedSalary = jobTitle ? weeklyHours * jobTitle.hourlyRate : 0;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
       <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div>
                    <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                        Chào mừng, <span className="text-primary-600 dark:text-primary-400">{employee.name}</span>!
                    </h1>
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-4 mt-1 flex-wrap">
                        <span>Tài khoản: <strong className="font-mono">{employee.username}</strong></span>
                        <span>Mã: <strong className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{employee.deviceCode}</strong></span>
                    </div>
                </div>
                <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                   <LogoutIcon className="h-5 w-5"/>
                   <span>Đăng xuất</span>
                </button>
            </div>
        </div>
       </header>

       <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            {isLoading ? (
                <div className="flex justify-center mt-16">
                    <LoadingIcon className="h-12 w-12 text-primary-500"/>
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-6 rounded-lg shadow" role="alert">
                    <p className="font-bold text-lg">Đã xảy ra lỗi</p>
                    <p className="mt-2">{error}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center sticky top-8">
                            <h2 className="text-lg font-semibold mb-1">Chấm công</h2>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 space-y-1">
                                <p>Ca làm việc: <strong>{shiftInfo}</strong></p>
                                <p>Địa điểm: <strong>{locationInfo}</strong></p>
                            </div>
                            
                            <div className="my-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Hành động tiếp theo của bạn là:
                                </p>
                                <p className={`text-2xl font-bold ${lastStatus === AttendanceStatus.CHECK_IN ? 'text-red-500' : 'text-green-500'}`}>{nextActionText}</p>
                            </div>
                        
                            <AttendanceScanner employee={employee} onScanComplete={loadData} />
                        </div>

                         <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                                <CurrencyDollarIcon className="h-6 w-6 text-primary-500"/>
                                <span>Thông tin lương tuần này</span>
                            </h2>
                            <div className="space-y-3 text-gray-700 dark:text-gray-300">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Chức vụ:</span>
                                    <span className="font-semibold">{jobTitle?.name || 'Chưa phân công'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Mức lương:</span>
                                    <span className="font-semibold">{jobTitle ? `${formatCurrency(jobTitle.hourlyRate)}/giờ` : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center border-t dark:border-gray-700 pt-3 mt-3">
                                    <span className="font-medium">Giờ công tuần này:</span>
                                    <span className="font-semibold text-lg text-blue-600 dark:text-blue-400">{weeklyHours} giờ</span>
                                </div>
                                <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/50 p-3 rounded-lg">
                                    <span className="font-bold">Lương ước tính:</span>
                                    <span className="font-bold text-xl text-green-600 dark:text-green-400">{formatCurrency(estimatedSalary)}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Lịch sử chấm công của bạn</h2>
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
       </main>
    </div>
  );
};

export default EmployeePortal;