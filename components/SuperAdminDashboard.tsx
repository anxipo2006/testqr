
import React, { useState, useEffect } from 'react';
import { getCompanies, addCompany, addCompanyAdmin, getCompanyAdmins } from '../services/attendanceService';
import type { Company, AdminAccount } from '../types';
import { BuildingOffice2Icon, UserGroupIcon, LoadingIcon, PlusIcon, LogoutIcon } from './icons';

const SuperAdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyAdmins, setCompanyAdmins] = useState<AdminAccount[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', username: '', password: '' });

  const loadCompanies = async () => {
    setIsLoading(true);
    const data = await getCompanies();
    setCompanies(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    await addCompany(newCompanyName);
    setNewCompanyName('');
    setShowAddCompany(false);
    loadCompanies();
  };

  const handleSelectCompany = async (company: Company) => {
    setSelectedCompany(company);
    const admins = await getCompanyAdmins(company.id);
    setCompanyAdmins(admins);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    await addCompanyAdmin(selectedCompany.id, newAdmin.name, newAdmin.username, newAdmin.password);
    setNewAdmin({ name: '', username: '', password: '' });
    setShowAddAdmin(false);
    handleSelectCompany(selectedCompany);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <nav className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col">
        <div className="p-6 border-b dark:border-gray-700 font-bold text-xl text-primary-600">SUPER ADMIN</div>
        <div className="p-4 flex-grow overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-sm font-bold text-gray-500 uppercase">Công ty</h2>
             <button onClick={() => setShowAddCompany(true)} className="text-primary-600"><PlusIcon className="h-5 w-5"/></button>
          </div>
          {isLoading ? (
              <div className="flex justify-center p-4"><LoadingIcon className="h-6 w-6 text-primary-500" /></div>
          ) : (
              <ul className="space-y-2">
                {companies.map(c => (
                  <li key={c.id}>
                    <button 
                      onClick={() => handleSelectCompany(c)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${selectedCompany?.id === c.id ? 'bg-primary-100 text-primary-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
          )}
        </div>
        <div className="p-4 border-t dark:border-gray-700">
           <button onClick={onLogout} className="flex items-center gap-2 text-red-600 text-sm font-bold"><LogoutIcon className="h-5 w-5"/> Đăng xuất</button>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 p-10">
        {selectedCompany ? (
          <div>
            <div className="flex justify-between items-center mb-8">
               <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                 <BuildingOffice2Icon className="h-8 w-8 text-primary-500"/>
                 {selectedCompany.name}
               </h1>
               <button onClick={() => setShowAddAdmin(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2">
                 <UserGroupIcon className="h-5 w-5" /> Thêm Admin
               </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
               <div className="p-6 border-b dark:border-gray-700 font-bold">Danh sách Quản trị viên</div>
               <table className="min-w-full">
                 <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700 text-left text-xs uppercase text-gray-500">
                      <th className="px-6 py-3">Họ tên</th>
                      <th className="px-6 py-3">Username</th>
                      <th className="px-6 py-3">Mật khẩu</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y dark:divide-gray-700">
                    {companyAdmins.map(admin => (
                      <tr key={admin.id}>
                        <td className="px-6 py-4 dark:text-white font-medium">{admin.name}</td>
                        <td className="px-6 py-4 dark:text-gray-300 font-mono">{admin.username}</td>
                        <td className="px-6 py-4 dark:text-gray-300 font-mono">{admin.password}</td>
                      </tr>
                    ))}
                    {companyAdmins.length === 0 && (
                      <tr><td colSpan={3} className="p-10 text-center text-gray-400">Chưa có tài khoản admin nào cho công ty này.</td></tr>
                    )}
                 </tbody>
               </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
             <BuildingOffice2Icon className="h-20 w-20 mb-4 opacity-20"/>
             <p className="text-xl">Chọn một công ty ở thanh menu bên trái để quản lý.</p>
          </div>
        )}
      </main>

      {/* Modals */}
      {showAddCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <form onSubmit={handleAddCompany} className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Tạo Công ty mới</h3>
              <input 
                autoFocus 
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4" 
                placeholder="Tên công ty..." 
                value={newCompanyName} 
                onChange={e => setNewCompanyName(e.target.value)} 
                required 
              />
              <div className="flex justify-end gap-2">
                 <button type="button" onClick={() => setShowAddCompany(false)} className="px-4 py-2 text-gray-500">Hủy</button>
                 <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Tạo</button>
              </div>
           </form>
        </div>
      )}

      {showAddAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <form onSubmit={handleAddAdmin} className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold">Thêm Admin cho {selectedCompany?.name}</h3>
              <input className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Họ tên" value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} required />
              <input className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Username" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} required />
              <input className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Mật khẩu" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} required />
              <div className="flex justify-end gap-2 pt-2">
                 <button type="button" onClick={() => setShowAddAdmin(false)} className="px-4 py-2 text-gray-500">Hủy</button>
                 <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Tạo tài khoản</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
