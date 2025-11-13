
import { useState, useEffect } from 'react';
import type { CurrentUser, Employee } from './types';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import EmployeePortal from './components/EmployeePortal';
import { LoadingIcon } from './components/icons';
import { useLocalStorage } from './hooks/useLocalStorage';
import { login } from './services/attendanceService';


function App() {
  const [currentUser, setCurrentUser] = useLocalStorage<CurrentUser | null>('currentUser', null);
  const [originalAdmin, setOriginalAdmin] = useLocalStorage<CurrentUser | null>('originalAdmin', null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedDeviceCode, setSavedDeviceCode] = useLocalStorage<string | null>('employeeDeviceCode', null);

  // Kiểm tra mã đã lưu để tự động đăng nhập
  useEffect(() => {
    const autoLogin = async () => {
      // Nếu không có người dùng hiện tại nhưng có mã đã lưu
      if (!currentUser && savedDeviceCode) {
        try {
          const user = await login('employee', { deviceCode: savedDeviceCode });
          if (user) {
            setCurrentUser(user);
          } else {
            // Mã đã lưu không hợp lệ (ví dụ: nhân viên đã bị xóa)
            setSavedDeviceCode(null);
          }
        } catch (error) {
          console.error("Auto-login failed:", error);
          setSavedDeviceCode(null); // Xóa mã không hợp lệ
        }
      }
      setIsLoading(false);
    };

    // Chỉ tự động đăng nhập nếu không có phiên giả lập
    if (!originalAdmin) {
        autoLogin();
    } else {
        setIsLoading(false);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleLogout = () => {
    setCurrentUser(null);
    setSavedDeviceCode(null); // Xóa mã đã lưu khi đăng xuất
    setOriginalAdmin(null); // Xóa phiên giả lập
  };

  const handleLogin = (user: CurrentUser) => {
    // Nếu người dùng đăng nhập là nhân viên, lưu mã của họ
    if ('deviceCode' in user) {
        setSavedDeviceCode(user.deviceCode);
    }
    // Xóa bất kỳ phiên giả lập nào còn sót lại khi đăng nhập mới
    setOriginalAdmin(null);
    setCurrentUser(user);
  };
  
  const handleImpersonate = (employeeToImpersonate: Employee) => {
    if (currentUser && !('deviceCode' in currentUser)) { // Ensure it's an admin
      setOriginalAdmin(currentUser);
      setCurrentUser(employeeToImpersonate);
    }
  };

  const handleStopImpersonation = () => {
    if (originalAdmin) {
      setCurrentUser(originalAdmin);
      setOriginalAdmin(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <LoadingIcon className="h-12 w-12 text-primary-600" />
      </div>
    );
  }

  let content;
  if (!currentUser) {
    content = <LoginScreen onLogin={handleLogin} />;
  } else if ('deviceCode' in currentUser) {
    content = <EmployeePortal 
                employee={currentUser} 
                onLogout={handleLogout}
                impersonatingAdmin={originalAdmin}
                onStopImpersonation={handleStopImpersonation}
              />;
  } else {
    content = <AdminDashboard 
                onLogout={handleLogout} 
                onImpersonate={handleImpersonate}
              />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {content}
    </div>
  );
}

export default App;