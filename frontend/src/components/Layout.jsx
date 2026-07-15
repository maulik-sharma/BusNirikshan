import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { List, SignOut } from '@phosphor-icons/react';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-[100dvh] bg-[#07090e] text-white flex">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Page Area */}
      <div className="flex-1 flex flex-col md:pl-72 transition-all duration-300 min-h-[100dvh]">
        {/* Header Bar */}
        <header className="h-20 bg-[#0d111b] border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-xl text-[#8e9bb0] hover:text-white hover:bg-white/5 active:scale-95 transition-all"
            >
              <List size={22} />
            </button>
            <h2 className="text-lg font-bold tracking-tight text-white hidden md:block">
              Control Panel
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Sign Out Button with tactical hover physics */}
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:border-red-500/30 text-[#8e9bb0] hover:text-red-500 hover:bg-red-500/10 active:scale-[0.98] transition-all duration-200 text-sm font-medium"
            >
              <SignOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-6 md:p-8 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default Layout;
