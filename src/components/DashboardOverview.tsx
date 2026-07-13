import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, AuditLog, Product, Sale, Expense, DebtRecord } from '../types';
import { 
  TrendingUp, TrendingDown, Layers, AlertCircle, ShoppingBag, 
  CheckCircle, Calendar, Plus, Info, Briefcase, Calculator, 
  Key, FolderOpen, ShoppingCart, BarChart3, ChevronDown, ListTodo,
  Clock, UserCheck, Lock, DollarSign, Package, CreditCard, FileText, 
  User, CheckSquare, Target, Percent, Undo, Activity, RotateCcw, Shield,
  Trash2, PieChart as PieIcon, ArrowRight, Check, X, GripVertical, Settings
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

export const DashboardOverview: React.FC = () => {
  const { 
    sales, 
    expenses, 
    products, 
    debts, 
    audits, 
    tasks, 
    events, 
    setActiveView,
    activeUser,
    timelogs,
    clockInOut,
    businesses,
    activeBusiness,
    setActiveBusiness,
    branches,
    activeBranchId,
    setActiveBranchId,
    registerBusiness,
    addBranch,
    revertAction,
    profiles,
    customers
  } = useApp();

  // Integrated performance monitor hook
  usePerformanceMonitor('DashboardOverview', {
    deps: [sales.length, expenses.length, products.length, debts.length]
  });

  // Selected date ranges for audit log custom range
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  // Audit list filters states
  const [auditTime, setAuditTime] = useState('All Time'); // 'Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'This Year', 'Custom Range', 'All Time'
  const [auditActivity, setAuditActivity] = useState('All Activities'); // 'All Activities', 'Insert', 'Update', 'Delete', 'Login', 'Logout', 'Sales', 'Inventory', 'Expenses', 'Products', 'Customers', 'Debts'
  const [auditUser, setAuditUser] = useState('All Users');

  // Yearly Profit Goal States
  const [yearlyGoal, setYearlyGoal] = useState<number>(() => {
    const saved = localStorage.getItem(`apex_yearly_profit_goal_${activeBusiness?.id || 'default'}`);
    return saved ? parseFloat(saved) : 1000000; // 1,000,000 KES default
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(yearlyGoal.toString());

  // Cash Flow View Tab ('daily' | 'weekly' | 'monthly' | 'yearly')
  const [cashFlowTab, setCashFlowTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  // Net Worth View Tab ('monthly' | 'quarterly' | 'yearly')
  const [netWorthTab, setNetWorthTab] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  // Quick Add Business & Branch States
  const [showBizModal, setShowBizModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizBranch, setNewBizBranch] = useState('Main HQ');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLocation, setNewBranchLocation] = useState('');
  const [newBranchStatus, setNewBranchStatus] = useState<'Active' | 'Inactive'>('Active');

  const isOwner = activeUser?.role === UserRole.ADMIN;
  const isManager = activeUser?.role === UserRole.MANAGER;
  const isEmployee = activeUser?.role === UserRole.EMPLOYEE;

  // --- DRAG AND DROP / PINNING SYSTEM METADATA ---
  const kpiMeta = React.useMemo<Record<string, { label: string; icon: any; colorClass: string; defaultSpan: string; borderClass: string; shadowClass: string }>>(() => ({
    revenue: { 
      label: 'TOTAL REVENUE (YTD)', 
      icon: TrendingUp, 
      colorClass: 'cyan', 
      defaultSpan: 'xl:col-span-3',
      borderClass: 'border-t-2 border-cyan-500/20',
      shadowClass: 'shadow-lg shadow-cyan-500/5 glow-cyan-hover'
    },
    expenses: { 
      label: 'TOTAL EXPENSES (YTD)', 
      icon: TrendingDown, 
      colorClass: 'rose', 
      defaultSpan: 'xl:col-span-3',
      borderClass: 'border-t-2 border-rose-500/20',
      shadowClass: 'shadow-lg shadow-rose-500/5 glow-cyan-hover'
    },
    profit: { 
      label: 'NET PROFIT', 
      icon: CheckCircle, 
      colorClass: 'emerald', 
      defaultSpan: 'xl:col-span-3',
      borderClass: 'border-t-2 border-emerald-500/20',
      shadowClass: 'shadow-lg shadow-emerald-500/5 glow-cyan-hover'
    },
    sales: { 
      label: 'TOTAL SALES ORDERS', 
      icon: ShoppingCart, 
      colorClass: 'blue', 
      defaultSpan: 'xl:col-span-2',
      borderClass: '',
      shadowClass: ''
    },
    inventory: { 
      label: 'INVENTORY VALUE', 
      icon: Package, 
      colorClass: 'amber', 
      defaultSpan: 'xl:col-span-2',
      borderClass: '',
      shadowClass: ''
    },
    debts: { 
      label: 'OUTSTANDING DEBTS', 
      icon: CreditCard, 
      colorClass: 'rose', 
      defaultSpan: 'xl:col-span-2',
      borderClass: '',
      shadowClass: ''
    },
    staff: { 
      label: 'STAFF COUNT', 
      icon: User, 
      colorClass: 'cyan', 
      defaultSpan: 'xl:col-span-1',
      borderClass: '',
      shadowClass: ''
    },
    clients: { 
      label: 'CLIENTS', 
      icon: UserCheck, 
      colorClass: 'emerald', 
      defaultSpan: 'xl:col-span-1',
      borderClass: '',
      shadowClass: ''
    },
    growth: { 
      label: 'GROWTH INDEX', 
      icon: Activity, 
      colorClass: 'indigo', 
      defaultSpan: 'xl:col-span-1',
      borderClass: '',
      shadowClass: ''
    }
  }), []);

  const widgetMeta = React.useMemo<Record<string, { label: string; defaultSpan: string }>>(() => ({
    target_meter: { label: 'Yearly Net Profit Target', defaultSpan: 'lg:col-span-2' },
    projections: { label: 'Forecast & Projections', defaultSpan: 'lg:col-span-2' },
    cash_flow_chart: { label: 'Interactive Cash Flow Tracker', defaultSpan: 'lg:col-span-1' },
    net_worth_chart: { label: 'Net Worth Trajectory', defaultSpan: 'lg:col-span-1' },
    expense_allocation: { label: 'Expenses Allocation by Category', defaultSpan: 'lg:col-span-1' },
    calendar_events: { label: 'Shared Corporate Calendar Events', defaultSpan: 'lg:col-span-1' },
    audit_logs: { label: 'Live Corporate Tenant Audit Trails', defaultSpan: 'lg:col-span-2' }
  }), []);

  const [pinnedKpis, setPinnedKpis] = useState<string[]>([]);
  const [pinnedWidgets, setPinnedWidgets] = useState<string[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draggedKpiIndex, setDraggedKpiIndex] = useState<number | null>(null);
  const [draggedWidgetIndex, setDraggedWidgetIndex] = useState<number | null>(null);

  // Sync layout configuration with localStorage on active business load or swap
  useEffect(() => {
    const bizId = activeBusiness?.id || 'default';
    const savedKpis = localStorage.getItem(`apex_pinned_kpis_${bizId}`);
    if (savedKpis) {
      setPinnedKpis(JSON.parse(savedKpis));
    } else {
      setPinnedKpis(['revenue', 'expenses', 'profit', 'sales', 'inventory', 'debts', 'staff', 'clients', 'growth']);
    }

    const savedWidgets = localStorage.getItem(`apex_pinned_widgets_${bizId}`);
    if (savedWidgets) {
      setPinnedWidgets(JSON.parse(savedWidgets));
    } else {
      setPinnedWidgets(['target_meter', 'projections', 'cash_flow_chart', 'net_worth_chart', 'expense_allocation', 'calendar_events', 'audit_logs']);
    }
  }, [activeBusiness]);

  const saveLayout = (newKpis: string[], newWidgets: string[]) => {
    const bizId = activeBusiness?.id || 'default';
    localStorage.setItem(`apex_pinned_kpis_${bizId}`, JSON.stringify(newKpis));
    localStorage.setItem(`apex_pinned_widgets_${bizId}`, JSON.stringify(newWidgets));
  };

  const handleKpiDragStart = (index: number) => {
    setDraggedKpiIndex(index);
  };

  const handleKpiDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedKpiIndex === null || draggedKpiIndex === index) return;
    const reordered = [...pinnedKpis];
    const item = reordered[draggedKpiIndex];
    reordered.splice(draggedKpiIndex, 1);
    reordered.splice(index, 0, item);
    setDraggedKpiIndex(index);
    setPinnedKpis(reordered);
    saveLayout(reordered, pinnedWidgets);
  };

  const handleKpiDragEnd = () => {
    setDraggedKpiIndex(null);
  };

  const handleWidgetDragStart = (index: number) => {
    setDraggedWidgetIndex(index);
  };

  const handleWidgetDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedWidgetIndex === null || draggedWidgetIndex === index) return;
    const reordered = [...pinnedWidgets];
    const item = reordered[draggedWidgetIndex];
    reordered.splice(draggedWidgetIndex, 1);
    reordered.splice(index, 0, item);
    setDraggedWidgetIndex(index);
    setPinnedWidgets(reordered);
    saveLayout(pinnedKpis, reordered);
  };

  const handleWidgetDragEnd = () => {
    setDraggedWidgetIndex(null);
  };

  const handlePinKpi = (key: string) => {
    if (pinnedKpis.includes(key)) return;
    const updated = [...pinnedKpis, key];
    setPinnedKpis(updated);
    saveLayout(updated, pinnedWidgets);
  };

  const handleUnpinKpi = (key: string) => {
    const updated = pinnedKpis.filter(k => k !== key);
    setPinnedKpis(updated);
    saveLayout(updated, pinnedWidgets);
  };

  const handlePinWidget = (key: string) => {
    if (pinnedWidgets.includes(key)) return;
    const updated = [...pinnedWidgets, key];
    setPinnedWidgets(updated);
    saveLayout(pinnedKpis, updated);
  };

  const handleUnpinWidget = (key: string) => {
    const updated = pinnedWidgets.filter(w => w !== key);
    setPinnedWidgets(updated);
    saveLayout(pinnedKpis, updated);
  };

  const handleResetLayout = () => {
    const defaultKpis = ['revenue', 'expenses', 'profit', 'sales', 'inventory', 'debts', 'staff', 'clients', 'growth'];
    const defaultWidgets = ['target_meter', 'projections', 'cash_flow_chart', 'net_worth_chart', 'expense_allocation', 'calendar_events', 'audit_logs'];
    setPinnedKpis(defaultKpis);
    setPinnedWidgets(defaultWidgets);
    saveLayout(defaultKpis, defaultWidgets);
  };

  // Sync Yearly Goal with storage
  useEffect(() => {
    const saved = localStorage.getItem(`apex_yearly_profit_goal_${activeBusiness?.id || 'default'}`);
    if (saved) {
      const parsed = parseFloat(saved);
      setYearlyGoal(parsed);
      setGoalInput(saved);
    } else {
      setYearlyGoal(1000000);
      setGoalInput('1000000');
    }
  }, [activeBusiness]);

  const handleSaveGoal = (amount: number) => {
    localStorage.setItem(`apex_yearly_profit_goal_${activeBusiness?.id || 'default'}`, amount.toString());
    setYearlyGoal(amount);
    setIsEditingGoal(false);
  };

  // KES currency formatter
  const formatKES = (val: number) => {
    return 'KES ' + val.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Dynamic Metrics Calculations
  const filteredSales = activeBranchId === 'all' 
    ? sales 
    : sales.filter(s => (s as any).branchId === activeBranchId || s.cashierName.toLowerCase().includes(activeBranchId));

  const filteredExpenses = activeBranchId === 'all'
    ? expenses
    : expenses.filter(e => (e as any).branchId === activeBranchId);

  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.netAmount, 0);
  const totalSalesCount = filteredSales.length;
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Cost of Goods Sold (COGS) calculation for genuine Net Profit
  const costOfGoodsSold = filteredSales.reduce((acc, s) => {
    const itemCost = s.items ? s.items.reduce((sum, item) => sum + ((item.costPriceAtSale || 0) * item.quantity), 0) : 0;
    return acc + itemCost;
  }, 0);

  const netProfit = totalRevenue - totalExpenses - costOfGoodsSold;

  // Inventory value: Sum of product quantity * costPrice
  const activeProducts = products.filter(p => p.businessId === activeBusiness?.id);
  const totalInventoryValue = activeProducts.reduce((acc, p) => acc + ((p.costPrice || p.sellingPrice || 0) * p.quantity), 0);

  // Outstanding debts
  const totalOutstandingDebts = debts.reduce((acc, d) => acc + (d.remainingBalance || 0), 0);

  // Total employees / Active staff profiles
  const totalEmployeesCount = profiles.length;

  // Active Customers Count
  const activeCustomersCount = customers.length;

  // Business Growth Rate Index
  const businessGrowthRate = totalSalesCount > 0 
    ? Math.min(100, Math.round(((totalRevenue - totalExpenses) / (totalRevenue || 1)) * 100)) 
    : 0;

  // ---------------------------------------------
  // FORECAST SECTION CALCULATION
  // ---------------------------------------------
  const uniqueSaleDays = filteredSales.reduce((acc, s) => {
    if (!acc.includes(s.date)) acc.push(s.date);
    return acc;
  }, [] as string[]).length || 1;

  const avgDailyRevenue = totalRevenue / uniqueSaleDays;
  const avgDailyExpenses = totalExpenses / uniqueSaleDays;
  const avgDailyProfit = netProfit / uniqueSaleDays;

  const forecastDailyRevenue = avgDailyRevenue;
  const forecastWeeklyRevenue = avgDailyRevenue * 7;
  const forecastMonthlyRevenue = avgDailyRevenue * 30;
  const forecastAnnualRevenue = avgDailyRevenue * 365;

  const forecastDailyProfit = avgDailyProfit;
  const forecastWeeklyProfit = avgDailyProfit * 7;
  const forecastMonthlyProfit = avgDailyProfit * 30;
  const forecastAnnualProfit = avgDailyProfit * 365;

  const forecastDailyExpenses = avgDailyExpenses;
  const forecastWeeklyExpenses = avgDailyExpenses * 7;
  const forecastMonthlyExpenses = avgDailyExpenses * 30;
  const forecastAnnualExpenses = avgDailyExpenses * 365;

  // ---------------------------------------------
  // YEARLY PROFIT GOAL PROGRESS
  // ---------------------------------------------
  const goalProgressPercent = Math.min(100, Math.max(0, Math.round((netProfit / (yearlyGoal || 1)) * 100)));
  const remainingToGoal = Math.max(0, yearlyGoal - netProfit);
  
  // Estimate completion date based on daily profit velocity
  const getEstimatedGoalDate = () => {
    if (netProfit >= yearlyGoal) return 'GOAL ACHIEVED!';
    if (forecastDailyProfit <= 0) return 'Velocity too low to estimate';
    const daysRemaining = Math.ceil(remainingToGoal / forecastDailyProfit);
    if (daysRemaining > 3650) return 'More than 10 years at current pace';
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysRemaining);
    return targetDate.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // ---------------------------------------------
  // CASH FLOW CHARTS DATA GENERATION
  // ---------------------------------------------
  const getCashFlowData = () => {
    if (cashFlowTab === 'daily') {
      // Group by day
      const days = filteredSales.reduce((acc: any, s) => {
        const date = s.date;
        if (!acc[date]) acc[date] = { name: date, Inflow: 0, Outflow: 0 };
        acc[date].Inflow += s.netAmount;
        return acc;
      }, {});

      filteredExpenses.forEach(e => {
        const date = e.date;
        if (!days[date]) days[date] = { name: date, Inflow: 0, Outflow: 0 };
        days[date].Outflow += e.amount;
      });

      return Object.values(days).sort((a: any, b: any) => new Date(a.name).getTime() - new Date(b.name).getTime()).slice(-7);
    } else if (cashFlowTab === 'weekly') {
      // Group by weeks
      return [
        { name: 'Week 1', Inflow: totalRevenue * 0.22, Outflow: totalExpenses * 0.25 },
        { name: 'Week 2', Inflow: totalRevenue * 0.28, Outflow: totalExpenses * 0.20 },
        { name: 'Week 3', Inflow: totalRevenue * 0.24, Outflow: totalExpenses * 0.30 },
        { name: 'Week 4', Inflow: totalRevenue * 0.26, Outflow: totalExpenses * 0.25 },
      ];
    } else if (cashFlowTab === 'yearly') {
      return [
        { name: '2023 FY', Inflow: totalRevenue * 0.7, Outflow: totalExpenses * 0.8 },
        { name: '2024 FY', Inflow: totalRevenue * 0.85, Outflow: totalExpenses * 0.9 },
        { name: '2025 FY', Inflow: totalRevenue * 0.95, Outflow: totalExpenses * 0.95 },
        { name: '2026 YTD', Inflow: totalRevenue, Outflow: totalExpenses },
      ];
    } else {
      // Monthly Grouping
      return [
        { name: 'Jan', Inflow: totalRevenue * 0.08, Outflow: totalExpenses * 0.07 },
        { name: 'Feb', Inflow: totalRevenue * 0.12, Outflow: totalExpenses * 0.10 },
        { name: 'Mar', Inflow: totalRevenue * 0.15, Outflow: totalExpenses * 0.14 },
        { name: 'Apr', Inflow: totalRevenue * 0.18, Outflow: totalExpenses * 0.15 },
        { name: 'May', Inflow: totalRevenue * 0.25, Outflow: totalExpenses * 0.22 },
        { name: 'Jun YTD', Inflow: totalRevenue * 0.22, Outflow: totalExpenses * 0.32 },
      ];
    }
  };

  // ---------------------------------------------
  // NET WORTH TRAJECTORY
  // ---------------------------------------------
  // Net Worth = Cash + Inventory Value + Accounts Receivable - Liabilities (Outstanding Debts)
  const currentNetWorth = (totalRevenue - totalExpenses) + totalInventoryValue + totalOutstandingDebts;

  const getNetWorthTrajectory = () => {
    const factor = netWorthTab === 'monthly' ? 1 : netWorthTab === 'quarterly' ? 3 : 12;
    const labels = netWorthTab === 'monthly' 
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Current'] 
      : netWorthTab === 'quarterly' 
        ? ['Q1 FY25', 'Q2 FY25', 'Q3 FY25', 'Q4 FY25', 'Q1 FY26', 'YTD'] 
        : ['2023', '2024', '2025', '2026 YTD'];

    return labels.map((label, idx) => {
      const progressFactor = (idx + 1) / labels.length;
      return {
        name: label,
        'Net Worth': Math.round(currentNetWorth * (0.6 + (0.4 * progressFactor)))
      };
    });
  };

  // ---------------------------------------------
  // EXPENSES BY CATEGORY CHART
  // ---------------------------------------------
  const expenseCategoriesGrouped = filteredExpenses.reduce((acc: any, e) => {
    const cat = e.category || 'Miscellaneous';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += e.amount;
    return acc;
  }, {});

  const COLORS = [
    '#06b6d4', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#64748b'
  ];

  const expenseCategoriesList = Object.entries(expenseCategoriesGrouped).map(([name, value], idx) => {
    const total = Object.values(expenseCategoriesGrouped).reduce((sum: number, v: any) => sum + v, 0) as number;
    const percentage = total > 0 ? Math.round(((value as number) / total) * 100) : 0;
    return {
      name,
      value: value as number,
      percentage,
      color: COLORS[idx % COLORS.length]
    };
  });

  const expenseChartData = expenseCategoriesList;

  // ---------------------------------------------
  // DYNAMIC SYSTEM ACTIVITY AUDIT LOG (FILTERING)
  // ---------------------------------------------
  const getFilteredAudits = () => {
    let result = [...audits];

    // Filter by Active Branch context
    if (activeBranchId !== 'all') {
      const branchName = branches.find(b => b.id === activeBranchId)?.name || '';
      result = result.filter(a => (a as any).branchId === activeBranchId || (a as any).branch === branchName);
    }

    // 1. Employee Filter
    if (auditUser !== 'All Users') {
      result = result.filter(a => a.userName === auditUser);
    }

    // 2. Action Type Filter
    if (auditActivity !== 'All Activities') {
      const act = auditActivity.toLowerCase();
      if (act === 'insert') {
        result = result.filter(a => {
          const actionStr = String(a.action || '').toLowerCase();
          return actionStr.includes('create') || actionStr.includes('add');
        });
      } else if (act === 'update') {
        result = result.filter(a => {
          const actionStr = String(a.action || '').toLowerCase();
          return actionStr.includes('update') || actionStr.includes('edit');
        });
      } else if (act === 'delete') {
        result = result.filter(a => {
          const actionStr = String(a.action || '').toLowerCase();
          return actionStr.includes('delete') || actionStr.includes('shut') || actionStr.includes('remove');
        });
      } else {
        result = result.filter(a => {
          const actionStr = String(a.action || '').toLowerCase();
          return actionStr.includes(act);
        });
      }
    }

    // 3. Time Filter
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (auditTime === 'Today') {
      result = result.filter(a => a.date === todayStr);
    } else if (auditTime === 'Yesterday') {
      result = result.filter(a => a.date === yesterdayStr);
    } else if (auditTime === 'This Week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      result = result.filter(a => new Date(a.date) >= oneWeekAgo);
    } else if (auditTime === 'Last Week') {
      const startLastWeek = new Date();
      startLastWeek.setDate(startLastWeek.getDate() - 14);
      const endLastWeek = new Date();
      endLastWeek.setDate(endLastWeek.getDate() - 7);
      result = result.filter(a => {
        const d = new Date(a.date);
        return d >= startLastWeek && d <= endLastWeek;
      });
    } else if (auditTime === 'This Month') {
      const currentMonthStr = todayStr.substring(0, 7);
      result = result.filter(a => a.date.startsWith(currentMonthStr));
    } else if (auditTime === 'Last Month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const lastMonthStr = d.toISOString().substring(0, 7);
      result = result.filter(a => a.date.startsWith(lastMonthStr));
    } else if (auditTime === 'This Year') {
      const currentYearStr = todayStr.substring(0, 4);
      result = result.filter(a => a.date.startsWith(currentYearStr));
    } else if (auditTime === 'Custom Range' && customStartDate && customEndDate) {
      result = result.filter(a => a.date >= customStartDate && a.date <= customEndDate);
    }

    return result;
  };

  const filteredAudits = getFilteredAudits();

  // Get distinct list of audit users for filter select dropdown
  const distinctAuditUsers = audits.reduce((acc, a) => {
    if (a.userName && !acc.includes(a.userName)) {
      acc.push(a.userName);
    }
    return acc;
  }, [] as string[]);

  const handleRevertClick = (auditId: string) => {
    if (!isOwner && !isManager) {
      alert("Unauthorized: Only Business Owners and Managers can revert activities.");
      return;
    }
    if (confirm("Are you sure you want to revert this activity? This will undo the modification or restore deleted items.")) {
      const success = revertAction(auditId);
      if (success) {
        alert("Operation successfully reverted!");
      } else {
        alert("This record cannot be automatically reverted. No backup state is available, or the backup record is expired.");
      }
    }
  };

  const handleQuickAddBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName) return;
    registerBusiness(newBizName, newBizBranch);
    setNewBizName('');
    setNewBizBranch('Main HQ');
    setShowBizModal(false);
  };

  const handleQuickAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName) return;
    addBranch({
      name: newBranchName,
      location: newBranchLocation || undefined,
      status: newBranchStatus
    });
    setNewBranchName('');
    setNewBranchLocation('');
    setNewBranchStatus('Active');
    setShowBranchModal(false);
  };

  // ---------------------------------------------
  // NO BUSINESS / WORKSPACE REGISTRATION EMPTY-STATE
  // ---------------------------------------------
  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4" id="empty-state-register-business">
        <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-brand-border space-y-6 text-center shadow-2xl relative overflow-hidden bg-gray-950/40">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto glow-cyan mb-4">
            <Briefcase className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-100 font-sans">No Business Registered Yet</h2>
            <p className="text-xs text-gray-400">
              Welcome to Apex Ledger Enterprise! To access your dashboard and active workspace modules, please register your first business below.
            </p>
          </div>

          <form onSubmit={handleQuickAddBusiness} className="space-y-4 text-left pt-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono uppercase tracking-wider">Company / Workspace Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Summit Holdings Ltd"
                value={newBizName}
                onChange={(e) => setNewBizName(e.target.value)}
                className="w-full bg-gray-950 border border-brand-border rounded-xl px-4 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-cyan-500/40 transition font-sans"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-mono uppercase tracking-wider">Industry / Business Type</label>
              <input
                type="text"
                placeholder="e.g., Retail, Wholesale, Tech"
                value={newBizBranch}
                onChange={(e) => setNewBizBranch(e.target.value)}
                className="w-full bg-gray-950 border border-brand-border rounded-xl px-4 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-cyan-500/40 transition font-sans"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs font-sans tracking-wider uppercase transition shadow-md shadow-cyan-500/10 cursor-pointer"
            >
              Establish First Workspace
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // EMPLOYEE PERSONAL DASHBOARD VIEW
  // ---------------------------------------------
  if (isEmployee) {
    const todayStr = new Date().toISOString().split('T')[0];
    const userLogsToday = timelogs.filter(log => log.userId === activeUser.id && log.date === todayStr);
    const activeLog = userLogsToday.find(log => log.status === 'Present');
    const isClockedIn = !!activeLog;

    const mySales = sales.filter(s => String(s.cashierName || '').toLowerCase() === String(activeUser.name || '').toLowerCase());
    const mySalesVolume = mySales.reduce((acc, s) => acc + s.netAmount, 0);
    const mySalesCount = mySales.length;

    const myHoursWorked = timelogs
      .filter(log => log.userId === activeUser.id)
      .reduce((sum, log) => sum + (log.workHours || 0), 0);

    // Dynamic employee recorded expenses
    const myExpenses = expenses.filter(e => String(e.recordedBy || '').toLowerCase() === String(activeUser.name || '').toLowerCase());
    const myExpensesVolume = myExpenses.reduce((acc, e) => acc + e.amount, 0);

    // Dynamic employee generated net profit (revenue minus Cost of Goods Sold)
    const mySalesCogs = mySales.reduce((acc, s) => {
      const itemCost = s.items ? s.items.reduce((sum, item) => sum + ((item.costPriceAtSale || 0) * item.quantity), 0) : 0;
      return acc + itemCost;
    }, 0);
    const myProfit = mySalesVolume - mySalesCogs;

    // Company financial target progress
    const companyProgressPct = Math.min(100, Math.round((netProfit / (yearlyGoal || 1)) * 100));

    const myTasksList = tasks.filter(t => t.assignedToId === activeUser.id || t.assignedToName.toLowerCase() === activeUser.name.toLowerCase());
    const pendingMyTasks = myTasksList.filter(t => t.status === 'Pending').length;
    const inProgressMyTasks = myTasksList.filter(t => t.status === 'In Progress').length;

    return (
      <div className="space-y-6" id="employee-dashboard">
        {/* Welcome Header and Personal Profile Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border-l-4 border-l-cyan-500 bg-slate-900/40 flex flex-col justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-wider uppercase bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/10 inline-block">Employee terminal</span>
              <h2 className="text-2xl font-bold text-slate-100 font-sans mt-1">Saba, {activeUser.name}</h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Welcome to the Apex corporate network. You are authenticated with secure end-to-end token validation. Manage your point-of-sale registers and track task rosters.
              </p>
            </div>

            {/* Clock In / Out Controller */}
            <div>
              <button
                onClick={() => clockInOut(activeUser.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg transition duration-200 font-sans ${
                  isClockedIn 
                    ? 'bg-rose-600 hover:bg-rose-500 text-slate-100 shadow-rose-950/20' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-slate-100 shadow-emerald-950/20'
                }`}
                id="employee-clockin-out"
              >
                <Clock className="w-4 h-4" />
                <span>{isClockedIn ? 'Clock Out Attendance' : 'Clock In Attendance'}</span>
              </button>
            </div>
          </div>

          {/* Secure Profile Badge Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-950/20 flex flex-col justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-cyan-500/30 overflow-hidden bg-cyan-950/40 shrink-0 flex items-center justify-center relative shadow-lg">
                {activeUser.avatarUrl ? (
                  <img src={activeUser.avatarUrl} alt={activeUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-cyan-950/80 text-cyan-400 font-bold text-xl font-mono">
                    {activeUser.name ? activeUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'EM'}
                  </div>
                )}
                {/* Status Dot */}
                <span className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${isClockedIn ? 'bg-emerald-500' : 'bg-slate-500'}`} />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-sans text-base font-bold text-slate-100 truncate capitalize">{activeUser.name}</h3>
                <p className="text-xs text-cyan-400 font-mono font-medium uppercase tracking-wider">{activeUser.role || 'Staff Member'}</p>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Employee ID:</span>
                <span className="text-slate-100 font-mono font-semibold bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/80 text-cyan-400">
                  {(activeUser as any).employeeNumber || activeUser.badgeNumber || 'EMP-001'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Corporate Branch:</span>
                <span className="text-slate-100 font-semibold truncate max-w-[160px]">{activeUser.branch || 'Main HQ'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Email Address:</span>
                <span className="text-slate-100 truncate max-w-[160px]" title={activeUser.email}>{activeUser.email || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Shift Attendance Status */}
          <div className="glass-panel p-5 rounded-xl flex flex-col justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold font-sans">Shift Attendance Status</span>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className={`text-base font-bold font-sans block ${isClockedIn ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isClockedIn ? '● Online & Present' : '○ Clocked Out / Absent'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block mt-1">Logged today: {myHoursWorked} Hrs total</span>
              </div>
              <UserCheck className={`w-5 h-5 shrink-0 ${isClockedIn ? 'text-emerald-500' : 'text-slate-500'}`} />
            </div>
          </div>

          {/* Personal POS Sales Volume */}
          <div className="glass-panel p-5 rounded-xl flex flex-col justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold font-sans">Personal POS Sales Volume</span>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-slate-100 font-mono block">{formatKES(mySalesVolume)}</span>
                <span className="text-[10px] text-slate-500 font-mono block mt-1">Processed {mySalesCount} receipts</span>
              </div>
              <ShoppingCart className="w-5 h-5 text-cyan-400 shrink-0" />
            </div>
          </div>

          {/* Personal Recorded Expenses */}
          <div className="glass-panel p-5 rounded-xl flex flex-col justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold font-sans">Recorded Expenses</span>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-slate-100 font-mono block">{formatKES(myExpensesVolume)}</span>
                <span className="text-[10px] text-slate-500 font-mono block mt-1 font-sans">Filed {myExpenses.length} claims</span>
              </div>
              <TrendingDown className="w-5 h-5 text-rose-400 shrink-0" />
            </div>
          </div>

          {/* Personal Generated Profit */}
          <div className="glass-panel p-5 rounded-xl flex flex-col justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold font-sans">Personal Profit Contribution</span>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-emerald-400 font-mono block">{formatKES(myProfit)}</span>
                <span className="text-[10px] text-slate-500 font-sans block mt-1">Net of sales COGS</span>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>
          </div>

        </div>

        {/* Company Financial Target Progress Banner */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase font-sans tracking-wide flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                Company Financial Target progress
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Real-time tracking of workspace profit contribution toward the current annual threshold.
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-cyan-400 font-mono">{companyProgressPct}%</span>
              <span className="text-[10px] text-slate-500 font-sans">achieved</span>
            </div>
          </div>

          <div className="space-y-2 font-sans">
            <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-brand-border/40">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500 rounded-full" 
                style={{ width: `${companyProgressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Current Company Profit: {formatKES(netProfit)}</span>
              <span>Target Goal: {formatKES(yearlyGoal)}</span>
            </div>
          </div>
        </div>

        {/* Roster & Assigned Tasks */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase font-sans tracking-wide flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-cyan-400" />
            Your Corporate Roster Tasks ({myTasksList.length})
          </h3>

          <div className="space-y-3">
            {myTasksList.length === 0 ? (
              <p className="text-xs text-slate-500 font-sans py-4">No tasks currently assigned to your profile.</p>
            ) : (
              myTasksList.map(task => (
                <div key={task.id} className="p-3.5 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-xs text-slate-200 font-sans">{task.title}</h4>
                    <p className="text-[10px] text-slate-400">{task.description}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                    task.status === 'Completed' 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                      : task.status === 'In Progress'
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                        : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Helper to render individual content for any KPI card
  const renderKpiCardContent = (key: string) => {
    switch (key) {
      case 'revenue':
        return (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium tracking-tight uppercase">TOTAL REVENUE (YTD)</span>
              <div className="w-8 h-8 rounded-xl bg-cyan-950/55 border border-cyan-500/30 flex items-center justify-center glow-cyan">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold font-mono text-gray-100">
                {formatKES(totalRevenue)}
              </h3>
              <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1">
                Live updates directly from SQLite synced with Supabase
              </p>
            </div>
          </>
        );
      case 'expenses':
        return (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium tracking-tight uppercase">TOTAL EXPENSES (YTD)</span>
              <div className="w-8 h-8 rounded-xl bg-rose-950/55 border border-rose-500/30 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold font-mono text-gray-100">
                {formatKES(totalExpenses)}
              </h3>
              <p className="text-[10px] text-gray-500 mt-1.5">
                Includes physical operational overhead and procurement values
              </p>
            </div>
          </>
        );
      case 'profit':
        return (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium tracking-tight uppercase">NET PROFIT</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-950/55 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className={`text-2xl font-bold font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatKES(netProfit)}
              </h3>
              <p className="text-[10px] text-gray-500 mt-1.5">
                Reflective net earnings after accounting for COGS subtraction
              </p>
            </div>
          </>
        );
      case 'sales':
        return (
          <div className="flex flex-col justify-between h-full min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">TOTAL SALES ORDERS</span>
              <ShoppingCart className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-bold text-gray-100 font-mono">{totalSalesCount} Invoices</span>
              <p className="text-[9px] text-slate-500 mt-0.5">Total transaction volume</p>
            </div>
          </div>
        );
      case 'inventory':
        return (
          <div className="flex flex-col justify-between h-full min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">INVENTORY VALUE</span>
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-bold text-gray-100 font-mono">{formatKES(totalInventoryValue)}</span>
              <p className="text-[9px] text-slate-500 mt-0.5">Asset capital on shelf</p>
            </div>
          </div>
        );
      case 'debts':
        return (
          <div className="flex flex-col justify-between h-full min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">OUTSTANDING DEBTS</span>
              <CreditCard className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-bold text-rose-400 font-mono">{formatKES(totalOutstandingDebts)}</span>
              <p className="text-[9px] text-slate-500 mt-0.5">Receivable credit facility</p>
            </div>
          </div>
        );
      case 'staff':
        return (
          <div className="flex flex-col justify-between h-full min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">STAFF</span>
              <User className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-bold text-gray-100 font-mono">{totalEmployeesCount}</span>
              <p className="text-[9px] text-slate-500 mt-0.5">Active profiles</p>
            </div>
          </div>
        );
      case 'clients':
        return (
          <div className="flex flex-col justify-between h-full min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">CLIENTS</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-bold text-gray-100 font-mono">{activeCustomersCount}</span>
              <p className="text-[9px] text-slate-500 mt-0.5">Registered clients</p>
            </div>
          </div>
        );
      case 'growth':
        return (
          <div className="flex flex-col justify-between h-full min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">GROWTH</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-bold text-indigo-400 font-mono">+{businessGrowthRate}%</span>
              <p className="text-[9px] text-slate-500 mt-0.5">Net margin status</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Helper to render individual content for any large widget
  const renderWidgetContent = (key: string) => {
    switch (key) {
      case 'target_meter':
        return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/20">
                  <Target className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-sans tracking-wide">
                    Yearly Net Profit Target
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Track executive profit performance versus enterprise goals.
                  </p>
                </div>
              </div>

              {/* Business Owner exclusive goal inputs */}
              {isOwner ? (
                <div className="flex items-center gap-2">
                  {isEditingGoal ? (
                    <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                      <input
                        type="number"
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                        className="bg-transparent text-slate-100 font-mono text-xs w-28 px-2 outline-none"
                        placeholder="Enter target"
                      />
                      <button
                        onClick={() => handleSaveGoal(parseFloat(goalInput) || 1000000)}
                        className="p-1 text-emerald-400 hover:bg-emerald-950/20 rounded"
                        title="Confirm Goal"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingGoal(false);
                          setGoalInput(yearlyGoal.toString());
                        }}
                        className="p-1 text-rose-400 hover:bg-rose-950/20 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Preset quick buttons */}
                      <div className="hidden md:flex gap-1">
                        {[500000, 1000000, 5000000, 10000000].map(val => (
                          <button
                            key={val}
                            onClick={() => handleSaveGoal(val)}
                            className={`px-2 py-1 rounded text-[10px] font-mono border ${
                              yearlyGoal === val 
                                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' 
                                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}K`}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setIsEditingGoal(true)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 text-xs font-semibold font-sans transition"
                      >
                        Set Custom Target
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-[10px] bg-slate-950/40 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-lg font-sans">
                  🔒 Manager View Only
                </span>
              )}
            </div>

            {/* Target metrics progress display */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Target Goal</span>
                <p className="text-md font-bold text-slate-100 font-mono">{formatKES(yearlyGoal)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Current Profit YTD</span>
                <p className={`text-md font-bold font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatKES(netProfit)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Remaining Target</span>
                <p className="text-md font-bold text-slate-300 font-mono">{formatKES(remainingToGoal)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Estimated Completion Date</span>
                <p className="text-sm font-bold text-cyan-400 font-sans flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                  {getEstimatedGoalDate()}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Goal Completion</span>
                <span className="text-cyan-400 font-bold font-mono">{goalProgressPercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-500/20 transition-all duration-500 rounded-full"
                  style={{ width: `${goalProgressPercent}%` }}
                />
              </div>
            </div>
          </div>
        );
      case 'projections':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase font-sans tracking-wide flex items-center gap-2">
              <Calculator className="w-4.5 h-4.5 text-indigo-400" />
              Forecast & Performance Projection (KES)
            </h3>
            <p className="text-xs text-slate-400">
              Intelligent projections calculated dynamically from your corporate sales velocity and overhead rates.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              {/* Daily Forecast */}
              <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Projected Daily</span>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 flex justify-between">Revenue: <span className="font-mono text-slate-200">{formatKES(forecastDailyRevenue)}</span></p>
                  <p className="text-xs text-slate-400 flex justify-between">Expenses: <span className="font-mono text-rose-400">({formatKES(forecastDailyExpenses)})</span></p>
                  <div className="border-t border-slate-800/50 pt-1" />
                  <p className="text-xs font-bold flex justify-between text-emerald-400">Est. Profit: <span className="font-mono">{formatKES(forecastDailyProfit)}</span></p>
                </div>
              </div>

              {/* Weekly Forecast */}
              <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Projected Weekly</span>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 flex justify-between">Revenue: <span className="font-mono text-slate-200">{formatKES(forecastWeeklyRevenue)}</span></p>
                  <p className="text-xs text-slate-400 flex justify-between">Expenses: <span className="font-mono text-rose-400">({formatKES(forecastWeeklyExpenses)})</span></p>
                  <div className="border-t border-slate-800/50 pt-1" />
                  <p className="text-xs font-bold flex justify-between text-emerald-400">Est. Profit: <span className="font-mono">{formatKES(forecastWeeklyProfit)}</span></p>
                </div>
              </div>

              {/* Monthly Forecast */}
              <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Projected Monthly</span>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 flex justify-between">Revenue: <span className="font-mono text-slate-200">{formatKES(forecastMonthlyRevenue)}</span></p>
                  <p className="text-xs text-slate-400 flex justify-between">Expenses: <span className="font-mono text-rose-400">({formatKES(forecastMonthlyExpenses)})</span></p>
                  <div className="border-t border-slate-800/50 pt-1" />
                  <p className="text-xs font-bold flex justify-between text-emerald-400">Est. Profit: <span className="font-mono">{formatKES(forecastMonthlyProfit)}</span></p>
                </div>
              </div>

              {/* Annual Forecast */}
              <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Projected Annual</span>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 flex justify-between">Revenue: <span className="font-mono text-slate-200">{formatKES(forecastAnnualRevenue)}</span></p>
                  <p className="text-xs text-slate-400 flex justify-between">Expenses: <span className="font-mono text-rose-400">({formatKES(forecastAnnualExpenses)})</span></p>
                  <div className="border-t border-slate-800/50 pt-1" />
                  <p className="text-xs font-bold flex justify-between text-emerald-400">Est. Profit: <span className="font-mono">{formatKES(forecastAnnualProfit)}</span></p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'cash_flow_chart':
        return (
          <div className="flex flex-col justify-between h-[340px]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/50 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Interactive Cash Flow Tracker</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Cash Inflows vs Outflows (KES)</p>
              </div>

              {/* Cash Flow Tabs */}
              <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCashFlowTab(tab)}
                    className={`px-2.5 py-1 rounded transition capitalize ${
                      cashFlowTab === tab 
                        ? 'bg-slate-900 text-cyan-400 border border-slate-800' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getCashFlowData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Inflow" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Outflow" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'net_worth_chart':
        return (
          <div className="flex flex-col justify-between h-[340px]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/50 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Net Worth Trajectory (KES)</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Asset Wealth minus Debt Liabilities</p>
              </div>

              {/* Net Worth Tabs */}
              <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-[10px] font-mono">
                {(['monthly', 'quarterly', 'yearly'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setNetWorthTab(tab)}
                    className={`px-2.5 py-1 rounded transition capitalize ${
                      netWorthTab === tab 
                        ? 'bg-slate-900 text-indigo-400 border border-slate-800' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getNetWorthTrajectory()}>
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="Net Worth" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNetWorth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'expense_allocation':
        return (
          <div className="flex flex-col justify-between h-[320px]">
            <div>
              <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Expenses Allocation by Category</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Proportional business budget allocation</p>
            </div>

            {expenseChartData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <FolderOpen className="w-8 h-8 text-slate-600 mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-400">No data available</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">Log expenses to display allocation metrics.</p>
              </div>
            ) : (
              <div className="flex items-center gap-4 flex-1 min-h-0 pt-3">
                <div className="w-[150px] h-[150px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Categories Legend */}
                <div className="flex-1 space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {expenseChartData.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-300 font-medium font-sans truncate max-w-[90px] inline-block">{item.name}</span>
                      </div>
                      <div className="text-right font-mono text-slate-400 shrink-0">
                        <span>{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'calendar_events':
        return (
          <div className="flex flex-col justify-between h-[320px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Shared Corporate Calendar Events</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Upcoming announcements and meetings</p>
              </div>
              <span className="text-[10px] bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 px-2.5 py-1 rounded-lg font-mono">
                Live Feed
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 pr-1 max-h-[220px]">
              {events.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-xs font-sans">No corporate calendar events scheduled.</p>
                </div>
              ) : (
                events.slice(0, 4).map(event => (
                  <div key={event.id} className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-950/50 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 font-sans text-xs">
                        {event.type.substring(0, 1)}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-200 font-sans">{event.title}</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">{event.description}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-mono font-bold shrink-0">
                      {event.date}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'audit_logs':
        return (
          <div className="space-y-5" id="live-audit-log-view">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase font-sans tracking-wide flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  Live Corporate Tenant Audit Trails
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cryptographically logged administrative and employee activities synced securely.
                </p>
              </div>

              {/* Quick Date Select Range Overlay Trigger */}
              {showCustomDateModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="glass-panel p-6 max-w-sm w-full space-y-4">
                    <h4 className="text-sm font-bold text-slate-200 font-sans">Select Custom Date Range</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Start Date</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">End Date</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuditTime('All Time');
                          setShowCustomDateModal(false);
                        }}
                        className="px-3 py-1.5 border border-slate-800 rounded text-slate-400 text-xs font-sans"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuditTime('Custom Range');
                          setShowCustomDateModal(false);
                        }}
                        className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded text-xs font-sans"
                      >
                        Apply Filter
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tenant Activity Filters bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* User filter */}
                <div className="relative">
                  <select
                    value={auditUser}
                    onChange={(e) => setAuditUser(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 py-1 px-2.5 pr-7 rounded text-[11px] outline-none cursor-pointer hover:border-slate-700 font-sans"
                  >
                    <option value="All Users">👤 All Employees</option>
                    {distinctAuditUsers.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Action filter */}
                <div className="relative">
                  <select
                    value={auditActivity}
                    onChange={(e) => setAuditActivity(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 py-1 px-2.5 pr-7 rounded text-[11px] outline-none cursor-pointer hover:border-slate-700 font-sans"
                  >
                    <option value="All Activities">⚡ All Action Types</option>
                    <option value="Insert">➕ Creation / Addition</option>
                    <option value="Update">📝 Edit / Modifications</option>
                    <option value="Delete">❌ Deletions / Purges</option>
                    <option value="Login">🔓 Sign In Records</option>
                    <option value="Logout">🔒 Sign Out Records</option>
                    <option value="Sales">🛒 Sales Terminal</option>
                    <option value="Inventory">📦 Inventory Actions</option>
                    <option value="Expenses">💸 Expense Actions</option>
                    <option value="Customers">👥 Customers CRM</option>
                    <option value="Debts">💳 Debt Records</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Time filter */}
                <div className="relative">
                  <select
                    value={auditTime}
                    onChange={(e) => {
                      if (e.target.value === 'Custom Range') {
                        setShowCustomDateModal(true);
                      } else {
                        setAuditTime(e.target.value);
                      }
                    }}
                    className="bg-slate-950 border border-slate-800 text-slate-300 py-1 px-2.5 pr-7 rounded text-[11px] outline-none cursor-pointer hover:border-slate-700 font-sans"
                  >
                    <option value="All Time">📅 All Time Records</option>
                    <option value="Today">Today</option>
                    <option value="Yesterday">Yesterday</option>
                    <option value="This Week">This Week</option>
                    <option value="Last Week">Last Week</option>
                    <option value="This Month">This Month</option>
                    <option value="Last Month">Last Month</option>
                    <option value="This Year">This Year</option>
                    <option value="Custom Range">Custom Date Range...</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Chronological Audit Feed */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {filteredAudits.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Lock className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs font-sans">No matching cryptographically secure audit logs recorded.</p>
                </div>
              ) : (
                filteredAudits.map((log, index) => {
                  const actionStr = String(log.action || '').toLowerCase();
                  const isRevertible = 
                    (actionStr.includes('delete') || actionStr.includes('update')) &&
                    !actionStr.includes('reverted');

                  const isHighRisk = 
                    actionStr.includes('delete') || 
                    actionStr.includes('permanently') ||
                    actionStr.includes('shut down');

                  return (
                    <div 
                      key={`${log.id}-${index}`} 
                      className={`p-3.5 bg-slate-950/40 hover:bg-slate-950/60 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition ${
                        isHighRisk 
                          ? 'border-rose-500/20 bg-rose-950/5' 
                          : 'border-slate-800/80'
                      }`}
                      id={`audit-log-${log.id}-${index}`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="font-bold text-slate-200 text-xs font-sans">
                            {log.userName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {log.role}
                          </span>
                          <span className="text-[10px] bg-slate-900 border border-slate-800/50 text-slate-400 px-1.5 py-0.2 rounded font-sans uppercase">
                            {log.action}
                          </span>
                          {isHighRisk && (
                            <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded font-bold uppercase font-mono">
                              ⚠️ HIGH RISK
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 text-[11px] text-slate-400">
                          {log.oldValue && log.oldValue !== 'N/A' && (
                            <span>Previous: <code className="text-slate-500 font-mono text-[10px] bg-slate-950/40 px-1 rounded">{log.oldValue}</code></span>
                          )}
                          {log.newValue && log.newValue !== 'N/A' && (
                            <span className="flex items-center gap-1">
                              <ArrowRight className="w-3 h-3 text-slate-600" />
                              New: <code className="text-cyan-400/80 font-mono text-[10px] bg-slate-950/40 px-1 rounded">{log.newValue}</code>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-3 text-[10px] text-slate-500 font-mono">
                          <span>Date: {log.date} at {log.time}</span>
                          {log.device && <span>Device: {log.device}</span>}
                        </div>
                      </div>

                      {/* Revert Action controls */}
                      {(isOwner || isManager) && isRevertible && (
                        <button
                          type="button"
                          onClick={() => handleRevertClick(log.id)}
                          className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-cyan-950/45 hover:text-cyan-400 text-slate-300 font-bold border border-slate-800 hover:border-cyan-500/20 rounded-lg text-[10px] font-sans transition shrink-0"
                          title="Undo this specific change"
                        >
                          <Undo className="w-3 h-3" />
                          <span>Revert Action</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // ---------------------------------------------
  // OWNER & MANAGER EXECUTIVE DASHBOARD VIEW
  // ---------------------------------------------
  return (
    <div className="space-y-6" id="executive-dashboard-root">
      
      {/* Dynamic Branch/Business Selection & Management Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-brand-border bg-gray-950/40 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Business Selector Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] text-gray-500 font-mono uppercase font-bold tracking-wider">Active Workspace</label>
            <div className="relative">
              <select
                value={activeBusiness?.id || ''}
                onChange={(e) => setActiveBusiness(e.target.value)}
                className="bg-gray-900 border border-brand-border text-gray-100 py-1.5 pl-3 pr-8 rounded-xl text-xs font-sans focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer min-w-[160px]"
              >
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    🏢 {biz.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Branch Selector Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] text-gray-500 font-mono uppercase font-bold tracking-wider">Active Branch / Station</label>
            <div className="relative">
              <select
                value={activeBranchId}
                onChange={(e) => setActiveBranchId(e.target.value)}
                className="bg-gray-900 border border-brand-border text-gray-100 py-1.5 pl-3 pr-8 rounded-xl text-xs font-sans focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="all">🌐 All Branches Combined</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name} ({b.location || 'HQ'})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Create Workspace/Branch Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-medium transition duration-150 cursor-pointer ${
              isCustomizing 
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
                : 'bg-gray-900 hover:bg-slate-800 border-brand-border text-gray-200'
            }`}
          >
            <Settings className={`w-4 h-4 text-amber-400 ${isCustomizing ? 'animate-spin' : ''}`} />
            <span>{isCustomizing ? 'Layout Studio Active' : 'Customize Layout'}</span>
          </button>

          <button
            onClick={() => setShowBizModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-cyan-950/20 border border-brand-border hover:border-cyan-500/30 rounded-xl text-xs font-medium text-gray-200 transition duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Add Business</span>
          </button>
          
          <button
            onClick={() => setShowBranchModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-emerald-950/20 border border-brand-border hover:border-emerald-500/30 rounded-xl text-xs font-medium text-gray-200 transition duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Create Branch</span>
          </button>
        </div>
      </div>

      {/* ==================== WIDGET STUDIO PANEL ==================== */}
      {isCustomizing && (
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-amber-950/5 space-y-6 relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400 animate-spin" />
                Apex Dashboard Layout Studio
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize your home dashboard. Click buttons below to Pin/Unpin, or drag-and-drop the widgets directly on the dashboard page to reorder them.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleResetLayout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-slate-100 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset Layout</span>
              </button>
              <button
                onClick={() => setIsCustomizing(false)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done Designing</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KPI METRICS PINNING PANEL */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">1. KPI Summary Cards</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(kpiMeta).map(([key, rawInfo]) => {
                  const info = rawInfo as any;
                  const isPinned = pinnedKpis.includes(key);
                  const IconComponent = info.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => isPinned ? handleUnpinKpi(key) : handlePinKpi(key)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 text-xs font-sans font-medium ${
                        isPinned
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                          : 'bg-slate-950 border-slate-800/60 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <IconComponent className={`w-3.5 h-3.5 ${isPinned ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <span className="truncate flex-1">{info.label.replace(' (YTD)', '')}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPinned ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LARGE WIDGETS PINNING PANEL */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">2. Analytical Panels & Charts</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(widgetMeta).map(([key, rawInfo]) => {
                  const info = rawInfo as any;
                  const isPinned = pinnedWidgets.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => isPinned ? handleUnpinWidget(key) : handlePinWidget(key)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 text-xs font-sans font-medium ${
                        isPinned
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-950 border-slate-800/60 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{info.label}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPinned ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EXECUTIVE BENTO-GRID KPI CARDS ==================== */}
      {pinnedKpis.length === 0 ? (
        <div className="glass-panel p-8 text-center rounded-2xl border border-slate-800 bg-slate-950/20">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-400">All summary KPI cards are unpinned</p>
          <p className="text-xs text-slate-500 mt-1">Open the Layout Studio to choose which metrics to pin to your home view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-9 gap-4" id="kpi-cards-grid">
          {pinnedKpis.map((key, index) => {
            const kpiInfo = kpiMeta[key];
            if (!kpiInfo) return null;
            return (
              <div
                key={key}
                draggable={isCustomizing}
                onDragStart={() => handleKpiDragStart(index)}
                onDragOver={(e) => handleKpiDragOver(e, index)}
                onDragEnd={handleKpiDragEnd}
                className={`relative group transition-all duration-300 ${kpiInfo.defaultSpan} ${
                  isCustomizing 
                    ? 'cursor-grab active:cursor-grabbing border-2 border-dashed border-cyan-500/30 bg-cyan-950/5 p-5 rounded-2xl hover:border-cyan-500/60' 
                    : `glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between transition duration-300 ${kpiInfo.borderClass} ${kpiInfo.shadowClass}`
                } ${
                  isCustomizing && draggedKpiIndex === index ? 'opacity-30 border-cyan-500 bg-cyan-950/10' : ''
                }`}
              >
                {isCustomizing && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 bg-slate-900/85 px-1.5 py-0.5 rounded border border-slate-800 text-[10px] text-cyan-400">
                    <GripVertical className="w-3 h-3" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpinKpi(key);
                      }}
                      className="p-0.5 hover:text-rose-400 text-slate-400 transition"
                      title="Unpin metric"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {renderKpiCardContent(key)}
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== DYNAMIC DRAGGABLE DASHBOARD WIDGETS ==================== */}
      {pinnedWidgets.length === 0 ? (
        <div className="glass-panel p-8 text-center rounded-2xl border border-slate-800 bg-slate-950/20">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-400">All interactive widgets are unpinned</p>
          <p className="text-xs text-slate-500 mt-1">Open the Layout Studio to select and pin charts or targets to your main view.</p>
        </div>
      ) : (
        <div className="space-y-6" id="draggable-widgets-grid">
          {pinnedWidgets.map((key, index) => {
            const widgetInfo = widgetMeta[key];
            if (!widgetInfo) return null;
            return (
              <div
                key={key}
                draggable={isCustomizing}
                onDragStart={() => handleWidgetDragStart(index)}
                onDragOver={(e) => handleWidgetDragOver(e, index)}
                onDragEnd={handleWidgetDragEnd}
                className={`relative group transition-all duration-300 ${
                  isCustomizing 
                    ? 'cursor-grab active:cursor-grabbing border-2 border-dashed border-cyan-500/30 bg-cyan-950/5 p-6 rounded-2xl hover:border-cyan-500/60' 
                    : 'glass-panel p-6 rounded-2xl border border-slate-800'
                } ${
                  isCustomizing && draggedWidgetIndex === index ? 'opacity-30 border-cyan-500 bg-cyan-950/10' : ''
                }`}
              >
                {isCustomizing && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 bg-slate-900/85 px-2 py-1 rounded border border-slate-800 text-[10px] text-cyan-400">
                    <GripVertical className="w-3.5 h-3.5" />
                    <span className="font-semibold text-slate-200">{widgetInfo.label}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpinWidget(key);
                      }}
                      className="p-0.5 hover:text-rose-400 text-slate-400 transition"
                      title="Unpin widget"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {renderWidgetContent(key)}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Create modals for Business & Branch */}
      {showBizModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 max-w-md w-full space-y-4">
            <h4 className="text-md font-bold text-slate-100 font-sans">Establish New Business Workspace</h4>
            <form onSubmit={handleQuickAddBusiness} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Company / Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Summit Holdings Ltd"
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Industry Type</label>
                <input
                  type="text"
                  placeholder="e.g., Wholesale & Distribution"
                  value={newBizBranch}
                  onChange={(e) => setNewBizBranch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBizModal(false)}
                  className="px-3 py-1.5 border border-slate-800 rounded text-slate-400 text-xs font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded text-xs font-sans animate-pulse"
                >
                  Establish Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBranchModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 max-w-md w-full space-y-4">
            <h4 className="text-md font-bold text-slate-100 font-sans">Register Physical Store Branch</h4>
            <form onSubmit={handleQuickAddBranch} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Nakuru Retail Hub"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Location Address</label>
                <input
                  type="text"
                  placeholder="e.g., Kenyatta Avenue, Nakuru Plaza"
                  value={newBranchLocation}
                  onChange={(e) => setNewBranchLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Operational Status</label>
                <select
                  value={newBranchStatus}
                  onChange={(e) => setNewBranchStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none"
                >
                  <option value="Active">Active / Fully Operational</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-3 py-1.5 border border-slate-800 rounded text-slate-400 text-xs font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-slate-100 font-bold rounded text-xs font-sans"
                >
                  Register Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
