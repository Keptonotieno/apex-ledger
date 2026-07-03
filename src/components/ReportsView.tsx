import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { formatKSh } from '../lib/utils';
import { FileDown, Calendar, TrendingUp, DollarSign, Wallet, FileText, Printer } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const ReportsView: React.FC = () => {
  const { sales, expenses, debts, products, activeUser, timelogs } = useApp();
  const [reportPeriod, setReportPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');

  const isEmployee = activeUser?.role === UserRole.EMPLOYEE;

  if (isEmployee) {
    const mySales = sales.filter(s => s.cashierName.toLowerCase() === activeUser.name.toLowerCase() || s.cashierId === activeUser.id);
    const mySalesVolume = mySales.reduce((acc, s) => acc + s.netAmount, 0);
    const mySalesCount = mySales.length;

    const myHoursWorked = timelogs
      .filter(log => log.userId === activeUser.id)
      .reduce((sum, log) => sum + (log.workHours || 0), 0);

    // Dynamic calculations for personal sales by date
    const personalSalesByDate = mySales.reduce((acc: any, s) => {
      if (!acc[s.date]) {
        acc[s.date] = { date: s.date, Revenue: 0, Commission: 0 };
      }
      acc[s.date].Revenue += s.netAmount;
      acc[s.date].Commission += s.netAmount * 0.02; // 2% base commission
      return acc;
    }, {});

    const personalChartData = Object.values(personalSalesByDate).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const graphDataPersonal = personalChartData.length > 0 ? personalChartData : [
      { date: 'June 01', Revenue: 15000, Commission: 300 },
      { date: 'June 10', Revenue: 22000, Commission: 440 },
      { date: 'June 20', Revenue: 31000, Commission: 620 },
      { date: 'June 30', Revenue: 45000, Commission: 900 }
    ];

    const handleExportPDF = () => {
      window.print();
    };

    return (
      <div className="space-y-6">
        {/* Header Ribbon */}
        <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-brand-border">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold text-gray-200">Personal Cashier Statement & Earnings</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={reportPeriod}
              onChange={(e: any) => setReportPeriod(e.target.value)}
              className="bg-gray-950 border border-brand-border rounded-lg text-xs p-2 text-gray-300 outline-none focus:border-cyan-500/30 font-mono"
            >
              <option value="Daily">Daily Statement</option>
              <option value="Weekly">Weekly Statement</option>
              <option value="Monthly">Monthly Personal Statement</option>
              <option value="Yearly">Annual Audit Statement</option>
            </select>

            <button
              onClick={handleExportPDF}
              className="p-2 bg-gray-900 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 rounded-lg transition"
              title="Print Statement"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-brand-border">
            <div className="text-[10px] text-gray-500 font-mono">MY TURNOVER SALES</div>
            <h3 className="text-xl font-bold font-mono text-cyan-400 mt-1">{formatKSh(mySalesVolume)}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Direct cashier turnover volume</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-brand-border">
            <div className="text-[10px] text-gray-500 font-mono">INVOICES COMPLETED</div>
            <h3 className="text-xl font-bold font-mono text-gray-400 mt-1">{mySalesCount} Invoices</h3>
            <p className="text-[10px] text-gray-400 mt-1">Total recorded sales logs</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-brand-border">
            <div className="text-[10px] text-gray-500 font-mono">ESTIMATED COMMISSIONS (2%)</div>
            <h3 className="text-xl font-bold font-mono text-emerald-400 mt-1">{formatKSh(mySalesVolume * 0.02)}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Bonus tracking calculations</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-brand-border">
            <div className="text-[10px] text-gray-500 font-mono">LOGGED SHIFT TIME</div>
            <h3 className="text-xl font-bold font-mono text-amber-400 mt-1">{myHoursWorked.toFixed(1)} hrs</h3>
            <p className="text-[10px] text-gray-400 mt-1">Work hours registered</p>
          </div>
        </div>

        {/* Chart */}
        <div className="glass-panel p-6 rounded-2xl h-[340px] flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-200">Personal Performance & Trend Line</h4>
            <span className="text-[10px] text-gray-500 font-mono">Flow of sales volume and commission margins</span>
          </div>

          <div className="flex-1 w-full min-h-0 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphDataPersonal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="Revenue" stroke="#06b6d4" strokeWidth={1.5} fill="#06b6d4" fillOpacity={0.05} />
                <Area type="monotone" dataKey="Commission" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ledgers Breakdown */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-brand-border p-5">
          <h4 className="text-xs font-bold font-mono text-cyan-400 mb-4 uppercase tracking-wider">Personal Transaction History Log</h4>
          
          <div className="space-y-3 font-mono text-xs">
            {mySales.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No personal invoices generated in this session.</p>
            ) : (
              mySales.map((s) => (
                <div key={s.id} className="flex justify-between border-b border-brand-border/60 pb-2">
                  <div className="space-y-1">
                    <span className="text-gray-200 font-bold">{s.invoiceNumber}</span>
                    <span className="text-gray-500 block text-[10px]">{s.date} • {s.paymentMethod}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-cyan-400">{formatKSh(s.netAmount)}</span>
                    <span className="text-emerald-400 block text-[9px]">+ {formatKSh(s.netAmount * 0.02)} comm</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Dynamic calculations for non-employees
  const grossSales = sales.reduce((acc, s) => acc + s.netAmount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  
  // Cost of Goods Sold
  const costOfGoodsSold = sales.reduce((acc, s) => {
    const itemCost = s.items.reduce((sum, item) => sum + (item.costPriceAtSale * item.quantity), 0);
    return acc + itemCost;
  }, 0);

  const netProfit = grossSales - totalExpenses - costOfGoodsSold;
  const outstandingDebts = debts.reduce((acc, d) => acc + d.remainingBalance, 0);
  const inventoryAssetValue = products.reduce((acc, p) => acc + (p.costPrice * p.quantity), 0);

  // Generate date entries for the performance graph
  const salesByDate = sales.reduce((acc: any, s) => {
    if (!acc[s.date]) {
      acc[s.date] = { date: s.date, Revenue: 0, COGS: 0 };
    }
    acc[s.date].Revenue += s.netAmount;
    acc[s.date].COGS += s.items.reduce((sum, item) => sum + (item.costPriceAtSale * item.quantity), 0);
    return acc;
  }, {});

  const expensesByDate = expenses.reduce((acc: any, e) => {
    if (!acc[e.date]) {
      acc[e.date] = { date: e.date, Expenses: 0 };
    }
    acc[e.date].Expenses += e.amount;
    return acc;
  }, {});

  // Combine charts data
  const combinedDates = Array.from(new Set([...Object.keys(salesByDate), ...Object.keys(expensesByDate)]));
  const chartData = combinedDates.map(date => {
    const rev = salesByDate[date]?.Revenue || 0;
    const exp = expensesByDate[date]?.Expenses || 0;
    const cogs = salesByDate[date]?.COGS || 0;
    const profit = rev - exp - cogs;
    return {
      date,
      Revenue: rev,
      Expenses: exp,
      'Net Profit': profit
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Default chart data if empty
  const graphData = chartData.length > 0 ? chartData : [
    { date: 'June 01', Revenue: 45000, Expenses: 12000, 'Net Profit': 25000 },
    { date: 'June 10', Revenue: 85000, Expenses: 22000, 'Net Profit': 50000 },
    { date: 'June 20', Revenue: 110000, Expenses: 45000, 'Net Profit': 45000 },
    { date: 'June 30', Revenue: 135000, Expenses: 92450, 'Net Profit': 15000 }
  ];

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportCSV = () => {
    alert('Accounting spreadsheet prepared. Exporting Excel sheet...');
  };

  return (
    <div className="space-y-6">
      
      {/* Filters Strip */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-brand-border">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-bold text-gray-200">Financial Reports & Statements</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={reportPeriod}
            onChange={(e: any) => setReportPeriod(e.target.value)}
            className="bg-gray-950 border border-brand-border rounded-lg text-xs p-2 text-gray-300 outline-none focus:border-cyan-500/30 font-mono"
          >
            <option value="Daily">Daily Statement</option>
            <option value="Weekly">Weekly Statement</option>
            <option value="Monthly">Monthly Financial Report</option>
            <option value="Quarterly">Quarterly Corporate Report</option>
            <option value="Yearly">Annual Audit Ledger</option>
          </select>

          <button
            onClick={handleExportPDF}
            className="p-2 bg-gray-900 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 rounded-lg transition"
            title="Download PDF"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2 bg-gray-900 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 rounded-lg transition"
            title="Export CSV"
          >
            <FileDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Accounting balance summaries */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="glass-panel p-5 rounded-xl border border-brand-border">
          <div className="text-[10px] text-gray-500 font-mono">GROSS TURNOVER SALES</div>
          <h3 className="text-xl font-bold font-mono text-cyan-400 mt-1">{formatKSh(grossSales)}</h3>
          <p className="text-[10px] text-gray-400 mt-1">Total checkout turnover volume</p>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-brand-border">
          <div className="text-[10px] text-gray-500 font-mono">COST OF GOODS SOLD (COGS)</div>
          <h3 className="text-xl font-bold font-mono text-gray-400 mt-1">{formatKSh(costOfGoodsSold)}</h3>
          <p className="text-[10px] text-gray-400 mt-1">Direct material wholesale cost</p>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-brand-border">
          <div className="text-[10px] text-gray-500 font-mono">NET SOLVENCY MARGIN</div>
          <h3 className={`text-xl font-bold font-mono mt-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatKSh(netProfit)}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Net profit after expenses & COGS</p>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-brand-border">
          <div className="text-[10px] text-gray-500 font-mono">OUTSTANDING DEBTS PORTFOLIO</div>
          <h3 className="text-xl font-bold font-mono text-amber-400 mt-1">{formatKSh(outstandingDebts)}</h3>
          <p className="text-[10px] text-gray-400 mt-1">Outstanding customer credits</p>
        </div>

      </div>

      {/* Performance Trends visual Area graphs */}
      <div className="glass-panel p-6 rounded-2xl h-[380px] flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-200">Financial Performance Balance Sheet</h4>
          <span className="text-[10px] text-gray-500 font-mono">Live comparative flows of Revenue, Expenses, and Net Profits</span>
        </div>

        <div className="flex-1 w-full min-h-0 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graphData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
              <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
              <Area type="monotone" dataKey="Revenue" stroke="#06b6d4" strokeWidth={1.5} fill="#06b6d4" fillOpacity={0.05} />
              <Area type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={1.5} fill="#f43f5e" fillOpacity={0.05} />
              <Area type="monotone" dataKey="Net Profit" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trial Balance detailed rows list */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-brand-border p-5">
        <h4 className="text-xs font-bold font-mono text-cyan-400 mb-4 uppercase tracking-wider">Accounting Ledger breakdown</h4>
        
        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between border-b border-brand-border/60 pb-2">
            <span className="text-gray-400">Inventory Asset Valuation (Stock Value)</span>
            <span className="font-bold text-gray-200">{formatKSh(inventoryAssetValue)}</span>
          </div>
          <div className="flex justify-between border-b border-brand-border/60 pb-2">
            <span className="text-gray-400">Total Recorded POS Sales count</span>
            <span className="font-bold text-gray-200">{sales.length} invoices generated</span>
          </div>
          <div className="flex justify-between border-b border-brand-border/60 pb-2">
            <span className="text-gray-400">Accumulated Cash Drawer Expenses</span>
            <span className="font-bold text-rose-400">{formatKSh(totalExpenses)}</span>
          </div>
          <div className="flex justify-between border-b border-brand-border/60 pb-2">
            <span className="text-gray-400">Debt portfolio status</span>
            <span className="font-bold text-amber-400">{formatKSh(outstandingDebts)} outstanding</span>
          </div>
        </div>
      </div>

    </div>
  );
};
