import React, { useState } from 'react';
import { 
  Filter, Calendar, Building, Users, Tag, ClipboardList, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { Branch, UserProfile, Customer, Product } from '../../types';

interface ReportFiltersProps {
  reportPeriod: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom';
  setReportPeriod: (period: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom') => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  
  // Advanced filters
  filterBranchId: string;
  setFilterBranchId: (id: string) => void;
  filterEmployeeId: string;
  setFilterEmployeeId: (id: string) => void;
  filterCustomerId: string;
  setFilterCustomerId: (id: string) => void;
  filterSupplierName: string;
  setFilterSupplierName: (name: string) => void;
  filterCategoryName: string;
  setFilterCategoryName: (name: string) => void;
  filterProductId: string;
  setFilterProductId: (id: string) => void;

  // Options lists
  branches: Branch[];
  employees: UserProfile[];
  customers: Customer[];
  suppliers: string[];
  categories: string[];
  products: Product[];

  // Reset helper
  onReset: () => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  reportPeriod,
  setReportPeriod,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  
  filterBranchId,
  setFilterBranchId,
  filterEmployeeId,
  setFilterEmployeeId,
  filterCustomerId,
  setFilterCustomerId,
  filterSupplierName,
  setFilterSupplierName,
  filterCategoryName,
  setFilterCategoryName,
  filterProductId,
  setFilterProductId,

  branches,
  employees,
  customers,
  suppliers,
  categories,
  products,
  onReset
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-panel rounded-2xl border border-brand-border overflow-hidden">
      {/* Header bar and Period Selector */}
      <div className="p-4 bg-gray-950/40 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Core period select */}
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-950 p-1 rounded-xl border border-brand-border/60 w-full md:w-auto">
          {(['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Custom'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setReportPeriod(period)}
              className={`px-3 py-1.5 rounded-lg font-mono text-[11px] transition cursor-pointer select-none ${
                reportPeriod === period 
                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/40 border border-transparent'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Date picking or Toggle */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {reportPeriod === 'Custom' && (
            <div className="flex items-center gap-2 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-500">START:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-gray-950 border border-brand-border rounded-lg text-[10px] px-2 py-1 text-gray-300 outline-none focus:border-cyan-500/30"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-500">END:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-gray-950 border border-brand-border rounded-lg text-[10px] px-2 py-1 text-gray-300 outline-none focus:border-cyan-500/30"
                />
              </div>
            </div>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3 py-1.5 rounded-xl border font-mono text-[11px] flex items-center gap-1.5 transition cursor-pointer ${
              isOpen 
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' 
                : 'bg-gray-900 border-brand-border text-gray-300 hover:text-cyan-400'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Advanced Filters</span>
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {isOpen && (
        <div className="p-5 border-t border-brand-border/60 bg-gray-950/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-fadeIn">
          {/* 1. Branch Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono font-bold text-gray-500 uppercase flex items-center gap-1">
              <Building className="w-3 h-3 text-cyan-400" /> Branch Location
            </label>
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="bg-gray-950 border border-brand-border rounded-xl text-[11px] p-2 text-gray-300 outline-none focus:border-cyan-500/40 cursor-pointer"
            >
              <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Employee Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono font-bold text-gray-500 uppercase flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-400" /> Staff / Cashier
            </label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="bg-gray-950 border border-brand-border rounded-xl text-[11px] p-2 text-gray-300 outline-none focus:border-cyan-500/40 cursor-pointer"
            >
              <option value="all">All Staff</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
              ))}
            </select>
          </div>

          {/* 3. Customer Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono font-bold text-gray-500 uppercase flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-400" /> Customer Account
            </label>
            <select
              value={filterCustomerId}
              onChange={(e) => setFilterCustomerId(e.target.value)}
              className="bg-gray-950 border border-brand-border rounded-xl text-[11px] p-2 text-gray-300 outline-none focus:border-cyan-500/40 cursor-pointer animate-none"
            >
              <option value="all">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Supplier Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono font-bold text-gray-500 uppercase flex items-center gap-1">
              <ClipboardList className="w-3 h-3 text-violet-400" /> Supplier Vendor
            </label>
            <select
              value={filterSupplierName}
              onChange={(e) => setFilterSupplierName(e.target.value)}
              className="bg-gray-950 border border-brand-border rounded-xl text-[11px] p-2 text-gray-300 outline-none focus:border-cyan-500/40 cursor-pointer"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* 5. Category Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono font-bold text-gray-500 uppercase flex items-center gap-1">
              <Tag className="w-3 h-3 text-rose-400" /> Product Category
            </label>
            <select
              value={filterCategoryName}
              onChange={(e) => setFilterCategoryName(e.target.value)}
              className="bg-gray-950 border border-brand-border rounded-xl text-[11px] p-2 text-gray-300 outline-none focus:border-cyan-500/40 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 6. Product Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono font-bold text-gray-500 uppercase flex items-center gap-1">
              <Tag className="w-3 h-3 text-sky-400" /> Specific Item
            </label>
            <select
              value={filterProductId}
              onChange={(e) => setFilterProductId(e.target.value)}
              className="bg-gray-950 border border-brand-border rounded-xl text-[11px] p-2 text-gray-300 outline-none focus:border-cyan-500/40 cursor-pointer"
            >
              <option value="all">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Clear Button */}
          <div className="xl:col-span-6 flex justify-end mt-2">
            <button
              onClick={onReset}
              className="px-3.5 py-1.5 bg-gray-900 border border-brand-border text-gray-400 hover:text-gray-200 rounded-lg text-[10px] font-mono flex items-center gap-1.5 transition cursor-pointer select-none"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
