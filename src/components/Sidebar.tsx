import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { 
  LayoutDashboard, ShoppingCart, Package, CreditCard, 
  DollarSign, BarChart3, TrendingUp, Users, ClipboardList, 
  Calendar, CheckSquare, ShieldAlert, Settings, FileText, 
  ChevronLeft, ChevronRight, UserCheck, ShieldAlert as LockIcon,
  Database, Camera, Building2, Truck, Receipt, X
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { 
    activeView, 
    setActiveView, 
    activeBusiness, 
    activeUser, 
    profiles, 
    setActiveUser,
    businesses,
    setActiveBusiness,
    updateEmployee
  } = useApp();

  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);

  // Define navigation items with their respective roles
  const navItems = [
    { id: 'overview', name: 'Overview', icon: LayoutDashboard, minRole: UserRole.EMPLOYEE },
    { id: 'workspaces', name: 'Workspaces & Branches', icon: Building2, minRole: UserRole.MANAGER },
    { id: 'sales', name: 'Sales POS', icon: ShoppingCart, minRole: UserRole.EMPLOYEE },
    { id: 'inventory', name: 'Inventory', icon: Package, minRole: UserRole.EMPLOYEE },
    { id: 'purchases', name: 'Purchases & Procurement', icon: Truck, minRole: UserRole.MANAGER },
    { id: 'debts', name: 'Debt Tracking', icon: CreditCard, minRole: UserRole.EMPLOYEE },
    { id: 'expenses', name: 'Expenses', icon: DollarSign, minRole: UserRole.EMPLOYEE },
    { id: 'accounting', name: 'Accounting Ledger', icon: Receipt, minRole: UserRole.MANAGER },
    { id: 'performance', name: 'Performance Dashboard', icon: BarChart3, minRole: UserRole.MANAGER },
    { id: 'analytics', name: 'Admin Analytics', icon: TrendingUp, minRole: UserRole.MANAGER },
    { id: 'clients', name: 'Client Directory', icon: Users, minRole: UserRole.EMPLOYEE },
    { id: 'feed', name: 'Sales Orders & Feed', icon: ClipboardList, minRole: UserRole.EMPLOYEE },
    { id: 'reports', name: 'Reports', icon: FileText, minRole: UserRole.MANAGER },
    { id: 'calendar', name: 'Calendar', icon: Calendar, minRole: UserRole.EMPLOYEE },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare, minRole: UserRole.EMPLOYEE },
    { id: 'employees', name: 'Employees', icon: UserCheck, minRole: UserRole.MANAGER },
    { id: 'audits', name: 'Audit Logs', icon: ShieldAlert, minRole: UserRole.MANAGER },
    { id: 'settings', name: 'Settings & DB Sync', icon: Settings, minRole: UserRole.MANAGER }
  ];

  const handleRoleChange = (userId: string) => {
    setActiveUser(userId);
    setShowRoleSwitcher(false);
    if (window.innerWidth < 768) {
      setCollapsed(true);
    }
  };

  const handleWorkspaceChange = (bizId: string) => {
    setActiveBusiness(bizId);
    setShowWorkspaceSwitcher(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        updateEmployee(activeUser.id, { avatarUrl: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper to verify if role is allowed
  const hasAccess = (itemMinRole: UserRole, itemId: string) => {
    if (businesses.length === 0) {
      return itemId === 'overview' || itemId === 'settings';
    }
    if (activeUser.role === UserRole.ADMIN) return true;
    if (activeUser.role === UserRole.MANAGER) {
      return itemMinRole !== UserRole.ADMIN;
    }
    // Employee
    if (itemId === 'expenses') {
      return activeUser.allowExpenses === true;
    }
    return itemMinRole === UserRole.EMPLOYEE;
  };

  const handleNavClick = (itemId: string) => {
    setActiveView(itemId);
    if (window.innerWidth < 768) {
      setCollapsed(true);
    }
  };

  // Common navigation content component
  const SidebarBody = ({ isCollapsed }: { isCollapsed: boolean }) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brand Logo & Name */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-brand-border shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-center glow-cyan shrink-0">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-md font-bold text-gray-100 tracking-tight font-sans truncate">APEX LEDGER</h1>
              <span className="text-[10px] text-cyan-400 font-mono tracking-wider block truncate">ENTERPRISE VAULT</span>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 mx-auto rounded-xl bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-center glow-cyan">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-xl border border-brand-border bg-gray-900/50 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition shrink-0"
          aria-label={isCollapsed ? "Expand sidebar" : "Close sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 hidden md:block" />
              <X className="w-5 h-5 md:hidden text-cyan-400" />
            </>
          )}
        </button>
      </div>

      {/* Tenant Branch Switcher */}
      <div className="px-4 py-3 border-b border-brand-border shrink-0">
        {isCollapsed ? (
          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-cyan-400 mx-auto">
            {activeBusiness.name ? activeBusiness.name.substring(0, 1) : 'B'}
          </div>
        ) : (
          <div className="relative">
            <button 
              onClick={() => {
                if (activeUser.role !== UserRole.EMPLOYEE) {
                  setShowWorkspaceSwitcher(!showWorkspaceSwitcher);
                }
              }}
              disabled={activeUser.role === UserRole.EMPLOYEE}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-950/40 border border-brand-border text-left transition ${
                activeUser.role === UserRole.EMPLOYEE ? 'cursor-not-allowed opacity-75' : 'hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Database className="w-4 h-4 text-cyan-500 shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-gray-200 truncate">{activeBusiness.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono truncate">{activeBusiness.branch || 'Branch'}</div>
                </div>
              </div>
              {activeUser.role !== UserRole.EMPLOYEE && <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            </button>

            {showWorkspaceSwitcher && activeUser.role !== UserRole.EMPLOYEE && (
              <div className="absolute top-full left-0 w-full mt-1.5 p-1 bg-gray-900/95 border border-brand-border rounded-xl shadow-xl z-50">
                <div className="px-2 py-1 text-[10px] text-gray-400 font-mono uppercase">Workspaces</div>
                {businesses.map((biz) => (
                  <button
                    key={biz.id}
                    onClick={() => handleWorkspaceChange(biz.id)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between transition ${
                      activeBusiness.id === biz.id ? 'bg-cyan-950/30 text-cyan-400' : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span>{biz.name} <span className="text-[9px] text-gray-500">({biz.branch})</span></span>
                    {activeBusiness.id === biz.id && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const permitted = hasAccess(item.minRole, item.id);
          const active = activeView === item.id;
          const Icon = item.icon;

          if (!permitted) {
            if (activeUser.role === UserRole.EMPLOYEE) {
              return null;
            }
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-gray-600 cursor-not-allowed select-none transition-colors min-h-[44px] ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title={`Requires ${item.minRole}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4.5 h-4.5 opacity-40 shrink-0" />
                  {!isCollapsed && <span className="text-sm font-medium line-through decoration-gray-700/60">{item.name}</span>}
                </div>
                {!isCollapsed && <LockIcon className="w-3.5 h-3.5 text-gray-600" />}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-150 relative group min-h-[44px] ${
                active 
                  ? 'bg-cyan-400 text-gray-950 font-bold shadow-md shadow-cyan-400/25' 
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-900/50'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? 'text-gray-950' : 'text-gray-400 group-hover:text-cyan-400'}`} />
              {!isCollapsed && <span className="text-sm">{item.name}</span>}
              
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-gray-950 text-gray-200 text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50 whitespace-nowrap shadow-md border border-brand-border">
                  {item.name}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile / Role Switcher Panel */}
      <div className="p-4 border-t border-brand-border bg-gray-950/20 shrink-0">
        <div className="relative">
          <button 
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className={`w-full flex items-center gap-3 rounded-xl text-left hover:bg-gray-900/60 transition ${
              isCollapsed ? 'justify-center p-1' : 'p-2 border border-brand-border'
            }`}
          >
            <div className="relative shrink-0 group/avatar">
              {activeUser.avatarUrl ? (
                <img 
                  src={activeUser.avatarUrl} 
                  alt={activeUser.name} 
                  className="w-10 h-10 rounded-full border border-cyan-500/20 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center font-bold text-sm text-cyan-400 font-mono uppercase">
                  {activeUser.name ? activeUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-gray-950" />
              <label 
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 bg-gray-950/75 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition duration-150 cursor-pointer text-cyan-400"
                title="Upload Profile Image"
              >
                <Camera className="w-3.5 h-3.5" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarUpload} 
                />
              </label>
            </div>

            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-semibold text-gray-200 truncate capitalize">{activeUser.name}</div>
                <div className="text-[10px] text-cyan-400 font-mono tracking-wider truncate">{activeUser.role}</div>
              </div>
            )}
          </button>

          {!isCollapsed && (
            <div className="mt-2 flex justify-center gap-1.5">
              <label 
                onClick={(e) => e.stopPropagation()}
                className="text-[9px] text-gray-500 hover:text-cyan-400 font-mono uppercase tracking-wider cursor-pointer transition flex items-center gap-1.5 py-1 px-2.5 rounded-md border border-brand-border/40 hover:border-cyan-500/20 bg-gray-950/30"
              >
                <Camera className="w-3 h-3 text-cyan-400" />
                <span>Upload</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarUpload} 
                />
              </label>
              {activeUser.avatarUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateEmployee(activeUser.id, { avatarUrl: undefined });
                  }}
                  className="text-[9px] text-rose-500 hover:text-rose-400 font-mono uppercase tracking-wider cursor-pointer transition flex items-center gap-1.5 py-1 px-2.5 rounded-md border border-brand-border/40 hover:border-rose-500/20 bg-gray-950/30"
                >
                  <span>Remove</span>
                </button>
              )}
            </div>
          )}

          {showRoleSwitcher && (
            <div className="absolute bottom-full left-0 w-full mb-2 p-1 bg-gray-900 border border-brand-border rounded-xl shadow-2xl z-50">
              <div className="px-2 py-1.5 text-[10px] text-gray-400 font-mono uppercase tracking-wider border-b border-brand-border/60">
                Demo User Switcher
              </div>
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleRoleChange(p.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition ${
                    activeUser.id === p.id ? 'bg-cyan-950/40 text-cyan-400' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center font-bold text-[9px] text-cyan-400 font-mono shrink-0 uppercase">
                      {p.name ? p.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold truncate capitalize">{p.name}</div>
                    <div className="text-[9px] text-gray-500 font-mono truncate">{p.role}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500 font-mono px-2">
            <span>SECURE WORKSPACE</span>
            <span className="text-cyan-400/80 animate-pulse">● LIVE SYNC</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Navigation using Framer Motion */}
      <AnimatePresence>
        {!collapsed && (
          <>
            {/* Backdrop overlay */}
            <motion.div 
              key="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-[60] md:hidden"
              onClick={() => setCollapsed(true)}
              id="sidebar-mobile-backdrop"
            />

            {/* Slide-in Drawer */}
            <motion.aside
              key="mobile-nav-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-xs bg-gray-950/95 border-r border-brand-border flex flex-col z-[65] md:hidden shadow-2xl overflow-hidden"
              id="sidebar-mobile-drawer"
            >
              <SidebarBody isCollapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sticky Sidebar (>= 768px) */}
      <aside 
        className={`hidden md:flex glass-panel h-screen border-r border-brand-border flex-col transition-all duration-300 z-30 sticky top-0 left-0 print:hidden ${
          collapsed 
            ? 'w-20 overflow-visible' 
            : 'w-72 shadow-none'
        }`}
      >
        <SidebarBody isCollapsed={collapsed} />
      </aside>
    </>
  );
};

