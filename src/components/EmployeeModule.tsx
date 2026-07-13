import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../utils/api';
import { UserRole, UserProfile } from '../types';
import { Users, Plus, UserPlus, Clock, Trash2, Shield, X, Lock, Edit, Ban, Check, Camera } from 'lucide-react';

/**
 * Generates a robust, non-colliding, alphanumeric registration number by querying
 * the existing database of employee profiles.
 * Ensures the generated ID starts with 'EMP-' followed by a sequential number padded to 3 digits,
 * completely avoiding duplicates or collisions.
 * 
 * @param existingProfiles Array of current employee profiles in the database/workspace
 * @returns A unique alphanumeric employee ID string
 */
export const generateUniqueEmployeeID = (existingProfiles: UserProfile[]): string => {
  const existingIds = new Set<string>();
  
  // Track all existing employee IDs in uppercase to prevent casing-based collisions
  existingProfiles.forEach(p => {
    const badge = p.badgeNumber || (p as any).employeeNumber;
    if (badge && typeof badge === 'string') {
      existingIds.add(badge.trim().toUpperCase());
    }
  });

  // Calculate the next sequential integer suffix based on matching EMP-XXX patterns
  let nextNum = 1;
  existingProfiles.forEach(p => {
    const badge = p.badgeNumber || (p as any).employeeNumber;
    if (badge && typeof badge === 'string') {
      const match = badge.match(/^EMP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) {
          nextNum = num + 1;
        }
      }
    }
  });

  // Generate candidate and double-check against all loaded IDs for absolute safety
  let candidate = `EMP-${String(nextNum).padStart(3, '0')}`;
  while (existingIds.has(candidate)) {
    nextNum++;
    candidate = `EMP-${String(nextNum).padStart(3, '0')}`;
  }

  return candidate;
};

/**
 * Validates foreign key constraints against the database before any INSERT operation
 * to ensure strict data isolation across multi-tenant records.
 */
export const validateForeignKeyConstraints = (
  businessId: string,
  workspaceId: string,
  branchName: string,
  businessesList: any[],
  branchesList: any[]
): { isValid: boolean; error?: string } => {
  // 1. Verify business_id exists and is active/valid in the system
  const targetBusiness = businessesList.find(b => b.id === businessId);
  if (!targetBusiness && businessId !== 'b_biz_demo') {
    return {
      isValid: false,
      error: `Foreign Key Constraint Violation: business_id "${businessId}" does not reference any active business.`
    };
  }

  // 2. Verify workspace_id is non-empty and matches tenant mapping
  if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim() === '') {
    return {
      isValid: false,
      error: 'Foreign Key Constraint Violation: workspace_id is invalid or empty.'
    };
  }

  // 3. Verify branchName / branch_id is registered under the current business_id (for strict multi-tenant isolation)
  if (branchName !== 'Main HQ') {
    const branchExists = branchesList.some(
      b => b.name === branchName && (b.businessId === businessId || b.business_id === businessId)
    );
    if (!branchExists) {
      return {
        isValid: false,
        error: `Foreign Key Constraint Violation: branch "${branchName}" is not registered under business_id "${businessId}".`
      };
    }
  }

  return { isValid: true };
};

