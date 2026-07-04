import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, UserProfile } from '../types';
import { Users, Plus, UserPlus, Clock, Trash2, Shield, X, Lock, Edit, Ban, Check, Camera } from 'lucide-react';

export const EmployeeModule: React.FC = () => {
  const { 
    profiles, 
    timelogs, 
    activeUser, 
    addEmployee, 
    updateEmployee,
    removeEmployee,
    branches
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [formBranch, setFormBranch] = useState('Main HQ');
  const [formAvatarUrl, setFormAvatarUrl] = useState<string | null>(null);

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

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormName('');
    setFormEmail('');
    setFormRole(UserRole.EMPLOYEE);
    setFormBranch('Main HQ');
    setFormAvatarUrl(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: UserProfile) => {
    if (!canModify(p)) {
      alert('Access Denied: You are not authorized to modify this profile.');
      return;
    }
    setEditingEmployee(p);
    setFormName(p.name);
    setFormEmail(p.email);
    setFormRole(p.role);
    setFormBranch(p.branch || 'HQ');
    setFormAvatarUrl(p.avatarUrl || null);
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;

    if (activeUser.role === UserRole.MANAGER && formRole !== UserRole.EMPLOYEE) {
      alert('Access Denied: Managers can only register or assign Employee roles.');
      return;
    }

    if (editingEmployee) {
      if (!canModify(editingEmployee)) {
        alert('Access Denied: You are not authorized to edit this profile.');
        return;
      }
      updateEmployee(editingEmployee.id, {
        name: formName,
        email: formEmail,
        role: formRole,
        branch: formBranch,
        avatarUrl: formAvatarUrl || undefined
      });
      alert(`Employee profile: "${formName}" successfully updated!`);
    } else {
      addEmployee({
        name: formName,
        email: formEmail,
        role: formRole,
        branch: formBranch,
        avatarUrl: formAvatarUrl || undefined
      });
      alert(`Employee profile: "${formName}" successfully registered and issued credentials!`);
    }

    setShowAddModal(false);
    setEditingEmployee(null);
    setFormName('');
    setFormEmail('');
    setFormAvatarUrl(null);
  };

  const handleToggleSuspend = (p: UserProfile) => {
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
      updateEmployee(p.id, { status: nextStatus });
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
    const target = profiles.find(p => p.id === id);
    if (!target) return;

    // Safety checks for last remaining admin and protected system accounts
    const admins = profiles.filter(p => p.role === UserRole.ADMIN);
    if (target.role === UserRole.ADMIN && admins.length <= 1) {
      alert('This account cannot be deleted.');
      return;
    }
    if (id === 'u1') {
      alert('This account cannot be deleted.');
      return;
    }

    setEmployeeToDelete(target);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!employeeToDelete) return;
    try {
      removeEmployee(employeeToDelete.id);
      alert('Employee deleted successfully.');
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

          <div className="glass-panel rounded-2xl overflow-hidden border border-brand-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-950/80 border-b border-brand-border text-gray-400 font-mono text-[10px] tracking-wider uppercase">
                  <tr>
                    <th className="p-4">Staff Member</th>
                    <th className="p-4">Email Account</th>
                    <th className="p-4">Corporate Role</th>
                    <th className="p-4">Status</th>
                    {isAuthorized && <th className="p-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40 text-gray-200 font-sans">
                  {profiles.map((p) => (
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
                            <span className={`w-1.5 h-1.5 rounded-full ${p.onlineStatus === 'online' ? 'bg-cyan-400 animate-ping' : 'bg-gray-600'}`} />
                            <span className={p.onlineStatus === 'online' ? 'text-cyan-400 font-bold' : 'text-gray-500'}>
                              {p.onlineStatus === 'online' ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          {p.status === 'Suspended' ? (
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
                              disabled={!canModify(p)}
                              className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg transition"
                              title={canModify(p) ? "Edit profile details" : "Access Denied: Managers cannot edit other managers or admins"}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleSuspend(p)}
                              disabled={p.id === activeUser.id || !canModify(p)}
                              className={`p-1.5 bg-gray-950 border border-brand-border rounded-lg transition disabled:opacity-20 disabled:cursor-not-allowed ${
                                p.status === 'Suspended'
                                  ? 'text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/20'
                                  : 'text-amber-400 hover:text-amber-300 hover:border-amber-500/20'
                              }`}
                              title={!canModify(p) ? "Access Denied" : p.status === 'Suspended' ? 'Unsuspend / Restore Employee' : 'Suspend Employee'}
                            >
                              {p.status === 'Suspended' ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleRemove(p.id, p.name)}
                              disabled={activeUser.role !== UserRole.ADMIN || p.id === activeUser.id}
                              className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-rose-400 hover:border-rose-500/20 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg transition"
                              title={activeUser.role === UserRole.ADMIN ? (p.id === activeUser.id ? "Cannot delete yourself" : "Delete profile") : "Access Denied: Only Business Owner (Admin) can permanently delete employees"}
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
                  required
                  placeholder="e.g. John Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Business Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="john@company.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                />
              </div>

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

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition"
              >
                {editingEmployee ? 'Apply Profile Updates' : 'Register & Issue Permissions'}
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
                  Permanently Delete Employee?
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Are you sure you want to permanently delete this employee? This will permanently remove their profile, role assignments, attendance records, and active sessions. This action is irreversible.
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
