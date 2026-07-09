import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Users, Award, TrendingUp, AlertTriangle, UserCheck } from 'lucide-react';
import { Sale, Customer, DebtRecord } from '../../types';

interface CustomerPerformanceProps {
  sales: Sale[];
  customers: Customer[];
  debts: DebtRecord[];
  formatKSh: (amount: number) => string;
}

export const CustomerPerformanceSection: React.FC<CustomerPerformanceProps> = ({
  sales,
  customers,
  debts,
  formatKSh
}) => {
  // Aggregate spend per customer
  const customerMetrics = useMemo(() => {
    const customerGroup: Record<string, { totalSpent: number; txCount: number; lastDate: string }> = {};

    sales.forEach(sale => {
      // Find customer ID if tagged, otherwise group by customerName
      const key = sale.customerId || sale.customerName || 'Walk-In Customer';
      if (!customerGroup[key]) {
        customerGroup[key] = { totalSpent: 0, txCount: 0, lastDate: '' };
      }
      customerGroup[key].totalSpent += sale.netAmount;
      customerGroup[key].txCount += 1;
      
      if (!customerGroup[key].lastDate || new Date(sale.date) > new Date(customerGroup[key].lastDate)) {
        customerGroup[key].lastDate = sale.date;
      }
    });

    // Merge with registered customer profiles
    return customers.map(c => {
      const liveData = customerGroup[c.id] || customerGroup[c.name] || { totalSpent: 0, txCount: 0, lastDate: 'N/A' };
      
      // Match outstanding debt
      const matchingDebt = debts.find(d => d.customerId === c.id || d.customerName === c.name);
      const outstandingDebt = matchingDebt ? matchingDebt.remainingBalance : (c.debtAmount || 0);

      return {
        id: c.id,
        name: c.name,
        phone: c.phone || 'N/A',
        email: c.email || 'N/A',
        totalSpent: liveData.totalSpent || c.totalSpent || 0,
        txCount: liveData.txCount || c.purchaseHistoryCount || 0,
        lastActive: liveData.lastDate,
        debt: outstandingDebt
      };
    });
  }, [sales, customers, debts]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCustomers = customerMetrics.length;
    const activeSpenders = customerMetrics.filter(c => c.totalSpent > 0);
    const repeatSpenders = customerMetrics.filter(c => c.txCount > 1);
    
    // Spenders share
    const repeatRate = totalCustomers > 0 ? (repeatSpenders.length / totalCustomers) * 100 : 0;
    
    // Top Spender
    const sortedSpenders = [...customerMetrics].sort((a, b) => b.totalSpent - a.totalSpent);
    const topSpender = sortedSpenders[0]?.totalSpent > 0 ? sortedSpenders[0] : null;

    // Total outstanding
    const totalDebt = customerMetrics.reduce((acc, c) => acc + c.debt, 0);

    return {
      totalCustomers,
      repeatRate,
      topSpender,
      totalDebt,
      activeSpenders: activeSpenders.length
    };
  }, [customerMetrics]);

  // Top Customer chart data
  const chartData = useMemo(() => {
    return [...customerMetrics]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map(c => ({
        name: c.name.split(' ')[0],
        Spent: c.totalSpent
      }));
  }, [customerMetrics]);

  return (
    <div className="space-y-6">
      {/* KPI block row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-brand-border/60 bg-gray-950/25 border-b border-brand-border">
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOP BRAND SPENDER</span>
          <span className="text-lg font-bold text-cyan-400 mt-1 block truncate">
            {stats.topSpender ? stats.topSpender.name : 'N/A'}
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Total Spent: {stats.topSpender ? formatKSh(stats.topSpender.totalSpent) : 'KSh 0'}
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">ACTIVE DEBT PORTFOLIO</span>
          <span className="text-xl font-bold text-rose-400 mt-1 block">
            {formatKSh(stats.totalDebt)}
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Total client outstanding credits
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">REPEAT CUSTOMER RATIO</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">
            {stats.repeatRate.toFixed(1)}%
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Loyalty repeat purchase count
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">REGISTERED ACCOUNTS</span>
          <span className="text-xl font-bold text-gray-200 mt-1 block">
            {stats.totalCustomers} Accounts
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Total active client directory
          </span>
        </div>
      </div>

      {/* Main split display */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-200 font-sans">Loyalty Spend Analytics</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Ranking top spending customers inside the selected period.</p>
          </div>

          <div className="h-[250px] w-full bg-gray-950/20 p-2 rounded-xl border border-brand-border/40">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                  <Bar name="Total Spend" dataKey="Spent" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 font-mono text-center">
                <Users className="w-8 h-8 text-gray-600 mb-2" />
                No customer purchase logs detected in this period.
              </div>
            )}
          </div>
        </div>

        {/* Directory sidebar */}
        <div className="space-y-4 font-mono text-xs">
          <div>
            <h4 className="text-xs font-semibold text-gray-200 font-sans">Corporate Top Accounts</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Top directory entries based on sales transactions count.</p>
          </div>

          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
            {[...customerMetrics]
              .sort((a, b) => b.txCount - a.txCount)
              .slice(0, 5)
              .map((customer) => (
                <div key={customer.id} className="p-3 bg-gray-950/40 border border-brand-border/50 rounded-xl flex items-center justify-between font-mono text-[11px]">
                  <div className="space-y-0.5 truncate max-w-[140px]">
                    <div className="text-xs text-gray-200 font-bold truncate font-sans">{customer.name}</div>
                    <span className="text-[9px] text-gray-500 font-semibold">{customer.phone}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {customer.txCount} Orders
                    </span>
                    <div className="text-[9px] text-gray-400 font-semibold mt-1">{formatKSh(customer.totalSpent)}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Complete Customer Analytics Table */}
      <div className="p-6 pt-0 font-mono text-[11px]">
        <div className="border border-brand-border rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-gray-300">
            <thead>
              <tr className="bg-gray-950 text-gray-400 border-b border-brand-border text-[9px] uppercase tracking-wider">
                <th className="p-4">Customer Name</th>
                <th className="p-4">Phone Contact</th>
                <th className="p-4">Email Address</th>
                <th className="p-4 text-center">Checkout Count</th>
                <th className="p-4 text-right">Outstanding Credit</th>
                <th className="p-4 text-right">Total Net Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {customerMetrics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500 font-mono">No customers cataloged in database yet.</td>
                </tr>
              ) : (
                customerMetrics.map(customer => (
                  <tr key={customer.id} className="hover:bg-gray-900/35 transition">
                    <td className="p-4 font-bold text-gray-200 font-sans">{customer.name}</td>
                    <td className="p-4 text-gray-400">{customer.phone}</td>
                    <td className="p-4 text-gray-400 truncate max-w-[160px]">{customer.email}</td>
                    <td className="p-4 text-center font-bold text-cyan-400">{customer.txCount} checkout bills</td>
                    <td className="p-4 text-right font-bold text-rose-400">
                      {customer.debt > 0 ? formatKSh(customer.debt) : '-'}
                    </td>
                    <td className="p-4 text-right font-bold text-emerald-400">{formatKSh(customer.totalSpent)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
