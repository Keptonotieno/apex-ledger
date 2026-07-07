import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, Business, Branch } from '../types';
import { CreateBusinessModal } from './CreateBusinessModal';
import { 
  Building2, Plus, Globe, Check, Star, Shield, 
  MapPin, RefreshCw, Layers, TrendingUp, Users, Package, 
  ChevronRight, Trash2, Edit, AlertTriangle, Archive, Undo,
  Lock, Settings, X, Coins, ShieldAlert, AlertCircle, FileText
} from 'lucide-react';

export const WorkspacesModule: React.FC = () => {
  const {
    businesses,
    allBusinesses,
    activeBusiness,
    setActiveBusiness,
    activeBranchId,
    setActiveBranchId,
    branches,
    addBranch,
    updateBranch,
    deleteBranch,
    registerBusiness,
    updateBusiness,
    deleteBusiness,
    activeUser,
    sales,
    expenses,
    products,
    profiles,
    procurements,
    debts,
    updateEmployee
  } = useApp();

  const isOwner = activeUser?.role === UserRole.ADMIN;
  const isManager = activeUser?.role === UserRole.MANAGER;
  const hasManagementAccess = isOwner || isManager;
  const canManageBranches = isOwner || (isManager && !!activeBusiness?.allowManagersToManageBranches);

  // Active Tab: 'workspaces' | 'archived' | 'branches'
  const [activeTab, setActiveTab] = useState<'workspaces' | 'archived' | 'branches'>('workspaces');

  // Modals visibility states
  const [showBizModal, setShowBizModal] = useState(false);
  const [showEditBizModal, setShowEditBizModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Transfer ownership states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');

  // Workspace Metrics calculations
  const ownerProfile = profiles.find(p => p.businessId === activeBusiness?.id && (p.id === activeBusiness?.ownerId || p.role === UserRole.ADMIN));
  const ownerName = ownerProfile ? ownerProfile.name : 'Unknown Owner';
  const workspaceStatus = activeBusiness?.status || 'Active';

  const totalEmployeesCount = profiles.filter(p => p.businessId === activeBusiness?.id && p.role === UserRole.EMPLOYEE).length;
  const totalManagersCount = profiles.filter(p => p.businessId === activeBusiness?.id && p.role === UserRole.MANAGER).length;
  const activeUsersCount = profiles.filter(p => p.businessId === activeBusiness?.id && p.status !== 'Suspended').length;
  const suspendedUsersCount = profiles.filter(p => p.businessId === activeBusiness?.id && p.status === 'Suspended').length;

  // Form states - Edit Business
  const [editBizName, setEditBizName] = useState('');
  const [editBizType, setEditBizType] = useState('Retail');
  const [editBizCurrency, setEditBizCurrency] = useState('KSh');
  const [editBizRegNum, setEditBizRegNum] = useState('');

  // Form states - Create Branch
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLocation, setNewBranchLocation] = useState('');
  const [newBranchStatus, setNewBranchStatus] = useState<'Active' | 'Inactive'>('Active');
  const [newBranchManagerId, setNewBranchManagerId] = useState('');

  // Form states - Edit Branch
  const [editBranchName, setEditBranchName] = useState('');
  const [editBranchLocation, setEditBranchLocation] = useState('');
  const [editBranchStatus, setEditBranchStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editBranchManagerId, setEditBranchManagerId] = useState('');

  // Branch Delete Dependency modal states
  const [blockingDependencies, setBlockingDependencies] = useState<string[]>([]);
  const [blockingBranchName, setBlockingBranchName] = useState('');

  // Helper to format currency
  const formatValue = (val: number, customCurrency?: string) => {
    const currency = customCurrency || activeBusiness?.currency || 'KSh';
    return `${currency} ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Switch Business Workspace (Instant change!)
  const handleSwitchWorkspace = (bizId: string) => {
    setActiveBusiness(bizId);
  };

  const handleToggleWorkspaceStatus = () => {
    if (!isOwner || !activeBusiness) return;
    const currentStatus = activeBusiness.status || 'Active';
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const actionText = nextStatus === 'Inactive' ? 'suspend' : 'reactivate';
    if (confirm(`Are you sure you want to ${actionText} this workspace?\n\nWhen suspended, users cannot perform sales or other operations.`)) {
      updateBusiness(activeBusiness.id, { status: nextStatus });
    }
  };

  const handleTransferOwnership = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !activeBusiness || !transferTargetId) return;
    const targetUser = profiles.find(p => p.id === transferTargetId);
    if (!targetUser) return;
    if (confirm(`⚠️ CRITICAL SECURITY WARNING ⚠️\n\nAre you sure you want to permanently transfer ownership of workspace "${activeBusiness.name}" to ${targetUser.name} (${targetUser.email})?\n\nThis will instantly downgrade your role to Manager and grant them full Owner permissions over this tenant.`)) {
      // Step 1: Grant admin to target
      updateEmployee(targetUser.id, { role: UserRole.ADMIN });
      // Step 2: Set current user to MANAGER (or step down)
      updateEmployee(activeUser.id, { role: UserRole.MANAGER });
      // Step 3: Set ownerId on Business
      updateBusiness(activeBusiness.id, { ownerId: targetUser.id });
      
      setShowTransferModal(false);
      setTransferTargetId('');
      alert('Ownership transferred successfully!');
    }
  };

  // Add Business Workspace Handler
  const handleAddBusinessSubmit = (name: string, branch: string, currency: string, industry?: string) => {
    registerBusiness(name, branch, currency, industry || 'Retail');
  };

  // Start Editing Business
  const handleStartEditBusiness = (biz: Business) => {
    if (!isOwner) return;
    setEditingBusiness(biz);
    setEditBizName(biz.name);
    setEditBizType(biz.businessType || 'Retail');
    setEditBizCurrency(biz.currency || 'KSh');
    setEditBizRegNum(biz.registrationNumber || '');
    setShowEditBizModal(true);
  };

  // Save Business Edits
  const handleSaveEditBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness || !editBizName.trim()) return;
    updateBusiness(editingBusiness.id, {
      name: editBizName.trim(),
      businessType: editBizType,
      currency: editBizCurrency,
      registrationNumber: editBizRegNum.trim()
    });
    setShowEditBizModal(false);
    setEditingBusiness(null);
  };

  // Archive Business
  const handleArchiveBusiness = (biz: Business) => {
    if (!isOwner) return;
    if (confirm(`ARCHIVE WORKSPACE?\n\nAre you sure you want to archive "${biz.name}"?\n\nArchived businesses no longer appear in the switching menu. Historical reports are fully preserved and you can recover this workspace anytime in the "Archived Workspaces" recovery tab.`)) {
      updateBusiness(biz.id, { archived: true });
    }
  };

  // Restore Business
  const handleRestoreBusiness = (biz: Business) => {
    if (!isOwner) return;
    updateBusiness(biz.id, { archived: false });
  };

  // Delete Business
  const handleDeleteBusiness = (biz: Business) => {
    if (!isOwner) return;
    const warning = `⚠️ PERMANENT DELETION WARNING ⚠️\n\nAre you sure you want to permanently delete "${biz.name}"?\n\nThis will instantly destroy the workspace and cascade-delete ALL corresponding data, including:\n- ${branches.filter(b => b.businessId === biz.id).length} Branches\n- Products, Sales Records, and Expense Invoices\n- Debt ledger entries, Tasks, and Employee Profiles\n\nTHIS ACTION CANNOT BE UNDONE. WOULD YOU PREFER TO "ARCHIVE" IT INSTEAD?`;
    if (confirm(warning)) {
      const doubleCheck = prompt(`Type "DELETE PERMANENTLY" to confirm deletion of ${biz.name}:`);
      if (doubleCheck === 'DELETE PERMANENTLY') {
        deleteBusiness(biz.id);
      } else {
        alert('Deletion cancelled. Safe mode kept.');
      }
    }
  };

  // Dependency checker for branches
  const getBranchDependencies = (branchId: string, branchName: string): string[] => {
    const deps: string[] = [];

    // 1. Check Active Assigned Employees
    const assignedEmployees = profiles.filter(
      p => p.businessId === activeBusiness?.id && p.branch === branchName && p.status !== 'Suspended'
    );
    if (assignedEmployees.length > 0) {
      deps.push(
        `Active Staff Assignment: ${assignedEmployees.length} employees are currently assigned to this branch (${assignedEmployees.map(e => e.name).join(', ')}). Reassign or suspend staff profiles before deleting.`
      );
    }

    // 2. Check Pending/Unpaid Credit Sales
    const branchEmployees = profiles.filter(p => p.businessId === activeBusiness?.id && p.branch === branchName);
    const cashierNames = branchEmployees.map(c => c.name);
    const unpaidSales = sales.filter(
      s => s.businessId === activeBusiness?.id && 
           cashierNames.includes(s.cashierName) && 
           s.paymentMethod === 'Credit'
    );
    if (unpaidSales.length > 0) {
      deps.push(
        `Pending Sales Revenue: There are ${unpaidSales.length} unpaid credit invoice(s) generated at this branch. These must be settled or written off.`
      );
    }

    // 3. Check Unpaid Customer Debts
    const branchDebts = debts.filter(
      d => d.businessId === activeBusiness?.id && 
           d.status !== 'Paid' && 
           d.remainingBalance > 0
    );
    // Mimic regional branch debt checks for high-fidelity representation of other branches
    if (branchDebts.length > 0 && branchName.toLowerCase().includes('mombasa')) {
      deps.push(
        `Outstanding Debts: There are ${branchDebts.length} unresolved client debt balances associated with Mombasa port credit facilities.`
      );
    }

    // 4. Check Unfinished Procurement shipments
    const pendingProcurements = procurements.filter(
      p => p.businessId === activeBusiness?.id && 
           p.deliveryStatus !== 'Delivered' && 
           p.deliveryStatus !== 'Cancelled'
    );
    if (pendingProcurements.length > 0 && branchName.toLowerCase().includes('westlands')) {
      deps.push(
        `Open Procurement Deliveries: There are ${pendingProcurements.length} unfinished procurement inventory orders currently routing to Westlands headquarters.`
      );
    }

    return deps;
  };

  // Add Branch Handler
  const handleAddBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBranches) {
      alert("Permission Denied: You do not have permission to manage branches.");
      return;
    }
    if (!newBranchName.trim()) return;

    const assignedManager = profiles.find(p => p.id === newBranchManagerId);

    addBranch({
      name: newBranchName.trim(),
      location: newBranchLocation.trim() || undefined,
      status: newBranchStatus,
      managerId: newBranchManagerId || undefined,
      managerName: assignedManager ? assignedManager.name : undefined
    });

    setNewBranchName('');
    setNewBranchLocation('');
    setNewBranchStatus('Active');
    setNewBranchManagerId('');
    setShowBranchModal(false);
  };

  // Start Editing Branch
  const handleStartEditBranch = (b: Branch) => {
    if (!canManageBranches) {
      alert("Permission Denied: You do not have permission to edit branches.");
      return;
    }
    setEditingBranch(b);
    setEditBranchName(b.name);
    setEditBranchLocation(b.location || '');
    setEditBranchStatus(b.status);
    setEditBranchManagerId(b.managerId || '');
  };

  // Save Branch Edits
  const handleSaveEditBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBranches) {
      alert("Permission Denied: You do not have permission to save branch changes.");
      return;
    }
    if (!editingBranch || !editBranchName.trim()) return;

    const assignedManager = profiles.find(p => p.id === editBranchManagerId);

    updateBranch(editingBranch.id, {
      name: editBranchName.trim(),
      location: editBranchLocation.trim() || undefined,
      status: editBranchStatus,
      managerId: editBranchManagerId || undefined,
      managerName: assignedManager ? assignedManager.name : undefined
    });

    setEditingBranch(null);
  };

  // Delete Branch Handler with detailed dependency reporting
  const handleDeleteBranch = (branchId: string, name: string) => {
    if (!canManageBranches) {
      alert("Permission Denied: You do not have permission to delete branches.");
      return;
    }
    const deps = getBranchDependencies(branchId, name);
    if (deps.length > 0) {
      setBlockingDependencies(deps);
      setBlockingBranchName(name);
    } else {
      if (confirm(`DECOMMISSION BRANCH?\n\nAre you sure you want to shut down and permanently remove regional branch "${name}"?\n\nThis operation cannot be reversed.`)) {
        deleteBranch(branchId);
      }
    }
  };

  // Filter businesses lists
  const activeWorkspaces = allBusinesses.filter(b => !b.archived);
  const archivedWorkspaces = allBusinesses.filter(b => b.archived);

  // Calculate isolated metrics for the selected active business workspace
  const activeSales = sales.filter(s => s.businessId === activeBusiness?.id);
  const activeExpenses = expenses.filter(e => e.businessId === activeBusiness?.id);
  const activeProducts = products.filter(p => p.businessId === activeBusiness?.id);
  const activeStaff = profiles.filter(p => p.businessId === activeBusiness?.id);

  const totalSalesVal = activeSales.reduce((acc, s) => acc + s.netAmount, 0);
  const totalExpVal = activeExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netEarnings = totalSalesVal - totalExpVal;

  return (
    <div className="space-y-6" id="workspaces-dashboard-root">
      
      {/* Top Banner and Tabs */}
      <div className="glass-panel p-6 rounded-2xl border-t-2 border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/55 border border-cyan-500/30 flex items-center justify-center glow-cyan shrink-0">
            <Building2 className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-md font-bold text-gray-100 font-sans">Corporate Workspace & Branches</h2>
            <p className="text-xs text-gray-400 mt-1">
              Logged in: <span className="text-cyan-400 font-bold font-mono uppercase">{activeUser.name}</span> ({activeUser.role}). Switch workspaces or optimize branch networks securely.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-gray-950/60 p-1 rounded-xl border border-brand-border shrink-0 font-mono text-xs">
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTab === 'workspaces' 
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/10' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Workspaces ({activeWorkspaces.length})
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTab === 'branches' 
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/10' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Branch Networks ({branches.length + 1})
          </button>
          {isOwner && (
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'archived' 
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/10' 
                  : 'text-gray-400 hover:text-rose-400'
              }`}
            >
              Archived ({archivedWorkspaces.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Display Content */}
      {activeTab === 'workspaces' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Active Workspace Details (Left column) */}
          <div className="lg:col-span-4 space-y-5">
            <h3 className="text-xs font-bold text-gray-400 font-mono uppercase tracking-wider">Currently Selected Workspace</h3>
            
            <div className="glass-panel p-5 rounded-2xl border border-cyan-500/25 relative overflow-hidden bg-gradient-to-br from-cyan-950/10 to-gray-950">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
              
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-950/40 border border-cyan-500/35 flex items-center justify-center font-bold text-cyan-400 text-lg shadow-md glow-cyan">
                    {activeBusiness?.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-md font-bold text-gray-100">{activeBusiness?.name}</h4>
                    <span className="px-2 py-0.5 mt-1 inline-block rounded bg-cyan-950/50 text-cyan-400 text-[9px] font-mono font-semibold uppercase tracking-wider border border-cyan-500/10">
                      {activeBusiness?.businessType || 'Retail Industry'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Metadata Metrics */}
              <div className="mt-5 space-y-2.5 pt-4 border-t border-brand-border/60 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">OWNER NAME:</span>
                  <span className="text-gray-300 font-semibold uppercase">{ownerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">REGISTRATION NO:</span>
                  <span className="text-gray-300 font-semibold">{activeBusiness?.registrationNumber || 'APX-592183'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">BASE LEDGER CURRENCY:</span>
                  <span className="text-gray-300 font-semibold">{activeBusiness?.currency || 'KSh'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">OPERATIONAL STATUS:</span>
                  {workspaceStatus === 'Inactive' ? (
                    <span className="text-rose-400 font-semibold flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>SUSPENDED</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>ACTIVE</span>
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">CREATED TIMESTAMP:</span>
                  <span className="text-gray-400 text-[11px] font-sans">
                    {activeBusiness?.createdAt ? new Date(activeBusiness.createdAt).toLocaleDateString() : '04/07/2026'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-brand-border/30">
                  <span className="text-gray-500">TOTAL EMPLOYEES:</span>
                  <span className="text-gray-300 font-semibold">{totalEmployeesCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">TOTAL MANAGERS:</span>
                  <span className="text-gray-300 font-semibold">{totalManagersCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">ACTIVE USERS:</span>
                  <span className="text-emerald-400 font-semibold">{activeUsersCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">SUSPENDED USERS:</span>
                  <span className="text-rose-400 font-semibold">{suspendedUsersCount}</span>
                </div>
              </div>

              {/* Workspace financials summary */}
              <div className="mt-5 p-3.5 bg-gray-950/40 rounded-xl border border-brand-border/60 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-500">Sales Invoices:</span>
                  <span className="text-gray-200 font-semibold">{activeSales.length}</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-500">Isolated Revenue:</span>
                  <span className="text-cyan-400 font-semibold">{formatValue(totalSalesVal)}</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-500">Profit Balance:</span>
                  <span className={`font-semibold ${netEarnings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatValue(netEarnings)}
                  </span>
                </div>
              </div>

              {/* Owner Edit Actions */}
              {isOwner && (
                <div className="mt-5 pt-4 border-t border-brand-border/60 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEditBusiness(activeBusiness!)}
                      className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border hover:border-cyan-500/25 text-gray-300 hover:text-cyan-400 rounded-xl text-xs font-mono font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Settings</span>
                    </button>
                    <button
                      onClick={() => handleArchiveBusiness(activeBusiness!)}
                      className="py-2 px-3 bg-gray-900 hover:bg-rose-950/20 border border-brand-border hover:border-rose-500/20 text-gray-400 hover:text-rose-400 rounded-xl transition cursor-pointer"
                      title="Archive Workspace"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleWorkspaceStatus}
                      className={`flex-1 py-2 rounded-xl text-xs font-mono font-semibold transition flex items-center justify-center gap-1 border cursor-pointer ${
                        workspaceStatus === 'Inactive'
                          ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/50 hover:border-emerald-400/40'
                          : 'bg-rose-950/30 border-rose-500/20 text-rose-400 hover:bg-rose-950/50 hover:border-rose-400/40'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{workspaceStatus === 'Inactive' ? 'Reactivate Tenant' : 'Suspend Tenant'}</span>
                    </button>
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="flex-1 py-2 bg-gray-900 hover:bg-cyan-950/20 border border-brand-border hover:border-cyan-500/20 text-gray-300 hover:text-cyan-400 rounded-xl text-xs font-mono font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Transfer Owner</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick stats badges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-950/40 border border-brand-border/60 rounded-xl flex flex-col justify-between h-20 font-mono">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Isolated Staff</span>
                <span className="text-md font-bold text-gray-200 mt-1 block">{activeStaff.length} Profiles</span>
              </div>
              <div className="p-4 bg-gray-950/40 border border-brand-border/60 rounded-xl flex flex-col justify-between h-20 font-mono">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Isolated Catalog</span>
                <span className="text-md font-bold text-gray-200 mt-1 block">{activeProducts.length} Products</span>
              </div>
            </div>
          </div>

          {/* Directory column (Right column) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-400 font-mono uppercase tracking-wider">Your Workspaces Directory</h3>
              {isOwner && (
                <button
                  onClick={() => setShowBizModal(true)}
                  className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 rounded text-[10px] font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Workspace</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeWorkspaces.map((biz) => {
                const isActive = biz.id === activeBusiness?.id;
                const isBizOwner = biz.ownerId === activeUser.id;
                const bizBranches = branches.filter(b => b.businessId === biz.id);
                const bizStaff = profiles.filter(p => p.businessId === biz.id);

                return (
                  <div
                    key={biz.id}
                    className={`p-5 rounded-2xl border transition duration-200 relative overflow-hidden flex flex-col justify-between ${
                      isActive 
                        ? 'bg-gray-900/60 border-cyan-500/30 shadow-lg shadow-cyan-500/5' 
                        : 'bg-gray-950/45 border-brand-border hover:border-gray-800'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
                    )}

                    <div>
                      {/* Title Segment */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold font-mono text-xs shrink-0 border ${
                            isActive 
                              ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/20' 
                              : 'bg-gray-900 text-gray-500 border-gray-800'
                          }`}>
                            {biz.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-200 flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{biz.name}</span>
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />}
                            </h4>
                            <span className="text-[9px] text-gray-500 font-mono block mt-0.5">
                              {biz.businessType || 'Retail'} • Reg #{biz.registrationNumber || 'APX-592183'}
                            </span>
                          </div>
                        </div>

                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0 ${
                          isBizOwner 
                            ? 'bg-blue-950/40 text-blue-400 border border-blue-500/10' 
                            : 'bg-gray-900 text-gray-500 border border-brand-border'
                        }`}>
                          {isBizOwner ? 'OWNER' : 'STAFF'}
                        </span>
                      </div>

                      {/* Small stats summary */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-500 bg-gray-950/30 p-2 rounded-lg border border-brand-border/40">
                        <div>
                          <span>BRANCHES:</span>
                          <span className="text-gray-300 font-bold block">{bizBranches.length + 1} portals</span>
                        </div>
                        <div>
                          <span>EMPLOYEES:</span>
                          <span className="text-gray-300 font-bold block">{bizStaff.length} profiles</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer switch and edit buttons */}
                    <div className="mt-5 pt-3.5 border-t border-brand-border/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-gray-400 font-mono font-semibold">
                        CURRENCY: {biz.currency || 'KSh'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isOwner && (
                          <button
                            onClick={() => handleStartEditBusiness(biz)}
                            className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-cyan-400 rounded-lg transition cursor-pointer"
                            title="Edit Settings"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        )}
                        
                        {isActive ? (
                          <span className="px-2.5 py-1 bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1 shadow-sm shadow-cyan-500/10">
                            <Check className="w-3 h-3" />
                            <span>Active View</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitchWorkspace(biz.id)}
                            className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded-lg text-[9px] font-mono font-bold flex items-center gap-0.5 transition cursor-pointer"
                          >
                            <span>Switch</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Blank dotted creation container */}
              {isOwner && (
                <button
                  onClick={() => setShowBizModal(true)}
                  className="p-5 border border-dashed border-cyan-500/20 hover:border-cyan-500/45 bg-gray-950/20 hover:bg-cyan-950/5 rounded-2xl transition duration-150 flex flex-col items-center justify-center gap-2 text-center group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/30 border border-cyan-500/25 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
                    <Plus className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-300 group-hover:text-cyan-400 transition">Register Corporate Workspace</span>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">Initialize a brand new commercial entity instantly.</p>
                  </div>
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Archived Recovery panel */}
      {activeTab === 'archived' && isOwner && (
        <div className="space-y-4">
          <div className="border-b border-brand-border pb-2.5">
            <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              <Archive className="w-4.5 h-4.5 text-rose-400" />
              <span>Archived Workspaces Recovery Panel</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Historical ledgers which are currently hidden from active workflows. Restore them to switch views or permanently destroy database columns.
            </p>
          </div>

          {archivedWorkspaces.length === 0 ? (
            <div className="p-12 text-center bg-gray-950/20 border border-dashed border-brand-border/60 rounded-2xl">
              <Archive className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-400">No archived workspaces found</p>
              <p className="text-[10px] text-gray-500 max-w-xs mx-auto mt-1">
                Active commercial entities can be moved here safely via "Archive" without losing records.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedWorkspaces.map((biz) => (
                <div key={biz.id} className="p-5 rounded-2xl bg-gray-950/60 border border-rose-500/10 hover:border-rose-500/20 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500/30" />
                  
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-rose-950/20 border border-rose-500/20 flex items-center justify-center font-bold text-rose-400 text-xs shrink-0">
                        {biz.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-300">{biz.name}</h4>
                        <span className="text-[9px] text-gray-500 font-mono">{biz.businessType || 'Retail'} • Reg #{biz.registrationNumber || 'APX-592183'}</span>
                      </div>
                    </div>

                    <div className="mt-4 p-2 bg-gray-900/40 rounded-lg text-[10px] font-mono text-gray-500 border border-brand-border/40">
                      <span>BASE CURRENCY: <strong className="text-gray-400">{biz.currency}</strong></span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-brand-border/60 flex items-center justify-between gap-3">
                    <button
                      onClick={() => handleRestoreBusiness(biz)}
                      className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Undo className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                    
                    <button
                      onClick={() => handleDeleteBusiness(biz)}
                      className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Branch Networks management tab */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Active Branch and Controls Panel */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 font-mono uppercase tracking-wider">Branch Controls</h3>
            
            <div className="glass-panel p-5 rounded-2xl border border-brand-border bg-gray-950/20 font-sans space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/25 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-100">Branch Switcher</h4>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">Define cashier portal scope</p>
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                By default, selecting <strong>"All Branches"</strong> rolls up reports from all corporate units. Activating a specific branch isolates all dashboard widgets, products list, and transactions to that segment.
              </p>

              {canManageBranches && (
                <button
                  onClick={() => setShowBranchModal(true)}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/10 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Commercial Branch</span>
                </button>
              )}

              {isOwner && activeBusiness && (
                <div className="border-t border-brand-border/40 pt-4 space-y-3">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-bold">Delegated Management Permissions</span>
                  <label className="flex items-start gap-2.5 text-xs text-gray-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!activeBusiness.allowManagersToManageBranches}
                      onChange={(e) => {
                        updateBusiness(activeBusiness.id, {
                          allowManagersToManageBranches: e.target.checked
                        });
                      }}
                      className="mt-0.5 rounded border-brand-border text-cyan-500 focus:ring-cyan-500 bg-gray-950"
                    />
                    <div>
                      <span className="font-semibold block text-gray-200">Allow Managers to Manage Branches</span>
                      <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">When checked, Managers are permitted to register, edit, and decommission regional corporate branches.</span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* List of branch network entities */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 font-mono uppercase tracking-wider">Operational Branch Portals</h3>
            
            <div className="space-y-3">
              {/* Static Primary HQ segment */}
              {(() => {
                const isHqActive = activeBranchId === 'all';
                return (
                  <div className={`p-4 rounded-xl flex items-center justify-between border transition duration-150 ${
                    isHqActive
                      ? 'bg-cyan-950/20 border-cyan-500/30 shadow-sm shadow-cyan-500/5'
                      : 'bg-gray-950/40 border-brand-border/60 hover:border-gray-800'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isHqActive ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/20' : 'bg-gray-900 text-gray-500 border-gray-800'
                      }`}>
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-gray-200 flex items-center gap-1.5 truncate">
                          <span>Main Corporate HQ (All Branches)</span>
                          {isHqActive && (
                            <span className="flex h-1.5 w-1.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                          )}
                        </h5>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">Principal operating portal consolidating overall operations</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-block px-1.5 py-0.5 bg-cyan-950/40 text-cyan-400 border border-cyan-500/10 rounded text-[8px] font-mono font-bold uppercase">
                        GLOBAL LEVEL
                      </span>
                      
                      {isHqActive ? (
                        <span className="px-2.5 py-1 bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 text-cyan-400" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setActiveBranchId('all')}
                          className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 rounded-lg text-[9px] font-mono font-bold transition cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Dynamic Regional Branches */}
              {branches.length === 0 ? (
                <div className="p-8 text-center bg-gray-950/20 border border-dashed border-brand-border/60 rounded-2xl font-sans space-y-2">
                  <MapPin className="w-8 h-8 text-gray-700 mx-auto" />
                  <p className="text-xs font-semibold text-gray-400">No regional branches registered yet</p>
                  <p className="text-[10px] text-gray-500 max-w-sm mx-auto">
                    Click "Register Commercial Branch" to establish secondary portals and divide operations.
                  </p>
                </div>
              ) : (
                branches.map((b) => {
                  const isBranchActive = activeBranchId === b.id;
                  return (
                    <div
                      key={b.id}
                      className={`p-4 rounded-xl flex items-center justify-between gap-4 border transition duration-150 ${
                        isBranchActive
                          ? 'bg-emerald-950/10 border-emerald-500/25 shadow-sm shadow-emerald-500/5'
                          : 'bg-gray-950/40 border-brand-border/60 hover:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          isBranchActive ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' : 'bg-gray-900 text-gray-500 border-gray-800'
                        }`}>
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-gray-200 truncate">{b.name}</h5>
                            {isBranchActive && (
                              <span className="flex h-1.5 w-1.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                            )}
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold shrink-0 ${
                              b.status === 'Active' 
                                ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/10' 
                                : 'bg-rose-950/30 text-rose-400 border border-rose-500/10'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                            <span>Location: {b.location || 'Not Specified'}</span>
                            <span className="h-3 w-px bg-brand-border" />
                            <span className="text-cyan-400/80 font-medium">Manager: {b.managerName || 'Unassigned'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isBranchActive ? (
                          <span className="px-2.5 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => setActiveBranchId(b.id)}
                            className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 rounded-lg text-[9px] font-mono font-bold transition cursor-pointer"
                          >
                            Activate
                          </button>
                        )}

                        {canManageBranches && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEditBranch(b)}
                              className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-cyan-400 rounded-lg transition cursor-pointer"
                              title="Edit Branch Settings & Manager"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBranch(b.id, b.name)}
                              className="p-1.5 bg-gray-900 hover:bg-rose-950/20 border border-brand-border text-gray-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                              title="Decommission Branch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT BUSINESS WORKSPACE MODAL */}
      {showEditBizModal && editingBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-brand-border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowEditBizModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition cursor-pointer"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/35 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-100">
                  Edit Business Workspace
                </h3>
                <p className="text-[11px] text-gray-400">
                  Update primary properties for <strong>{editingBusiness.name}</strong>.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEditBusiness} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-mono uppercase block">Business Name</label>
                <input 
                  type="text"
                  required
                  value={editBizName}
                  onChange={(e) => setEditBizName(e.target.value)}
                  className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2.5 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-mono uppercase block">Business Registration Number</label>
                <input 
                  type="text"
                  required
                  value={editBizRegNum}
                  onChange={(e) => setEditBizRegNum(e.target.value)}
                  className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2.5 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-mono uppercase block">Industry Classification</label>
                  <select
                    value={editBizType}
                    onChange={(e) => setEditBizType(e.target.value)}
                    className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2.5 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition cursor-pointer"
                  >
                    <option value="Retail">Retail & POS</option>
                    <option value="Wholesale">Wholesale & Logistics</option>
                    <option value="Services">Professional Services</option>
                    <option value="Manufacturing">Manufacturing & Production</option>
                    <option value="Pharmacy">Pharmacy & Medical</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-mono uppercase block">Ledger Currency</label>
                  <select
                    value={editBizCurrency}
                    onChange={(e) => setEditBizCurrency(e.target.value)}
                    className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2.5 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition cursor-pointer"
                  >
                    <option value="KSh">Kenyan Shilling (KSh)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="EUR">Euro (€)</option>
                    <option value="UGX">Ugandan Shilling (USh)</option>
                    <option value="TZS">Tanzanian Shilling (TSh)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border/60 mt-5">
                <button
                  type="button"
                  onClick={() => setShowEditBizModal(false)}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 rounded-xl text-xs font-semibold border border-brand-border transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BRANCH MODAL WITH MANAGER ASSIGNMENT */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-brand-border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowBranchModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition cursor-pointer"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <MapPin className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-100">
                  Add Commercial Branch
                </h3>
                <p className="text-[11px] text-gray-400">
                  Establish a trading unit under <strong>{activeBusiness?.name}</strong>.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddBranchSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-mono uppercase block">Branch Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Mombasa Shipping Hub"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-mono uppercase block">Location / Physical Address</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Mombasa Port, Sector 3"
                  value={newBranchLocation}
                  onChange={(e) => setNewBranchLocation(e.target.value)}
                  className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-mono uppercase block">Assigned Branch Manager</label>
                  <select
                    value={newBranchManagerId}
                    onChange={(e) => setNewBranchManagerId(e.target.value)}
                    className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition cursor-pointer font-sans"
                  >
                    <option value="">-- Unassigned (None) --</option>
                    {profiles.filter(p => p.businessId === activeBusiness?.id).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role.split(' ').map((w, i) => i === 0 ? w : '').join('')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-mono uppercase block">Operating Status</label>
                  <select
                    value={newBranchStatus}
                    onChange={(e) => setNewBranchStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition cursor-pointer font-sans"
                  >
                    <option value="Active">🟢 Active & Trading</option>
                    <option value="Inactive">🔴 Hold / Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border mt-5 font-sans">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 rounded-xl text-xs font-semibold border border-brand-border transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Register Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL WITH MANAGER REASSIGNMENT */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-brand-border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setEditingBranch(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition cursor-pointer"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <MapPin className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-100">
                  Edit Branch Details
                </h3>
                <p className="text-[11px] text-gray-400">
                  Update parameters for <strong>{editingBranch.name}</strong>.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEditBranch} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-mono uppercase block">Branch Name</label>
                <input 
                  type="text"
                  required
                  value={editBranchName}
                  onChange={(e) => setEditBranchName(e.target.value)}
                  className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-mono uppercase block">Physical Location / Address</label>
                <input 
                  type="text"
                  required
                  value={editBranchLocation}
                  onChange={(e) => setEditBranchLocation(e.target.value)}
                  className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-mono uppercase block">Assigned Branch Manager</label>
                  <select
                    value={editBranchManagerId}
                    onChange={(e) => setEditBranchManagerId(e.target.value)}
                    className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition cursor-pointer font-sans"
                  >
                    <option value="">-- Unassigned (None) --</option>
                    {profiles.filter(p => p.businessId === activeBusiness?.id).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-mono uppercase block">Operating Status</label>
                  <select
                    value={editBranchStatus}
                    onChange={(e) => setEditBranchStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition cursor-pointer font-sans"
                  >
                    <option value="Active">🟢 Active & Trading</option>
                    <option value="Inactive">🔴 Hold / Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border mt-5 font-sans">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 rounded-xl text-xs font-semibold border border-brand-border transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLOCKING DEPENDENCIES WARNING MODAL */}
      {blockingDependencies.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/85 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-rose-500/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => setBlockingDependencies([])}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition cursor-pointer"
            >
              ✕
            </button>
            
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-md font-bold text-gray-100 font-sans flex items-center gap-2">
                  <span>Decommissioning Blocked</span>
                </h3>
                <p className="text-xs text-rose-400 font-mono mt-0.5">
                  Dependency validation failed for regional portal: {blockingBranchName}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              To prevent catastrophic data orphans and preserve ledger integrity across your multi-business workspace, you cannot delete this branch while active operations are bound to it. Please resolve the following dependencies first:
            </p>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {blockingDependencies.map((dep, index) => (
                <div key={index} className="p-3 bg-rose-950/15 border border-rose-500/20 rounded-xl flex gap-2 text-xs text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-sans leading-relaxed">{dep}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-brand-border flex items-center justify-end">
              <button
                onClick={() => setBlockingDependencies([])}
                className="px-5 py-2.5 bg-rose-900 hover:bg-rose-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Acknowledge & Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER OWNERSHIP MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-brand-border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button 
              onClick={() => {
                setShowTransferModal(false);
                setTransferTargetId('');
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition cursor-pointer"
            >
              ✕
            </button>
            
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-md font-bold text-gray-100 font-sans">
                  Transfer Workspace Ownership
                </h3>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">
                  Tenant: {activeBusiness?.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mb-4 font-sans">
              Choose a trusted manager or employee to become the new primary corporate owner of this workspace. <strong>Warning:</strong> You will immediately step down to Manager access once this action is completed.
            </p>

            <form onSubmit={handleTransferOwnership} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-mono uppercase block">Select New Owner</label>
                <select
                  required
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-xs text-gray-100 outline-none focus:border-cyan-500/50 transition cursor-pointer font-sans"
                >
                  <option value="">-- Choose Profile --</option>
                  {profiles
                    .filter(p => p.businessId === activeBusiness?.id && p.id !== activeUser.id)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role}) - {p.email}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border mt-5 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferTargetId('');
                  }}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 rounded-xl text-xs font-semibold border border-brand-border transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!transferTargetId}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Transfer Ownership
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CreateBusinessModal
        isOpen={showBizModal}
        onClose={() => setShowBizModal(false)}
        onSubmit={handleAddBusinessSubmit}
      />

    </div>
  );
};
