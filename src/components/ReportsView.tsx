import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { formatKSh } from '../lib/utils';
import { 
  FileDown, Calendar, TrendingUp, DollarSign, Wallet, FileText, Printer,
  Scale, ShieldCheck, Layers, ClipboardList, Clock, Search, ChevronDown,
  Check, CheckCircle, ArrowDown, ArrowUp, RefreshCw, BarChart3, Users, 
  HelpCircle, AlertTriangle, FileSpreadsheet, Building, Tag, Percent, Award
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, LineChart, Line
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Modular Subcomponents Imports
import { ReportFilters } from './reports/ReportFilters';
import { BranchComparisonSection } from './reports/BranchComparisonSection';
import { ProductPerformanceSection } from './reports/ProductPerformanceSection';
import { CustomerPerformanceSection } from './reports/CustomerPerformanceSection';
import { EmployeePerformanceSection } from './reports/EmployeePerformanceSection';
import { InventoryPerformanceSection } from './reports/InventoryPerformanceSection';

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
    branches,
    customers,
    profiles,
    tasks
  } = useApp();

  const [reportPeriod, setReportPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Custom'>('Monthly');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Ten advanced report types to meet user needs
  const [selectedReportType, setSelectedReportType] = useState<'PL' | 'BRANCH' | 'EXPENSES' | 'PRODUCTS' | 'CUSTOMERS' | 'EMPLOYEES' | 'INVENTORY' | 'TAX' | 'CASHFLOW' | 'AUDIT'>('PL');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Advanced Filters states
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');
  const [filterCustomerId, setFilterCustomerId] = useState<string>('all');
  const [filterSupplierName, setFilterSupplierName] = useState<string>('all');
  const [filterCategoryName, setFilterCategoryName] = useState<string>('all');
  const [filterProductId, setFilterProductId] = useState<string>('all');

  const isEmployee = activeUser?.role === UserRole.EMPLOYEE;

  // ----------------------------------------------------
  // DATE BOUNDS RESOLVER
  // ----------------------------------------------------
  const periodBounds = useMemo(() => {
    const start = new Date();
    const end = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (reportPeriod === 'Custom') {
      const customStart = customStartDate ? new Date(customStartDate) : new Date();
      customStart.setHours(0, 0, 0, 0);
      const customEnd = customEndDate ? new Date(customEndDate) : new Date();
      customEnd.setHours(23, 59, 59, 999);
      return { start: customStart, end: customEnd };
    }

    switch (reportPeriod) {
      case 'Daily':
        break;
      case 'Weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'Monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'Quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'Yearly':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return { start, end };
  }, [reportPeriod, customStartDate, customEndDate]);

  // Reset helper passed down to filter component
  const handleResetFilters = () => {
    setFilterBranchId('all');
    setFilterEmployeeId('all');
    setFilterCustomerId('all');
    setFilterSupplierName('all');
    setFilterCategoryName('all');
    setFilterProductId('all');
    setSearchTerm('');
  };

  // ----------------------------------------------------
  // MULTI-DIMENSIONAL DATA FILTERING ENGINE
  // ----------------------------------------------------
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // Date bounds
      const d = parseToDate(s.date);
      if (d < periodBounds.start || d > periodBounds.end) return false;

      // Branch Isolation
      if (filterBranchId !== 'all') {
        const saleBranchId = (s as any).branchId || (s as any).branch_id;
        if (saleBranchId && saleBranchId !== filterBranchId) return false;
      }

      // Employee Isolation
      if (filterEmployeeId !== 'all') {
        const cashierId = (s as any).cashierId || (s as any).cashier_id;
        if (cashierId && cashierId !== filterEmployeeId) return false;
        if (s.cashierName !== filterEmployeeId && (s as any).cashierEmail !== filterEmployeeId) return false;
      }

      // Customer Isolation
      if (filterCustomerId !== 'all') {
        if (s.customerId && s.customerId !== filterCustomerId) return false;
        if (s.customerName !== filterCustomerId) return false;
      }

      // Product/Category Filter inside SaleItems
      if (filterCategoryName !== 'all' || filterProductId !== 'all') {
        const matchesProductCriteria = s.items.some(item => {
          if (filterProductId !== 'all' && item.productId !== filterProductId) return false;
          if (filterCategoryName !== 'all') {
            const productInfo = products.find(p => p.id === item.productId);
            if (!productInfo || productInfo.category !== filterCategoryName) return false;
          }
          return true;
        });
        if (!matchesProductCriteria) return false;
      }

      return true;
    });
  }, [sales, periodBounds, filterBranchId, filterEmployeeId, filterCustomerId, filterCategoryName, filterProductId, products]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = parseToDate(e.date);
      if (d < periodBounds.start || d > periodBounds.end) return false;

      // Branch
      if (filterBranchId !== 'all') {
        const expBranch = (e as any).branchId || (e as any).branch_id || e.branch;
        if (expBranch && expBranch !== filterBranchId && expBranch !== branches.find(b => b.id === filterBranchId)?.name) return false;
      }

      // Employee
      if (filterEmployeeId !== 'all') {
        if (e.recordedBy !== filterEmployeeId && e.employeeResponsible !== filterEmployeeId) return false;
      }

      // Category
      if (filterCategoryName !== 'all') {
        if (e.category !== filterCategoryName) return false;
      }

      return true;
    });
  }, [expenses, periodBounds, filterBranchId, filterEmployeeId, filterCategoryName, branches]);

  const filteredProcurements = useMemo(() => {
    return procurements.filter(p => {
      const d = parseToDate(p.date);
      if (d < periodBounds.start || d > periodBounds.end) return false;

      // Supplier
      if (filterSupplierName !== 'all' && p.supplierName !== filterSupplierName) return false;

      // Product
      if (filterProductId !== 'all' && p.productId !== filterProductId) return false;

      return true;
    });
  }, [procurements, periodBounds, filterSupplierName, filterProductId]);

  const filteredAudits = useMemo(() => {
    return audits.filter(a => {
      const d = parseToDate(a.date);
      if (d < periodBounds.start || d > periodBounds.end) return false;

      // Employee
      if (filterEmployeeId !== 'all') {
        if (a.userName !== filterEmployeeId && (a as any).userId !== filterEmployeeId) return false;
      }

      return true;
    });
  }, [audits, periodBounds, filterEmployeeId]);

  // Extract static list options dynamically from real records
  const uniqueSuppliers = useMemo(() => {
    const list = new Set(procurements.map(p => p.supplierName));
    return Array.from(list).filter(Boolean);
  }, [procurements]);

  const uniqueCategories = useMemo(() => {
    const list = new Set(products.map(p => p.category));
    return Array.from(list).filter(Boolean);
  }, [products]);


  // ----------------------------------------------------
  // INDIVIDUAL REPORT CALCULATIONS
  // ----------------------------------------------------

  // 1. Profit & Loss Metrics
  const plData = useMemo(() => {
    const grossRevenue = filteredSales.reduce((acc, curr) => acc + curr.netAmount, 0);
    const totalDiscounts = filteredSales.reduce((acc, curr) => acc + (curr.discount || 0), 0);
    
    // Cost of Goods Sold (COGS)
    let totalCOGS = 0;
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const qty = item.quantity;
        let costPrice = item.costPriceAtSale;
        if (!costPrice || costPrice === 0) {
          const matchingProduct = products.find(p => p.id === item.productId);
          costPrice = matchingProduct ? matchingProduct.costPrice : item.priceAtSale * 0.7;
        }
        totalCOGS += costPrice * qty;
      });
    });

    const grossProfit = grossRevenue - totalCOGS;
    const totalOperatingExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
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
  }, [filteredSales, filteredExpenses, products]);

  // 2. Tax Liability calculations
  const taxData = useMemo(() => {
    const taxableSalesVolume = filteredSales.reduce((acc, curr) => acc + curr.netAmount, 0);
    // Standard VAT is 16% in Kenya (KSh)
    const vatCollected = filteredSales.reduce((acc, curr) => acc + (curr.tax || curr.netAmount * 0.16), 0);
    // Standard 2% Withholding tax estimate for business invoicing
    const withholdingTaxEstimate = taxableSalesVolume * 0.02;
    const totalTaxLiability = vatCollected + withholdingTaxEstimate;

    return {
      taxableSalesVolume,
      vatCollected,
      withholdingTaxEstimate,
      totalTaxLiability
    };
  }, [filteredSales]);

  // 3. Cash Flow Metrics
  const cashFlowData = useMemo(() => {
    const cashSalesInflow = filteredSales
      .filter(s => s.paymentMethod === 'Cash' || s.paymentMethod === 'Card')
      .reduce((acc, curr) => acc + curr.netAmount, 0);

    const mobileMoneyInflow = filteredSales
      .filter(s => s.paymentMethod === 'Mobile Money')
      .reduce((acc, curr) => acc + curr.netAmount, 0);

    // Debt recoveries
    const debtRecoveries = debts
      .filter(d => d.status === 'Paid' || d.status === 'Partially Paid')
      .reduce((acc, curr) => {
        const historySum = curr.paymentHistory?.reduce((sum, h) => sum + h.amount, 0) || 0;
        return acc + historySum;
      }, 0);

    const totalInflow = cashSalesInflow + mobileMoneyInflow + debtRecoveries;
    
    // Outflows: operational expenses + paid procurements
    const opexOutflow = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const procurementOutflow = filteredProcurements
      .filter(p => p.paymentStatus === 'Paid')
      .reduce((acc, curr) => acc + curr.materialCosts, 0);

    const totalOutflow = opexOutflow + procurementOutflow;
    const netCashPosition = totalInflow - totalOutflow;

    return {
      totalInflow,
      cashSalesInflow,
      mobileMoneyInflow,
      debtRecoveries,
      totalOutflow,
      procurementOutflow,
      netCashPosition
    };
  }, [filteredSales, debts, filteredExpenses, filteredProcurements]);

  // 4. Audit & system statistics
  const auditLogsSummary = useMemo(() => {
    const totalLogs = filteredAudits.length;
    const adminActionCount = filteredAudits.filter(a => a.role === UserRole.ADMIN).length;
    const criticalAdjustments = filteredAudits.filter(a => {
      const act = String(a?.action || '').toLowerCase();
      return act.includes('delete') || act.includes('reject') || act.includes('adjusted');
    }).length;
    const uniqueStaff = new Set(filteredAudits.map(a => a.userName));

    return {
      totalLogs,
      adminActionCount,
      criticalAdjustments,
      activeStaffUsersCount: uniqueStaff.size
    };
  }, [filteredAudits]);

  // ----------------------------------------------------
  // INTERACTIVE RECHARTS GRAPH RESOLVER (Driven by filtered arrays)
  // ----------------------------------------------------
  const chartData = useMemo(() => {
    // Generate daily/weekly points to fill trends
    const dataPoints: Record<string, { name: string; Revenue: number; Expenses: number; Profit: number; VAT: number; Withholding: number; Inflow: number; Outflow: number; Actions: number }> = {};

    // Base mock initializations
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach(day => {
      dataPoints[day] = { name: day, Revenue: 0, Expenses: 0, Profit: 0, VAT: 0, Withholding: 0, Inflow: 0, Outflow: 0, Actions: 0 };
    });

    filteredSales.forEach(sale => {
      const d = parseToDate(sale.date);
      const dayName = days[d.getDay()] || 'Sun';
      dataPoints[dayName].Revenue += sale.netAmount;
      dataPoints[dayName].VAT += (sale.tax || sale.netAmount * 0.16);
      dataPoints[dayName].Withholding += sale.netAmount * 0.02;
      dataPoints[dayName].Inflow += sale.netAmount;
    });

    filteredExpenses.forEach(exp => {
      const d = parseToDate(exp.date);
      const dayName = days[d.getDay()] || 'Sun';
      dataPoints[dayName].Expenses += exp.amount;
      dataPoints[dayName].Outflow += exp.amount;
    });

    filteredAudits.forEach(audit => {
      const d = parseToDate(audit.date);
      const dayName = days[d.getDay()] || 'Sun';
      dataPoints[dayName].Actions += 1;
    });

    // Compute net profit trend line
    return Object.values(dataPoints).map(pt => ({
      ...pt,
      Profit: pt.Revenue - pt.Expenses
    }));
  }, [filteredSales, filteredExpenses, filteredAudits]);

  // ----------------------------------------------------
  // DYNAMIC TABULAR LEDGER ROWS FOR CURRENT REPORT
  // ----------------------------------------------------
  const rawTableRows = useMemo(() => {
    switch (selectedReportType) {
      case 'PL':
        const salesRows = filteredSales.map(s => ({
          id: s.id,
          date: s.date,
          ref: s.invoiceNumber,
          type: 'Sales Credit',
          desc: `POS Checkout to ${s.customerName || 'Walk-in customer'}`,
          inflow: s.netAmount,
          outflow: 0
        }));
        const expenseRows = filteredExpenses.map(e => ({
          id: e.id,
          date: e.date,
          ref: e.receiptNumber || 'N/A',
          type: 'OPEX Claim Debit',
          desc: `${e.category} - ${e.description}`,
          inflow: 0,
          outflow: e.amount
        }));
        return [...salesRows, ...expenseRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      case 'EXPENSES':
        return filteredExpenses.map(e => ({
          id: e.id,
          date: e.date,
          ref: e.receiptNumber || 'N/A',
          category: e.category,
          vendor: e.vendorName || 'N/A',
          staff: e.employeeResponsible || e.recordedBy || 'N/A',
          branch: e.branch || 'Main HQ',
          amount: e.amount,
          status: e.status || 'Approved'
        }));

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
        return [...cfIn, ...cfOut].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
  }, [selectedReportType, filteredSales, filteredExpenses, filteredAudits]);

  // Handle Search & sorting
  const sortedAndFilteredRows = useMemo(() => {
    let rows = [...rawTableRows];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter((row: any) => {
        return Object.values(row).some((val: any) => 
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        );
      });
    }

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
  // CORPORATE BRIGADE FILE EXPORTS
  // ----------------------------------------------------
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(22);
    doc.setTextColor(6, 182, 212); // cyan-500
    
    // Header with registered Business Name and metadata
    doc.text(`${activeBusiness?.name || 'Apex Ledger Enterprise'}`, 15, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Corporate Intelligence & Analytics Statements Ledger`, 15, 27);
    
    // Metadata block
    doc.setFillColor(15, 23, 42); 
    doc.rect(14, 32, 182, 22, 'F');
    doc.setFontSize(9);
    doc.setTextColor(241, 245, 249);
    
    const branchName = activeBranchId === 'all' 
      ? 'All Enterprise Branches' 
      : (branches.find(b => b.id === activeBranchId)?.name || 'Main HQ');

    doc.text(`STATEMENT TYPE: ${selectedReportType.toUpperCase()} REVENUE STATEMENT`, 18, 38);
    doc.text(`REPORTING DATE: ${reportPeriod} (${periodBounds.start.toLocaleDateString()} - ${periodBounds.end.toLocaleDateString()})`, 18, 44);
    doc.text(`BRANCH WORKSPACE: ${branchName}`, 18, 50);

    let pdfHeaders: string[] = [];
    let pdfRows: any[][] = [];

    switch (selectedReportType) {
      case 'PL':
        pdfHeaders = ['Date', 'Ref Number', 'Type', 'Description', 'Inflow (KSh)', 'Outflow (KSh)'];
        pdfRows = sortedAndFilteredRows.map((r: any) => [
          r.date, r.ref, r.type, r.desc, formatKSh(r.inflow), formatKSh(r.outflow)
        ]);
        break;
      case 'EXPENSES':
        pdfHeaders = ['Date', 'Category', 'Vendor', 'Responsible Staff', 'Branch', 'Amount (KSh)'];
        pdfRows = sortedAndFilteredRows.map((r: any) => [
          r.date, r.category, r.vendor, r.staff, r.branch, formatKSh(r.amount)
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
      case 'AUDIT':
        pdfHeaders = ['Timestamp', 'User', 'Role', 'System Action Event', 'Value Shift'];
        pdfRows = sortedAndFilteredRows.map((r: any) => [
          `${r.date} ${r.time}`, r.user, r.role.split(' ')[0], r.action, `${r.oldVal} -> ${r.newVal}`
        ]);
        break;
      default:
        pdfHeaders = ['Date', 'Report Type', 'Description'];
        pdfRows = [['Statement', selectedReportType, 'Check secondary subcomponents.']];
    }

    // @ts-ignore
    autoTable(doc, {
      startY: 60,
      head: [pdfHeaders],
      body: pdfRows,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212] },
      styles: { fontSize: 8, font: 'helvetica' }
    });

    doc.save(`Enterprise_Report_${selectedReportType}_${reportPeriod}.pdf`);
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let keys: string[] = [];

    switch (selectedReportType) {
      case 'PL':
        headers = ['Date', 'Ref', 'Type', 'Description', 'Inflow', 'Outflow'];
        keys = ['date', 'ref', 'type', 'desc', 'inflow', 'outflow'];
        break;
      case 'EXPENSES':
        headers = ['Date', 'Category', 'Vendor', 'Staff', 'Branch', 'Amount', 'Status'];
        keys = ['date', 'category', 'vendor', 'staff', 'branch', 'amount', 'status'];
        break;
      case 'TAX':
        headers = ['Date', 'Invoice', 'Customer', 'PaymentMethod', 'Net Sales', 'VAT', 'Withholding'];
        keys = ['date', 'invoice', 'customer', 'payment', 'total', 'tax', 'withholding'];
        break;
      case 'CASHFLOW':
        headers = ['Date', 'Type', 'Method', 'Reference', 'Cash Inflow', 'Cash Outflow'];
        keys = ['date', 'type', 'method', 'ref', 'in', 'out'];
        break;
      case 'AUDIT':
        headers = ['Date', 'Time', 'User Email', 'Role', 'Action Executed', 'Old Balance', 'New Balance'];
        keys = ['date', 'time', 'user', 'role', 'action', 'oldVal', 'newVal'];
        break;
      default:
        headers = ['Column 1'];
        keys = ['id'];
    }

    const csvContent = [
      `"Registered Business:","${activeBusiness?.name || 'Apex Enterprise'}"`,
      `"Statement Type:","${selectedReportType.toUpperCase()}"`,
      `"Date Range:","${reportPeriod} (${periodBounds.start.toLocaleDateString()} - ${periodBounds.end.toLocaleDateString()})"`,
      headers.join(','),
      ...sortedAndFilteredRows.map((r: any) => 
        keys.map(key => {
          let val = r[key];
          if (typeof val === 'string') {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Enterprise_Report_${selectedReportType}_${reportPeriod}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header ribbon console panel (Visible on screen, hidden during print) */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:flex-row items-center justify-between gap-6 border border-brand-border print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 glow-cyan">
            <Scale className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-100 font-sans tracking-tight">Reports & Business Intelligence Console</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">Generate real-time compliance statements, regional performances, and workforce indexes.</p>
          </div>
        </div>

        {/* Live Details Block */}
        <div className="flex flex-wrap items-center gap-3 bg-gray-950/60 border border-brand-border p-3.5 rounded-xl font-mono text-[10px]">
          <div className="flex items-center gap-1.5 border-r border-brand-border/60 pr-3.5">
            <Building className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-gray-400">Biz:</span>
            <span className="text-gray-100 font-bold capitalize">{activeBusiness?.name || 'Corporate'}</span>
          </div>
          <div className="flex items-center gap-1.5 border-r border-brand-border/60 pr-3.5 px-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-gray-400">HQ/Branch:</span>
            <span className="text-gray-100 font-bold">
              {activeBranchId === 'all' ? 'All Branches' : (branches.find(b => b.id === activeBranchId)?.name || 'HQ')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-gray-100 font-bold">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* 2. Advanced Multi-dimensional Filter Bar (Hidden during print) */}
      <div className="print:hidden">
        <ReportFilters
          reportPeriod={reportPeriod}
          setReportPeriod={setReportPeriod}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
          
          filterBranchId={filterBranchId}
          setFilterBranchId={setFilterBranchId}
          filterEmployeeId={filterEmployeeId}
          setFilterEmployeeId={setFilterEmployeeId}
          filterCustomerId={filterCustomerId}
          setFilterCustomerId={setFilterCustomerId}
          filterSupplierName={filterSupplierName}
          setFilterSupplierName={setFilterSupplierName}
          filterCategoryName={filterCategoryName}
          setFilterCategoryName={setFilterCategoryName}
          filterProductId={filterProductId}
          setFilterProductId={setFilterProductId}

          branches={branches}
          employees={profiles}
          customers={customers}
          suppliers={uniqueSuppliers}
          categories={uniqueCategories}
          products={products}
          onReset={handleResetFilters}
        />
      </div>

      {/* 3. Ten Report Tab Selection Cards Grid (Hidden during print) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 print:hidden">
        {[
          { type: 'PL', title: 'Profit & Loss', desc: 'Direct Net Margins Sheet', icon: TrendingUp, badge: formatKSh(plData.netProfit), color: plData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400' },
          { type: 'BRANCH', title: 'Branch Compare', desc: 'HQ vs Regional Performance', icon: Building, badge: `${branches.length} Branches`, color: 'text-cyan-400' },
          { type: 'EXPENSES', title: 'OPEX Analysis', desc: 'Operating Claims Auditing', icon: Wallet, badge: formatKSh(plData.totalOperatingExpenses), color: 'text-rose-400' },
          { type: 'PRODUCTS', title: 'Product Velocity', desc: 'Top & Slow Inventory Lines', icon: Tag, badge: `${products.length} Products`, color: 'text-sky-400' },
          { type: 'CUSTOMERS', title: 'Loyalty Metrics', desc: 'Spenders & Balances Ledger', icon: Users, badge: `${customers.length} Buyers`, color: 'text-emerald-400' },
          { type: 'EMPLOYEES', title: 'Workforce Score', desc: 'Clock-in Workhours & Sales', icon: Award, badge: `${profiles.length} Staff`, color: 'text-amber-400' },
          { type: 'INVENTORY', title: 'Stock Movement', desc: 'Audit Adjustments Ledger', icon: Layers, badge: 'Stock Ledger', color: 'text-cyan-400' },
          { type: 'TAX', title: 'Tax & VAT', desc: 'Direct Indirect Accrued Tax', icon: Scale, badge: formatKSh(taxData.totalTaxLiability), color: 'text-rose-400/85' },
          { type: 'CASHFLOW', title: 'Cash Flow', desc: 'Liquidity Drawer Statement', icon: DollarSign, badge: formatKSh(cashFlowData.netCashPosition), color: 'text-cyan-400' },
          { type: 'AUDIT', title: 'System Auditing', desc: 'Access Event Security Logs', icon: ShieldCheck, badge: `${auditLogsSummary.totalLogs} Logs`, color: 'text-sky-400' }
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
              className={`glass-panel p-4 rounded-xl border text-left flex flex-col justify-between h-[125px] transition duration-200 cursor-pointer ${
                isActive 
                  ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-950/40 translate-y-[-2px]' 
                  : 'border-brand-border hover:border-gray-700 hover:bg-gray-900/20'
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-cyan-500/20' : 'bg-gray-900/60'} border border-brand-border`}>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                </div>
                <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded ${isActive ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gray-950 text-gray-500'}`}>
                  {rep.type}
                </span>
              </div>
              
              <div className="mt-2">
                <h4 className="text-[11px] font-bold text-gray-200 font-sans tracking-tight line-clamp-1">{rep.title}</h4>
                <div className={`text-[10px] font-mono font-semibold mt-1 ${rep.color}`}>
                  {rep.badge}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 4. Active Report Presentation Container */}
      <div className="glass-panel rounded-2xl border border-brand-border overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Hidden Business Header for Browser Printing */}
        <div className="hidden print:flex flex-col border-b-2 border-slate-900 pb-4 mb-6 text-left">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-950 uppercase tracking-tight">{activeBusiness?.name || 'Apex Ledger Corporate'}</h1>
            <span className="text-xs font-mono border border-slate-900 px-2 py-1 uppercase font-bold">Official Business Audit</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-3 text-slate-700">
            <div>Report Module: <span className="font-bold text-slate-950">{selectedReportType.toUpperCase()} Statement</span></div>
            <div>Date Range: <span className="font-bold text-slate-950">{reportPeriod} ({periodBounds.start.toLocaleDateString()} - {periodBounds.end.toLocaleDateString()})</span></div>
            <div>Branch HQ: <span className="font-bold text-slate-950">{activeBranchId === 'all' ? 'All active locations' : (branches.find(b => b.id === activeBranchId)?.name || 'Main HQ')}</span></div>
            <div>Printed At: <span className="font-bold text-slate-950">{new Date().toLocaleString()}</span></div>
          </div>
        </div>

        {/* Tab header / title */}
        <div className="p-6 border-b border-brand-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-950/40 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <h3 className="text-sm font-bold text-gray-200 font-mono tracking-wider uppercase">
                {selectedReportType === 'PL' && 'PROFIT & LOSS (P&L) STATEMENT'}
                {selectedReportType === 'BRANCH' && 'BRANCH COMPARATIVE ANALYTICS'}
                {selectedReportType === 'EXPENSES' && 'OPERATIONAL EXPENSES DISTRIBUTION'}
                {selectedReportType === 'PRODUCTS' && 'PRODUCT VELOCITY & SALES RANKINGS'}
                {selectedReportType === 'CUSTOMERS' && 'CLIENT DIRECTORY & LOYALTY PROFILE'}
                {selectedReportType === 'EMPLOYEES' && 'WORKFORCE HOURS & SALES PERFORMANCE'}
                {selectedReportType === 'INVENTORY' && 'INVENTORY MOVEMENTS & CAPITAL VALUES'}
                {selectedReportType === 'TAX' && 'TAX COMPLIANCE & ACCRUED VAT STATEMENT'}
                {selectedReportType === 'CASHFLOW' && 'CASH FLOW POSITION & LIQUIDITY STATEMENT'}
                {selectedReportType === 'AUDIT' && 'SYSTEM AUDITING COMPLIANCE SECURITY TRACE'}
              </h3>
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-1.5">
              Accurate corporate statement isolated for the active tenant workspace.
            </p>
          </div>

          {/* Action buttons (Print and Export) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 hover:text-cyan-400 rounded-xl transition font-mono text-xs flex items-center gap-2 cursor-pointer"
              title="Print Report with Official Headers"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Ledger</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 hover:text-cyan-400 rounded-xl transition font-mono text-xs flex items-center gap-2 cursor-pointer"
              title="Export Statement as PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF Export</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 hover:text-cyan-400 rounded-xl transition font-mono text-xs flex items-center gap-2 cursor-pointer"
              title="Export Ledger as CSV Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel/CSV</span>
            </button>
          </div>
        </div>

        {/* 5. Dynamic Report Renders */}
        {selectedReportType === 'PL' && (
          <>
            {/* P&L KPI Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-brand-border divide-y sm:divide-y-0 sm:divide-x divide-brand-border/60 bg-gray-950/25">
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">GROSS SALES VOLUME</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{formatKSh(plData.grossRevenue)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Discounts given: {formatKSh(plData.totalDiscounts)}</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">COST OF GOODS SOLD (COGS)</span>
                <span className="text-xl font-bold text-gray-300 mt-1 block">{formatKSh(plData.totalCOGS)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Based on exact inventory buying costs</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">OPERATING EXPENSES (OPEX)</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">{formatKSh(plData.totalOperatingExpenses)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Operational expense claims</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">NET CORPORATE MARGINS</span>
                <span className={`text-xl font-bold mt-1 block ${plData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatKSh(plData.netProfit)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Net Margin: {plData.netProfitMargin.toFixed(1)}%</span>
              </div>
            </div>

            {/* P&L Comparative Area Chart */}
            <div className="p-6 border-b border-brand-border print:hidden">
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-200 font-sans">Business Revenue Growth Trends</h4>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">Chronological revenue streams matched with opex claims over the current dates.</p>
              </div>

              <div className="h-[280px] w-full bg-gray-950/20 p-2 rounded-xl border border-brand-border/40">
                <ResponsiveContainer width="100%" height="100%">
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
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} className="font-mono" />
                    <YAxis stroke="#6b7280" fontSize={10} className="font-mono" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                    <Area type="monotone" name="Inflow Revenue" dataKey="Revenue" stroke="#06b6d4" strokeWidth={2} fill="url(#colorRev)" />
                    <Area type="monotone" name="OPEX Outflow" dataKey="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#colorExp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {selectedReportType === 'BRANCH' && (
          <BranchComparisonSection 
            sales={filteredSales} 
            expenses={filteredExpenses} 
            branches={branches} 
            formatKSh={formatKSh} 
          />
        )}

        {selectedReportType === 'PRODUCTS' && (
          <ProductPerformanceSection 
            sales={filteredSales} 
            products={products} 
            formatKSh={formatKSh} 
          />
        )}

        {selectedReportType === 'CUSTOMERS' && (
          <CustomerPerformanceSection 
            sales={filteredSales} 
            customers={customers} 
            debts={debts} 
            formatKSh={formatKSh} 
          />
        )}

        {selectedReportType === 'EMPLOYEES' && (
          <EmployeePerformanceSection 
            sales={filteredSales} 
            employees={profiles} 
            timelogs={timelogs} 
            tasks={tasks} 
            formatKSh={formatKSh} 
          />
        )}

        {selectedReportType === 'INVENTORY' && (
          <InventoryPerformanceSection 
            products={products} 
            formatKSh={formatKSh} 
          />
        )}

        {selectedReportType === 'EXPENSES' && (
          <>
            {/* Expense KPI block row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-brand-border divide-y sm:divide-y-0 sm:divide-x divide-brand-border/60 bg-gray-950/25">
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">AGGREGATE EXPENSES SUM</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">{formatKSh(plData.totalOperatingExpenses)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Total operating capital spent</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">MAX SINGLE CLAIM AMOUNT</span>
                <span className="text-xl font-bold text-gray-300 mt-1 block">
                  {formatKSh(Math.max(...filteredExpenses.map(e => e.amount), 0))}
                </span>
                <span className="text-[10px] text-gray-400 block mt-1">Highest operating expense receipt</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL EXPENSE CLAIMS</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{filteredExpenses.length} Claims</span>
                <span className="text-[10px] text-gray-400 block mt-1">Receipt files registered in workspace</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">PENDING REVIEW CLAIMS</span>
                <span className="text-xl font-bold text-amber-500 mt-1 block">
                  {filteredExpenses.filter(e => e.status && e.status !== 'Approved').length} Items
                </span>
                <span className="text-[10px] text-gray-400 block mt-1">Requires manager workspace approval</span>
              </div>
            </div>

            {/* Expense Pie Chart */}
            <div className="p-6 border-b border-brand-border print:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-200 font-sans font-bold">Operating Expense Category Split</h4>
                <p className="text-[10px] text-gray-500 font-mono">Visual representation of corporate funds allocated to different categories.</p>
              </div>

              <div className="h-[220px] w-full flex items-center justify-center">
                {filteredExpenses.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(
                          filteredExpenses.reduce((acc, curr) => {
                            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([name, value]) => ({ name, value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {filteredExpenses.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#f43f5e', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500 font-mono text-xs">No expense logs registered.</div>
                )}
              </div>
            </div>
          </>
        )}

        {selectedReportType === 'TAX' && (
          <>
            {/* Tax KPI grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-brand-border divide-y sm:divide-y-0 sm:divide-x divide-brand-border/60 bg-gray-950/25">
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TAXABLE SALES VOLUME</span>
                <span className="text-xl font-bold text-gray-200 mt-1 block">{formatKSh(taxData.taxableSalesVolume)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">VAT calculated base sales</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">VAT COLLECTED (16%)</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{formatKSh(taxData.vatCollected)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Indirect tax liabilities collected</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">WITHHOLDING TAX (2%)</span>
                <span className="text-xl font-bold text-amber-400 mt-1 block">{formatKSh(taxData.withholdingTaxEstimate)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Accrued audit withholdings</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL COMPLIANCE TAXES</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">{formatKSh(taxData.totalTaxLiability)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Accrued government duty exposure</span>
              </div>
            </div>

            {/* Tax stacked bar chart */}
            <div className="p-6 border-b border-brand-border print:hidden">
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-200 font-sans">VAT Compliance and Withholding Taxes</h4>
                <p className="text-[10px] text-gray-500 font-mono">VAT (16%) & Withholding (2%) collected totals from invoice files.</p>
              </div>

              <div className="h-[250px] w-full bg-gray-950/20 p-2 rounded-xl border border-brand-border/40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} className="font-mono" />
                    <YAxis stroke="#6b7280" fontSize={10} className="font-mono" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                    <Bar name="VAT Accrued Collected" dataKey="VAT" fill="#06b6d4" stackId="a" radius={[4, 4, 0, 0]} />
                    <Bar name="Withholding Tax Estimate" dataKey="Withholding" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {selectedReportType === 'CASHFLOW' && (
          <>
            {/* Cashflow KPI grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-brand-border divide-y sm:divide-y-0 sm:divide-x divide-brand-border/60 bg-gray-950/25">
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL CASH INFLOWS</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{formatKSh(cashFlowData.totalInflow)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Sales checkouts + Debt payments</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL OPERATING OUTFLOWS</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">{formatKSh(cashFlowData.totalOutflow)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Opex + Paid suppliers</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">CASH VS MOBILE SALES</span>
                <span className="text-xl font-bold text-gray-200 mt-1 block">{formatKSh(cashFlowData.cashSalesInflow)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Mobile Money (M-Pesa): {formatKSh(cashFlowData.mobileMoneyInflow)}</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">NET LIQUIDITY SURPLUS</span>
                <span className={`text-xl font-bold mt-1 block ${cashFlowData.netCashPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatKSh(cashFlowData.netCashPosition)}</span>
                <span className="text-[10px] text-gray-400 block mt-1">Operating surplus cash status</span>
              </div>
            </div>

            {/* Cashflow comparative visual */}
            <div className="p-6 border-b border-brand-border print:hidden">
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-200 font-sans font-bold">Liquid Funds Cashflow Velocity</h4>
                <p className="text-[10px] text-gray-500 font-mono">Cash drawer inflows versus operating outflows over current calendar dates.</p>
              </div>

              <div className="h-[250px] w-full bg-gray-950/20 p-2 rounded-xl border border-brand-border/40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} className="font-mono" />
                    <YAxis stroke="#6b7280" fontSize={10} className="font-mono" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                    <Bar name="Total Drawer Inflow" dataKey="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name="Total Outflows" dataKey="Outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {selectedReportType === 'AUDIT' && (
          <>
            {/* Audit KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-brand-border divide-y sm:divide-y-0 sm:divide-x divide-brand-border/60 bg-gray-950/25">
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL COMPLIANCE LOGS</span>
                <span className="text-xl font-bold text-sky-400 mt-1 block">{auditLogsSummary.totalLogs} Logs</span>
                <span className="text-[10px] text-gray-400 block mt-1">Actions captured in active range</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">ADMIN LEVEL PRIVILEGES</span>
                <span className="text-xl font-bold text-cyan-400 mt-1 block">{auditLogsSummary.adminActionCount} Actions</span>
                <span className="text-[10px] text-gray-400 block mt-1">High-privileged changes logged</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">CRITICAL REVISIONS</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">{auditLogsSummary.criticalAdjustments} Revisions</span>
                <span className="text-[10px] text-gray-400 block mt-1">Deletions or stock audit overrides</span>
              </div>
              <div className="p-5 font-mono">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">STAFF USERS LOGGED</span>
                <span className="text-xl font-bold text-gray-200 mt-1 block">{auditLogsSummary.activeStaffUsersCount} Users</span>
                <span className="text-[10px] text-gray-400 block mt-1">Unique cashier session logins</span>
              </div>
            </div>

            {/* Audit frequency line chart */}
            <div className="p-6 border-b border-brand-border print:hidden">
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-200 font-sans font-bold">Chronological Activity Trace Frequency</h4>
                <p className="text-[10px] text-gray-500 font-mono">Audit log events frequency across business calendar dates.</p>
              </div>

              <div className="h-[250px] w-full bg-gray-950/20 p-2 rounded-xl border border-brand-border/40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} className="font-mono" />
                    <YAxis stroke="#6b7280" fontSize={10} className="font-mono" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                    <Line type="monotone" name="Logged System Events" dataKey="Actions" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* 6. Dynamic Table Search & Lists (For P&L, Tax, Cashflow, Expenses and Audit) */}
        {['PL', 'TAX', 'CASHFLOW', 'EXPENSES', 'AUDIT'].includes(selectedReportType) && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5 print:hidden">
              <div className="relative w-full sm:w-80">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-500" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search matching statement entries..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-brand-border rounded-xl text-xs text-gray-200 placeholder:text-gray-600 outline-none focus:border-cyan-500/40 transition"
                />
              </div>
              <span className="text-[10px] text-gray-500 font-mono">
                Displaying {sortedAndFilteredRows.length} of {rawTableRows.length} matching rows
              </span>
            </div>

            <div className="overflow-x-auto border border-brand-border rounded-2xl print:border-none print:shadow-none">
              <table className="w-full text-left border-collapse font-mono text-[11px] text-gray-300 print:text-black">
                <thead>
                  <tr className="bg-gray-950 text-gray-400 border-b border-brand-border text-[9px] uppercase tracking-wider print:bg-slate-100 print:text-slate-900 print:border-slate-300">
                    {selectedReportType === 'PL' && (
                      <>
                        <th className="p-4 cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('date')}>Date</th>
                        <th className="p-4 cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('ref')}>Reference</th>
                        <th className="p-4 cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('type')}>Type</th>
                        <th className="p-4">Description</th>
                        <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('inflow')}>Inflow</th>
                        <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('outflow')}>Outflow</th>
                      </>
                    )}
                    {selectedReportType === 'EXPENSES' && (
                      <>
                        <th className="p-4 cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('date')}>Date</th>
                        <th className="p-4 cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('category')}>Category</th>
                        <th className="p-4">Vendor</th>
                        <th className="p-4">Responsible Staff</th>
                        <th className="p-4">Workspace Branch</th>
                        <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('amount')}>Amount</th>
                        <th className="p-4 text-right">Approval Status</th>
                      </>
                    )}
                    {selectedReportType === 'TAX' && (
                      <>
                        <th className="p-4 cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('date')}>Date</th>
                        <th className="p-4 cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('invoice')}>Invoice</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Method</th>
                        <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('total')}>Sales Volume</th>
                        <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('tax')}>VAT (16%)</th>
                        <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('withholding')}>Est. WHT (2%)</th>
                      </>
                    )}
                    {selectedReportType === 'CASHFLOW' && (
                      <>
                        <th className="p-4 cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('date')}>Date</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Method</th>
                        <th className="p-4">Ref Number</th>
                        <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('in')}>Cash In</th>
                        <th className="p-4 text-right cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('out')}>Cash Out</th>
                      </>
                    )}
                    {selectedReportType === 'AUDIT' && (
                      <>
                        <th className="p-4 cursor-pointer hover:bg-gray-900/60 print:hover:bg-transparent" onClick={() => handleSort('date')}>Timestamp</th>
                        <th className="p-4">User</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Event Details</th>
                        <th className="p-4">Old State</th>
                        <th className="p-4">New State</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60 print:divide-slate-300">
                  {sortedAndFilteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-gray-500 text-center py-10 print:text-slate-600">No matching record entries found in this ledger.</td>
                    </tr>
                  ) : (
                    sortedAndFilteredRows.map((row: any) => (
                      <tr key={row.id} className="hover:bg-gray-900/35 transition text-gray-300 print:text-slate-800 print:hover:bg-transparent">
                        
                        {selectedReportType === 'PL' && (
                          <>
                            <td className="p-4 whitespace-nowrap">{row.date}</td>
                            <td className="p-4 font-bold text-gray-200 print:text-black">{row.ref}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.type.includes('Sales') 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 print:bg-emerald-100 print:text-emerald-800 print:border-emerald-300' 
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/25 print:bg-rose-100 print:text-rose-800 print:border-rose-300'
                              }`}>
                                {row.type}
                              </span>
                            </td>
                            <td className="p-4 text-gray-400 print:text-slate-700 truncate max-w-[240px] font-sans">{row.desc}</td>
                            <td className="p-4 text-right font-bold text-emerald-400 print:text-emerald-700">{row.inflow > 0 ? formatKSh(row.inflow) : '-'}</td>
                            <td className="p-4 text-right font-bold text-rose-400 print:text-rose-700">{row.outflow > 0 ? formatKSh(row.outflow) : '-'}</td>
                          </>
                        )}

                        {selectedReportType === 'EXPENSES' && (
                          <>
                            <td className="p-4 whitespace-nowrap">{row.date}</td>
                            <td className="p-4 font-bold text-gray-200 print:text-black font-sans">{row.category}</td>
                            <td className="p-4 font-sans text-gray-400 print:text-slate-700">{row.vendor}</td>
                            <td className="p-4 font-sans text-gray-400 print:text-slate-700">{row.staff}</td>
                            <td className="p-4 text-gray-400 print:text-slate-700">{row.branch}</td>
                            <td className="p-4 text-right font-bold text-rose-400 print:text-rose-700">{formatKSh(row.amount)}</td>
                            <td className="p-4 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 print:bg-emerald-100 print:text-emerald-800' : 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                          </>
                        )}

                        {selectedReportType === 'TAX' && (
                          <>
                            <td className="p-4 whitespace-nowrap">{row.date}</td>
                            <td className="p-4 font-bold text-gray-200 print:text-black">{row.invoice}</td>
                            <td className="p-4 font-sans font-semibold text-gray-400 print:text-slate-700">{row.customer}</td>
                            <td className="p-4">{row.payment}</td>
                            <td className="p-4 text-right font-bold text-gray-200 print:text-black">{formatKSh(row.total)}</td>
                            <td className="p-4 text-right font-bold text-cyan-400 print:text-cyan-700">{formatKSh(row.tax)}</td>
                            <td className="p-4 text-right font-bold text-amber-400 print:text-amber-700">{formatKSh(row.withholding)}</td>
                          </>
                        )}

                        {selectedReportType === 'CASHFLOW' && (
                          <>
                            <td className="p-4 whitespace-nowrap">{row.date}</td>
                            <td className="p-4 text-gray-400 print:text-slate-700 font-sans font-semibold">{row.type}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded bg-gray-950 border border-brand-border text-gray-400 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                                {row.method}
                              </span>
                            </td>
                            <td className="p-4 text-gray-200 print:text-black font-bold">{row.ref}</td>
                            <td className="p-4 text-right font-bold text-emerald-400 print:text-emerald-700">{row.in > 0 ? formatKSh(row.in) : '-'}</td>
                            <td className="p-4 text-right font-bold text-rose-400 print:text-rose-700">{row.out > 0 ? formatKSh(row.out) : '-'}</td>
                          </>
                        )}

                        {selectedReportType === 'AUDIT' && (
                          <>
                            <td className="p-4 whitespace-nowrap text-gray-400 print:text-slate-700">{row.date} {row.time}</td>
                            <td className="p-4 text-cyan-400 print:text-cyan-800 text-xs font-semibold">{row.user}</td>
                            <td className="p-4 text-gray-400 print:text-slate-700">{row.role.split(' ')[0]}</td>
                            <td className="p-4 text-gray-200 print:text-black max-w-[280px] truncate font-sans">{row.action}</td>
                            <td className="p-4 text-gray-500 font-sans italic text-[10px] max-w-[120px] truncate">{row.oldVal}</td>
                            <td className="p-4 text-emerald-400 print:text-emerald-700 max-w-[120px] truncate">{row.newVal}</td>
                          </>
                        )}

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
