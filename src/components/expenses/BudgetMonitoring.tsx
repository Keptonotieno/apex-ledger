import React, { useState, useEffect } from 'react';
import { ShieldAlert, TrendingUp, Sparkles, DollarSign, Edit3, Check, Scale } from 'lucide-react';
import { formatKSh } from '../../lib/utils';
import { Expense } from '../../types';

export interface Budget {
  department: string;
  allocated: number;
}

export interface Budget {
  department: string;
  allocated: number;
}

interface BudgetMonitoringProps {
  businessId: string;
  expenses: Expense[];
  onAlertTriggered?: (alerts: string[]) => void;
}

export const BudgetMonitoring: React.FC<BudgetMonitoringProps> = ({ businessId, expenses, onAlertTriggered }) => {
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editAllocation, setEditAllocation] = useState(0);

  useEffect(() => {
    // 1. Load departments
    const depKey = `apex_ledger_departments_${businessId}`;
    const storedDeps = localStorage.getItem(depKey);
    let activeDeps: { id: string; name: string }[] = [];
    if (storedDeps) {
      try {
        activeDeps = JSON.parse(storedDeps);
      } catch (e) {
        activeDeps = [];
      }
    }
    setDepartments(activeDeps);

    // 2. Load budgets or initialize them based on active departments
    const budgetKey = `apex_ledger_budgets_${businessId}`;
    const storedBudgets = localStorage.getItem(budgetKey);
    let loadedBudgets: Budget[] = [];
    if (storedBudgets) {
      try {
        loadedBudgets = JSON.parse(storedBudgets);
      } catch (e) {
        loadedBudgets = [];
      }
    }

    // Filter budgets to only contain active departments
    // And add any missing active departments with 0 allocation
    const synchronizedBudgets = activeDeps.map(d => {
      const existing = loadedBudgets.find(b => b.department.toLowerCase() === d.name.toLowerCase());
      return {
        department: d.name,
        allocated: existing ? existing.allocated : 0
      };
    });

    setBudgets(synchronizedBudgets);
  }, [businessId]);

  const saveBudgets = (updated: Budget[]) => {
    localStorage.setItem(`apex_ledger_budgets_${businessId}`, JSON.stringify(updated));
    setBudgets(updated);
  };

  // Compute actual spent per department dynamically from active expenses!
  const computedBudgets = budgets.map(b => {
    // Sum expenses matching this department
    const spent = expenses
      .filter(e => e.department?.toLowerCase() === b.department.toLowerCase() && e.status !== 'Draft' && e.status !== 'Rejected')
      .reduce((sum, e) => sum + e.amount, 0);

    const pct = b.allocated > 0 ? (spent / b.allocated) * 100 : 0;
    return {
      ...b,
      spent,
      remaining: b.allocated - spent,
      percentage: pct
    };
  });

  // Check alerts and trigger up callback
  useEffect(() => {
    const activeAlerts: string[] = [];
    computedBudgets.forEach(cb => {
      if (cb.percentage >= 100) {
        activeAlerts.push(`CRITICAL OVERSPEND: Department "${cb.department}" has exceeded its budget! (${cb.percentage.toFixed(0)}% utilized)`);
      } else if (cb.percentage >= 90) {
        activeAlerts.push(`CRITICAL BUDGET ALERT: "${cb.department}" is at ${cb.percentage.toFixed(0)}% utilization!`);
      } else if (cb.percentage >= 80) {
        activeAlerts.push(`WARNING: "${cb.department}" budget is ${cb.percentage.toFixed(0)}% consumed.`);
      }
    });
    if (onAlertTriggered && activeAlerts.length > 0) {
      onAlertTriggered(activeAlerts);
    }
  }, [expenses, budgets]);

  const handleStartEdit = (dept: string, allocated: number) => {
    setEditingDept(dept);
    setEditAllocation(allocated);
  };

  const handleSaveEdit = (dept: string) => {
    const updated = budgets.map(b => {
      if (b.department === dept) {
        return { ...b, allocated: Number(editAllocation) };
      }
      return b;
    });
    saveBudgets(updated);
    setEditingDept(null);
  };

  if (departments.length === 0) {
    return (
      <div className="space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-gray-200 font-sans flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>DEPARTMENTAL BUDGET MONITORING</span>
            </h4>
            <p className="text-[10px] text-gray-500 font-sans">Compare pre-allocated department limits against actual live expenditure.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-brand-border/40 rounded-xl bg-gray-950/20">
          <ShieldAlert className="w-6 h-6 text-rose-500 mb-2 animate-pulse" />
          <div className="text-[10px] font-bold text-rose-400 font-mono uppercase tracking-wider">No departments available. Please create one first.</div>
          <p className="text-[10px] text-gray-500 mt-1 font-sans">
            Configure department entities with dynamic budget quotas under Department Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-gray-200 font-sans flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>DEPARTMENTAL BUDGET MONITORING</span>
          </h4>
          <p className="text-[10px] text-gray-500 font-sans">Compare pre-allocated department limits against actual live expenditure.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {computedBudgets.map((b) => {
          let progressColor = 'bg-cyan-500 glow-cyan';
          let textColor = 'text-cyan-400';
          let borderStyle = 'border-brand-border/40';
          let alertLabel = '';

          if (b.percentage >= 100) {
            progressColor = 'bg-rose-500 glow-rose animate-pulse';
            textColor = 'text-rose-500 font-bold';
            borderStyle = 'border-rose-500/30 bg-rose-950/5';
            alertLabel = 'OVERSPENT';
          } else if (b.percentage >= 90) {
            progressColor = 'bg-rose-600';
            textColor = 'text-rose-400 font-semibold';
            borderStyle = 'border-rose-500/20';
            alertLabel = 'CRITICAL (90%+)';
          } else if (b.percentage >= 80) {
            progressColor = 'bg-amber-500';
            textColor = 'text-amber-400 font-semibold';
            borderStyle = 'border-amber-500/20';
            alertLabel = 'WARNING (80%+)';
          }

          return (
            <div key={b.department} className={`glass-panel p-4 rounded-xl border ${borderStyle} transition space-y-3`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-sans font-semibold">{b.department}</span>
                  {alertLabel && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] border ${
                      b.percentage >= 100 ? 'bg-rose-950/40 border-rose-500/30 text-rose-500' : 'bg-amber-950/40 border-amber-500/30 text-amber-500'
                    }`}>
                      {alertLabel}
                    </span>
                  )}
                </div>
                {editingDept === b.department ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={editAllocation}
                      onChange={(e) => setEditAllocation(Number(e.target.value))}
                      className="w-20 bg-gray-950 border border-cyan-500/40 rounded px-1.5 py-0.5 text-[10px] text-gray-200 font-bold"
                    />
                    <button
                      onClick={() => handleSaveEdit(b.department)}
                      className="p-1 bg-green-950 text-green-400 border border-green-500/20 rounded hover:bg-green-900 transition"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartEdit(b.department, b.allocated)}
                    className="p-1 bg-gray-950/80 hover:bg-gray-900 border border-brand-border text-gray-500 hover:text-cyan-400 rounded transition"
                    title="Adjust Allocation"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-end justify-between font-mono">
                <div>
                  <span className="text-[10px] text-gray-500 block">SPENT / ALLOCATED</span>
                  <p className="text-gray-200 font-bold">
                    {formatKSh(b.spent)} <span className="text-gray-500 text-[10px] font-normal">/ {formatKSh(b.allocated)}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">UTILIZATION</span>
                  <span className={`${textColor} text-xs font-bold`}>{b.percentage.toFixed(0)}%</span>
                </div>
              </div>

              {/* Progress bar container */}
              <div className="w-full bg-gray-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${progressColor}`}
                  style={{ width: `${Math.min(100, b.percentage)}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-[10px] text-gray-500 pt-0.5">
                <span>Remaining: {formatKSh(b.remaining)}</span>
                <span>{b.remaining < 0 ? 'Over Limit!' : 'Within Budget'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
