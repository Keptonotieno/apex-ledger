import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { 
  Users, Search, Plus, Phone, Mail, MapPin, 
  FileText, Check, UserPlus, Edit, Trash2, Save, X, Lock, ShieldAlert, Archive
} from 'lucide-react';

export const ClientDirectory: React.FC = () => {
  const { 
    customers, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    activeUser,
    invoices = [],
    sales = [],
    debts = []
  } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Set default selected customer if available
  useEffect(() => {
    const list = customers.filter(c => showArchived ? c.archived : !c.archived);
    if (list.length > 0 && (!selectedCustomer || (selectedCustomer.archived !== showArchived))) {
      setSelectedCustomer(list[0]);
    } else if (list.length === 0) {
      setSelectedCustomer(null);
    } else if (selectedCustomer) {
      // Keep selected customer in sync
      const current = customers.find(c => c.id === selectedCustomer.id);
      if (current) {
        setSelectedCustomer(current);
      } else {
        setSelectedCustomer(list[0] || null);
      }
    }
  }, [customers, selectedCustomer, showArchived]);

  // Authorization check
  const isAuthorized = activeUser?.role === UserRole.ADMIN || activeUser?.role === UserRole.MANAGER;

  // New Customer Form States
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const handleTriggerAddForm = () => {
      setShowAddForm(true);
    };
    window.addEventListener('trigger-add-client-form', handleTriggerAddForm);
    return () => {
      window.removeEventListener('trigger-add-client-form', handleTriggerAddForm);
    };
  }, []);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Edit Customer States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Link status for selected customer
  const linkedData = useMemo(() => {
    if (!selectedCustomer) return { invoices: [], sales: [], debts: [], paymentsCount: 0, hasLinks: false };
    
    const clientNameLower = selectedCustomer.name?.toLowerCase() || '';
    const clientPhoneClean = selectedCustomer.phone?.replace(/\s+/g, '') || '';
    
    // Check invoices by customerName
    const clientInvoices = invoices.filter(inv => 
      inv.customerName?.toLowerCase() === clientNameLower || 
      (selectedCustomer.email && inv.lineItemDescription?.toLowerCase().includes(selectedCustomer.email.toLowerCase()))
    );
    
    // Check sales by customerId or customerName
    const clientSales = sales.filter(sale => 
      sale.customerId === selectedCustomer.id || 
      sale.customerName?.toLowerCase() === clientNameLower
    );
    
    // Check debt records by customerId or customerName
    const clientDebts = debts.filter(debt => 
      debt.customerId === selectedCustomer.id || 
      debt.customerName?.toLowerCase() === clientNameLower
    );
    
    // Check payments inside debts repayment histories
    const paymentsCount = clientDebts.reduce((acc, d) => acc + (d.paymentHistory?.length || 0), 0);
    
    return {
      invoices: clientInvoices,
      sales: clientSales,
      debts: clientDebts,
      paymentsCount,
      hasLinks: clientInvoices.length > 0 || clientSales.length > 0 || clientDebts.length > 0 || paymentsCount > 0
    };
  }, [selectedCustomer, invoices, sales, debts]);

  const startEditing = () => {
    if (!selectedCustomer) return;
    setEditName(selectedCustomer.name);
    setEditPhone(selectedCustomer.phone);
    setEditEmail(selectedCustomer.email === 'N/A' ? '' : selectedCustomer.email);
    setEditAddress(selectedCustomer.address === 'N/A' ? '' : selectedCustomer.address);
    setEditNotes(selectedCustomer.notes || '');
    setIsEditing(true);
    setShowDeleteConfirm(false);
  };

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !editName.trim() || !editPhone.trim()) {
      alert('Please fill out both the Client Name and Phone Number.');
      return;
    }

    updateCustomer(selectedCustomer.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim() || 'N/A',
      address: editAddress.trim() || 'N/A',
      notes: editNotes.trim()
    });

    setIsEditing(false);
  };

  const handleDeleteCustomer = () => {
    if (!selectedCustomer) return;
    deleteCustomer(selectedCustomer.id);
    setSelectedCustomer(null);
    setShowDeleteConfirm(false);
    setIsEditing(false);
  };

  const handleArchiveCustomer = () => {
    if (!selectedCustomer) return;
    updateCustomer(selectedCustomer.id, { archived: true });
    setSelectedCustomer(null);
    setShowDeleteConfirm(false);
    setIsEditing(false);
  };

  const handleUnarchiveCustomer = () => {
    if (!selectedCustomer) return;
    updateCustomer(selectedCustomer.id, { archived: false });
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      alert('Please enter both the Client Name and Contact Phone Number.');
      return;
    }

    addCustomer({
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || 'N/A',
      address: newAddress.trim() || 'N/A',
      notes: newNotes.trim()
    });

    // Reset
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewAddress('');
    setNewNotes('');
    setShowAddForm(false);
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = String(c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(c.phone || '').includes(searchQuery) ||
      String(c.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (showArchived) {
      return matchesSearch && c.archived === true;
    } else {
      return matchesSearch && !c.archived;
    }
  });

  return (
    <div className="space-y-6">
      
      {/* Top action header bar */}
      <div className="glass-panel p-6 rounded-2xl border-t-2 border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 animate-fade-in">
            <Users className="w-5 h-5 text-cyan-400" />
            Client Directory & CRM Dashboard
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Maintain customer relations, track total spent, monitor pending receivables debt and notes.
          </p>
        </div>

        {isAuthorized ? (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-500 text-gray-950 text-xs font-bold rounded-xl shadow-lg transition duration-200"
          >
            <UserPlus className="w-4 h-4" />
            Add Client
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-950/80 border border-amber-500/30 text-amber-400 text-[11px] rounded-lg">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Read-only Employee Access</span>
          </div>
        )}
      </div>

      {/* Grid: Search & Lists Left, Detail Card Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left section: onboard form or search lists */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Create Client Form Panel */}
          {showAddForm && isAuthorized && (
            <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-gray-900/90 space-y-4 transition">
              <div className="flex justify-between items-center border-b border-brand-border pb-2">
                <h3 className="text-xs font-bold text-cyan-400 font-mono">ONBOARDING CLIENT FILE</h3>
                <button 
                  onClick={() => setShowAddForm(false)} 
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-gray-400 font-medium">Full Corporate or Personal Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Safaricom Plaza Office"
                    className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-medium">Contact Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+254712345678"
                    className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-medium">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="procurement@safaricom.co.ke"
                    className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-medium">Physical Location / Address (Optional)</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Waiyaki Way, Nairobi"
                    className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-gray-400 font-medium">Internal Notes & Credit Terms (Optional)</label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Net 30 invoice credit limit. Premium enterprise partner."
                    rows={2}
                    className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="sm:col-span-2 py-2.5 bg-cyan-400 hover:bg-cyan-500 text-gray-950 font-bold rounded-xl shadow-md transition"
                >
                  Confirm Registration File
                </button>
              </form>
            </div>
          )}

          {/* List panel */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col h-[520px]">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-gray-950/50 border border-brand-border rounded-xl px-3 py-2 text-xs focus-within:border-cyan-500/50 transition mb-3">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search clients by name, contact or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-gray-200 outline-none w-full"
              />
            </div>

            {/* Active / Archived Toggle Tabs */}
            <div className="flex gap-2 mb-4 text-[11px]">
              <button
                onClick={() => {
                  setShowArchived(false);
                  setSelectedCustomer(null);
                }}
                className={`flex-1 py-2 rounded-lg border font-mono font-bold transition ${
                  !showArchived 
                    ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30' 
                    : 'bg-gray-950/30 text-gray-400 border-brand-border/60 hover:text-gray-300'
                }`}
              >
                Active Clients ({customers.filter(c => !c.archived).length})
              </button>
              <button
                onClick={() => {
                  setShowArchived(true);
                  setSelectedCustomer(null);
                }}
                className={`flex-1 py-2 rounded-lg border font-mono font-bold transition ${
                  showArchived 
                    ? 'bg-amber-950/40 text-amber-400 border-amber-500/30' 
                    : 'bg-gray-950/30 text-gray-400 border-brand-border/60 hover:text-gray-300'
                }`}
              >
                Archived Clients ({customers.filter(c => c.archived).length})
              </button>
            </div>

            {/* Rendered lists */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {customers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-gray-800 rounded-xl">
                  <Users className="w-10 h-10 text-gray-700 mb-2" />
                  <p className="text-xs font-semibold text-gray-400">No records in client directory</p>
                  <p className="text-[10px] text-gray-500 max-w-[280px] mt-1">
                    {isAuthorized 
                      ? "Create your first corporate or personal client record using the 'Onboard New Client' builder above." 
                      : "The client registry is currently empty. Only corporate owners or managers can register new clients."}
                  </p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-6">
                  <Search className="w-8 h-8 text-gray-700 mb-1" />
                  <p className="text-xs font-medium">No matches found</p>
                  <p className="text-[10px] mt-0.5">Try refining your filter keyword terms.</p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setIsEditing(false);
                      setShowDeleteConfirm(false);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition ${
                      selectedCustomer?.id === customer.id 
                        ? 'bg-cyan-950/20 border-cyan-500/40 shadow-sm' 
                        : 'bg-gray-950/35 border-brand-border hover:border-brand-border/80'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <h4 className="text-xs font-bold text-gray-200 capitalize truncate">{customer.name}</h4>
                      <p className="text-[10px] text-gray-500 font-mono truncate mt-0.5">{customer.phone}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[9px] text-gray-500 font-mono">TOTAL SPENT</p>
                      <p className="text-xs font-bold text-cyan-400 font-mono">
                        KSh {(customer.totalSpent || 0).toLocaleString()}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Section: CRM Client Detail card dossier */}
        <div className="lg:col-span-5">
          {selectedCustomer ? (
            <div className="glass-panel p-6 rounded-2xl h-[585px] flex flex-col justify-between">
              
              {isEditing ? (
                /* Edit State Form */
                <form onSubmit={handleUpdateCustomer} className="flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-brand-border pb-3.5 flex justify-between items-center">
                      <div>
                        <h3 className="text-[10px] font-mono text-cyan-400">MODIFY CLIENT REPOSITORY</h3>
                        <h2 className="text-sm font-bold text-gray-100 uppercase mt-0.5 truncate max-w-[200px]">Editing: {selectedCustomer.name}</h2>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setIsEditing(false)}
                        className="p-1 text-gray-500 hover:text-gray-300 rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div className="space-y-1">
                        <label className="text-gray-400">Corporate or Personal Name *</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-gray-400">Phone Contact *</label>
                        <input
                          type="text"
                          required
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-gray-400">Email Address (Optional)</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-gray-400">Physical Location (Optional)</label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-gray-400">Internal Notes & Credit Terms (Optional)</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={3}
                          className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-brand-border flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-cyan-400 hover:bg-cyan-500 text-gray-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-brand-border font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : showDeleteConfirm ? (
                /* Delete Confirmation Panel with Referential Integrity Check */
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-brand-border pb-3 flex justify-between items-center">
                      <h3 className="text-xs font-mono text-rose-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        DELETE PROTECTION STATUS
                      </h3>
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="text-gray-500 hover:text-gray-300 text-xs font-mono cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {linkedData.hasLinks ? (
                      /* Block Deletion - Provide Archive Option */
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2 text-xs">
                          <p className="font-bold text-rose-400">Permanent Deletion Prevented</p>
                          <p className="text-[11px] text-gray-400 leading-relaxed">
                            To preserve referential integrity, this client cannot be permanently deleted because they have associated records linked to them.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">Linked Workspace Ledger Entries:</p>
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                            <div className="p-2 bg-gray-950/40 rounded-lg border border-brand-border/60 flex flex-col">
                              <span className="text-gray-500">Invoices</span>
                              <span className="text-sm font-bold text-gray-300 mt-0.5">{linkedData.invoices.length}</span>
                            </div>
                            <div className="p-2 bg-gray-950/40 rounded-lg border border-brand-border/60 flex flex-col">
                              <span className="text-gray-500">Sales/Orders</span>
                              <span className="text-sm font-bold text-gray-300 mt-0.5">{linkedData.sales.length}</span>
                            </div>
                            <div className="p-2 bg-gray-950/40 rounded-lg border border-brand-border/60 flex flex-col">
                              <span className="text-gray-500">Debt Records</span>
                              <span className="text-sm font-bold text-gray-300 mt-0.5">{linkedData.debts.length}</span>
                            </div>
                            <div className="p-2 bg-gray-950/40 rounded-lg border border-brand-border/60 flex flex-col">
                              <span className="text-gray-500">Payment History</span>
                              <span className="text-sm font-bold text-gray-300 mt-0.5">{linkedData.paymentsCount}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-gray-500 leading-relaxed">
                          You can <strong className="text-gray-300">Archive</strong> this client file to hide them from your active client listing while preserving historical financial reports, or resolve the linked transactions in other modules first.
                        </p>
                      </div>
                    ) : (
                      /* Clean Deletion Permitted */
                      <div className="text-center py-6 space-y-3.5 animate-in fade-in duration-200">
                        <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                          <ShieldAlert className="w-6 h-6 text-rose-400" />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-sm font-bold text-gray-100">Confirm Deletion</h3>
                          <p className="text-xs text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                            Are you sure you want to permanently remove <strong className="text-gray-200 capitalize">"{selectedCustomer.name}"</strong>? This will clear their record from local workspace storage and cloud database sync. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-brand-border/60 flex flex-col gap-2">
                    {linkedData.hasLinks ? (
                      <button
                        onClick={handleArchiveCustomer}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Safe Archive Client Record
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        <button
                          onClick={handleDeleteCustomer}
                          className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Confirm Permanent Deletion
                        </button>
                        <button
                          onClick={handleArchiveCustomer}
                          className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-mono transition cursor-pointer"
                        >
                          Archive Instead
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-brand-border font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Cancel & Keep Client File
                    </button>
                  </div>
                </div>
              ) : (
                /* View State Detail Dossier */
                <div className="flex-1 flex flex-col justify-between">
                  {/* Dossier top */}
                  <div className="space-y-5">
                    <div className="border-b border-brand-border pb-3.5 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-mono text-cyan-400">CLIENT METRICS DOSSIER</h3>
                        <h2 className="text-lg font-bold text-gray-100 capitalize mt-1 truncate max-w-[190px]">{selectedCustomer.name}</h2>
                      </div>
                      <span className={`text-[10px] border px-2 py-0.5 rounded-md font-mono uppercase ${
                        selectedCustomer.archived 
                          ? 'bg-amber-950/40 text-amber-400 border-amber-500/20' 
                          : 'bg-cyan-950/40 text-cyan-400 border-cyan-500/20'
                      }`}>
                        {selectedCustomer.archived ? 'ARCHIVED' : 'ACTIVE'}
                      </span>
                    </div>

                    {/* Contact grid */}
                    <div className="space-y-2.5 text-xs text-gray-300">
                      <div className="flex items-center gap-2.5 bg-gray-950/40 p-2.5 rounded-xl border border-brand-border/60">
                        <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="font-mono">{selectedCustomer.phone}</span>
                      </div>

                      <div className="flex items-center gap-2.5 bg-gray-950/40 p-2.5 rounded-xl border border-brand-border/60">
                        <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                        {selectedCustomer.email && selectedCustomer.email !== 'N/A' ? (
                          <span className="truncate">{selectedCustomer.email}</span>
                        ) : (
                          <span className="text-gray-500 italic">No email address recorded</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 bg-gray-950/40 p-2.5 rounded-xl border border-brand-border/60">
                        <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                        {selectedCustomer.address && selectedCustomer.address !== 'N/A' ? (
                          <span>{selectedCustomer.address}</span>
                        ) : (
                          <span className="text-gray-500 italic">No physical location listed</span>
                        )}
                      </div>
                    </div>

                    {/* Performance stats bento */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-950/30 p-3 rounded-xl border border-brand-border text-center">
                        <p className="text-[9px] text-gray-500 font-mono">TRANSACTION COUNT</p>
                        <p className="text-lg font-bold font-mono text-gray-200 mt-1">{(selectedCustomer.purchaseHistoryCount || 0)} sales</p>
                      </div>
                      
                      <div className="bg-gray-950/30 p-3 rounded-xl border border-brand-border text-center">
                        <p className="text-[9px] text-gray-500 font-mono">OUTSTANDING DEBT</p>
                        <p className={`text-lg font-bold font-mono mt-1 ${selectedCustomer.debtAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          KSh {(selectedCustomer.debtAmount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Client notes */}
                    <div className="bg-gray-950/40 p-3.5 rounded-xl border border-brand-border space-y-1.5">
                      <p className="text-[9px] text-gray-500 font-mono flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        INTERNAL BUSINESS NOTES & CREDIT TERMS
                      </p>
                      <p className="text-xs text-gray-400 leading-normal">
                        {selectedCustomer.notes || <span className="text-gray-500 italic">No custom business notes available for this client.</span>}
                      </p>
                    </div>
                  </div>

                  {/* Dossier footer info with write controls if authorized */}
                  <div className="border-t border-brand-border/60 pt-4 flex flex-col gap-3">
                    {isAuthorized ? (
                      <div className="flex gap-2.5">
                        <button
                          onClick={startEditing}
                          className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        {selectedCustomer.archived ? (
                          <button
                            onClick={handleUnarchiveCustomer}
                            className="flex-1 py-2 bg-emerald-950/30 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Unarchive
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex-1 py-2 bg-rose-950/10 hover:bg-rose-950/30 text-rose-400 border border-rose-500/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            title="Remove or Archive file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-[10px] font-mono text-amber-500/80 bg-amber-500/5 py-1.5 px-3 rounded-lg border border-amber-500/10">
                        🔒 Management controls reserved for Owners & Managers
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-gray-500 flex justify-between">
                      <span>VERIFIED WORKSPACE ACCOUNT</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> READ/SYNC ACTIVE
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl h-[585px] flex flex-col items-center justify-center text-center border-dashed border-gray-800 bg-gray-950/10">
              <Users className="w-12 h-12 text-gray-800 animate-pulse" />
              <p className="text-xs font-semibold text-gray-400 mt-2">No corporate customer selected</p>
              <p className="text-[10px] text-gray-500 max-w-[190px] mt-1">
                Select a client from the listing registry to inspect ledger details.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
