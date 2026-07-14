import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { Building, TrendingUp, DollarSign, Layers, Award, Percent } from 'lucide-react';
import { Sale, Expense, Branch } from '../../types';

interface BranchComparisonProps {
  sales: Sale[];
  expenses: Expense[];
  branches: Branch[];
  formatKSh: (amount: number) => string;
}

export const BranchComparisonSection: React.FC<BranchComparisonProps> = ({
  sales,
  expenses,
  branches,
  formatKSh
}) => {
  // Aggregate sales & expenses per branch
  const branchMetrics = useMemo(() => {
    // We always define a default Main HQ if the list is empty
    const activeBranches = branches.length > 0 ? branches : [{ id: 'hq', name: 'Main HQ', location: 'Default' }];
    
    return activeBranches.map(branch => {
      // Filter sales belonging to this branch
      // Sales might match branch.id directly or match branch.name (or fallback to HQ if cashier branch isn't tagged)
      const bSales = sales.filter(s => {
        // Match by branchId or standard check
        const saleBranchId = (s as any).branchId || (s as any).branch_id;
        if (saleBranchId) {
          return saleBranchId === branch.id;
        }
        // Fallback checks
        if (branch.id === 'hq') {
          return !saleBranchId;
        }
        return false;
      });

      const bExpenses = expenses.filter(e => {
        const expBranchId = (e as any).branchId || (e as any).branch_id || e.branch;
        if (expBranchId) {
          return expBranchId === branch.id || expBranchId === branch.name;
        }
        if (branch.id === 'hq') {
          return !expBranchId;
        }
        return false;
      });

      const totalSales = bSales.reduce((acc, curr) => acc + curr.netAmount, 0);
      const totalExpenses = bExpenses.reduce((acc, curr) => acc + curr.amount, 0);
      const netProfit = totalSales - totalExpenses;
      const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
      const transactionsCount = bSales.length;

      return {
        id: branch.id,
        name: branch.name,
        location: (branch as any).location || 'HQ',
        sales: totalSales,
        expenses: totalExpenses,
        profit: netProfit,
        margin: profitMargin,
        txCount: transactionsCount
      };
    });
  }, [sales, expenses, branches]);

  // Aggregate totals
  const aggregates = useMemo(() => {
    const salesSum = branchMetrics.reduce((acc, b) => acc + b.sales, 0);
    const expensesSum = branchMetrics.reduce((acc, b) => acc + b.expenses, 0);
    const profitSum = salesSum - expensesSum;

    // Rank branches to find top performer
    const sorted = [...branchMetrics].sort((a, b) => b.profit - a.profit);
    const topBranch = sorted[0]?.sales > 0 || sorted[0]?.profit > 0 ? sorted[0] : null;

    // Variance
    const profits = branchMetrics.map(b => b.profit);
    const maxProfit = Math.max(...profits, 0);
    const minProfit = Math.min(...profits, 0);
    const variance = maxProfit - minProfit;

    return {
      salesSum,
      expensesSum,
      profitSum,
      topBranch,
      variance,
      count: branchMetrics.length
    };
  }, [branchMetrics]);

  // Chart data
  const chartData = useMemo(() => {
    return branchMetrics.map(b => ({
      name: b.name,
      Sales: b.sales,
      Expenses: b.expenses,
      Profit: b.profit
    }));
  }, [branchMetrics]);

  return (
    <div className="space-y-6">
      {/* KPI block row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-brand-border/60 bg-gray-950/25 border-b border-brand-border">
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOP PERFORMING WORKSPACE</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block truncate">
            {aggregates.topBranch ? aggregates.topBranch.name : 'N/A'}
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Profit: {aggregates.topBranch ? formatKSh(aggregates.topBranch.profit) : 'KSh 0'}
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">ACTIVE BUSINESS WORKSPACES</span>
          <span className="text-xl font-bold text-cyan-400 mt-1 block">
            {aggregates.count} Branches
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Aggregated corporate presence
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL REGIONAL REVENUE</span>
          <span className="text-xl font-bold text-gray-200 mt-1 block">
            {formatKSh(aggregates.salesSum)}
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Aggregate client sales billing
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">BRANCH PROFIT VARIANCE</span>
          <span className="text-xl font-bold text-rose-400 mt-1 block">
            {formatKSh(aggregates.variance)}
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Spread between high vs low
          </span>
        </div>
      </div>

      {/* Main comparison chart and listing */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comparison Bar chart */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-200 font-sans">Multi-Branch Performance Metrics</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Comparing Sales, Operating expenses, and Profit margins across active workspaces.</p>
          </div>

          <div className="h-[280px] w-full bg-gray-950/20 p-2 rounded-xl border border-brand-border/40">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} className="font-mono" />
                <YAxis stroke="#6b7280" fontSize={10} className="font-mono" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <Bar name="Gross Sales" dataKey="Sales" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar name="OPEX Expenses" dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar name="Net Profit" dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch breakdown rankings */}
        <div className="space-y-4 font-mono text-xs">
          <div>
            <h4 className="text-xs font-semibold text-gray-200 font-sans">Workspace Rankings & KPI Contribution</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Branch contribution percentages based on total system revenue.</p>
          </div>

          <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
            {branchMetrics.map((branch, index) => {
              const pctOfSales = aggregates.salesSum > 0 ? (branch.sales / aggregates.salesSum) * 100 : 0;
              return (
                <div key={branch.id} className="p-3 bg-gray-950/40 rounded-xl border border-brand-border/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-500">#{index+1}</span>
                      <span className="font-sans font-bold text-gray-200">{branch.name}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {pctOfSales.toFixed(1)}% Share
                    </span>
                  </div>

                  {/* Progress bar of revenue share */}
                  <div className="w-full bg-gray-900 rounded-full h-1 overflow-hidden">
                    <div className="bg-cyan-500 h-1 rounded-full" style={{ width: `${pctOfSales}%` }} />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-400">
                    <div>Sales: <span className="text-gray-200 font-semibold">{formatKSh(branch.sales)}</span></div>
                    <div>Expenses: <span className="text-rose-400 font-semibold">{formatKSh(branch.expenses)}</span></div>
                    <div>Net Profit: <span className={`${branch.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-semibold`}>{formatKSh(branch.profit)}</span></div>
                    <div>Margin: <span className="text-gray-200 font-semibold">{branch.margin.toFixed(1)}%</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparison table breakdown */}
      <div className="p-6 pt-0 font-mono text-[11px]">
        <div className="border border-brand-border rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse text-gray-300">
            <thead>
              <tr className="bg-gray-950 text-gray-400 border-b border-brand-border text-[9px] uppercase tracking-wider">
                <th className="p-4">Branch / Workspace</th>
                <th className="p-4">Location</th>
                <th className="p-4 text-center">Transactions</th>
                <th className="p-4 text-right">Sales Revenue</th>
                <th className="p-4 text-right">OPEX Expenses</th>
                <th className="p-4 text-right">Net Profit</th>
                <th className="p-4 text-right">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {branchMetrics.map(branch => (
                <tr key={branch.id} className="hover:bg-gray-900/35 transition">
                  <td className="p-4 font-bold text-gray-200 font-sans">{branch.name}</td>
                  <td className="p-4 text-gray-400">{branch.location}</td>
                  <td className="p-4 text-center font-bold text-gray-200">{branch.txCount} sales</td>
                  <td className="p-4 text-right font-bold text-cyan-400">{formatKSh(branch.sales)}</td>
                  <td className="p-4 text-right font-bold text-rose-400">{formatKSh(branch.expenses)}</td>
                  <td className={branch.profit >= 0 ? 'p-4 text-right font-bold text-emerald-400' : 'p-4 text-right font-bold text-rose-400'}>
                    {formatKSh(branch.profit)}
                  </td>
                  <td className="p-4 text-right font-bold text-gray-200">{branch.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
