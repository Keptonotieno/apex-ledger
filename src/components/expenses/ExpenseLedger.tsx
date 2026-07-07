import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, FileSpreadsheet, Printer, Eye, Edit2, Trash2, Copy, AlertCircle, FileDown, CheckCircle } from 'lucide-react';
import { formatKSh } from '../../lib/utils';
import { Expense, UserRole, UserProfile, Branch } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExpenseLedgerProps {
  expenses: Expense[];
  activeUser: UserProfile;
  branches: Branch[];
  onOpenEdit: (exp: Expense) => void;
  onOpenDelete: (exp: Expense) => void;
  onDuplicate: (exp: Expense) => void;
}

export const ExpenseLedger: React.FC<ExpenseLedgerProps> = ({
  expenses,
  activeUser,
  branches,
  onOpenEdit,
  onOpenDelete,
  onDuplicate
}) => {
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedPayMethod, setSelectedPayMethod] = useState('All');
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Expand states
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Derive filter lists dynamically
  const uniqueCategories = Array.from(new Set(expenses.map(e => e.category)));
  const uniqueVendors = Array.from(new Set(expenses.map(e => e.vendorName).filter(Boolean)));
  const uniqueEmployees = Array.from(new Set(expenses.map(e => e.employeeResponsible || e.recordedBy).filter(Boolean)));
  const uniqueDepts = Array.from(new Set(expenses.map(e => e.department).filter(Boolean)));
  const uniquePayMethods = Array.from(new Set(expenses.map(e => e.paymentMethod).filter(Boolean)));
  const uniqueProjects = Array.from(new Set(expenses.map(e => e.project).filter(Boolean)));

  // Master filtering logic
  const filtered = expenses.filter(e => {
    // Search query matches memo, vendor, receipt number, invoice number
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      !searchTerm ||
      (e.description || '').toLowerCase().includes(q) ||
      (e.vendorName || '').toLowerCase().includes(q) ||
      (e.receiptNumber || '').toLowerCase().includes(q) ||
      (e.invoiceNumber || '').toLowerCase().includes(q);

    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
    const matchesVendor = selectedVendor === 'All' || e.vendorName === selectedVendor;
    const matchesEmployee = selectedEmployee === 'All' || (e.employeeResponsible === selectedEmployee || e.recordedBy === selectedEmployee);
    const matchesDept = selectedDept === 'All' || e.department === selectedDept;
    const matchesPayMethod = selectedPayMethod === 'All' || e.paymentMethod === selectedPayMethod;
    const matchesProject = selectedProject === 'All' || e.project === selectedProject;
    const matchesBranch = selectedBranch === 'All' || e.branch === selectedBranch;
    const matchesStatus = selectedStatus === 'All' || (e.status || 'Approved') === selectedStatus;

    // Dates
    const matchesStartDate = !startDate || e.date >= startDate;
    const matchesEndDate = !endDate || e.date <= endDate;

    // Amounts
    const matchesMinAmount = !minAmount || e.amount >= Number(minAmount);
    const matchesMaxAmount = !maxAmount || e.amount <= Number(maxAmount);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesVendor &&
      matchesEmployee &&
      matchesDept &&
      matchesPayMethod &&
      matchesProject &&
      matchesBranch &&
      matchesStatus &&
      matchesStartDate &&
      matchesEndDate &&
      matchesMinAmount &&
      matchesMaxAmount
    );
  });

  // EXPORT CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Expense ID', 'Date', 'Category', 'Vendor Name', 'Description', 'Amount (KSh)', 'Employee Responsible', 'Payment Method', 'Department', 'Branch', 'Invoice Number', 'Receipt Number', 'Status'];
    const rows = filtered.map(e => [
      e.id,
      e.date,
      e.category,
      e.vendorName || 'General Vendor',
      e.description,
      e.amount,
      e.employeeResponsible || e.recordedBy,
      e.paymentMethod || 'Cash',
      e.department || 'General',
      e.branch || 'Main HQ',
      e.invoiceNumber || 'N/A',
      e.receiptNumber || 'N/A',
      e.status || 'Approved'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_expenses_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT PDF
  const handleExportPDF = (type: 'detailed' | 'category' | 'department' | 'tax') => {
    if (filtered.length === 0) return;
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(18);
    doc.text('APEX Enterprise Ledger System', 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    
    let reportTitle = 'Expenses Ledger Summary Report';
    let headers = [['ID', 'Date', 'Category', 'Vendor', 'Description', 'Amount (KSh)', 'Status']];
    let body = filtered.map(e => [
      e.id,
      e.date,
      e.category,
      e.vendorName || 'General',
      e.description,
      e.amount.toLocaleString(),
      e.status || 'Approved'
    ]);

    if (type === 'category') {
      reportTitle = 'Expense Distribution by Category';
      headers = [['Category', 'Log EntriesCount', 'Consolidated Amount (KSh)', 'Relative Percentage']];
      const categoriesGroup: { [key: string]: { count: number; sum: number } } = {};
      const total = filtered.reduce((sum, e) => sum + e.amount, 0);
      filtered.forEach(e => {
        if (!categoriesGroup[e.category]) categoriesGroup[e.category] = { count: 0, sum: 0 };
        categoriesGroup[e.category].count++;
        categoriesGroup[e.category].sum += e.amount;
      });
      body = Object.keys(categoriesGroup).map(cat => [
        cat,
        categoriesGroup[cat].count.toString(),
        categoriesGroup[cat].sum.toLocaleString(),
        ((categoriesGroup[cat].sum / (total || 1)) * 100).toFixed(1) + '%'
      ]);
    } else if (type === 'department') {
      reportTitle = 'Expense Distribution by Department';
      headers = [['Department', 'Log EntriesCount', 'Consolidated Amount (KSh)', 'Relative Percentage']];
      const deptsGroup: { [key: string]: { count: number; sum: number } } = {};
      const total = filtered.reduce((sum, e) => sum + e.amount, 0);
      filtered.forEach(e => {
        const dept = e.department || 'Unallocated';
        if (!deptsGroup[dept]) deptsGroup[dept] = { count: 0, sum: 0 };
        deptsGroup[dept].count++;
        deptsGroup[dept].sum += e.amount;
      });
      body = Object.keys(deptsGroup).map(dept => [
        dept,
        deptsGroup[dept].count.toString(),
        deptsGroup[dept].sum.toLocaleString(),
        ((deptsGroup[dept].sum / (total || 1)) * 100).toFixed(1) + '%'
      ]);
    } else if (type === 'tax') {
      reportTitle = 'Vat Tax Refund & Levy Report';
      headers = [['ID', 'Date', 'Vendor', 'Tax Inclusive', 'Gross Amount (KSh)', 'Vat Levy (KSh)', 'Net Amount']];
      body = filtered.map(e => [
        e.id,
        e.date,
        e.vendorName || 'General',
        e.taxInclusive ? 'Yes' : 'No',
        e.amount.toLocaleString(),
        (e.taxAmount || 0).toLocaleString(),
        (e.amount - (e.taxAmount || 0)).toLocaleString()
      ]);
    }

    doc.text(reportTitle, 14, 28);
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | User Session: ${activeUser.name} (${activeUser.role})`, 14, 34);

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 40,
      theme: 'striped',
      headStyles: { fillColor: [6, 182, 212] } // cyan color
    });

    doc.save(`apex_${type}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      
      {/* Ledger Actions Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search memo, vendor, invoice, receipt #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-950/60 border border-brand-border rounded-lg text-xs text-gray-200 outline-none focus:border-cyan-500/40"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 bg-gray-950 border rounded-lg flex items-center gap-1.5 font-bold transition cursor-pointer ${
              showFilters ? 'border-cyan-500 text-cyan-400' : 'border-brand-border text-gray-400 hover:text-gray-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
          
          {/* Export Dropdown simulation */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-gray-950 hover:bg-gray-900 border border-brand-border text-cyan-400 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <div className="relative group">
            <button
              className="px-3 py-2 bg-gray-950 hover:bg-gray-900 border border-brand-border text-cyan-400 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF Reports</span>
            </button>
            <div className="absolute right-0 top-full mt-1 bg-gray-950 border border-brand-border rounded-xl hidden group-hover:block z-20 shadow-2xl divide-y divide-brand-border/40 w-44">
              <button onClick={() => handleExportPDF('detailed')} className="w-full text-left p-2.5 text-[10px] hover:bg-cyan-950/20 text-gray-300 hover:text-cyan-400 transition block">Detailed Summary</button>
              <button onClick={() => handleExportPDF('category')} className="w-full text-left p-2.5 text-[10px] hover:bg-cyan-950/20 text-gray-300 hover:text-cyan-400 transition block">Category Distribution</button>
              <button onClick={() => handleExportPDF('department')} className="w-full text-left p-2.5 text-[10px] hover:bg-cyan-950/20 text-gray-300 hover:text-cyan-400 transition block">Departmental Audit</button>
              <button onClick={() => handleExportPDF('tax')} className="w-full text-left p-2.5 text-[10px] hover:bg-cyan-950/20 text-gray-300 hover:text-cyan-400 transition block">VAT & Tax Report</button>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-gray-950 hover:bg-gray-900 border border-brand-border text-gray-400 rounded-lg flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Drawer */}
      {showFilters && (
        <div className="glass-panel p-4 rounded-xl border border-brand-border bg-gray-950/50 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-in slide-in-from-top duration-200">
          <div>
            <label className="text-gray-500 block mb-1">Category</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30">
              <option value="All">All Categories</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Vendor</label>
            <select value={selectedVendor} onChange={(e) => setSelectedVendor(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30">
              <option value="All">All Vendors</option>
              {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Employee</label>
            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30">
              <option value="All">All Employees</option>
              {uniqueEmployees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Department</label>
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30">
              <option value="All">All Departments</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Pay Method</label>
            <select value={selectedPayMethod} onChange={(e) => setSelectedPayMethod(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30">
              <option value="All">All Methods</option>
              {uniquePayMethods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Project</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30">
              <option value="All">All Projects</option>
              {uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Branch</label>
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30">
              <option value="All">All Branches</option>
              {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Status</label>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30">
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30" />
          </div>
          <div>
            <label className="text-gray-500 block mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30" />
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Min Amount</label>
            <input type="number" placeholder="KSh" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30" />
          </div>
          <div>
            <label className="text-gray-500 block mb-1">Max Amount</label>
            <input type="number" placeholder="KSh" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-full bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none focus:border-cyan-500/30" />
          </div>
        </div>
      )}

      {/* Expenses Ledger Master Grid */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-brand-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/80 border-b border-brand-border text-gray-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="p-3">ID & Date</th>
                <th className="p-3">Category</th>
                <th className="p-3">Vendor / Recipient</th>
                <th className="p-3">Responsible Agent</th>
                <th className="p-3">Department</th>
                <th className="p-3">Branch</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Receipt</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-gray-200 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-gray-500">
                    No expense items match your filters or search constraints.
                  </td>
                </tr>
              ) : (
                filtered.map((exp) => {
                  let statusBadge = 'bg-green-950/40 border-green-500/20 text-green-400';
                  if (exp.status === 'Draft') statusBadge = 'bg-gray-900 border-gray-800 text-gray-400';
                  else if (exp.status === 'Rejected') statusBadge = 'bg-rose-950/40 border-rose-500/20 text-rose-500';
                  else if (exp.status === 'Pending Approval' || exp.status === 'Submitted') statusBadge = 'bg-amber-950/40 border-amber-500/20 text-amber-500 animate-pulse';

                  return (
                    <tr key={exp.id} className="hover:bg-gray-900/10 transition group text-[11px]">
                      <td className="p-3 font-mono text-gray-400">
                        <div className="font-bold text-[10px] text-cyan-400 uppercase">{exp.id.slice(0, 8)}</div>
                        <div className="text-[10px]">{exp.date}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-[10px] text-gray-400 rounded font-mono">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-gray-300">
                        <div className="font-sans font-bold">{exp.vendorName || 'General Vendor'}</div>
                        <div className="text-[10px] text-gray-500 font-sans line-clamp-1">{exp.description}</div>
                      </td>
                      <td className="p-3 capitalize font-sans text-gray-400">
                        {exp.employeeResponsible || exp.recordedBy}
                      </td>
                      <td className="p-3 text-gray-400 capitalize">{exp.department || 'Operations'}</td>
                      <td className="p-3 text-gray-400 capitalize">{exp.branch || 'Main HQ'}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-400">
                        {formatKSh(exp.amount)}
                      </td>
                      <td className="p-3 text-center">
                        {exp.receiptUrl ? (
                          <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 glow-cyan animate-pulse" title="Receipt Scanned File Attached"></span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono border ${statusBadge}`}>
                          {exp.status || 'Approved'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => setSelectedExpense(exp)}
                            className="p-1 bg-gray-950 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 rounded transition"
                            title="View Extended Info"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Permissions block */}
                          {(activeUser.role === UserRole.ADMIN || activeUser.role === UserRole.MANAGER || (exp.status === 'Draft' && exp.recordedBy === activeUser.name)) && (
                            <button
                              onClick={() => onOpenEdit(exp)}
                              className="p-1 bg-gray-950 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 rounded transition"
                              title="Edit Log"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => onDuplicate(exp)}
                            className="p-1 bg-gray-950 border border-brand-border text-gray-400 hover:text-amber-400 hover:border-amber-500/20 rounded transition"
                            title="Clone Expense"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {activeUser.role === UserRole.ADMIN && (
                            <button
                              onClick={() => onOpenDelete(exp)}
                              className="p-1 bg-gray-950 border border-brand-border text-gray-400 hover:text-rose-400 hover:border-rose-500/20 rounded transition"
                              title="Purge Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Expense Detail Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-lg border border-brand-border shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedExpense(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div className="border-b border-brand-border pb-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Ledger Entity Sheet</span>
                <h3 className="text-sm font-bold text-gray-200 font-sans mt-0.5">{selectedExpense.vendorName || 'General Vendor'}</h3>
                <p className="text-rose-400 text-lg font-bold font-mono mt-1">{formatKSh(selectedExpense.amount)}</p>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs text-gray-400 font-mono">
                <div>
                  <span className="text-gray-500 block text-[9px]">EXPENSE ID</span>
                  <span className="text-gray-300 font-bold">{selectedExpense.id}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">LOG DATE & TIME</span>
                  <span className="text-gray-300">{selectedExpense.date}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">EXPENDITURE CATEGORY</span>
                  <span className="text-cyan-400 font-bold">{selectedExpense.category}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">DEPARTMENT</span>
                  <span className="text-gray-300 capitalize">{selectedExpense.department || 'Operations'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">PAYMENT ROUTE</span>
                  <span className="text-gray-300 font-bold">{selectedExpense.paymentMethod || 'Cash'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">BRANCH LOCATION</span>
                  <span className="text-gray-300">{selectedExpense.branch || 'Main HQ'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">TAX LEVY (VAT)</span>
                  <span className="text-gray-300">{selectedExpense.taxAmount ? `${formatKSh(selectedExpense.taxAmount)}` : '0.00 KSh'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">TAX INCLUSIVE STATE</span>
                  <span className="text-gray-300">{selectedExpense.taxInclusive ? 'Gross (Tax Included)' : 'Net Price'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">INVOICE NUMBER</span>
                  <span className="text-gray-300 font-bold">{selectedExpense.invoiceNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">RECEIPT NUMBER</span>
                  <span className="text-gray-300 font-bold">{selectedExpense.receiptNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">EMPLOYEE RESPONSIBLE</span>
                  <span className="text-gray-300 font-bold capitalize">{selectedExpense.employeeResponsible || selectedExpense.recordedBy}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[9px]">ASSOCIATED PROJECT</span>
                  <span className="text-gray-300">{selectedExpense.project || 'Unassigned'}</span>
                </div>
              </div>

              <div className="bg-gray-950/60 p-3 rounded-xl border border-brand-border/60 text-xs">
                <span className="text-gray-500 text-[9px] block mb-1">MEMO NOTES</span>
                <p className="text-gray-300 font-sans leading-relaxed">{selectedExpense.description}</p>
              </div>

              {selectedExpense.recurring?.isRecurring && (
                <div className="bg-cyan-950/20 border border-cyan-500/20 p-2.5 rounded-lg text-[10px] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span className="text-cyan-400 font-sans">Automated Recurrence Active: {selectedExpense.recurring.frequency} scheduler rules apply.</span>
                </div>
              )}

              {/* Approval History list */}
              <div className="bg-gray-950/60 p-3 rounded-xl border border-brand-border/60 text-xs space-y-1">
                <span className="text-gray-500 text-[9px] block">AUDITED APPROVAL WORKFLOW HISTORY</span>
                {selectedExpense.approvalHistory && selectedExpense.approvalHistory.length > 0 ? (
                  <div className="space-y-1.5 divide-y divide-brand-border/30 pt-1">
                    {selectedExpense.approvalHistory.map((h, i) => (
                      <div key={i} className="text-[10px] pt-1.5 flex justify-between">
                        <div>
                          <p className="font-bold text-gray-300">{h.approverName} ({h.approverRole.split(' ')[0]})</p>
                          <p className="text-gray-500 text-[9px]">Reason: "{h.comment}"</p>
                        </div>
                        <span className="text-cyan-400 font-bold text-[9px]">{h.action}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 italic font-sans text-[10px]">No verification workflow is recorded. Default auto-approved claims.</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedExpense(null)}
                  className="w-full py-2 bg-gray-900 border border-brand-border hover:bg-gray-800 text-gray-300 font-sans rounded-xl text-center transition"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal mini icons
const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
