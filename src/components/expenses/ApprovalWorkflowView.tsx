import React, { useState } from 'react';
import { Check, X, ShieldAlert, FileText, ClipboardList, UserCheck, MessageSquare, AlertTriangle } from 'lucide-react';
import { formatKSh } from '../../lib/utils';
import { Expense, UserRole, UserProfile } from '../../types';

interface ApprovalWorkflowViewProps {
  expenses: Expense[];
  activeUser: UserProfile;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  addAudit: (action: string, oldVal: string, newVal: string) => void;
}

export const ApprovalWorkflowView: React.FC<ApprovalWorkflowViewProps> = ({
  expenses,
  activeUser,
  updateExpense,
  addAudit
}) => {
  const [comment, setComment] = useState('');
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  // Find expenses that require action (status is Submitted, Pending Approval, or Draft requiring submission)
  const pendingApprovals = expenses.filter(e => e.status === 'Submitted' || e.status === 'Pending Approval');

  const getWorkflowRequirements = (amount: number) => {
    if (amount < 10000) {
      return { level: 'Manager Approval Required', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20' };
    } else if (amount <= 50000) {
      return { level: 'Owner Approval Required', color: 'text-amber-400 border-amber-500/20 bg-amber-950/20' };
    } else {
      return { level: 'Dual Approval Required (Manager + Owner)', color: 'text-rose-400 border-rose-500/20 bg-rose-950/20' };
    }
  };

  const handleApprove = (exp: Expense) => {
    const isOwner = activeUser.role === UserRole.ADMIN;
    const isManager = activeUser.role === UserRole.MANAGER;
    const amount = exp.amount;

    if (!isOwner && !isManager) {
      alert('Permission Denied: Only Managers and Owners can approve expenses.');
      return;
    }

    let newStatus: Expense['status'] = 'Approved';
    let commentText = comment.trim() || 'Approved via web console.';

    const approvalHistory = exp.approvalHistory ? [...exp.approvalHistory] : [];

    if (amount > 50000) {
      // Dual Approval Check
      const hasManagerApproval = approvalHistory.some(h => h.approverRole === UserRole.MANAGER && h.action === 'Approved');
      const hasOwnerApproval = approvalHistory.some(h => h.approverRole === UserRole.ADMIN && h.action === 'Approved');

      if (isManager && !hasManagerApproval) {
        approvalHistory.push({
          approverName: activeUser.name,
          approverRole: activeUser.role,
          action: 'Approved (1st level)',
          date: new Date().toISOString().split('T')[0],
          comment: commentText
        });
        // If owner hasn't approved, keep as Pending Approval
        newStatus = hasOwnerApproval ? 'Approved' : 'Pending Approval';
      } else if (isOwner && !hasOwnerApproval) {
        approvalHistory.push({
          approverName: activeUser.name,
          approverRole: activeUser.role,
          action: 'Approved (Dual check)',
          date: new Date().toISOString().split('T')[0],
          comment: commentText
        });
        newStatus = hasManagerApproval ? 'Approved' : 'Pending Approval';
      } else {
        alert('You have already approved this stage of the dual workflow.');
        return;
      }
    } else if (amount >= 10000 && !isOwner) {
      // 10,000 to 50,000 requires Owner Approval
      alert('Permission Denied: Amounts exceeding KSh 10,000 require Owner (Admin) approval.');
      return;
    } else {
      // Standard approval for under 10k by Manager or Owner
      approvalHistory.push({
        approverName: activeUser.name,
        approverRole: activeUser.role,
        action: 'Approved',
        date: new Date().toISOString().split('T')[0],
        comment: commentText
      });
      newStatus = 'Approved';
    }

    updateExpense(exp.id, {
      status: newStatus,
      approvalHistory
    });

    addAudit(
      'Approved Expense Request',
      `ID: ${exp.id} | Status: ${exp.status}`,
      `Status: ${newStatus} | Approver: ${activeUser.name} (${activeUser.role})`
    );

    setComment('');
    setSelectedExpenseId(null);
  };

  const handleReject = (exp: Expense) => {
    if (activeUser.role === UserRole.EMPLOYEE) {
      alert('Permission Denied: Employees cannot reject expenses.');
      return;
    }

    if (!comment.trim()) {
      alert('Reason Required: Please enter a reason/comment for rejecting this expenditure.');
      return;
    }

    const approvalHistory = exp.approvalHistory ? [...exp.approvalHistory] : [];
    approvalHistory.push({
      approverName: activeUser.name,
      approverRole: activeUser.role,
      action: 'Rejected',
      date: new Date().toISOString().split('T')[0],
      comment: comment.trim()
    });

    updateExpense(exp.id, {
      status: 'Rejected',
      approvalHistory
    });

    addAudit(
      'Rejected Expense Request',
      `ID: ${exp.id} | Status: ${exp.status}`,
      `Status: Rejected | Rejector: ${activeUser.name} (${activeUser.role}) | Reason: ${comment.trim()}`
    );

    setComment('');
    setSelectedExpenseId(null);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      <div>
        <h4 className="text-xs font-bold text-gray-200 font-sans flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-cyan-400" />
          <span>PENDING CORPORATE APPROVALS ({pendingApprovals.length})</span>
        </h4>
        <p className="text-[10px] text-gray-500 font-sans">Review pending business expenditure claims against dual corporate thresholds.</p>
      </div>

      {pendingApprovals.length === 0 ? (
        <div className="glass-panel p-6 rounded-xl border border-brand-border/40 text-center text-gray-500 font-sans">
          No pending expense items awaiting approval. Excellent budget compliance!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* List panel */}
          <div className="lg:col-span-2 space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {pendingApprovals.map((exp) => {
              const req = getWorkflowRequirements(exp.amount);
              return (
                <div
                  key={exp.id}
                  onClick={() => {
                    setSelectedExpenseId(exp.id);
                    setComment('');
                  }}
                  className={`glass-panel p-3.5 rounded-xl border transition text-left cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${
                    selectedExpenseId === exp.id
                      ? 'border-cyan-500/40 bg-cyan-950/5'
                      : 'border-brand-border/40 hover:border-cyan-500/20'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-200 text-xs font-sans capitalize">{exp.vendorName || 'General Vendor'}</span>
                      <span className="px-2 py-0.2 bg-gray-950 border border-brand-border text-[9px] text-gray-400 rounded">
                        {exp.category}
                      </span>
                    </div>
                    <p className="text-gray-400 line-clamp-1 text-[11px] font-sans">{exp.description}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-gray-500">
                      <span>Logged: {exp.date}</span>
                      <span>•</span>
                      <span>By: {exp.recordedBy}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.1 border rounded text-[9px] ${req.color}`}>
                        {req.level}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-rose-400 font-bold text-sm">{formatKSh(exp.amount)}</p>
                    <span className="text-[10px] text-gray-500 block">Status: {exp.status}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-1">
            {selectedExpenseId ? (
              (() => {
                const exp = expenses.find(e => e.id === selectedExpenseId);
                if (!exp) return null;
                const req = getWorkflowRequirements(exp.amount);

                return (
                  <div className="glass-panel p-4 rounded-xl border border-brand-border space-y-4 animate-in fade-in duration-200">
                    <div className="border-b border-brand-border/60 pb-3">
                      <span className="text-[10px] text-gray-500 uppercase">ACTION DETAILS</span>
                      <h4 className="font-bold text-gray-200 text-xs font-sans">{exp.vendorName || 'No Vendor'}</h4>
                      <p className="text-rose-400 font-bold text-sm mt-1">{formatKSh(exp.amount)}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Department:</span>
                        <span className="text-gray-300 capitalize">{exp.department || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Invoice Ref:</span>
                        <span className="text-gray-300 font-mono">{exp.invoiceNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tax Breakdown:</span>
                        <span className="text-gray-300">{exp.taxAmount ? `${formatKSh(exp.taxAmount)}` : '0.00 KSh'}</span>
                      </div>
                      <div className="bg-gray-950/60 border border-brand-border/40 p-2 rounded text-[10px] space-y-1">
                        <p className="text-gray-500 font-sans">MEMO NOTE:</p>
                        <p className="text-gray-300 font-sans leading-relaxed">{exp.description}</p>
                      </div>
                    </div>

                    {/* WorkFlow Indicator */}
                    <div className="p-3 bg-gray-950/60 border border-brand-border/60 rounded-xl space-y-1.5">
                      <span className="text-[9px] text-gray-500 block uppercase tracking-wider font-sans font-bold">APPROVAL HISTORY</span>
                      {exp.approvalHistory && exp.approvalHistory.length > 0 ? (
                        <div className="space-y-1.5 divide-y divide-brand-border/30">
                          {exp.approvalHistory.map((h, i) => (
                            <div key={i} className="text-[10px] pt-1.5 space-y-0.5">
                              <div className="flex justify-between text-gray-300">
                                <span className="font-bold">{h.approverName} ({h.approverRole.split(' ')[0]})</span>
                                <span className="text-cyan-400 font-sans text-[9px]">{h.action}</span>
                              </div>
                              <p className="text-gray-500 font-sans italic">"{h.comment}"</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-600 italic text-[10px] font-sans">No verification actions logged yet.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-gray-500 block text-[10px] uppercase">Approver comment / rejection reason</label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="e.g. Budget approved for transport. Approved."
                        className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-sans text-[11px]"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleReject(exp)}
                        className="flex-1 py-2 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-500/30 text-rose-400 font-sans font-bold rounded-lg transition"
                      >
                        <X className="w-3.5 h-3.5 inline mr-1" />
                        <span>Reject</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(exp)}
                        className="flex-1 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 font-sans font-bold rounded-lg transition"
                      >
                        <Check className="w-3.5 h-3.5 inline mr-1" />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="glass-panel p-6 rounded-xl border border-brand-border/40 text-center text-gray-600 h-full flex flex-col items-center justify-center space-y-2 font-sans">
                <ClipboardList className="w-8 h-8 text-gray-700" />
                <p>Select a pending expense claim from the list to approve or reject with audit trail comments.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