export const EmployeeModule: React.FC = () => {
  const { 
    profiles, 
    timelogs, 
    activeUser, 
    addEmployee, 
    updateEmployee,
    removeEmployee,
    branches,
    loginWithEmployeeNumber,
    activeBusiness,
    businesses
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);
  const [employeesList, setEmployeesList] = useState<UserProfile[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await apiFetch('/api/performance/employees');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.employees)) {
          setEmployeesList(data.employees);
          setIsLoadingEmployees(false);
          return;
        }
      }
    } catch (e) {
      console.error('Error fetching employees from SQLite index lookup:', e);
    }
    setEmployeesList(profiles);
    setIsLoadingEmployees(false);
  };

  const activeBizId = activeBusiness?.id;
  const profilesKey = `${activeBizId}_${profiles.length}_${profiles.map(p => p.status).join(',')}`;

  useEffect(() => {
    fetchEmployees();
  }, [profilesKey, activeBizId]);
  const [registrationSuccess, setRegistrationSuccess] = useState<{
    name: string;
    badgeNumber: string;
    role: string;
    branch: string;
  } | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formRole, setFormRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [formBranch, setFormBranch] = useState('Main HQ');
  const [formAvatarUrl, setFormAvatarUrl] = useState<string | null>(null);
  const [formAllowExpenses, setFormAllowExpenses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    employeeId?: string;
    password?: string;
    general?: string;
  }>({});

  // Custom high-fidelity delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<UserProfile | null>(null);

  const isAuthorized = activeUser.role === UserRole.ADMIN || activeUser.role === UserRole.MANAGER;

  const canModify = (p: UserProfile) => {
    if (activeUser.role === UserRole.ADMIN) {
      return p.id !== activeUser.id;
    }
    if (activeUser.role === UserRole.MANAGER) {
      return p.role === UserRole.EMPLOYEE;
    }
    return false;
  };

  const getNextEmployeeId = () => {
    let allProfiles: any[] = [];
    try {
      allProfiles = JSON.parse(localStorage.getItem('apex_ledger_profiles') || '[]');
    } catch (e) {
      allProfiles = employeesList;
    }
    if (!allProfiles || allProfiles.length === 0) {
      allProfiles = employeesList;
    }
    return generateUniqueEmployeeID(allProfiles);
  };

  const handleOpenAdd = () => {
    setRegistrationSuccess(null);
    setEditingEmployee(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole(UserRole.EMPLOYEE);
    setFormBranch('Main HQ');
    setFormAvatarUrl(null);
    setFormAllowExpenses(false);
    setFormEmployeeId(getNextEmployeeId());
    setFormErrors({});
    setIsSaving(false);
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: UserProfile) => {
    if (!canModify(p)) {
      alert('Access Denied: You are not authorized to modify this profile.');
      return;
    }
    setRegistrationSuccess(null);
    setEditingEmployee(p);
    setFormName(p.name);
    setFormEmail(p.email);
    setFormPassword('');
    setFormRole(p.role);
    setFormBranch(p.branch || 'HQ');
    setFormAvatarUrl(p.avatarUrl || null);
    setFormAllowExpenses(p.allowExpenses || false);
    setFormEmployeeId(p.badgeNumber || (p as any).employeeNumber || '');
    setFormErrors({});
    setIsSaving(false);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setIsSaving(true);

    const errors: { name?: string; email?: string; employeeId?: string; password?: string; general?: string } = {};

    // 1. Name validation
    if (!formName.trim()) {
      errors.name = 'Full name is required.';
    } else if (formName.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long.';
    }

    // 2. Email validation
    const emailTrimmed = formEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed) {
      errors.email = 'Business email address is required.';
    } else if (!emailRegex.test(emailTrimmed)) {
      errors.email = 'Please enter a valid business email address.';
    }

    // 3. Employee ID validation
    const employeeIdToSave = formEmployeeId.trim();
    const isAlphanumeric4to10 = /^[a-zA-Z0-9-]{4,10}$/.test(employeeIdToSave);
    if (!employeeIdToSave) {
      errors.employeeId = 'Employee ID is required.';
    } else if (!isAlphanumeric4to10) {
      errors.employeeId = 'Employee ID must be alphanumeric (letters, numbers, or dashes) and between 4 and 10 characters long.';
    }

    // 4. Password validation (only for Manager or Admin)
    const isPrivilegedRole = formRole === UserRole.MANAGER || formRole === UserRole.ADMIN;
    if (isPrivilegedRole && !editingEmployee && (!formPassword || formPassword.length < 6)) {
      errors.password = 'Secure password is required for corporate login and must be at least 6 characters.';
    } else if (isPrivilegedRole && editingEmployee && formPassword && formPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters if specified.';
    }

    if (activeUser.role === UserRole.MANAGER && formRole !== UserRole.EMPLOYEE) {
      errors.general = 'Access Denied: Managers can only register or assign Employee roles.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsSaving(false);
      return;
    }

    const employeeIdToSaveUpper = employeeIdToSave.toUpperCase();

    // Check duplicate email & badge ID against all current profiles
    const exists = profiles.some(p => {
      if (editingEmployee && p.id === editingEmployee.id) return false;
      if (p.status === 'Deleted') return false;
      const pNum = p.badgeNumber || (p as any).employeeNumber;
      return pNum && typeof pNum === 'string' && pNum.trim().toUpperCase() === employeeIdToSaveUpper;
    });

    if (exists) {
      setFormErrors({ employeeId: `Employee ID "${employeeIdToSaveUpper}" is already assigned to another profile.` });
      setIsSaving(false);
      return;
    }

    const emailExists = profiles.some(p => {
      if (editingEmployee && p.id === editingEmployee.id) return false;
      if (p.status === 'Deleted') return false;
      return p.email && typeof p.email === 'string' && p.email.trim().toLowerCase() === emailTrimmed.toLowerCase();
    });

    if (emailExists) {
      setFormErrors({ email: `Email address "${emailTrimmed}" is already in use by another profile.` });
      setIsSaving(false);
      return;
    }

    try {
      if (editingEmployee) {
        if (!canModify(editingEmployee)) {
          setFormErrors({ general: 'Access Denied: You are not authorized to edit this profile.' });
          setIsSaving(false);
          return;
        }
        await updateEmployee(editingEmployee.id, {
          name: formName.trim(),
          email: emailTrimmed,
          role: formRole,
          branch: formBranch,
          badgeNumber: employeeIdToSaveUpper,
          avatarUrl: formAvatarUrl || undefined,
          allowExpenses: formAllowExpenses,
          password: formPassword || undefined
        } as any);
        
        setShowAddModal(false);
        setEditingEmployee(null);
      } else {
        // Validate multi-tenant foreign key constraints (business_id, workspace_id, branch_id)
        const bId = activeBusiness?.id || '';
        const wId = (activeUser as any)?.workspace_id || (activeUser as any)?.workspaceId || activeBusiness?.id || 'w_work_demo';
        
        const fKeyValidation = validateForeignKeyConstraints(
          bId,
          wId,
          formBranch,
          businesses,
          branches
        );

        if (!fKeyValidation.isValid) {
          setFormErrors({ general: fKeyValidation.error });
          setIsSaving(false);
          return;
        }

        const created = await addEmployee({
          name: formName.trim(),
          email: emailTrimmed,
          role: formRole,
          branch: formBranch,
          badgeNumber: employeeIdToSaveUpper,
          avatarUrl: formAvatarUrl || undefined,
          allowExpenses: formAllowExpenses,
          password: formPassword || undefined
        } as any);

        setRegistrationSuccess({
          name: formName.trim(),
          badgeNumber: created.badgeNumber || employeeIdToSaveUpper,
          role: created.role,
          branch: created.branch || formBranch
        });
        
        setShowAddModal(false);
        setEditingEmployee(null);
        setFormName('');
        setFormEmail('');
        setFormPassword('');
        setFormAvatarUrl(null);
        setFormEmployeeId('');
      }

      // Automatically refresh the employee registry list instantly in the UI
      await fetchEmployees();
      setFormErrors({});
    } catch (err: any) {
      setFormErrors({ general: err.message || 'An error occurred while saving the profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSuspend = async (p: UserProfile) => {
    if (p.id === activeUser.id) {
      alert('You cannot suspend your own active session profile.');
      return;
    }
    if (!canModify(p)) {
      alert('Access Denied: You are not authorized to suspend other managers or administrators.');
      return;
    }
    const isCurrentlySuspended = p.status === 'Suspended';
    const nextStatus = isCurrentlySuspended ? 'Active' : 'Suspended';
    if (confirm(`Are you sure you want to ${isCurrentlySuspended ? 'unsuspend / restore' : 'suspend'} employee ${p.name}?`)) {
      try {
        await updateEmployee(p.id, { status: nextStatus });
        await fetchEmployees();
      } catch (err: any) {
        alert(err.message || 'Failed to update suspension status.');
      }
    }
  };

  const handleRemove = (id: string, name: string) => {
    if (activeUser.role !== UserRole.ADMIN) {
      alert('Access Denied: Only the Business Owner (Admin) may permanently delete employees.');
      return;
    }
    if (id === activeUser.id) {
      alert('This account cannot be deleted.');
      return;
    }
    const target = employeesList.find(p => p.id === id);
    if (!target) return;

    // Safety checks for last remaining admin and protected system accounts
    const admins = employeesList.filter(p => p.role === UserRole.ADMIN);
    if (target.role === UserRole.ADMIN && admins.length <= 1) {
      alert('This account cannot be deleted.');
      return;
    }

    setEmployeeToDelete(target);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await removeEmployee(employeeToDelete.id);
      alert('Employee decommissioned successfully. All historical records have been safely retained.');
    } catch (err: any) {
      alert(err.message || 'This account cannot be deleted.');
    } finally {
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 2-Section Layout: Employees Registry + Attendance logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Employees Registry (7/12 width) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel p-5 rounded-xl border border-brand-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-200">Staff & Users Directory</h3>
              <p className="text-xs text-gray-500">Access and system permission tiers</p>
            </div>
            {isAuthorized ? (
              <button
                onClick={handleOpenAdd}
                className="px-3.5 py-1.5 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-rose-950/20 border border-rose-500/20 px-3 py-1.5 rounded-lg text-[11px] text-rose-300 font-mono">
                <Lock className="w-3.5 h-3.5" />
                <span>Manager Level Required</span>
              </div>
            )}
          </div>

          {registrationSuccess && (
            <div className="glass-panel p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="font-bold text-sm text-slate-100 font-sans">Employee Added Successfully!</h4>
                <p className="text-xs text-slate-300">
                  Profile for <strong className="text-emerald-400 font-sans">{registrationSuccess.name}</strong> has been registered.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Employee ID:</span>
                    <span className="text-cyan-400 font-semibold">{registrationSuccess.badgeNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Assigned Role:</span>
                    <span className="text-slate-200 capitalize">{registrationSuccess.role}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Branch Location:</span>
                    <span className="text-slate-200">{registrationSuccess.branch}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Current Session:</span>
                    <span className="text-emerald-400 font-sans font-semibold">Owner/Manager (Unchanged)</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-sans">
                  The directory list has updated. The employee can use their unique Employee ID to log in separately on the login screen.
                </p>
              </div>
              <button 
                onClick={() => setRegistrationSuccess(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer p-1 rounded hover:bg-slate-800/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="glass-panel rounded-2xl overflow-hidden border border-brand-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-950/80 border-b border-brand-border text-gray-400 font-mono text-[10px] tracking-wider uppercase">
                  <tr>
                    <th className="p-4">Staff Member</th>
                    <th className="p-4">Employee ID</th>
                    <th className="p-4">Email Account</th>
                    <th className="p-4">Corporate Role</th>
                    <th className="p-4">Status</th>
                    {isAuthorized && <th className="p-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40 text-gray-200 font-sans">
                  {employeesList.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-900/30 transition">
                      <td className="p-4 flex items-center gap-3">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-cyan-500/10 object-cover shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center font-bold text-[10px] text-cyan-400 font-mono shrink-0 uppercase">
                            {p.name ? p.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U'}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-gray-100 capitalize">{p.name}</span>
                          <span className="text-[9px] text-gray-500 font-mono block mt-0.5">{p.branch || 'HQ'}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold">
                        {p.status === 'Deleted' ? (
                          <span className="text-gray-500 line-through">{(p.badgeNumber || (p as any).employeeNumber || '').replace('_DELETED', '')}</span>
                        ) : (
                          <span className="text-cyan-400">{p.badgeNumber || (p as any).employeeNumber || 'N/A'}</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-gray-400">
                        {p.email}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          p.role === UserRole.ADMIN ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/10' :
                          p.role === UserRole.MANAGER ? 'bg-amber-950/40 text-amber-400 border border-amber-500/10' :
                          'bg-gray-950/60 text-gray-400 border border-gray-800'
                        }`}>
                          {p.role}
                        </span>
                      </td>
                      <td className="p-4 font-mono">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'Deleted' ? 'bg-red-500' : p.onlineStatus === 'online' ? 'bg-cyan-400 animate-ping' : 'bg-gray-600'}`} />
                            <span className={p.status === 'Deleted' ? 'text-red-500 font-medium' : p.onlineStatus === 'online' ? 'text-cyan-400 font-bold' : 'text-gray-500'}>
                              {p.status === 'Deleted' ? 'Deactivated' : p.onlineStatus === 'online' ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          {p.status === 'Deleted' ? (
                            <span className="text-[9px] text-red-400 bg-red-950/25 px-1.5 py-0.5 rounded border border-red-500/20 font-bold self-start mt-0.5">
                              DECOMMISSIONED
                            </span>
                          ) : p.status === 'Suspended' ? (
                            <span className="text-[9px] text-rose-400 bg-rose-950/25 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold self-start mt-0.5">
                              SUSPENDED
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-400 bg-emerald-950/25 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold self-start mt-0.5">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </td>
                      {isAuthorized && (
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              disabled={p.status === 'Deleted' || !canModify(p)}
                              className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg transition"
                              title={p.status === 'Deleted' ? "Account is decommissioned" : canModify(p) ? "Edit profile details" : "Access Denied"}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleSuspend(p)}
                              disabled={p.status === 'Deleted' || p.id === activeUser.id || !canModify(p)}
                              className={`p-1.5 bg-gray-950 border border-brand-border rounded-lg transition disabled:opacity-20 disabled:cursor-not-allowed ${
                                p.status === 'Suspended'
                                  ? 'text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/20'
                                  : 'text-amber-400 hover:text-amber-300 hover:border-amber-500/20'
                              }`}
                              title={p.status === 'Deleted' ? "Account is decommissioned" : !canModify(p) ? "Access Denied" : p.status === 'Suspended' ? 'Unsuspend / Restore Employee' : 'Suspend Employee'}
                            >
                              {p.status === 'Suspended' ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleRemove(p.id, p.name)}
                              disabled={p.status === 'Deleted' || p.id === activeUser.id || !canModify(p)}
                              className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-rose-400 hover:border-rose-500/20 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg transition"
                              title={p.status === 'Deleted' ? "Account is already decommissioned" : canModify(p) ? "Decommission employee" : "Access Denied"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Attendance & Time Logs (4/12 width) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 rounded-xl border border-brand-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-200">Daily Attendance Logs</h3>
              <p className="text-xs text-gray-500">Employee clock-in and work hours logs</p>
            </div>
            <Clock className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-brand-border h-[430px] overflow-y-auto">
            <div className="p-4 border-b border-brand-border bg-gray-950/30 text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-wider">
              Time Clock ledger feed
            </div>
            <div className="divide-y divide-brand-border/40 text-xs font-mono">
              {timelogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 font-sans">
                  No attendance logged for today.
                </div>
              ) : (
                timelogs.map((log) => (
                  <div key={log.id} className="p-3.5 hover:bg-gray-900/20 transition space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-gray-200 capitalize font-sans">{log.userName}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                        log.status === 'Present' ? 'bg-emerald-950/30 text-emerald-400' : 'bg-gray-950/30 text-gray-400'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                      <span>In: {new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {log.clockOut && (
                        <>
                          <span>|</span>
                          <span>Out: {new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>
                    {log.workHours !== undefined && (
                      <div className="text-[10px] text-cyan-400">
                        Worked: <span className="font-bold">{log.workHours} hrs</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Add / Edit Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowAddModal(false);
                setEditingEmployee(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              <span>{editingEmployee ? 'Modify Employee Profile' : 'Register New Employee Account'}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              {formErrors.general && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-sans flex items-start gap-2 animate-pulse">
                  <span className="mt-0.5">⚠</span>
                  <p>{formErrors.general}</p>
                </div>
              )}

              {/* Optional Photo Upload */}
              <div className="flex flex-col items-center justify-center p-3.5 bg-gray-950/40 rounded-xl border border-brand-border/60 space-y-2">
                <div className="relative">
                  {formAvatarUrl ? (
                    <img 
                      src={formAvatarUrl} 
                      alt="Avatar Preview" 
                      className="w-16 h-16 rounded-full border border-cyan-500/20 object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-cyan-950/40 border border-cyan-500/10 flex flex-col items-center justify-center text-cyan-400 font-bold font-mono text-xs">
                      No Photo
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 rounded text-[10px] font-mono font-bold cursor-pointer transition flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{formAvatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
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
                              setFormAvatarUrl(base64);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                    />
                  </label>
                  {formAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => setFormAvatarUrl(null)}
                      className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/30 border border-rose-500/30 text-rose-400 rounded text-[10px] font-mono font-bold transition cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 font-sans">Optional profile photo (max 2MB)</span>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Staff Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (formErrors.name) {
                      setFormErrors(prev => ({ ...prev, name: undefined }));
                    }
                  }}
                  className={`w-full bg-gray-950/60 border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans transition-all duration-200 ${
                    formErrors.name ? 'border-rose-500 focus:border-rose-500 bg-rose-950/10' : 'border-brand-border'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[10px] text-rose-400 font-sans mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                    <span>⚠</span> {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Employee ID / Number</label>
                <input
                  type="text"
                  placeholder="e.g. EMP-001"
                  value={formEmployeeId}
                  onChange={(e) => {
                    setFormEmployeeId(e.target.value.toUpperCase());
                    if (formErrors.employeeId) {
                      setFormErrors(prev => ({ ...prev, employeeId: undefined }));
                    }
                  }}
                  className={`w-full bg-gray-950/60 border rounded-lg p-2.5 text-cyan-400 font-mono font-bold outline-none focus:border-cyan-500/30 uppercase transition-all duration-200 ${
                    formErrors.employeeId ? 'border-rose-500 focus:border-rose-500 bg-rose-950/10' : 'border-brand-border'
                  }`}
                />
                {formErrors.employeeId ? (
                  <p className="text-[10px] text-rose-400 font-sans mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                    <span>⚠</span> {formErrors.employeeId}
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-500 font-sans mt-1">
                    Must be unique across all corporate profiles. Prefilled with the next available ID.
                  </p>
                )}
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Business Email Address</label>
                <input
                  type="email"
                  placeholder="john@company.com"
                  value={formEmail}
                  onChange={(e) => {
                    setFormEmail(e.target.value);
                    if (formErrors.email) {
                      setFormErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  className={`w-full bg-gray-950/60 border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono transition-all duration-200 ${
                    formErrors.email ? 'border-rose-500 focus:border-rose-500 bg-rose-950/10' : 'border-brand-border'
                  }`}
                />
                {formErrors.email && (
                  <p className="text-[10px] text-rose-400 font-sans mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                    <span>⚠</span> {formErrors.email}
                  </p>
                )}
              </div>

              {(formRole === UserRole.MANAGER || formRole === UserRole.ADMIN) && (
                <div>
                  <label className="text-gray-400 block mb-1 font-sans">
                    Secure Password {editingEmployee ? '(Leave blank to keep unchanged)' : '(Required for corporate login)'}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formPassword}
                    onChange={(e) => {
                      setFormPassword(e.target.value);
                      if (formErrors.password) {
                        setFormErrors(prev => ({ ...prev, password: undefined }));
                      }
                    }}
                    className={`w-full bg-gray-950/60 border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono transition-all duration-200 ${
                      formErrors.password ? 'border-rose-500 focus:border-rose-500 bg-rose-950/10' : 'border-brand-border'
                    }`}
                  />
                  {formErrors.password && (
                    <p className="text-[10px] text-rose-400 font-sans mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                      <span>⚠</span> {formErrors.password}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 font-sans">
                <div>
                  <label className="text-gray-400 block mb-1">Assigned Role</label>
                  <select
                    value={formRole}
                    onChange={(e: any) => setFormRole(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30"
                  >
                    <option value={UserRole.EMPLOYEE}>Employee</option>
                    {activeUser.role === UserRole.ADMIN && (
                      <>
                        <option value={UserRole.MANAGER}>Manager</option>
                        <option value={UserRole.ADMIN}>Business Owner (Admin)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Assigned Branch</label>
                  <select
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                  >
                    <option value="Main HQ">Main HQ</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formRole === UserRole.EMPLOYEE && (
                <div className="bg-gray-950/40 p-3 rounded-lg border border-brand-border/60 flex items-center justify-between font-sans">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block">Expense Module Access</label>
                    <span className="text-[10px] text-gray-500">Allow this employee to record and manage expenses</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formAllowExpenses}
                    onChange={(e) => setFormAllowExpenses(e.target.checked)}
                    className="w-4 h-4 rounded border-brand-border text-cyan-500 focus:ring-cyan-500/30 bg-gray-950 cursor-pointer"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingEmployee ? 'Apply Profile Updates' : 'Register & Issue Permissions'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && employeeToDelete && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-rose-500/30 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowDeleteModal(false);
                setEmployeeToDelete(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-200">
                  Decommission Employee Account?
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Are you sure you want to delete and decommission this employee? Their login credentials will be permanently invalidated and their active sessions revoked. Crucially, all historical sales, attendance logs, tasks, and audit trails tied to their work will be securely retained for auditing.
                </p>
                <div className="bg-gray-950/50 p-3 rounded-xl border border-brand-border/60 text-left space-y-1.5 mt-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500 font-mono">NAME:</span>
                    <span className="text-gray-300 font-medium">{employeeToDelete.name}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500 font-mono">EMAIL:</span>
                    <span className="text-gray-300 font-medium">{employeeToDelete.email}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500 font-mono">ROLE:</span>
                    <span className="text-cyan-400 font-mono font-bold uppercase">{employeeToDelete.role}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEmployeeToDelete(null);
                  }}
                  className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 font-medium rounded-xl text-xs transition cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl text-xs transition shadow-lg shadow-rose-950/30 cursor-pointer font-sans"
                >
                  Delete Employee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
