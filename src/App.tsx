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

function DashboardLayout() {
  const { activeView, isLoggedIn, activeUser, logout, activeBusiness } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Inactivity-based auto-locking/logout
  React.useEffect(() => {
    if (!isLoggedIn || !activeBusiness?.id) return;

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

    let activityTimer: any;

    const resetTimer = () => {
      clearTimeout(activityTimer);
      activityTimer = setTimeout(() => {
        console.log(`Inactivity limit reached. Auto-logging out.`);
        logout(true);
      }, timeoutMs);
    };

    // Listen to user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer));

    // Initialize timer
    resetTimer();

    return () => {
      clearTimeout(activityTimer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isLoggedIn, activeBusiness?.id, logout]);

  if (!isLoggedIn) {
    return <Login />;
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
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1600px] w-full mx-auto space-y-6">
          
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
              {renderView()}
            </motion.div>
          </AnimatePresence>

        </main>

        {/* Footer info line */}
        <footer className="glass-panel py-3.5 px-8 text-[10px] text-gray-500 font-mono border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 print:hidden">
          <span>© 2026 Apex Ledger Enterprise. Cryptographically Protected.</span>
          <div className="flex gap-4">
            <span className="text-cyan-400/80">SQL Relational DB Isolation Active</span>
            <span className="text-emerald-400">ROW LEVEL SECURITY STATUS: SECURED</span>
          </div>
        </footer>

      </div>

      <DevConsole />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <DashboardLayout />
    </AppProvider>
  );
}
