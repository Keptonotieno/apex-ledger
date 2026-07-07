import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, Budget, Invoice, BankTransaction } from '../types';
import { 
  Plus, Search, Filter, RefreshCw, Check, Trash2, Edit2, 
  AlertTriangle, CheckCircle2, ChevronRight, Coins, FileText,
  TrendingUp, TrendingDown, Clock, Building, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AccountingModule: React.FC = () => {
  const {
    activeUser,
    activeBusiness,
    budgets,
    invoices,
    bankTransactions,
    reconciliations,
    addBudget,
    updateBudget,
    deleteBudget,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    updateBankTransaction,
    addReconciliation,
    syncBankTransactions,
    addExpense,
    addAudit,
    addNotification
  } = useApp();

  // Navigation / Tab states
  const [activeTab, setActiveTab] = useState<'budgets' | 'banking' | 'invoices'>('budgets');
  
  // Search & Filter States
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('All');
  const [transactionTab, setTransactionTab] = useState<'Pending' | 'Reconciled' | 'Ignored'>('Pending');

  // Modal / Form States
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetForm, setBudgetForm] = useState({
    category: '',
    spendingLimit: ''
  });

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    customerName: '',
    billingAmount: '',
    lineItemDescription: '',
    dueDateOffset: '15'
  });

  const [showReconcileModal, setShowReconcileModal] = useState<BankTransaction | null>(null);
  const [reconciliationForm, setReconciliationForm] = useState({
    category: 'Revenue',
    customCategory: ''
  });

  const [isSyncing, setIsSyncing] = useState(false);

  // Helper arrays
  const budgetCategories = ['Utilities', 'Rent', 'Marketing', 'Payroll', 'Supplies', 'Other'];

  // Invoice calculations
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.customerName.toLowerCase().includes(invoiceSearch.toLowerCase()) || 
                          inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                          inv.lineItemDescription.toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchesStatus = invoiceStatusFilter === 'All' || inv.status === invoiceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.billingAmount, 0);
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + inv.billingAmount, 0);
  const outstandingInvoices = invoices.filter(i => i.status !== 'Paid');
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.billingAmount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'Overdue').reduce((sum, inv) => sum + inv.billingAmount, 0);

  // Bank Feed operations
  const handleSyncFeed = async () => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    syncBankTransactions();
    setIsSyncing(false);
  };

  const handleIgnoreTransaction = (id: string) => {
    updateBankTransaction(id, { status: 'Ignored' });
    addNotification('Transaction Ignored', 'Transaction has been flagged as ignored and hidden from active queue.', 'info');
    addAudit('Ignored Bank Transaction', `ID: ${id}`, 'Ignored');
  };

  // Reconciliation processing
  const handleOpenReconcile = (txn: BankTransaction) => {
    setShowReconcileModal(txn);
    setReconciliationForm({
      category: txn.amount < 0 ? 'Utilities' : 'Revenue',
      customCategory: ''
    });
  };

  const handleReconcileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReconcileModal) return;

    const txn = showReconcileModal;
    const finalCategory = reconciliationForm.category === 'Custom' 
      ? reconciliationForm.customCategory 
      : reconciliationForm.category;

    if (!finalCategory.trim()) {
      alert('Please specify a valid category.');
      return;
    }

    // 1. Create reconciliation record
    addReconciliation({
      amount: Math.abs(txn.amount),
      paymentReference: txn.reference,
      category: finalCategory,
      status: 'Reconciled'
    });

    // 2. Update transaction status
    updateBankTransaction(txn.id, {
      status: 'Reconciled',
      reconciliationId: 'rec_' + Date.now(),
      reconciledAt: new Date().toISOString()
    });

    // 3. Update related invoice if it is a matching payment
    if (txn.amount > 0) {
      // Find matching invoice by billing amount or description keywords
      const matchInv = invoices.find(inv => 
        inv.status !== 'Paid' && 
        (inv.billingAmount === txn.amount || txn.description.toLowerCase().includes(inv.customerName.toLowerCase()))
      );
      if (matchInv) {
        updateInvoice(matchInv.id, { status: 'Paid' });
        addNotification('Auto-Matched Invoice', `Successfully auto-matched transaction to invoice ${matchInv.invoiceNumber}!`, 'success');
      }
    } else {
      // It is an expense transaction. Create actual expense in database, which auto-adjusts category budget!
      addExpense({
        category: finalCategory,
        description: `Reconciled: ${txn.description} (${txn.source})`,
        amount: Math.abs(txn.amount),
        date: txn.date
      });
    }

    setShowReconcileModal(null);
  };

  // Budget submit
  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(budgetForm.spendingLimit);
    if (!budgetForm.category) {
      alert('Please choose or enter a category.');
      return;
    }
    if (isNaN(limitNum) || limitNum <= 0) {
      alert('Please enter a valid spending limit.');
      return;
    }

    // Check unique category
    if (!editingBudget) {
      const exists = budgets.some(b => b.category.toLowerCase() === budgetForm.category.toLowerCase());
      if (exists) {
        alert('A budget for this category already exists.');
        return;
      }
    }

    if (editingBudget) {
      updateBudget(editingBudget.id, {
        category: budgetForm.category,
        spendingLimit: limitNum
      });
      addNotification('Budget Updated', `Spending limit for ${budgetForm.category} updated to KSh ${limitNum}.`, 'success');
    } else {
      addBudget({
        category: budgetForm.category,
        spendingLimit: limitNum,
        amountSpent: 0,
        remainingBalance: limitNum,
        percentageUsed: 0
      });
      addNotification('Budget Created', `New budget limit for ${budgetForm.category} created at KSh ${limitNum}.`, 'success');
    }

    setShowBudgetModal(false);
    setEditingBudget(null);
    setBudgetForm({ category: '', spendingLimit: '' });
  };

  const handleEditBudgetClick = (bgt: Budget) => {
    setEditingBudget(bgt);
    setBudgetForm({
      category: bgt.category,
      spendingLimit: bgt.spendingLimit.toString()
    });
    setShowBudgetModal(true);
  };

  const handleDeleteBudgetClick = (id: string, category: string) => {
    if (confirm(`Are you sure you want to delete the budget limit for ${category}?`)) {
      deleteBudget(id);
      addNotification('Budget Deleted', `Deleted budget limit for ${category}.`, 'info');
    }
  };

  // Invoice submit
  const handleInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const billingAmountNum = parseFloat(invoiceForm.billingAmount);
    const offsetNum = parseInt(invoiceForm.dueDateOffset, 10);

    if (!invoiceForm.customerName.trim()) {
      alert('Please enter customer name.');
      return;
    }
    if (isNaN(billingAmountNum) || billingAmountNum <= 0) {
      alert('Please enter a valid billing amount.');
      return;
    }
    if (!invoiceForm.lineItemDescription.trim()) {
      alert('Please describe the line item.');
      return;
    }
    if (isNaN(offsetNum) || offsetNum < 1) {
      alert('Please specify a due date offset of at least 1 day.');
      return;
    }

    const dueDateStr = new Date(Date.now() + offsetNum * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    addInvoice({
      customerName: invoiceForm.customerName.trim(),
      billingAmount: billingAmountNum,
      lineItemDescription: invoiceForm.lineItemDescription.trim(),
      dueDateOffset: offsetNum,
      dueDate: dueDateStr,
      status: 'Sent'
    });

    setShowInvoiceModal(false);
    setInvoiceForm({
      customerName: '',
      billingAmount: '',
      lineItemDescription: '',
      dueDateOffset: '15'
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6" id="accounting-ledger-container">
      {/* Title & Organization Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5" id="accounting-header">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans flex items-center gap-2">
            <Coins className="w-8 h-8 text-indigo-600" />
            Accounting Ledger
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Durable double-entry compliance and workspace-isolated finance management for <strong className="text-slate-800">{activeBusiness.name}</strong>
          </p>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-2 mt-4 md:mt-0 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-xs text-slate-600 self-start md:self-auto font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          REAL-TIME LEDGER ACTIVE
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 bg-slate-50 p-1.5 rounded-xl max-w-md" id="accounting-navigation-tabs">
        <button
          onClick={() => setActiveTab('budgets')}
          className={`flex-1 py-2 px-3 text-center text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === 'budgets' 
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
          id="tab-budgets-btn"
        >
          Category Budgets
        </button>
        <button
          onClick={() => setActiveTab('banking')}
          className={`flex-1 py-2 px-3 text-center text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === 'banking' 
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
          id="tab-banking-btn"
        >
          Banking & Sync
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex-1 py-2 px-3 text-center text-sm font-medium rounded-lg transition-all duration-200 ${
            activeTab === 'invoices' 
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
          id="tab-invoices-btn"
        >
          Invoice Ledger
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full"
      >
        {/* TAB 1: CATEGORY BUDGETS */}
        {activeTab === 'budgets' && (
          <div className="space-y-6" id="budgets-section">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Expense Category Budgets</h2>
                <p className="text-xs text-slate-500 mt-0.5">Define spending limits to monitor real-time company expenditures.</p>
              </div>
              <button
                onClick={() => {
                  setEditingBudget(null);
                  setBudgetForm({ category: '', spendingLimit: '' });
                  setShowBudgetModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm w-fit"
                id="create-budget-btn"
              >
                <Plus className="w-4 h-4" />
                Create Budget Limit
              </button>
            </div>

            {/* Budget Grid */}
            {budgets.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center" id="empty-budgets">
                <Coins className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-700 text-base">No Budgets Defined</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">Setup category limits to track and prevent company overspending.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="budgets-grid">
                {budgets.map((b) => {
                  const limit = b.spendingLimit;
                  const spent = b.amountSpent;
                  const percent = b.percentageUsed;
                  const isOver = spent > limit;

                  return (
                    <div 
                      key={b.id} 
                      className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between ${
                        isOver ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                      }`}
                      id={`budget-card-${b.id}`}
                    >
                      <div>
                        {/* Budget Title & Actions */}
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-mono">Category</span>
                            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{b.category}</h3>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditBudgetClick(b)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              title="Edit Budget"
                              id={`edit-budget-${b.id}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBudgetClick(b.id, b.category)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Budget"
                              id={`delete-budget-${b.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Financial stats inside the card */}
                        <div className="grid grid-cols-2 gap-2 mt-5 mb-5 border-y border-slate-100 py-3 font-sans">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-mono block">Spent So Far</span>
                            <span className={`text-base font-extrabold ${isOver ? 'text-rose-600' : 'text-slate-800'}`}>
                              KSh {spent.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-mono block">Limit</span>
                            <span className="text-base font-extrabold text-slate-800">
                              KSh {limit.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className={isOver ? 'text-rose-600 font-semibold' : 'text-slate-500'}>
                            {isOver ? 'Limit Exceeded!' : `${percent}% used`}
                          </span>
                          <span className="font-semibold text-slate-700">
                            KSh {Math.max(0, b.remainingBalance).toLocaleString()} remaining
                          </span>
                        </div>

                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOver ? 'bg-rose-500' : percent >= 85 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          ></div>
                        </div>

                        {isOver && (
                          <div className="flex items-center gap-1 text-rose-600 text-[10px] font-semibold font-sans mt-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            Over budget by KSh {(spent - limit).toLocaleString()}!
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BANKING & SYNC */}
        {activeTab === 'banking' && (
          <div className="space-y-6" id="banking-section">
            <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm border border-slate-800">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-500 text-[10px] font-mono tracking-widest uppercase rounded-md text-white font-semibold">APIs Connected</span>
                  <span className="text-xs text-slate-400 font-mono">Stripe • M-Pesa • Equity API</span>
                </div>
                <h3 className="text-xl font-bold font-sans">Bank Statement Feed</h3>
                <p className="text-slate-400 text-sm max-w-xl">
                  Automate and reconcile your live statements against workspace ledger sheets instantly. Ensure accurate record matching and double-entry consistency.
                </p>
              </div>

              <button
                onClick={handleSyncFeed}
                disabled={isSyncing}
                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition shadow-md whitespace-nowrap self-stretch md:self-auto justify-center"
                id="sync-bank-feed-btn"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing Feeds...' : 'Sync Statement Feeds'}
              </button>
            </div>

            {/* Reconciliation Categories & Table Container */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-slate-100 gap-4">
                {/* Pending vs Reconciled Sub-tabs */}
                <div className="flex gap-1.5 border-b sm:border-none border-slate-200 pb-2 sm:pb-0 font-mono">
                  {(['Pending', 'Reconciled', 'Ignored'] as const).map((t) => {
                    const count = bankTransactions.filter(bt => bt.status === t).length;
                    return (
                      <button
                        key={t}
                        onClick={() => setTransactionTab(t)}
                        className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition ${
                          transactionTab === t
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                        id={`txn-tab-${t}`}
                      >
                        {t} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transaction list */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="bank-transactions-table">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-mono tracking-wider uppercase text-slate-400 border-b border-slate-200">
                      <th className="py-3 px-5">Date</th>
                      <th className="py-3 px-5">Reference</th>
                      <th className="py-3 px-5">Source / Gateway</th>
                      <th className="py-3 px-5">Description</th>
                      <th className="py-3 px-5">Suggested Category</th>
                      <th className="py-3 px-5 text-right">Amount</th>
                      <th className="py-3 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {bankTransactions.filter(bt => bt.status === transactionTab).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No transactions found in <strong className="text-slate-700">{transactionTab}</strong> queue.
                        </td>
                      </tr>
                    ) : (
                      bankTransactions
                        .filter(bt => bt.status === transactionTab)
                        .map((bt) => {
                          const isExpense = bt.amount < 0;
                          return (
                            <tr key={bt.id} className="hover:bg-slate-50/50 transition-colors" id={`txn-row-${bt.id}`}>
                              <td className="py-4 px-5 text-slate-600 font-mono text-xs">{bt.date}</td>
                              <td className="py-4 px-5 text-slate-800 font-mono font-semibold text-xs">{bt.reference}</td>
                              <td className="py-4 px-5">
                                <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[10px] font-mono px-2 py-0.5 font-semibold">
                                  {bt.source}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-slate-700 font-medium">{bt.description}</td>
                              <td className="py-4 px-5">
                                <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold">
                                  {bt.categorySuggestion}
                                </span>
                              </td>
                              <td className={`py-4 px-5 text-right font-bold text-sm ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {isExpense ? '-' : '+'} KSh {Math.abs(bt.amount).toLocaleString()}
                              </td>
                              <td className="py-4 px-5">
                                <div className="flex items-center justify-center gap-1.5">
                                  {bt.status === 'Pending' ? (
                                    <>
                                      <button
                                        onClick={() => handleOpenReconcile(bt)}
                                        className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
                                        id={`reconcile-btn-${bt.id}`}
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        Reconcile
                                      </button>
                                      <button
                                        onClick={() => handleIgnoreTransaction(bt.id)}
                                        className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-semibold transition"
                                        id={`ignore-btn-${bt.id}`}
                                      >
                                        Ignore
                                      </button>
                                    </>
                                  ) : bt.status === 'Reconciled' ? (
                                    <div className="flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                      Reconciled
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Ignored</span>
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
          </div>
        )}

        {/* TAB 3: INVOICE LEDGER */}
        {activeTab === 'invoices' && (
          <div className="space-y-6" id="invoices-section">
            {/* Invoice Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="invoice-stats-grid">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider font-mono">Total Invoiced</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">KSh {totalInvoiced.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <FileText className="w-6 h-6 text-indigo-600" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider font-mono">Collected (Paid)</span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">KSh {totalPaid.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider font-mono">Outstanding</span>
                  <p className="text-2xl font-black text-amber-600 mt-1">KSh {totalOutstanding.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider font-mono">Overdue</span>
                  <p className="text-2xl font-black text-rose-600 mt-1 font-sans">KSh {totalOverdue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
              </div>
            </div>

            {/* Filters and List */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left side filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by customer name, invoice #, line item..."
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 bg-slate-50 focus:bg-white transition"
                      id="invoice-search-input"
                    />
                  </div>

                  {/* Status Dropdown Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={invoiceStatusFilter}
                      onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 text-slate-700"
                      id="invoice-status-filter"
                    >
                      <option value="All">All Invoices</option>
                      <option value="Sent">Sent</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>

                {/* Create Invoice button */}
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm w-full sm:w-auto justify-center"
                  id="open-create-invoice-modal-btn"
                >
                  <Plus className="w-4 h-4" />
                  Create Customer Invoice
                </button>
              </div>

              {/* Table list */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="invoices-table">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-mono tracking-wider uppercase text-slate-400 border-b border-slate-200">
                      <th className="py-3 px-5">Invoice Number</th>
                      <th className="py-3 px-5">Customer Name</th>
                      <th className="py-3 px-5">Billing Description</th>
                      <th className="py-3 px-5">Due Date</th>
                      <th className="py-3 px-5 text-center">Status</th>
                      <th className="py-3 px-5 text-right">Amount</th>
                      <th className="py-3 px-5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No customer invoices found matching the current search parameters.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => {
                        const isOverdue = inv.status === 'Overdue';
                        const isPaid = inv.status === 'Paid';
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors" id={`invoice-row-${inv.id}`}>
                            <td className="py-4 px-5 font-mono font-bold text-xs text-slate-900">{inv.invoiceNumber}</td>
                            <td className="py-4 px-5 font-semibold text-slate-800">{inv.customerName}</td>
                            <td className="py-4 px-5 text-slate-600 font-medium max-w-xs truncate" title={inv.lineItemDescription}>
                              {inv.lineItemDescription}
                            </td>
                            <td className="py-4 px-5 text-slate-500 font-mono text-xs">{inv.dueDate}</td>
                            <td className="py-4 px-5 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isPaid 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : isOverdue 
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right font-extrabold text-slate-800 text-sm font-sans">
                              KSh {inv.billingAmount.toLocaleString()}
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center justify-center gap-1">
                                {!isPaid && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Mark invoice ${inv.invoiceNumber} as fully Paid?`)) {
                                        updateInvoice(inv.id, { status: 'Paid' });
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                                    id={`mark-paid-btn-${inv.id}`}
                                  >
                                    Mark Paid
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber}? This action is revertible.`)) {
                                      deleteInvoice(inv.id);
                                      addNotification('Invoice Deleted', `Deleted invoice ${inv.invoiceNumber}.`, 'info');
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete Invoice"
                                  id={`delete-invoice-btn-${inv.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
          </div>
        )}
      </motion.div>

      {/* MODAL 1: CREATE/EDIT BUDGET */}
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-150"
              id="budget-modal-container"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingBudget ? 'Edit Spending Budget' : 'Create Category Budget'}
                </h3>
                <button
                  onClick={() => setShowBudgetModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  id="close-budget-modal-btn"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleBudgetSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Budget Category</label>
                  {editingBudget ? (
                    <input
                      type="text"
                      disabled
                      value={budgetForm.category}
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm focus:outline-none cursor-not-allowed"
                    />
                  ) : (
                    <select
                      value={budgetForm.category}
                      onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50"
                      id="budget-category-select"
                      required
                    >
                      <option value="">-- Choose Category --</option>
                      {budgetCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Spending Limit Amount (KSh)</label>
                  <input
                    type="number"
                    placeholder="Enter limit e.g. 15000"
                    value={budgetForm.spendingLimit}
                    onChange={(e) => setBudgetForm({ ...budgetForm, spendingLimit: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 focus:bg-white transition"
                    id="budget-limit-input"
                    required
                    min="1"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-150 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowBudgetModal(false)}
                    className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold transition"
                    id="cancel-budget-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow"
                    id="save-budget-btn"
                  >
                    {editingBudget ? 'Update Limit' : 'Create Budget'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CREATE INVOICE */}
      <AnimatePresence>
        {showInvoiceModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-150"
              id="invoice-modal-container"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">Create Customer Invoice</h3>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  id="close-invoice-modal-btn"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleInvoiceSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Customer Name</label>
                  <input
                    type="text"
                    placeholder="Enter customer or corporate entity name"
                    value={invoiceForm.customerName}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 focus:bg-white transition"
                    id="invoice-customer-name-input"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Billing Amount (KSh)</label>
                  <input
                    type="number"
                    placeholder="Enter gross amount e.g. 15000"
                    value={invoiceForm.billingAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, billingAmount: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 focus:bg-white transition"
                    id="invoice-amount-input"
                    required
                    min="1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Line Item Description</label>
                  <textarea
                    placeholder="Describe products or services provided..."
                    value={invoiceForm.lineItemDescription}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, lineItemDescription: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 focus:bg-white transition h-24 resize-none"
                    id="invoice-description-input"
                    required
                  ></textarea>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Due Date Offset</label>
                  <select
                    value={invoiceForm.dueDateOffset}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDateOffset: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50"
                    id="invoice-due-offset-select"
                    required
                  >
                    <option value="1">1 Day (Immediate)</option>
                    <option value="7">7 Days (Net 7)</option>
                    <option value="15">15 Days (Net 15)</option>
                    <option value="30">30 Days (Net 30)</option>
                    <option value="60">60 Days (Net 60)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-150 mt-6 font-sans">
                  <button
                    type="button"
                    onClick={() => setShowInvoiceModal(false)}
                    className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold transition"
                    id="cancel-invoice-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow"
                    id="save-invoice-btn"
                  >
                    Create Invoice
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: RECONCILE TRANSACTION */}
      <AnimatePresence>
        {showReconcileModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-150"
              id="reconcile-modal-container"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Reconcile Bank Transaction</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{showReconcileModal.reference}</p>
                </div>
                <button
                  onClick={() => setShowReconcileModal(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  id="close-reconcile-modal-btn"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleReconcileSubmit} className="p-6 space-y-4">
                {/* Transaction summary block */}
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Description:</span>
                    <span className="text-slate-800 font-bold max-w-[200px] text-right truncate">{showReconcileModal.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span className="text-slate-800 font-bold">{showReconcileModal.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Source:</span>
                    <span className="text-indigo-600 font-bold">{showReconcileModal.source}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-2 text-sm">
                    <span className="text-slate-500 font-sans font-semibold">Amount:</span>
                    <span className={`font-bold ${showReconcileModal.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      KSh {Math.abs(showReconcileModal.amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Reconcile / Allocate Category</label>
                  <select
                    value={reconciliationForm.category}
                    onChange={(e) => setReconciliationForm({ ...reconciliationForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50"
                    id="reconciliation-category-select"
                    required
                  >
                    {showReconcileModal.amount > 0 ? (
                      <>
                        <option value="Revenue">Revenue (Invoice Settlement)</option>
                        <option value="Investment">Capital / Investment</option>
                        <option value="Custom">Other Revenue (Custom)</option>
                      </>
                    ) : (
                      <>
                        <option value="Utilities">Utilities</option>
                        <option value="Rent">Rent</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Payroll">Payroll</option>
                        <option value="Supplies">Supplies</option>
                        <option value="Custom">Other Expense (Custom)</option>
                      </>
                    )}
                  </select>
                </div>

                {reconciliationForm.category === 'Custom' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Custom Category Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Consulting, Legal Fees, Refreshments"
                      value={reconciliationForm.customCategory}
                      onChange={(e) => setReconciliationForm({ ...reconciliationForm, customCategory: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 focus:bg-white transition"
                      id="custom-reconciliation-category-input"
                      required
                    />
                  </div>
                )}

                <p className="text-[11px] text-slate-400 font-sans leading-relaxed pt-2">
                  * Reconciling will record this item permanently on the general ledger and automatically affect corresponding budget limits or company statistics.
                </p>

                <div className="flex gap-3 pt-4 border-t border-slate-150 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowReconcileModal(null)}
                    className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold transition"
                    id="cancel-reconciliation-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow"
                    id="confirm-reconciliation-btn"
                  >
                    Confirm & Reconcile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
