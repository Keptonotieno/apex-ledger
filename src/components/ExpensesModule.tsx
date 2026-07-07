import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatKSh } from '../lib/utils';
import { 
  DollarSign, Search, Plus, Trash2, Calendar, FileText, X, Edit, AlertCircle,
  TrendingUp, Sparkles, Scale, Percent, Activity, CheckCircle, RefreshCw,
  ClipboardList, UserCheck, Printer, FileSpreadsheet, Filter, Settings, Layers, Clock
} from 'lucide-react';
import { UserRole, Expense } from '../types';

// Modular Subcomponents Imports
import { ExpenseAnalytics } from './expenses/ExpenseAnalytics';
import { ExpenseLedger } from './expenses/ExpenseLedger';
import { ApprovalWorkflowView } from './expenses/ApprovalWorkflowView';
import { RecurringExpenses } from './expenses/RecurringExpenses';
import { BudgetMonitoring } from './expenses/BudgetMonitoring';
import { CategoryManager, loadCategories } from './expenses/CategoryManager';
import { ReceiptUploader } from './expenses/ReceiptUploader';

export const ExpensesModule: React.FC = () => {
  const { 
    expenses, 
    sales,
    branches,
    profiles,
    activeUser,
    activeBusiness,
    addExpense,
    updateExpense,
    deleteExpense,
    addAudit
  } = useApp();

  const [activeTab, setActiveTab] = useState<'analytics' | 'ledger' | 'approvals' | 'recurring' | 'budgets'>('analytics');
  
  // Alert logs state
  const [dashboardAlerts, setDashboardAlerts] = useState<string[]>([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [showCategorySettings, setShowCategorySettings] = useState(false);

  // Durable Categories state
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  useEffect(() => {
    if (activeBusiness?.id) {
      const cats = loadCategories(activeBusiness.id);
      setCustomCategories(cats.filter(c => !c.deleted && !c.archived).map(c => c.name));
    }
  }, [activeBusiness, showCategorySettings]);

  // Form Fields for Record Expense Form
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().split(' ')[0].slice(0, 5));
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [paymentMethod, setPaymentMethod] = useState('Mobile Money');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [project, setProject] = useState('');
  const [branch, setBranch] = useState('Main HQ');
  const [currency, setCurrency] = useState('KSh');
  const [employeeResponsible, setEmployeeResponsible] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // Form Fields for Edit (Mirroring all Add fields)
  const [editVendorName, setEditVendorName] = useState('');
  const [editCategory, setEditCategory] = useState('Utilities');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDepartment, setEditDepartment] = useState('Operations');
  const [editPaymentMethod, setEditPaymentMethod] = useState('Mobile Money');
  const [editReceiptNumber, setEditReceiptNumber] = useState('');
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editTaxAmount, setEditTaxAmount] = useState<number>(0);
  const [editTaxInclusive, setEditTaxInclusive] = useState(true);
  const [editProject, setEditProject] = useState('');
  const [editBranch, setEditBranch] = useState('Main HQ');
  const [editEmployeeResponsible, setEditEmployeeResponsible] = useState('');
  const [editReceiptUrl, setEditReceiptUrl] = useState<string | undefined>(undefined);
  const [editNotes, setEditNotes] = useState('');

  // Role based filtering logic
  const filteredExpensesByRole = expenses.filter(e => {
    if (activeUser.role === UserRole.EMPLOYEE) {
      // Employees can only view expenses they personally created or are responsible for
      return e.recordedBy === activeUser.name || e.employeeResponsible === activeUser.name;
    }
    return true;
  });

  // OCR Auto Fill triggers
  const handleReceiptChange = (url: string | undefined, ocrData?: any) => {
    setReceiptUrl(url);
    if (ocrData) {
      if (ocrData.vendor) setVendorName(ocrData.vendor);
      if (ocrData.amount) {
        setAmount(ocrData.amount);
        // VAT estimation (16%)
        setTaxAmount(Math.round(ocrData.amount * 0.16));
      }
      if (ocrData.date) setDate(ocrData.date);
      if (ocrData.invoiceNumber) setInvoiceNumber(ocrData.invoiceNumber);
      if (ocrData.receiptNumber) setReceiptNumber(ocrData.receiptNumber);
    }
  };

  const handleEditReceiptChange = (url: string | undefined, ocrData?: any) => {
    setEditReceiptUrl(url);
    if (ocrData) {
      if (ocrData.vendor) setEditVendorName(ocrData.vendor);
      if (ocrData.amount) {
        setEditAmount(ocrData.amount);
        setEditTaxAmount(Math.round(ocrData.amount * 0.16));
      }
      if (ocrData.date) setEditDate(ocrData.date);
      if (ocrData.invoiceNumber) setEditInvoiceNumber(ocrData.invoiceNumber);
      if (ocrData.receiptNumber) setEditReceiptNumber(ocrData.receiptNumber);
    }
  };

  // Submit Handler
  const handleFormSubmit = (e: React.FormEvent, isDraft: boolean) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) {
      alert('Required Fields: Please enter a valid non-zero amount and a reference memo.');
      return;
    }

    // WorkFlow Router (Under 10k requires Manager, 10-50k Owner, Over 50k Dual)
    let finalStatus: Expense['status'] = 'Approved';
    let approvalReq = false;

    if (!isDraft) {
      if (amount >= 10000) {
        finalStatus = 'Pending Approval';
        approvalReq = true;
      } else {
        finalStatus = 'Approved';
      }
    } else {
      finalStatus = 'Draft';
    }

    const payload: Omit<Expense, 'id' | 'businessId' | 'recordedBy' | 'role'> & Partial<Expense> = {
      category,
      description: description.trim(),
      amount: Number(amount),
      date,
      vendorName: vendorName.trim() || 'General Vendor',
      department,
      paymentMethod,
      receiptNumber,
      invoiceNumber,
      taxAmount: Number(taxAmount),
      taxInclusive,
      project: project.trim(),
      branch,
      employeeResponsible: employeeResponsible || activeUser.name,
      status: finalStatus,
      approvalRequired: approvalReq,
      receiptUrl,
      notes,
      recurring: isRecurring ? { isRecurring, frequency: recurrenceFrequency, status: 'Active' } : undefined,
      approvalHistory: approvalReq ? [{
        approverName: activeUser.name,
        approverRole: activeUser.role,
        action: 'Submitted Request',
        date: new Date().toISOString().split('T')[0],
        comment: 'Initial claim submission.'
      }] : []
    };

    addExpense(payload);

    // Audit trail
    addAudit(
      'Recorded Expense Claim',
      'N/A',
      `${vendorName}: ${amount} KSh (Category: ${category}, Status: ${finalStatus})`
    );

    // Reset Form Fields
    setVendorName('');
    setAmount(0);
    setDescription('');
    setReceiptUrl(undefined);
    setIsRecurring(false);
    setNotes('');
    setShowAddModal(false);
  };

  // Duplicate handler
  const handleDuplicate = (exp: Expense) => {
    setVendorName(exp.vendorName || '');
    setCategory(exp.category);
    setAmount(exp.amount);
    setDate(new Date().toISOString().split('T')[0]);
    setDescription(exp.description);
    setDepartment(exp.department || 'Operations');
    setPaymentMethod(exp.paymentMethod || 'Mobile Money');
    setReceiptNumber(exp.receiptNumber || '');
    setInvoiceNumber(exp.invoiceNumber || '');
    setTaxAmount(exp.taxAmount || 0);
    setTaxInclusive(exp.taxInclusive !== false);
    setProject(exp.project || '');
    setBranch(exp.branch || 'Main HQ');
    setEmployeeResponsible(exp.employeeResponsible || '');
    setReceiptUrl(exp.receiptUrl);
    setNotes(exp.notes || '');
    setShowAddModal(true);
  };

  // Open Edit Handler
  const handleOpenEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setEditVendorName(exp.vendorName || '');
    setEditCategory(exp.category);
    setEditAmount(exp.amount);
    setEditDate(exp.date);
    setEditDescription(exp.description);
    setEditDepartment(exp.department || 'Operations');
    setEditPaymentMethod(exp.paymentMethod || 'Mobile Money');
    setEditReceiptNumber(exp.receiptNumber || '');
    setEditInvoiceNumber(exp.invoiceNumber || '');
    setEditTaxAmount(exp.taxAmount || 0);
    setEditTaxInclusive(exp.taxInclusive !== false);
    setEditProject(exp.project || '');
    setEditBranch(exp.branch || 'Main HQ');
    setEditEmployeeResponsible(exp.employeeResponsible || '');
    setEditReceiptUrl(exp.receiptUrl);
    setEditNotes(exp.notes || '');
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || editAmount <= 0 || !editDescription.trim()) return;

    // Permissions check for edit
    if (editingExpense.status === 'Approved' && activeUser.role === UserRole.EMPLOYEE) {
      alert('Permission Denied: Employees cannot modify an already approved expense.');
      return;
    }

    const updates: Partial<Expense> = {
      vendorName: editVendorName.trim() || 'General Vendor',
      category: editCategory,
      amount: Number(editAmount),
      date: editDate,
      description: editDescription.trim(),
      department: editDepartment,
      paymentMethod: editPaymentMethod,
      receiptNumber: editReceiptNumber,
      invoiceNumber: editInvoiceNumber,
      taxAmount: Number(editTaxAmount),
      taxInclusive: editTaxInclusive,
      project: editProject.trim(),
      branch: editBranch,
      employeeResponsible: editEmployeeResponsible,
      receiptUrl: editReceiptUrl,
      notes: editNotes
    };

    updateExpense(editingExpense.id, updates);

    addAudit(
      'Updated Expense Record',
      `ID: ${editingExpense.id} | Amount: ${editingExpense.amount}`,
      `Amount: ${editAmount} | Vendor: ${editVendorName} (Category: ${editCategory})`
    );

    setShowEditModal(false);
    setEditingExpense(null);
  };

  const handleOpenDelete = (exp: Expense) => {
    // Only Admin can delete permanently
    if (activeUser.role !== UserRole.ADMIN) {
      alert('Permission Denied: Only Business Owners (Admins) can permanently delete expense logs.');
      return;
    }
    setExpenseToDelete(exp);
    setShowDeleteModal(true);
  };

  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    deleteExpense(expenseToDelete.id);

    addAudit(
      'Permanently Deleted Expense Log',
      `ID: ${expenseToDelete.id} | Amount: ${expenseToDelete.amount}`,
      'DELETED permanently from ledger archives.'
    );

    setShowDeleteModal(false);
    setExpenseToDelete(null);
  };

  // Watch budgets and recurring notifications to populate alert bar
  const handleAlertTriggered = (alerts: string[]) => {
    setDashboardAlerts(prev => {
      const merged = Array.from(new Set([...prev, ...alerts]));
      return merged;
    });
  };

  const clearAlerts = () => setDashboardAlerts([]);

  const isManagement = activeUser.role === UserRole.ADMIN || activeUser.role === UserRole.MANAGER;

  return (
    <div className="space-y-4 font-mono text-xs">
      
      {/* 1. Header block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-4">
        <div>
          <h2 className="text-base font-bold font-sans text-gray-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Expense Allocation Analysis</span>
          </h2>
          <p className="text-[10px] text-gray-400 font-sans mt-0.5 max-w-2xl leading-relaxed">
            Analyze business expenditure, monitor operational burn rate, and identify spending patterns in real time.
          </p>
        </div>

        <div className="flex gap-2">
          {isManagement && (
            <button
              onClick={() => setShowCategorySettings(true)}
              className="px-3.5 py-2.5 bg-gray-950 hover:bg-gray-900 border border-brand-border text-gray-300 rounded-xl font-sans font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Settings className="w-4 h-4 text-cyan-400" />
              <span>Category Admin</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 rounded-xl font-sans font-bold flex items-center gap-1.5 transition cursor-pointer glow-cyan"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Real-Time Alerts banner */}
      {dashboardAlerts.length > 0 && (
        <div className="border border-rose-500/20 bg-rose-950/5 p-3 rounded-xl flex items-start justify-between gap-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1 text-rose-400 font-sans text-[11px]">
              <span className="font-bold">SYSTEM THRESHOLD ALERT:</span>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                {dashboardAlerts.map((alert, i) => <li key={i}>{alert}</li>)}
              </ul>
            </div>
          </div>
          <button onClick={clearAlerts} className="text-gray-500 hover:text-gray-300 transition text-[10px] font-sans">
            Dismiss Alerts
          </button>
        </div>
      )}

      {/* Custom Tabs */}
      <div className="flex border-b border-brand-border/40 gap-1 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold font-sans transition shrink-0 ${
            activeTab === 'analytics'
              ? 'bg-cyan-500/10 text-cyan-400 border-t border-x border-cyan-500/20'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-950/20'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />
          Analytics Dashboard
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold font-sans transition shrink-0 ${
            activeTab === 'ledger'
              ? 'bg-cyan-500/10 text-cyan-400 border-t border-x border-cyan-500/20'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-950/20'
          }`}
        >
          <FileText className="w-3.5 h-3.5 inline mr-1.5" />
          General Ledger
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold font-sans transition shrink-0 ${
            activeTab === 'approvals'
              ? 'bg-cyan-500/10 text-cyan-400 border-t border-x border-cyan-500/20'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-950/20'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 inline mr-1.5" />
          Approval Workflow
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold font-sans transition shrink-0 ${
            activeTab === 'recurring'
              ? 'bg-cyan-500/10 text-cyan-400 border-t border-x border-cyan-500/20'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-950/20'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
          Recurring Expenses
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold font-sans transition shrink-0 ${
            activeTab === 'budgets'
              ? 'bg-cyan-500/10 text-cyan-400 border-t border-x border-cyan-500/20'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-950/20'
          }`}
        >
          <Scale className="w-3.5 h-3.5 inline mr-1.5" />
          Budgets
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-3">
        {activeTab === 'analytics' && (
          <ExpenseAnalytics 
            expenses={filteredExpensesByRole} 
            sales={sales} 
          />
        )}

        {activeTab === 'ledger' && (
          <ExpenseLedger
            expenses={filteredExpensesByRole}
            activeUser={activeUser}
            branches={branches}
            onOpenEdit={handleOpenEditExpense}
            onOpenDelete={handleOpenDelete}
            onDuplicate={handleDuplicate}
          />
        )}

        {activeTab === 'approvals' && (
          <ApprovalWorkflowView
            expenses={expenses}
            activeUser={activeUser}
            updateExpense={updateExpense}
            addAudit={(a, o, n) => addAudit(a, o, n)}
          />
        )}

        {activeTab === 'recurring' && (
          <RecurringExpenses
            businessId={activeBusiness.id}
            addExpense={addExpense}
            onAlertTriggered={handleAlertTriggered}
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetMonitoring
            businessId={activeBusiness.id}
            expenses={filteredExpensesByRole}
            onAlertTriggered={handleAlertTriggered}
          />
        )}
      </div>

      {/* 9. Record New Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-400 animate-pulse" />
              <span>Record New Expense Transaction</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[11px] text-gray-400">
              
              {/* Receipt OCR Panel */}
              <div className="md:col-span-1 space-y-4 border-r border-brand-border/40 pr-4">
                <ReceiptUploader 
                  receiptUrl={receiptUrl}
                  onChange={handleReceiptChange}
                />
                
                <div className="space-y-1 bg-gray-950/50 p-3 rounded-lg border border-brand-border/40">
                  <span className="text-[9px] text-gray-500 font-bold block">OCR SCANNING ASSISTANT</span>
                  <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                    Upload or snap a receipt. The local AI Scanner will automatically extract vendor parameters, sum quantities, and format transaction totals.
                  </p>
                </div>
              </div>

              {/* Form Input fields */}
              <form onSubmit={(e) => handleFormSubmit(e, false)} className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-gray-500 block mb-1">Expense Amount ({currency})</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAmount(val);
                        // Auto VAT (16%)
                        setTaxAmount(Math.round(val * 0.16));
                      }}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-rose-400 outline-none focus:border-cyan-500/30 font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Vendor Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Safaricom PLC"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Expense Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                    >
                      {customCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Department</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                    >
                      <option value="Marketing">Marketing</option>
                      <option value="Payroll & HR">Payroll & HR</option>
                      <option value="Operations">Operations</option>
                      <option value="IT & Software">IT & Software</option>
                      <option value="Administration">Administration</option>
                      <option value="Logistics & Transport">Logistics & Transport</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Mobile Money">Mobile Money</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Invoice">Invoice</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Branch</label>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                    >
                      {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Receipt Number</label>
                    <input
                      type="text"
                      placeholder="REC-5512A"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Invoice Number</label>
                    <input
                      type="text"
                      placeholder="INV-2026-90"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Tax Amount (VAT)</label>
                    <input
                      type="number"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(Number(e.target.value))}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Associated Project</label>
                    <input
                      type="text"
                      placeholder="HQ Overhaul"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Employee Responsible</label>
                    <select
                      value={employeeResponsible}
                      onChange={(e) => setEmployeeResponsible(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                    >
                      <option value="">Choose Agent...</option>
                      {profiles.map(p => <option key={p.id} value={p.name}>{p.name} ({p.role.split(' ')[0]})</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="taxInclusive"
                      checked={taxInclusive}
                      onChange={(e) => setTaxInclusive(e.target.checked)}
                      className="w-4 h-4 text-cyan-500 border-brand-border bg-gray-950 rounded outline-none"
                    />
                    <label htmlFor="taxInclusive" className="text-gray-400 font-sans cursor-pointer select-none">Tax Inclusive Amount</label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-brand-border/30">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 text-cyan-500 border-brand-border bg-gray-950 rounded outline-none"
                    />
                    <label htmlFor="isRecurring" className="text-gray-400 font-sans cursor-pointer select-none">Recurring expense template</label>
                  </div>
                  
                  {isRecurring && (
                    <select
                      value={recurrenceFrequency}
                      onChange={(e) => setRecurrenceFrequency(e.target.value as any)}
                      className="bg-gray-950 border border-brand-border rounded p-1 text-gray-300 outline-none"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-sans">Reference Memo / Description Note</label>
                  <textarea
                    required
                    placeholder="Describe transaction details, vat rates, approvals reasons, or purchase specifics..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 h-16 font-sans text-xs"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 bg-gray-900 border border-brand-border hover:bg-gray-800 text-gray-400 rounded-xl font-bold transition font-sans text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleFormSubmit(e, true)}
                    className="flex-1 py-2 bg-gray-950 border border-brand-border hover:bg-gray-900 text-gray-300 rounded-xl font-bold transition font-sans text-xs"
                  >
                    Save Draft
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition font-sans text-xs cursor-pointer"
                  >
                    Submit Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && editingExpense && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setShowEditModal(false);
                setEditingExpense(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-400 animate-pulse" />
              <span>Edit Expense Transaction</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[11px] text-gray-400">
              
              {/* Receipt OCR Panel */}
              <div className="md:col-span-1 space-y-4 border-r border-brand-border/40 pr-4">
                <ReceiptUploader 
                  receiptUrl={editReceiptUrl}
                  onChange={handleEditReceiptChange}
                />
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleEditSubmit} className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-gray-500 block mb-1">Expense Amount ({currency})</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditAmount(val);
                        setEditTaxAmount(Math.round(val * 0.16));
                      }}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-rose-400 outline-none focus:border-cyan-500/30 font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Vendor Name</label>
                    <input
                      type="text"
                      required
                      value={editVendorName}
                      onChange={(e) => setEditVendorName(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Expense Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                    >
                      {customCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Department</label>
                    <select
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none"
                    >
                      <option value="Marketing">Marketing</option>
                      <option value="Payroll & HR">Payroll & HR</option>
                      <option value="Operations">Operations</option>
                      <option value="IT & Software">IT & Software</option>
                      <option value="Administration">Administration</option>
                      <option value="Logistics & Transport">Logistics & Transport</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Payment Method</label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Mobile Money">Mobile Money</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Invoice">Invoice</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Branch</label>
                    <select
                      value={editBranch}
                      onChange={(e) => setEditBranch(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none"
                    >
                      {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Receipt Number</label>
                    <input
                      type="text"
                      value={editReceiptNumber}
                      onChange={(e) => setEditReceiptNumber(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Invoice Number</label>
                    <input
                      type="text"
                      value={editInvoiceNumber}
                      onChange={(e) => setEditInvoiceNumber(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Tax Amount (VAT)</label>
                    <input
                      type="number"
                      value={editTaxAmount}
                      onChange={(e) => setEditTaxAmount(Number(e.target.value))}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Associated Project</label>
                    <input
                      type="text"
                      value={editProject}
                      onChange={(e) => setEditProject(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Employee Responsible</label>
                    <select
                      value={editEmployeeResponsible}
                      onChange={(e) => setEditEmployeeResponsible(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                    >
                      <option value="">Choose Agent...</option>
                      {profiles.map(p => <option key={p.id} value={p.name}>{p.name} ({p.role.split(' ')[0]})</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="editTaxInclusive"
                      checked={editTaxInclusive}
                      onChange={(e) => setEditTaxInclusive(e.target.checked)}
                      className="w-4 h-4 text-cyan-500 border-brand-border bg-gray-950 rounded outline-none"
                    />
                    <label htmlFor="editTaxInclusive" className="text-gray-400 font-sans cursor-pointer select-none">Tax Inclusive Amount</label>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-sans">Reference Memo / Description Note</label>
                  <textarea
                    required
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 h-16 font-sans text-xs"
                  />
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingExpense(null);
                    }}
                    className="flex-1 py-2 bg-gray-900 border border-brand-border hover:bg-gray-800 text-gray-300 rounded-xl font-bold font-sans text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition font-sans text-xs cursor-pointer"
                  >
                    Update Ledger Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Admin Drawer Modal */}
      {showCategorySettings && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl border border-brand-border shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowCategorySettings(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <CategoryManager 
              businessId={activeBusiness.id}
              onClose={() => setShowCategorySettings(false)}
            />
            
            <div className="pt-4 border-t border-brand-border/40 flex justify-end">
              <button
                onClick={() => setShowCategorySettings(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 font-sans rounded-xl text-center transition"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Expense Modal */}
      {showDeleteModal && expenseToDelete && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-rose-500/30 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowDeleteModal(false);
                setExpenseToDelete(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-200">
                  Delete Expense Record?
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Are you sure you want to permanently delete this expense log from the enterprise accounts ledger? This change will instantly rollback consolidated accounting figures.
                </p>
                <div className="bg-gray-950/50 p-3 rounded-xl border border-brand-border/60 text-left space-y-1.5 mt-2 font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">CATEGORY:</span>
                    <span className="text-gray-300 font-medium">{expenseToDelete.category}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">REFERENCE NOTE:</span>
                    <span className="text-gray-300 font-medium">{expenseToDelete.description}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">AMOUNT SPENT:</span>
                    <span className="text-rose-400 font-bold">{formatKSh(expenseToDelete.amount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">LOG DATE:</span>
                    <span className="text-gray-400">{expenseToDelete.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setExpenseToDelete(null);
                  }}
                  className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 font-medium rounded-xl text-xs transition cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteExpense}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl text-xs transition shadow-lg shadow-rose-950/30 cursor-pointer font-sans"
                >
                  Delete Log Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
