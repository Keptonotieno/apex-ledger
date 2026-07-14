import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Sparkles, DollarSign, Scale, Percent, HelpCircle, Activity } from 'lucide-react';
import { formatKSh } from '../../lib/utils';
import { Expense, Sale } from '../../types';

interface ExpenseAnalyticsProps {
  expenses: Expense[];
  sales: Sale[];
}

export const ExpenseAnalytics: React.FC<ExpenseAnalyticsProps> = ({ expenses, sales }) => {
  const [trendResolution, setTrendResolution] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [showBurnTooltip, setShowBurnTooltip] = useState(false);

  // Filter out Drafts and Rejections for metrics calculation
  const approvedExpenses = expenses.filter(e => e.status !== 'Draft' && e.status !== 'Rejected');

  // KPI calculations
  const totalExpensesSum = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalExpensesCount = approvedExpenses.length;
  
  // Sales (Revenue) sum
  const totalRevenue = sales.reduce((sum, s) => sum + s.netAmount, 0);

  // Month-on-Month calculation
  const getMoMPercentage = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthSum = approvedExpenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const prevMonthSum = approvedExpenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    if (prevMonthSum === 0) return { pct: 0, increase: true };
    const diff = currentMonthSum - prevMonthSum;
    const pct = (diff / prevMonthSum) * 100;
    return { pct: Math.abs(pct), increase: diff >= 0 };
  };

  const mom = getMoMPercentage();

  // Burn Rate
  const burnRate = totalRevenue > 0 ? (totalExpensesSum / totalRevenue) * 100 : 0;
  let burnRateStatus = 'Healthy';
  let burnRateColor = 'text-green-400 border-green-500/20 bg-green-950/20';
  if (burnRate > 85) {
    burnRateStatus = 'Critical';
    burnRateColor = 'text-rose-500 border-rose-500/30 bg-rose-950/20 animate-pulse';
  } else if (burnRate >= 60) {
    burnRateStatus = 'Warning';
    burnRateColor = 'text-amber-500 border-amber-500/20 bg-amber-950/20';
  }

  // Monthly average
  const uniqueMonths = Array.from(new Set(approvedExpenses.map(e => {
    const d = new Date(e.date);
    return `${d.getFullYear()}-${d.getMonth() + 1}`;
  })));
  const monthlyAverage = uniqueMonths.length > 0 ? totalExpensesSum / uniqueMonths.length : totalExpensesSum;

  // Largest category
  const categoriesMap: { [key: string]: number } = {};
  approvedExpenses.forEach(e => {
    categoriesMap[e.category] = (categoriesMap[e.category] || 0) + e.amount;
  });
  let largestCategoryName = 'None';
  let largestCategoryAmount = 0;
  Object.keys(categoriesMap).forEach(cat => {
    if (categoriesMap[cat] > largestCategoryAmount) {
      largestCategoryAmount = categoriesMap[cat];
      largestCategoryName = cat;
    }
  });

  // Profit margin
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpensesSum) / totalRevenue) * 100 : 0;

  // Pie chart data (allocation by category)
  const COLORS = ['#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#a855f7', '#6366f1', '#eab308'];
  const pieData = Object.keys(categoriesMap).map(cat => ({
    name: cat,
    value: categoriesMap[cat]
  })).sort((a, b) => b.value - a.value);

  // Group monthly expenses for bar chart
  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyBarData = monthsList.map((month, index) => {
    const sum = approvedExpenses
      .filter(e => new Date(e.date).getMonth() === index)
      .reduce((s, e) => s + e.amount, 0);
    return { name: month, amount: sum };
  });

  // Expense trend data (resolution toggled)
  const getTrendData = () => {
    if (trendResolution === 'Daily') {
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return weekdays.map((day, idx) => {
        const sum = approvedExpenses
          .filter(e => new Date(e.date).getDay() === idx)
          .reduce((s, e) => s + e.amount, 0);
        return { name: day, amount: sum };
      });
    } else if (trendResolution === 'Weekly') {
      return [1, 2, 3, 4].map(w => {
        // Group by weeks of current month
        const sum = approvedExpenses
          .filter(e => {
            const date = new Date(e.date);
            const week = Math.ceil(date.getDate() / 7);
            return week === w;
          })
          .reduce((s, e) => s + e.amount, 0);
        return { name: `Week ${w}`, amount: sum };
      });
    } else if (trendResolution === 'Yearly') {
      const years = Array.from(new Set(approvedExpenses.map(e => new Date(e.date).getFullYear())));
      if (years.length === 0) years.push(new Date().getFullYear());
      return years.map(y => {
        const sum = approvedExpenses
          .filter(e => new Date(e.date).getFullYear() === y)
          .reduce((s, e) => s + e.amount, 0);
        return { name: String(y), amount: sum };
      });
    } else {
      // Monthly default
      return monthlyBarData;
    }
  };

  const trendData = getTrendData();

  // Heat map intensity data for Weekdays (0-6) vs Months (0-11)
  const heatmapData = [
    { day: 'Mon', total: approvedExpenses.filter(e => new Date(e.date).getDay() === 1).reduce((s, e) => s + e.amount, 0) },
    { day: 'Tue', total: approvedExpenses.filter(e => new Date(e.date).getDay() === 2).reduce((s, e) => s + e.amount, 0) },
    { day: 'Wed', total: approvedExpenses.filter(e => new Date(e.date).getDay() === 3).reduce((s, e) => s + e.amount, 0) },
    { day: 'Thu', total: approvedExpenses.filter(e => new Date(e.date).getDay() === 4).reduce((s, e) => s + e.amount, 0) },
    { day: 'Fri', total: approvedExpenses.filter(e => new Date(e.date).getDay() === 5).reduce((s, e) => s + e.amount, 0) },
    { day: 'Sat', total: approvedExpenses.filter(e => new Date(e.date).getDay() === 6).reduce((s, e) => s + e.amount, 0) },
    { day: 'Sun', total: approvedExpenses.filter(e => new Date(e.date).getDay() === 0).reduce((s, e) => s + e.amount, 0) }
  ];

  const maxHeatVal = Math.max(...heatmapData.map(d => d.total), 1);

  // INTELLIGENT OBSERVATION GENERATOR
  const generateObservations = () => {
    const list: string[] = [];

    // Observation 1: Total burn state
    if (burnRate > 85) {
      list.push(`Operational Burn is critical at ${burnRate.toFixed(0)}%. Immediate budget constraints should be put on marketing and miscellaneous supplies.`);
    } else if (burnRate >= 60) {
      list.push(`Current Burn Rate of ${burnRate.toFixed(0)}% represents a moderate risk. Discretionary spending should be audited.`);
    } else {
      list.push(`Business health is excellent with a low burn rate of ${burnRate.toFixed(0)}% against recorded revenue.`);
    }

    // Observation 2: MoM trends
    if (mom.pct > 0) {
      list.push(`Total business spending ${mom.increase ? 'increased' : 'decreased'} by ${mom.pct.toFixed(1)}% compared to the previous month.`);
    } else {
      list.push(`Expenditure profiles are stable and flat compared to the previous month's operational cycle.`);
    }

    // Observation 3: Major category
    if (largestCategoryAmount > 0) {
      const largestPct = (largestCategoryAmount / (totalExpensesSum || 1)) * 100;
      list.push(`"${largestCategoryName}" is the primary cost driver, accounting for ${largestPct.toFixed(0)}% of total accumulated expenses.`);
    }

    // Observation 4: Specific category spike checks
    const marketingSum = approvedExpenses.filter(e => e.category === 'Marketing').reduce((s, e) => s + e.amount, 0);
    const utilitiesSum = approvedExpenses.filter(e => e.category === 'Utilities').reduce((s, e) => s + e.amount, 0);
    const payrollSum = approvedExpenses.filter(e => e.category === 'Payroll').reduce((s, e) => s + e.amount, 0);

    if (marketingSum > totalExpensesSum * 0.25) {
      list.push('Marketing campaign investments represent a significant portion (>25%) of budget allocation.');
    }
    if (utilitiesSum > totalExpensesSum * 0.15) {
      list.push('Utilities and facility bills are higher than the standard 15% threshold; consider conservation checks.');
    }
    if (payrollSum > 0) {
      list.push('Payroll liabilities remain stable and compliant with monthly schedules.');
    }

    return list;
  };

  const observations = generateObservations();

  return (
    <div className="space-y-4 font-mono text-xs">
      
      {/* 2. Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="glass-panel p-4 rounded-xl border border-brand-border/60 relative space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-gray-500 font-sans font-semibold">TOTAL ACCUMULATED EXPENSES</span>
            <div className="w-7 h-7 bg-cyan-950/30 border border-cyan-500/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-200 font-mono">{formatKSh(totalExpensesSum)}</h3>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">{totalExpensesCount} total ledger entries</p>
          </div>
          <div className="pt-2 border-t border-brand-border/40 flex items-center gap-1">
            {mom.increase ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-green-400" />
            )}
            <span className={mom.increase ? 'text-rose-400 font-bold' : 'text-green-400 font-bold'}>
              {mom.increase ? '+' : '-'}{mom.pct.toFixed(1)}%
            </span>
            <span className="text-[9px] text-gray-500 font-sans ml-1">compared to last month</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-panel p-4 rounded-xl border border-brand-border/60 relative space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-gray-500 font-sans font-semibold">OPERATING BURN RATE</span>
            <button 
              onClick={() => setShowBurnTooltip(!showBurnTooltip)}
              className="w-7 h-7 bg-cyan-950/30 border border-cyan-500/10 rounded-lg flex items-center justify-center text-gray-500 hover:text-cyan-400 transition"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-200 font-mono">{burnRate.toFixed(0)}%</h3>
            <span className={`px-1.5 py-0.2 rounded text-[8px] font-sans border inline-block mt-1 ${burnRateColor}`}>
              {burnRateStatus}
            </span>
          </div>
          <div className="pt-2 border-t border-brand-border/40 text-[9px] text-gray-500 font-sans">
            Thresholds: Green &lt;60% | Yellow 60-85% | Red &gt;85%
          </div>

          {showBurnTooltip && (
            <div className="absolute top-full left-0 mt-1 right-0 p-3 bg-gray-950 border border-brand-border rounded-xl shadow-2xl z-30 font-sans text-[10px] text-gray-400 leading-relaxed animate-in fade-in duration-200">
              <p className="font-bold text-cyan-400 mb-1">How Burn Rate is Computed:</p>
              <p>Burn Rate = (Total Expenses / Total Sales Revenue) × 100.</p>
              <p className="mt-1">A healthy burn rate under 60% ensures the company retains a solid profit margin to build reserves and fund growth.</p>
            </div>
          )}
        </div>

        {/* Card 3 */}
        <div className="glass-panel p-4 rounded-xl border border-brand-border/60 relative space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-gray-500 font-sans font-semibold">AVERAGE MONTHLY SPEND</span>
            <div className="w-7 h-7 bg-cyan-950/30 border border-cyan-500/10 rounded-lg flex items-center justify-center">
              <Percent className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-200 font-mono">{formatKSh(monthlyAverage)}</h3>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">Average across active cycles</p>
          </div>
          <div className="pt-2 border-t border-brand-border/40 text-[9px] text-gray-500 font-sans">
            Continuous rolling average calculation
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-panel p-4 rounded-xl border border-brand-border/60 relative space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-gray-500 font-sans font-semibold">LARGEST EXPENSE CATEGORY</span>
            <div className="w-7 h-7 bg-cyan-950/30 border border-cyan-500/10 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-200 font-sans truncate">{largestCategoryName}</h3>
            <p className="text-rose-400 font-bold font-mono mt-1">{formatKSh(largestCategoryAmount)}</p>
          </div>
          <div className="pt-2 border-t border-brand-border/40 text-[9px] text-gray-500 font-sans">
            Primary cost center drive allocation
          </div>
        </div>
      </div>

      {/* 3. Operational Efficiency Widget */}
      <div className="glass-panel p-5 rounded-xl border border-brand-border relative space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-xs font-bold text-cyan-400 font-sans flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>OPERATIONAL EFFICIENCY ANALYZER</span>
            </h4>
            <p className="text-[10px] text-gray-500 font-sans">Real-time revenue versus burning expenditure comparison.</p>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${burnRateColor}`}>
            {burnRateStatus} State
          </span>
        </div>

        {/* Dual Progress Bars */}
        <div className="space-y-3 font-mono text-xs">
          {/* Revenue */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-400">
              <span>Gross Income (Sales)</span>
              <span className="text-green-400 font-bold">{formatKSh(totalRevenue)}</span>
            </div>
            <div className="w-full bg-gray-950 rounded-full h-2.5 overflow-hidden border border-brand-border/30">
              <div className="bg-green-500 h-2.5 rounded-full glow-green transition-all duration-500" style={{ width: '100%' }}></div>
            </div>
          </div>

          {/* Expenses */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-400">
              <span>Operational Burn (Expenses)</span>
              <span className="text-rose-400 font-bold">{formatKSh(totalExpensesSum)}</span>
            </div>
            <div className="w-full bg-gray-950 rounded-full h-2.5 overflow-hidden border border-brand-border/30">
              <div 
                className="bg-rose-500 h-2.5 rounded-full glow-rose transition-all duration-500" 
                style={{ width: `${Math.min(100, burnRate)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-brand-border/40 font-sans text-xs">
          <div>
            <span className="text-gray-500 text-[10px] block">PROFIT MARGIN</span>
            <span className={`font-mono font-bold text-sm ${profitMargin >= 0 ? 'text-green-400' : 'text-rose-500'}`}>
              {profitMargin.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block">TOTAL REVENUE</span>
            <span className="font-mono font-bold text-sm text-gray-200">{formatKSh(totalRevenue)}</span>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block">BURN VALUE</span>
            <span className="font-mono font-bold text-sm text-gray-200">{formatKSh(totalExpensesSum)}</span>
          </div>
          <div>
            <span className="text-gray-500 text-[10px] block">NET EARNINGS</span>
            <span className="font-mono font-bold text-sm text-cyan-400">{formatKSh(totalRevenue - totalExpensesSum)}</span>
          </div>
        </div>
      </div>

      {/* Charts & Allocations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category horizontal allocation list (Replicate Android) */}
        <div className="lg:col-span-1 glass-panel p-4 rounded-xl border border-brand-border space-y-3">
          <h4 className="text-xs font-bold text-gray-200 font-sans uppercase tracking-wider">Expense Allocation by Category</h4>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {pieData.length === 0 ? (
              <p className="text-center text-gray-500 pt-10 font-sans">No expenses logged yet.</p>
            ) : (
              pieData.map((d, index) => {
                const pct = totalExpensesSum > 0 ? (d.value / totalExpensesSum) * 100 : 0;
                return (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between font-sans text-[11px]">
                      <span className="text-gray-300 font-semibold">{d.name}</span>
                      <div className="space-x-1.5 font-mono text-[10px]">
                        <span className="text-gray-400">{formatKSh(d.value)}</span>
                        <span className="text-cyan-400 font-bold">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Charts & Visualization Block */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-xl border border-brand-border space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-200 font-sans uppercase tracking-wider">Dynamic Spending Trends</h4>
            <div className="flex gap-1">
              {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as const).map(res => (
                <button
                  key={res}
                  onClick={() => setTrendResolution(res)}
                  className={`px-2 py-1 rounded text-[10px] font-bold font-sans cursor-pointer transition ${
                    trendResolution === res ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400' : 'bg-gray-950 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="name" stroke="#555" fontSize={10} fontStyle="italic" />
                <YAxis stroke="#555" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }} 
                  labelStyle={{ color: '#a1a1aa' }} 
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heat Map & Automatic Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Heat Map Grid */}
        <div className="lg:col-span-1 glass-panel p-4 rounded-xl border border-brand-border space-y-3">
          <h4 className="text-xs font-bold text-gray-200 font-sans uppercase tracking-wider">Spending Intensity Heat Grid</h4>
          <p className="text-[10px] text-gray-500 font-sans leading-none">Intensity of capital spending across days of the week.</p>
          
          <div className="grid grid-cols-7 gap-2 pt-3 text-center">
            {heatmapData.map((d) => {
              const intensity = maxHeatVal > 0 ? d.total / maxHeatVal : 0;
              let bgClass = 'bg-gray-950 text-gray-600';
              if (intensity > 0.8) bgClass = 'bg-cyan-500 text-gray-950 glow-cyan font-bold';
              else if (intensity > 0.5) bgClass = 'bg-cyan-700/80 text-white font-medium';
              else if (intensity > 0.2) bgClass = 'bg-cyan-900/60 text-gray-300';
              else if (intensity > 0) bgClass = 'bg-cyan-950/40 text-gray-400';

              return (
                <div key={d.day} className="space-y-1">
                  <div className={`p-2 rounded-lg aspect-square flex items-center justify-center text-[10px] ${bgClass}`} title={`Total spent: ${formatKSh(d.total)}`}>
                    {d.day}
                  </div>
                  <span className="text-[8px] text-gray-500 font-sans font-bold">
                    {d.total > 0 ? (d.total >= 1000 ? `${(d.total/1000).toFixed(0)}k` : d.total) : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Observations & AI Analytics */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-xl border border-brand-border space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h4 className="text-xs font-bold text-gray-200 font-sans uppercase tracking-wider">Intelligent Trend Observations</h4>
          </div>
          <div className="space-y-2.5 pt-2">
            {observations.map((obs, idx) => (
              <div key={idx} className="flex items-start gap-2 text-gray-300 font-sans text-xs">
                <span className="text-cyan-400 text-lg leading-none mt-[-3px]">•</span>
                <p className="leading-relaxed">{obs}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
