import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { 
  Bell, Check, RefreshCw, Clock, LogIn, LogOut,
  Wifi, HelpCircle, AlertTriangle, ShieldCheck, Menu, Search, ChevronDown
} from 'lucide-react';

interface HeaderProps {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarCollapsed, toggleSidebar }) => {
  const { 
    activeView,
    activeUser, 
    activeBusiness, 
    connectionStatus, 
    notifications, 
    markNotificationsRead,
    timelogs,
    clockInOut,
    profiles,
    setActiveUser,
    logout
  } = useApp();

  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Determine current day time logged state
  const todayStr = new Date().toISOString().split('T')[0];
  const activeLog = timelogs.find(l => l.userId === activeUser.id && l.date === todayStr && !l.clockOut);
  const isClockedIn = !!activeLog;

  const unreadNotifications = notifications.filter(n => !n.read);

  const handleClockToggle = () => {
    clockInOut(activeUser.id);
  };

  // Convert active view slug to elegant human header
  const getViewTitle = () => {
    switch (activeView) {
      case 'overview': return 'Overview';
      case 'sales': return 'Sales';
      case 'inventory': return 'Inventory';
      case 'debts': return 'Debt Tracking';
      case 'expenses': return 'Expenses';
      case 'calendar': return 'Calendar';
      case 'tasks': return 'Tasks';
      case 'employees': return 'Employees';
      case 'audits': return 'Audit Logs';
      case 'reports': return 'Reports';
      case 'settings': return 'Settings & DB Sync';
      default: return 'Dashboard';
    }
  };

  // Helper to get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="glass-panel h-20 border-b border-brand-border sticky top-0 z-20 flex items-center justify-between px-6 print:hidden">
      
      {/* Left: Hamburger menu toggle & Active View details */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg border border-brand-border bg-gray-900/40 text-gray-400 hover:text-cyan-400 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-100 tracking-tight font-sans capitalize">
            {getViewTitle()}
          </h1>
          <p className="text-xs text-gray-400">
            Welcome back, <span className="text-cyan-400 font-medium capitalize">{activeUser.name}</span>
          </p>
        </div>
      </div>

      {/* Right: Search, Sync, notifications, profile actions */}
      <div className="flex items-center gap-4 md:gap-6">
        
        {/* Search input bar */}
        <div className="hidden md:flex items-center gap-2 bg-gray-950/45 border border-brand-border rounded-xl px-3 py-1.5 w-64 text-xs focus-within:border-cyan-500/50 transition">
          <Search className="w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search products, orders..." 
            className="bg-transparent text-gray-200 outline-none w-full font-sans text-xs placeholder:text-gray-600"
          />
        </div>

        {/* Attendance Toggle Widget */}
        <button
          onClick={handleClockToggle}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition duration-200 cursor-pointer ${
            isClockedIn 
              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30' 
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {isClockedIn ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
          <span>{isClockedIn ? 'Clock Out' : 'Clock In'}</span>
        </button>

        {/* Real-time network active status dot */}
        <div className="hidden lg:flex items-center gap-2 bg-gray-950/40 border border-brand-border px-3 py-1.5 rounded-xl text-[11px] font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-gray-400">Live Sync</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotificationDrawer(!showNotificationDrawer);
              if (unreadNotifications.length > 0) {
                markNotificationsRead();
              }
            }}
            className="p-2.5 rounded-xl border border-brand-border bg-gray-900/40 text-gray-300 hover:text-cyan-400 hover:border-cyan-500/20 transition relative"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full"></span>
            )}
          </button>

          {/* Notifications Drawer */}
          {showNotificationDrawer && (
            <div className="absolute right-0 top-full mt-2 w-80 p-2 bg-gray-900/95 border border-brand-border rounded-xl shadow-2xl z-50">
              <div className="flex items-center justify-between p-2 border-b border-brand-border">
                <span className="text-xs font-bold text-gray-200">System Messages</span>
                <span className="text-[10px] text-cyan-400 font-mono">Live Logs</span>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500">
                    No new system logs.
                  </div>
                ) : (
                  notifications.map((not) => (
                    <div 
                      key={not.id}
                      className={`p-2 rounded-lg mb-1 text-xs border transition ${
                        not.type === 'alert' 
                          ? 'bg-rose-950/20 border-rose-500/20 text-rose-200' 
                          : not.type === 'success'
                            ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200'
                            : 'bg-gray-950/40 border-gray-800 text-gray-300'
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          not.type === 'alert' ? 'bg-rose-400' : not.type === 'success' ? 'bg-emerald-400' : 'bg-cyan-400'
                        }`} />
                        {not.title}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{not.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Secure Workspace dropdown pill */}
        <div className="relative">
          <button 
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-950/40 border border-brand-border hover:border-cyan-500/30 transition text-left"
          >
            <div className="hidden sm:block">
              <div className="text-[9px] text-gray-500 font-mono leading-none">SECURE WORKSPACE</div>
              <div className="text-xs font-semibold text-gray-200 capitalize leading-tight">
                {activeUser.name}
              </div>
            </div>
            
            {/* User Initials Avatar with green indicator circle */}
            <div className="relative w-9 h-9 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center font-bold text-xs text-cyan-400 glow-cyan shrink-0">
              {getInitials(activeUser.name)}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-gray-950" />
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </button>

          {/* Interactive Profile switcher for quick role simulation */}
          {showUserDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 p-1 bg-gray-900/95 border border-brand-border rounded-xl shadow-2xl z-50">
              <div className="px-2.5 py-1.5 text-[10px] text-gray-500 font-mono uppercase border-b border-brand-border/60">
                Switch demo profile
              </div>
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveUser(p.id);
                    setShowUserDropdown(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 mt-1 rounded-lg flex items-center gap-2 transition ${
                    activeUser.id === p.id ? 'bg-cyan-950/40 text-cyan-400' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-300">
                    {getInitials(p.name)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold capitalize">{p.name}</div>
                    <div className="text-[9px] text-gray-500 font-mono uppercase">{p.role}</div>
                  </div>
                </button>
              ))}

              {/* Logout Button inside Dropdown */}
              <div className="border-t border-brand-border/60 mt-2 pt-2 px-1 pb-1">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    logout();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 text-rose-400 hover:bg-rose-500/10 transition font-semibold text-xs cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Secure Logout</span>
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Standalone Header Logout Button */}
        <button
          onClick={logout}
          className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/35 transition flex items-center gap-2 text-xs font-semibold cursor-pointer shrink-0"
          title="Secure Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Log Out</span>
        </button>

      </div>

    </header>
  );
};
