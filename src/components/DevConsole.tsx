import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Terminal, User, Layout, ChevronDown, ChevronUp, Database, Shield, RefreshCw, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../utils/api';

export function DevConsole() {
  const { activeView, activeUser, setActiveView, isLoggedIn } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'states' | 'actions'>('states');

  const availableViews = [
    'overview', 'workspaces', 'sales', 'inventory', 'purchases', 
    'debts', 'expenses', 'accounting', 'performance', 'analytics', 
    'clients', 'feed', 'calendar', 'tasks', 'employees', 'audits', 
    'reports', 'settings'
  ];

  return (
    <div id="dev-console-wrapper" className="fixed bottom-4 right-4 z-50 font-mono text-xs print:hidden">
      <div 
        id="dev-console-container"
        className="bg-brand-dark/95 border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md w-80 sm:w-96 transition-all duration-300"
      >
        {/* Header (Toggle Bar) */}
        <div 
          id="dev-console-header"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between px-4 py-3 bg-cyan-950/40 border-b border-cyan-500/20 cursor-pointer select-none hover:bg-cyan-950/60 transition-colors"
        >
          <div className="flex items-center gap-2 text-cyan-400">
            <Terminal size={14} className="animate-pulse" />
            <span className="font-bold tracking-wide uppercase">Apex Dev Console</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
              Active
            </span>
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                {/* Mode Selector Tabs */}
                <div className="flex border-b border-gray-800">
                  <button
                    onClick={() => setActiveTab('states')}
                    className={`flex-1 py-1.5 text-center font-bold tracking-wider uppercase border-b-2 transition-colors ${
                      activeTab === 'states' 
                        ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5' 
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Context States
                  </button>
                  <button
                    onClick={() => setActiveTab('actions')}
                    className={`flex-1 py-1.5 text-center font-bold tracking-wider uppercase border-b-2 transition-colors ${
                      activeTab === 'actions' 
                        ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5' 
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Quick Actions
                  </button>
                </div>

                {activeTab === 'states' ? (
                  <div className="space-y-3">
                    {/* Active View State */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 uppercase tracking-wide text-[10px] font-bold">
                        <Layout size={12} className="text-cyan-500" />
                        <span>Active View State</span>
                      </div>
                      <div className="bg-gray-900/80 border border-gray-800 rounded px-2.5 py-1.5 flex items-center justify-between">
                        <span className="text-emerald-400 font-semibold">{activeView}</span>
                        <span className="text-[10px] text-gray-500">state.activeView</span>
                      </div>
                    </div>

                    {/* Active User State */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 uppercase tracking-wide text-[10px] font-bold">
                        <User size={12} className="text-cyan-500" />
                        <span>Active User Context</span>
                      </div>
                      <div className="bg-gray-900/80 border border-gray-800 rounded p-2.5 space-y-2">
                        {isLoggedIn && activeUser ? (
                          <>
                            <div className="grid grid-cols-3 gap-1">
                              <span className="text-gray-500">ID:</span>
                              <span className="col-span-2 text-cyan-300 select-all">{activeUser.id}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <span className="text-gray-500">Name:</span>
                              <span className="col-span-2 text-gray-300">{activeUser.name}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <span className="text-gray-500">Email:</span>
                              <span className="col-span-2 text-gray-300 text-xs truncate">{activeUser.email}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <span className="text-gray-500">Role:</span>
                              <span className="col-span-2 text-amber-400 font-medium">{activeUser.role}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <span className="text-gray-500">Business:</span>
                              <span className="col-span-2 text-gray-400 truncate">{activeUser.businessId}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-amber-500/80 text-center py-2">
                            No user session active (Signed Out)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Database Health Telemetry */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-400 uppercase tracking-wide text-[10px] font-bold">
                        <Database size={12} className="text-cyan-500" />
                        <span>Storage & Isolation</span>
                      </div>
                      <div className="bg-gray-900/50 border border-gray-800 rounded p-2 space-y-1 text-[10px] text-gray-400">
                        <div className="flex justify-between">
                          <span>Emulator:</span>
                          <span className="text-emerald-400">JSON Database (Active)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tenant Context:</span>
                          <span className="text-cyan-400 truncate max-w-[180px]">
                            {activeUser?.businessId || 'Not Bound'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Persistence:</span>
                          <span>apex_ledger.json</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* View Switcher Controls */}
                    <div className="space-y-1.5">
                      <div className="text-gray-400 uppercase tracking-wide text-[10px] font-bold">
                        Switch View Context
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {availableViews.map((view) => (
                          <button
                            key={view}
                            onClick={() => setActiveView(view)}
                            className={`px-2 py-1 text-left rounded text-[11px] truncate transition-colors ${
                              activeView === view
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                            }`}
                          >
                            {view}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Simulators */}
                    <div className="pt-2 border-t border-gray-800 space-y-2">
                      <div className="text-gray-400 uppercase tracking-wide text-[10px] font-bold">
                        Debug Operations
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.location.reload()}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 py-1.5 rounded transition-colors border border-gray-700"
                        >
                          <RefreshCw size={11} />
                          Force Reload
                        </button>
                        <button
                          onClick={() => {
                            console.log('App State Log:', { activeView, activeUser, isLoggedIn });
                            alert(`Logged state to browser developer console.`);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 py-1.5 rounded transition-colors border border-gray-700"
                        >
                          <Shield size={11} />
                          Dump to Console
                        </button>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await apiFetch('/api/debug/trigger-db-error');
                          } catch (err) {
                            console.log('Centralized handler caught and displayed the error.');
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 py-2 rounded transition-colors border border-rose-500/20 font-bold uppercase tracking-wider text-[10px]"
                      >
                        <AlertOctagon size={12} />
                        Simulate Database Error
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
