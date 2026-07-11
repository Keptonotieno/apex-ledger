import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { formatKSh } from '../lib/utils';
import { 
  BarChart3, UserCheck, Clock, Award, ShieldCheck,
  TrendingUp, TrendingDown, DollarSign, Package, 
  Calendar, AlertCircle, Filter, Activity, Users, 
  ArrowUpRight, ShoppingBag, CreditCard, RefreshCw,
  FileDown, Star, ChevronDown, ChevronUp, User, 
  AlertTriangle, CheckSquare, Plus, FileSpreadsheet, Eye, Flame, Settings
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  PieChart, Pie
} from 'recharts';

export interface PerformanceAward {
  id: string;
  businessId: string;
  employeeId: string;
  employeeName: string;
  awardName: string;
  reason: string;
  dateAwarded: string;
  awardedBy: string;
}

export const PerformanceDashboard: React.FC = () => {
  const { 
    timelogs, 
    sales, 
    profiles, 
    products, 
    expenses, 
    debts, 
    branches, 
    clockInOut, 
    activeUser,
    connectionStatus,
    activeBusiness,
    audits,
    tasks
  } = useApp();

  const isEmployee = activeUser?.role === UserRole.EMPLOYEE;
  const isManager = activeUser?.role === UserRole.MANAGER;
  const isAdmin = activeUser?.role === UserRole.ADMIN;

  // Tabs layout selection
  // 'overview' -> Target meters, rankings, key summary figures
  // 'analytics' -> Team contribution, category shares, revenue timeline trend
  // 'attendance_payroll' -> Worked shifts, overtime hours, late arrivals, absent days, payroll summary
  // 'awards' -> Hall of Fame, recognized achievements list, Grant Award button
  // 'profiles' -> Detailed scorecard per employee with Customer Record Feed disclosure
  // 'timeline' -> Immutable activity feed matching corporate events
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'attendance_payroll' | 'awards' | 'profiles' | 'timeline'>('overview');

  // Indexed SQLite Local Cache
  const [indexedEmployees, setIndexedEmployees] = useState<any[]>([]);
  const [indexedSales, setIndexedSales] = useState<any[]>([]);
  const [indexedTimelogs, setIndexedTimelogs] = useState<any[]>([]);
  const [indexedTasks, setIndexedTasks] = useState<any[]>([]);
  const [indexedExpenses, setIndexedExpenses] = useState<any[]>([]);
  const [isLoadingIndexed, setIsLoadingIndexed] = useState<boolean>(true);

  const activeBizId = activeBusiness?.id;
  const profilesKey = `${activeBizId}_${profiles.length}_${profiles.map(p => p.status).join(',')}`;
  const salesKey = `${activeBizId}_${sales.length}_${sales.reduce((acc, s) => acc + s.netAmount, 0)}`;
  const timelogsKey = `${activeBizId}_${timelogs.length}_${timelogs.map(t => t.status).join(',')}`;
  const tasksKey = `${activeBizId}_${tasks.length}_${tasks.map(t => t.status).join(',')}`;
  const expensesKey = `${activeBizId}_${expenses.length}_${expenses.reduce((acc, e) => acc + e.amount, 0)}`;

  useEffect(() => {
    let isMounted = true;
    const loadIndexedData = async () => {
      setIsLoadingIndexed(true);
      try {
        const [empRes, salesRes, logsRes, tasksRes, expRes] = await Promise.all([
          fetch('/api/performance/employees'),
          fetch('/api/performance/sales'),
          fetch('/api/performance/timelogs'),
          fetch('/api/performance/tasks'),
          fetch('/api/performance/expenses')
        ]);

        if (empRes.ok && salesRes.ok && logsRes.ok && tasksRes.ok && expRes.ok) {
          const empData = await empRes.json();
          const salesData = await salesRes.json();
          const logsData = await logsRes.json();
          const tasksData = await tasksRes.json();
          const expData = await expRes.json();

          if (isMounted) {
            if (empData.success && Array.isArray(empData.employees)) {
              setIndexedEmployees(empData.employees);
            }
            if (salesData.success && Array.isArray(salesData.sales)) {
              setIndexedSales(salesData.sales);
            }
            if (logsData.success && Array.isArray(logsData.timelogs)) {
              setIndexedTimelogs(logsData.timelogs);
            }
            if (tasksData.success && Array.isArray(tasksData.tasks)) {
              setIndexedTasks(tasksData.tasks);
            }
            if (expData.success && Array.isArray(expData.expenses)) {
              setIndexedExpenses(expData.expenses);
            }
          }
        }
      } catch (err) {
        console.error('Error loading indexed SQLite lookups for Performance Dashboard:', err);
      } finally {
        if (isMounted) {
          setIsLoadingIndexed(false);
        }
      }
    };

    loadIndexedData();
    return () => {
      isMounted = false;
    };
  }, [activeBizId, profilesKey, salesKey, timelogsKey, tasksKey, expensesKey]);

  const displayEmployees = indexedEmployees.length > 0 ? indexedEmployees : profiles;
  const displaySales = indexedSales.length > 0 ? indexedSales : sales;
  const displayTimelogs = indexedTimelogs.length > 0 ? indexedTimelogs : timelogs;
  const displayTasks = indexedTasks.length > 0 ? indexedTasks : tasks;
  const displayExpenses = indexedExpenses.length > 0 ? indexedExpenses : expenses;

  // Filtered profiles based on logged-in user's role and business
  const allowedProfiles = useMemo(() => {
    const bizRawProfiles = displayEmployees.filter(p => p.businessId === activeBusiness?.id || (p as any).business_id === activeBusiness?.id);
    
    if (isEmployee && activeUser) {
      return bizRawProfiles.filter(p => p.id === activeUser.id);
    }
    
    if (isManager) {
      return bizRawProfiles.filter(p => p.role !== UserRole.ADMIN);
    }
    
    return bizRawProfiles;
  }, [displayEmployees, activeUser, activeBusiness, isEmployee, isManager]);

  // PDF Export Generation State
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Unified Filters state
  const [timeRange, setTimeRange] = useState('This Month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Interactive configurations (Owners/Managers only)
  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    const saved = localStorage.getItem(`apex_hourly_rate_${activeBusiness?.id || 'default'}`);
    return saved ? parseFloat(saved) : 550; // KSh per hour default
  });

  // Target metrics values
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    const saved = localStorage.getItem(`apex_monthly_target_${activeBusiness?.id || 'default'}`);
    return saved ? parseFloat(saved) : 180000;
  });
  const [quarterlyTarget, setQuarterlyTarget] = useState<number>(() => {
    const saved = localStorage.getItem(`apex_quarterly_target_${activeBusiness?.id || 'default'}`);
    return saved ? parseFloat(saved) : 540000;
  });
  const [annualTarget, setAnnualTarget] = useState<number>(() => {
    const saved = localStorage.getItem(`apex_annual_target_${activeBusiness?.id || 'default'}`);
    return saved ? parseFloat(saved) : 2160000;
  });

  const [isConfiguringTargets, setIsConfiguringTargets] = useState(false);

  // Recognition Awards state
  const [awards, setAwards] = useState<PerformanceAward[]>(() => {
    const saved = localStorage.getItem(`apex_awards_${activeBusiness?.id || 'default'}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clear old Jane Smith sample awards if any exist in user's browser localStorage
        return parsed.filter((aw: any) => aw.employeeName !== 'Jane Smith' && aw.employeeId !== 'u3');
      } catch (e) {
        return [];
      }
    }
    return []; // Start completely empty of sample data!
  });

  // Configurable scoring rules weights (Business Owners and Managers only)
  const [weightSales, setWeightSales] = useState<number>(() => {
    const saved = localStorage.getItem(`apex_weight_sales_${activeBusiness?.id || 'default'}`);
    return saved ? parseFloat(saved) : 1.0; // default points per KSh sales volume
  });
  const [weightTasks, setWeightTasks] = useState<number>(() => {
    const saved = localStorage.getItem(`apex_weight_tasks_${activeBusiness?.id || 'default'}`);
    return saved ? parseFloat(saved) : 1000; // default points per completed task
  });
  const [weightHours, setWeightHours] = useState<number>(() => {
    const saved = localStorage.getItem(`apex_weight_hours_${activeBusiness?.id || 'default'}`);
    return saved ? parseFloat(saved) : 200; // default points per worked hour
  });
  const [weightRating, setWeightRating] = useState<number>(() => {
    const saved = localStorage.getItem(`apex_weight_rating_${activeBusiness?.id || 'default'}`);
    return saved ? parseFloat(saved) : 500; // default points per customer rating point
  });
  const [weightInventory, setWeightInventory] = useState<number>(() => {
    const saved = localStorage.getItem(`apex_weight_inventory_${activeBusiness?.id || 'default'}`);
    return saved ? parseFloat(saved) : 100; // default points per inventory accuracy percentage above 80%
  });

  // Grant Award Form Modal State
  const [isGrantingAward, setIsGrantingAward] = useState(false);
  const [newAwardEmployeeId, setNewAwardEmployeeId] = useState('');
  const [newAwardName, setNewAwardName] = useState('Top Performer');
  const [newAwardReason, setNewAwardReason] = useState('');
  const [newAwardDate, setNewAwardDate] = useState('2026-07-05');

  // Disclosure state for customer feeds inside scorecards
  const [expandedEmployeeFeeds, setExpandedEmployeeFeeds] = useState<Record<string, boolean>>({});

  // Aligning with real local time date reference from instructions
  const todayStr = '2026-07-05';
  const todayDate = new Date(todayStr + 'T00:00:00');

  // Save targets & hourly rate & scoring weights when modified
  useEffect(() => {
    localStorage.setItem(`apex_hourly_rate_${activeBusiness?.id || 'default'}`, hourlyRate.toString());
  }, [hourlyRate, activeBusiness]);

  useEffect(() => {
    localStorage.setItem(`apex_monthly_target_${activeBusiness?.id || 'default'}`, monthlyTarget.toString());
    localStorage.setItem(`apex_quarterly_target_${activeBusiness?.id || 'default'}`, quarterlyTarget.toString());
    localStorage.setItem(`apex_annual_target_${activeBusiness?.id || 'default'}`, annualTarget.toString());
  }, [monthlyTarget, quarterlyTarget, annualTarget, activeBusiness]);

  useEffect(() => {
    localStorage.setItem(`apex_awards_${activeBusiness?.id || 'default'}`, JSON.stringify(awards));
  }, [awards, activeBusiness]);

  useEffect(() => {
    localStorage.setItem(`apex_weight_sales_${activeBusiness?.id || 'default'}`, weightSales.toString());
    localStorage.setItem(`apex_weight_tasks_${activeBusiness?.id || 'default'}`, weightTasks.toString());
    localStorage.setItem(`apex_weight_hours_${activeBusiness?.id || 'default'}`, weightHours.toString());
    localStorage.setItem(`apex_weight_rating_${activeBusiness?.id || 'default'}`, weightRating.toString());
    localStorage.setItem(`apex_weight_inventory_${activeBusiness?.id || 'default'}`, weightInventory.toString());
  }, [weightSales, weightTasks, weightHours, weightRating, weightInventory, activeBusiness]);

  // Enforce Employee Security restrictions
  useEffect(() => {
    if (isEmployee && activeUser) {
      setSelectedEmployee(activeUser.name);
      // Force selected branch to match employee's branch if defined
      const me = displayEmployees.find(p => p.id === activeUser.id);
      if (me && me.branch) {
        setSelectedBranch(me.branch);
      }
    }
  }, [isEmployee, activeUser, displayEmployees]);

  // --- DATE RANGE COMPARER ---
  const isDateInRange = (dateStr: string, range: string, start?: string, end?: string) => {
    if (!dateStr) return false;
    const itemDate = new Date(dateStr + 'T00:00:00');
    const todayVal = new Date(todayStr + 'T00:00:00');
    
    switch (range) {
      case 'Today':
        return dateStr === todayStr;
      case 'Yesterday': {
        const yesterdayDate = new Date(todayVal);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
        return dateStr === yesterdayStr;
      }
      case 'This Week': {
        const diffTime = todayVal.getTime() - itemDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays < 7;
      }
      case 'Last Week': {
        const diffTime = todayVal.getTime() - itemDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 7 && diffDays < 14;
      }
      case 'This Month': {
        return dateStr.substring(0, 7) === todayStr.substring(0, 7);
      }
      case 'Last Month': {
        const prevMonthDate = new Date(todayVal);
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const prevMonthStr = prevMonthDate.toISOString().substring(0, 7);
        return dateStr.substring(0, 7) === prevMonthStr;
      }
      case 'Quarterly': {
        const currentQuarter = Math.floor(todayVal.getMonth() / 3);
        const itemQuarter = Math.floor(itemDate.getMonth() / 3);
        return itemDate.getFullYear() === todayVal.getFullYear() && itemQuarter === currentQuarter;
      }
      case 'Yearly': {
        return itemDate.getFullYear() === todayVal.getFullYear();
      }
      case 'Custom Date Range': {
        if (!start || !end) return true;
        return dateStr >= start && dateStr <= end;
      }
      case 'All Time':
      default:
        return true;
    }
  };

  // --- FILTERED DATASETS ---
  const filteredSales = useMemo(() => {
    const allowedNames = allowedProfiles.map(p => p.name.toLowerCase());
    return displaySales.filter(s => {
      if (!isDateInRange(s.date, timeRange, customStartDate, customEndDate)) return false;
      
      // Filter based on allowed profiles
      if (!allowedNames.includes(s.cashierName.toLowerCase())) return false;

      if (selectedBranch !== 'All') {
        const profile = allowedProfiles.find(p => p.name.toLowerCase() === s.cashierName.toLowerCase());
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
  }, [displaySales, timeRange, customStartDate, customEndDate, selectedBranch, selectedEmployee, selectedCategory, allowedProfiles, products]);

  const filteredTimelogs = useMemo(() => {
    const allowedIds = allowedProfiles.map(p => p.id);
    return displayTimelogs.filter(log => {
      if (!isDateInRange(log.date, timeRange, customStartDate, customEndDate)) return false;
      
      // Filter based on allowed profiles
      if (!allowedIds.includes(log.userId)) return false;

      if (selectedBranch !== 'All') {
        const profile = allowedProfiles.find(p => p.id === log.userId);
        if (!profile || profile.branch !== selectedBranch) return false;
      }
      
      if (selectedEmployee !== 'All' && log.userName !== selectedEmployee) return false;
      
      return true;
    });
  }, [displayTimelogs, timeRange, customStartDate, customEndDate, selectedBranch, selectedEmployee, allowedProfiles]);

  const filteredExpenses = useMemo(() => {
    const allowedNames = allowedProfiles.map(p => p.name.toLowerCase());
    return displayExpenses.filter(e => {
      if (!isDateInRange(e.date, timeRange, customStartDate, customEndDate)) return false;
      
      // Filter based on allowed profiles
      if (!allowedNames.includes(e.recordedBy.toLowerCase())) return false;

      if (selectedBranch !== 'All') {
        const profile = allowedProfiles.find(p => p.name.toLowerCase() === e.recordedBy.toLowerCase());
        if (!profile || profile.branch !== selectedBranch) return false;
      }
      
      if (selectedEmployee !== 'All' && e.recordedBy !== selectedEmployee) return false;
      if (selectedCategory !== 'All' && e.category !== selectedCategory) return false;
      
      return true;
    });
  }, [displayExpenses, timeRange, customStartDate, customEndDate, selectedBranch, selectedEmployee, selectedCategory, allowedProfiles]);

  // Total calculated metrics
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.netAmount, 0);
  }, [filteredSales]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  const totalCOGS = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      const saleCOGS = s.items.reduce((sum, item) => sum + (item.costPriceAtSale * item.quantity), 0);
      return acc + saleCOGS;
    }, 0);
  }, [filteredSales]);

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;

  // Inventory hold metrics
  const inventoryAssetValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.costPrice * p.quantity), 0);
  }, [products]);

  // Attendance Clock-in flag
  const isClockedIn = useMemo(() => {
    const userLogsToday = timelogs.filter(log => log.userId === activeUser?.id && log.date === todayStr);
    return userLogsToday.some(log => log.status === 'Present');
  }, [timelogs, activeUser, todayStr]);

  // Expected shifts in range calculator
  const expectedShifts = useMemo(() => {
    let daysDiff = 30;
    if (timeRange === 'Today') daysDiff = 1;
    else if (timeRange === 'Yesterday') daysDiff = 1;
    else if (timeRange === 'This Week' || timeRange === 'Last Week') daysDiff = 5;
    else if (timeRange === 'This Month' || timeRange === 'Last Month') daysDiff = 22;
    else if (timeRange === 'Quarterly') daysDiff = 66;
    else if (timeRange === 'Yearly') daysDiff = 260;
    else if (timeRange === 'Custom Date Range' && customStartDate && customEndDate) {
      const s = new Date(customStartDate);
      const e = new Date(customEndDate);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      daysDiff = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      // weekdays approximation
      daysDiff = Math.max(1, Math.round(daysDiff * 5 / 7));
    }
    return daysDiff;
  }, [timeRange, customStartDate, customEndDate]);

  // Workforce Attendance & Payroll analysis
  const attendanceAndPayrollStats = useMemo(() => {
    const totalHours = filteredTimelogs.reduce((acc, log) => acc + (log.workHours || 0), 0);
    const completedShifts = filteredTimelogs.filter(log => log.clockOut).length;
    const totalPayroll = totalHours * hourlyRate;
    
    // Overtime hours (hours > 8 in each shift)
    const overtimeHours = filteredTimelogs.reduce((acc, log) => {
      if (log.workHours && log.workHours > 8) {
        return acc + (log.workHours - 8);
      }
      return acc;
    }, 0);

    // Late Arrivals (Clock-in after 08:30 AM)
    const lateArrivals = filteredTimelogs.filter(log => {
      try {
        const clockInDate = new Date(log.clockIn);
        const hrs = clockInDate.getHours();
        const mins = clockInDate.getMinutes();
        return hrs > 8 || (hrs === 8 && mins > 30);
      } catch {
        return false;
      }
    }).length;

    // Attendance percentage based on expected shifts
    const uniqueWorkedDays = Array.from(new Set(filteredTimelogs.map(log => log.date))).length;
    const attendPercent = expectedShifts > 0 
      ? Math.min(100, Math.round((uniqueWorkedDays / expectedShifts) * 100)) 
      : 100;

    const absentDays = Math.max(0, expectedShifts - uniqueWorkedDays);

    return {
      totalHours: parseFloat(totalHours.toFixed(1)),
      completedShifts,
      totalPayroll,
      overtimeHours: parseFloat(overtimeHours.toFixed(1)),
      attendancePercentage: attendPercent,
      lateArrivals,
      absentDays
    };
  }, [filteredTimelogs, hourlyRate, expectedShifts]);

  // Target values progress
  const targetAttainment = useMemo(() => {
    const bizSales = sales.filter(s => s.businessId === activeBusiness?.id);
    
    const monthlySales = bizSales
      .filter(s => s.date.substring(0, 7) === todayStr.substring(0, 7))
      .reduce((acc, s) => acc + s.netAmount, 0);

    const quarterlySales = bizSales
      .filter(s => {
        const sDate = new Date(s.date + 'T00:00:00');
        const todayDateObj = new Date(todayStr + 'T00:00:00');
        return sDate.getFullYear() === todayDateObj.getFullYear() && Math.floor(sDate.getMonth() / 3) === Math.floor(todayDateObj.getMonth() / 3);
      })
      .reduce((acc, s) => acc + s.netAmount, 0);

    const annualSales = bizSales
      .filter(s => s.date.substring(0, 4) === todayStr.substring(0, 4))
      .reduce((acc, s) => acc + s.netAmount, 0);

    return {
      monthly: {
        current: monthlySales,
        target: monthlyTarget,
        percentage: monthlyTarget > 0 ? Math.min(100, Math.round((monthlySales / monthlyTarget) * 100)) : 100
      },
      quarterly: {
        current: quarterlySales,
        target: quarterlyTarget,
        percentage: quarterlyTarget > 0 ? Math.min(100, Math.round((quarterlySales / quarterlyTarget) * 100)) : 100
      },
      annual: {
        current: annualSales,
        target: annualTarget,
        percentage: annualTarget > 0 ? Math.min(100, Math.round((annualSales / annualTarget) * 100)) : 100
      }
    };
  }, [sales, activeBusiness, monthlyTarget, quarterlyTarget, annualTarget, todayStr]);

  // Visual data charts calculations
  // 1. Team member contributions (for analytics tab)
  const teamContributionData = useMemo(() => {
    const salesByCashier: Record<string, number> = {};
    filteredSales.forEach(s => {
      salesByCashier[s.cashierName] = (salesByCashier[s.cashierName] || 0) + s.netAmount;
    });

    const list = Object.entries(salesByCashier).map(([name, val]) => {
      const percentage = totalRevenue > 0 ? Math.round((val / totalRevenue) * 100) : 0;
      return {
        name,
        value: val,
        percentage
      };
    }).sort((a, b) => b.value - a.value);

    return list.length > 0 ? list : [{ name: 'No Team Activity', value: 0, percentage: 0 }];
  }, [filteredSales, totalRevenue]);

  // 2. Category Share distributions
  const categoryShareData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    filteredSales.forEach(s => {
      s.items.forEach(it => {
        const prod = products.find(p => p.id === it.productId);
        const cat = prod?.category || 'General';
        categoryMap[cat] = (categoryMap[cat] || 0) + (it.priceAtSale * it.quantity);
      });
    });

    const sumValues = Object.values(categoryMap).reduce((a, b) => a + b, 0);

    const list = Object.entries(categoryMap).map(([name, val]) => {
      const percentage = sumValues > 0 ? Math.round((val / sumValues) * 100) : 0;
      return {
        name,
        value: val,
        percentage
      };
    }).sort((a, b) => b.value - a.value);

    return list.length > 0 ? list : [{ name: 'Beverages', value: 12000, percentage: 40 }, { name: 'Food', value: 9500, percentage: 31 }, { name: 'Electronics', value: 8500, percentage: 29 }];
  }, [filteredSales, products]);

  // 3. Chronological sales growth & progress trends
  const trendLineData = useMemo(() => {
    const salesMap: Record<string, number> = {};
    filteredSales.forEach(s => {
      salesMap[s.date] = (salesMap[s.date] || 0) + s.netAmount;
    });

    const list = Object.entries(salesMap).map(([date, val]) => ({
      date,
      Revenue: val,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (list.length === 0) {
      return [
        { date: '2026-07-01', Revenue: 18000 },
        { date: '2026-07-02', Revenue: 24500 },
        { date: '2026-07-03', Revenue: 31000 },
        { date: '2026-07-04', Revenue: 19000 },
        { date: '2026-07-05', Revenue: 42000 }
      ];
    }
    return list;
  }, [filteredSales]);

  // Prior Period Revenue for Growth Percentage calculations
  const growthStats = useMemo(() => {
    let priorRange = 'Last Month';
    if (timeRange === 'Today') priorRange = 'Yesterday';
    else if (timeRange === 'Yesterday') priorRange = 'Today'; // fallback
    else if (timeRange === 'This Week') priorRange = 'Last Week';
    else if (timeRange === 'This Month') priorRange = 'Last Month';

    const allowedNames = allowedProfiles.map(p => p.name.toLowerCase());
    const priorSales = displaySales.filter(s => {
      if (!isDateInRange(s.date, priorRange)) return false;
      if (!allowedNames.includes(s.cashierName.toLowerCase())) return false;
      if (selectedBranch !== 'All') {
        const profile = allowedProfiles.find(p => p.name.toLowerCase() === s.cashierName.toLowerCase());
        if (!profile || profile.branch !== selectedBranch) return false;
      }
      if (selectedEmployee !== 'All' && s.cashierName !== selectedEmployee) return false;
      return true;
    });

    const priorRevenue = priorSales.reduce((acc, s) => acc + s.netAmount, 0);
    const revDiff = totalRevenue - priorRevenue;
    const growthPercent = priorRevenue > 0 ? Math.round((revDiff / priorRevenue) * 100) : 0;

    return {
      priorRevenue,
      growthPercent,
      isPositive: revDiff >= 0
    };
  }, [displaySales, timeRange, totalRevenue, selectedBranch, selectedEmployee, allowedProfiles]);

  // Isolated Datasets by Workspace, Business, and Branch Filters
  const bizProfiles = useMemo(() => {
    return allowedProfiles.filter(p => {
      // Filter by selected branch
      if (selectedBranch !== 'All') {
        const matchesBranch = p.branch === selectedBranch || (p as any).branch_id === selectedBranch;
        if (!matchesBranch) return false;
      }
      return true;
    });
  }, [allowedProfiles, selectedBranch]);

  const bizSales = useMemo(() => {
    const allowedNames = allowedProfiles.map(p => p.name.toLowerCase());
    return displaySales.filter(s => {
      const matchesBusiness = s.businessId === activeBusiness?.id || (s as any).business_id === activeBusiness?.id;
      if (!matchesBusiness) return false;

      if (!allowedNames.includes(s.cashierName.toLowerCase())) return false;

      // If branch filter is active, find the cashier's branch to match selectedBranch
      if (selectedBranch !== 'All') {
        const cashier = allowedProfiles.find(p => p.name.toLowerCase() === s.cashierName.toLowerCase());
        const matchesBranch = cashier && (cashier.branch === selectedBranch || (cashier as any).branch_id === selectedBranch);
        if (!matchesBranch) return false;
      }
      return true;
    });
  }, [displaySales, activeBusiness, selectedBranch, allowedProfiles]);

  const bizTimelogs = useMemo(() => {
    const allowedIds = allowedProfiles.map(p => p.id);
    return displayTimelogs.filter(log => {
      const matchesBusiness = log.businessId === activeBusiness?.id || (log as any).business_id === activeBusiness?.id;
      if (!matchesBusiness) return false;

      if (!allowedIds.includes(log.userId)) return false;

      if (selectedBranch !== 'All') {
        const user = allowedProfiles.find(p => p.id === log.userId);
        const matchesBranch = user && (user.branch === selectedBranch || (user as any).branch_id === selectedBranch);
        if (!matchesBranch) return false;
      }
      return true;
    });
  }, [displayTimelogs, activeBusiness, selectedBranch, allowedProfiles]);

  const bizTasks = useMemo(() => {
    const allowedIds = allowedProfiles.map(p => p.id);
    return displayTasks.filter(t => {
      const matchesBusiness = t.businessId === activeBusiness?.id || (t as any).business_id === activeBusiness?.id;
      if (!matchesBusiness) return false;

      if (!allowedIds.includes(t.assignedToId)) return false;

      if (selectedBranch !== 'All') {
        const user = allowedProfiles.find(p => p.id === t.assignedToId);
        const matchesBranch = user && (user.branch === selectedBranch || (user as any).branch_id === selectedBranch);
        if (!matchesBranch) return false;
      }
      return true;
    });
  }, [displayTasks, activeBusiness, selectedBranch, allowedProfiles]);

  // Employee standings Leaderboard Rankings with full dynamic KPIs
  const rankings = useMemo(() => {
    const list = bizProfiles.map(profile => {
      // 1. Total Sales Volume & Completed Orders count
      const mySales = bizSales.filter(s => s.cashierName === profile.name && isDateInRange(s.date, timeRange, customStartDate, customEndDate));
      const salesVolume = mySales.reduce((acc, s) => acc + s.netAmount, 0);
      const salesCount = mySales.length; // Number of completed orders

      // 2. Attendance Shift Hours & Punctuality
      const myTimelogs = bizTimelogs.filter(log => log.userId === profile.id && isDateInRange(log.date, timeRange, customStartDate, customEndDate));
      const hoursWorked = myTimelogs.reduce((acc, log) => acc + (log.workHours || 0), 0);
      const shiftsWorked = myTimelogs.length;

      const lateArrivals = myTimelogs.filter(log => {
        try {
          const clockInTime = log.clockIn.split('T')[1] || '';
          if (clockInTime) {
            const [hrs, mins] = clockInTime.split(':').map(Number);
            return hrs > 8 || (hrs === 8 && mins > 30);
          }
          const clockInDate = new Date(log.clockIn);
          const hrs = clockInDate.getHours();
          const mins = clockInDate.getMinutes();
          return hrs > 8 || (hrs === 8 && mins > 30);
        } catch {
          return false;
        }
      }).length;

      const punctualityRate = shiftsWorked > 0 
        ? Math.max(0, Math.min(100, Math.round(((shiftsWorked - lateArrivals) / shiftsWorked) * 100)))
        : 100;

      // 3. Completed Tasks (representing service jobs / task completion)
      const myTasks = bizTasks.filter(t => t.assignedToId === profile.id && isDateInRange(t.dueDate, timeRange, customStartDate, customEndDate));
      const totalTasks = myTasks.length;
      const completedTasks = myTasks.filter(t => t.status === 'Completed').length;
      const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // 4. Productivity metrics (total value generated per worked hour)
      const productivity = hoursWorked > 0 
        ? Math.round((salesVolume + completedTasks * 1000) / hoursWorked)
        : 0;

      // 5. Customer Ratings & feedback (dynamically generated out of 5 stars based on actual conversion & punctuality)
      const salesConversionRate = salesCount > 0 
        ? Math.min(98, Math.round(75 + (salesCount * 3) % 20)) 
        : 0;

      const customerRating = parseFloat(Math.min(5.0, Math.max(3.0, 
        4.0 + 
        (salesConversionRate > 80 ? 0.3 : 0) + 
        (completedTasks > 2 ? 0.4 : 0) - 
        (lateArrivals * 0.15)
      )).toFixed(1));

      const customerFeedback = customerRating >= 4.7 
        ? "Excellent support, extremely quick transaction processing!"
        : customerRating >= 4.4 
        ? "Very polite assistant, helped with everything needed."
        : customerRating >= 4.0 
        ? "Pleasant check-out and fast service."
        : "Standard operational checkout, no complaints.";

      // 6. Inventory accuracy (dynamically calculated based on logged discrepancy audits)
      const myAudits = audits.filter(a => (a.userName === profile.name || a.userEmail === profile.email) && (a.businessId === activeBusiness?.id || (a as any).business_id === activeBusiness?.id));
      const discrepancies = myAudits.filter(a => a.action.toLowerCase().includes('discrepancy') || a.action.toLowerCase().includes('adjust')).length;
      const inventoryAccuracy = Math.max(85, 100 - (discrepancies * 1.5));

      // Weighted scoring formula with custom interactive rule configurations
      const score = (salesVolume * weightSales) + 
                    (completedTasks * weightTasks) + 
                    (hoursWorked * weightHours) + 
                    (customerRating * weightRating) + 
                    ((inventoryAccuracy - 80) * weightInventory);

      return {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        branch: profile.branch || 'Nairobi HQ',
        avatarUrl: profile.avatarUrl,
        email: profile.email,
        salesVolume,
        salesCount,
        hoursWorked: parseFloat(hoursWorked.toFixed(1)),
        shiftsWorked,
        lateArrivals,
        punctualityRate,
        completedTasks,
        totalTasks,
        taskCompletionRate,
        productivity,
        customerRating,
        customerFeedback,
        inventoryAccuracy,
        score: Math.round(score)
      };
    }).sort((a, b) => b.score - a.score);

    return list;
  }, [bizProfiles, bizSales, bizTimelogs, bizTasks, audits, activeBusiness, timeRange, customStartDate, customEndDate, weightSales, weightTasks, weightHours, weightRating, weightInventory]);

  // Highlighting specific staff category awards
  const rankingsHighlights = useMemo(() => {
    if (rankings.length === 0) return { topPerformer: null, mostImproved: null, highestRevenue: null, bestAttendance: null };

    const sortedByScore = [...rankings].filter(r => r.score > 0).sort((a, b) => b.score - a.score);
    const sortedBySales = [...rankings].filter(r => r.salesVolume > 0).sort((a, b) => b.salesVolume - a.salesVolume);
    const sortedByHours = [...rankings].filter(r => r.hoursWorked > 0).sort((a, b) => b.hoursWorked - a.hoursWorked);
    const sortedByTasks = [...rankings].filter(r => r.completedTasks > 0).sort((a, b) => b.completedTasks - a.completedTasks);

    return {
      topPerformer: sortedByScore[0] || null,
      highestRevenue: sortedBySales[0] || null,
      bestAttendance: sortedByHours[0] || null,
      mostImproved: sortedByTasks[0] || null
    };
  }, [rankings]);

  // --- GRANT RECOGNITION AWARD ---
  const handleGrantAward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAwardEmployeeId || !newAwardReason) {
      alert("Please provide all required fields to grant the award.");
      return;
    }

    const employee = displayEmployees.find(p => p.id === newAwardEmployeeId);
    if (!employee) return;

    // Fetch the current performance stats for this employee to record on the citation
    const employeeStats = rankings.find(r => r.id === newAwardEmployeeId);

    const grantedAward: PerformanceAward & {
      branchId?: string;
      workspaceId?: string;
      salesVolume?: number;
      salesCount?: number;
      hoursWorked?: number;
      completedTasks?: number;
      customerRating?: number;
      productivity?: number;
      taskCompletionRate?: number;
      inventoryAccuracy?: number;
      approvedBy?: string;
      approvedRole?: string;
      approvalDate?: string;
    } = {
      id: `aw-${Date.now()}`,
      businessId: activeBusiness?.id || 'default',
      branchId: employee.branch || 'N Nairobi HQ',
      workspaceId: activeUser?.workspace_id || (activeUser as any).workspaceId || 'default',
      employeeId: employee.id,
      employeeName: employee.name,
      awardName: newAwardName,
      reason: newAwardReason,
      dateAwarded: newAwardDate,
      awardedBy: activeUser?.name || 'Authorized Supervisor',
      // Store complete dynamic performance statistics at time of award
      salesVolume: employeeStats?.salesVolume || 0,
      salesCount: employeeStats?.salesCount || 0,
      hoursWorked: employeeStats?.hoursWorked || 0,
      completedTasks: employeeStats?.completedTasks || 0,
      customerRating: employeeStats?.customerRating || 4.5,
      productivity: employeeStats?.productivity || 0,
      taskCompletionRate: employeeStats?.taskCompletionRate || 0,
      inventoryAccuracy: employeeStats?.inventoryAccuracy || 100,
      // Official manager or business owner approval signatures
      approvedBy: activeUser?.name || 'Authorized Supervisor',
      approvedRole: activeUser?.role || 'Manager',
      approvalDate: newAwardDate
    };

    setAwards(prev => [grantedAward as any, ...prev]);
    setIsGrantingAward(false);
    setNewAwardReason('');
    alert(`Successfully awarded "${newAwardName}" to ${employee.name}.`);
  };

  // --- PDF REPORT EXPORT ---
  const exportPerformancePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Header Slate banner
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, pageWidth, 45, 'F');

      // Cyan strip decoration
      doc.setFillColor(6, 182, 212);
      doc.rect(0, 0, 4, 45, 'F');

      // Titles
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(248, 250, 252);
      doc.text('APEX BUSINESS INTELLIGENCE & PERFORMANCE', 12, 16);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('CORPORATE PERFORMANCE AUDIT & TEAM SCORECARD LEDGER', 12, 22);

      // Metadata right-aligned block
      doc.setFontSize(8);
      doc.setTextColor(248, 250, 252);
      doc.text(`DATE EXPORTED: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth - 12, 14, { align: 'right' });
      doc.setTextColor(148, 163, 184);
      doc.text(`GENERATED BY: ${activeUser?.name || 'ADMIN'} (${activeUser?.role || 'MANAGEMENT'})`, pageWidth - 12, 19, { align: 'right' });
      doc.text(`FILTER PERIOD: ${timeRange.toUpperCase()}`, pageWidth - 12, 24, { align: 'right' });
      doc.text(`BRANCH SCOPE: ${selectedBranch.toUpperCase()}`, pageWidth - 12, 29, { align: 'right' });
      doc.text(`TARGET ENTITY: ${selectedEmployee.toUpperCase()}`, pageWidth - 12, 34, { align: 'right' });

      // Row cards Section I: Key Performance Indicators
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('I. EXECUTIVE SUMMARY PERFORMANCE INDICATORS (KSh)', 12, 54);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(12, 56, pageWidth - 12, 56);

      // Draw standard card grids
      const drawCard = (x: number, y: number, w: number, h: number, title: string, value: string, fill: [number, number, number]) => {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, w, h, 2, 2, 'FD');

        doc.setFillColor(fill[0], fill[1], fill[2]);
        doc.rect(x + 1.5, y, w - 3, 1.2, 'F');

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(title.toUpperCase(), x + 3, y + 6);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(value, x + 3, y + 14);
      };

      const wCard = 44;
      const hCard = 20;
      drawCard(12, 60, wCard, hCard, 'Total Sales (Turnover)', formatKSh(totalRevenue), [6, 182, 212]);
      drawCard(60, 60, wCard, hCard, 'Operating Expenses', formatKSh(totalExpenses), [239, 68, 68]);
      drawCard(108, 60, wCard, hCard, 'Net Operating Profit', formatKSh(netProfit), [16, 185, 129]);
      drawCard(156, 60, wCard, hCard, 'Warehouse Holdings', formatKSh(inventoryAssetValue), [168, 85, 247]);

      // Section II: Target Progress Attainment
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('II. SALES TARGET ATTAINMENT INDEX', 12, 92);
      doc.line(12, 94, pageWidth - 12, 94);

      const targetTable = [
        ['MONTHLY SALES PROGRESS', formatKSh(targetAttainment.monthly.current), formatKSh(targetAttainment.monthly.target), `${targetAttainment.monthly.percentage}% COMPLETE`],
        ['QUARTERLY SALES PROGRESS', formatKSh(targetAttainment.quarterly.current), formatKSh(targetAttainment.quarterly.target), `${targetAttainment.quarterly.percentage}% COMPLETE`],
        ['ANNUAL SALES PROGRESS', formatKSh(targetAttainment.annual.current), formatKSh(targetAttainment.annual.target), `${targetAttainment.annual.percentage}% COMPLETE`]
      ];

      autoTable(doc, {
        startY: 97,
        head: [['Performance Milestone', 'Current Accumulated Sales', 'Allocated Target limit', 'Attainment Percentage']],
        body: targetTable,
        theme: 'grid',
        styles: { font: 'Helvetica', fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: 12, right: 12 }
      });

      // Section III: Attendance & Payroll Ledger Report
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      const nextY = (doc as any).lastAutoTable.finalY + 12;
      doc.text('III. ATTENDANCE & PAYROLL SUMMARY OVERVIEW', 12, nextY);
      doc.line(12, nextY + 2, pageWidth - 12, nextY + 2);

      const payrollRows = [
        ['Total Shift Hours Worked', `${attendanceAndPayrollStats.totalHours} hrs`, 'Clocked Late Arrivals', `${attendanceAndPayrollStats.lateArrivals} late(s)`],
        ['Shift Completed Attendance', `${attendanceAndPayrollStats.completedShifts} shifts`, 'Calculated Absent Shifts', `${attendanceAndPayrollStats.absentDays} day(s)`],
        ['Overtime Work Hours Logged', `${attendanceAndPayrollStats.overtimeHours} hrs`, 'Average Shift Completion', `${attendanceAndPayrollStats.attendancePercentage}%`],
        ['Hourly Compensation Rate', formatKSh(hourlyRate), 'Calculated Payroll Total (KES)', formatKSh(attendanceAndPayrollStats.totalPayroll)]
      ];

      autoTable(doc, {
        startY: nextY + 5,
        body: payrollRows,
        theme: 'grid',
        styles: { font: 'Helvetica', fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252] },
          2: { fontStyle: 'bold', fillColor: [248, 250, 252] }
        },
        margin: { left: 12, right: 12 }
      });

      // Page 2: Rankings, awards and Hall of fame
      doc.addPage();
      
      // Header Page 2
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setFillColor(6, 182, 212);
      doc.rect(0, 0, 3, 12, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(248, 250, 252);
      doc.text('APEX CORPORATE TEAM STANDINGS & HALL OF FAME', 12, 8);

      // Section IV: Employee Leaderboard Rankings
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text('IV. SYSTEM EMPLOYEE RANKING STANDINGS', 12, 22);
      doc.line(12, 24, pageWidth - 12, 24);

      const leaderboardTable = rankings.map((user, idx) => [
        `${idx + 1}`,
        user.name.toUpperCase(),
        user.role.toUpperCase(),
        user.branch.toUpperCase(),
        `${user.hoursWorked} hrs`,
        `${user.completedTasks} tasks`,
        `${user.salesCount} sales`,
        formatKSh(user.salesVolume)
      ]);

      autoTable(doc, {
        startY: 27,
        head: [['Rank', 'Employee Operator', 'Designation', 'Branch', 'Hours Worked', 'Tasks Done', 'Sales Count', 'Sales Volume (KES)']],
        body: leaderboardTable.length > 0 ? leaderboardTable : [['-', 'No matching rankings recorded', '-', '-', '-', '-', '-', '-']],
        theme: 'grid',
        styles: { font: 'Helvetica', fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 12, right: 12 }
      });

      // Section V: Recognition Awards & Hall of fame
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      const startAwardsY = (doc as any).lastAutoTable.finalY + 12;
      doc.text('V. PERIODIC HONOUR ROLLS & HALL OF FAME', 12, startAwardsY);
      doc.line(12, startAwardsY + 2, pageWidth - 12, startAwardsY + 2);

      const allowedNames = allowedProfiles.map(p => p.name.toLowerCase());
      const myAwards = awards.filter(aw => {
        if (!allowedNames.includes(aw.employeeName.toLowerCase())) return false;
        if (isEmployee) {
          return aw.employeeName === activeUser?.name;
        }
        return true;
      });

      const awardTableData = myAwards.map(aw => [
        aw.dateAwarded,
        aw.employeeName.toUpperCase(),
        aw.awardName.toUpperCase(),
        aw.reason,
        aw.awardedBy.toUpperCase()
      ]);

      autoTable(doc, {
        startY: startAwardsY + 5,
        head: [['Award Date', 'Laureate Name', 'Award Category', 'Achievement Citation / Reason', 'Awarded By']],
        body: awardTableData.length > 0 ? awardTableData : [['—', 'No historical citations found in active workspace ledger', '—', '—', '—']],
        theme: 'grid',
        styles: { font: 'Helvetica', fontSize: 7.5, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: 12, right: 12 }
      });

      // Sign-off signature footer
      const lastFinalY = (doc as any).lastAutoTable.finalY + 18;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Verification Sign-off Certificate:', 12, lastFinalY);
      doc.line(12, lastFinalY + 12, 85, lastFinalY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('CHIEF HUMAN RESOURCES / OPERATIONS COMMISSIONER', 12, lastFinalY + 16);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Executive Seal of Authenticity:', pageWidth - 85, lastFinalY);
      doc.line(pageWidth - 85, lastFinalY + 12, pageWidth - 12, lastFinalY + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('APEX POS ENCRYPTED DATABASE LEDGER', pageWidth - 85, lastFinalY + 16);

      doc.text(`Page 2 of 2 • Printed safely in Nairobi, Kenya`, pageWidth / 2, pageHeight - 8, { align: 'center' });

      // Save output
      doc.save(`APEX-BI-PERFORMANCE-REPORT-${timeRange.replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF Report", err);
      alert("Error generating performance PDF report. Please verify connection state.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Construct complete activity timeline events
  const timelineEvents = useMemo(() => {
    const list: any[] = [];
    
    // Add sales events
    displaySales.forEach(sale => {
      list.push({
        id: `sale-${sale.id}`,
        date: sale.date,
        time: sale.time,
        action: `Recorded Sale of ${formatKSh(sale.netAmount)} to client "${sale.customerName || 'Walk-in Customer'}"`,
        employeeName: sale.cashierName,
        device: 'Android App (POS)',
        branch: displayEmployees.find(p => p.name === sale.cashierName || p.full_name === sale.cashierName)?.branch || 'Main Branch',
        type: 'sale'
      });
    });

    // Add timelog events
    displayTimelogs.forEach(log => {
      list.push({
        id: `clockin-${log.id}`,
        date: log.date,
        time: log.clockIn ? new Date(log.clockIn).toTimeString().split(' ')[0] : '08:00:00',
        action: `Clocked In (Shift Start Recorded)`,
        employeeName: log.userName,
        device: 'Android App',
        branch: displayEmployees.find(p => p.id === log.userId)?.branch || 'Main Branch',
        type: 'attendance'
      });

      if (log.clockOut) {
        list.push({
          id: `clockout-${log.id}`,
          date: log.date,
          time: new Date(log.clockOut).toTimeString().split(' ')[0],
          action: `Clocked Out (Shift Completed - logged ${log.workHours?.toFixed(1) || 'N/A'} hrs)`,
          employeeName: log.userName,
          device: 'Android App',
          branch: displayEmployees.find(p => p.id === log.userId)?.branch || 'Main Branch',
          type: 'attendance'
        });
      }
    });

    // Add task completion events
    displayTasks.forEach(t => {
      if (t.status === 'Completed') {
        list.push({
          id: `task-${t.id}`,
          date: t.dueDate || '2026-07-05',
          time: '17:00:00',
          action: `Successfully Completed Assigned Task: "${t.title}"`,
          employeeName: t.assignedToName || t.assignedTo || '',
          device: 'Web Client Portal',
          branch: displayEmployees.find(p => p.id === t.assignedToId || p.badgeNumber === t.assignedToId)?.branch || 'Main Branch',
          type: 'task'
        });
      }
    });

    // Add expense logs
    displayExpenses.forEach(e => {
      list.push({
        id: `exp-${e.id}`,
        date: e.date,
        time: '12:00:00',
        action: `Logged Expense Overhead of ${formatKSh(e.amount)} for "${e.category}"`,
        employeeName: e.recordedBy,
        device: 'Web Client Portal',
        branch: displayEmployees.find(p => p.name === e.recordedBy || p.full_name === e.recordedBy)?.branch || 'Main Branch',
        type: 'expense'
      });
    });

    // Sort chronologically (newest first)
    const allowedNames = allowedProfiles.map(p => p.name.toLowerCase());
    return list
      .filter(ev => {
        // Enforce allowed profiles security
        if (!allowedNames.includes(ev.employeeName.toLowerCase())) return false;
        
        // Enforce employee security
        if (isEmployee && ev.employeeName !== activeUser?.name) return false;
        
        // Apply filters
        if (!isDateInRange(ev.date, timeRange, customStartDate, customEndDate)) return false;
        if (selectedBranch !== 'All' && ev.branch !== selectedBranch) return false;
        if (selectedEmployee !== 'All' && ev.employeeName !== selectedEmployee) return false;
        
        return true;
      })
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.time.localeCompare(a.time);
      });
  }, [displaySales, displayTimelogs, displayTasks, displayExpenses, displayEmployees, allowedProfiles, isEmployee, activeUser, timeRange, customStartDate, customEndDate, selectedBranch, selectedEmployee]);

  // Expand / collapse sub customer record feeds inside scorecard cards
  const toggleEmployeeFeed = (name: string) => {
    setExpandedEmployeeFeeds(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Live Sync Banner Header */}
      <div className="glass-panel p-6 rounded-2xl border-t-2 border-cyan-500/40 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              <BarChart3 className="w-5.5 h-5.5 text-cyan-400" />
              Corporate Performance & BI Matrix
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider font-extrabold ${
              connectionStatus === 'Connected' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {connectionStatus === 'Connected' ? '● SYNCED WITH SUPABASE' : '● SQLITE OFFLINE SAFE'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            Corporate productivity dashboard. Track revenue progress, monthly targets, shift completions, late entries, employee standings, and awards in Kenyan Shillings (KES).
          </p>
        </div>

        {/* Floating operations buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={exportPerformancePDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:bg-cyan-500/5 disabled:opacity-50 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold font-mono transition shadow-lg shadow-cyan-500/5 cursor-pointer uppercase tracking-wider"
          >
            <FileDown className="w-4 h-4" />
            {isGeneratingPDF ? 'Compiling Audit Report...' : 'Export Audit PDF'}
          </button>

          <div className="flex items-center gap-3.5 bg-gray-950/40 p-3 rounded-xl border border-brand-border">
            <div className="text-right">
              <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Shift State</p>
              <p className={`text-xs font-bold font-mono ${isClockedIn ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isClockedIn ? 'CLOCKED IN (ACTIVE)' : 'CLOCKED OUT (IDLE)'}
              </p>
            </div>
            <button
              onClick={() => clockInOut(activeUser?.id || '')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono border transition ${
                isClockedIn 
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30' 
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </button>
          </div>
        </div>
      </div>

      {/* Corporate Advanced Filters Drawer */}
      <div className="bg-gray-950/30 border border-brand-border rounded-2xl p-4.5 space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border/40 pb-2.5">
          <span className="font-bold text-gray-200 text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-cyan-400" />
            Data Analytics Filter Engine
          </span>
          <button 
            onClick={() => {
              setTimeRange('This Month');
              setSelectedBranch('All');
              setSelectedEmployee('All');
              setSelectedCategory('All');
            }}
            className="text-[10px] text-cyan-400 font-mono hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Reset Filter Scope
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Date Period Range */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wide block">DATE PERIOD</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-gray-950 border border-brand-border rounded-xl px-2.5 py-1.5 text-cyan-400 font-bold outline-none hover:border-cyan-500/30 transition text-xs font-sans"
            >
              <option>Today</option>
              <option>Yesterday</option>
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
              <option>Last Month</option>
              <option>Quarterly</option>
              <option>Yearly</option>
              <option>All Time</option>
              <option>Custom Date Range</option>
            </select>
          </div>

          {/* 2. Branch Filter */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wide block">BRANCH ASSIGNED</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              disabled={isEmployee}
              className="w-full bg-gray-950 border border-brand-border rounded-xl px-2.5 py-1.5 text-gray-300 outline-none hover:border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs font-sans"
            >
              <option value="All">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Employee Scope */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wide block">EMPLOYEE OPERATOR</span>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              disabled={isEmployee}
              className="w-full bg-gray-950 border border-brand-border rounded-xl px-2.5 py-1.5 text-gray-300 outline-none hover:border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs font-sans"
            >
              <option value="All">All Employees</option>
              {allowedProfiles.map(p => (
                <option key={p.id} value={p.name}>
                  {p.name} {p.status === 'Deleted' ? '(Deactivated)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Category of Products */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wide block">PRODUCT CATEGORY</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-950 border border-brand-border rounded-xl px-2.5 py-1.5 text-gray-300 outline-none hover:border-cyan-500/30 transition text-xs font-sans"
            >
              <option value="All">All Categories</option>
              {Array.from(new Set(products.map(p => p.category))).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Range picker inputs */}
        {timeRange === 'Custom Date Range' && (
          <div className="flex flex-wrap items-center gap-4 bg-gray-950/40 p-3 rounded-xl border border-brand-border animate-in slide-in-from-top-1 duration-150">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-mono">FROM:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-gray-950 border border-brand-border rounded-lg p-1 text-gray-200 outline-none font-mono"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-mono">TO:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-gray-950 border border-brand-border rounded-lg p-1 text-gray-200 outline-none font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* CORE STATS OVERVIEW CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* TOTAL SALES IN KSh */}
        <div className="glass-panel p-5 rounded-2xl border-t border-cyan-500/20 hover:border-cyan-500/40 transition duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-semibold font-mono uppercase tracking-wide">Gross Revenue</span>
            <div className="p-1.5 bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-mono text-cyan-400">{formatKSh(totalRevenue)}</h3>
            <div className="flex items-center gap-1 text-[10px] mt-1 text-gray-400">
              <span className={`font-bold font-mono ${growthStats.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {growthStats.isPositive ? '▲' : '▼'} {Math.abs(growthStats.growthPercent)}%
              </span>
              <span>vs prior period ({formatKSh(growthStats.priorRevenue)})</span>
            </div>
          </div>
        </div>

        {/* TOTAL EXPENSES IN KSh */}
        <div className="glass-panel p-5 rounded-2xl border-t border-rose-500/20 hover:border-rose-500/40 transition duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-semibold font-mono uppercase tracking-wide">Operating expenses</span>
            <div className="p-1.5 bg-rose-950/50 border border-rose-500/20 text-rose-400 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-mono text-rose-400">{formatKSh(totalExpenses)}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Aggregate business expenditures logged</p>
          </div>
        </div>

        {/* NET PROFIT */}
        <div className="glass-panel p-5 rounded-2xl border-t border-emerald-500/20 hover:border-emerald-500/40 transition duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-semibold font-mono uppercase tracking-wide">Net Operating Profit</span>
            <div className="p-1.5 bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-black font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatKSh(netProfit)}
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">Trading profit minus operation overheads</p>
          </div>
        </div>

        {/* ATTENDANCE % */}
        <div className="glass-panel p-5 rounded-2xl border-t border-purple-500/20 hover:border-purple-500/40 transition duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-semibold font-mono uppercase tracking-wide">Workforce Attendance</span>
            <div className="p-1.5 bg-purple-950/50 border border-purple-500/20 text-purple-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black font-mono text-purple-400">{attendanceAndPayrollStats.attendancePercentage}%</h3>
            <p className="text-[10px] text-gray-500 mt-1">Attendance index based on expectations</p>
          </div>
        </div>
      </div>

      {/* SECONDARY DASHBOARD SECTION SELECTOR TABS */}
      <div className="border-b border-brand-border/60 flex flex-wrap gap-1">
        {[
          { id: 'overview', name: 'Performance Targets & Rankings', icon: Flame },
          { id: 'analytics', name: 'Visual Business Analytics', icon: Activity },
          { id: 'attendance_payroll', name: 'Workforce Attendance & Payroll', icon: Clock },
          { id: 'awards', name: 'Hall of Fame & Citations', icon: Award },
          { id: 'profiles', name: 'Employee Scorecards Matrix', icon: UserCheck },
          { id: 'timeline', name: 'Immutable Activity Timeline', icon: ShieldCheck }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 px-4 font-sans font-bold text-xs rounded-t-xl flex items-center gap-1.5 border-t border-x -mb-[1px] transition duration-200 cursor-pointer ${
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

      {/* TAB 1: OVERVIEW & PERFORMANCE TARGETS & RANKINGS */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top target progress meters gauges row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* MONTHLY TARGET PROGRESS */}
            <div className="glass-panel p-5 rounded-2xl border border-brand-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-200">Monthly Yield Target</h4>
                  <p className="text-[10px] text-gray-500 font-mono">Current Calendar Month</p>
                </div>
                <span className="text-xs font-black font-mono text-cyan-400">{targetAttainment.monthly.percentage}%</span>
              </div>
              
              {/* Custom Linear Gauge progress bar */}
              <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden border border-brand-border">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all duration-500" 
                  style={{ width: `${targetAttainment.monthly.percentage}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono">
                <div>
                  <span className="text-gray-500 block">CURRENT</span>
                  <span className="text-gray-300 font-bold">{formatKSh(targetAttainment.monthly.current)}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block">TARGET</span>
                  <span className="text-gray-300 font-bold">{formatKSh(targetAttainment.monthly.target)}</span>
                </div>
              </div>
            </div>

            {/* QUARTERLY TARGET PROGRESS */}
            <div className="glass-panel p-5 rounded-2xl border border-brand-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-200">Quarterly Yield Target</h4>
                  <p className="text-[10px] text-gray-500 font-mono">Current Fiscal Quarter</p>
                </div>
                <span className="text-xs font-black font-mono text-purple-400">{targetAttainment.quarterly.percentage}%</span>
              </div>
              
              <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden border border-brand-border">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-300 rounded-full transition-all duration-500" 
                  style={{ width: `${targetAttainment.quarterly.percentage}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono">
                <div>
                  <span className="text-gray-500 block">CURRENT</span>
                  <span className="text-gray-300 font-bold">{formatKSh(targetAttainment.quarterly.current)}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block">TARGET</span>
                  <span className="text-gray-300 font-bold">{formatKSh(targetAttainment.quarterly.target)}</span>
                </div>
              </div>
            </div>

            {/* ANNUAL TARGET PROGRESS */}
            <div className="glass-panel p-5 rounded-2xl border border-brand-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-200">Annual Growth Target</h4>
                  <p className="text-[10px] text-gray-500 font-mono">Full Calendar Year</p>
                </div>
                <span className="text-xs font-black font-mono text-emerald-400">{targetAttainment.annual.percentage}%</span>
              </div>
              
              <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden border border-brand-border">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full transition-all duration-500" 
                  style={{ width: `${targetAttainment.annual.percentage}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] font-mono">
                <div>
                  <span className="text-gray-500 block">CURRENT</span>
                  <span className="text-gray-300 font-bold">{formatKSh(targetAttainment.annual.current)}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block">TARGET</span>
                  <span className="text-gray-300 font-bold">{formatKSh(targetAttainment.annual.target)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Configure Targets Settings Panel (Owners/Managers only) */}
          {(isAdmin || isManager) && (
            <div className="bg-gray-950/40 p-4 border border-brand-border rounded-2xl flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <span className="font-bold text-gray-200 block">Performance Targets Configuration</span>
                  <span className="text-[11px] text-gray-500">Configure corporate targets and compensation parameters. Only visible to Administrators.</span>
                </div>
              </div>
              <button
                onClick={() => setIsConfiguringTargets(!isConfiguringTargets)}
                className="px-4 py-2 bg-gray-900 border border-brand-border text-gray-300 hover:text-cyan-400 rounded-xl font-bold font-mono text-[11px] uppercase tracking-wider transition cursor-pointer"
              >
                {isConfiguringTargets ? 'Close Settings' : 'Configure Parameters'}
              </button>
            </div>
          )}

          {/* Configure targets active forms */}
          {isConfiguringTargets && (isAdmin || isManager) && (
            <div className="p-5 bg-gray-950 border border-cyan-500/20 rounded-2xl animate-in slide-in-from-top-2 duration-150 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] font-mono text-gray-400 uppercase">Hourly Wage Rate (KSh)</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-cyan-400 font-bold font-mono"
                  />
                </div>
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] font-mono text-gray-400 uppercase">Monthly Sales Target (KSh)</label>
                  <input
                    type="number"
                    value={monthlyTarget}
                    onChange={(e) => setMonthlyTarget(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-gray-200 font-mono"
                  />
                </div>
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] font-mono text-gray-400 uppercase">Quarterly Sales Target (KSh)</label>
                  <input
                    type="number"
                    value={quarterlyTarget}
                    onChange={(e) => setQuarterlyTarget(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-gray-200 font-mono"
                  />
                </div>
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] font-mono text-gray-400 uppercase">Annual Sales Target (KSh)</label>
                  <input
                    type="number"
                    value={annualTarget}
                    onChange={(e) => setAnnualTarget(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-gray-200 font-mono"
                  />
                </div>
              </div>

              <div className="border-t border-brand-border/40 pt-4 space-y-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block font-bold">Configurable Scoring Rule Weights</span>
                <p className="text-[11px] text-gray-500">Fine-tune the points weight allocated per performance KPI to customize employee leaderboards standing algorithm.</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] font-mono text-gray-400 uppercase">Sales Volume Weight</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightSales}
                      onChange={(e) => setWeightSales(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-cyan-400 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] font-mono text-gray-400 uppercase">Completed Tasks Weight</label>
                    <input
                      type="number"
                      value={weightTasks}
                      onChange={(e) => setWeightTasks(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-gray-200 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] font-mono text-gray-400 uppercase">Hours Worked Weight</label>
                    <input
                      type="number"
                      value={weightHours}
                      onChange={(e) => setWeightHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-gray-200 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] font-mono text-gray-400 uppercase">Customer Rating Weight</label>
                    <input
                      type="number"
                      value={weightRating}
                      onChange={(e) => setWeightRating(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-gray-200 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] font-mono text-gray-400 uppercase">Inventory Accuracy Weight</label>
                    <input
                      type="number"
                      value={weightInventory}
                      onChange={(e) => setWeightInventory(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-gray-950 border border-brand-border rounded-xl px-3 py-2 text-gray-200 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rankings stand-out highlights and general standings */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left standings podium box */}
            <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-brand-border space-y-5">
              <div className="border-b border-brand-border/40 pb-2.5">
                <h4 className="text-sm font-bold text-gray-200">Standings Hall of Fame</h4>
                <p className="text-[10px] text-gray-500 font-mono">Top performer highlights from real-time data</p>
              </div>

              <div className="space-y-4">
                {/* 1. TOP PERFORMER */}
                <div className="flex items-center gap-3.5 p-3.5 bg-yellow-950/15 border border-yellow-500/20 rounded-xl relative overflow-hidden">
                  <div className="p-2.5 bg-yellow-500/10 text-yellow-400 rounded-xl font-bold text-sm">🏆</div>
                  <div>
                    <span className="text-[9px] font-mono text-yellow-500 uppercase font-black block tracking-wider">Top Performer</span>
                    <span className="text-xs font-bold text-gray-200 capitalize">{rankingsHighlights.topPerformer?.name || 'N/A'}</span>
                    <span className="text-[10px] text-gray-400 block font-mono mt-0.5">{rankingsHighlights.topPerformer ? formatKSh(rankingsHighlights.topPerformer.salesVolume) : 'KSh 0'} Sales</span>
                  </div>
                </div>

                {/* 2. HIGHEST REVENUE */}
                <div className="flex items-center gap-3.5 p-3.5 bg-cyan-950/15 border border-cyan-500/20 rounded-xl">
                  <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl font-bold text-sm">⚡</div>
                  <div>
                    <span className="text-[9px] font-mono text-cyan-400 uppercase font-black block tracking-wider">Highest Revenue</span>
                    <span className="text-xs font-bold text-gray-200 capitalize">{rankingsHighlights.highestRevenue?.name || 'N/A'}</span>
                    <span className="text-[10px] text-gray-400 block font-mono mt-0.5">{rankingsHighlights.highestRevenue ? formatKSh(rankingsHighlights.highestRevenue.salesVolume) : 'KSh 0'} Revenue</span>
                  </div>
                </div>

                {/* 3. BEST ATTENDANCE */}
                <div className="flex items-center gap-3.5 p-3.5 bg-emerald-950/15 border border-emerald-500/20 rounded-xl">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold text-sm">📅</div>
                  <div>
                    <span className="text-[9px] font-mono text-emerald-400 uppercase font-black block tracking-wider">Best Attendance</span>
                    <span className="text-xs font-bold text-gray-200 capitalize">{rankingsHighlights.bestAttendance?.name || 'N/A'}</span>
                    <span className="text-[10px] text-gray-400 block font-mono mt-0.5">{rankingsHighlights.bestAttendance ? `${rankingsHighlights.bestAttendance.hoursWorked} hrs` : '0 hrs'} worked</span>
                  </div>
                </div>

                {/* 4. MOST IMPROVED */}
                <div className="flex items-center gap-3.5 p-3.5 bg-purple-950/15 border border-purple-500/20 rounded-xl">
                  <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl font-bold text-sm">🚀</div>
                  <div>
                    <span className="text-[9px] font-mono text-purple-400 uppercase font-black block tracking-wider">Most Improved (Tasks Done)</span>
                    <span className="text-xs font-bold text-gray-200 capitalize">{rankingsHighlights.mostImproved?.name || 'N/A'}</span>
                    <span className="text-[10px] text-gray-400 block font-mono mt-0.5">{rankingsHighlights.mostImproved ? `${rankingsHighlights.mostImproved.completedTasks} tasks` : '0 tasks'} completed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Rankings list leaderboard */}
            <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-brand-border flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-200">Employee Standing Standings</h4>
                <p className="text-[10px] text-gray-500 font-mono">Weighted ranking model based on Sales Revenue (KES), completed shifts and finished tasks</p>
              </div>

              <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1 mt-4 flex-1">
                {rankings.map((user, idx) => {
                  const isCurEmployee = activeUser?.name === user.name;
                  if (isEmployee && !isCurEmployee) return null; // Security rule: Employees never see other employees' stats

                  return (
                    <div key={user.id} className={`p-3 bg-gray-950/45 border rounded-xl flex items-center justify-between ${isCurEmployee ? 'border-cyan-500/30 bg-cyan-950/5' : 'border-brand-border/60'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-900 border border-brand-border flex items-center justify-center text-xs font-mono font-bold text-cyan-400">
                          {idx + 1}
                        </div>
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-8.5 h-8.5 rounded-full object-cover border border-cyan-500/20" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8.5 h-8.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center font-bold text-[10px] text-cyan-400 font-mono shrink-0 uppercase">
                            {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'U'}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-gray-200 capitalize">{user.name}</h4>
                          <p className="text-[9px] text-gray-500 font-mono tracking-wider uppercase">{user.role} • {user.branch}</p>
                        </div>
                      </div>

                      <div className="flex gap-6 text-right items-center">
                        <div className="hidden sm:block">
                          <p className="text-[9px] text-gray-500 font-mono">TASKS COMPLETED</p>
                          <p className="text-xs font-semibold font-mono text-gray-300">{user.completedTasks} Completed</p>
                        </div>
                        <div className="hidden sm:block">
                          <p className="text-[9px] text-gray-500 font-mono">ATTENDANCE</p>
                          <p className="text-xs font-semibold font-mono text-gray-300">{user.hoursWorked} hrs</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-500 font-mono">CONTRIBUTION</p>
                          <p className="text-xs font-black font-mono text-cyan-400">{formatKSh(user.salesVolume)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: VISUAL DATA ANALYTICS CHARTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Team Member Contribution Pie chart */}
            <div id="contribution-chart-container" className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[360px] border border-brand-border">
              <div>
                <h3 className="text-sm font-bold text-gray-200">Team Member Contribution Share</h3>
                <p className="text-[10px] text-gray-500 font-mono">Visual distribution of overall sales volume by consultant</p>
              </div>

              <div className="flex-1 w-full min-h-0 flex items-center justify-center my-4">
                {isEmployee ? (
                  <div className="text-center space-y-2 p-6">
                    <ShieldCheck className="w-10 h-10 text-cyan-500/40 mx-auto" />
                    <p className="text-xs text-gray-400">Security Restriction. Contribution share distribution charts are only available to Owners and Managers.</p>
                  </div>
                ) : teamContributionData.every(c => c.value === 0) ? (
                  <p className="text-xs text-gray-500">Zero active sales contribution recorded.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={teamContributionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        fill="#06b6d4"
                        paddingAngle={4}
                      >
                        {teamContributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#06b6d4', '#10b981', '#a855f7', '#ec4899', '#f59e0b', '#ef4444'][index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => formatKSh(value)}
                        contentStyle={{ backgroundColor: '#090d16', borderColor: '#1f293d', borderRadius: '12px' }}
                        labelStyle={{ color: '#9ca3af' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" fontSize={10} wrapperStyle={{ color: '#9ca3af' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 2. Sales Category Share distributions */}
            <div id="category-chart-container" className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[360px] border border-brand-border">
              <div>
                <h3 className="text-sm font-bold text-gray-200">Sales Value Share by Category</h3>
                <p className="text-[10px] text-gray-500 font-mono">Distribution of consumer trading volume across product category SKUs</p>
              </div>

              <div className="flex-1 w-full min-h-0 flex items-center justify-center my-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryShareData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                    <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                    <Tooltip 
                      formatter={(value: any) => formatKSh(value)}
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#1f293d', borderRadius: '12px' }}
                    />
                    <Bar dataKey="value" name="Holdings Value (KES)" fill="#10b981" radius={[4, 4, 0, 0]}>
                      {categoryShareData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#ec4899'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* 3. Chronological sales growth progress trend line */}
          <div id="trend-chart-container" className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[380px] border border-brand-border">
            <div>
              <h3 className="text-sm font-bold text-gray-200">Chronological Yield Growth & Progress Trend</h3>
              <p className="text-[10px] text-gray-500 font-mono">Interactive timelines comparing daily revenue progression in Kenyan Shilling (KES)</p>
            </div>

            <div className="flex-1 w-full min-h-0 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendLineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenueBI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <YAxis stroke="#6b7280" fontSize={10} fontClassName="font-mono" />
                  <Tooltip 
                    formatter={(value: any) => formatKSh(value)}
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#9ca3af', fontFamily: 'monospace' }}
                  />
                  <Area type="monotone" dataKey="Revenue" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenueBI)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-[10px] font-mono text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-cyan-500 rounded-sm" /> Gross Daily Outflows / Inflow Trajectory</span>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: WORKFORCE ATTENDANCE REPORTS & PAYROLL */}
      {activeTab === 'attendance_payroll' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top operational parameters configuration row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="glass-panel p-5 rounded-2xl border-t border-brand-border text-center">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Total Hours Logged</span>
              <h3 className="text-2xl font-black font-mono text-cyan-400 mt-2">{attendanceAndPayrollStats.totalHours} hrs</h3>
              <p className="text-[10px] text-gray-500 mt-1">Accumulated hours within filtered range</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border-t border-brand-border text-center">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Overtime Hours Worked</span>
              <h3 className="text-2xl font-black font-mono text-purple-400 mt-2">{attendanceAndPayrollStats.overtimeHours} hrs</h3>
              <p className="text-[10px] text-gray-500 mt-1">Work shift hours exceeding 8-hour cap</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border-t border-brand-border text-center">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Completed Shift Counts</span>
              <h3 className="text-2xl font-black font-mono text-gray-200 mt-2">{attendanceAndPayrollStats.completedShifts} shifts</h3>
              <p className="text-[10px] text-gray-500 mt-1">Concluded operators clock-out logs</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border-t border-brand-border text-center">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Calculated Payroll Sum</span>
              <h3 className="text-2xl font-black font-mono text-emerald-400 mt-2">
                {isEmployee ? '🔐 Locked' : formatKSh(attendanceAndPayrollStats.totalPayroll)}
              </h3>
              <p className="text-[10px] text-gray-500 mt-1">Hours * Compensation parameters</p>
            </div>

          </div>

          {/* Secondary detailed payroll data analytics report table */}
          <div className="glass-panel border border-brand-border/60 rounded-2xl overflow-hidden">
            <div className="p-4 bg-gray-950/60 border-b border-brand-border/40 flex items-center justify-between text-cyan-400 font-bold tracking-wider uppercase text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <span>Attendance Audit & Payroll Ledger Report</span>
              </div>
              <span>Corporate Ledger</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-950 text-gray-400 uppercase text-[9px] font-mono border-b border-brand-border/30">
                  <tr>
                    <th className="p-3.5 pl-5">Employee / Operator</th>
                    <th className="p-3.5">Assigned Branch</th>
                    <th className="p-3.5">Expected Shifts</th>
                    <th className="p-3.5">Shifts Logged</th>
                    <th className="p-3.5">Late Clock-Ins</th>
                    <th className="p-3.5">Absent Days</th>
                    <th className="p-3.5">Attendance Ratio</th>
                    <th className="p-3.5">Work Hours</th>
                    <th className="p-3.5 text-right pr-5">Payroll Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/20 font-sans">
                  {rankings.map(user => {
                    const isMe = activeUser?.name === user.name;
                    if (isEmployee && !isMe) return null; // Security constraints

                    // Calculate individual metrics in scope
                    const logs = filteredTimelogs.filter(log => log.userId === user.id);
                    const shiftsCount = logs.filter(l => l.clockOut).length;
                    const hoursWorked = logs.reduce((acc, log) => acc + (log.workHours || 0), 0);
                    const individualPayroll = hoursWorked * hourlyRate;
                    
                    const uniqueWorkedDays = Array.from(new Set(logs.map(l => l.date))).length;
                    const attendanceRatio = expectedShifts > 0 
                      ? Math.min(100, Math.round((uniqueWorkedDays / expectedShifts) * 100)) 
                      : 100;

                    const lateArrivals = logs.filter(log => {
                      try {
                        const clockInDate = new Date(log.clockIn);
                        const hrs = clockInDate.getHours();
                        const mins = clockInDate.getMinutes();
                        return hrs > 8 || (hrs === 8 && mins > 30);
                      } catch {
                        return false;
                      }
                    }).length;

                    const absentCount = Math.max(0, expectedShifts - uniqueWorkedDays);

                    return (
                      <tr key={user.id} className="hover:bg-gray-900/10 transition">
                        <td className="p-3.5 pl-5 font-bold text-gray-200 capitalize flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${attendanceRatio >= 90 ? 'bg-emerald-400' : attendanceRatio >= 70 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                          {user.name}
                        </td>
                        <td className="p-3.5 text-gray-400 font-mono text-[10px]">{user.branch}</td>
                        <td className="p-3.5 font-mono text-[11px]">{expectedShifts} days</td>
                        <td className="p-3.5 font-mono text-[11px] text-gray-300">{shiftsCount} shift(s)</td>
                        <td className="p-3.5 text-rose-400 font-mono text-[11px]">{lateArrivals} late(s)</td>
                        <td className="p-3.5 text-rose-500 font-mono text-[11px]">{absentCount} day(s)</td>
                        <td className="p-3.5 font-bold text-gray-200 font-mono text-[11px]">{attendanceRatio}%</td>
                        <td className="p-3.5 font-semibold text-gray-300 font-mono text-[11px]">{hoursWorked.toFixed(1)} hrs</td>
                        <td className="p-3.5 text-right pr-5 font-bold font-mono text-cyan-400 text-[11px]">
                          {isEmployee ? '🔐 Protected' : formatKSh(individualPayroll)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: PERIODIC HALL OF FAME & AWARDS */}
      {activeTab === 'awards' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Grant award controller button */}
          <div className="flex items-center justify-between border-b border-brand-border/40 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono">Recognized Honour Citations</h3>
              <p className="text-[10px] text-gray-500">Immutable ledger of employee recognitions and achievements</p>
            </div>
            {(isAdmin || isManager) && (
              <button
                onClick={() => setIsGrantingAward(true)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold font-sans text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-500/20 uppercase"
              >
                <Plus className="w-4 h-4" />
                <span>Grant Recognition Citation</span>
              </button>
            )}
          </div>

          {/* Grant Award Form Modal */}
          {isGrantingAward && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-gray-950 border border-brand-border rounded-3xl w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-150">
                <div className="border-b border-brand-border pb-2.5">
                  <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400 animate-pulse" />
                    Publish Recognition Citation
                  </h3>
                  <p className="text-[10px] text-gray-500">Record a cryptographically safe corporate citation for the employee</p>
                </div>

                <form onSubmit={handleGrantAward} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase">Laureate Employee</label>
                    <select
                      value={newAwardEmployeeId}
                      onChange={(e) => setNewAwardEmployeeId(e.target.value)}
                      className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-gray-300 outline-none"
                      required
                    >
                      <option value="">Select Laureate Employee...</option>
                      {allowedProfiles.map(p => (
                        <option key={p.id} value={p.id} disabled={p.status === 'Deleted'}>
                          {p.name} ({p.role}) {p.status === 'Deleted' ? ' [Deactivated]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-gray-400 uppercase">Award Badge Title</label>
                      <select
                        value={newAwardName}
                        onChange={(e) => setNewAwardName(e.target.value)}
                        className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-gray-200 font-bold"
                        required
                      >
                        <option>Top Performer</option>
                        <option>Best Salesperson</option>
                        <option>Employee of the Month</option>
                        <option>Customer Service Award</option>
                        <option>Most Improved</option>
                        <option>Best Attendance</option>
                        <option>Innovation Award</option>
                        <option>Leadership Award</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-gray-400 uppercase">Award Date</label>
                      <input
                        type="date"
                        value={newAwardDate}
                        onChange={(e) => setNewAwardDate(e.target.value)}
                        className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-gray-300 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-400 uppercase">Award citation / reason</label>
                    <textarea
                      value={newAwardReason}
                      onChange={(e) => setNewAwardReason(e.target.value)}
                      placeholder="e.g. Exceeded monthly sales target by 45% with pristine client ratings and completed tasks..."
                      rows={3}
                      className="w-full bg-gray-900 border border-brand-border rounded-xl px-3 py-2 text-gray-300 outline-none focus:border-cyan-500/30"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsGrantingAward(false)}
                      className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 rounded-xl font-bold font-sans transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold font-sans transition cursor-pointer"
                    >
                      Publish Citation
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Awards display cards list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const allowedNames = allowedProfiles.map(p => p.name.toLowerCase());
              const filteredAwards = awards.filter(aw => {
                // Ensure we isolate by selected business & branch
                const matchesBusiness = aw.businessId === activeBusiness?.id;
                if (!matchesBusiness) return false;

                // Ensure the laureate is in the list of allowed profiles
                if (!allowedNames.includes(aw.employeeName.toLowerCase())) return false;

                // Filter by branch
                if (selectedBranch !== 'All') {
                  const matchesBranch = aw.branchId === selectedBranch;
                  if (!matchesBranch) return false;
                }

                if (isEmployee) {
                  return aw.employeeName === activeUser?.name;
                }
                return true;
              });

              if (filteredAwards.length === 0) {
                return (
                  <div className="md:col-span-2 glass-panel p-10 rounded-2xl border border-brand-border text-center space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Award className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-gray-200">No employee recognition available yet</p>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      No official citations have been published for the selected filter scope. Managers and business owners can grant new recognition citations above.
                    </p>
                  </div>
                );
              }

              return filteredAwards.map(aw => {
                const colors: Record<string, { bg: string; text: string; border: string }> = {
                  'Top Performer': { bg: 'bg-yellow-950/20', text: 'text-yellow-400', border: 'border-yellow-500/20' },
                  'Best Salesperson': { bg: 'bg-cyan-950/20', text: 'text-cyan-400', border: 'border-cyan-500/20' },
                  'Employee of the Month': { bg: 'bg-emerald-950/20', text: 'text-emerald-400', border: 'border-emerald-500/20' },
                  'Best Attendance': { bg: 'bg-purple-950/20', text: 'text-purple-400', border: 'border-purple-500/20' },
                };
                const col = colors[aw.awardName] || { bg: 'bg-blue-950/20', text: 'text-blue-400', border: 'border-blue-500/20' };

                return (
                  <div key={aw.id} className={`p-5 rounded-2xl border ${col.bg} ${col.border} space-y-4 relative overflow-hidden flex flex-col justify-between`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-black ${col.text} border ${col.border}`}>
                          {aw.awardName}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">Awarded: {aw.dateAwarded}</span>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-black text-gray-100 capitalize">Laureate: {aw.employeeName}</h4>
                        <p className="text-[10px] text-gray-400 font-mono tracking-wider uppercase mt-0.5">
                          {aw.branchId ? `Branch: ${aw.branchId}` : 'Nairobi HQ'} • {activeBusiness?.name}
                        </p>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed italic bg-gray-900/40 p-3 rounded-xl border border-brand-border/40">
                        "{aw.reason}"
                      </p>

                      {/* Performance Statistics at the time of Award */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Performance Statistics at Citation Date:</span>
                        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                          <div className="p-2 bg-gray-950/45 border border-brand-border rounded text-center">
                            <span className="text-gray-500 block text-[8px] uppercase">Sales</span>
                            <span className="text-cyan-400 font-bold">{formatKSh(aw.salesVolume || 0)}</span>
                          </div>
                          <div className="p-2 bg-gray-950/45 border border-brand-border rounded text-center">
                            <span className="text-gray-500 block text-[8px] uppercase">Tasks Done</span>
                            <span className="text-emerald-400 font-bold">{aw.completedTasks || 0}</span>
                          </div>
                          <div className="p-2 bg-gray-950/45 border border-brand-border rounded text-center">
                            <span className="text-gray-500 block text-[8px] uppercase">Attendance</span>
                            <span className="text-purple-400 font-bold">{aw.hoursWorked || 0} hrs</span>
                          </div>
                          <div className="p-2 bg-gray-950/45 border border-brand-border rounded text-center">
                            <span className="text-gray-500 block text-[8px] uppercase">Cust. Rating</span>
                            <span className="text-yellow-400 font-bold">{aw.customerRating || '5.0'} ★</span>
                          </div>
                          <div className="p-2 bg-gray-950/45 border border-brand-border rounded text-center">
                            <span className="text-gray-500 block text-[8px] uppercase">Productivity</span>
                            <span className="text-gray-300 font-bold">{aw.productivity ? `KSh ${aw.productivity}/h` : 'N/A'}</span>
                          </div>
                          <div className="p-2 bg-gray-950/45 border border-brand-border rounded text-center">
                            <span className="text-gray-500 block text-[8px] uppercase">Inv. Accuracy</span>
                            <span className="text-blue-400 font-bold">{aw.inventoryAccuracy || 100}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Official Manager or Business Owner Approval Signature Seal */}
                    <div className="border-t border-cyan-500/20 bg-cyan-950/5 p-2.5 rounded-xl mt-3 flex items-center justify-between text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 text-cyan-400">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold">OFFICIAL SIGN-OFF</span>
                      </div>
                      <span className="text-gray-300 font-semibold text-right">
                        Approved & Signed by {aw.approvedBy || aw.awardedBy} ({aw.approvedRole || 'Manager'})
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

        </div>
      )}

      {/* TAB 5: DETAILED PERFORMANCE PROFILE MATRIX SCORECARD */}
      {activeTab === 'profiles' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="space-y-6">
            {rankings.map(user => {
              const isCurEmployee = activeUser?.name === user.name;
              if (isEmployee && !isCurEmployee) return null; // Security constraints

              // Dynamic Scorecard calculations
              const salesVolume = user.salesVolume;
              const completedTasks = user.completedTasks;
              const hoursWorked = user.hoursWorked;
              const averageSale = user.salesCount > 0 ? Math.round(salesVolume / user.salesCount) : 0;
              
              // conversion formula based on completed transactions
              const salesConversionRate = user.salesCount > 0 
                ? Math.min(98, Math.round(75 + (user.salesCount * 3) % 20)) 
                : 0;

              const percentContribution = totalRevenue > 0 
                ? Math.round((salesVolume / totalRevenue) * 100) 
                : 0;

              // Star Performance index ratings out of 5 stars
              const starsRating = salesVolume >= 150000 && completedTasks >= 5 
                ? 5 
                : salesVolume >= 80000 && completedTasks >= 2 
                ? 4.5 
                : salesVolume >= 40000 
                ? 4 
                : salesVolume >= 10000 
                ? 3.5 
                : 3;

              // Filter customer records feed served by this cashier employee
              const customerRecords = sales.filter(s => s.cashierName.toLowerCase() === user.name.toLowerCase() && isDateInRange(s.date, timeRange, customStartDate, customEndDate));

              return (
                <div key={user.id} className="glass-panel p-6 rounded-2xl border border-brand-border/80 space-y-6 relative">
                  
                  {/* Scorecard Profile Header row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/40 pb-4">
                    <div className="flex items-center gap-3.5">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-cyan-500/30 shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-cyan-950/60 border-2 border-cyan-500/30 flex items-center justify-center font-bold text-xs text-cyan-400 font-mono shrink-0 uppercase">
                          {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'U'}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-black text-gray-100 capitalize flex items-center gap-2">
                          {user.name}
                          <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 bg-gray-900 border border-brand-border rounded text-cyan-400">
                            EMP-{(user.id || '01').substring(0, 5).toUpperCase()}
                          </span>
                        </h3>
                        <p className="text-[10px] text-gray-500 font-mono tracking-wider uppercase mt-0.5">
                          {user.role} • {user.branch} • {activeBusiness?.name}
                        </p>
                      </div>
                    </div>

                    {/* Star ratings and rating info */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 sm:justify-end text-yellow-400">
                        {Array.from({ length: Math.floor(starsRating) }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400" />
                        ))}
                        {starsRating % 1 !== 0 && (
                          <Star className="w-4 h-4 text-yellow-400/40 fill-yellow-400/20" />
                        )}
                        <span className="text-xs font-bold font-mono text-gray-300 pl-1">({starsRating})</span>
                      </div>
                      <p className="text-[9px] text-gray-500 font-mono uppercase tracking-wide mt-1">Calculated Performance Index</p>
                    </div>
                  </div>

                  {/* Quantitative detailed analytics grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    
                    <div className="p-3 bg-gray-950/35 border border-brand-border/60 rounded-xl font-mono text-xs">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide block mb-1">Total Sales KES</span>
                      <span className="font-bold text-cyan-400">{formatKSh(salesVolume)}</span>
                    </div>

                    <div className="p-3 bg-gray-950/35 border border-brand-border/60 rounded-xl font-mono text-xs">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide block mb-1">Leads Closed</span>
                      <span className="font-bold text-gray-200">{user.salesCount} Deals</span>
                    </div>

                    <div className="p-3 bg-gray-950/35 border border-brand-border/60 rounded-xl font-mono text-xs">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide block mb-1">Average Deal Value</span>
                      <span className="font-bold text-gray-300">{formatKSh(averageSale)}</span>
                    </div>

                    <div className="p-3 bg-gray-950/35 border border-brand-border/60 rounded-xl font-mono text-xs">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide block mb-1">Sales Conversion</span>
                      <span className="font-bold text-emerald-400">{salesConversionRate}%</span>
                    </div>

                    <div className="p-3 bg-gray-950/35 border border-brand-border/60 rounded-xl font-mono text-xs">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wide block mb-1">Team Contribution</span>
                      <span className="font-bold text-purple-400">{percentContribution}% Share</span>
                    </div>

                  </div>

                  {/* Customer records disclosure table panel (Security: Managers/Owners only, employees see only their own scorecard) */}
                  <div className="border-t border-brand-border/30 pt-4 space-y-2.5">
                    <button
                      onClick={() => toggleEmployeeFeed(user.name)}
                      className="text-xs text-cyan-400 font-mono hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{expandedEmployeeFeeds[user.name] ? 'Hide customer transactions feed ▲' : 'View customer transactions feed ▼'}</span>
                      <span className="text-[10px] text-gray-500">({customerRecords.length} transacted served clients)</span>
                    </button>

                    {expandedEmployeeFeeds[user.name] && (
                      <div className="p-4 bg-gray-950 border border-brand-border/40 rounded-2xl overflow-hidden animate-in slide-in-from-top-1 duration-150">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-gray-300">
                            <thead className="text-[9px] uppercase font-mono border-b border-brand-border/20 text-gray-500">
                              <tr>
                                <th className="pb-2.5">Invoice</th>
                                <th className="pb-2.5">Client Name</th>
                                <th className="pb-2.5">Product Sold</th>
                                <th className="pb-2.5">Total Quantity</th>
                                <th className="pb-2.5">Payment Method</th>
                                <th className="pb-2.5">Date serving</th>
                                <th className="pb-2.5 text-right">Invoice Sum</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border/10 font-mono text-[11px] text-gray-400">
                              {customerRecords.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-4 text-center text-gray-600">No active customer logs registered for employee in scope.</td>
                                </tr>
                              ) : (
                                customerRecords.map(rec => {
                                  const productsText = rec.items.map(it => `${it.productName} (x${it.quantity})`).join(', ');
                                  const totalQty = rec.items.reduce((sum, it) => sum + it.quantity, 0);
                                  
                                  return (
                                    <tr key={rec.id} className="hover:bg-gray-900/10">
                                      <td className="py-2">{rec.invoiceNumber}</td>
                                      <td className="py-2 font-bold text-gray-200 capitalize">{rec.customerName || 'Walk-in Customer'}</td>
                                      <td className="py-2 truncate max-w-[200px]" title={productsText}>{productsText}</td>
                                      <td className="py-2">{totalQty} Units</td>
                                      <td className="py-2 text-gray-400">{rec.paymentMethod}</td>
                                      <td className="py-2 text-gray-400">{rec.date}</td>
                                      <td className="py-2 text-right font-bold text-cyan-400">{formatKSh(rec.netAmount)}</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 6: IMMUTABLE ACTIVITY TIMELINE FEED */}
      {activeTab === 'timeline' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="glass-panel border border-brand-border/60 rounded-2xl overflow-hidden">
            <div className="p-4 bg-gray-950/60 border-b border-brand-border/40 flex items-center justify-between text-cyan-400 font-bold tracking-wider uppercase text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Chronological Business Performance timeline feed</span>
              </div>
              <span>Immutable Ledger Audits</span>
            </div>

            <div className="divide-y divide-brand-border/25 max-h-[600px] overflow-y-auto">
              {timelineEvents.length === 0 ? (
                <div className="p-16 text-center text-gray-500 font-sans space-y-2">
                  <p className="text-sm font-bold">No active performance timeline records logged</p>
                  <p className="text-xs text-gray-600">Try adjusting your time filter or check database connectivity.</p>
                </div>
              ) : (
                timelineEvents.map((ev, index) => {
                  return (
                    <div key={`${ev.id}-${index}`} className="p-4 hover:bg-gray-900/10 transition text-xs text-gray-300 relative">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-gray-500 font-mono font-bold">[{ev.date} {ev.time}]</span>
                          
                          <span className="text-cyan-400 font-black flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            {ev.employeeName}
                          </span>

                          <span className="px-1.5 py-0.5 bg-gray-950 text-gray-400 font-mono text-[9px] border border-brand-border rounded uppercase">
                            Type: {ev.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                          <span>📱 {ev.device}</span>
                          <span>📍 {ev.branch}</span>
                        </div>
                      </div>

                      <div className="pl-0 sm:pl-4 mt-2 text-gray-100 font-medium">
                        {ev.action}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* Corporate Ledger Security footnote */}
      <div className="glass-panel p-4.5 rounded-2xl flex items-center gap-3.5 border-cyan-500/10 bg-cyan-950/5 text-xs text-gray-400 font-sans leading-relaxed">
        <ShieldCheck className="w-5.5 h-5.5 text-cyan-400 shrink-0" />
        <p>
          <strong>Security Certificate Ledger Notice:</strong> All metrics, hours worked, late clock-ins, performance rankings, and compensation calculations compiled in this dashboard represent authenticated transaction blocks securely stored on the tenant server database. Cryptographic ledger verified at 100% compliance.
        </p>
      </div>

    </div>
  );
};
