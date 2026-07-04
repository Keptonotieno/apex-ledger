import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, Business, Branch } from '../types';
import { SQL_SCHEMA, isSupabaseConfigured } from '../lib/database';
import { 
  Settings, Database, Server, Key, Copy, Check, Info, ShieldAlert, 
  PlusCircle, Lock, Building2, Target, CreditCard, History, Globe, 
  RefreshCw, FileDown, ShieldCheck, HelpCircle, AlertTriangle, Eye, ShieldCheck as SecurityIcon,
  Camera, Pencil, Trash2
} from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const { 
    businesses, 
    registerBusiness, 
    connectionStatus,
    activeUser,
    activeBusiness,
    addAudit,
    updateEmployee,
    branches,
    addBranch,
    updateBranch,
    deleteBranch
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'Developer' | 'Workspaces' | 'Targets' | 'Security'>('Developer');

  // Copy schemas
  const [copied, setCopied] = useState(false);
  
  // Create business/tenant state
  const [newBizName, setNewBizName] = useState('');
  const [newBizBranch, setNewBizBranch] = useState('');

  // Business profile state
  const [bizName, setBizName] = useState(activeBusiness.name);
  const [bizCurrency, setBizCurrency] = useState(activeBusiness.currency || 'KSh');
  
  // Branches input state
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLocation, setNewBranchLocation] = useState('');
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingBranchName, setEditingBranchName] = useState('');
  const [editingBranchLocation, setEditingBranchLocation] = useState('');
  const [editingBranchStatus, setEditingBranchStatus] = useState<'Active' | 'Inactive'>('Active');

  // Target Settings
  const [targetRevenue, setTargetRevenue] = useState<number>(500000);
  const [targetHours, setTargetHours] = useState<number>(180);

  // Subscriptions Settings
  const [activePlan, setActivePlan] = useState<string>('Platinum Enterprise Platform');
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<any>(null);
  const [checkoutCard, setCheckoutCard] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Backups Settings
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string[]>([]);
  const [restoringCheckpoint, setRestoringCheckpoint] = useState<string | null>(null);

  // Security Settings
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30 minutes');
  const [ipWhitelist, setIpWhitelist] = useState('*');
  const [auditLogRetention, setAuditLogRetention] = useState('365 days');

  const isAdmin = activeUser?.role === UserRole.ADMIN;
  const isEmployee = activeUser?.role === UserRole.EMPLOYEE;

  // Environment fields (read only / showcase)
  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://ais-database.supabase.co';
  const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eiI1Njk...';

  // Load branches and targets on mount or business switch
  useEffect(() => {
    setBizName(activeBusiness.name);
    setBizCurrency(activeBusiness.currency || 'KSh');

    // Load targets
    const targetKey = `apex_ledger_targets_${activeBusiness.id}`;
    const savedTargets = localStorage.getItem(targetKey);
    if (savedTargets) {
      const parsed = JSON.parse(savedTargets);
      setTargetRevenue(parsed.revenue || 500000);
      setTargetHours(parsed.hours || 180);
    } else {
      setTargetRevenue(500000);
      setTargetHours(180);
    }

    // Load subscription plan
    const planKey = `apex_ledger_subscription_${activeBusiness.id}`;
    const savedPlan = localStorage.getItem(planKey);
    if (savedPlan) {
      setActivePlan(savedPlan);
    } else {
      setActivePlan('Platinum Enterprise Platform');
    }

    // Load security settings
    const securityKey = `apex_ledger_security_${activeBusiness.id}`;
    const savedSec = localStorage.getItem(securityKey);
    if (savedSec) {
      const parsed = JSON.parse(savedSec);
      setMfaEnabled(parsed.mfa || false);
      setSessionTimeout(parsed.timeout || '30 minutes');
      setIpWhitelist(parsed.ipWhitelist || '*');
    }
  }, [activeBusiness]);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmployee) {
      alert('Access Denied: Employees are not authorized to register new tenants.');
      return;
    }
    if (!newBizName || !newBizBranch) return;
    registerBusiness(newBizName, newBizBranch);
    setNewBizName('');
    setNewBizBranch('');
    alert(`Business tenant: "${newBizName}" successfully registered and isolated!`);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Access Denied: Only Corporate Owners (Admin) can change corporate profile details.');
      return;
    }

    // Save back to businesses table in localStorage
    const saved = localStorage.getItem('apex_ledger_businesses');
    if (saved) {
      const list = JSON.parse(saved) as Business[];
      const updated = list.map(b => b.id === activeBusiness.id ? { ...b, name: bizName, currency: bizCurrency } : b);
      localStorage.setItem('apex_ledger_businesses', JSON.stringify(updated));
      addAudit('Updated Corporate Profile', `Name: ${activeBusiness.name}, Currency: ${activeBusiness.currency}`, `Name: ${bizName}, Currency: ${bizCurrency}`);
      window.dispatchEvent(new Event('storage'));
      alert('Corporate Profile details updated successfully!');
    }
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Access Denied: Only Business Owners can register branches.');
      return;
    }
    if (!newBranchName.trim()) return;

    addBranch({
      name: newBranchName.trim(),
      location: newBranchLocation.trim() || undefined,
      status: 'Active'
    });

    setNewBranchName('');
    setNewBranchLocation('');
  };

  const handleStartEditBranch = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setEditingBranchName(branch.name);
    setEditingBranchLocation(branch.location || '');
    setEditingBranchStatus(branch.status);
  };

  const handleSaveEditBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Access Denied: Only Business Owners can edit branches.');
      return;
    }
    if (!editingBranchId || !editingBranchName.trim()) return;

    updateBranch(editingBranchId, {
      name: editingBranchName.trim(),
      location: editingBranchLocation.trim() || undefined,
      status: editingBranchStatus
    });

    setEditingBranchId(null);
    setEditingBranchName('');
    setEditingBranchLocation('');
  };

  const handleRemoveBranch = (branchId: string, branchName: string) => {
    if (!isAdmin) {
      alert('Access Denied: Only Business Owners can remove branches.');
      return;
    }
    if (confirm(`Are you sure you want to shut down branch "${branchName}"? All references will be archived.`)) {
      deleteBranch(branchId);
    }
  };

  const handleSaveTargets = () => {
    if (!isAdmin) {
      alert('Access Denied: Only Administrators can modify performance targets.');
      return;
    }
    const targetKey = `apex_ledger_targets_${activeBusiness.id}`;
    const data = { revenue: targetRevenue, hours: targetHours };
    localStorage.setItem(targetKey, JSON.stringify(data));
    addAudit('Configured Corporate Targets', 'Previous Target Config', `Revenue Target: ${activeBusiness.currency || 'KSh'} ${targetRevenue.toLocaleString()}, Hours Limit: ${targetHours} hrs`);
    window.dispatchEvent(new Event('storage'));
    alert('Monthly corporate performance and revenue targets updated successfully.');
  };

  const planTiers = [
    {
      name: 'Bronze Starter Pack',
      price: 2500,
      description: 'Ideal for local kiosks or single-proprietor businesses.',
      features: ['Up to 3 staff members', '1 fixed branch', 'Standard offline database', 'E-mail support']
    },
    {
      name: 'Gold Standard Retailer',
      price: 7500,
      description: 'Perfect for fast-growing merchants and retail branches.',
      features: ['Up to 15 staff members', 'Up to 3 branches', 'Advanced sales analytics', '24/7 dedicated support', 'MFA security options']
    },
    {
      name: 'Platinum Enterprise Platform',
      price: 15000,
      description: 'Complete corporate management tool with extreme isolation safeguards.',
      features: ['Unlimited staff accounts', 'Unlimited branch creation', 'Full Supabase Realtime synchronization', 'IP address whitelist controls', 'Row Level Isolation checks']
    }
  ];

  const handleOpenUpgrade = (plan: any) => {
    if (!isAdmin) {
      alert('Access Denied: Only the Business Owner can upgrade or modify subscriptions.');
      return;
    }
    setSelectedPlanToUpgrade(plan);
    setCheckoutCard('4000 1234 5678 9010');
    setShowCheckoutModal(true);
  };

  const handleProcessCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutLoading(true);

    setTimeout(() => {
      setCheckoutLoading(false);
      setShowCheckoutModal(false);
      setActivePlan(selectedPlanToUpgrade.name);
      localStorage.setItem(`apex_ledger_subscription_${activeBusiness.id}`, selectedPlanToUpgrade.name);
      addAudit('Upgraded Subscription Level', activePlan, selectedPlanToUpgrade.name);
      window.dispatchEvent(new Event('storage'));
      alert(`Subscription successfully upgraded to ${selectedPlanToUpgrade.name}! Your premium tier is now active.`);
    }, 1500);
  };

  const handleSimulateBackup = () => {
    if (!isAdmin) {
      alert('Access Denied: Only Administrators are authorized to export corporate backups.');
      return;
    }
    setBackupLoading(true);
    setTimeout(() => {
      setBackupLoading(false);
      
      // Simulate download
      const backupData = {
        businessId: activeBusiness.id,
        businessName: activeBusiness.name,
        timestamp: new Date().toISOString(),
        plan: activePlan,
        branches: branches,
        targets: { revenue: targetRevenue, hours: targetHours },
        productsCount: 12,
        salesCount: 45
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `apex_ledger_backup_${activeBusiness.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      addAudit('Created Corporate Database Backup', 'N/A', `Auto-export backup downloaded successfully`);
      alert('Corporate Backup downloaded successfully as JSON. Keep this file in a secure vault.');
    }, 1000);
  };

  const handleRestoreCheckpoint = (checkpointName: string) => {
    if (!isAdmin) {
      alert('Access Denied: Only Administrators can trigger system rollbacks or database restoration.');
      return;
    }
    if (!confirm(`CRITICAL WARNING: Restoring to checkpoint "${checkpointName}" will revert database tables. Active records will be rolled back. Do you wish to proceed?`)) {
      return;
    }

    setRestoringCheckpoint(checkpointName);
    setRestoreProgress(['Initializing backup signature verification...', 'Locking tables to prevent race conditions...', 'Wiping current sandbox states...', 'Re-indexing row indexes...', 'Flushing cache buffers...']);

    let currentLogIdx = 0;
    const progressList: string[] = [];

    const interval = setInterval(() => {
      if (currentLogIdx < 5) {
        progressList.push(progressList.length === 0 
          ? 'Verifying CRC checksum hashes...' 
          : currentLogIdx === 1 
            ? 'Mounting snapshot sectors...' 
            : currentLogIdx === 2 
              ? 'Overwriting products and customer catalogs...' 
              : currentLogIdx === 3 
                ? 'Regenerating sales analytics matrices...' 
                : 'Rebuilding transaction journals...');
        setRestoreProgress([...progressList]);
        currentLogIdx++;
      } else {
        clearInterval(interval);
        
        // Seed specific mock changes to show backup rollback actually changed system state!
        if (checkpointName.includes('Weekly Full Snapshot')) {
          // Simulate seeding old data list
          const savedProducts = localStorage.getItem('apex_ledger_products');
          if (savedProducts) {
            const list = JSON.parse(savedProducts);
            // Change first product quantity as visual proof
            if (list.length > 0) {
              list[0].quantity = 99; // rollback value
              localStorage.setItem('apex_ledger_products', JSON.stringify(list));
            }
          }
        }

        setRestoringCheckpoint(null);
        setRestoreProgress([]);
        addAudit('Restored Database Backup Checkpoint', 'Current Sandbox State', checkpointName);
        window.dispatchEvent(new Event('storage'));
        alert(`System successfully restored to checkpoint "${checkpointName}"! Ledger tables recalculated.`);
      }
    }, 400);
  };

  const handleSaveSecurity = () => {
    if (!isAdmin) {
      alert('Access Denied: Only Administrators can configure system security parameters.');
      return;
    }
    const securityKey = `apex_ledger_security_${activeBusiness.id}`;
    const data = { mfa: mfaEnabled, timeout: sessionTimeout, ipWhitelist: ipWhitelist };
    localStorage.setItem(securityKey, JSON.stringify(data));
    addAudit('Updated Security Policies', 'Previous Security Policy', `MFA: ${mfaEnabled ? 'Enabled' : 'Disabled'}, Auto-Lock: ${sessionTimeout}, IP Whitelist: ${ipWhitelist}`);
    window.dispatchEvent(new Event('storage'));
    alert('Enterprise system security controls and access parameters applied successfully.');
  };

  return (
    <div className="space-y-6">
      
      {/* Settings sub-tabs controller */}
      <div className="flex border-b border-brand-border/60 pb-1 gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('Developer')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition whitespace-nowrap ${
            activeSubTab === 'Developer' 
              ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Supabase Sync</span>
        </button>

        <button
          onClick={() => setActiveSubTab('Workspaces')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition whitespace-nowrap ${
            activeSubTab === 'Workspaces' 
              ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Workspaces & Branches</span>
          {!isAdmin && <Lock className="w-3 h-3 text-gray-500 ml-1" />}
        </button>

        <button
          onClick={() => setActiveSubTab('Targets')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition whitespace-nowrap ${
            activeSubTab === 'Targets' 
              ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Targets & Subscriptions</span>
          {!isAdmin && <Lock className="w-3 h-3 text-gray-500 ml-1" />}
        </button>

        <button
          onClick={() => setActiveSubTab('Security')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition whitespace-nowrap ${
            activeSubTab === 'Security' 
              ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Backups & Security</span>
          {!isAdmin && <Lock className="w-3 h-3 text-gray-500 ml-1" />}
        </button>
      </div>

      {/* 1. DEVELOPER SYNC TAB */}
      {activeSubTab === 'Developer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Supabase Connection Console (7/12 width) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-panel p-5 rounded-xl border border-brand-border">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-gray-200">Supabase Integration Panel</h3>
                  <span className="text-[10px] text-gray-500 font-mono">Shared SQL and Realtime status</span>
                </div>
              </div>

              <div className="space-y-4 text-xs font-mono">
                {/* Connection Alert Badge */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isSupabaseConfigured 
                    ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200' 
                    : 'bg-cyan-950/20 border-cyan-500/20 text-cyan-200'
                }`}>
                  <Server className="w-5 h-5 shrink-0" />
                  <div className="space-y-1">
                    <div className="font-bold">
                      {isSupabaseConfigured 
                        ? 'Live Supabase Connection: Active' 
                        : 'Developer Sandbox: Active'}
                    </div>
                    <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                      {isSupabaseConfigured 
                        ? 'This client is actively synchronized with your live Supabase database. Every update made here is mirrored instantly in your Android app.' 
                        : 'Running in High-Fidelity Local Persistence mode. Instant multi-tab synchronization is active. Enter your Supabase environment variables in the Secrets / Env configurations to bind your live backend!'}
                    </p>
                  </div>
                </div>

                {/* Read only environment details */}
                <div className="space-y-3.5 bg-gray-950/40 p-4 rounded-xl border border-brand-border/60">
                  <div className="flex items-center justify-between text-[11px] border-b border-brand-border/60 pb-1.5 font-bold">
                    <span>ENVIRONMENT POINTERS</span>
                    <span className="text-gray-500">{connectionStatus}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">SUPABASE_URL</span>
                    <span className="text-gray-300 select-all">{supabaseUrl}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">SUPABASE_ANON_KEY</span>
                    <span className="text-gray-400 truncate block select-all">{supabaseKey}</span>
                  </div>
                </div>

                {/* Copy SQL scripts section */}
                <div className="space-y-3 bg-gray-950/40 p-4 rounded-xl border border-brand-border/60">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-gray-200 font-sans font-semibold text-xs block">Generate SQL Schemas</span>
                      <span className="text-[10px] text-gray-500">Run this in your Supabase SQL Editor to prepare database.</span>
                    </div>
                    <button
                      onClick={handleCopySchema}
                      className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/20 text-cyan-400 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Schema'}</span>
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto bg-gray-950 p-2.5 rounded border border-gray-900 text-[10px] text-cyan-400/80 scrollbar-thin">
                    <pre className="whitespace-pre-wrap">{SQL_SCHEMA}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tenant registry side (5/12 width) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel p-5 rounded-xl border border-brand-border">
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-gray-200">Register New isolated Tenant</h3>
                  <span className="text-[10px] text-gray-500 font-mono font-bold">Uncompromised Row Isolation</span>
                </div>
              </div>

              {isEmployee ? (
                <div className="flex flex-col items-center justify-center text-center py-6 px-2 space-y-3 font-sans">
                  <Lock className="w-8 h-8 text-rose-500 shrink-0" />
                  <h4 className="text-xs font-bold text-gray-200">Registration Restricted</h4>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    You are logged in as an Employee. Only Administrators and Managers can register new isolated tenant workspaces.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateBusiness} className="space-y-3.5 text-xs font-mono">
                  <div>
                    <label className="text-gray-400 block mb-1">Corporate Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Retail Ltd"
                      value={newBizName}
                      onChange={(e) => setNewBizName(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Assigned Branch name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Westlands, Nairobi"
                      value={newBizBranch}
                      onChange={(e) => setNewBizBranch(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition duration-200 cursor-pointer"
                  >
                    Register Isolated tenant
                  </button>
                </form>
              )}
            </div>

            <div className="glass-panel p-5 rounded-xl border border-brand-border">
              <div className="flex gap-2.5 items-start text-xs text-gray-400 leading-relaxed font-sans">
                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-200">Tenant Isolation Rules (RLS)</p>
                  <p className="mt-1 text-[11px]">
                    Each business has separate records. Employees can only select and interact with records belonging to their active `business_id` workspace. Row Level Security guarantees complete database sandbox isolation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. WORKSPACES & BRANCHES TAB */}
      {activeSubTab === 'Workspaces' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Personal Profile section accessible by EVERYONE */}
          <div className="glass-panel p-5 rounded-xl border border-brand-border">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-brand-border/60">
              <SecurityIcon className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-gray-200">Your Personal User Profile</h3>
                <span className="text-[10px] text-gray-500 font-mono">Manage your display name, credentials, and custom profile image</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Col: Upload Profile Image */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-gray-950/45 rounded-xl border border-brand-border/60 space-y-3">
                <div className="relative group/settings-avatar">
                  {activeUser.avatarUrl ? (
                    <img 
                      src={activeUser.avatarUrl} 
                      alt={activeUser.name} 
                      className="w-20 h-20 rounded-full border border-cyan-500/20 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center font-bold text-2xl text-cyan-400 font-mono shadow-inner uppercase">
                      {activeUser.name ? activeUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U'}
                    </div>
                  )}
                  <label className="absolute inset-0 bg-gray-950/85 rounded-full flex flex-col items-center justify-center opacity-0 group-hover/settings-avatar:opacity-100 transition duration-150 cursor-pointer text-cyan-400 text-[10px] font-mono font-bold uppercase text-center p-1">
                    <Camera className="w-5 h-5 mb-1" />
                    <span>Upload Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert("Image is too large. Choose under 2MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            if (base64) {
                              updateEmployee(activeUser.id, { avatarUrl: base64 });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                </div>
                
                <div className="text-center">
                  <span className="text-xs font-bold text-gray-200 block capitalize">{activeUser.name}</span>
                  <span className="text-[10px] text-cyan-400 font-mono block uppercase">{activeUser.role}</span>
                </div>

                <div className="flex flex-col gap-1.5 w-full items-center">
                  <label className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 transition rounded-lg text-xs font-mono font-bold cursor-pointer flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Choose Photo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert("Image is too large. Choose under 2MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            if (base64) {
                              updateEmployee(activeUser.id, { avatarUrl: base64 });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                  {activeUser.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        updateEmployee(activeUser.id, { avatarUrl: undefined });
                        alert("Profile photo removed successfully!");
                      }}
                      className="px-3 py-1 bg-rose-950/40 hover:bg-rose-900/30 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>

              {/* Right Col: Details form */}
              <div className="md:col-span-8 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 block mb-1 text-xs font-sans">Full Name</label>
                    <input
                      type="text"
                      value={activeUser.name}
                      onChange={(e) => updateEmployee(activeUser.id, { name: e.target.value })}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-xs text-gray-200 outline-none focus:border-cyan-500/30 font-sans capitalize"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1 text-xs font-sans">Email Address</label>
                    <input
                      type="email"
                      value={activeUser.email}
                      onChange={(e) => updateEmployee(activeUser.id, { email: e.target.value })}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-xs text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                    />
                  </div>
                </div>
                <div className="p-3.5 bg-cyan-500/5 rounded-xl border border-cyan-500/10 text-[11px] text-gray-400 font-sans">
                  <span className="text-cyan-400 font-semibold uppercase font-mono mr-1.5">Note:</span>
                  Changes to your personal credentials and profile photo will apply instantly across all workspaces, active dashboards, and live audit logs.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Corporate Details & Logo (6/12 width) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="glass-panel p-5 rounded-xl border border-brand-border">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-brand-border/60">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Corporate Business Profile</h3>
                    <span className="text-[10px] text-gray-500 font-mono">Configure global corporate meta settings</span>
                  </div>
                </div>

                {!isAdmin ? (
                  <div className="p-8 text-center bg-gray-950/30 border border-brand-border/60 rounded-xl space-y-3 font-sans">
                    <Lock className="w-8 h-8 text-rose-500 mx-auto" />
                    <h4 className="text-xs font-bold text-gray-300">Access Restricted</h4>
                    <p className="text-[10px] text-gray-500">
                      Only the Corporate Owner (Administrator) role can modify general business profile information, select billing currencies, or manage branches.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs font-mono">
                    <div className="flex items-center gap-4 p-3 bg-gray-950/40 rounded-xl border border-brand-border/60 font-sans">
                      <div className="w-14 h-14 rounded-xl bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center text-xl font-bold font-mono text-cyan-400 shadow-inner shrink-0">
                        {bizName ? bizName.substring(0, 2).toUpperCase() : 'AP'}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-200 text-xs">Corporate Visual Branding</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Avatar / Logo automatically derived from corporate title initials.</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1 font-sans">Corporate Brand Name</label>
                      <input
                        type="text"
                        required
                        value={bizName}
                        onChange={(e) => setBizName(e.target.value)}
                        className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1 font-sans">Corporate Base Currency</label>
                      <select
                        value={bizCurrency}
                        onChange={(e) => setBizCurrency(e.target.value)}
                        className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30 font-sans"
                      >
                        <option value="KSh">Kenyan Shilling (KSh)</option>
                        <option value="USD">United States Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="UGX">Ugandan Shilling (UGX)</option>
                        <option value="TZS">Tanzanian Shilling (TZS)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition"
                    >
                      Apply Profile Updates
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right Col: Create & Manage Branches (6/12 width) */}
            <div className="lg:col-span-6 space-y-4">
              <div className="glass-panel p-5 rounded-xl border border-brand-border">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border/60">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-200">Corporate Branches</h3>
                      <span className="text-[10px] text-gray-500 font-mono">Create and manage regional company branches</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full ${
                    connectionStatus === 'Connected' 
                      ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-cyan-950/30 text-cyan-400 border border-cyan-500/20'
                  }`}>
                    {connectionStatus === 'Connected' ? 'Supabase Synced' : 'Offline Mirror'}
                  </span>
                </div>

                {editingBranchId ? (
                  /* Edit Branch Form */
                  <form onSubmit={handleSaveEditBranch} className="space-y-4 bg-cyan-950/15 p-4 rounded-xl border border-cyan-500/20 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">Edit Branch Details</span>
                      <button 
                        type="button" 
                        onClick={() => setEditingBranchId(null)}
                        className="text-[10px] text-gray-400 hover:text-gray-200 font-mono"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-gray-400 block mb-1 font-sans">Branch Name</label>
                        <input
                          type="text"
                          required
                          value={editingBranchName}
                          onChange={(e) => setEditingBranchName(e.target.value)}
                          className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                        />
                      </div>

                      <div>
                        <label className="text-gray-400 block mb-1 font-sans">Location / Address</label>
                        <input
                          type="text"
                          placeholder="e.g. Mombasa Road"
                          value={editingBranchLocation}
                          onChange={(e) => setEditingBranchLocation(e.target.value)}
                          className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                        />
                      </div>

                      <div>
                        <label className="text-gray-400 block mb-1 font-sans">Status</label>
                        <select
                          value={editingBranchStatus}
                          onChange={(e) => setEditingBranchStatus(e.target.value as 'Active' | 'Inactive')}
                          className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30 font-sans"
                        >
                          <option value="Active">Active / Operational</option>
                          <option value="Inactive">Inactive / Suspended</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-lg text-center transition text-xs"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {/* Create Branch Form - Only for admins */}
                    {isAdmin ? (
                      <form onSubmit={handleAddBranch} className="space-y-3 bg-gray-950/30 p-3.5 rounded-xl border border-brand-border/60">
                        <span className="text-[10px] text-cyan-400 font-mono font-bold block">REGISTER NEW BRANCH</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Branch Name (e.g. Mombasa Port)"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            className="bg-gray-950/60 border border-brand-border rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                          />
                          <input
                            type="text"
                            placeholder="Location (e.g. Mombasa)"
                            value={newBranchLocation}
                            onChange={(e) => setNewBranchLocation(e.target.value)}
                            className="bg-gray-950/60 border border-brand-border rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 bg-cyan-950 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1 transition"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Establish Branch</span>
                        </button>
                      </form>
                    ) : (
                      <div className="p-3 bg-gray-950/20 border border-brand-border/40 rounded-xl text-[10px] text-gray-500 flex items-start gap-1.5 font-sans">
                        <Info className="w-4 h-4 text-cyan-500/70 shrink-0 mt-0.5" />
                        <span>Viewing organization directory. Only the Corporate Owner can add, edit, or shut down branches.</span>
                      </div>
                    )}

                    {/* Branches Directory list */}
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {branches.length === 0 ? (
                        <div className="p-8 text-center bg-gray-950/30 border border-dashed border-brand-border/60 rounded-xl space-y-2 font-sans">
                          <Building2 className="w-8 h-8 text-gray-600 mx-auto animate-pulse" />
                          <h4 className="text-xs font-bold text-gray-400">No Corporate Branches</h4>
                          <p className="text-[10px] text-gray-500 max-w-xs mx-auto">
                            No company branches are currently listed. Create branches using the form above to expand your workspace.
                          </p>
                        </div>
                      ) : (
                        branches.map((b) => (
                          <div key={b.id} className="p-3 bg-gray-950/40 rounded-xl border border-brand-border/60 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5">
                              <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-200">{b.name}</span>
                                  <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold rounded-full ${
                                    b.status === 'Active' 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                                  }`}>
                                    {b.status.toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400 block mt-0.5 font-sans">
                                  {b.location || 'No location specified'}
                                </span>
                              </div>
                            </div>

                            {isAdmin && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleStartEditBranch(b)}
                                  className="p-1.5 bg-gray-950 border border-brand-border/60 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 rounded-md transition"
                                  title="Edit branch details"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveBranch(b.id, b.name)}
                                  className="p-1.5 bg-gray-950 border border-brand-border/60 text-gray-400 hover:text-rose-400 hover:border-rose-500/20 rounded-md transition"
                                  title="Shut down branch"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. TARGETS & SUBSCRIPTIONS TAB */}
      {activeSubTab === 'Targets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Targets Configuration Section (5/12 width) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel p-5 rounded-xl border border-brand-border">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-brand-border/60">
                <Target className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-gray-200">Configure Monthly Targets</h3>
                  <span className="text-[10px] text-gray-500 font-mono">Define sales quotas and performance yardsticks</span>
                </div>
              </div>

              {!isAdmin ? (
                <div className="p-8 text-center bg-gray-950/30 border border-brand-border/60 rounded-xl space-y-3 font-sans">
                  <Lock className="w-8 h-8 text-rose-500 mx-auto" />
                  <h4 className="text-xs font-bold text-gray-300">Access Restricted</h4>
                  <p className="text-[10px] text-gray-500">
                    Only Administrators can configure performance targets and financial quotas.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="text-gray-400 block mb-1 font-sans">Monthly Sales Target ({bizCurrency})</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={targetRevenue}
                      onChange={(e) => setTargetRevenue(Number(e.target.value))}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 font-sans">Monthly Target Employee Logged Hours</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={targetHours}
                      onChange={(e) => setTargetHours(Number(e.target.value))}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono font-bold"
                    />
                  </div>

                  <button
                    onClick={handleSaveTargets}
                    className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition font-bold"
                  >
                    Apply Target Quotas
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Tiers Section (7/12 width) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-panel p-5 rounded-xl border border-brand-border">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border/60">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Subscription & Plan Management</h3>
                    <span className="text-[10px] text-gray-500 font-mono">Active subscription and tier details</span>
                  </div>
                </div>

                <div className="bg-cyan-500/10 text-cyan-400 font-mono font-bold text-[9px] px-2 py-0.5 rounded border border-cyan-500/20 uppercase tracking-widest">
                  {activePlan.split(' ')[0]} Active
                </div>
              </div>

              {/* Billing Cycles toggle */}
              <div className="flex bg-gray-950/80 p-1 border border-brand-border rounded-lg self-start w-fit max-w-full text-[10px] font-mono mb-4">
                <button
                  onClick={() => setBillingCycle('Monthly')}
                  className={`px-3 py-1.5 rounded-md font-bold transition ${
                    billingCycle === 'Monthly' ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Monthly Cycle
                </button>
                <button
                  onClick={() => setBillingCycle('Yearly')}
                  className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1 ${
                    billingCycle === 'Yearly' ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>Yearly Cycle</span>
                  <span className="bg-emerald-950 text-emerald-400 text-[8px] px-1 rounded">Save 20%</span>
                </button>
              </div>

              {/* Plans Grid */}
              <div className="space-y-3.5">
                {planTiers.map((tier) => {
                  const isCurrent = activePlan === tier.name;
                  const discountedPrice = billingCycle === 'Yearly' ? tier.price * 0.8 : tier.price;

                  return (
                    <div 
                      key={tier.name}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                        isCurrent 
                          ? 'bg-cyan-950/20 border-cyan-400/40' 
                          : 'bg-gray-950/30 border-brand-border/60 hover:border-brand-border'
                      }`}
                    >
                      <div className="space-y-1 max-w-md">
                        <h4 className="text-xs font-bold text-gray-200 font-mono flex items-center gap-2">
                          <span>{tier.name}</span>
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          )}
                        </h4>
                        <p className="text-[10px] text-gray-500 font-sans leading-relaxed">{tier.description}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 font-mono text-[9px] text-gray-400 uppercase">
                          {tier.features.map(f => (
                            <span key={f} className="flex items-center gap-1 shrink-0">
                              <ShieldCheck className="w-3 h-3 text-cyan-500 shrink-0" />
                              <span>{f}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-gray-200">
                          KSh {discountedPrice.toLocaleString()} <span className="text-[9px] text-gray-500">/ mo</span>
                        </div>
                        {isCurrent ? (
                          <div className="mt-2 text-[10px] text-cyan-400 font-mono font-bold flex items-center gap-1 sm:justify-end">
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Plan Active</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenUpgrade(tier)}
                            className="mt-2 px-3 py-1 bg-gray-950 hover:bg-gray-900 border border-brand-border text-gray-300 hover:text-cyan-400 rounded text-[10px] font-mono font-bold transition cursor-pointer"
                          >
                            Switch Plan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. BACKUPS & SECURITY TAB */}
      {activeSubTab === 'Security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Backups Restoration Center (7/12 width) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-panel p-5 rounded-xl border border-brand-border">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border/60">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Database Backup & Rollbacks</h3>
                    <span className="text-[10px] text-gray-500 font-mono">Roll back or download sandbox state snaps</span>
                  </div>
                </div>

                <button
                  onClick={handleSimulateBackup}
                  disabled={backupLoading}
                  className="px-3.5 py-1.5 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{backupLoading ? 'Backing up...' : 'Backup Database'}</span>
                </button>
              </div>

              {!isAdmin ? (
                <div className="p-8 text-center bg-gray-950/30 border border-brand-border/60 rounded-xl space-y-3 font-sans">
                  <Lock className="w-8 h-8 text-rose-500 mx-auto" />
                  <h4 className="text-xs font-bold text-gray-300">Access Restricted</h4>
                  <p className="text-[10px] text-gray-500">
                    Only Administrators can restore backups or trigger data rollbacks.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Backup list */}
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-950/50 border border-brand-border/60 rounded-xl flex items-center justify-between gap-4 text-xs">
                      <div>
                        <h4 className="font-semibold text-gray-200">Weekly Full Snapshot</h4>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">2026-06-25 14:22:10 • Size: 142.1 KB</p>
                      </div>
                      <button
                        onClick={() => handleRestoreCheckpoint('Weekly Full Snapshot - 2026-06-25')}
                        className="px-3 py-1.5 bg-rose-950/20 hover:bg-rose-900/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 rounded text-[10px] font-mono font-bold transition cursor-pointer"
                      >
                        Restore Checkpoint
                      </button>
                    </div>

                    <div className="p-4 bg-gray-950/50 border border-brand-border/60 rounded-xl flex items-center justify-between gap-4 text-xs">
                      <div>
                        <h4 className="font-semibold text-gray-200">System Auto-Save (Pre-upgrade)</h4>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">2026-07-02 08:00:00 • Size: 18.4 KB</p>
                      </div>
                      <button
                        onClick={() => handleRestoreCheckpoint('System Auto-Save - 2026-07-02')}
                        className="px-3 py-1.5 bg-rose-950/20 hover:bg-rose-900/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 rounded text-[10px] font-mono font-bold transition cursor-pointer"
                      >
                        Restore Checkpoint
                      </button>
                    </div>
                  </div>

                  {/* Restoring loader feedback */}
                  {restoringCheckpoint && (
                    <div className="p-4 bg-gray-950 border border-cyan-500/20 rounded-xl space-y-3 font-mono text-[10px]">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Restoring ledger states to checkpoint: "{restoringCheckpoint}"</span>
                      </div>
                      <div className="space-y-1 pl-6 max-h-[120px] overflow-y-auto text-gray-500">
                        {restoreProgress.map((p, i) => (
                          <div key={i} className="animate-pulse">✓ {p}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Advanced Security & MFA controls (5/12 width) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel p-5 rounded-xl border border-brand-border">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-brand-border/60">
                <SecurityIcon className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-gray-200">Corporate Security Policies</h3>
                  <span className="text-[10px] text-gray-500 font-mono">Advanced MFA & IP Whitelist variables</span>
                </div>
              </div>

              {!isAdmin ? (
                <div className="p-8 text-center bg-gray-950/30 border border-brand-border/60 rounded-xl space-y-3 font-sans">
                  <Lock className="w-8 h-8 text-rose-500 mx-auto" />
                  <h4 className="text-xs font-bold text-gray-300">Access Restricted</h4>
                  <p className="text-[10px] text-gray-500">
                    Only Administrators can configure corporate security guidelines and allowed IP limits.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs font-mono">
                  {/* MFA Toggle */}
                  <div className="flex items-center justify-between p-2.5 bg-gray-950/30 rounded-xl border border-brand-border/60">
                    <div>
                      <span className="text-gray-200 font-semibold font-sans text-xs block">Require MFA</span>
                      <span className="text-[9px] text-gray-500">Enforce Multi-Factor Authentication for managers</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMfaEnabled(!mfaEnabled)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                        mfaEnabled ? 'bg-cyan-500' : 'bg-gray-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-gray-950 shadow ring-0 transition duration-200 ease-in-out ${
                          mfaEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Session Timeout */}
                  <div>
                    <label className="text-gray-400 block mb-1 font-sans">Inactivity Auto-Lock duration</label>
                    <select
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30 font-sans"
                    >
                      <option value="15 minutes">15 minutes</option>
                      <option value="30 minutes">30 minutes</option>
                      <option value="1 hour">1 hour</option>
                      <option value="Never lock">Never lock (Not recommended)</option>
                    </select>
                  </div>

                  {/* Allowed IP range */}
                  <div>
                    <label className="text-gray-400 block mb-1 font-sans">Branch Whitelist IPs (CIDR / IP matches)</label>
                    <input
                      type="text"
                      required
                      value={ipWhitelist}
                      onChange={(e) => setIpWhitelist(e.target.value)}
                      placeholder="e.g. 197.232.*.* or *"
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                    />
                  </div>

                  <button
                    onClick={handleSaveSecurity}
                    className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition font-bold"
                  >
                    Apply Security Policy
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL: SUBSCRIPTIONS UPGRADE */}
      {showCheckoutModal && selectedPlanToUpgrade && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              <span>Process Subscription Checkout</span>
            </h3>

            <form onSubmit={handleProcessCheckout} className="space-y-4 text-xs font-mono">
              <div className="bg-gray-950 p-3.5 rounded-xl border border-brand-border/60">
                <span className="text-gray-500 text-[10px] uppercase font-mono font-bold block">Selected Subscription Package</span>
                <span className="text-gray-200 font-bold font-sans text-sm block mt-1">{selectedPlanToUpgrade.name}</span>
                <span className="text-cyan-400 font-bold mt-1 block">
                  KSh {(billingCycle === 'Yearly' ? selectedPlanToUpgrade.price * 0.8 : selectedPlanToUpgrade.price).toLocaleString()} <span className="text-gray-500 font-normal">/ month</span>
                </span>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Payment Card (Simulated Sandbox Card)</label>
                <input
                  type="text"
                  required
                  value={checkoutCard}
                  onChange={(e) => setCheckoutCard(e.target.value)}
                  className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 text-center tracking-widest text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="text-gray-400 block mb-1 font-sans">Expiry Date</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    defaultValue="12/28"
                    className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 text-center"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1 font-sans">CVV / CVN</label>
                  <input
                    type="password"
                    required
                    maxLength={3}
                    defaultValue="999"
                    className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 text-center"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition"
                >
                  {checkoutLoading ? 'Processing Sandbox Transaction...' : 'Process Secure Checkout'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-brand-border font-sans rounded-xl text-center transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
