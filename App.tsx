
import { useState, useEffect } from 'react';
import type { CurrentUser, Employee, AdminAccount } from './types';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import EmployeePortal from './components/EmployeePortal';
import { LoadingIcon } from './components/icons';
import { useLocalStorage } from './hooks/useLocalStorage';
import { login } from './services/attendanceService';

function App() {
  const [currentUser, setCurrentUser] = useLocalStorage<CurrentUser | null>('currentUser', null);
  const [originalAdmin, setOriginalAdmin] = useLocalStorage<CurrentUser | null>('originalAdmin', null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedDeviceCode, setSavedDeviceCode] = useLocalStorage<string | null>('employeeDeviceCode', null);

  useEffect(() => {
    const autoLogin = async () => {
      if (!currentUser && savedDeviceCode) {
        try {
          const user = await login('employee', { deviceCode: savedDeviceCode });
          if (user) {
            setCurrentUser(user);
          } else {
            setSavedDeviceCode(null);
          }
        } catch (error) {
          console.error("Auto-login failed:", error);
          setSavedDeviceCode(null);
        }
      }
      setIsLoading(false);
    };

    if (!originalAdmin) {
        autoLogin();
    } else {
        setIsLoading(false);
    }
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    setSavedDeviceCode(null);
    setOriginalAdmin(null);
  };

  const handleLogin = (user: CurrentUser) => {
    if ('deviceCode' in user) {
        setSavedDeviceCode(user.deviceCode);
    }
    setOriginalAdmin(null);
    setCurrentUser(user);
  };
  
  const handleImpersonate = (employeeToImpersonate: Employee) => {
    if (currentUser && 'role' in currentUser) {
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
  } else if ('role' in currentUser && currentUser.role === 'SUPER_ADMIN') {
    content = <SuperAdminDashboard onLogout={handleLogout} />;
  } else {
    content = <AdminDashboard 
                admin={currentUser as AdminAccount}
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
