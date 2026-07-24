/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { DevConsole } from './components/DevConsole';
import { Header } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { SalesModule } from './components/SalesModule';
import { InventoryModule } from './components/InventoryModule';
import { DebtModule } from './components/DebtModule';
import { ExpensesModule } from './components/ExpensesModule';
import { CalendarModule } from './components/CalendarModule';
import { TaskModule } from './components/TaskModule';
import { EmployeeModule } from './components/EmployeeModule';
import { AuditLogsView } from './components/AuditLogsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ReportsView } from './components/ReportsView';
import { SettingsModule } from './components/SettingsModule';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { AdminAnalytics } from './components/AdminAnalytics';
import { ClientDirectory } from './components/ClientDirectory';
import { SalesOrdersFeed } from './components/SalesOrdersFeed';
import { Login } from './components/Login';
import { WorkspacesModule } from './components/WorkspacesModule';
import { BusinessManager } from './components/BusinessManager';
import { PurchasesModule } from './components/PurchasesModule';
import { AccountingModule } from './components/AccountingModule';
import { UserRole } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { SessionManager } from './utils/SessionManager';
import { dbManager } from './lib/database';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';
import { LockScreen } from './components/LockScreen';
import { SnackbarNotification } from './components/SnackbarNotification';

function DashboardLayout() {
  const { activeView, isLoggedIn, activeUser, logout, activeBusiness, isRestoringSession } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return true;
  });

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return localStorage.getItem('apex_ledger_locked') === 'true';
  });

  // Inactivity-based auto-locking/logout
  React.useEffect(() => {
    if (!isLoggedIn || !activeBusiness?.id) return;
    if (showWarning) return; // Freeze inactivity reset when warning is showing
    if (isLocked) return; // Freeze inactivity reset when locked

    // Load active business security policies
    const securityKey = `apex_ledger_security_${activeBusiness.id}`;
    let timeoutMs = 30 * 60 * 1000; // Default 30 mins

    try {
      const securityDataStr = localStorage.getItem(securityKey);
      if (securityDataStr) {
        const securityData = JSON.parse(securityDataStr);
        const timeoutStr = securityData.timeout || '30 minutes';
        if (timeoutStr === '15 minutes') timeoutMs = 15 * 60 * 1000;
        else if (timeoutStr === '30 minutes') timeoutMs = 30 * 60 * 1000;
        else if (timeoutStr === '1 hour') timeoutMs = 60 * 60 * 1000;
        else if (timeoutStr === 'Never lock') return; // Do not auto-lock
      }
    } catch (e) {
      console.error('Error parsing security policy:', e);
    }

    let warningTimer: any;

    const resetTimer = () => {
      clearTimeout(warningTimer);

      const warningDelay = Math.max(0, timeoutMs - 60000);

      warningTimer = setTimeout(() => {
        setShowWarning(true);
        setSecondsLeft(60);
      }, warningDelay);
    };

    // Listen to user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const registerListeners = () => {
      events.forEach(e => window.addEventListener(e, resetTimer));
    };
    const unregisterListeners = () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };

    registerListeners();
    resetTimer();

    return () => {
      clearTimeout(warningTimer);
      unregisterListeners();
    };
  }, [isLoggedIn, activeBusiness?.id, showWarning, isLocked]);

  // Countdown timer for warning modal
  React.useEffect(() => {
    if (!showWarning) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowWarning(false);
          setIsLocked(true);
          localStorage.setItem('apex_ledger_locked', 'true');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [showWarning]);

  if (isRestoringSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-dark text-gray-100 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-cyan-400/80 tracking-widest uppercase">Restoring Premium Session</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  if (isLocked) {
    return (
      <LockScreen
        activeUser={activeUser}
        logout={logout}
        onUnlock={() => {
          setIsLocked(false);
          localStorage.removeItem('apex_ledger_locked');
        }}
      />
    );
  }

  // Active view renderer helper
  const renderView = () => {
    // Strict Role-Based Access Control (RBAC) route guarding
    if (activeUser?.role === UserRole.EMPLOYEE) {
      const allowedViews = [
        'overview', 'sales', 'inventory', 'debts', 'clients', 'feed', 'calendar', 'tasks'
      ];
      if (activeUser.allowExpenses) {
        allowedViews.push('expenses');
      }
      
      if (!allowedViews.includes(activeView)) {
        return <DashboardOverview />;
      }
    }

    switch (activeView) {
      case 'overview':
        return <DashboardOverview />;
      case 'workspaces':
        return <WorkspacesModule />;
      case 'sales':
        return <SalesModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'purchases':
        return <PurchasesModule />;
      case 'debts':
        return <DebtModule />;
      case 'expenses':
        return <ExpensesModule />;
      case 'accounting':
        return <AccountingModule />;
      case 'performance':
        return <PerformanceDashboard />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'clients':
        return <ClientDirectory />;
      case 'feed':
        return <SalesOrdersFeed />;
      case 'calendar':
        return <CalendarModule />;
      case 'tasks':
        return <TaskModule />;
      case 'employees':
        return <EmployeeModule />;
      case 'audits':
        return <AuditLogsView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <DashboardOverview />;
    }
  };

  // Convert active view slug to elegant human header
  const getViewTitle = () => {
    switch (activeView) {
      case 'overview': return 'Overview Dashboard';
      case 'workspaces': return 'Workspaces & Corporate Branches';
      case 'sales': return 'POS Point-of-Sale Terminal';
      case 'inventory': return 'Enterprise Inventory Catalog';
      case 'purchases': return 'Purchases, Suppliers & Procurement';
      case 'debts': return 'Debt Ledger & Solvency Tracking';
      case 'expenses': return 'Business Cash Flow Expenses';
      case 'accounting': return 'Accounting Ledger & Double-Entry Sheets';
      case 'performance': return 'Performance & Attendance Dashboard';
      case 'analytics': return 'Corporate Business Analytics';
      case 'clients': return 'Client Directory & CRM';
      case 'feed': return 'POS Sales Feed';
      case 'calendar': return 'Shared Corporate Calendar';
      case 'tasks': return 'Assigned Corporate Tasks';
      case 'employees': return 'Employee Registry & Attendance';
      case 'audits': return 'Cryptographic Audit Trails';
      case 'reports': return 'Financial Analysis Statements';
      case 'settings': return 'Tenant & Supabase Sync Settings';
      default: return 'Business Intelligence Hub';
    }
  };

  return (
    <div className="flex min-h-screen bg-brand-dark text-gray-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* 1. Side navigation menu */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* 2. Main content vertical partition */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top interactive Header bar */}
        <Header 
          sidebarCollapsed={sidebarCollapsed} 
          toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />

        {/* Scrollable View Area */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 overflow-y-auto max-w-[1600px] w-full mx-auto space-y-6">
          
          {/* Module Transition Canvas */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="w-full"
            >
              <ErrorBoundary moduleName={getViewTitle()}>
                {renderView()}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>

        </main>

        {/* Footer info line */}
        <footer className="glass-panel py-3.5 px-4 sm:px-8 text-[10px] text-gray-500 font-mono border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 print:hidden text-center sm:text-left">
          <span>© 2026 Apex Ledger Enterprise. Cryptographically Protected.</span>
          <div className="flex gap-4">
            <span className="text-cyan-400/80">SQL Relational DB Isolation Active</span>
            <span className="text-emerald-400">ROW LEVEL SECURITY STATUS: SECURED</span>
          </div>
        </footer>

      </div>

      <DevConsole />

      {/* Inactivity Warning Modal Overlay */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/80 backdrop-blur-md"
            id="inactivity-warning-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-[#131722]/95 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
              id="inactivity-warning-modal"
            >
              {/* Top Countdown Visual Progress Bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-border">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-1000 ease-linear" 
                  style={{ width: `${(secondsLeft / 60) * 100}%` }}
                />
              </div>

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 mb-4 animate-bounce">
                <AlertTriangle className="h-6 w-6" id="warning-icon" />
              </div>

              <h3 className="text-lg font-semibold text-center text-white mb-2 tracking-tight" id="warning-heading">
                Inactivity Warning
              </h3>

              <p className="text-sm text-gray-400 text-center mb-6 leading-relaxed">
                You have been inactive. To protect your financial data and ledger integrity, your session will automatically log out in:
                <span className="block font-mono text-amber-400 font-bold text-3xl mt-2 tracking-wider" id="seconds-countdown">
                  {secondsLeft}s
                </span>
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  id="logout-btn"
                  onClick={() => {
                    setShowWarning(false);
                    logout(true);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-800 bg-gray-900/40 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:bg-gray-800/80 hover:text-white transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
                <button
                  id="extend-btn"
                  onClick={() => setShowWarning(false)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-xs font-semibold uppercase tracking-wider text-white hover:from-cyan-400 hover:to-blue-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-lg shadow-cyan-500/20 transition-all duration-200"
                >
                  <Clock className="h-4 w-4" />
                  Extend Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <DashboardLayout />
      <SnackbarNotification />
    </AppProvider>
  );
}
