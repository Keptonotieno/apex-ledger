/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
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
import { motion, AnimatePresence } from 'motion/react';

function DashboardLayout() {
  const { activeView, isLoggedIn } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isLoggedIn) {
    return <Login />;
  }

  // Active view renderer helper
  const renderView = () => {
    switch (activeView) {
      case 'overview':
        return <DashboardOverview />;
      case 'sales':
        return <SalesModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'debts':
        return <DebtModule />;
      case 'expenses':
        return <ExpensesModule />;
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
      case 'sales': return 'POS Point-of-Sale Terminal';
      case 'inventory': return 'Enterprise Inventory Catalog';
      case 'debts': return 'Debt Ledger & Solvency Tracking';
      case 'expenses': return 'Business Cash Flow Expenses';
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
