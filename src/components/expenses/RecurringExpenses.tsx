import React, { useState, useEffect } from 'react';
import { RefreshCw, Play, Pause, Plus, Calendar, Trash2, ArrowRightLeft, AlertCircle, Sparkles } from 'lucide-react';
import { formatKSh } from '../../lib/utils';
import { Expense } from '../../types';

export interface RecurringProfile {
  id: string;
  category: string;
  vendorName: string;
  amount: number;
  description: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  status: 'Active' | 'Paused';
  department?: string;
  lastPostedDate?: string;
  nextDueDate: string;
}

const DEFAULT_RECURRING: RecurringProfile[] = [
  {
    id: 'rec_1',
    category: 'Rent',
    vendorName: 'Nairobi Office Plaza Ltd',
    amount: 120000,
    description: 'Central HQ Rent Reservation',
    frequency: 'Monthly',
    status: 'Active',
    department: 'Operations',
    lastPostedDate: new Date().toISOString().split('T')[0],
    nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  {
    id: 'rec_2',
    category: 'Software',
    vendorName: 'Safaricom Cloud',
    amount: 15000,
    description: 'Enterprise ERP Server Hosting',
    frequency: 'Monthly',
    status: 'Active',
    department: 'IT & Software',
    lastPostedDate: new Date().toISOString().split('T')[0],
    nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }
];

interface RecurringExpensesProps {
  businessId: string;
  addExpense: (expense: Omit<Expense, 'id' | 'businessId' | 'recordedBy' | 'role'>) => void;
  onAlertTriggered?: (alerts: string[]) => void;
}

export const RecurringExpenses: React.FC<RecurringExpensesProps> = ({
  businessId,
  addExpense,
  onAlertTriggered
}) => {
  const [profiles, setProfiles] = useState<RecurringProfile[]>([]);
  
  // Form fields
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  const [department, setDepartment] = useState('Operations');
  const [showAddForm, setShowAddForm] = useState(false);

  const localKey = `apex_ledger_recurring_${businessId}`;

  useEffect(() => {
    const data = localStorage.getItem(localKey);
    if (data) {
      try {
        setProfiles(JSON.parse(data));
      } catch (e) {
        setProfiles(DEFAULT_RECURRING);
      }
    } else {
      localStorage.setItem(localKey, JSON.stringify(DEFAULT_RECURRING));
      setProfiles(DEFAULT_RECURRING);
    }
  }, [businessId]);

  const saveProfiles = (updated: RecurringProfile[]) => {
    localStorage.setItem(localKey, JSON.stringify(updated));
    setProfiles(updated);
  };

  const calculateNextDueDate = (freq: string, fromDateStr: string): string => {
    const fromDate = new Date(fromDateStr);
    if (isNaN(fromDate.getTime())) return new Date().toISOString().split('T')[0];

    switch (freq) {
      case 'Daily':
        fromDate.setDate(fromDate.getDate() + 1);
        break;
      case 'Weekly':
        fromDate.setDate(fromDate.getDate() + 7);
        break;
      case 'Monthly':
        fromDate.setMonth(fromDate.getMonth() + 1);
        break;
      case 'Quarterly':
        fromDate.setMonth(fromDate.getMonth() + 3);
        break;
      case 'Yearly':
        fromDate.setFullYear(fromDate.getFullYear() + 1);
        break;
    }
    return fromDate.toISOString().split('T')[0];
  };

  // Auto-post scheduled expenses that are due!
  const handleAutoPost = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    let postedCount = 0;
    
    const updated = profiles.map(p => {
      if (p.status === 'Active' && p.nextDueDate <= todayStr) {
        // Automatically trigger expense creation!
        addExpense({
          category: p.category,
          description: `Auto-Posted Recurring: ${p.description}`,
          amount: p.amount,
          date: todayStr,
          vendorName: p.vendorName,
          department: p.department,
          paymentMethod: 'Mobile Money',
          status: 'Approved', // Auto posted templates are pre-approved
          approvalRequired: false,
          notes: 'Generated automatically by recurring scheduler system.'
        });
        
        postedCount++;
        const nextDue = calculateNextDueDate(p.frequency, p.nextDueDate);
        return {
          ...p,
          lastPostedDate: todayStr,
          nextDueDate: nextDue
        };
      }
      return p;
    });

    if (postedCount > 0) {
      saveProfiles(updated);
      alert(`Recurring Engine: Auto-posted ${postedCount} due expenses successfully.`);
      if (onAlertTriggered) {
        onAlertTriggered([`Auto-Posted Scheduled Expenses: ${postedCount} profiles processed and posted to ledger.`]);
      }
    } else {
      alert('Recurring Engine: All scheduled expenses are up to date.');
    }
  };

  const handleToggleStatus = (id: string) => {
    const updated = profiles.map(p => {
      if (p.id === id) {
        const newStatus = p.status === 'Active' ? 'Paused' : 'Active';
        return { ...p, status: newStatus as 'Active' | 'Paused' };
      }
      return p;
    });
    saveProfiles(updated);
  };

  const handleDeleteProfile = (id: string) => {
    const updated = profiles.filter(p => p.id !== id);
    saveProfiles(updated);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !vendorName.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const nextDue = calculateNextDueDate(frequency, todayStr);

    const newProf: RecurringProfile = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      category,
      vendorName: vendorName.trim(),
      amount: Number(amount),
      description: description.trim() || `${frequency} standard payment to ${vendorName}`,
      frequency,
      status: 'Active',
      department,
      nextDueDate: nextDue
    };

    saveProfiles([...profiles, newProf]);
    setVendorName('');
    setAmount(0);
    setDescription('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-brand-border/60 pb-3">
        <div>
          <h4 className="text-xs font-bold text-gray-200 font-sans flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>RECURRING EXPENSE SCHEDULER</span>
          </h4>
          <p className="text-[10px] text-gray-500 font-sans">Automate lease payments, utility drafts, payroll disbursements, and recurring accounts.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAutoPost}
            className="px-3.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 font-sans font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto-Post Due</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-200 font-sans font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Profile</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="glass-panel p-4 rounded-xl border border-brand-border/60 space-y-3 max-w-lg">
          <h5 className="font-bold text-gray-200 font-sans text-xs">Create New Recurring Profile</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 block mb-1">Vendor Name</label>
              <input
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Amount (KSh)</label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none font-bold text-rose-400"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none"
              >
                <option value="Rent">Rent</option>
                <option value="Utilities">Utilities</option>
                <option value="Payroll">Payroll</option>
                <option value="Supplies">Supplies</option>
                <option value="Marketing">Marketing</option>
                <option value="Software">Software</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Recurrence Interval</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
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
              <label className="text-gray-400 block mb-1">Memo / Description</label>
              <input
                type="text"
                placeholder="Software licensing fee"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-400 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold"
            >
              Add Active Profile
            </button>
          </div>
        </form>
      )}

      {/* Profiles list */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-brand-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/80 border-b border-brand-border text-gray-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="p-3">Vendor / Profile</th>
                <th className="p-3">Category</th>
                <th className="p-3">Frequency</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Next Due Date</th>
                <th className="p-3">Last Posted</th>
                <th className="p-3 text-center">Recurrence State</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-gray-200 font-sans">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500">
                    No recurring profiles created.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isOverdue = p.status === 'Active' && p.nextDueDate <= todayStr;

                  return (
                    <tr key={p.id} className="hover:bg-gray-900/10 transition">
                      <td className="p-3 font-mono font-bold text-gray-300">
                        <div className="font-sans font-bold text-gray-200">{p.vendorName}</div>
                        <div className="text-[10px] text-gray-500 font-sans font-normal">{p.description}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-[10px] text-gray-400 rounded-md font-mono">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-gray-400">{p.frequency}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-400">
                        {formatKSh(p.amount)}
                      </td>
                      <td className="p-3 font-mono">
                        <span className={isOverdue ? 'text-amber-500 font-bold animate-pulse' : 'text-gray-400'}>
                          {p.nextDueDate}
                        </span>
                        {isOverdue && (
                          <span className="ml-1.5 text-[8px] border border-amber-500/30 bg-amber-950/40 text-amber-500 px-1 rounded font-sans">
                            DUE
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-gray-500">{p.lastPostedDate || 'Never'}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p.id)}
                          className={`px-2.5 py-0.8 rounded-full border text-[10px] font-bold font-sans cursor-pointer transition ${
                            p.status === 'Active'
                              ? 'bg-green-950/40 border-green-500/20 text-green-400 hover:bg-green-900/30'
                              : 'bg-gray-900/50 border-brand-border text-gray-500 hover:bg-gray-800'
                          }`}
                        >
                          {p.status === 'Active' ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(p.id)}
                          className="p-1.5 bg-gray-950 hover:bg-gray-900 border border-brand-border text-gray-500 hover:text-rose-400 hover:border-rose-500/20 rounded-lg transition"
                          title="Delete Recurring Profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
  );
};
