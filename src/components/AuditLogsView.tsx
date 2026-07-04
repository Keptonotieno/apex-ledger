import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { ShieldCheck, Search, Filter, Monitor, Terminal, FileDown } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { audits } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const filteredAudits = audits.filter(a => {
    const matchesSearch = a.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (a.newValue && a.newValue.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'All' || a.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleExportCSV = () => {
    // Simulated CSV download triggers
    alert('Cryptographic Immutable Audit Log compiled. Initiating Secure CSV download...');
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      
      {/* Search Bar & Export actions */}
      <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-brand-border">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 font-sans">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Query immutable trail by action, cashier, or specific adjustments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-950/60 border border-brand-border rounded-lg text-xs text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-gray-950/60 border border-brand-border rounded-lg text-xs px-3 py-1.5 text-gray-300 outline-none focus:border-cyan-500/30 font-sans"
          >
            <option value="All">All Roles</option>
            <option value={UserRole.ADMIN}>Owner Only</option>
            <option value={UserRole.MANAGER}>Managers Only</option>
            <option value={UserRole.EMPLOYEE}>Staff Only</option>
          </select>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-850 border border-brand-border text-gray-300 hover:text-cyan-400 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer font-sans font-bold shrink-0"
        >
          <FileDown className="w-4 h-4" />
          <span>Export Audit Trails (CSV)</span>
        </button>
      </div>

      {/* Main Logs listing */}
      <div className="glass-panel rounded-2xl border border-brand-border overflow-hidden">
        
        {/* Table title bar */}
        <div className="p-4 bg-gray-950/40 border-b border-brand-border flex items-center justify-between text-cyan-400 font-bold tracking-wider uppercase text-[10px]">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-4 h-4" />
            <span>Immutable Cryptographic Event Feed</span>
          </div>
          <span>Status: Secure</span>
        </div>

        <div className="divide-y divide-brand-border/40 max-h-[500px] overflow-y-auto">
          {filteredAudits.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-sans">
              No audit records matching criteria.
            </div>
          ) : (
            filteredAudits.map((aud, idx) => (
              <div key={`${aud.id}-${idx}`} className="p-4 hover:bg-gray-900/10 transition space-y-2 text-gray-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  
                  {/* Timestamp & User */}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">[{aud.date} {aud.time}]</span>
                    <span className="text-cyan-400 font-bold capitalize">{aud.userName}</span>
                    <span className="text-[10px] text-gray-600">({aud.userEmail})</span>
                  </div>

                  {/* Role and terminal tags */}
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="px-1.5 py-0.5 bg-gray-950 border border-brand-border text-gray-400 rounded">
                      {aud.role.split(' ')[0]}
                    </span>
                    <span className="text-gray-600 font-sans">|</span>
                    <div className="flex items-center gap-1 text-gray-500 font-sans">
                      <Monitor className="w-3 h-3 text-gray-600" />
                      <span>{aud.device} ({aud.browser.split(' ')[0]})</span>
                    </div>
                  </div>

                </div>

                {/* Audit Actions Description */}
                <div className="pl-0 sm:pl-4 text-gray-200">
                  <span className="text-gray-500">Action logged:</span>{' '}
                  <span className="font-semibold text-gray-100">{aud.action}</span>
                </div>

                {/* Metadata differences */}
                {(aud.oldValue !== 'N/A' || aud.newValue !== 'N/A') && (
                  <div className="pl-0 sm:pl-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-gray-500 bg-gray-950/20 p-2 rounded-lg border border-brand-border/30">
                    <div className="truncate"><span className="text-gray-600 font-sans">Old context:</span> {aud.oldValue || 'N/A'}</div>
                    <div className="truncate text-cyan-400/80"><span className="text-gray-600 font-sans">New state:</span> {aud.newValue || 'N/A'}</div>
                  </div>
                )}

              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
};
