import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  MapPin, 
  Bus, 
  Bell, 
  User, 
  Users, 
  Heartbeat, 
  Clock, 
  List, 
  X, 
  RoadHorizon, 
  UserSquare, 
  SteeringWheel,
  Gauge
} from '@phosphor-icons/react';

export const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  
  if (!user) return null;

  const getLinksByRole = () => {
    switch (user.role) {
      case 'admin':
        return [
          { to: '/admin', label: 'System Overview', icon: Gauge },
          { to: '/admin/buses', label: 'Manage Buses', icon: Bus },
          { to: '/admin/stops', label: 'Manage Stops', icon: MapPin },
          { to: '/admin/routes', label: 'Manage Routes', icon: RoadHorizon },
          { to: '/admin/drivers', label: 'Manage Drivers', icon: SteeringWheel },
          { to: '/admin/users', label: 'Manage Users', icon: Users },
          { to: '/admin/health', label: 'System Health', icon: Heartbeat },
        ];
      case 'driver':
        return [
          { to: '/driver', label: 'Active Shift', icon: SteeringWheel },
          { to: '/driver/history', label: 'Shift Logs', icon: Clock },
        ];
      case 'user':
      default:
        return [
          { to: '/dashboard', label: 'Live Map', icon: MapPin },
          { to: '/stops', label: 'Bus Stops', icon: MapPin },
          { to: '/routes', label: 'Bus Routes', icon: RoadHorizon },
          { to: '/alerts', label: 'ETA Alerts', icon: Bell },
        ];
    }
  };

  const links = getLinksByRole();

  const activeClassName = "flex items-center gap-4 px-4 py-3.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium transition-all duration-300";
  const inactiveClassName = "flex items-center gap-4 px-4 py-3.5 rounded-xl text-[#8e9bb0] hover:text-white hover:bg-white/5 border border-transparent transition-all duration-300";

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-45 w-72 bg-[#0d111b] border-r border-white/5 flex flex-col transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Bus size={20} className="text-emerald-500" weight="bold" />
            </div>
            <span className="font-bold tracking-tight text-lg text-white">
              BusNirikshan
            </span>
          </div>
          
          <button 
            onClick={toggleSidebar}
            className="md:hidden p-1.5 rounded-lg text-[#8e9bb0] hover:text-white hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-semibold text-white truncate text-sm">{user.name}</h4>
              <p className="text-xs text-[#8e9bb0] capitalize">{user.role}</p>
              {user.rtc && (
                <span className="inline-block mt-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded font-mono">
                  {user.rtc}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-grow p-6 overflow-y-auto space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink 
                key={link.to} 
                to={link.to} 
                onClick={() => {
                  if (window.innerWidth < 768) toggleSidebar();
                }}
                className={({ isActive }) => isActive ? activeClassName : inactiveClassName}
              >
                <Icon size={20} weight="regular" />
                <span className="text-sm tracking-wide">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 text-center">
          <p className="text-[10px] text-[#8e9bb0] font-mono tracking-wider">
            VERSION 1.0.0
          </p>
        </div>
      </aside>
    </>
  );
};
