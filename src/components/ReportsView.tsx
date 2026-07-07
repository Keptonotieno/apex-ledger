import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { formatKSh } from '../lib/utils';
import { 
  FileDown, Calendar, TrendingUp, DollarSign, Wallet, FileText, Printer,
  Scale, ShieldCheck, Layers, ClipboardList, Clock, Search, ChevronDown,
  Check, CheckCircle, ArrowDown, ArrowUp, RefreshCw, BarChart3, Users, 
  HelpCircle, AlertTriangle, FileSpreadsheet, Building, Tag, Percent
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, LineChart, Line
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to parse dates robustly, accommodating both mock text dates and standard ISO strings
const parseToDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  // Handlers for "June 01" or "June 10" style dates from static seed data
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length >= 2) {
    const monthName = parts[0];
    const day = parseInt(parts[1], 10);
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };
    const month = months[monthName.toLowerCase()];
    if (month !== undefined && !isNaN(day)) {
      const year = new Date().getFullYear();
      return new Date(year, month, day);
    }
  }
  return new Date();
};

export const ReportsView: React.FC = () => {
  const { 
    sales, 
    expenses, 
    debts, 
    products, 
    activeUser, 
    timelogs, 
    procurements, 
    audits,
    activeBusiness,
    activeBranchId,
    branches
  } = useApp();

  const [reportPeriod, setReportPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom'>('Monthly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedReportType, setSelectedReportType] = useState<'PL' | 'TAX' | 'CASHFLOW' | 'INVENTORY' | 'PROCUREMENT' | 'AUDIT'>('PL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const isEmployee = activeUser?.role === UserRole.EMPLOYEE;

  // ----------------------------------------------------
  // EMPLOYEE PERSONAL DASHBOARD VIEW
  // ----------------------------------------------------
  if (isEmployee) {
    const mySales = sales.filter(s => s.cashierName.toLowerCase() === activeUser.name.toLowerCase() || s.cashierId === activeUser.id);
    const mySalesVolume = mySales.reduce((acc, s) => acc + s.netAmount, 0);
    const mySalesCount = mySales.length;

    const myHoursWorked = timelogs
      .filter(log => log.userId === activeUser.id)
      .reduce((sum, log) => sum + (log.workHours || 0), 0);

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
      const doc = new jsPDF();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(20);
      doc.setTextColor(6, 182, 212); // cyan
      doc.text('Personal Cashier Statement', 15, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Employee: ${activeUser.name} (${activeUser.email})`, 15, 28);
      doc.text(`Workspace: ${activeBusiness?.name || 'Main HQ'}`, 15, 34);
      doc.text(`Generated On: ${new Date().toLocaleString()}`, 15, 40);

      // KPI box
      doc.setFillColor(241, 245, 249);
      doc.rect(15, 46, 180, 24, 'F');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`Turnover Volume: ${formatKSh(mySalesVolume)}`, 20, 53);
      doc.text(`Total Invoices: ${mySalesCount}`, 20, 60);
      doc.text(`Estimated Commissions (2%): ${formatKSh(mySalesVolume * 0.02)}`, 20, 66);

      const tableData = mySales.map(s => [
        s.invoiceNumber,
        s.date,
        s.paymentMethod,
        formatKSh(s.netAmount),
        formatKSh(s.netAmount * 0.02)
      ]);

      // @ts-ignore
      autoTable(doc, {
        startY: 76,
        head: [['Invoice Number', 'Date', 'Payment Method', 'Net Amount', 'Commission (2%)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [6, 182, 212] },
        styles: { fontSize: 9, font: 'helvetica' }
      });

      doc.save(`Cashier_Statement_${activeUser.name.replace(/\s+/g, '_')}.pdf`);
    };

    return (
      <div className="space-y-6">
        {/* Header Ribbon */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-brand-border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <FileText className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100 font-sans">Personal Cashier Statement</h2>
              <p className="text-xs text-gray-400 font-mono">Track your turnover volume, commissions, and shift times</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/45"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-brand-border relative overflow-hidden group">
            <div className="absolute right-3 top-3 p-1.5 bg-cyan-500/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-[10px] text-gray-500 font-mono tracking-wider">MY TURNOVER SALES</div>
            <h3 className="text-2xl font-bold font-mono text-cyan-400 mt-2">{formatKSh(mySalesVolume)}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Direct cashier sales recorded</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-brand-border relative overflow-hidden">
            <div className="absolute right-3 top-3 p-1.5 bg-gray-500/10 rounded-lg">
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-[10px] text-gray-500 font-mono tracking-wider">INVOICES COMPLETED</div>
            <h3 className="text-2xl font-bold font-mono text-gray-300 mt-2">{mySalesCount} Invoices</h3>
            <p className="text-[10px] text-gray-400 mt-1">Total checkout cycles completed</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-brand-border relative overflow-hidden">
            <div className="absolute right-3 top-3 p-1.5 bg-emerald-500/10 rounded-lg">
              <Percent className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-[10px] text-gray-500 font-mono tracking-wider">ESTIMATED COMMISSIONS</div>
            <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-2">{formatKSh(mySalesVolume * 0.02)}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Calculated at 2% performance rate</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-brand-border relative overflow-hidden">
            <div className="absolute right-3 top-3 p-1.5 bg-amber-500/10 rounded-lg">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-[10px] text-gray-500 font-mono tracking-wider">LOGGED SHIFT TIME</div>
            <h3 className="text-2xl font-bold font-mono text-amber-400 mt-2">{myHoursWorked.toFixed(1)} Hrs</h3>
            <p className="text-[10px] text-gray-400 mt-1">Registered clock-in records</p>
          </div>
        </div>

        {/* Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-brand-border">
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-200">Personal Performance Timeline</h4>
            <p className="text-[11px] text-gray-500 font-mono">Comparative view of daily checkout volume and accrued commission bonus</p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphDataPersonal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="personalRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="personalComm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <Area type="monotone" name="Sales Revenue" dataKey="Revenue" stroke="#06b6d4" strokeWidth={2} fill="url(#personalRev)" />
                <Area type="monotone" name="Bonus Commission" dataKey="Commission" stroke="#10b981" strokeWidth={2} fill="url(#personalComm)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Personal Transaction History */}
        <div className="glass-panel rounded-2xl border border-brand-border overflow-hidden">
          <div className="p-5 border-b border-brand-border flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">My Transaction History Log</span>
            <span className="px-2.5 py-1 bg-cyan-500/10 text-[10px] font-mono rounded text-cyan-400">Total: {mySales.length} Invoices</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-gray-950/80 text-gray-400 border-b border-brand-border text-[10px] uppercase tracking-wider">
                  <th className="p-4">Invoice Number</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4 text-right">Net Amount</th>
                  <th className="p-4 text-right">Commission (2%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {mySales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-gray-500 text-center py-8">No personal sales transactions recorded.</td>
                  </tr>
                ) : (
                  mySales.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-900/30 transition text-gray-300">
                      <td className="p-4 font-bold text-gray-200">{s.invoiceNumber}</td>
                      <td className="p-4">{s.date}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-gray-950 border border-brand-border text-gray-400">
                          {s.paymentMethod}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-cyan-400">{formatKSh(s.netAmount)}</td>
                      <td className="p-4 text-right text-emerald-400">+{formatKSh(s.netAmount * 0.02)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // DATE FILTER BOUNDS COMPUTATION (ADMIN/MANAGER)
  // ----------------------------------------------------
  const periodBounds = useMemo(() => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (reportPeriod === 'Daily') {
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else if (reportPeriod === 'Weekly') {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = today;
    } else if (reportPeriod === 'Monthly') {
      start = new Date(today.getFullYear(), today.getMonth(), 1); // start of month
      end = today;
    } else if (reportPeriod === 'Quarterly') {
      start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      end = today;
    } else if (reportPeriod === 'Yearly') {
      start = new Date(today.getFullYear(), 0, 1); // start of year
      end = today;
    } else if (reportPeriod === 'Custom') {
      start = customStartDate ? new Date(customStartDate) : new Date(today.getFullYear(), today.getMonth(), 1);
      end = customEndDate ? new Date(customEndDate) : today;
    }

    return { start, end };
  }, [reportPeriod, customStartDate, customEndDate]);

  // Master filter items within reporting period
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const d = parseToDate(s.date);
      return d >= periodBounds.start && d <= periodBounds.end;
    });
  }, [sales, periodBounds]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = parseToDate(e.date);
      return d >= periodBounds.start && d <= periodBounds.end;
    });
  }, [expenses, periodBounds]);

  const filteredProcurements = useMemo(() => {
    return procurements.filter(p => {
      const d = parseToDate(p.date);
      return d >= periodBounds.start && d <= periodBounds.end;
    });
  }, [procurements, periodBounds]);

  const filteredAudits = useMemo(() => {
    return audits.filter(a => {
      const d = parseToDate(a.date);
      return d >= periodBounds.start && d <= periodBounds.end;
    });
  }, [audits, periodBounds]);

  const filteredDebts = useMemo(() => {
    return debts; // debts represent active solvency, so we analyze them in total context
  }, [debts]);

  // ----------------------------------------------------
  // REPORT CALCULATIONS BY CARD
  // ----------------------------------------------------
  
  // 1. PROFIT & LOSS CALCULATIONS
  const plData = useMemo(() => {
    const grossRevenue = filteredSales.reduce((acc, s) => acc + s.netAmount, 0);
    const totalDiscounts = filteredSales.reduce((acc, s) => acc + (s.discount || 0), 0);
    const totalCOGS = filteredSales.reduce((acc, s) => {
      const saleCost = s.items.reduce((sum, item) => {
        const itemCost = item.costPriceAtSale || (item.priceAtSale * 0.70); // default to 70% cost fallback
        return sum + (itemCost * item.quantity);
      }, 0);
      return acc + saleCost;
    }, 0);
    const grossProfit = grossRevenue - totalCOGS;
    const totalOperatingExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = grossProfit - totalOperatingExpenses;
    const netProfitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return {
      grossRevenue,
      totalDiscounts,
      totalCOGS,
      grossProfit,
      totalOperatingExpenses,
      netProfit,
      netProfitMargin
    };
  }, [filteredSales, filteredExpenses]);

  // 2. TAX CALCULATIONS
  const taxData = useMemo(() => {
    // Computed based on 16% standard VAT
    const taxableSalesVolume = filteredSales.reduce((acc, s) => acc + s.netAmount, 0);
    const vatCollected = filteredSales.reduce((acc, s) => {
      // If sale contains recorded tax, use it, else assume standard VAT rate (16% inclusive or exclusive)
      return acc + (s.tax || s.netAmount * 0.16);
    }, 0);
    
    // Estimate other local compliance taxes/levies, such as withholding (2%) and excise duties (1.5%)
    const withholdingTaxEstimate = taxableSalesVolume * 0.02;
    const exciseLevyEstimate = taxableSalesVolume * 0.015;
    const totalTaxLiability = vatCollected + withholdingTaxEstimate + exciseLevyEstimate;

    return {
      taxableSalesVolume,
      vatCollected,
      withholdingTaxEstimate,
      exciseLevyEstimate,
      totalTaxLiability
    };
  }, [filteredSales]);

  // 3. CASH FLOW CALCULATIONS
  const cashFlowData = useMemo(() => {
    // Inflows (Cash and Mobile Money checkout channels)
    const cashSalesInflow = filteredSales.filter(s => s.paymentMethod === 'Cash').reduce((acc, s) => acc + s.netAmount, 0);
    const mobileMoneyInflow = filteredSales.filter(s => s.paymentMethod === 'Mobile Money').reduce((acc, s) => acc + s.netAmount, 0);
    
    // Debt recoveries collected during the active bounds
    const debtRecoveries = filteredDebts.reduce((acc, d) => {
      const rangeRecoveries = (d.paymentHistory || []).filter(p => {
        const dDate = parseToDate(p.date);
        return dDate >= periodBounds.start && dDate <= periodBounds.end;
      }).reduce((sum, h) => sum + h.amount, 0);
      return acc + rangeRecoveries;
    }, 0);

    const totalInflow = cashSalesInflow + mobileMoneyInflow + debtRecoveries;

    // Outflows (Operating expenses + paid procurements)
    const operatingOutflow = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const procurementOutflow = filteredProcurements
      .filter(p => p.paymentStatus === 'Paid')
      .reduce((acc, p) => acc + (p.materialCosts || 0), 0);
    
    const totalOutflow = operatingOutflow + procurementOutflow;
    const netCashPosition = totalInflow - totalOutflow;

    return {
      cashSalesInflow,
      mobileMoneyInflow,
      debtRecoveries,
      totalInflow,
      operatingOutflow,
      procurementOutflow,
      totalOutflow,
      netCashPosition
    };
  }, [filteredSales, filteredExpenses, filteredProcurements, filteredDebts, periodBounds]);

  // 4. INVENTORY VALUATION CALCULATIONS
  const inventoryData = useMemo(() => {
    const totalProducts = products.length;
    const totalStockQty = products.reduce((acc, p) => acc + p.quantity, 0);
    const wholesaleAssetValue = products.reduce((acc, p) => acc + (p.costPrice * p.quantity), 0);
    const potentialRetailValue = products.reduce((acc, p) => acc + (p.sellingPrice * p.quantity), 0);
    const estimatedUnrealizedMargin = wholesaleAssetValue > 0 ? ((potentialRetailValue - wholesaleAssetValue) / wholesaleAssetValue) * 100 : 0;
    
    const lowStockItems = products.filter(p => p.quantity <= p.minStockAlert && p.quantity > 0);
    const lowStockCapitalExposure = lowStockItems.reduce((acc, p) => acc + (p.costPrice * p.quantity), 0);
    const outOfStockCount = products.filter(p => p.quantity === 0).length;

    return {
      totalProducts,
      totalStockQty,
      wholesaleAssetValue,
      potentialRetailValue,
      estimatedUnrealizedMargin,
      lowStockCount: lowStockItems.length,
      lowStockCapitalExposure,
      outOfStockCount
    };
  }, [products]);

  // 5. SUPPLIER & PROCUREMENT CALCULATIONS
  const procurementData = useMemo(() => {
    const totalPOs = filteredProcurements.length;
    const totalProcurementSpend = filteredProcurements.reduce((acc, p) => acc + p.materialCosts, 0);
    
    // Accounts payable: outstanding PO amounts where paymentStatus is not fully paid
    const outstandingPayable = filteredProcurements
      .filter(p => p.paymentStatus !== 'Paid')
      .reduce((acc, p) => {
        // If it's unpaid show total, if partially paid show balance
        const multiplier = p.paymentStatus === 'Partially Paid' ? 0.40 : 1.0; // Estimate 40% balance
        return acc + (p.materialCosts * multiplier);
      }, 0);

    const pendingDeliveryCount = filteredProcurements.filter(p => p.deliveryStatus === 'Pending' || p.deliveryStatus === 'Shipped').length;
    const uniqueSuppliers = Array.from(new Set(filteredProcurements.map(p => p.supplierName).filter(Boolean))).length;

    return {
      totalPOs,
      totalProcurementSpend,
      outstandingPayable,
      pendingDeliveryCount,
      uniqueSuppliers
    };
  }, [filteredProcurements]);

  // 6. COMPLIANCE & AUDIT LOGS STATS
  const auditData = useMemo(() => {
    const totalLogs = filteredAudits.length;
    const adminActionCount = filteredAudits.filter(a => a.role === UserRole.ADMIN).length;
    const criticalAdjustments = filteredAudits.filter(a => 
      a.action.toLowerCase().includes('delete') || 
      a.action.toLowerCase().includes('revert') ||
      a.action.toLowerCase().includes('adjust')
    ).length;
    
    const activeStaffUsersCount = Array.from(new Set(filteredAudits.map(a => a.userName))).length;

    return {
      totalLogs,
      adminActionCount,
      criticalAdjustments,
      activeStaffUsersCount
    };
  }, [filteredAudits]);

  // ----------------------------------------------------
  // DYNAMIC CHART DATA GENERATION
  // ----------------------------------------------------
  const chartData = useMemo(() => {
    if (selectedReportType === 'PL') {
      // Area Chart of Sales revenue vs Expenses by Date
      const dateSales = filteredSales.reduce((acc: any, s) => {
        if (!acc[s.date]) acc[s.date] = 0;
        acc[s.date] += s.netAmount;
        return acc;
      }, {});

      const dateExpenses = filteredExpenses.reduce((acc: any, e) => {
        if (!acc[e.date]) acc[e.date] = 0;
        acc[e.date] += e.amount;
        return acc;
      }, {});

      const allDates = Array.from(new Set([...Object.keys(dateSales), ...Object.keys(dateExpenses)]))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      if (allDates.length === 0) {
        return [
          { name: 'Wk 1', Revenue: 45000, Expenses: 12000, Profit: 33000 },
          { name: 'Wk 2', Revenue: 75000, Expenses: 31000, Profit: 44000 },
          { name: 'Wk 3', Revenue: 95000, Expenses: 22000, Profit: 73000 },
          { name: 'Wk 4', Revenue: 120000, Expenses: 41000, Profit: 79000 }
        ];
      }

      return allDates.map(d => {
        const r = dateSales[d] || 0;
        const e = dateExpenses[d] || 0;
        return {
          name: d,
          Revenue: r,
          Expenses: e,
          Profit: r - e
        };
      });
    }

    if (selectedReportType === 'TAX') {
      // Bar Chart of VAT vs Withholding tax by Date
      const dateVat = filteredSales.reduce((acc: any, s) => {
        if (!acc[s.date]) acc[s.date] = 0;
        acc[s.date] += (s.tax || s.netAmount * 0.16);
        return acc;
      }, {});

      const allDates = Object.keys(dateVat).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      if (allDates.length === 0) {
        return [
          { name: 'Day 1', VAT: 3400, Withholding: 850 },
          { name: 'Day 5', VAT: 8600, Withholding: 2150 },
          { name: 'Day 10', VAT: 11200, Withholding: 2800 },
          { name: 'Day 15', VAT: 16500, Withholding: 4125 }
        ];
      }

      return allDates.map(d => {
        const v = dateVat[d] || 0;
        return {
          name: d,
          VAT: v,
          Withholding: v * 0.125
        };
      });
    }

    if (selectedReportType === 'CASHFLOW') {
      // Bar chart of Inflows vs Outflows by Date
      const dateIn = filteredSales.reduce((acc: any, s) => {
        if (!acc[s.date]) acc[s.date] = 0;
        acc[s.date] += s.netAmount;
        return acc;
      }, {});

      const dateOut = filteredExpenses.reduce((acc: any, e) => {
        if (!acc[e.date]) acc[e.date] = 0;
        acc[e.date] += e.amount;
        return acc;
      }, {});

      const allDates = Array.from(new Set([...Object.keys(dateIn), ...Object.keys(dateOut)]))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      if (allDates.length === 0) {
        return [
          { name: 'Week A', Inflow: 50000, Outflow: 25000, Net: 25000 },
          { name: 'Week B', Inflow: 85000, Outflow: 41000, Net: 44000 },
          { name: 'Week C', Inflow: 72000, Outflow: 65000, Net: 7000 },
          { name: 'Week D', Inflow: 110000, Outflow: 38000, Net: 72000 }
        ];
      }

      return allDates.map(d => {
        const inflow = dateIn[d] || 0;
        const outflow = dateOut[d] || 0;
        return {
          name: d,
          Inflow: inflow,
          Outflow: outflow,
          Net: inflow - outflow
        };
      });
    }

    if (selectedReportType === 'INVENTORY') {
      // Stock value distribution by first 5 categories
      const catValue = products.reduce((acc: any, p) => {
        if (!acc[p.category]) acc[p.category] = 0;
        acc[p.category] += p.costPrice * p.quantity;
        return acc;
      }, {});

      const items = Object.entries(catValue).map(([k, v]) => ({ name: k, Value: v }));
      if (items.length === 0) {
        return [
          { name: 'Spares', Value: 180000 },
          { name: 'Lubricants', Value: 120000 },
          { name: 'Accessories', Value: 85000 },
          { name: 'Consumables', Value: 42000 }
        ];
      }
      return items.slice(0, 6);
    }

    if (selectedReportType === 'PROCUREMENT') {
      // Spend per Supplier chart
      const supplierSpend = filteredProcurements.reduce((acc: any, p) => {
        if (!acc[p.supplierName]) acc[p.supplierName] = 0;
        acc[p.supplierName] += p.materialCosts;
        return acc;
      }, {});

      const items = Object.entries(supplierSpend).map(([k, v]) => ({ name: k, Costs: v }));
      if (items.length === 0) {
        return [
          { name: 'Global Auto Co.', Costs: 150000 },
          { name: 'Nairobi Spares Ltd', Costs: 95000 },
          { name: 'Express Oils', Costs: 84000 }
        ];
      }
      return items.slice(0, 5);
    }

    // AUDIT action frequency line chart
    const auditDates = filteredAudits.reduce((acc: any, a) => {
      if (!acc[a.date]) acc[a.date] = 0;
      acc[a.date] += 1;
      return acc;
    }, {});

    const sortedAuditDates = Object.keys(auditDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    if (sortedAuditDates.length === 0) {
      return [
        { name: 'Mon', Actions: 12 },
        { name: 'Tue', Actions: 18 },
        { name: 'Wed', Actions: 15 },
        { name: 'Thu', Actions: 28 },
        { name: 'Fri', Actions: 22 }
      ];
    }
    return sortedAuditDates.map(d => ({
      name: d,
      Actions: auditDates[d] || 0
    }));
  }, [selectedReportType, filteredSales, filteredExpenses, filteredProcurements, filteredAudits, products]);

  // ----------------------------------------------------
  // DYNAMIC TABULAR DATA FOR SCREEN & EXPORTS
  // ----------------------------------------------------
  const rawTableRows = useMemo(() => {
    switch (selectedReportType) {
      case 'PL':
        // Show combined Sales and Expenses
        const salesRows = filteredSales.map(s => ({
          id: s.id,
          date: s.date,
          ref: s.invoiceNumber,
          type: 'Sales Credit',
          desc: `POS Sale to ${s.customerName || 'Walk-in'}`,
          inflow: s.netAmount,
          outflow: 0
        }));
        const expenseRows = filteredExpenses.map(e => ({
          id: e.id,
          date: e.date,
          ref: e.receiptNumber || 'N/A',
          type: 'Expense Debit',
          desc: `${e.category} - ${e.description}`,
          inflow: 0,
          outflow: e.amount
        }));
        return [...salesRows, ...expenseRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      case 'TAX':
        return filteredSales.map(s => ({
          id: s.id,
          date: s.date,
          invoice: s.invoiceNumber,
          customer: s.customerName || 'Walk-In Customer',
          payment: s.paymentMethod,
          total: s.netAmount,
          tax: s.tax || s.netAmount * 0.16,
          withholding: s.netAmount * 0.02
        }));

      case 'CASHFLOW':
        const cfIn = filteredSales.map(s => ({
          id: s.id,
          date: s.date,
          type: 'Sales Cash',
          method: s.paymentMethod,
          ref: s.invoiceNumber,
          in: s.netAmount,
          out: 0
        }));
        const cfOut = filteredExpenses.map(e => ({
          id: e.id,
          date: e.date,
          type: 'Operating Claim',
          method: e.paymentMethod || 'Cash',
          ref: e.receiptNumber || 'N/A',
          in: 0,
          out: e.amount
        }));
        const cfProc = filteredProcurements.filter(p => p.paymentStatus === 'Paid').map(p => ({
          id: p.id,
          date: p.date,
          type: 'Supplier Payment',
          method: 'Bank Wire',
          ref: p.orderNumber,
          in: 0,
          out: p.materialCosts
        }));
        return [...cfIn, ...cfOut, ...cfProc].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      case 'INVENTORY':
        return products.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          sku: p.sku || 'N/A',
          stock: p.quantity,
          unit: p.unit || 'Units',
          cost: p.costPrice,
          price: p.sellingPrice,
          totalCostValue: p.costPrice * p.quantity,
          status: p.stockStatus
        }));

      case 'PROCUREMENT':
        return filteredProcurements.map(p => ({
          id: p.id,
          date: p.date,
          po: p.orderNumber,
          supplier: p.supplierName,
          delivery: p.deliveryStatus,
          payment: p.paymentStatus,
          cost: p.materialCosts
        }));

      case 'AUDIT':
        return filteredAudits.map(a => ({
          id: a.id,
          date: a.date,
          time: a.time,
          user: a.userName,
          role: a.role,
          action: a.action,
          oldVal: a.oldValue || '-',
          newVal: a.newValue || '-'
        }));

      default:
        return [];
    }
  }, [selectedReportType, filteredSales, filteredExpenses, filteredProcurements, filteredAudits, products]);

  // Handle Search & sorting
  const sortedAndFilteredRows = useMemo(() => {
    let rows = [...rawTableRows];

    // Apply simple text filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter((row: any) => {
        return Object.values(row).some((val: any) => 
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        );
      });
    }

    // Apply Sorting
    if (sortField) {
      rows.sort((a: any, b: any) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const strA = String(aVal).toLowerCase();
        const strB = String(bVal).toLowerCase();
        if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
        if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [rawTableRows, searchTerm, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // ----------------------------------------------------
  // FILE EXPORT HANDLERS
  // ----------------------------------------------------
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(22);
    doc.setTextColor(6, 182, 212); // cyan-500
    
    // Header
    doc.text(`${activeBusiness?.name || 'Apex Ledger Enterprise'}`, 15, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Corporate Reports & Analytics Console - Generated Statement`, 15, 27);
    
    // Metadata block
    doc.setFillColor(15, 23, 42); // slate-950 background for pdf header meta
    doc.rect(14, 32, 182, 22, 'F');
    doc.setFontSize(9);
    doc.setTextColor(241, 245, 249);
    
    const branchName = activeBranchId === 'all' 
      ? 'All Business Branches Aggregated' 
      : (branches.find(b => b.id === activeBranchId)?.name || 'Main HQ');

    doc.text(`REPORT TYPE: ${selectedReportType.toUpperCase()} LEDGER`, 18, 38);
    doc.text(`REPORTING PERIOD: ${reportPeriod} (${periodBounds.start.toLocaleDateString()} - ${periodBounds.end.toLocaleDateString()})`, 18, 44);
    doc.text(`WORKSPACE BRANCH: ${branchName}`, 18, 50);

    // Dynamic Headers & mapping depending on type
    let pdfHeaders: string[] = [];
    let pdfRows: any[][] = [];

    switch (selectedReportType) {
      case 'PL':
        pdfHeaders = ['Date', 'Ref Number', 'Transaction Type', 'Description', 'Inflow (KSh)', 'Outflow (KSh)'];
        pdfRows = sortedAndFilteredRows.map((r: any) => [
          r.date, r.ref, r.type, r.desc, formatKSh(r.inflow), formatKSh(r.outflow)
        ]);
        break;
      case 'TAX':
        pdfHeaders = ['Date', 'Invoice', 'Customer', 'Net Sales (KSh)', 'VAT (KSh)', 'WHT (KSh)'];
        pdfRows = sortedAndFilteredRows.map((r: any) => [
          r.date, r.invoice, r.customer, formatKSh(r.total), formatKSh(r.tax), formatKSh(r.withholding)
        ]);
        break;
      case 'CASHFLOW':
        pdfHeaders = ['Date', 'Type', 'Method', 'Ref Ref', 'Cash In (KSh)', 'Cash Out (KSh)'];
        pdfRows = sortedAndFilteredRows.map((r: any) => [
          r.date, r.type, r.method, r.ref, formatKSh(r.in), formatKSh(r.out)
        ]);
        break;
      case 'INVENTORY':
        pdfHeaders = ['Product Name', 'Category', 'SKU', 'Qty Stock', 'Unit Cost', 'Retail Price', 'Total Cost Value'];
        pdfRows = sortedAndFilteredRows.map((r: any) => [
          r.name, r.category, r.sku, `${r.stock} ${r.unit}`, formatKSh(r.cost), formatKSh(r.price), formatKSh(r.totalCostValue)
        ]);
        break;
      case 'PROCUREMENT':
        pdfHeaders = ['Date', 'PO Number', 'Supplier Name', 'Delivery', 'Payment', 'Spend Cost (KSh)'];
        pdfRows = sortedAndFilteredRows.map((r: any) => [
          r.date, r.po, r.supplier, r.delivery, r.payment, formatKSh(r.cost)
        ]);
        break;
      case 'AUDIT':
        pdfHeaders = ['Timestamp', 'User', 'Role', 'System Action Event', 'Value Shift'];
        pdfRows = sortedAndFilteredRows.map((r: any) => [
          `${r.date} ${r.time}`, r.user, r.role.split(' ')[0], r.action, `${r.oldVal} -> ${r.newVal}`
        ]);
        break;
    }

    // @ts-ignore
    autoTable(doc, {
      startY: 60,
      head: [pdfHeaders],
      body: pdfRows,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212] }, // cyan theme colors
      styles: { fontSize: 8, font: 'helvetica' }
    });

    doc.save(`Corporate_Report_${selectedReportType}_${reportPeriod}.pdf`);
  };

  const handleExportCSV = () => {
    if (sortedAndFilteredRows.length === 0) return;

    let headers: string[] = [];
    let keys: string[] = [];

    switch (selectedReportType) {
      case 'PL':
        headers = ['Date', 'Ref', 'Type', 'Description', 'Inflow', 'Outflow'];
        keys = ['date', 'ref', 'type', 'desc', 'inflow', 'outflow'];
        break;
      case 'TAX':
        headers = ['Date', 'Invoice', 'Customer', 'PaymentMethod', 'Net Sales', 'VAT', 'Withholding'];
        keys = ['date', 'invoice', 'customer', 'payment', 'total', 'tax', 'withholding'];
        break;
      case 'CASHFLOW':
        headers = ['Date', 'Type', 'Method', 'Reference', 'Cash Inflow', 'Cash Outflow'];
        keys = ['date', 'type', 'method', 'ref', 'in', 'out'];
        break;
      case 'INVENTORY':
        headers = ['Product Name', 'Category', 'SKU', 'Stock Level', 'Unit Cost', 'Selling Price', 'Asset Valuation'];
        keys = ['name', 'category', 'sku', 'stock', 'cost', 'price', 'totalCostValue'];
        break;
      case 'PROCUREMENT':
        headers = ['Date', 'PO Order', 'Supplier', 'Delivery Status', 'Payment Status', 'Material Costs'];
        keys = ['date', 'po', 'supplier', 'delivery', 'payment', 'cost'];
        break;
      case 'AUDIT':
        headers = ['Date', 'Time', 'User Email', 'Role', 'Action Executed', 'Old Balance', 'New Balance'];
        keys = ['date', 'time', 'user', 'role', 'action', 'oldVal', 'newVal'];
        break;
    }

    // Construct CSV file string
    const csvContent = [
      headers.join(','),
      ...sortedAndFilteredRows.map((r: any) => 
        keys.map(key => {
          let val = r[key];
          if (typeof val === 'string') {
            // Escape double quotes and surround in quotes
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(',')
      )
    ].join('\n');

    // Generate down anchor
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Corporate_Report_${selectedReportType}_${reportPeriod}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header ribbon console panel */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:flex-row items-center justify-between gap-6 border border-brand-border">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 glow-cyan">
            <Scale className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-100 font-sans tracking-tight">Reports & Analytics Console</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">Generate financial reports for taxation, auditing, compliance and business intelligence.</p>
          </div>
        </div>

        {/* Top-Right details */}
        <div className="flex flex-wrap items-center gap-3 bg-gray-950/60 border border-brand-border p-3.5 rounded-xl font-mono text-[10px]">
          <div className="flex items-center gap-1.5 border-r border-brand-border/60 pr-3.5">
            <Building className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-gray-400">Co:</span>
            <span className="text-gray-100 font-bold capitalize">{activeBusiness?.name || 'Corporate'}</span>
          </div>
          <div className="flex items-center gap-1.5 border-r border-brand-border/60 pr-3.5 px-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-gray-400">Workspace:</span>
            <span className="text-gray-100 font-bold">
              {activeBranchId === 'all' ? 'All Branches' : (branches.find(b => b.id === activeBranchId)?.name || 'HQ')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 border-r border-brand-border/60 pr-3.5 px-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-gray-400">Period:</span>
            <span className="text-gray-100 font-bold">{reportPeriod}</span>
          </div>
          <div className="flex items-center gap-1.5 px-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-gray-100 font-bold">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* 2. Report Period selector bar */}
      <div className="glass-panel p-4 rounded-xl border border-brand-border flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Navigation tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-950 p-1.5 rounded-xl border border-brand-border/60 w-full md:w-auto">
          {(['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Custom'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setReportPeriod(period)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-mono text-xs transition cursor-pointer select-none ${
                reportPeriod === period 
                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/40'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Custom date range picker */}
        {reportPeriod === 'Custom' && (
          <div className="flex items-center gap-3 w-full md:w-auto justify-end font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500">START:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-gray-950 border border-brand-border rounded-lg text-[11px] p-2 text-gray-300 outline-none focus:border-cyan-500/30"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500">END:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-gray-950 border border-brand-border rounded-lg text-[11px] p-2 text-gray-300 outline-none focus:border-cyan-500/30"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Six Report Type Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            type: 'PL',
            title: 'Profit & Loss',
            desc: 'Operating net margins & margins sheet',
            icon: TrendingUp,
            badge: formatKSh(plData.netProfit),
            color: plData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          },
          {
            type: 'TAX',
            title: 'Tax Liability',
            desc: 'Accrued VAT & compliance withholdings',
            icon: Scale,
            badge: formatKSh(taxData.totalTaxLiability),
            color: 'text-rose-400/85'
          },
          {
            type: 'CASHFLOW',
            title: 'Cash Flow',
            desc: 'Cash drawer flows vs bank wires',
            icon: DollarSign,
            badge: formatKSh(cashFlowData.netCashPosition),
            color: 'text-cyan-400'
          },
          {
            type: 'INVENTORY',
            title: 'Inventory Valuation',
            desc: 'Asset value and stock liabilities',
            icon: Layers,
            badge: formatKSh(inventoryData.wholesaleAssetValue),
            color: 'text-amber-400'
          },
          {
            type: 'PROCUREMENT',
            title: 'Procurement Audit',
            desc: 'Supplier POs spend & payouts due',
            icon: ClipboardList,
            badge: formatKSh(procurementData.totalProcurementSpend),
            color: 'text-violet-400'
          },
          {
            type: 'AUDIT',
            title: 'System Audit',
            desc: 'Compliance security access log trace',
            icon: ShieldCheck,
            badge: `${auditData.totalLogs} Logs`,
            color: 'text-sky-400'
          }
        ].map((rep) => {
          const isActive = selectedReportType === rep.type;
          const Icon = rep.icon;
          return (
            <button
              key={rep.type}
              onClick={() => {
                setSelectedReportType(rep.type as any);
                setSearchTerm('');
                setSortField('');
              }}
              className={`glass-panel p-5 rounded-2xl border text-left flex flex-col justify-between h-[160px] transition duration-200 cursor-pointer ${
                isActive 
                  ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-950/40 translate-y-[-2px]' 
                  : 'border-brand-border hover:border-gray-700 hover:bg-gray-900/20'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <div className={`p-2.5 rounded-xl ${isActive ? 'bg-cyan-500/20' : 'bg-gray-900/60'} border border-brand-border`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isActive ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gray-950 text-gray-500'}`}>
                  {rep.type}
                </span>
              </div>
              
              <div className="mt-4">
                <h4 className="text-xs font-bold text-gray-200 font-sans tracking-wide">{rep.title}</h4>
                <p className="text-[10px] text-gray-500 font-mono leading-tight mt-0.5">{rep.desc}</p>
                <div className={`text-[11px] font-mono font-semibold mt-2 ${rep.color}`}>
                  {rep.badge}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. Interactive Report Panel */}
      <div className="glass-panel rounded-2xl border border-brand-border overflow-hidden">
        
        {/* Tab header / title */}
        <div className="p-6 border-b border-brand-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-950/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <h3 className="text-sm font-bold text-gray-200 font-mono tracking-wider uppercase">
                {selectedReportType === 'PL' && 'PROFIT & LOSS (P&L) STATEMENT'}
                {selectedReportType === 'TAX' && 'TAX COMPLIANCE & VAT LIABILITY STATEMENT'}
                {selectedReportType === 'CASHFLOW' && 'CASH FLOW STATEMENT (DRAWER STATEMENT)'}
                {selectedReportType === 'INVENTORY' && 'INVENTORY AUDIT & CAPITAL ASSETS VALUE'}
                {selectedReportType === 'PROCUREMENT' && 'SUPPLIER PROCUREMENT & PURCHASE ORDERS'}
                {selectedReportType === 'AUDIT' && 'SYSTEM AUDIT & COMPLIANCE ACCESS LOGS'}
              </h3>
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-1.5">
              Live statement generated from matching ledger rows isolated for the active workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 hover:text-cyan-400 rounded-xl transition font-mono text-xs flex items-center gap-2 cursor-pointer"
              title="Export Statement as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF Export</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 hover:text-cyan-400 rounded-xl transition font-mono text-xs flex items-center gap-2 cursor-pointer"
              title="Export Ledger as CSV Sheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV Spreadsheet</span>
            </button>
          </div>
        </div>

        {/* 5. Dynamic Smart KPIs specific to selected report */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-brand-border divide-y sm:divide-y-0 sm:divide-x divide-brand-border/60 bg-gray-950/25">
          
          {selectedReportType === 'PL' && (
            <>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">GROSS SALES VOLUME</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{formatKSh(plData.grossRevenue)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Discounts given: {formatKSh(plData.totalDiscounts)}</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">COST OF GOODS SOLD (COGS)</span>
                <span className="text-xl font-bold text-gray-300 mt-1 block">{formatKSh(plData.totalCOGS)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Estimates based on buying price</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">OPERATING EXPENSES (OPEX)</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">{formatKSh(plData.totalOperatingExpenses)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Registered cash claims</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">NET EARNINGS</span>
                <span className={`text-xl font-bold mt-1 block ${plData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatKSh(plData.netProfit)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Profit Margin: {plData.netProfitMargin.toFixed(1)}%</span>
              </div>
            </>
          )}

          {selectedReportType === 'TAX' && (
            <>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TAXABLE SALES VOLUME</span>
                <span className="text-xl font-bold text-gray-200 mt-1 block">{formatKSh(taxData.taxableSalesVolume)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Total revenue base</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">VAT COLLECTED (16%)</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{formatKSh(taxData.vatCollected)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Indirect sales tax liabilities</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">WITHHOLDING TAX (2%)</span>
                <span className="text-xl font-bold text-amber-400 mt-1 block">{formatKSh(taxData.withholdingTaxEstimate)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Corporate audit withholding</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL COMPLIANCE TAXES</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">{formatKSh(taxData.totalTaxLiability)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Total accrued tax exposure</span>
              </div>
            </>
          )}

          {selectedReportType === 'CASHFLOW' && (
            <>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL CASH INFLOWS</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{formatKSh(cashFlowData.totalInflow)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Recovered Debts: {formatKSh(cashFlowData.debtRecoveries)}</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL OPERATING OUTFLOWS</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">{formatKSh(cashFlowData.totalOutflow)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Procurement payouts: {formatKSh(cashFlowData.procurementOutflow)}</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">CASH VS MOBILE SALES</span>
                <span className="text-xl font-bold text-gray-200 mt-1 block">{formatKSh(cashFlowData.cashSalesInflow)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">M-Pesa/Mobile In: {formatKSh(cashFlowData.mobileMoneyInflow)}</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">NET CASH FLOW POSITION</span>
                <span className={`text-xl font-bold mt-1 block ${cashFlowData.netCashPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatKSh(cashFlowData.netCashPosition)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Net surplus cash position</span>
              </div>
            </>
          )}

          {selectedReportType === 'INVENTORY' && (
            <>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">WHOLESALE ASSETS VALUE</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{formatKSh(inventoryData.wholesaleAssetValue)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Capital tied in inventory cost</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">ESTIMATED RETAIL VALUE</span>
                <span className="text-xl font-bold text-gray-200 mt-1 block">{formatKSh(inventoryData.potentialRetailValue)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Estimated unrealized markup: {inventoryData.estimatedUnrealizedMargin.toFixed(1)}%</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">LOW STOCK COST EXPOSURE</span>
                <span className="text-xl font-bold text-amber-400 mt-1 block">{formatKSh(inventoryData.lowStockCapitalExposure)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Low-stock lines: {inventoryData.lowStockCount} lines</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">PRODUCTS IN SYSTEM</span>
                <span className="text-xl font-bold text-gray-300 mt-1 block">{inventoryData.totalProducts} Products</span>
                <span className="text-[10px] text-gray-400 block mt-1">Out of stock count: {inventoryData.outOfStockCount} lines</span>
              </div>
            </>
          )}

          {selectedReportType === 'PROCUREMENT' && (
            <>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">PROCUREMENT TOTAL SPEND</span>
                <span className="text-xl font-bold text-violet-400 mt-1 block">{formatKSh(procurementData.totalProcurementSpend)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Spend isolated within period</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">ACCOUNTS PAYABLE DUE</span>
                <span className="text-xl font-bold text-amber-400 mt-1 block">{formatKSh(procurementData.outstandingPayable)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Estimated unpaid PO balances</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">ACTIVE SUPPLIERS</span>
                <span className="text-xl font-bold text-gray-200 mt-1 block">{procurementData.uniqueSuppliers} Companies</span>
                <span className="text-[10px] text-gray-400 block mt-1">Supplier vendors engaged</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">PENDING SHIPMENTS PO</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{procurementData.pendingDeliveryCount} POs</span>
                <span className="text-[10px] text-gray-400 block mt-1">Open/unfulfilled orders</span>
              </div>
            </>
          )}

          {selectedReportType === 'AUDIT' && (
            <>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL COMPLIANCE LOGS</span>
                <span className="text-xl font-bold text-sky-400 mt-1 block">{auditData.totalLogs} Logs</span>
                <span className="text-[10px] text-gray-400 block mt-1">Events captured in range</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">ADMIN LEVEL ACTIONS</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{auditData.adminActionCount} Actions</span>
                <span className="text-[10px] text-gray-400 block mt-1">High authority changes logged</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">CRITICAL ADJUSTMENTS</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">{auditData.criticalAdjustments} adjustments</span>
                <span className="text-[10px] text-gray-400 block mt-1">System deletions or reversions</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">STAFF USERS ENGAGED</span>
                <span className="text-xl font-bold text-gray-200 mt-1 block">{auditData.activeStaffUsersCount} Users</span>
                <span className="text-[10px] text-gray-400 block mt-1">Unique session logins</span>
              </div>
            </>
          )}

        </div>

        {/* 6. Dynamic Comparative Graphs Area */}
        <div className="p-6 border-b border-brand-border">
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-200 font-sans">Comparative Analytics Trend Line</h4>
            <span className="text-[10px] text-gray-500 font-mono">Visual flows representing records within the isolated reporting period.</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {selectedReportType === 'PL' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Area type="monotone" name="Sales Revenue" dataKey="Revenue" stroke="#06b6d4" strokeWidth={2} fill="url(#colorRev)" />
                  <Area type="monotone" name="OPEX Expenses" dataKey="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#colorExp)" />
                  <Area type="monotone" name="Net Margin Profit" dataKey="Profit" stroke="#10b981" strokeWidth={2} fill="url(#colorProf)" />
                </AreaChart>
              ) : selectedReportType === 'TAX' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Bar name="VAT Accrued Collected" dataKey="VAT" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar name="Withholding Tax Estimate" dataKey="Withholding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : selectedReportType === 'CASHFLOW' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Bar name="Cash Inflows" dataKey="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar name="Operating Outflows" dataKey="Outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : selectedReportType === 'INVENTORY' ? (
                <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis type="number" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={9} fontClassName="font-sans" width={90} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                  <Bar name="Inventory Assets Valuation" dataKey="Value" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : selectedReportType === 'PROCUREMENT' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                  <Bar name="PO Spending Costs" dataKey="Costs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                  <Line type="monotone" name="System Events Frequency" dataKey="Actions" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7. Search & Tabular Ledger Breakdown */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="w-4 h-4 text-gray-500" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search matching ledger rows..."
                className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-brand-border rounded-xl text-xs text-gray-200 placeholder:text-gray-600 outline-none focus:border-cyan-500/40 transition"
              />
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              Displaying {sortedAndFilteredRows.length} of {rawTableRows.length} matching rows
            </span>
          </div>

          <div className="overflow-x-auto border border-brand-border rounded-2xl">
            <table className="w-full text-left border-collapse font-mono text-[11px] text-gray-300">
              <thead>
                <tr className="bg-gray-950 text-gray-400 border-b border-brand-border text-[9px] uppercase tracking-wider select-none">
                  {selectedReportType === 'PL' && (
                    <>
                      <th className="p-4 cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('date')}>Date</th>
                      <th className="p-4 cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('ref')}>Reference</th>
                      <th className="p-4 cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('type')}>Type</th>
                      <th className="p-4">Description</th>
                      <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('inflow')}>Inflow</th>
                      <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('outflow')}>Outflow</th>
                    </>
                  )}
                  {selectedReportType === 'TAX' && (
                    <>
                      <th className="p-4 cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('date')}>Date</th>
                      <th className="p-4 cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('invoice')}>Invoice</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Method</th>
                      <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('total')}>Sales Volume</th>
                      <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('tax')}>VAT (16%)</th>
                      <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('withholding')}>Est. WHT (2%)</th>
                    </>
                  )}
                  {selectedReportType === 'CASHFLOW' && (
                    <>
                      <th className="p-4 cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('date')}>Date</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Ref Number</th>
                      <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('in')}>Cash In</th>
                      <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('out')}>Cash Out</th>
                    </>
                  )}
                  {selectedReportType === 'INVENTORY' && (
                    <>
                      <th className="p-4 cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('name')}>Product Item</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">SKU Code</th>
                      <th className="p-4 text-center cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('stock')}>In Stock</th>
                      <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('cost')}>Cost Price</th>
                      <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('price')}>Retail Price</th>
                      <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('totalCostValue')}>Total Value (At Cost)</th>
                    </>
                  )}
                  {selectedReportType === 'PROCUREMENT' && (
                    <>
                      <th className="p-4 cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('date')}>Date</th>
                      <th className="p-4">PO Number</th>
                      <th className="p-4">Supplier</th>
                      <th className="p-4">Delivery</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('cost')}>Spend Value</th>
                    </>
                  )}
                  {selectedReportType === 'AUDIT' && (
                    <>
                      <th className="p-4 cursor-pointer hover:bg-gray-900/60 transition" onClick={() => handleSort('date')}>Timestamp</th>
                      <th className="p-4">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Event Details</th>
                      <th className="p-4">Old Shift State</th>
                      <th className="p-4">New Shift State</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {sortedAndFilteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-gray-500 text-center py-10">No matching record ledger files in this view.</td>
                  </tr>
                ) : (
                  sortedAndFilteredRows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-gray-900/35 transition text-gray-300">
                      
                      {selectedReportType === 'PL' && (
                        <>
                          <td className="p-4 whitespace-nowrap">{row.date}</td>
                          <td className="p-4 font-bold text-gray-200">{row.ref}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.type.includes('Sales') 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                            }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="p-4 text-gray-400 truncate max-w-[240px] font-sans">{row.desc}</td>
                          <td className="p-4 text-right font-bold text-emerald-400">{row.inflow > 0 ? formatKSh(row.inflow) : '-'}</td>
                          <td className="p-4 text-right font-bold text-rose-400">{row.outflow > 0 ? formatKSh(row.outflow) : '-'}</td>
                        </>
                      )}

                      {selectedReportType === 'TAX' && (
                        <>
                          <td className="p-4 whitespace-nowrap">{row.date}</td>
                          <td className="p-4 font-bold text-gray-200">{row.invoice}</td>
                          <td className="p-4 font-sans font-semibold text-gray-400">{row.customer}</td>
                          <td className="p-4">{row.payment}</td>
                          <td className="p-4 text-right font-bold text-gray-200">{formatKSh(row.total)}</td>
                          <td className="p-4 text-right font-bold text-cyan-400">{formatKSh(row.tax)}</td>
                          <td className="p-4 text-right font-bold text-amber-400">{formatKSh(row.withholding)}</td>
                        </>
                      )}

                      {selectedReportType === 'CASHFLOW' && (
                        <>
                          <td className="p-4 whitespace-nowrap">{row.date}</td>
                          <td className="p-4 text-gray-400 font-sans font-semibold">{row.type}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-gray-950 border border-brand-border text-gray-400">
                              {row.method}
                            </span>
                          </td>
                          <td className="p-4 text-gray-200 font-bold">{row.ref}</td>
                          <td className="p-4 text-right font-bold text-emerald-400">{row.in > 0 ? formatKSh(row.in) : '-'}</td>
                          <td className="p-4 text-right font-bold text-rose-400">{row.out > 0 ? formatKSh(row.out) : '-'}</td>
                        </>
                      )}

                      {selectedReportType === 'INVENTORY' && (
                        <>
                          <td className="p-4 font-bold text-gray-200 font-sans max-w-[200px] truncate">{row.name}</td>
                          <td className="p-4 text-gray-400">{row.category}</td>
                          <td className="p-4 text-gray-400">{row.sku}</td>
                          <td className="p-4 text-center font-bold">{row.stock} {row.unit}</td>
                          <td className="p-4 text-right text-gray-400">{formatKSh(row.cost)}</td>
                          <td className="p-4 text-right text-gray-200">{formatKSh(row.price)}</td>
                          <td className="p-4 text-right font-bold text-cyan-400">{formatKSh(row.totalCostValue)}</td>
                        </>
                      )}

                      {selectedReportType === 'PROCUREMENT' && (
                        <>
                          <td className="p-4 whitespace-nowrap">{row.date}</td>
                          <td className="p-4 font-bold text-gray-200">{row.po}</td>
                          <td className="p-4 font-sans font-semibold text-gray-400">{row.supplier}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.delivery === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400' :
                              row.delivery === 'Cancelled' ? 'bg-rose-500/10 text-rose-400' :
                              'bg-amber-500/10 text-amber-400'
                            }`}>
                              {row.delivery}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.payment === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' :
                              'bg-amber-500/10 text-amber-400'
                            }`}>
                              {row.payment}
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-violet-400">{formatKSh(row.cost)}</td>
                        </>
                      )}

                      {selectedReportType === 'AUDIT' && (
                        <>
                          <td className="p-4 whitespace-nowrap text-gray-400">{row.date} {row.time}</td>
                          <td className="p-4 text-cyan-400 text-xs font-semibold">{row.user}</td>
                          <td className="p-4 text-gray-400">{row.role.split(' ')[0]}</td>
                          <td className="p-4 text-gray-200 max-w-[280px] truncate font-sans">{row.action}</td>
                          <td className="p-4 text-gray-500 font-sans italic text-[10px] max-w-[120px] truncate">{row.oldVal}</td>
                          <td className="p-4 text-emerald-400 max-w-[120px] truncate">{row.newVal}</td>
                        </>
                      )}

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
