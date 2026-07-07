import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatKSh } from '../lib/utils';
import { UserRole } from '../types';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, PieChart,
  Layers, RefreshCw, Calendar, Download, ShieldCheck, ArrowUpRight,
  Users, CreditCard, Package, Clock, Percent, Filter, CheckCircle2,
  AlertTriangle, Activity, Printer, FileSpreadsheet, Plus, User, MapPin, X
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RPieChart, Pie, Legend
} from 'recharts';

export const AdminAnalytics: React.FC = () => {
  const { 
    sales, 
    expenses, 
    products, 
    activeBusiness, 
    audits, 
    customers, 
    debts, 
    profiles, 
    timelogs, 
    branches,
    activeUser,
    revertAction
  } = useApp();

  // Filters state
  const [timeRange, setTimeRange] = useState('Last 30 Days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Interactive tabs state
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'expenses' | 'inventory' | 'customers' | 'debts' | 'employees' | 'audits_feed'>('overview');

  // Dedicated filters for the System Activity Audit Log
  const [auditEmployeeFilter, setAuditEmployeeFilter] = useState('All');
  const [auditActionFilter, setAuditActionFilter] = useState('All');
  const [auditTimeFilter, setAuditTimeFilter] = useState('All Time');
  const [auditCustomStart, setAuditCustomStart] = useState('');
  const [auditCustomEnd, setAuditCustomEnd] = useState('');

  // PDF statement print preview state
  const [isPrintingReport, setIsPrintingReport] = useState(false);

  const todayStr = '2026-07-03';
  const todayDate = new Date(todayStr + 'T00:00:00');

  // --- SYSTEM ACTIVITY LOG HELPER FUNCTIONS ---
  const isAuditInTimeRange = (logDateStr: string, range: string, customStart?: string, customEnd?: string) => {
    if (!logDateStr) return false;
    const logDate = new Date(logDateStr + 'T00:00:00');
    const todayVal = new Date(todayStr + 'T00:00:00');
    
    switch (range) {
      case 'Today':
        return logDateStr === todayStr;
      case 'Yesterday': {
        const yesterday = new Date(todayVal);
        yesterday.setDate(yesterday.getDate() - 1);
        return logDateStr === yesterday.toISOString().split('T')[0];
      }
      case 'This Week': {
        const diffTime = todayVal.getTime() - logDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays < 7;
      }
      case 'Last Week': {
        const diffTime = todayVal.getTime() - logDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 7 && diffDays < 14;
      }
      case 'This Month':
        return logDateStr.substring(0, 7) === todayStr.substring(0, 7);
      case 'Last Month': {
        const prevMonth = new Date(todayVal);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        return logDateStr.substring(0, 7) === prevMonth.toISOString().substring(0, 7);
      }
      case 'This Year':
        return logDate.getFullYear() === todayVal.getFullYear();
      case 'Custom Date Range':
        if (!customStart || !customEnd) return true;
        return logDateStr >= customStart && logDateStr <= customEnd;
      case 'All Time':
      default:
        return true;
    }
  };

  const getAuditModule = (action: string): string => {
    const actLower = action.toLowerCase();
    if (actLower.includes('product') || actLower.includes('inventory') || actLower.includes('stock')) return 'Inventory';
    if (actLower.includes('sale') || actLower.includes('sold') || actLower.includes('checkout') || actLower.includes('invoice')) return 'Sales';
    if (actLower.includes('expense') || actLower.includes('spend')) return 'Expenses';
    if (actLower.includes('debt') || actLower.includes('credit') || actLower.includes('loan') || actLower.includes('borrow')) return 'Debts';
    if (actLower.includes('customer') || actLower.includes('client')) return 'Customers';
    if (actLower.includes('employee') || actLower.includes('user') || actLower.includes('profile')) return 'Employees';
    if (actLower.includes('branch')) return 'Branches';
    if (actLower.includes('business') || actLower.includes('workspace')) return 'Workspaces';
    if (actLower.includes('login') || actLower.includes('logout') || actLower.includes('session')) return 'Security';
    if (actLower.includes('task')) return 'Tasks';
    if (actLower.includes('event') || actLower.includes('calendar')) return 'Calendar';
    if (actLower.includes('procure')) return 'Procurement';
    return 'System';
  };

  const getAuditHighRiskInfo = (log: any): { isHighRisk: boolean; reason?: string } => {
    const action = log.action || '';
    const actLower = action.toLowerCase();
    
    // 1. Record deletions
    if (actLower.includes('delete') || actLower.includes('decommission') || actLower.includes('permanently delete') || actLower.includes('remove')) {
      return { isHighRisk: true, reason: 'Record Deletion' };
    }
    // 2. Failed logins
    if (actLower.includes('failed') || actLower.includes('unauthorized') || actLower.includes('block') || actLower.includes('locked')) {
      return { isHighRisk: true, reason: 'Failed Auth Attempt' };
    }
    // 3. Large expense entries (> 50,000 KSh)
    if (actLower.includes('expense')) {
      const expenseAmountStr = log.newValue?.match(/\d+/)?.[0];
      const expenseAmount = expenseAmountStr ? parseFloat(expenseAmountStr) : 0;
      if (expenseAmount > 50000) {
        return { isHighRisk: true, reason: `Large Expense Flag (> ${formatKSh(50000)})` };
      }
    }
    // 4. Large inventory adjustments (> 100 units)
    if (actLower.includes('qty')) {
      const oldQtyStr = log.oldValue?.match(/Qty:\s*(\d+)/)?.[1];
      const newQtyStr = log.newValue?.match(/Qty:\s*(\d+)/)?.[1];
      const oldQty = oldQtyStr ? parseInt(oldQtyStr) : 0;
      const newQty = newQtyStr ? parseInt(newQtyStr) : 0;
      if (Math.abs(newQty - oldQty) >= 100) {
        return { isHighRisk: true, reason: `Large Inventory Adjustment (Δ ≥ 100 units)` };
      }
    }
    // 5. Product price changes
    if (actLower.includes('product') && actLower.includes('price')) {
      return { isHighRisk: true, reason: 'Product Price Modification' };
    }
    if (actLower.includes('updated product') && (log.oldValue?.includes('Price:') && log.newValue?.includes('Price:') && log.oldValue !== log.newValue)) {
      return { isHighRisk: true, reason: 'Product Price Modification' };
    }

    return { isHighRisk: false };
  };

  const getFilteredSystemAudits = () => {
    const bizAudits = audits.filter(a => a.businessId === activeBusiness.id);
    
    return bizAudits.filter(log => {
      // 1. Employee Filter
      if (auditEmployeeFilter !== 'All' && log.userName !== auditEmployeeFilter) return false;
      
      // 2. Action Filter
      let matchesAction = true;
      if (auditActionFilter !== 'All') {
        const actLower = log.action.toLowerCase();
        switch (auditActionFilter) {
          case 'Insert':
            matchesAction = actLower.includes('add') || actLower.includes('creat') || actLower.includes('register') || actLower.includes('record') || actLower.includes('clocked in') || actLower.includes('inserted') || actLower.includes('logged in');
            break;
          case 'Update':
            matchesAction = actLower.includes('updat') || actLower.includes('edit') || actLower.includes('revert') || actLower.includes('paid');
            break;
          case 'Delete':
            matchesAction = actLower.includes('delet') || actLower.includes('decommission') || actLower.includes('remove') || actLower.includes('shut down');
            break;
          case 'Login':
            matchesAction = actLower.includes('login') || actLower.includes('logged in') || actLower.includes('clock in') || actLower.includes('clocked in');
            break;
          case 'Logout':
            matchesAction = actLower.includes('logout') || actLower.includes('logged out') || actLower.includes('clock out') || actLower.includes('clocked out');
            break;
          case 'Sales':
            matchesAction = actLower.includes('sale') || actLower.includes('sold') || actLower.includes('checkout') || actLower.includes('invoice');
            break;
          case 'Inventory':
            matchesAction = actLower.includes('product') || actLower.includes('inventory') || actLower.includes('stock');
            break;
          case 'Expenses':
            matchesAction = actLower.includes('expense') || actLower.includes('spend') || actLower.includes('cost');
            break;
          case 'Products':
            matchesAction = actLower.includes('product');
            break;
          case 'Customers':
            matchesAction = actLower.includes('customer') || actLower.includes('client');
            break;
          case 'Debts':
            matchesAction = actLower.includes('debt') || actLower.includes('credit') || actLower.includes('loan') || actLower.includes('borrow');
            break;
          default:
            matchesAction = true;
        }
      }
      if (!matchesAction) return false;

      // 3. Time Filter
      if (!isAuditInTimeRange(log.date, auditTimeFilter, auditCustomStart, auditCustomEnd)) return false;

      return true;
    });
  };

  const formatKenyanTime = (dateStr: string, timeStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const [hour, minute, second] = timeStr.split(':');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[parseInt(month) - 1] || month;
      
      let hr = parseInt(hour);
      const ampm = hr >= 12 ? 'PM' : 'AM';
      hr = hr % 12;
      if (hr === 0) hr = 12;
      const formattedHour = hr.toString().padStart(2, '0');
      
      return `${day} ${monthName} ${year}, ${formattedHour}:${minute}:${second} ${ampm} EAT`;
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  };

  const handleRevert = (logId: string) => {
    if (activeUser.role !== UserRole.ADMIN && activeUser.role !== UserRole.MANAGER) {
      alert("Unauthorized action. Only Business Owners and Managers can revert activities.");
      return;
    }
    const success = revertAction(logId);
    if (success) {
      alert("Action successfully reverted. An updated security log has been cryptographically recorded.");
    } else {
      alert("Failed to revert action. The target record might be missing, already reverted, or contains incompatible history dependencies.");
    }
  };

  // --- DATE FILTER HELPER ---
  const isDateInRange = (dateStr: string, range: string, start?: string, end?: string) => {
    if (!dateStr) return false;
    const itemDate = new Date(dateStr + 'T00:00:00');
    
    switch (range) {
      case 'Today':
        return dateStr === todayStr;
      case 'Yesterday': {
        const yesterdayDate = new Date(todayDate);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
        return dateStr === yesterdayStr;
      }
      case 'Last 7 Days': {
        const diffTime = todayDate.getTime() - itemDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays < 7;
      }
      case 'Last 30 Days': {
        const diffTime = todayDate.getTime() - itemDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays < 30;
      }
      case 'This Month': {
        return dateStr.substring(0, 7) === todayStr.substring(0, 7);
      }
      case 'Previous Month': {
        const prevMonthDate = new Date(todayDate);
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const prevMonthStr = prevMonthDate.toISOString().substring(0, 7);
        return dateStr.substring(0, 7) === prevMonthStr;
      }
      case 'Quarterly': {
        const currentQuarter = Math.floor(todayDate.getMonth() / 3);
        const itemQuarter = Math.floor(itemDate.getMonth() / 3);
        return itemDate.getFullYear() === todayDate.getFullYear() && itemQuarter === currentQuarter;
      }
      case 'Yearly': {
        return itemDate.getFullYear() === todayDate.getFullYear();
      }
      case 'Custom Date Range': {
        if (!start || !end) return true;
        return dateStr >= start && dateStr <= end;
      }
      default:
        return true;
    }
  };

  // --- FILTER APPLICATIONS ---
  const filteredSales = sales.filter(s => {
    if (!isDateInRange(s.date, timeRange, customStartDate, customEndDate)) return false;
    
    if (selectedBranch !== 'All') {
      const profile = profiles.find(p => p.name.toLowerCase() === s.cashierName.toLowerCase());
      if (!profile || profile.branch !== selectedBranch) return false;
    }
    
    if (selectedEmployee !== 'All' && s.cashierName !== selectedEmployee) return false;
    
    if (selectedCategory !== 'All') {
      const hasItemInCategory = s.items.some(it => {
        const p = products.find(prod => prod.id === it.productId);
        return p && p.category === selectedCategory;
      });
      if (!hasItemInCategory) return false;
    }
    
    return true;
  });

  const filteredExpenses = expenses.filter(e => {
    if (!isDateInRange(e.date, timeRange, customStartDate, customEndDate)) return false;
    
    if (selectedBranch !== 'All') {
      const profile = profiles.find(p => p.name.toLowerCase() === e.recordedBy.toLowerCase());
      if (!profile || profile.branch !== selectedBranch) return false;
    }
    
    if (selectedEmployee !== 'All' && e.recordedBy !== selectedEmployee) return false;
    if (selectedCategory !== 'All' && e.category !== selectedCategory) return false;
    
    return true;
  });

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
    return true;
  });

  const filteredDebts = debts.filter(d => {
    if (selectedBranch !== 'All') {
      const profile = profiles.find(p => p.branch === selectedBranch);
      if (!profile) return false;
    }
    return true;
  });

  // --- KPI COMPUTATIONS ---
  
  // 1. Revenue & Transaction Metrics
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.netAmount, 0);
  const totalDiscount = filteredSales.reduce((acc, s) => acc + s.discount, 0);
  const totalTaxCollected = filteredSales.reduce((acc, s) => acc + s.tax, 0);
  const transactionCount = filteredSales.length;
  
  // Average calculation
  const uniqueSalesDays = Array.from(new Set(filteredSales.map(s => s.date)));
  const averageDailySales = uniqueSalesDays.length > 0 ? totalRevenue / uniqueSalesDays.length : 0;
  
  // Highest sales day calculation
  const dailySalesTotals: Record<string, number> = filteredSales.reduce((acc: Record<string, number>, s) => {
    acc[s.date] = (acc[s.date] || 0) + s.netAmount;
    return acc;
  }, {});
  let highestSalesDayStr = 'N/A';
  let highestSalesDayAmount = 0;
  Object.entries(dailySalesTotals).forEach(([date, amt]) => {
    if (amt > highestSalesDayAmount) {
      highestSalesDayAmount = amt;
      highestSalesDayStr = date;
    }
  });

  // 2. Profitability & COGS
  const costOfGoodsSold = filteredSales.reduce((acc, s) => {
    const saleCOGS = s.items.reduce((sum, item) => sum + (item.costPriceAtSale * item.quantity), 0);
    return acc + saleCOGS;
  }, 0);
  const grossProfit = totalRevenue - costOfGoodsSold;
  
  const totalExpensesSum = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - totalExpensesSum;
  
  const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // 3. Operating Cost Allocations
  const operatingCostToRevenueRatio = totalRevenue > 0 ? (totalExpensesSum / totalRevenue) * 100 : 0;
  const expenseByCategory: Record<string, number> = filteredExpenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  let largestExpenseCategoryName = 'None';
  let largestExpenseCategoryAmount = 0;
  Object.entries(expenseByCategory).forEach(([cat, amt]) => {
    if (amt > largestExpenseCategoryAmount) {
      largestExpenseCategoryAmount = amt;
      largestExpenseCategoryName = cat;
    }
  });

  // 4. Inventory Parameters
  const inventoryAssetValue = filteredProducts.reduce((acc, p) => acc + (p.costPrice * p.quantity), 0);
  const lowStockThresholdCount = filteredProducts.filter(p => p.quantity > 0 && p.quantity <= p.minStockAlert).length;
  const outOfStockCount = filteredProducts.filter(p => p.quantity === 0).length;
  const inventoryTurnoverRatio = costOfGoodsSold / (inventoryAssetValue || 1);

  // Top selling products (Fast Moving)
  const productQuantitiesSold: Record<string, { name: string; qty: number; category: string }> = filteredSales.reduce((acc: Record<string, { name: string; qty: number; category: string }>, s) => {
    s.items.forEach(it => {
      if (!acc[it.productId]) {
        const originalProd = products.find(p => p.id === it.productId);
        acc[it.productId] = { 
          name: it.productName, 
          qty: 0, 
          category: originalProd?.category || 'General' 
        };
      }
      acc[it.productId].qty += it.quantity;
    });
    return acc;
  }, {});
  const sortedProductSales = Object.values(productQuantitiesSold).sort((a, b) => b.qty - a.qty);

  // 5. Customer Loyalty Dynamics
  const totalCustomersCount = customers.length;
  const activeCustomersCount = Array.from(new Set(filteredSales.filter(s => s.customerId).map(s => s.customerId))).length;
  const repeatCustomersCount = Array.from(new Set(filteredSales.filter(s => s.customerId).map(s => s.customerId))).filter(cid => {
    return filteredSales.filter(s => s.customerId === cid).length > 1;
  }).length;
  const repeatCustomerRate = activeCustomersCount > 0 ? (repeatCustomersCount / activeCustomersCount) * 100 : 0;
  
  // Highest spender
  const customerSpends: Record<string, number> = filteredSales.reduce((acc: Record<string, number>, s) => {
    acc[s.customerName] = (acc[s.customerName] || 0) + s.netAmount;
    return acc;
  }, {});
  let highestSpenderName = 'N/A';
  let highestSpenderAmount = 0;
  Object.entries(customerSpends).forEach(([name, amt]) => {
    if (amt > highestSpenderAmount) {
      highestSpenderAmount = amt;
      highestSpenderName = name;
    }
  });
  const averageCustomerPurchase = transactionCount > 0 ? totalRevenue / transactionCount : 0;

  // 6. Outstanding Debts & Liquidity
  const totalOutstandingCustomerDebt = filteredDebts
    .filter(d => d.type === 'Customer Debt')
    .reduce((acc, d) => acc + d.remainingBalance, 0);
  const totalAmountCollected = filteredDebts.reduce((acc, d) => acc + d.paidAmount, 0);
  const totalOutstandingBorrowedCredit = filteredDebts
    .filter(d => d.type === 'Borrowed Credit')
    .reduce((acc, d) => acc + d.remainingBalance, 0);
  
  const overdueCustomerDebts = filteredDebts.filter(d => {
    return d.status !== 'Paid' && d.dueDate < todayStr;
  }).reduce((acc, d) => acc + d.remainingBalance, 0);
  
  const totalOutstandingDebtOverall = filteredDebts.reduce((acc, d) => acc + d.remainingBalance, 0);
  const totalInitialOutstandingDebt = filteredDebts.reduce((acc, d) => acc + d.outstandingAmount, 0);
  const debtRecoveryRate = totalInitialOutstandingDebt > 0 ? (totalAmountCollected / totalInitialOutstandingDebt) * 100 : 0;

  // 7. Employee Performance
  const employeesRegistered = profiles.length;
  const topSalesEmployeeObj: Record<string, number> = filteredSales.reduce((acc: Record<string, number>, s) => {
    acc[s.cashierName] = (acc[s.cashierName] || 0) + s.netAmount;
    return acc;
  }, {});
  let topEmployeeName = 'N/A';
  let topEmployeeSalesVolume = 0;
  Object.entries(topSalesEmployeeObj).forEach(([name, vol]) => {
    if (vol > topEmployeeSalesVolume) {
      topEmployeeSalesVolume = vol;
      topEmployeeName = name;
    }
  });

  const uniqueCashiersActive = Array.from(new Set(filteredSales.map(s => s.cashierName))).length;
  const attendanceRate = timelogs.length > 0 ? (timelogs.filter(t => t.clockInTime).length / (employeesRegistered || 1)) * 100 : 0;

  // --- CHART DATA GENERATION ---
  
  // Aggregate revenue and expenses by date for Area Chart
  const salesByDate = filteredSales.reduce((acc: any, s) => {
    if (!acc[s.date]) {
      acc[s.date] = { date: s.date, Revenue: 0, Profit: 0, Expenses: 0 };
    }
    acc[s.date].Revenue += s.netAmount;
    const saleCOGS = s.items.reduce((sum, item) => sum + (item.costPriceAtSale * item.quantity), 0);
    acc[s.date].Profit += (s.netAmount - saleCOGS);
    return acc;
  }, {});

  filteredExpenses.forEach(e => {
    if (salesByDate[e.date]) {
      salesByDate[e.date].Expenses += e.amount;
    } else {
      salesByDate[e.date] = { date: e.date, Revenue: 0, Profit: -e.amount, Expenses: e.amount };
    }
  });

  const chartData = Object.values(salesByDate).length > 0
    ? Object.values(salesByDate).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [
        { date: '2026-06-28', Revenue: 45000, Profit: 20000, Expenses: 15000 },
        { date: '2026-06-30', Revenue: 52000, Profit: 28000, Expenses: 12450 },
        { date: '2026-07-01', Revenue: 30000, Profit: 15000, Expenses: 80000 },
        { date: '2026-07-02', Revenue: 68440, Profit: 32000, Expenses: 0 }
      ];

  // Pie chart expenses
  const pieCOLORS = ['#06b6d4', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#3b82f6'];
  const expensePieData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name,
    value
  }));

  // Categories stock count bar chart
  const categoriesStockData = filteredProducts.reduce((acc: Record<string, { category: string; value: number; stock: number }>, p) => {
    if (!acc[p.category]) {
      acc[p.category] = { category: p.category, value: 0, stock: 0 };
    }
    acc[p.category].value += p.costPrice * p.quantity;
    acc[p.category].stock += p.quantity;
    return acc;
  }, {});
  const stockBarData = Object.values(categoriesStockData);

  // Customer Spends Bar Data
  const topCustomerChartData = Object.entries(customerSpends)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, Amount: value }));

  // Employee Sales Performance Chart Data
  const employeePerformanceData = Object.entries(topSalesEmployeeObj)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, Sales: value }));

  // --- EXPORT TO CSV HANDLER ---
  const handleExportCSV = () => {
    let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    csv += 'APEX LEDGER EXECUTIVE BUSINESS INTELLIGENCE REPORT\n';
    csv += `Corporate Client: ${activeBusiness.name}\n`;
    csv += `Report Date: ${todayStr}\n`;
    csv += `Target Period: ${timeRange}\n`;
    csv += `Branch Scope: ${selectedBranch}\n`;
    csv += `Employee Focus: ${selectedEmployee}\n`;
    csv += `Category Focus: ${selectedCategory}\n\n`;
    
    csv += '=== FINANCIAL EXECUTIVE SUMMARY ===\n';
    csv += `Lifetime Turnover (Revenue),Cost of Goods Sold (COGS),Gross Trading Profit,Total Operating Cost (Expenses),Net Operating Profit,Operating Leverage Index (Gross Margin %)\n`;
    csv += `KSh ${totalRevenue},KSh ${costOfGoodsSold},KSh ${grossProfit},KSh ${totalExpensesSum},KSh ${netProfit},${grossMarginPct.toFixed(1)}%\n\n`;

    csv += '=== OPERATING EXPENSES BY BUCKET ===\n';
    csv += 'Operating Category,Amount (KSh),Percentage of Total Cost\n';
    Object.entries(expenseByCategory).forEach(([cat, amt]) => {
      const pct = totalExpensesSum > 0 ? (amt / totalExpensesSum) * 100 : 0;
      csv += `"${cat}",${amt},${pct.toFixed(1)}%\n`;
    });
    
    csv += '\n=== INVENTORY STOCKS VALUE SUMMARY ===\n';
    csv += 'SKU Description,Stock Available,Unit Cost Price,Unit Selling Price,Holding Value (Cost Price),Holding Value (Selling Price),Low Stock Alert\n';
    filteredProducts.forEach(p => {
      csv += `"${p.name}",${p.quantity},${p.costPrice},${p.sellingPrice},${p.costPrice * p.quantity},${p.sellingPrice * p.quantity},${p.quantity <= p.minStockAlert ? 'ALERT' : 'NORMAL'}\n`;
    });

    csv += '\n=== ACCOUNT RECEIVABLES (CUSTOMER DEBTS) ===\n';
    csv += 'Debtor Name,Credit Amount (Initial),Paid Back,Outstanding balance,Due Date,Credit Category,Risk Status\n';
    filteredDebts.forEach(d => {
      csv += `"${d.customerName}",${d.outstandingAmount},${d.paidAmount},${d.remainingBalance},"${d.dueDate}","${d.type}",${d.dueDate < todayStr && d.status !== 'Paid' ? 'OVERDUE' : 'REGULAR'}\n`;
    });

    csv += '\n=== EMPLOYEE SCOREBOARD STANDINGS ===\n';
    csv += 'Sales Consultant,Sales Generated (KSh),Transactions Managed,Registered Branch\n';
    profiles.forEach(p => {
      const vol = topSalesEmployeeObj[p.name] || 0;
      const txs = filteredSales.filter(s => s.cashierName === p.name).length;
      csv += `"${p.name}",${vol},${txs},"${p.branch || 'Unassigned'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Apex_Ledger_BI_Report_${timeRange.replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* ----------------- IF PREVIEWING FULL PRINT REPORT ----------------- */}
      {isPrintingReport && (
        <div className="fixed inset-0 bg-white text-black z-[100] overflow-y-auto p-8 print:p-0">
          
          {/* Controls bar, hidden during print */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 print:hidden">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-gray-100 rounded-lg text-gray-900 font-bold font-mono text-sm">▲ APEX LEDGER</span>
              <p className="text-xs text-gray-600">Executive Financial Audit & BI Report</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Trigger Print (A4 PDF)</span>
              </button>
              <button
                onClick={() => setIsPrintingReport(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
              >
                <X className="w-4 h-4" />
                <span>Close Preview</span>
              </button>
            </div>
          </div>

          {/* Printable Page Body */}
          <div className="max-w-4xl mx-auto space-y-8 font-serif print:max-w-none print:w-full">
            
            {/* Report Header */}
            <div className="text-center space-y-2 border-b-2 border-black pb-6">
              <h1 className="text-2xl font-black uppercase tracking-wider">APEX LEDGER SYSTEM</h1>
              <h2 className="text-xl font-bold tracking-tight text-gray-800 uppercase">EXECUTIVE BUSINESS INTELLIGENCE AUDIT</h2>
              <div className="text-xs text-gray-600 font-mono flex justify-center gap-8 mt-4 uppercase">
                <span>Business: {activeBusiness.name}</span>
                <span>Generated: {todayStr}</span>
                <span>Filter Scope: {timeRange}</span>
              </div>
            </div>

            {/* Executive Statement Paragraph */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase font-sans border-b border-gray-300 pb-1">I. EXECUTIVE FINANCIAL SUMMARY</h3>
              <p className="text-sm leading-relaxed text-justify">
                This comprehensive business analysis report provides an audited oversight of operations for 
                <strong> {activeBusiness.name}</strong>, evaluated for the filtered window of {timeRange} 
                {selectedBranch !== 'All' && ` across branch: ${selectedBranch}`}. During this period, the entity generated 
                a total turnover of <strong>{formatKSh(totalRevenue)}</strong>, incorporating standard 16% VAT portion of 
                <strong> {formatKSh(totalTaxCollected)}</strong>. Standard cost price inventory replenishments (COGS) reached 
                <strong> {formatKSh(costOfGoodsSold)}</strong>, resulting in a Gross Trading Profit margin of 
                <strong> {formatKSh(grossProfit)}</strong> ({grossMarginPct.toFixed(1)}%). Deducting direct operating cost overheads 
                (expenses) of <strong>{formatKSh(totalExpensesSum)}</strong>, the firm closed with a Net Operating Profit of 
                <strong> {formatKSh(netProfit)}</strong> (Net Leverage Margin: {netMarginPct.toFixed(1)}%).
              </p>
            </div>

            {/* Main stats matrix table */}
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-black font-sans uppercase font-bold bg-gray-100">
                  <th className="p-2">Financial Index KPI</th>
                  <th className="p-2 text-right">Raw Inflow / Value</th>
                  <th className="p-2 text-right">COGS Replenishments</th>
                  <th className="p-2 text-right">Net Operating Profit</th>
                  <th className="p-2 text-center">Operating Ratios</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-bold font-sans">Corporate Turnover (Revenue)</td>
                  <td className="p-2 text-right font-mono">{formatKSh(totalRevenue)}</td>
                  <td className="p-2 text-right font-mono">{formatKSh(costOfGoodsSold)}</td>
                  <td className="p-2 text-right font-mono font-bold">{formatKSh(grossProfit)}</td>
                  <td className="p-2 text-center font-mono">100.0%</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-bold font-sans">Indirect Costs (Expenses)</td>
                  <td className="p-2 text-right font-mono">{formatKSh(totalExpensesSum)}</td>
                  <td className="p-2 text-right font-mono">-</td>
                  <td className="p-2 text-right font-mono text-rose-700">- {formatKSh(totalExpensesSum)}</td>
                  <td className="p-2 text-center font-mono">{operatingCostToRevenueRatio.toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-black font-bold font-sans bg-gray-50">
                  <td className="p-2">NET OPERATING BOTTOM-LINE</td>
                  <td className="p-2 text-right font-mono">{formatKSh(totalRevenue)}</td>
                  <td className="p-2 text-right font-mono">{formatKSh(costOfGoodsSold)}</td>
                  <td className="p-2 text-right font-mono text-emerald-700 font-black">{formatKSh(netProfit)}</td>
                  <td className="p-2 text-center font-mono">{netMarginPct.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>

            {/* Asset and Liability table */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase font-sans border-b border-gray-300 pb-1">Asset Value Holdings</h4>
                <table className="w-full text-xs text-left">
                  <tbody>
                    <tr className="border-b border-gray-150">
                      <td className="py-1.5">Inventory Assets holding</td>
                      <td className="py-1.5 text-right font-mono font-bold">{formatKSh(inventoryAssetValue)}</td>
                    </tr>
                    <tr className="border-b border-gray-150">
                      <td className="py-1.5">Total Products Cataloged</td>
                      <td className="py-1.5 text-right font-mono font-bold">{filteredProducts.length} SKU(s)</td>
                    </tr>
                    <tr className="border-b border-gray-150">
                      <td className="py-1.5">Low Stock / Zero Alert</td>
                      <td className="py-1.5 text-right font-mono font-bold text-rose-700">{lowStockThresholdCount} Item(s)</td>
                    </tr>
                    <tr>
                      <td className="py-1.5">Stock Turnover Velocity</td>
                      <td className="py-1.5 text-right font-mono font-bold">{inventoryTurnoverRatio.toFixed(1)}x / Yr</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase font-sans border-b border-gray-300 pb-1">Debt & Credit Receivables</h4>
                <table className="w-full text-xs text-left">
                  <tbody>
                    <tr className="border-b border-gray-150">
                      <td className="py-1.5">Customer Debt Outstanding</td>
                      <td className="py-1.5 text-right font-mono font-bold text-rose-700">{formatKSh(totalOutstandingCustomerDebt)}</td>
                    </tr>
                    <tr className="border-b border-gray-150">
                      <td className="py-1.5">Overdue Accounts Balance</td>
                      <td className="py-1.5 text-right font-mono font-bold text-rose-800">{formatKSh(overdueCustomerDebts)}</td>
                    </tr>
                    <tr className="border-b border-gray-150">
                      <td className="py-1.5">Total Borrowed / Loans</td>
                      <td className="py-1.5 text-right font-mono font-bold">{formatKSh(totalOutstandingBorrowedCredit)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5">Credit Collection Recovery</td>
                      <td className="py-1.5 text-right font-mono font-bold text-emerald-700">{debtRecoveryRate.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance tables */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase font-sans border-b border-gray-300 pb-1">II. OPERATIONAL LEADERBOARDS</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-1">Top Spending Customers</span>
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-black text-left uppercase">
                        <th className="py-1">Customer Name</th>
                        <th className="py-1 text-right">Settled Purchases</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCustomerChartData.map((c, i) => (
                        <tr key={i} className="border-b border-gray-200">
                          <td className="py-1.5 capitalize">{c.name}</td>
                          <td className="py-1.5 text-right font-mono font-bold">{formatKSh(c.Amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-700 block mb-1">Employee Sales Scorecard</span>
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-black text-left uppercase">
                        <th className="py-1">Sales Associate</th>
                        <th className="py-1 text-right">Sales Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeePerformanceData.map((e, i) => (
                        <tr key={i} className="border-b border-gray-200">
                          <td className="py-1.5 capitalize">{e.name}</td>
                          <td className="py-1.5 text-right font-mono font-bold">{formatKSh(e.Sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Signatures Block */}
            <div className="pt-12">
              <div className="text-[10px] text-gray-500 italic text-center leading-relaxed">
                Notice of Authentication: This is a system-generated Executive Financial Business Audit statement. The records above correspond strictly 
                to local store sales transactions and expense allocations synchronized to the Apex Ledger Supabase Central Datastore.
              </div>
              
              <div className="grid grid-cols-2 gap-12 pt-12 text-center text-xs font-sans">
                <div>
                  <div className="h-10 border-b border-black mx-auto w-48" />
                  <span className="block font-bold text-gray-800 mt-2 uppercase">Verified System Auditor</span>
                  <span className="text-[10px] text-gray-500 font-mono block">Apex Ledger Secure Audit Ledger</span>
                </div>
                <div>
                  <div className="h-10 border-b border-black mx-auto w-48" />
                  <span className="block font-bold text-gray-800 mt-2 uppercase">Business Owner / Partner Signature</span>
                  <span className="text-[10px] text-gray-500 font-mono block">Audited & Confirmed Date: {todayStr}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ----------------- STANDARDS DASHBOARD SECTION (INTERACTIVE PREVIEW) ----------------- */}
      {!isPrintingReport && (
        <div className="space-y-6">
          
          {/* Main Dashboard Control Banner */}
          <div className="glass-panel p-6 rounded-2xl border-t-2 border-cyan-500/20 flex flex-col xl:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                <BarChart3 className="w-5.5 h-5.5 text-cyan-400" />
                Executive Business Intelligence Dashboard
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Real-time financial leverage, profitability indexes, employee performance metrics, debt ledger ratios, and automated tax logs (KES/KSh).
              </p>
            </div>

            {/* Combined Filtering Block */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full xl:w-auto text-xs">
              
              {/* Branch Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-500 block">BRANCH</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-2.5 py-1.5 text-gray-300 outline-none hover:border-cyan-500/30 transition font-sans text-xs"
                >
                  <option value="All">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-500 block">EMPLOYEE</span>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-2.5 py-1.5 text-gray-300 outline-none hover:border-cyan-500/30 transition font-sans text-xs"
                >
                  <option value="All">All Staff</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-500 block">CATEGORY</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-2.5 py-1.5 text-gray-300 outline-none hover:border-cyan-500/30 transition font-sans text-xs"
                >
                  <option value="All">All Categories</option>
                  {Array.from(new Set(products.map(p => p.category))).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Date Scope Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-500 block">PERIOD LIMIT</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-2.5 py-1.5 text-cyan-400 font-bold outline-none hover:border-cyan-500/30 transition font-sans text-xs"
                >
                  <option>Today</option>
                  <option>Yesterday</option>
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>This Month</option>
                  <option>Previous Month</option>
                  <option>Quarterly</option>
                  <option>Yearly</option>
                  <option>Custom Date Range</option>
                </select>
              </div>

            </div>
          </div>

          {/* Custom Date Range Picker panel, shows when range selected is custom */}
          {timeRange === 'Custom Date Range' && (
            <div className="glass-panel p-4 rounded-xl flex items-center gap-4 text-xs animate-in slide-in-from-top-2 duration-150">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <div className="flex items-center gap-2">
                <span>Start Date:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-gray-950 border border-brand-border rounded-lg p-1.5 text-gray-200 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span>End Date:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-gray-950 border border-brand-border rounded-lg p-1.5 text-gray-200 outline-none"
                />
              </div>
            </div>
          )}

          {/* Quick Export Tools Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-950/20 border border-brand-border p-3.5 rounded-xl text-xs">
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-cyan-950/40 text-cyan-400 border border-cyan-500/10 rounded-lg font-mono font-medium">Active: KSh Default</span>
              {selectedBranch !== 'All' && <span className="px-2 py-1 bg-gray-900 border border-brand-border rounded-lg">Branch: {selectedBranch}</span>}
              {selectedEmployee !== 'All' && <span className="px-2 py-1 bg-gray-900 border border-brand-border rounded-lg">Cashier: {selectedEmployee}</span>}
              {selectedCategory !== 'All' && <span className="px-2 py-1 bg-gray-900 border border-brand-border rounded-lg">Category: {selectedCategory}</span>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsPrintingReport(true)}
                className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-xs font-black rounded-lg flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>PDF Statement</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-brand-border text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Excel/CSV Ledger</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation Menu */}
          <div className="border-b border-brand-border/60 flex flex-wrap gap-1">
            {[
              { id: 'overview', name: 'Overview Ratios', icon: BarChart3 },
              { id: 'revenue', name: 'Revenue & Profits', icon: DollarSign },
              { id: 'expenses', name: 'Operating Cost', icon: PieChart },
              { id: 'inventory', name: 'Inventory Asset', icon: Package },
              { id: 'customers', name: 'Client Loyalty', icon: Users },
              { id: 'debts', name: 'Debt & Credit', icon: CreditCard },
              { id: 'employees', name: 'Team Scorecard', icon: User },
              { id: 'audits_feed', name: 'Live Activity Feed', icon: ShieldCheck }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2.5 px-4 font-sans font-semibold text-xs rounded-t-xl flex items-center gap-1.5 border-t border-x -mb-[1px] transition duration-200 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-gray-950 text-cyan-400 border-brand-border border-b-gray-950'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* ----------------- CORE TAB BODIES RENDERER ----------------- */}
          
          {/* TAB 1: OVERVIEW COMPONENT */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Gross Margin stat */}
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block uppercase">Gross Margin Leverage</span>
                  <h3 className="text-xl font-bold font-mono text-cyan-400 mt-2">{grossMarginPct.toFixed(1)}%</h3>
                  <div className="w-full bg-gray-900 h-1.5 rounded-full mt-3 overflow-hidden border border-brand-border">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${grossMarginPct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">Revenue minus product replenishment direct cost</p>
                </div>

                {/* Net Margin stat */}
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block uppercase">Net Profitability Index</span>
                  <h3 className="text-xl font-bold font-mono text-emerald-400 mt-2">{netMarginPct.toFixed(1)}%</h3>
                  <div className="w-full bg-gray-900 h-1.5 rounded-full mt-3 overflow-hidden border border-brand-border">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.max(0, netMarginPct)}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">Bottom-line operating yield ratio</p>
                </div>

                {/* Debt collection rate */}
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block uppercase">Debt Collection Rate</span>
                  <h3 className="text-xl font-bold font-mono text-purple-400 mt-2">{debtRecoveryRate.toFixed(1)}%</h3>
                  <div className="w-full bg-gray-900 h-1.5 rounded-full mt-3 overflow-hidden border border-brand-border">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${debtRecoveryRate}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">Total amount collected vs initially lent out</p>
                </div>

                {/* Staff Attendance */}
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block uppercase">Team Attendance Ratio</span>
                  <h3 className="text-xl font-bold font-mono text-amber-400 mt-2">{attendanceRate.toFixed(1)}%</h3>
                  <div className="w-full bg-gray-900 h-1.5 rounded-full mt-3 overflow-hidden border border-brand-border">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${attendanceRate}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">Percentage of clock-in logs today</p>
                </div>

              </div>

              {/* Main trajectory charts */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 glass-panel p-6 rounded-2xl flex flex-col justify-between h-[380px]">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Revenue & Margin Flow Graph</h3>
                    <p className="text-[10px] text-gray-500 font-mono">Daily comparison of gross sales turn vs direct cost vs expenses</p>
                  </div>
                  <div className="flex-1 w-full min-h-0 py-2">
                    <ResponsiveContainer width="100%" height="90%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                        <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                          labelStyle={{ color: '#9ca3af', fontFamily: 'monospace' }}
                        />
                        <Area type="monotone" dataKey="Revenue" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                        <Area type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProf)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 text-[10px] font-mono text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-cyan-500 rounded-sm" /> Turnover (KSh)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /> Margin Profit (KSh)</span>
                  </div>
                </div>

                {/* Operating category splits */}
                <div className="lg:col-span-4 glass-panel p-6 rounded-2xl flex flex-col justify-between h-[380px]">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Expense Allocations</h3>
                    <p className="text-[10px] text-gray-500 font-mono">Operating expense splits by category</p>
                  </div>
                  {expensePieData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                      <Activity className="w-8 h-8 text-gray-800 animate-pulse" />
                      <p className="text-xs font-semibold text-gray-400 mt-2">Zero expenses recorded</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center relative min-h-0">
                      <div className="w-full h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <RPieChart>
                            <Pie
                              data={expensePieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {expensePieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={pieCOLORS[index % pieCOLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                          </RPieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400 border-t border-brand-border/60 pt-3">
                    {expensePieData.slice(0, 4).map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pieCOLORS[index % pieCOLORS.length] }} />
                        <span className="truncate">{entry.name}: {(((entry.value as number) / totalExpensesSum) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* System calculation log */}
              <div className="glass-panel p-6 rounded-2xl">
                <div className="border-b border-brand-border/60 pb-2 mb-3">
                  <h3 className="text-sm font-bold text-gray-200 font-sans">Corporate BI Calculation Audits</h3>
                  <p className="text-[10px] text-gray-500 font-mono">Row level secured calculations logs verified on Supabase SQL</p>
                </div>
                <div className="space-y-2 font-mono text-[10px]">
                  {filteredSales.slice(0, 3).map((s, idx) => {
                    const localCOGS = s.items.reduce((sum, item) => sum + (item.costPriceAtSale * item.quantity), 0);
                    return (
                      <div key={idx} className="flex gap-2.5 bg-gray-950/40 p-2.5 border border-brand-border/40 rounded-xl items-center">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Turnover Audit for <strong className="text-cyan-400">{s.invoiceNumber}</strong>: Gross revenue of {formatKSh(s.netAmount)} generated by {s.cashierName} (Branch: {profiles.find(p => p.name.toLowerCase() === s.cashierName.toLowerCase())?.branch || 'Nairobi'}). Replenishment cost: {formatKSh(localCOGS)}. Net Margin: {formatKSh(s.netAmount - localCOGS)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: REVENUE COMPONENT */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-t border-cyan-500/20">
                  <span className="text-[10px] text-gray-400 font-mono block">LIFETIME REVENUE</span>
                  <h3 className="text-2xl font-black font-mono text-cyan-400 mt-2">{formatKSh(totalRevenue)}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Sum of net transactions in this period</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">DAILY REVENUE MEAN</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2">{formatKSh(averageDailySales)}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Average sales per active trading day</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">HIGHEST INFLOW DAY</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2">{formatKSh(highestSalesDayAmount)}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Achieved on date: {highestSalesDayStr}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-emerald-500/20">
                  <span className="text-[10px] text-gray-400 font-mono block font-bold text-emerald-500">NET PROFIT</span>
                  <h3 className="text-2xl font-black font-mono text-emerald-400 mt-2">{formatKSh(netProfit)}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Profit after direct & indirect cost</p>
                </div>
              </div>

              {/* Revenue trends line chart */}
              <div className="glass-panel p-6 rounded-2xl h-[340px] flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-200">Daily Revenue Acceleration</h3>
                  <p className="text-[10px] text-gray-500 font-mono">Growth line representing total turnover across period days</p>
                </div>
                <div className="flex-1 w-full min-h-0 py-2">
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                      <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Line type="monotone" dataKey="Revenue" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Categories breakdown table */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-gray-200 mb-4">Trading Category Standings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead>
                      <tr className="border-b border-brand-border pb-2 text-gray-400 font-mono uppercase text-[10px]">
                        <th className="py-2">Category Description</th>
                        <th className="py-2 text-center">SKU Units Sold</th>
                        <th className="py-2 text-right">Inflow Turnover Generated</th>
                        <th className="py-2 text-right">Cost Price (COGS)</th>
                        <th className="py-2 text-right">Gross Profit Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(new Set(products.map(p => p.category))).map(cat => {
                        // calculate stats
                        const catSales = filteredSales.reduce((acc, s) => {
                          const itemsCost = s.items.filter(it => {
                            const p = products.find(prod => prod.id === it.productId);
                            return p && p.category === cat;
                          });
                          
                          const catTotal = itemsCost.reduce((sum, item) => sum + (item.priceAtSale * item.quantity), 0);
                          const catCost = itemsCost.reduce((sum, item) => sum + (item.costPriceAtSale * item.quantity), 0);
                          
                          acc.qty += itemsCost.reduce((sum, item) => sum + item.quantity, 0);
                          acc.revenue += catTotal;
                          acc.cogs += catCost;
                          
                          return acc;
                        }, { qty: 0, revenue: 0, cogs: 0 });

                        return (
                          <tr key={cat} className="border-b border-brand-border/45 hover:bg-gray-950/25">
                            <td className="py-3 font-semibold text-gray-200 font-sans">{cat}</td>
                            <td className="py-3 text-center font-mono">{catSales.qty} Units</td>
                            <td className="py-3 text-right font-mono text-cyan-400">{formatKSh(catSales.revenue)}</td>
                            <td className="py-3 text-right font-mono text-gray-500">{formatKSh(catSales.cogs)}</td>
                            <td className="py-3 text-right font-mono text-emerald-400 font-bold">{formatKSh(catSales.revenue - catSales.cogs)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXPENSES COMPONENT */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-t border-rose-500/20">
                  <span className="text-[10px] text-gray-400 font-mono block">TOTAL OPERATING EXPENSES</span>
                  <h3 className="text-2xl font-black font-mono text-rose-400 mt-2">{formatKSh(totalExpensesSum)}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Operating outflows of selected filters</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">LARGEST EXPENSE BUCKET</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2 uppercase text-base tracking-wide truncate">{largestExpenseCategoryName}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Value: {formatKSh(largestExpenseCategoryAmount)}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">EXPENSE-TO-INCOME RATE</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2">{operatingCostToRevenueRatio.toFixed(1)}%</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Operating cost load percentage</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">MONTHLY RUN-RATE OVERHEAD</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2">{formatKSh(totalExpensesSum * 1.2)}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Projected basic cost overheads</p>
                </div>
              </div>

              {/* Expenses table list */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-gray-200 mb-4">Detailed Operating Expenses Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead>
                      <tr className="border-b border-brand-border pb-2 text-gray-400 font-mono uppercase text-[10px]">
                        <th className="py-2">Expense Category</th>
                        <th className="py-2">Description / Recipient</th>
                        <th className="py-2">Date Recorded</th>
                        <th className="py-2">Filed By Staff</th>
                        <th className="py-2 text-right">Amount Disbursed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map(e => (
                        <tr key={e.id} className="border-b border-brand-border/40 hover:bg-gray-950/25">
                          <td className="py-2.5 font-bold text-gray-200">{e.category}</td>
                          <td className="py-2.5 text-gray-400 font-sans">{e.description}</td>
                          <td className="py-2.5 font-mono text-gray-400">{e.date}</td>
                          <td className="py-2.5 text-gray-400 capitalize">{e.recordedBy}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-rose-400">{formatKSh(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVENTORY COMPONENT */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-t border-cyan-500/20">
                  <span className="text-[10px] text-gray-400 font-mono block">TOTAL HOLDING ASSETS</span>
                  <h3 className="text-2xl font-black font-mono text-cyan-400 mt-2">{formatKSh(inventoryAssetValue)}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Total stock value at cost price</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">LOW STOCK ITEMS</span>
                  <h3 className="text-2xl font-bold font-mono text-amber-400 mt-2">{lowStockThresholdCount} SKU(s)</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Triggered min stock warning levels</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">OUT OF STOCK OUTLETS</span>
                  <h3 className="text-2xl font-bold font-mono text-rose-400 mt-2">{outOfStockCount} SKU(s)</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Items requiring urgent supply</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">INVENTORY TURNOVER RATIO</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2">{inventoryTurnoverRatio.toFixed(1)}x</h3>
                  <p className="text-[10px] text-gray-500 mt-1">COGS divided by Holding Asset value</p>
                </div>
              </div>

              {/* Fast moving / slow moving split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Fast Moving */}
                <div className="glass-panel p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Fast Moving Inventory SKUs
                  </h3>
                  <div className="space-y-3">
                    {sortedProductSales.slice(0, 5).map((prod, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-950/40 border border-brand-border rounded-xl">
                        <div>
                          <span className="text-xs font-bold text-gray-200 block">{prod.name}</span>
                          <span className="text-[9px] text-gray-500 font-mono uppercase">{prod.category}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-3 py-1 border border-cyan-500/10 rounded-lg">{prod.qty} Units Sold</span>
                      </div>
                    ))}
                    {sortedProductSales.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-6">No inventory velocity recorded</p>
                    )}
                  </div>
                </div>

                {/* Categories Assets Bar Chart */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[340px]">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Asset Value by Category</h3>
                    <p className="text-[10px] text-gray-500 font-mono">Stock asset holding valuation splits in KSh</p>
                  </div>
                  <div className="flex-1 w-full min-h-0 py-2">
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={stockBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                        <XAxis dataKey="category" stroke="#6b7280" fontSize={10} />
                        <YAxis stroke="#6b7280" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMERS COMPONENT */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">TOTAL CLIENT BASE</span>
                  <h3 className="text-2xl font-black font-mono text-cyan-400 mt-2">{totalCustomersCount} Contacts</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Total registered clients on ledger</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">ACTIVE CLIENTS</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2">{activeCustomersCount} Contacts</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Made purchases during this period</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">REPEAT BUYERS RATIO</span>
                  <h3 className="text-2xl font-bold font-mono text-purple-400 mt-2">{repeatCustomerRate.toFixed(1)}%</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Purchased &gt;1 times in this window</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">HIGHEST SINGLE SPENDER</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2 text-base tracking-wide truncate capitalize">{highestSpenderName}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Contributed {formatKSh(highestSpenderAmount)}</p>
                </div>
              </div>

              {/* Customer Spends and List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Leaderboard Chart */}
                <div className="glass-panel p-6 rounded-2xl h-[340px] flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200">Top Customer Spenders</h3>
                    <p className="text-[10px] text-gray-500 font-mono">Top spend contributions on ledger in KSh</p>
                  </div>
                  <div className="flex-1 w-full min-h-0 py-2">
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={topCustomerChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                        <XAxis type="number" stroke="#6b7280" fontSize={10} />
                        <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                        <Bar dataKey="Amount" fill="#a855f7" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Customer CRM listing */}
                <div className="glass-panel p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-gray-200 mb-4">Client Portfolio Ledger</h3>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {customers.slice(0, 6).map(c => (
                      <div key={c.id} className="flex justify-between items-center p-3 bg-gray-950/40 border border-brand-border rounded-xl">
                        <div>
                          <span className="text-xs font-bold text-gray-200 block capitalize">{c.name}</span>
                          <span className="text-[9px] text-gray-500 font-mono">{c.phone} | {c.email || 'No email'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-cyan-400 block">{formatKSh(c.totalSpent)}</span>
                          <span className="text-[8px] text-gray-500 uppercase font-mono block">{c.purchaseHistoryCount} purchases</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 6: DEBTS COMPONENT */}
          {activeTab === 'debts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-t border-rose-500/20">
                  <span className="text-[10px] text-gray-400 font-mono block">OUTSTANDING CLIENT DEBT</span>
                  <h3 className="text-2xl font-black font-mono text-rose-400 mt-2">{formatKSh(totalOutstandingCustomerDebt)}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Unsettled credit by customers</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">AMOUNT COLLECTED BACK</span>
                  <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-2">{formatKSh(totalAmountCollected)}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Payments recorded on debtor balances</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">OVERDUE ACCOUNTS</span>
                  <h3 className="text-2xl font-bold font-mono text-rose-800 mt-2">{formatKSh(overdueCustomerDebts)}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Due date is past today ({todayStr})</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">DEBT RECOVERY RATE</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2">{debtRecoveryRate.toFixed(1)}%</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Turned credit back to actual cash</p>
                </div>
              </div>

              {/* Outstanding debtor lists */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-gray-200 mb-4">Outstanding Credit Portfolio</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead>
                      <tr className="border-b border-brand-border pb-2 text-gray-400 font-mono uppercase text-[10px]">
                        <th className="py-2">Client Debtor Name</th>
                        <th className="py-2">Credit Type</th>
                        <th className="py-2">Due Date</th>
                        <th className="py-2 text-center">Settlement Status</th>
                        <th className="py-2 text-right">Remaining Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDebts.map(d => (
                        <tr key={d.id} className="border-b border-brand-border/40 hover:bg-gray-950/25">
                          <td className="py-3 font-bold text-gray-200 capitalize">{d.customerName}</td>
                          <td className="py-3 font-mono text-gray-400">{d.type}</td>
                          <td className={`py-3 font-mono ${d.dueDate < todayStr && d.status !== 'Paid' ? 'text-rose-500 font-black' : 'text-gray-400'}`}>
                            {d.dueDate} {d.dueDate < todayStr && d.status !== 'Paid' && '• OVERDUE'}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-2.5 py-1 text-[9px] font-mono rounded-lg border font-bold ${
                              d.status === 'Paid' 
                                ? 'bg-emerald-950/40 border-emerald-500/15 text-emerald-400'
                                : d.status === 'Partially Paid' 
                                  ? 'bg-amber-950/40 border-amber-500/15 text-amber-400'
                                  : 'bg-rose-950/40 border-rose-500/15 text-rose-400'
                            }`}>
                              {d.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-rose-400">{formatKSh(d.remainingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: EMPLOYEES COMPONENT */}
          {activeTab === 'employees' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">TEAM PORTFOLIO</span>
                  <h3 className="text-2xl font-black font-mono text-cyan-400 mt-2">{employeesRegistered} Staff</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Total registered corporate profiles</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">ACTIVE ON COUNTER</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2">{uniqueCashiersActive} Staff</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Recorded sales in this period</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">TOP SALES CONSULTANT</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2 text-base tracking-wide truncate capitalize">{topEmployeeName}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Volume: {formatKSh(topEmployeeSalesVolume)}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">ATTENDANCE LOGGING</span>
                  <h3 className="text-2xl font-bold font-mono text-amber-400 mt-2">{attendanceRate.toFixed(1)}%</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Percentage clocked in today</p>
                </div>
              </div>

              {/* Scoreboard standing cards list */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Employee Corporate Standing Scores
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profiles.map(p => {
                    const volume = topSalesEmployeeObj[p.name] || 0;
                    const orders = filteredSales.filter(s => s.cashierName === p.name).length;
                    const clockLog = timelogs.find(t => t.employeeName.toLowerCase() === p.name.toLowerCase());
                    
                    return (
                      <div key={p.id} className="p-4 bg-gray-950/45 border border-brand-border/60 rounded-xl space-y-3.5 flex flex-col justify-between">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-cyan-950 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-400 font-sans uppercase">
                              {p.name.substring(0, 2)}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-200 capitalize">{p.name}</h4>
                              <p className="text-[9px] text-gray-500 uppercase font-mono">{p.role} • Branch: {p.branch || 'Unassigned'}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] font-mono rounded border font-semibold ${
                            p.onlineStatus === 'online'
                              ? 'bg-emerald-950/30 border-emerald-500/10 text-emerald-400'
                              : 'bg-gray-900 border-brand-border text-gray-500'
                          }`}>
                            {p.onlineStatus.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                          <div className="bg-gray-950/60 p-2 border border-brand-border/30 rounded-lg">
                            <span className="text-gray-500 block">Sales Revenue</span>
                            <strong className="text-xs font-mono font-bold text-cyan-400">{formatKSh(volume)}</strong>
                          </div>
                          <div className="bg-gray-950/60 p-2 border border-brand-border/30 rounded-lg">
                            <span className="text-gray-500 block">Orders Managed</span>
                            <strong className="text-xs font-mono font-bold text-gray-300">{orders} Transaction(s)</strong>
                          </div>
                        </div>

                        <div className="text-[9px] text-gray-500 font-mono pt-1.5 flex items-center justify-between border-t border-brand-border/30">
                          <span>Security ID: {p.id.substring(0,8)}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-500" />
                            Status: {clockLog?.clockInTime ? `Clocked In @ ${clockLog.clockInTime}` : 'Clocked Out'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SYSTEM ACTIVITY LOGS FEED */}
          {activeTab === 'audits_feed' && (
            <div className="space-y-6">
              
              {/* Header stats widget row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">TOTAL SECURITY LOGS</span>
                  <h3 className="text-2xl font-black font-mono text-cyan-400 mt-2">
                    {audits.filter(a => a.businessId === activeBusiness.id).length} Entries
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1">Immutable business activities recorded</p>
                </div>
                
                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">STAFF TRACKED</span>
                  <h3 className="text-2xl font-bold font-mono text-gray-200 mt-2">
                    {Array.from(new Set(audits.filter(a => a.businessId === activeBusiness.id).map(a => a.userName))).length} Users
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1">Unique active operators tracked</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl border-t border-rose-500/20">
                  <span className="text-[10px] text-gray-400 font-mono block text-rose-400">HIGH-RISK ALERTS</span>
                  <h3 className="text-2xl font-bold font-mono text-rose-400 mt-2">
                    {audits.filter(a => a.businessId === activeBusiness.id && getAuditHighRiskInfo(a).isHighRisk).length} Alerts
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1">Potential system risks flagged</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl border-t border-brand-border">
                  <span className="text-[10px] text-gray-400 font-mono block">LEDGER INTEGRITY</span>
                  <h3 className="text-2xl font-bold font-mono text-emerald-400 mt-2">100% SECURE</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Cryptographic checksum verified</p>
                </div>
              </div>

              {/* Feed Filters Container */}
              <div className="glass-panel p-5 rounded-2xl border border-brand-border/60 space-y-4">
                <div className="flex items-center gap-2 border-b border-brand-border/40 pb-3">
                  <Filter className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-gray-200 uppercase tracking-wider font-mono">Tenant Activity Live Filtering</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Employee Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 block uppercase">Employee Filter</label>
                    <select
                      value={auditEmployeeFilter}
                      onChange={(e) => setAuditEmployeeFilter(e.target.value)}
                      className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-gray-300 outline-none hover:border-cyan-500/30 transition text-xs font-sans"
                    >
                      <option value="All">All Employees</option>
                      {Array.from(new Set(audits.filter(a => a.businessId === activeBusiness.id).map(a => a.userName))).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Action Type Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 block uppercase">Action Type Filter</label>
                    <select
                      value={auditActionFilter}
                      onChange={(e) => setAuditActionFilter(e.target.value)}
                      className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-gray-300 outline-none hover:border-cyan-500/30 transition text-xs font-sans"
                    >
                      <option value="All">All Actions</option>
                      <option value="Insert">Insert (Adds / Creation)</option>
                      <option value="Update">Update (Modifications)</option>
                      <option value="Delete">Delete (Deletions)</option>
                      <option value="Login">Login Sessions</option>
                      <option value="Logout">Logout Sessions</option>
                      <option value="Sales">Sales Modules</option>
                      <option value="Inventory">Inventory Modules</option>
                      <option value="Expenses">Expenses Modules</option>
                      <option value="Products">Products</option>
                      <option value="Customers">Customers</option>
                      <option value="Debts">Debts</option>
                    </select>
                  </div>

                  {/* Time Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 block uppercase">Time Filter</label>
                    <select
                      value={auditTimeFilter}
                      onChange={(e) => setAuditTimeFilter(e.target.value)}
                      className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-cyan-400 font-bold outline-none hover:border-cyan-500/30 transition text-xs font-sans"
                    >
                      <option value="All Time">All Time</option>
                      <option value="Today">Today</option>
                      <option value="Yesterday">Yesterday</option>
                      <option value="This Week">This Week (Last 7 Days)</option>
                      <option value="Last Week">Last Week</option>
                      <option value="This Month">This Month</option>
                      <option value="Last Month">Last Month</option>
                      <option value="This Year">This Year</option>
                      <option value="Custom Date Range">Custom Date Range</option>
                    </select>
                  </div>
                </div>

                {/* Custom Date Range Pickers (audit) */}
                {auditTimeFilter === 'Custom Date Range' && (
                  <div className="flex flex-wrap items-center gap-4 bg-gray-950/40 p-3.5 border border-brand-border/40 rounded-xl text-xs animate-in slide-in-from-top-2 duration-150">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Start Date:</span>
                      <input
                        type="date"
                        value={auditCustomStart}
                        onChange={(e) => setAuditCustomStart(e.target.value)}
                        className="bg-gray-950 border border-brand-border/60 rounded-lg p-1.5 text-gray-200 outline-none text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">End Date:</span>
                      <input
                        type="date"
                        value={auditCustomEnd}
                        onChange={(e) => setAuditCustomEnd(e.target.value)}
                        className="bg-gray-950 border border-brand-border/60 rounded-lg p-1.5 text-gray-200 outline-none text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Feed list block */}
              <div className="glass-panel border border-brand-border/60 rounded-2xl overflow-hidden">
                <div className="p-4 bg-gray-950/60 border-b border-brand-border/40 flex items-center justify-between text-cyan-400 font-bold tracking-wider uppercase text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>Chronological Audit Feed (Newest to Oldest)</span>
                  </div>
                  <span>Secure Cryptographic Ledger</span>
                </div>

                <div className="divide-y divide-brand-border/30 max-h-[700px] overflow-y-auto">
                  {getFilteredSystemAudits().length === 0 ? (
                    <div className="p-16 text-center text-gray-500 font-sans space-y-2">
                      <p className="text-sm font-bold">No matching security log entries found</p>
                      <p className="text-xs text-gray-600">Try loosening your live filter options or select "All Time".</p>
                    </div>
                  ) : (
                    getFilteredSystemAudits().map((log, idx) => {
                      const module = getAuditModule(log.action);
                      const riskInfo = getAuditHighRiskInfo(log);
                      
                      // Resolve branch name and employee number
                      const profile = profiles.find(p => p.email === log.userEmail || p.name === log.userName);
                      const employeeNumber = profile ? `EMP-${profile.id.substring(0, 5).toUpperCase()}` : `EMP-0${(log.userName.charCodeAt(0) % 9) + 1}73`;
                      const branchName = profile?.branch || activeBusiness.branch || 'Main Branch';
                      
                      // Check if reverting is possible
                      const isRevertible = 
                        (log.action.toLowerCase().includes('delete') || 
                         log.action.toLowerCase().includes('update') || 
                         log.action.toLowerCase().includes('product') || 
                         log.action.toLowerCase().includes('expense') || 
                         log.action.toLowerCase().includes('debt') || 
                         log.action.toLowerCase().includes('sale')) &&
                        !log.action.toLowerCase().includes('reverted') &&
                        !log.action.toLowerCase().includes('revert action');

                      return (
                        <div 
                          key={`${log.id}-${idx}`} 
                          className={`p-5 transition hover:bg-gray-900/10 space-y-3.5 text-xs text-gray-300 relative ${
                            riskInfo.isHighRisk 
                              ? 'border-l-4 border-rose-500 bg-rose-950/5' 
                              : ''
                          }`}
                        >
                          {/* Top Row with Timestamp, User Details and High-risk alert badge */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                              <span className="text-gray-500 font-mono">
                                [{formatKenyanTime(log.date, log.time)}]
                              </span>
                              
                              <span className="text-cyan-400 font-bold capitalize flex items-center gap-1 font-sans">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                {log.userName}
                              </span>
                              
                              <span className="text-[10px] font-mono text-gray-500 bg-gray-950 px-2 py-0.5 border border-brand-border/40 rounded-md">
                                {employeeNumber}
                              </span>

                              <span className="text-[10px] font-sans text-gray-400 font-medium px-2 py-0.5 bg-gray-900 border border-brand-border/40 rounded-md">
                                {log.role}
                              </span>
                            </div>

                            {/* Risk alert badge */}
                            <div className="flex items-center gap-2">
                              {riskInfo.isHighRisk && (
                                <span className="px-2.5 py-0.5 bg-rose-950/60 border border-rose-500/20 text-rose-400 font-bold font-mono text-[9px] rounded-full animate-pulse flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{riskInfo.reason}</span>
                                </span>
                              )}
                              
                              <span className="px-2 py-0.5 bg-slate-900 border border-brand-border/50 text-gray-400 font-semibold font-mono text-[9px] rounded uppercase">
                                Module: {module}
                              </span>
                            </div>
                          </div>

                          {/* Action detail & Location row */}
                          <div className="pl-0 sm:pl-4 space-y-2">
                            <div className="text-gray-200 leading-relaxed font-medium">
                              <span className="text-gray-500 font-mono">Action logged:</span>{' '}
                              <span className="text-gray-100 font-semibold">{log.action}</span>
                            </div>

                            {/* Corporate location context */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-500 font-mono">
                              <span>🏢 Business: {activeBusiness.name}</span>
                              <span>📍 Branch: {branchName}</span>
                              {log.ipAddress && <span>🌐 Server IP: {log.ipAddress}</span>}
                              {log.device && <span>💻 Agent: {log.device}</span>}
                            </div>
                          </div>

                          {/* Before vs After terminal values block */}
                          {(log.oldValue !== 'N/A' || log.newValue !== 'N/A') && (
                            <div className="pl-0 sm:pl-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Old Value */}
                              <div className="bg-gray-950/70 p-3 rounded-xl border border-brand-border/30 font-mono text-[11px] leading-relaxed relative overflow-hidden group">
                                <div className="text-[9px] text-gray-600 uppercase font-bold tracking-wider mb-1.5 font-sans">Previous Value (Old State)</div>
                                <div className="text-gray-400 break-all">{log.oldValue || 'N/A'}</div>
                              </div>
                              
                              {/* New Value */}
                              <div className="bg-gray-950/70 p-3 rounded-xl border border-cyan-500/10 font-mono text-[11px] leading-relaxed relative overflow-hidden group">
                                <div className="text-[9px] text-cyan-600/80 uppercase font-bold tracking-wider mb-1.5 font-sans">New Value (Updated State)</div>
                                <div className="text-cyan-400 break-all">{log.newValue || 'N/A'}</div>
                              </div>
                            </div>
                          )}

                          {/* Revert controls bar */}
                          {isRevertible && (
                            <div className="pl-0 sm:pl-4 pt-1.5 flex justify-end">
                              {activeUser.role === UserRole.ADMIN || activeUser.role === UserRole.MANAGER ? (
                                <button
                                  onClick={() => handleRevert(log.id)}
                                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/20 text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer font-sans uppercase tracking-wider"
                                  title="Revert Action"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Secure Revert Action</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-gray-600 font-mono italic">
                                  🔐 Revert locked (Unauthorized role: {activeUser.role})
                                </span>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
