import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatKSh } from '../lib/utils';
import { DollarSign, Search, Plus, Trash2, Calendar, FileText, X, Edit, AlertCircle } from 'lucide-react';

export const ExpensesModule: React.FC = () => {
  const { 
    expenses, 
    addExpense,
    updateExpense,
    deleteExpense
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any | null>(null);

  // Form Fields for Add
  const [formCategory, setFormCategory] = useState('Utilities');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Form Fields for Edit
  const [editCategory, setEditCategory] = useState('Utilities');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [editDate, setEditDate] = useState('');

  // Handlers
  const handleOpenEditExpense = (exp: any) => {
    setEditingExpense(exp);
    setEditCategory(exp.category);
    setEditDescription(exp.description);
    setEditAmount(exp.amount);
    setEditDate(exp.date);
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editAmount <= 0 || !editDescription || !editingExpense) return;

    updateExpense(editingExpense.id, {
      category: editCategory,
      description: editDescription,
      amount: Number(editAmount),
      date: editDate
    });

    setShowEditModal(false);
    setEditingExpense(null);
  };

  const handleDeleteExpense = (exp: any) => {
    setExpenseToDelete(exp);
    setShowDeleteModal(true);
  };

  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    deleteExpense(expenseToDelete.id);
    setShowDeleteModal(false);
    setExpenseToDelete(null);
  };

  const categories = ['All', 'Rent', 'Utilities', 'Payroll', 'Supplies', 'Marketing', 'Other'];

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formAmount <= 0 || !formDescription) return;

    addExpense({
      category: formCategory,
      description: formDescription,
      amount: Number(formAmount),
      date: formDate
    });

    setShowAddModal(false);
    setFormDescription('');
    setFormAmount(0);
  };

  return (
    <div className="space-y-4">
      
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-brand-border col-span-1 md:col-span-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 font-mono tracking-wider">TOTAL ACCUMULATED EXPENSES</span>
            <h3 className="text-2xl font-bold font-mono text-cyan-400 mt-1">{formatKSh(totalExpensesAmount)}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Filtered by selected category / filters</p>
          </div>
          <div className="w-10 h-10 bg-cyan-950/40 border border-cyan-500/20 rounded-xl flex items-center justify-center glow-cyan">
            <DollarSign className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-brand-border flex items-center justify-center">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-3.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 rounded-xl font-mono font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Expense</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-brand-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search expenses description, categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-950/60 border border-brand-border rounded-lg text-xs text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                selectedCategory === cat 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 font-bold' 
                  : 'bg-gray-950/30 text-gray-400 hover:text-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-brand-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/80 border-b border-brand-border text-gray-400 font-mono text-[10px] tracking-wider uppercase">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description / Reference</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4">Logged By</th>
                <th className="p-4">Role Badge</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-gray-200 font-sans">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No expense items logged.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-900/30 transition">
                    <td className="p-4 font-mono font-medium text-gray-400">{exp.date}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 bg-gray-900 border border-gray-800 text-[10px] text-gray-400 rounded-md font-mono">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-gray-200">{exp.description}</td>
                    <td className="p-4 text-right font-mono font-bold text-rose-400">
                      {formatKSh(exp.amount)}
                    </td>
                    <td className="p-4 text-gray-400 capitalize">{exp.recordedBy}</td>
                    <td className="p-4">
                      <span className="px-1.5 py-0.5 rounded bg-gray-950/60 border border-gray-800 text-[10px] text-gray-400 font-mono">
                        {exp.role.split(' ')[0]}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditExpense(exp)}
                          className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 rounded-lg transition cursor-pointer"
                          title="Edit Expense"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp)}
                          className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-rose-400 hover:border-rose-500/20 rounded-lg transition cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              <span>Record New Expense Transaction</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1 font-sans">Expense Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30"
                >
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Payment Amount (KSh)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formAmount}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-bold font-mono"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Logged Date</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Expense Reference Note</label>
                <textarea
                  required
                  placeholder="e.g. Paid landlord for main facility space"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 h-20 font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition"
              >
                Log Expense & Update Accounts
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && editingExpense && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
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
              <DollarSign className="w-5 h-5 text-cyan-400" />
              <span>Edit Expense Transaction</span>
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1 font-sans">Expense Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30"
                >
                  <option value="Rent">Rent</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Payment Amount (KSh)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-bold font-mono"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Logged Date</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Expense Reference Note</label>
                <textarea
                  required
                  placeholder="e.g. Paid landlord for main facility space"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 h-20 font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition cursor-pointer"
              >
                Update Expense & Refresh General Ledger
              </button>
            </form>
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
