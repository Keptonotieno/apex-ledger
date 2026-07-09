import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, Business, Branch } from '../types';
import { 
  Building2, Plus, Edit2, Archive, Trash2, Shield, MapPin, 
  Check, X, RefreshCw, Layers, AlertCircle, Sparkles, HelpCircle 
} from 'lucide-react';

export const BusinessManager: React.FC = () => {
  const {
    businesses,
    allBusinesses,
    activeBusiness,
    setActiveBusiness,
    branches,
    addBranch,
    updateBranch,
    deleteBranch,
    registerBusiness,
    updateBusiness,
    deleteBusiness,
    activeUser
  } = useApp();

  const isOwner = activeUser?.role === UserRole.ADMIN;

  // Selected business context for branch management inside BusinessManager
  const [selectedBizId, setSelectedBizId] = useState<string>(activeBusiness?.id || '');
  
  // Tab within BusinessManager
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Edit Business Form States
  const [editingBizId, setEditingBizId] = useState<string | null>(null);
  const [editBizName, setEditBizName] = useState('');
  const [editBizType, setEditBizType] = useState('Retail');
  const [editBizCurrency, setEditBizCurrency] = useState('KSh');
  const [editBizReg, setEditBizReg] = useState('');

  // New Branch Form States
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLoc, setNewBranchLoc] = useState('');
  const [newBranchStatus, setNewBranchStatus] = useState<'Active' | 'Inactive'>('Active');

  // Edit Branch Form States
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editBranchName, setEditBranchName] = useState('');
  const [editBranchLoc, setEditBranchLoc] = useState('');
  const [editBranchStatus, setEditBranchStatus] = useState<'Active' | 'Inactive'>('Active');

  // New Business Form States
  const [showAddBiz, setShowAddBiz] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizType, setNewBizType] = useState('Retail');
  const [newBizCurrency, setNewBizCurrency] = useState('KES');
  const [newBizReg, setNewBizReg] = useState('');

  if (!isOwner) {
    return (
      <div className="glass-panel p-8 text-center max-w-lg mx-auto my-12" id="unauthorized-manager-view">
        <Shield className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-slate-100 mb-2 font-sans">Access Level Restriction</h3>
        <p className="text-slate-400 text-sm mb-6">
          Only the Primary Corporate Business Owner has authorization to modify tenant structures, archive subsidiaries, or decommission branch registries.
        </p>
      </div>
    );
  }

  // Filter businesses based on activeTab
  const activeBusinessesList = allBusinesses.filter(b => !b.archived);
  const archivedBusinessesList = allBusinesses.filter(b => b.archived);
  const displayList = activeTab === 'active' ? activeBusinessesList : archivedBusinessesList;

  // Selected Business Object
  const selectedBiz = allBusinesses.find(b => b.id === selectedBizId);

  // Filter branches for the selected business inside BusinessManager
  const selectedBizBranches = branches.filter(b => b.businessId === selectedBizId);

  // Handlers for Business
  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) return;
    registerBusiness(newBizName, 'HQ Branch', newBizCurrency, newBizType, newBizReg);
    setNewBizName('');
    setNewBizType('Retail');
    setNewBizReg('');
    setShowAddBiz(false);
  };

  const startEditingBusiness = (biz: Business) => {
    setEditingBizId(biz.id);
    setEditBizName(biz.name);
    setEditBizType(biz.businessType || 'Retail');
    setEditBizCurrency(biz.currency || 'KES');
    setEditBizReg(biz.registrationNumber || '');
  };

  const handleSaveBusiness = (id: string) => {
    if (!editBizName.trim()) return;
    updateBusiness(id, {
      name: editBizName,
      businessType: editBizType,
      currency: editBizCurrency,
      registrationNumber: editBizReg
    });
    setEditingBizId(null);
  };

  const handleToggleArchiveBusiness = (biz: Business) => {
    updateBusiness(biz.id, { archived: !biz.archived });
    // If we archived the active business, select another one if available
    if (!biz.archived && biz.id === activeBusiness?.id) {
      const remaining = allBusinesses.find(b => b.id !== biz.id && !b.archived);
      if (remaining) {
        setActiveBusiness(remaining.id);
        setSelectedBizId(remaining.id);
      }
    }
  };

  const handleDeleteBusinessClick = (id: string) => {
    if (confirm("Are you sure you want to permanently delete this business? All sales, stock, and personnel registers will be lost.")) {
      deleteBusiness(id);
      if (id === selectedBizId) {
        const remaining = allBusinesses.find(b => b.id !== id);
        if (remaining) setSelectedBizId(remaining.id);
      }
    }
  };

  // Handlers for Branch
  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    
    // Temporarily set activeBusinessId so we can add branch to it
    addBranch({
      name: newBranchName,
      location: newBranchLoc,
      status: newBranchStatus
    });

    setNewBranchName('');
    setNewBranchLoc('');
    setNewBranchStatus('Active');
    setShowAddBranch(false);
  };

  const startEditingBranch = (br: Branch) => {
    setEditingBranchId(br.id);
    setEditBranchName(br.name);
    setEditBranchLoc(br.location || '');
    setEditBranchStatus(br.status);
  };

  const handleSaveBranch = (id: string) => {
    if (!editBranchName.trim()) return;
    updateBranch(id, {
      name: editBranchName,
      location: editBranchLoc,
      status: editBranchStatus
    });
    setEditingBranchId(null);
  };

  const handleDeleteBranchClick = async (id: string) => {
    const branchToRemove = branches.find(b => b.id === id);
    const bName = branchToRemove ? branchToRemove.name : 'this branch';
    if (confirm(`Are you sure you want to permanently delete branch "${bName}"? This action cannot be undone.`)) {
      try {
        await deleteBranch(id, false);
        alert(`Branch "${bName}" has been successfully deleted.`);
      } catch (err: any) {
        if (confirm(`${err.message}\n\nWould you like to perform a CASCADING DELETION to automatically and permanently delete all of these dependent records? This action cannot be undone.`)) {
          if (confirm(`DANGER: Are you absolutely sure? This will wipe out all staff profiles, inventory products, sales, and expenses associated with "${bName}".`)) {
            try {
              await deleteBranch(id, true);
              alert(`Branch "${bName}" and all associated records have been permanently deleted.`);
            } catch (cascadeErr: any) {
              alert(cascadeErr.message || "Failed to execute cascading deletion.");
            }
          }
        }
      }
    }
  };

  return (
    <div className="space-y-8" id="apex-business-manager">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 font-sans tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-cyan-400" />
            Corporate Ledger & Branch Registry
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure multi-tenant business workspaces, establish physical branches, and manage corporate registry parameters.
          </p>
        </div>
        <button
          onClick={() => setShowAddBiz(!showAddBiz)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-900 font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/20 transition duration-200 text-sm font-sans"
          id="btn-add-new-enterprise"
        >
          <Plus className="w-4 h-4" />
          Add Business Entity
        </button>
      </div>

      {/* Add Business Modal Overlay Form */}
      {showAddBiz && (
        <div className="glass-panel p-6 border-cyan-500/30 bg-slate-900/90 relative max-w-2xl" id="add-business-overlay">
          <button 
            onClick={() => setShowAddBiz(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-bold text-slate-100 mb-4 font-sans flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            Register New Corporate Entity
          </h3>
          <form onSubmit={handleCreateBusiness} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Company / Business Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Apex Logistics Ltd"
                value={newBizName}
                onChange={(e) => setNewBizName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded px-3 py-2 text-sm text-slate-200 font-sans focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Industry Type</label>
              <select
                value={newBizType}
                onChange={(e) => setNewBizType(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded px-3 py-2 text-sm text-slate-200 font-sans focus:outline-none"
              >
                <option value="Retail">Retail & Point of Sale</option>
                <option value="Wholesale">Wholesale & Distribution</option>
                <option value="Logistics">Logistics & Supply Chain</option>
                <option value="Services">Professional Services</option>
                <option value="Manufacturing">Manufacturing & Assembly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Primary Currency</label>
              <select
                value={newBizCurrency}
                onChange={(e) => setNewBizCurrency(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded px-3 py-2 text-sm text-slate-200 font-sans focus:outline-none"
              >
                <option value="KES">Kenyan Shillings (KES)</option>
                <option value="USD">US Dollars (USD)</option>
                <option value="EUR">Euros (EUR)</option>
                <option value="UGX">Ugandan Shillings (UGX)</option>
                <option value="TZS">Tanzanian Shillings (TZS)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tax / Reg Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g., KRA-PIN P051234567A"
                value={newBizReg}
                onChange={(e) => setNewBizReg(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded px-3 py-2 text-sm text-slate-200 font-sans focus:outline-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowAddBiz(false)}
                className="px-4 py-2 border border-slate-800 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs transition font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs transition font-sans"
              >
                Establish Workspace
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid: Left side Businesses List, Right side selected business branches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: BUSINESS SUBSIDIARIES LIST */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'active' 
                    ? 'bg-slate-900 text-cyan-400 border border-slate-800 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Active Subsidiaries ({activeBusinessesList.length})
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === 'archived' 
                    ? 'bg-slate-900 text-amber-400 border border-slate-800 shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Archived ({archivedBusinessesList.length})
              </button>
            </div>
          </div>

          {/* Businesses Scrollable List */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {displayList.length === 0 ? (
              <div className="glass-panel p-12 text-center text-slate-500">
                <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-sans">No matching business entities recorded.</p>
              </div>
            ) : (
              displayList.map(biz => {
                const isSelected = selectedBizId === biz.id;
                const isEditing = editingBizId === biz.id;
                const isActiveWorkspace = activeBusiness?.id === biz.id;

                return (
                  <div 
                    key={biz.id}
                    onClick={() => !isEditing && setSelectedBizId(biz.id)}
                    className={`glass-panel p-5 transition cursor-pointer border-l-4 ${
                      isActiveWorkspace 
                        ? 'border-l-emerald-500 bg-slate-900/60' 
                        : isSelected 
                          ? 'border-l-cyan-500 bg-slate-900/40' 
                          : 'border-l-slate-800 hover:bg-slate-900/20'
                    }`}
                    id={`biz-card-${biz.id}`}
                  >
                    {isEditing ? (
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Entity Name</label>
                            <input
                              type="text"
                              value={editBizName}
                              onChange={(e) => setEditBizName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Industry</label>
                            <input
                              type="text"
                              value={editBizType}
                              onChange={(e) => setEditBizType(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Currency</label>
                            <input
                              type="text"
                              value={editBizCurrency}
                              onChange={(e) => setEditBizCurrency(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 uppercase font-bold mb-0.5">Registration KRA Pin</label>
                            <input
                              type="text"
                              value={editBizReg}
                              onChange={(e) => setEditBizReg(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/50">
                          <button
                            onClick={() => setEditingBizId(null)}
                            className="p-1 px-3 border border-slate-800 rounded text-slate-400 hover:text-slate-200 text-xs font-sans"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveBusiness(biz.id)}
                            className="p-1 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs font-sans"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100 text-base font-sans tracking-wide">
                              {biz.name}
                            </span>
                            {isActiveWorkspace && (
                              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-sans font-bold">
                                ACTIVE WORKSPACE
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-slate-500" />
                              {biz.businessType || 'General Enterprise'}
                            </span>
                            <span>Currency: <b>{biz.currency || 'KSh'}</b></span>
                            {biz.registrationNumber && (
                              <span>ID: <code className="text-cyan-400/80">{biz.registrationNumber}</code></span>
                            )}
                          </div>
                        </div>

                        {/* Control Actions */}
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {!isActiveWorkspace && (
                            <button
                              onClick={() => setActiveBusiness(biz.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-950 hover:text-cyan-400 text-slate-300 font-bold rounded text-xs transition font-sans"
                              title="Switch Workspace"
                            >
                              Switch
                            </button>
                          )}
                          <button
                            onClick={() => startEditingBusiness(biz)}
                            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/40 rounded transition"
                            title="Edit Entity Parameters"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleArchiveBusiness(biz)}
                            className={`p-1.5 rounded transition ${
                              biz.archived 
                                ? 'text-amber-500 hover:bg-amber-500/10 hover:text-amber-400' 
                                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                            }`}
                            title={biz.archived ? "Restore Subsidiary" : "Archive Subsidiary"}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBusinessClick(biz.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                            title="Permanently Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: BRANCH REGISTRY FOR SELECTED BUSINESS */}
        <div className="space-y-4">
          {selectedBiz ? (
            <div className="glass-panel p-5 border-slate-800 space-y-5" id="branch-management-sidepanel">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-sans tracking-wide">
                    Branches: {selectedBiz.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Physical stores or operational hubs
                  </p>
                </div>
                <button
                  onClick={() => setShowAddBranch(!showAddBranch)}
                  className="p-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded transition"
                  title="Add physical branch"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add Branch Inline Form */}
              {showAddBranch && (
                <form onSubmit={handleCreateBranch} className="p-3 bg-slate-950 rounded border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300">New Physical Branch</h4>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Branch Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Mombasa CBD"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Location Address</label>
                    <input
                      type="text"
                      placeholder="e.g., Moi Avenue Plaza, Block B"
                      value={newBranchLoc}
                      onChange={(e) => setNewBranchLoc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Initial Status</label>
                    <select
                      value={newBranchStatus}
                      onChange={(e) => setNewBranchStatus(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none font-sans"
                    >
                      <option value="Active">Active / Operational</option>
                      <option value="Inactive">Inactive / Suspended</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddBranch(false)}
                      className="px-2 py-1 text-[10px] border border-slate-800 rounded text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 text-[10px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded"
                    >
                      Provision Branch
                    </button>
                  </div>
                </form>
              )}

              {/* Branches List */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {selectedBizBranches.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 space-y-1">
                    <MapPin className="w-8 h-8 mx-auto text-slate-700" />
                    <p className="text-xs font-sans">No physical branches registered for this entity.</p>
                  </div>
                ) : (
                  selectedBizBranches.map(br => {
                    const isBranchEditing = editingBranchId === br.id;

                    return (
                      <div 
                        key={br.id}
                        className="p-3 bg-slate-950/40 hover:bg-slate-950/70 border border-slate-800/80 rounded transition"
                      >
                        {isBranchEditing ? (
                          <div className="space-y-2">
                            <div>
                              <input
                                type="text"
                                value={editBranchName}
                                onChange={(e) => setEditBranchName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none font-sans"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                value={editBranchLoc}
                                onChange={(e) => setEditBranchLoc(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none font-sans"
                              />
                            </div>
                            <div className="flex justify-between items-center gap-2 pt-1">
                              <select
                                value={editBranchStatus}
                                onChange={(e) => setEditBranchStatus(e.target.value as any)}
                                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setEditingBranchId(null)}
                                  className="p-1 px-2 border border-slate-800 rounded text-slate-400 text-[10px] font-sans"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveBranch(br.id)}
                                  className="p-1 px-2 bg-cyan-500 text-slate-950 font-bold rounded text-[10px] font-sans"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-200 text-xs font-sans">{br.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold border ${
                                  br.status === 'Active' 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                }`}>
                                  {br.status}
                                </span>
                              </div>
                              {br.location && (
                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-600" />
                                  {br.location}
                                </p>
                              )}
                            </div>

                            {/* Branch Controls */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEditingBranch(br)}
                                className="p-1 text-slate-500 hover:text-cyan-400 rounded hover:bg-slate-900"
                                title="Edit Branch"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteBranchClick(br.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-900"
                                title="Decommission Branch"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-6 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-sans">Select a business on the left to review and establish physical branches.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
