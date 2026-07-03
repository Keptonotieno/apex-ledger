import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DebtRecord } from '../types';
import { formatKSh } from '../lib/utils';
import { 
  CreditCard, Search, PlusCircle, ArrowUpRight, CheckCircle, 
  AlertTriangle, DollarSign, X, Check, Eye, Edit, Trash2
} from 'lucide-react';

export const DebtModule: React.FC = () => {
  const { 
    debts, 
    addDebtPayment,
    updateDebt,
    deleteDebt
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Unpaid' | 'Partially Paid' | 'Paid'>('All');
  
  // Interactive payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  
  // Payment Form Fields
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('Mobile Money');

  // Edit and Delete states for debt records
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<DebtRecord | null>(null);

  // Edit fields
  const [editOutstandingAmount, setEditOutstandingAmount] = useState(0);
  const [editPaidAmount, setEditPaidAmount] = useState(0);
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<'Unpaid' | 'Partially Paid' | 'Paid'>('Unpaid');

  const handleOpenEditDebt = (d: DebtRecord) => {
    setEditingDebt(d);
    setEditOutstandingAmount(d.outstandingAmount);
    setEditPaidAmount(d.paidAmount);
    setEditDueDate(d.dueDate);
    setEditStatus(d.status);
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;

    const remaining = editOutstandingAmount - editPaidAmount;
    updateDebt(editingDebt.id, {
      outstandingAmount: Number(editOutstandingAmount),
      paidAmount: Number(editPaidAmount),
      remainingBalance: remaining,
      dueDate: editDueDate,
      status: editStatus
    });

    setShowEditModal(false);
    setEditingDebt(null);
  };

  const handleDeleteDebt = (d: DebtRecord) => {
    setDebtToDelete(d);
    setShowDeleteModal(true);
  };

  const confirmDeleteDebt = () => {
    if (!debtToDelete) return;
    deleteDebt(debtToDelete.id);
    setShowDeleteModal(false);
    setDebtToDelete(null);
  };

  const filteredDebts = debts.filter(d => {
    const matchesSearch = d.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenPay = (d: DebtRecord) => {
    setSelectedDebt(d);
    setPayAmount(d.remainingBalance);
    setPayMethod('Mobile Money');
    setShowPayModal(true);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || payAmount <= 0) return;

    if (payAmount > selectedDebt.remainingBalance) {
      alert('Payment amount cannot exceed remaining balance.');
      return;
    }

    addDebtPayment(selectedDebt.id, payAmount, payMethod);
    setShowPayModal(false);
  };

  return (
    <div className="space-y-4">
      
      {/* Search & Filter Header */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row gap-3 border border-brand-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search debt balances by client name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-950/60 border border-brand-border rounded-lg text-xs text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e: any) => setStatusFilter(e.target.value)}
          className="bg-gray-950/60 border border-brand-border rounded-lg text-xs px-3 py-1.5 text-gray-300 outline-none focus:border-cyan-500/30 font-mono"
        >
          <option value="All">All Statuses</option>
          <option value="Unpaid">Unpaid Claims</option>
          <option value="Partially Paid">Partially Paid</option>
          <option value="Paid">Cleared Debts</option>
        </select>
      </div>

      {/* Debts Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-brand-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/80 border-b border-brand-border text-gray-400 font-mono text-[10px] tracking-wider uppercase">
              <tr>
                <th className="p-4">Customer Account</th>
                <th className="p-4">Type</th>
                <th className="p-4 text-right">Claims Amount</th>
                <th className="p-4 text-right">Paid Amount</th>
                <th className="p-4 text-right">Remaining Balance</th>
                <th className="p-4">Due Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-gray-200 font-sans">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    No active debt records matching criteria.
                  </td>
                </tr>
              ) : (
                filteredDebts.map((d) => {
                  const isOverdue = new Date(d.dueDate).getTime() < Date.now() && d.status !== 'Paid';

                  return (
                    <tr key={d.id} className="hover:bg-gray-900/30 transition">
                      <td className="p-4">
                        <span className="font-semibold text-gray-100">{d.customerName}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-cyan-950/40 text-cyan-400 border border-cyan-500/10 text-[10px] rounded font-mono">
                          {d.type}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-gray-400">
                        {formatKSh(d.outstandingAmount)}
                      </td>
                      <td className="p-4 text-right font-mono text-emerald-400">
                        {formatKSh(d.paidAmount)}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-cyan-400">
                        {formatKSh(d.remainingBalance)}
                      </td>
                      <td className="p-4 font-mono">
                        <span className={isOverdue ? 'text-rose-400 font-semibold' : 'text-gray-400'}>
                          {d.dueDate} {isOverdue && '(OVERDUE)'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          d.status === 'Paid' 
                            ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10' 
                            : d.status === 'Partially Paid' 
                              ? 'bg-amber-950/20 text-amber-400 border border-amber-500/10' 
                              : 'bg-rose-950/20 text-rose-400 border border-rose-500/10'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {d.status !== 'Paid' ? (
                            <button
                              onClick={() => handleOpenPay(d)}
                              className="px-2 py-1 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-500/30 rounded text-[10px] font-mono transition cursor-pointer"
                              title="Add Repayment"
                            >
                              Pay
                            </button>
                          ) : (
                            <span className="text-emerald-400 font-mono text-[10px] font-semibold flex items-center justify-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Cleared</span>
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenEditDebt(d)}
                            className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 rounded-lg transition cursor-pointer"
                            title="Edit Debt Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDebt(d)}
                            className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-rose-400 hover:border-rose-500/20 rounded-lg transition cursor-pointer"
                            title="Delete Debt Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Interactive Payment Settlement Modal */}
      {showPayModal && selectedDebt && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowPayModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              <span>Settle Customer Claims Balance</span>
            </h3>

            <div className="bg-gray-950/60 p-3 rounded-xl border border-brand-border mb-4 font-mono text-xs text-gray-300 space-y-1">
              <div><span className="text-gray-500">Claimant:</span> {selectedDebt.customerName}</div>
              <div><span className="text-gray-500">Claims Class:</span> {selectedDebt.type}</div>
              <div><span className="text-gray-500">Remaining Balance:</span> {formatKSh(selectedDebt.remainingBalance)}</div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1">Enter Repayment Amount (KSh)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedDebt.remainingBalance}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 text-sm font-bold font-mono"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Repayment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30"
                >
                  <option value="Mobile Money">M-Pesa / Mobile Money</option>
                  <option value="Cash">Cash Drawer</option>
                  <option value="Card">Visa / Mastercard</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition"
              >
                Log Repayment & Update Ledger
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Debt Modal */}
      {showEditModal && editingDebt && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowEditModal(false);
                setEditingDebt(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              <span>Modify Debt Claim Record</span>
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1 font-sans">Customer Account</label>
                <input
                  type="text"
                  disabled
                  value={editingDebt.customerName}
                  className="w-full bg-gray-950/20 border border-brand-border/40 rounded-lg p-2.5 text-gray-500 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1 font-sans">Total Claim (KSh)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editOutstandingAmount}
                    onChange={(e) => setEditOutstandingAmount(Number(e.target.value))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-sans">Paid Balance (KSh)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editPaidAmount}
                    onChange={(e) => setEditPaidAmount(Number(e.target.value))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1 font-sans">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-sans">Debt Status</label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid (Cleared)</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-950/40 p-2.5 rounded-lg border border-brand-border text-center text-[11px] text-gray-400 font-sans">
                REMAINING LEDGER CLAIM: <strong className="text-cyan-400 font-mono">{formatKSh(Math.max(0, editOutstandingAmount - editPaidAmount))}</strong>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition cursor-pointer"
              >
                Update Debt & Recalculate Ledger
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Debt Modal */}
      {showDeleteModal && debtToDelete && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-rose-500/30 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowDeleteModal(false);
                setDebtToDelete(null);
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
                  Delete Debt Claim Record?
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Are you sure you want to permanently delete this debt record from the accounts ledger? This action will write off the remaining balance and is irreversible.
                </p>
                <div className="bg-gray-950/50 p-3 rounded-xl border border-brand-border/60 text-left space-y-1.5 mt-2 font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">CLIENT CLAIMANT:</span>
                    <span className="text-gray-300 font-medium">{debtToDelete.customerName}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">ORIGINAL CLAIM:</span>
                    <span className="text-gray-400">{formatKSh(debtToDelete.outstandingAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">REMAINING UNPAID:</span>
                    <span className="text-rose-400 font-bold">{formatKSh(debtToDelete.remainingBalance)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">DUE BY DATE:</span>
                    <span className="text-gray-400">{debtToDelete.dueDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDebtToDelete(null);
                  }}
                  className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 font-medium rounded-xl text-xs transition cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteDebt}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl text-xs transition shadow-lg shadow-rose-950/30 cursor-pointer font-sans"
                >
                  Delete Claims Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
