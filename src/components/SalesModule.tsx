import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Customer, Sale, Expense, UserRole } from '../types';
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, 
  User, CreditCard, Check, Ticket, Receipt, X, Printer,
  TrendingUp, TrendingDown, Calendar, DollarSign, Filter, 
  ArrowUpRight, ArrowDownRight, Edit3, ClipboardList, Users, 
  FileText, Layers, RefreshCw, ChevronRight, Activity, Percent
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';

export const SalesModule: React.FC = () => {
  const { 
    products, 
    customers, 
    sales,
    expenses,
    addCustomer, 
    recordSale,
    addExpense,
    updateSale,
    deleteSale,
    updateExpense,
    deleteExpense,
    activeUser,
    activeBusiness,
    branches
  } = useApp();

  // Primary navigation tabs: 'dashboard' vs 'pos'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos'>('dashboard');

  // ==========================================
  // STATE DEFINITIONS - POS TERMINAL TAB
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [basket, setBasket] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerNameInput, setCustomerNameInput] = useState('Walk-in Customer');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Mobile Money' | 'Credit'>('Cash');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null);
  
  // Custom print receipt states
  const [receiptTemplate, setReceiptTemplate] = useState<'pos' | 'a4'>('a4');
  const [kraPin, setKraPin] = useState('P051234567X');
  const [vatNo, setVatNo] = useState('01234567A');
  const [includeTerms, setIncludeTerms] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [customGreeting, setCustomGreeting] = useState('Thank you for shopping with us! Welcome back.');
  const [showLogo, setShowLogo] = useState(true);

  // New customer creation state inside POS
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Extract POS categories
  const posCategories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  // POS filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.barcode && p.barcode.includes(searchTerm));
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Subtotals and basket totals
  const subtotal = basket.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  const tax = Math.round(subtotal * 0.16); // 16% standard VAT
  const total = subtotal - discount + tax;

  // Basket Handlers
  const addToBasket = (product: Product) => {
    if (product.quantity <= 0) return;
    const existing = basket.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.quantity) return; // Stock limit
      setBasket(basket.map(item => 
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setBasket([...basket, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const item = basket.find(i => i.product.id === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setBasket(basket.filter(i => i.product.id !== productId));
    } else {
      const prod = products.find(p => p.id === productId);
      if (prod && newQty > prod.quantity) return;
      setBasket(basket.map(i => 
        i.product.id === productId ? { ...i, quantity: newQty } : i
      ));
    }
  };

  const removeFromBasket = (productId: string) => {
    setBasket(basket.filter(i => i.product.id !== productId));
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName) return;
    addCustomer({
      name: newCustName,
      phone: newCustPhone || 'N/A',
      email: newCustEmail || 'N/A',
      address: newCustAddress || 'N/A'
    });
    setCustomerNameInput(newCustName);
    setShowAddCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustAddress('');
  };

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCustomerId(val);
    if (val === '') {
      setCustomerNameInput('Walk-in Customer');
    } else {
      const cust = customers.find(c => c.id === val);
      if (cust) {
        setCustomerNameInput(cust.name);
      }
    }
  };

  const handleCheckout = () => {
    if (basket.length === 0) return;
    if (paymentMethod === 'Credit' && !selectedCustomerId) {
      alert('A registered customer must be selected for Credit (debt) transactions.');
      return;
    }
    try {
      const items = basket.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }));
      const res = recordSale({
        customerName: customerNameInput,
        customerId: selectedCustomerId || undefined,
        items,
        discount,
        paymentMethod
      });
      if (res) {
        setLastCompletedSale(res);
        setShowReceipt(true);
        setBasket([]);
        setDiscount(0);
        setSelectedCustomerId('');
        setCustomerNameInput('Walk-in Customer');
        setPaymentMethod('Cash');
      }
    } catch (e: any) {
      alert(e.message || 'Error executing checkout');
    }
  };


  // ==========================================
  // STATE DEFINITIONS - SALES DASHBOARD TAB
  // ==========================================
  const [chartInterval, setChartInterval] = useState<'today' | '7days' | '30days' | 'monthly' | 'quarterly' | 'yearly' | 'custom'>('7days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Dashboard filters
  const [dashSearchQuery, setDashSearchQuery] = useState('');
  const [dashCategoryFilter, setDashCategoryFilter] = useState('All');
  const [dashEmployeeFilter, setDashEmployeeFilter] = useState('All');
  const [dashPaymentFilter, setDashPaymentFilter] = useState('All');
  const [dashTypeFilter, setDashTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [dashDateFilter, setDashDateFilter] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [dashStartDate, setDashStartDate] = useState('');
  const [dashEndDate, setDashEndDate] = useState('');

  // Financial Entry Modal State
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryType, setEntryType] = useState<'sale' | 'expense'>('sale');
  
  // Financial entry form values
  const [manualAmount, setManualAmount] = useState('');
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerId, setManualCustomerId] = useState('');
  const [manualProductId, setManualProductId] = useState('');
  const [manualProductQty, setManualProductQty] = useState('1');
  const [manualDescription, setManualDescription] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'Cash' | 'Card' | 'Mobile Money' | 'Credit'>('Cash');
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit sale modal
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editSaleCust, setEditSaleCust] = useState('');
  const [editSalePay, setEditSalePay] = useState<'Cash' | 'Card' | 'Mobile Money' | 'Credit'>('Cash');

  // Edit expense modal
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editExpenseCategory, setEditExpenseCategory] = useState('');
  const [editExpenseAmount, setEditExpenseAmount] = useState('');
  const [editExpenseDesc, setEditExpenseDesc] = useState('');

  // Quick Client onboarding modal inside CRM
  const [showOnboardClientModal, setShowOnboardClientModal] = useState(false);
  const [onboardClientName, setOnboardClientName] = useState('');
  const [onboardClientPhone, setOnboardClientPhone] = useState('');
  const [onboardClientEmail, setOnboardClientEmail] = useState('');
  const [onboardClientCompany, setOnboardClientCompany] = useState('');

  // ==========================================
  // DYNAMIC COMPUTATIONS & ANALYTICS
  // ==========================================
  
  // Scoped lists of employees for filtering
  const distinctEmployees = useMemo(() => {
    const list = new Set<string>();
    sales.forEach(s => s.cashierName && list.add(s.cashierName));
    expenses.forEach(e => e.recordedBy && list.add(e.recordedBy));
    return Array.from(list);
  }, [sales, expenses]);

  // Distinct categories for product and expense filters
  const distinctCategories = useMemo(() => {
    const prodCats = Array.from(new Set(products.map(p => p.category)));
    const expCats = ['Utilities', 'Marketing', 'Payroll', 'Supplies', 'Rent', 'Transport', 'Maintenance', 'Miscellaneous'];
    return { prods: prodCats, exps: expCats, all: Array.from(new Set([...prodCats, ...expCats])) };
  }, [products]);

  // Calculate stats cards from actual db records (No dummy data)
  const stats = useMemo(() => {
    const totalOrders = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + s.netAmount, 0);
    
    // Average Order Value
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    
    // Date ranges
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Today's revenue
    const todayRevenue = sales
      .filter(s => s.date === todayStr)
      .reduce((sum, s) => sum + s.netAmount, 0);

    // Weekly revenue
    const weeklyRevenue = sales
      .filter(s => new Date(s.date) >= sevenDaysAgo)
      .reduce((sum, s) => sum + s.netAmount, 0);

    // Monthly revenue
    const monthlyRevenue = sales
      .filter(s => new Date(s.date) >= thirtyDaysAgo)
      .reduce((sum, s) => sum + s.netAmount, 0);

    // Unique dates with sales to get daily average
    const uniqueDates = new Set(sales.map(s => s.date));
    const dailyAverageSales = uniqueDates.size > 0 ? Math.round(totalRevenue / uniqueDates.size) : totalRevenue;

    // Customers served
    const uniqueCusts = new Set(sales.map(s => s.customerId || s.customerName));
    const customersServedCount = uniqueCusts.size;

    return {
      totalOrders,
      totalRevenue,
      dailyAverageSales,
      averageOrderValue,
      weeklyRevenue,
      monthlyRevenue,
      todayRevenue,
      customersServedCount
    };
  }, [sales]);

  // Dynamic Ledger Aggregator - Combines Sales and Expenses Chronologically
  const unifiedLedger = useMemo(() => {
    const items: any[] = [];
    
    sales.forEach(s => {
      // Calculate total cost and product names
      const profitCost = s.items?.reduce((c, it) => c + ((it.costPriceAtSale || 0) * it.quantity), 0) || 0;
      const profitAmount = s.netAmount - profitCost;
      
      items.push({
        id: s.id,
        invoiceNumber: s.invoiceNumber,
        type: 'Income',
        amount: s.netAmount,
        customerVendorName: s.customerName || 'Walk-in Client',
        category: s.items?.[0]?.productName ? 'Sales POS' : 'General Revenue',
        recordedBy: s.cashierName || 'Cashier',
        role: s.cashierRole || 'Employee',
        date: s.date,
        time: s.time || '12:00',
        linkedProduct: s.items?.[0]?.productName || 'N/A',
        paymentMethod: s.paymentMethod,
        notes: s.notes || `Tax Invoice processed at POS. VAT: KSh ${s.tax.toLocaleString()}`,
        profit: profitAmount,
        rawObj: s
      });
    });

    expenses.forEach(e => {
      items.push({
        id: e.id,
        invoiceNumber: 'EXP-' + e.id.substring(4, 8).toUpperCase(),
        type: 'Expense',
        amount: e.amount,
        customerVendorName: 'External Vendor',
        category: e.category,
        recordedBy: e.recordedBy || 'Manager',
        role: e.role || 'Manager',
        date: e.date,
        time: '00:00',
        linkedProduct: 'N/A',
        paymentMethod: 'Cash',
        notes: e.description || 'Business Cash Expense recorded manually.',
        profit: -e.amount,
        rawObj: e
      });
    });

    // Sort chronologically descending
    return items.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });
  }, [sales, expenses]);

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    return unifiedLedger.filter(item => {
      // Search matches
      const query = dashSearchQuery.toLowerCase();
      const matchesSearch = !query || 
                            item.customerVendorName.toLowerCase().includes(query) ||
                            item.linkedProduct.toLowerCase().includes(query) ||
                            item.invoiceNumber.toLowerCase().includes(query) ||
                            item.recordedBy.toLowerCase().includes(query) ||
                            item.notes.toLowerCase().includes(query);

      // Filters
      const matchesType = dashTypeFilter === 'all' || 
                          (dashTypeFilter === 'income' && item.type === 'Income') ||
                          (dashTypeFilter === 'expense' && item.type === 'Expense');

      const matchesCategory = dashCategoryFilter === 'All' || item.category === dashCategoryFilter;
      
      const matchesEmployee = dashEmployeeFilter === 'All' || item.recordedBy === dashEmployeeFilter;

      const matchesPayment = dashPaymentFilter === 'All' || item.paymentMethod === dashPaymentFilter;

      // Date Filters
      let matchesDate = true;
      if (dashDateFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        matchesDate = item.date === todayStr;
      } else if (dashDateFilter === '7days') {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - 7);
        matchesDate = new Date(item.date) >= threshold;
      } else if (dashDateFilter === '30days') {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - 30);
        matchesDate = new Date(item.date) >= threshold;
      } else if (dashDateFilter === 'custom') {
        if (dashStartDate && dashEndDate) {
          matchesDate = item.date >= dashStartDate && item.date <= dashEndDate;
        }
      }

      return matchesSearch && matchesType && matchesCategory && matchesEmployee && matchesPayment && matchesDate;
    });
  }, [unifiedLedger, dashSearchQuery, dashTypeFilter, dashCategoryFilter, dashEmployeeFilter, dashPaymentFilter, dashDateFilter, dashStartDate, dashEndDate]);

  // Interactive Chart Aggregator Adaptation
  const chartData = useMemo(() => {
    let datesList: string[] = [];
    const now = new Date();
    
    if (chartInterval === 'today') {
      // Hours interval
      const daySales = sales.filter(s => s.date === now.toISOString().split('T')[0]);
      const hourlyData = Array.from({ length: 12 }, (_, i) => {
        const hour = 8 + i; // 8 AM to 7 PM
        const hourStr = `${String(hour).padStart(2, '0')}:00`;
        const hourSales = daySales.filter(s => parseInt(s.time?.split(':')[0] || '12') === hour);
        
        const revenue = hourSales.reduce((sum, s) => sum + s.netAmount, 0);
        const orders = hourSales.length;
        const profit = hourSales.reduce((sum, s) => {
          const cost = s.items?.reduce((c, it) => c + ((it.costPriceAtSale || 0) * it.quantity), 0) || 0;
          return sum + (s.netAmount - cost);
        }, 0);
        
        return { label: hourStr, revenue, orders, profit };
      });
      return hourlyData;
    }

    let iterations = 7;
    if (chartInterval === '7days') iterations = 7;
    else if (chartInterval === '30days') iterations = 30;
    else if (chartInterval === 'custom' && customStartDate && customEndDate) {
      const diffTime = Math.abs(new Date(customEndDate).getTime() - new Date(customStartDate).getTime());
      iterations = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      iterations = Math.min(iterations, 90); // ceiling limit
    }

    if (chartInterval === 'monthly') {
      // Months interval
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map((m, idx) => {
        const monthSales = sales.filter(s => {
          const sDate = new Date(s.date);
          return sDate.getMonth() === idx && sDate.getFullYear() === now.getFullYear();
        });
        const revenue = monthSales.reduce((sum, s) => sum + s.netAmount, 0);
        const orders = monthSales.length;
        const profit = monthSales.reduce((sum, s) => {
          const cost = s.items?.reduce((c, it) => c + ((it.costPriceAtSale || 0) * it.quantity), 0) || 0;
          return sum + (s.netAmount - cost);
        }, 0);
        return { label: m, revenue, orders, profit };
      });
    }

    if (chartInterval === 'quarterly') {
      const quarters = [
        { name: 'Q1 (Jan-Mar)', months: [0, 1, 2] },
        { name: 'Q2 (Apr-Jun)', months: [3, 4, 5] },
        { name: 'Q3 (Jul-Sep)', months: [6, 7, 8] },
        { name: 'Q4 (Oct-Dec)', months: [9, 10, 11] }
      ];
      return quarters.map(q => {
        const qSales = sales.filter(s => {
          const sDate = new Date(s.date);
          return q.months.includes(sDate.getMonth()) && sDate.getFullYear() === now.getFullYear();
        });
        const revenue = qSales.reduce((sum, s) => sum + s.netAmount, 0);
        const orders = qSales.length;
        const profit = qSales.reduce((sum, s) => {
          const cost = s.items?.reduce((c, it) => c + ((it.costPriceAtSale || 0) * it.quantity), 0) || 0;
          return sum + (s.netAmount - cost);
        }, 0);
        return { label: q.name, revenue, orders, profit };
      });
    }

    if (chartInterval === 'yearly') {
      const years = [2024, 2025, 2026];
      return years.map(y => {
        const ySales = sales.filter(s => new Date(s.date).getFullYear() === y);
        const revenue = ySales.reduce((sum, s) => sum + s.netAmount, 0);
        const orders = ySales.length;
        const profit = ySales.reduce((sum, s) => {
          const cost = s.items?.reduce((c, it) => c + ((it.costPriceAtSale || 0) * it.quantity), 0) || 0;
          return sum + (s.netAmount - cost);
        }, 0);
        return { label: String(y), revenue, orders, profit };
      });
    }

    // Default dates list builder (7days, 30days, custom days)
    for (let i = 0; i < iterations; i++) {
      const d = new Date();
      if (chartInterval === 'custom' && customEndDate) {
        const end = new Date(customEndDate);
        end.setDate(end.getDate() - i);
        datesList.push(end.toISOString().split('T')[0]);
      } else {
        d.setDate(now.getDate() - i);
        datesList.push(d.toISOString().split('T')[0]);
      }
    }
    datesList = datesList.reverse();

    return datesList.map(dateStr => {
      const daySales = sales.filter(s => s.date === dateStr);
      const revenue = daySales.reduce((sum, s) => sum + s.netAmount, 0);
      const orders = daySales.length;
      const profit = daySales.reduce((sum, s) => {
        const cost = s.items?.reduce((c, it) => c + ((it.costPriceAtSale || 0) * it.quantity), 0) || 0;
        return sum + (s.netAmount - cost);
      }, 0);

      const dObj = new Date(dateStr);
      const formattedLabel = dObj.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });

      return {
        label: formattedLabel,
        revenue,
        orders,
        profit
      };
    });
  }, [sales, chartInterval, customStartDate, customEndDate]);

  // Trend Percentage estimation compared to previous periods
  const trendPercentage = useMemo(() => {
    if (sales.length === 0) return 0;
    const now = new Date();
    const midPoint = Math.floor(sales.length / 2);
    if (midPoint === 0) return 100;
    
    // Sum halves
    const currentHalf = sales.slice(0, midPoint).reduce((sum, s) => sum + s.netAmount, 0);
    const prevHalf = sales.slice(midPoint).reduce((sum, s) => sum + s.netAmount, 0);
    
    if (prevHalf === 0) return 100;
    return Math.round(((currentHalf - prevHalf) / prevHalf) * 100);
  }, [sales]);


  // ==========================================
  // CLIENT DIRECTORY CRM LISTINGS & CALCULATIONS
  // ==========================================
  const dynamicClientsList = useMemo(() => {
    return customers.map(c => {
      // Calculate total dynamic spend from actual sales logs
      const clientSales = sales.filter(s => s.customerId === c.id);
      const totalSpendCalc = clientSales.reduce((sum, s) => sum + s.netAmount, 0);
      
      // Outstanding debt
      const outstandingDebt = c.debtAmount || 0;
      
      // Last purchase date
      let lastPurchase = 'N/A';
      if (clientSales.length > 0) {
        const sortedSales = [...clientSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        lastPurchase = sortedSales[0].date;
      }

      return {
        ...c,
        calculatedSpend: totalSpendCalc || c.totalSpent || 0,
        outstandingDebt,
        lastPurchaseDate: lastPurchase
      };
    });
  }, [customers, sales]);


  // ==========================================
  // MUTATION FORM CONTROLLERS
  // ==========================================

  const handleOnboardClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardClientName) return;

    addCustomer({
      name: onboardClientName,
      phone: onboardClientPhone || 'N/A',
      email: onboardClientEmail || 'N/A',
      address: onboardClientCompany || 'N/A'
    });

    // Reset
    setOnboardClientName('');
    setOnboardClientPhone('');
    setOnboardClientEmail('');
    setOnboardClientCompany('');
    setShowOnboardClientModal(false);
    alert('Partner Client registered securely into current workspace CRM.');
  };

  const handleFinancialEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid monetary amount.');
      return;
    }

    if (entryType === 'sale') {
      // Record a sale manually
      const clientName = manualCustomerName || 'Walk-in Customer';
      const prodSelected = products.find(p => p.id === manualProductId);
      
      let saleItems: { productId: string; quantity: number }[] = [];
      if (prodSelected) {
        const qty = parseInt(manualProductQty) || 1;
        saleItems.push({ productId: prodSelected.id, quantity: qty });
      } else {
        // Create generic placeholder sale item from standard catalogue if product is absent
        if (products.length > 0) {
          saleItems.push({ productId: products[0].id, quantity: 1 });
        } else {
          alert('You must have at least one catalogue product established to record Sales POS transactions.');
          return;
        }
      }

      try {
        recordSale({
          customerName: clientName,
          customerId: manualCustomerId || undefined,
          items: saleItems,
          discount: 0,
          paymentMethod: manualPaymentMethod
        });
        alert('Manual income registered successfully. Catalog stock level updated.');
      } catch (err: any) {
        alert(err?.message || 'Error executing manual transaction check.');
        return;
      }

    } else {
      // Record business cash expense
      const category = manualCategory || 'Miscellaneous';
      const desc = manualDescription || 'Recorded manual expense from Cash Desk';
      addExpense({
        category,
        description: desc,
        amount: amt,
        date: manualDate
      });
      alert('Business Expense logged successfully. Financial statements updated.');
    }

    // Reset forms
    setManualAmount('');
    setManualCustomerName('');
    setManualCustomerId('');
    setManualProductId('');
    setManualProductQty('1');
    setManualDescription('');
    setManualCategory('');
    setManualPaymentMethod('Cash');
    setManualInvoiceNumber('');
    setShowEntryModal(false);
  };

  // Modify descriptives of sale
  const handleEditSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    
    updateSale(editingSale.id, {
      customerName: editSaleCust,
      paymentMethod: editSalePay
    });

    setShowEditSaleModal(false);
    setEditingSale(null);
    alert('Sale Invoice descriptor modified.');
  };

  // Modify expense descriptives
  const handleEditExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    updateExpense(editingExpense.id, {
      category: editExpenseCategory,
      amount: parseFloat(editExpenseAmount) || editingExpense.amount,
      description: editExpenseDesc
    });

    setShowEditExpenseModal(false);
    setEditingExpense(null);
    alert('Expense docket modified.');
  };

  // Voiding a transaction in the ledger
  const handleVoidLedgerItem = (item: any) => {
    if (confirm(`Are you sure you want to void and permanently delete this ${item.type} record (${item.invoiceNumber})?`)) {
      if (item.type === 'Income') {
        deleteSale(item.id);
        alert('POS sale transaction voided. Inventory stock restored.');
      } else {
        deleteExpense(item.id);
        alert('Business expense docket voided.');
      }
    }
  };


  return (
    <div className="space-y-6">
      
      {/* Top Navigation & App Title */}
      <div className="glass-panel p-6 rounded-2xl border-t-2 border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-cyan-400" />
            POS Sales & Retail Dashboard
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Replicated corporate Point-of-Sale terminal. Active Tenant Workspace: <span className="text-cyan-400 font-mono font-bold">{activeBusiness.name}</span>
          </p>
        </div>

        {/* Tab Switcher Toggles */}
        <div className="bg-gray-950 p-1 rounded-xl border border-brand-border flex gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition duration-150 ${
              activeTab === 'dashboard'
                ? 'bg-cyan-400 text-gray-950 font-bold shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Sales Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition duration-150 ${
              activeTab === 'pos'
                ? 'bg-cyan-400 text-gray-950 font-bold shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>POS Cashier Basket</span>
          </button>
        </div>
      </div>

      {/* =======================================================
          TAB 1: SALES POS DASHBOARD VIEW
          ======================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Section 1: Dynamic Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Revenue card */}
            <div className="glass-panel p-5 rounded-2xl border border-brand-border flex items-center justify-between relative overflow-hidden group">
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">TOTAL SALES REVENUE</p>
                <h3 className="text-xl font-bold font-mono text-cyan-400">KSh {stats.totalRevenue.toLocaleString()}</h3>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+{trendPercentage}% Growth</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Total Sales Orders */}
            <div className="glass-panel p-5 rounded-2xl border border-brand-border flex items-center justify-between relative overflow-hidden group">
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">SALES ORDERS COUNT</p>
                <h3 className="text-xl font-bold font-mono text-gray-200">{stats.totalOrders} Registers</h3>
                <p className="text-[10px] text-gray-500 font-mono">Active POS checkout logs</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-900 border border-brand-border flex items-center justify-center text-gray-400">
                <ClipboardList className="w-6 h-6" />
              </div>
            </div>

            {/* Daily Average Sales */}
            <div className="glass-panel p-5 rounded-2xl border border-brand-border flex items-center justify-between relative overflow-hidden group">
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">DAILY SALES AVERAGE</p>
                <h3 className="text-xl font-bold font-mono text-cyan-400">KSh {stats.dailyAverageSales.toLocaleString()}</h3>
                <p className="text-[10px] text-gray-400 font-mono">Normalized by active sales days</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-900 border border-brand-border flex items-center justify-center text-cyan-400">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            {/* Customers Served & Today's Summary */}
            <div className="glass-panel p-5 rounded-2xl border border-brand-border flex items-center justify-between relative overflow-hidden group">
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">CLIENTS REGISTERED</p>
                <h3 className="text-xl font-bold font-mono text-gray-200">{stats.customersServedCount} Served</h3>
                <p className="text-[10px] text-cyan-400 font-mono">Today: KSh {stats.todayRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-900 border border-brand-border flex items-center justify-center text-gray-400">
                <Users className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* Section 2: Chart & Financial Actions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Live Interactive Revenue Chart Area (8 columns) */}
            <div className="lg:col-span-8 glass-panel p-5 rounded-2xl border border-brand-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-200 flex items-center gap-1.5">
                    <Activity className="w-4.5 h-4.5 text-cyan-400" />
                    Interactive Sales Revenue Chart
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Track growth, ticket order volume, and estimated net profit margin</p>
                </div>

                {/* Interval filters switcher */}
                <div className="flex flex-wrap gap-1">
                  {(['today', '7days', '30days', 'monthly', 'quarterly', 'yearly', 'custom'] as const).map(interval => (
                    <button
                      key={interval}
                      onClick={() => setChartInterval(interval)}
                      className={`px-2 py-1 text-[10px] font-semibold uppercase font-mono rounded border transition ${
                        chartInterval === interval
                          ? 'bg-cyan-950 text-cyan-400 border-cyan-500/30'
                          : 'bg-gray-900/40 text-gray-500 border-transparent hover:text-gray-300'
                      }`}
                    >
                      {interval === '7days' ? 'Last 7D' : interval === '30days' ? 'Last 30D' : interval}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Range Picker panel */}
              {chartInterval === 'custom' && (
                <div className="p-3 bg-gray-950/40 rounded-xl border border-brand-border flex flex-wrap gap-4 items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">From:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-gray-900 border border-brand-border rounded px-2 py-1 text-gray-300 outline-none text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">To:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-gray-900 border border-brand-border rounded px-2 py-1 text-gray-300 outline-none text-xs font-mono"
                    />
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono">Max limit: past 90 days query</div>
                </div>
              )}

              {/* Render Area/Bar Chart with Custom Tooltip for Profit hovering */}
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="#4b5563" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#4b5563" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => `KSh ${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-gray-950 border border-brand-border p-3.5 rounded-xl shadow-2xl font-mono text-xs space-y-1.5 z-50">
                              <p className="text-gray-400 font-bold font-sans">{data.label}</p>
                              <div className="h-[1px] bg-brand-border/60 my-1" />
                              <p className="text-cyan-400 font-bold">Revenue: KSh {data.revenue.toLocaleString()}</p>
                              <p className="text-emerald-400 font-semibold">Profit: KSh {data.profit.toLocaleString()}</p>
                              <p className="text-gray-500 text-[10px]">Orders logged: {data.orders}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area 
                      type="monotone" 
                      name="Revenue (Gross)" 
                      dataKey="revenue" 
                      stroke="#06b6d4" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                    <Area 
                      type="monotone" 
                      name="Net Profit" 
                      dataKey="profit" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorProfit)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions Panel (4 columns) */}
            <div className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-brand-border flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-1.5 border-b border-brand-border pb-3">
                  <Layers className="w-4.5 h-4.5 text-cyan-400" />
                  Financial Records Actions
                </h3>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                  Record immediate cash flow entries, register high-volume expenses, onboard enterprise partners into CRM registry, and view ledger status.
                </p>
              </div>

              <div className="space-y-3">
                {/* 1. Record Financial Entry button */}
                <button
                  onClick={() => {
                    setEntryType('sale');
                    setShowEntryModal(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-gray-950 font-bold rounded-xl text-center shadow transition text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Financial Entry</span>
                </button>

                {/* 2. Onboard CRM Client button */}
                <button
                  onClick={() => setShowOnboardClientModal(true)}
                  className="w-full py-3 bg-gray-950 border border-brand-border hover:border-cyan-500/30 hover:text-cyan-400 text-gray-300 font-bold rounded-xl text-center transition text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Onboard CRM Partner Client</span>
                </button>

                {/* 3. Open POS terminal shortcut */}
                <button
                  onClick={() => setActiveTab('pos')}
                  className="w-full py-3 bg-gray-950/40 hover:bg-gray-900/60 border border-brand-border/60 text-gray-400 font-bold rounded-xl text-center transition text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Active POS Basket Cashier</span>
                </button>
              </div>

              <div className="text-[9.5px] font-mono text-gray-500 border-t border-brand-border/40 pt-2.5 flex justify-between items-center">
                <span>SECURED LOCAL SYNC CHANNELS</span>
                <span className="text-emerald-400">ACTIVE</span>
              </div>
            </div>

          </div>

          {/* Section 3: Ledger Feed & Advanced Filtering */}
          <div className="glass-panel p-5 rounded-2xl border border-brand-border space-y-4">
            
            {/* Ledger Header & Search Filters */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-brand-border pb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-1.5">
                  <ClipboardList className="w-4.5 h-4.5 text-cyan-400" />
                  Unified POS Ledger Feed
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Real-time chronological feed of income and expenses</p>
              </div>

              {/* Advanced multi-dimensional filters container */}
              <div className="w-full xl:w-auto grid grid-cols-2 md:grid-cols-4 xl:flex items-center gap-2 text-xs">
                
                {/* Search query input */}
                <div className="col-span-2 md:col-span-2 xl:w-60 bg-gray-950 border border-brand-border rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by description, invoice, client..."
                    value={dashSearchQuery}
                    onChange={(e) => setDashSearchQuery(e.target.value)}
                    className="bg-transparent text-gray-200 outline-none w-full text-[11px]"
                  />
                </div>

                {/* Filter Type */}
                <select
                  value={dashTypeFilter}
                  onChange={(e) => setDashTypeFilter(e.target.value)}
                  className="bg-gray-950 border border-brand-border text-gray-300 rounded-xl px-2.5 py-1.5 text-[11px] outline-none"
                >
                  <option value="all">All Entries</option>
                  <option value="income">Income (+)</option>
                  <option value="expense">Expense (-)</option>
                </select>

                {/* Filter Category */}
                <select
                  value={dashCategoryFilter}
                  onChange={(e) => setDashCategoryFilter(e.target.value)}
                  className="bg-gray-950 border border-brand-border text-gray-300 rounded-xl px-2.5 py-1.5 text-[11px] outline-none"
                >
                  <option value="All">All Categories</option>
                  {distinctCategories.all.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {/* Filter Employee */}
                <select
                  value={dashEmployeeFilter}
                  onChange={(e) => setDashEmployeeFilter(e.target.value)}
                  className="bg-gray-950 border border-brand-border text-gray-300 rounded-xl px-2.5 py-1.5 text-[11px] outline-none"
                >
                  <option value="All">All Staff</option>
                  {distinctEmployees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>

                {/* Date quick filters */}
                <select
                  value={dashDateFilter}
                  onChange={(e) => setDashDateFilter(e.target.value as any)}
                  className="bg-gray-950 border border-brand-border text-gray-300 rounded-xl px-2.5 py-1.5 text-[11px] outline-none"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range filters inside advanced filters */}
            {dashDateFilter === 'custom' && (
              <div className="p-3 bg-gray-950/45 border border-brand-border rounded-xl flex gap-4 text-xs items-center font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">From Date:</span>
                  <input
                    type="date"
                    value={dashStartDate}
                    onChange={(e) => setDashStartDate(e.target.value)}
                    className="bg-gray-900 border border-brand-border rounded px-2 py-1 text-gray-300 outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">To Date:</span>
                  <input
                    type="date"
                    value={dashEndDate}
                    onChange={(e) => setDashEndDate(e.target.value)}
                    className="bg-gray-900 border border-brand-border rounded px-2 py-1 text-gray-300 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Chronological Ledger list */}
            <div className="max-h-[500px] overflow-y-auto space-y-2.5 pr-1.5">
              {filteredLedger.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl space-y-2">
                  <ClipboardList className="w-10 h-10 text-gray-800 mx-auto animate-pulse" />
                  <p className="text-xs font-semibold text-gray-400">No ledger entries detected</p>
                  <p className="text-[11px] text-gray-500">Please relax constraints or record a manual transaction entry.</p>
                </div>
              ) : (
                filteredLedger.map((item, index) => {
                  const isIncome = item.type === 'Income';
                  return (
                    <div 
                      key={item.id + '-' + index} 
                      className={`p-4 rounded-xl border bg-gray-950/35 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-brand-border/80 transition relative overflow-hidden ${
                        isIncome ? 'border-brand-border' : 'border-rose-950/40'
                      }`}
                    >
                      {/* Left Block: Amount, category, descriptives */}
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs ${
                          isIncome 
                            ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400' 
                            : 'bg-rose-950/40 border border-rose-500/30 text-rose-400'
                        }`}>
                          {isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-extrabold text-gray-200 font-mono">{item.invoiceNumber}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold border uppercase ${
                              isIncome 
                                ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/10' 
                                : 'bg-rose-950/30 text-rose-400 border-rose-500/10'
                            }`}>
                              {isIncome ? 'Income' : 'Expense'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">({item.category})</span>
                          </div>

                          <p className="text-xs font-sans text-gray-300 font-semibold">{item.notes}</p>
                          
                          {/* Metadata inline */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 font-mono">
                            <span className="capitalize">Client/Vendor: <strong className="text-gray-400">{item.customerVendorName}</strong></span>
                            <span>•</span>
                            <span className="capitalize">Recorded By: <strong className="text-gray-400">{item.recordedBy} ({item.role})</strong></span>
                            <span>•</span>
                            {isIncome && <span>Payment Channel: <strong className="text-cyan-400">{item.paymentMethod}</strong></span>}
                            {isIncome && <span>•</span>}
                            <span>Date: <strong className="text-gray-400">{item.date}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Amount and actions */}
                      <div className="flex items-center gap-4 justify-between md:justify-end shrink-0">
                        <div className="text-right font-mono">
                          <p className={`text-sm font-black ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isIncome ? '+' : '-'} KSh {item.amount.toLocaleString()}
                          </p>
                          {isIncome && (
                            <p className="text-[9.5px] text-gray-500">
                              Profit: KSh {item.profit.toLocaleString()}
                            </p>
                          )}
                        </div>

                        {/* Modifiers & Void triggers */}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              if (isIncome) {
                                setEditingSale(item.rawObj);
                                setEditSaleCust(item.customerVendorName);
                                setEditSalePay(item.paymentMethod);
                                setShowEditSaleModal(true);
                              } else {
                                setEditingExpense(item.rawObj);
                                setEditExpenseCategory(item.category);
                                setEditExpenseAmount(item.amount.toString());
                                setEditExpenseDesc(item.notes);
                                setShowEditExpenseModal(true);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-gray-900 border border-brand-border hover:border-cyan-500/30 text-gray-400 hover:text-cyan-400 transition"
                            title="Edit Record Properties"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleVoidLedgerItem(item)}
                            className="p-1.5 rounded-lg bg-gray-900 border border-brand-border hover:border-rose-500/30 text-gray-400 hover:text-rose-400 transition"
                            title="Void and Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 4: Customer Directory & CRM Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-brand-border space-y-4">
            <div className="flex justify-between items-center border-b border-brand-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-1.5">
                  <Users className="w-4.5 h-4.5 text-cyan-400" />
                  Catalogue Clients CRM Directory
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Track aggregate client spent histories and outstanding business debts</p>
              </div>

              <button
                onClick={() => setShowOnboardClientModal(true)}
                className="px-3 py-1.5 bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 font-bold font-mono text-[11px] rounded-xl flex items-center gap-1.5 hover:bg-cyan-900/30 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Onboard Client Partner</span>
              </button>
            </div>

            {/* Clients Table / Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dynamicClientsList.map(client => (
                <div key={client.id} className="p-4 rounded-xl border border-brand-border/60 bg-gray-950/20 hover:border-brand-border transition space-y-3 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-100 capitalize">{client.name}</h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{client.phone} | {client.email}</p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-cyan-950/50 border border-cyan-500/10 flex items-center justify-center text-[10px] text-cyan-400 font-mono uppercase font-bold">
                      {client.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center bg-gray-950/50 p-2.5 rounded-lg border border-brand-border/40 text-[10px] font-mono">
                    <div>
                      <span className="text-gray-500 block text-[9px]">TOTAL SPENT</span>
                      <strong className="text-cyan-400">KSh {client.calculatedSpend.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">ACTIVE DEBT</span>
                      <strong className={client.outstandingDebt > 0 ? "text-rose-400 font-bold" : "text-gray-400"}>
                        KSh {client.outstandingDebt.toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">LAST VISIT</span>
                      <strong className="text-gray-300 truncate block">{client.lastPurchaseDate}</strong>
                    </div>
                  </div>

                  {client.address && client.address !== 'N/A' && (
                    <div className="text-[10px] text-gray-400 leading-relaxed font-sans border-t border-brand-border/40 pt-2 flex items-center gap-1.5">
                      <span className="text-cyan-500 font-bold uppercase text-[9px]">Firm:</span>
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>

        </div>
      )}


      {/* =======================================================
          TAB 2: ORIGINAL POS BASKET CHECKOUT VIEW
          ======================================================= */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
          
          {/* Products Browsing Grid (7/12 width) */}
          <div className="lg:col-span-7 space-y-4 animate-fade-in">
            
            {/* Header Search & Category Filter */}
            <div className="glass-panel p-4 rounded-xl space-y-3">
              <div className="flex gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search products by SKU, name, or scan barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-950/60 border border-brand-border rounded-lg text-sm text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {posCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      selectedCategory === cat 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold' 
                        : 'bg-gray-900/40 text-gray-400 border border-transparent hover:text-gray-200 hover:bg-gray-800/40'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-2 text-center py-16 border border-dashed border-gray-800 rounded-2xl">
                  <ShoppingCart className="w-10 h-10 text-gray-800 mx-auto animate-pulse" />
                  <p className="text-xs font-semibold text-gray-400 mt-2">No matching catalogue products</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const outOfStock = p.quantity <= 0;
                  const lowStock = p.quantity <= p.minStockAlert;
                  const isSelected = basket.some(item => item.product.id === p.id);

                  return (
                    <div 
                      key={p.id}
                      onClick={() => !outOfStock && addToBasket(p)}
                      className={`glass-panel p-4 rounded-xl border flex flex-col justify-between h-44 cursor-pointer transition select-none ${
                        outOfStock 
                          ? 'opacity-50 border-gray-800 cursor-not-allowed bg-gray-950/20' 
                          : isSelected
                            ? 'border-cyan-500/40 bg-cyan-950/10 glow-cyan'
                            : 'border-brand-border hover:border-cyan-500/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-cyan-400 font-mono tracking-wider bg-cyan-950/30 px-1.5 py-0.5 rounded-md border border-cyan-500/10">
                            {p.sku}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            outOfStock 
                              ? 'bg-rose-950/30 text-rose-400 border border-rose-500/10' 
                              : lowStock 
                                ? 'bg-amber-950/30 text-amber-400 border border-amber-500/10' 
                                : 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/10'
                          }`}>
                            {p.stockStatus}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-200 line-clamp-2">{p.name}</h4>
                        <p className="text-[10px] text-gray-500 mt-1">Supplier: {p.supplier}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-brand-border/60 pt-2.5">
                        <div>
                          <span className="text-[10px] text-gray-500 block font-mono">SELLING PRICE</span>
                          <span className="text-sm font-mono font-bold text-cyan-400">KSh {p.sellingPrice.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-500 block font-mono">STOCKED</span>
                          <span className="text-xs font-mono font-semibold text-gray-300">{p.quantity} {p.unit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Interactive Checkout Panel / Basket (5/12 width) */}
          <div className="lg:col-span-5 glass-panel p-5 rounded-2xl flex flex-col justify-between min-h-[500px] border border-brand-border relative">
            
            <div>
              <div className="flex items-center gap-2 border-b border-brand-border pb-3 mb-4">
                <ShoppingCart className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-gray-200">POS Checkout Basket</h3>
              </div>

              {/* Customer Selection block */}
              <div className="space-y-3 border-b border-brand-border/60 pb-4 mb-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Select Customer Account</label>
                  <button 
                    onClick={() => setShowAddCustomer(!showAddCustomer)}
                    className="text-[10px] text-cyan-400 hover:underline font-mono"
                  >
                    + Register Client
                  </button>
                </div>

                {showAddCustomer ? (
                  <form onSubmit={handleCreateCustomer} className="p-3 bg-gray-950/50 rounded-xl border border-brand-border space-y-2 text-xs">
                    <div className="font-bold text-gray-300 font-sans">Quick Register Client</div>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      className="w-full p-2 bg-gray-900 border border-brand-border rounded-lg text-gray-200 outline-none focus:border-cyan-500/30"
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="w-full p-2 bg-gray-900 border border-brand-border rounded-lg text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                    />
                    <div className="flex gap-1.5 pt-1">
                      <button 
                        type="submit"
                        className="flex-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-500/30 rounded-lg py-2 font-mono font-bold"
                      >
                        Save
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowAddCustomer(false)}
                        className="flex-1 bg-gray-900 hover:bg-gray-850 text-gray-400 border border-brand-border rounded-lg py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <select
                    value={selectedCustomerId}
                    onChange={handleCustomerSelect}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg text-xs p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                  >
                    <option value="">Walk-in Customer (General Account)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Basket list scroll area */}
              <div className="max-h-56 overflow-y-auto space-y-2 mb-4 pr-1">
                {basket.length === 0 ? (
                  <div className="text-center py-10 text-xs text-gray-500 flex flex-col items-center gap-1.5">
                    <ShoppingCart className="w-8 h-8 text-gray-800 shrink-0" />
                    <span>Basket is empty. Select items on the left to checkout.</span>
                  </div>
                ) : (
                  basket.map((item) => (
                    <div key={item.product.id} className="p-2.5 bg-gray-950/30 rounded-lg border border-brand-border/60 flex items-center justify-between text-xs font-mono">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-semibold text-gray-200 truncate font-sans">{item.product.name}</p>
                        <p className="text-[10px] text-gray-500">Unit Price: KSh {item.product.sellingPrice.toLocaleString()}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-900 border border-brand-border rounded-md">
                          <button 
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 text-gray-400 hover:text-cyan-400 transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs text-gray-200 font-bold">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 text-gray-400 hover:text-cyan-400 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button 
                          onClick={() => removeFromBasket(item.product.id)}
                          className="p-1 text-rose-500 hover:bg-rose-950/20 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Totals & Checkout Actions */}
            <div className="border-t border-brand-border pt-4 mt-auto space-y-3 font-mono text-xs">
              
              {/* Discount Field */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Apply Discount (KSh)</span>
                </span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 bg-gray-950/60 border border-brand-border rounded px-2 py-1 text-right text-gray-200 outline-none focus:border-cyan-500/30"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Payment Method</span>
                </span>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="bg-gray-950/60 border border-brand-border rounded px-2 py-1 text-gray-300 outline-none focus:border-cyan-500/30"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Mobile Money">Mobile Money (M-Pesa)</option>
                  <option value="Credit">Credit Agreement (Debt)</option>
                </select>
              </div>

              <div className="h-[1px] bg-brand-border/60 my-2" />

              {/* Pricing Aggregations */}
              <div className="space-y-1.5 text-right font-mono">
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>Subtotal:</span>
                  <span>KSh {subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-rose-400 text-[11px]">
                    <span>Discount applied:</span>
                    <span>- KSh {discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500 text-[11px]">
                  <span>VAT (16% inclusive):</span>
                  <span>KSh {tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-cyan-400 pt-1 border-t border-brand-border/40 mt-1">
                  <span>Grand Total:</span>
                  <span>KSh {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Action trigger */}
              <button
                onClick={handleCheckout}
                disabled={basket.length === 0}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition duration-200 cursor-pointer"
              >
                Process Transaction (Record Sale)
              </button>
            </div>

          </div>

          {/* Modal Invoice Receipt View */}
          {showReceipt && lastCompletedSale && (() => {
            const custInfo = lastCompletedSale.customerId 
              ? customers.find(c => c.id === lastCompletedSale.customerId)
              : null;
              
            return (
              <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto print:static print:bg-white print:text-black print:p-0 print:m-0 print:overflow-visible animate-fade-in">
                <div className="glass-panel p-6 rounded-2xl w-full max-w-4xl shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto md:overflow-visible print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:m-0 print:max-h-none print:overflow-visible print:w-full">
                  
                  {/* Left Panel: Customized options */}
                  <div className="w-full md:w-80 shrink-0 space-y-4 border-b md:border-b-0 md:border-r border-brand-border pb-6 md:pb-0 md:pr-6 flex flex-col justify-between print:hidden">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
                        <span className="text-xs font-mono font-bold text-cyan-400">RECEIPT CUSTOMIZER</span>
                        <button 
                          onClick={() => setShowReceipt(false)}
                          className="text-xs text-gray-400 hover:text-gray-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Template switch */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Template Format</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setReceiptTemplate('a4')}
                            className={`py-2 px-3 text-xs font-semibold rounded-lg border font-sans transition ${
                              receiptTemplate === 'a4'
                                ? 'bg-cyan-950 text-cyan-400 border-cyan-500/30 font-bold'
                                : 'bg-gray-900 border-brand-border text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            A4 Official Invoice
                          </button>
                          <button
                            type="button"
                            onClick={() => setReceiptTemplate('pos')}
                            className={`py-2 px-3 text-xs font-semibold rounded-lg border font-sans transition ${
                              receiptTemplate === 'pos'
                                ? 'bg-cyan-950 text-cyan-400 border-cyan-500/30 font-bold'
                                : 'bg-gray-900 border-brand-border text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            POS 80mm Slip
                          </button>
                        </div>
                      </div>

                      {/* Tax Registration Details */}
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-gray-400 uppercase block">KRA PIN (Kenya)</label>
                          <input
                            type="text"
                            value={kraPin}
                            onChange={(e) => setKraPin(e.target.value)}
                            className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-gray-400 uppercase block">VAT Registration No</label>
                          <input
                            type="text"
                            value={vatNo}
                            onChange={(e) => setVatNo(e.target.value)}
                            className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-gray-400 uppercase block">Custom Greeting Message</label>
                          <textarea
                            rows={2}
                            value={customGreeting}
                            onChange={(e) => setCustomGreeting(e.target.value)}
                            className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-cyan-500/30 font-sans resize-none"
                          />
                        </div>
                      </div>

                      {/* Checkbox triggers */}
                      <div className="space-y-2 pt-2 text-xs">
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showLogo}
                            onChange={(e) => setShowLogo(e.target.checked)}
                            className="accent-cyan-500"
                          />
                          <span>Show Corporate Logo</span>
                        </label>
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeTerms}
                            onChange={(e) => setIncludeTerms(e.target.checked)}
                            className="accent-cyan-500"
                          />
                          <span>Include Kenyan Tax Terms</span>
                        </label>
                        <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeSignature}
                            onChange={(e) => setIncludeSignature(e.target.checked)}
                            className="accent-cyan-500"
                          />
                          <span>Show Auditor Signature Block</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-brand-border">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Document</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReceipt(false)}
                        className="px-4 py-2.5 bg-gray-850 hover:bg-gray-850/80 text-gray-300 border border-brand-border rounded-xl text-xs transition font-semibold"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Right Panel: Live Document Preview */}
                  <div className="flex-1 md:max-h-[75vh] md:overflow-y-auto pr-1 print:overflow-visible print:max-h-none print:p-0 print:m-0 print:w-full print:bg-white print:text-black">
                    <div 
                      className={`bg-gray-950/40 border border-brand-border/80 p-6 rounded-2xl print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black print:w-full ${
                        receiptTemplate === 'pos' 
                          ? 'max-w-md mx-auto font-mono text-[11px]' 
                          : 'w-full text-xs font-sans'
                      }`}
                    >
                      {/* A4 Document Format */}
                      {receiptTemplate === 'a4' && (
                        <div className="space-y-6 text-gray-300 print:text-black print:bg-white print:w-full">
                          
                          {/* Company Letterhead */}
                          <div className="flex items-start justify-between border-b border-brand-border/60 pb-4 print:border-black/20">
                            <div>
                              {showLogo && (
                                <div className="text-cyan-400 font-bold font-mono text-xl uppercase tracking-wider mb-1 print:text-black">
                                  ▲ APEX LEDGER
                                </div>
                              )}
                              <h2 className="text-md font-bold text-gray-100 uppercase print:text-black">{activeBusiness.name}</h2>
                              <p className="text-[10px] text-gray-400 print:text-gray-600 mt-1">
                                Corporate Branch: {activeBusiness.branch || 'Nairobi Head Office'} <br />
                                Central Plaza, Mombasa Rd <br />
                                Tel: +254 (0) 700 000 000 | Email: accounts@apexledger.co.ke
                              </p>
                            </div>
                            
                            <div className="text-right">
                              <h3 className="text-lg font-mono font-black text-cyan-400 uppercase tracking-widest print:text-black">TAX INVOICE</h3>
                              <p className="text-[11px] font-mono text-gray-400 print:text-gray-600 mt-1">
                                Invoice No: <span className="font-bold text-gray-100 print:text-black">{lastCompletedSale.invoiceNumber}</span> <br />
                                KRA PIN: {kraPin} <br />
                                VAT Reg: {vatNo}
                              </p>
                            </div>
                          </div>

                          {/* Customer Details */}
                          <div className="grid grid-cols-2 gap-4 bg-gray-950/35 p-4 rounded-xl border border-brand-border/40 print:bg-transparent print:border-black/10">
                            <div>
                              <span className="text-[9px] font-mono text-cyan-400 font-bold block mb-1">Billed To (Customer Detail):</span>
                              <h4 className="font-bold text-gray-200 capitalize print:text-black">{lastCompletedSale.customerName}</h4>
                              {custInfo ? (
                                <p className="text-[10px] text-gray-400 print:text-gray-600 mt-0.5 space-y-0.5">
                                  <span>Phone: {custInfo.phone}</span> <br />
                                  <span>Email: {custInfo.email}</span> <br />
                                  <span>Address: {custInfo.address || 'N/A'}</span>
                                </p>
                              ) : (
                                <p className="text-[10px] text-gray-500 print:text-gray-500 italic mt-0.5">Regular over-the-counter transaction</p>
                              )}
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] font-mono text-cyan-400 font-bold block mb-1">Invoice Details:</span>
                              <p className="text-[10px] text-gray-400 print:text-gray-600 space-y-1">
                                <span>Date Generated: <strong className="text-gray-200 print:text-black">{lastCompletedSale.date}</strong></span> <br />
                                <span>Time Generated: <strong className="text-gray-200 print:text-black">{lastCompletedSale.time}</strong></span> <br />
                                <span>Cashier Name: <strong className="text-gray-200 print:text-black capitalize">{lastCompletedSale.cashierName}</strong></span> <br />
                                <span>Payment Status: <strong className="text-emerald-400 font-mono font-bold">{lastCompletedSale.paymentMethod === 'Credit' ? 'UNPAID CREDIT' : 'PAID / SECURED'}</strong></span>
                              </p>
                            </div>
                          </div>

                          {/* Line Items Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px] border-collapse">
                              <thead>
                                <tr className="border-b border-brand-border text-gray-400 font-mono uppercase text-[9px] print:border-black/20 print:text-black font-bold">
                                  <th className="py-2.5">Item Description</th>
                                  <th className="py-2.5 text-center">Qty</th>
                                  <th className="py-2.5 text-right">Unit Price</th>
                                  <th className="py-2.5 text-center">VAT Class</th>
                                  <th className="py-2.5 text-right">Net Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lastCompletedSale.items.map((it: any, index: number) => (
                                  <tr key={index} className="border-b border-brand-border/40 text-gray-300 print:border-black/10 print:text-black">
                                    <td className="py-2.5 font-sans font-medium">{it.productName}</td>
                                    <td className="py-2.5 text-center font-mono">{it.quantity}</td>
                                    <td className="py-2.5 text-right font-mono">KSh {it.priceAtSale.toLocaleString()}</td>
                                    <td className="py-2.5 text-center font-mono">V (16%)</td>
                                    <td className="py-2.5 text-right font-mono font-bold">KSh {(it.quantity * it.priceAtSale).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Totals and Terms */}
                          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
                            <div className="flex-1 max-w-xs text-[10px] text-gray-400 print:text-gray-600 space-y-1 bg-gray-950/15 p-3 rounded-xl border border-brand-border/30 print:border-black/10 print:bg-transparent">
                              <span className="font-bold text-cyan-400/80 block mb-1">Standard Declarations:</span>
                              <p className="leading-relaxed">
                                {customGreeting} <br />
                                Prices include standard 16% VAT rate where applicable. This is a secure system invoice.
                              </p>
                            </div>

                            <div className="w-full sm:w-64 space-y-1.5 text-xs">
                              <div className="flex justify-between text-gray-400 print:text-gray-600 font-mono text-[11px]">
                                <span>Gross Base Subtotal:</span>
                                <span className="font-bold">KSh {lastCompletedSale.totalAmount.toLocaleString()}</span>
                              </div>
                              {lastCompletedSale.discount > 0 && (
                                <div className="flex justify-between text-rose-400 font-mono text-[11px]">
                                  <span>Deducted Discount:</span>
                                  <span className="font-bold">- KSh {lastCompletedSale.discount.toLocaleString()}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-gray-400 print:text-gray-600 font-mono text-[11px]">
                                <span>16% Value Added Tax:</span>
                                <span className="font-bold">KSh {lastCompletedSale.tax.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm font-bold text-cyan-400 border-t border-dashed border-brand-border/60 pt-2 print:border-black/30 print:text-black">
                                <span>Total Net Received:</span>
                                <span className="text-md font-black">KSh {lastCompletedSale.netAmount.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Signature and Kenyan Tax Terms */}
                          {(includeTerms || includeSignature) && (
                            <div className="grid grid-cols-2 gap-8 border-t border-brand-border/60 pt-4 mt-6 text-[9px] text-gray-500 font-mono print:border-black/20 print:text-gray-600">
                              <div>
                                {includeTerms && (
                                  <div className="space-y-1">
                                    <p className="font-bold text-gray-400 print:text-black">KENYAN REVENUE REGULATIVE TERMS:</p>
                                    <p className="leading-relaxed">1. Goods sold are not returnable once received in standard condition. <br />2. Claims regarding tax returns should quote PIN {kraPin}.</p>
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex flex-col items-end justify-end">
                                {includeSignature && (
                                  <div className="space-y-1 w-48 text-center border-t border-brand-border/60 pt-2 print:border-black/20">
                                    <span className="font-bold block uppercase text-gray-400 print:text-black">Secure System Signature</span>
                                    <span className="text-[7.5px] tracking-wider text-gray-500 font-bold block">{lastCompletedSale.invoiceNumber} // APEX APPROVED</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                      {/* POS 80mm format */}
                      {receiptTemplate === 'pos' && (
                        <div className="space-y-4 text-center text-gray-300 print:text-black print:bg-white print:w-full">
                          <div className="border-b border-dashed border-brand-border/60 pb-3 print:border-black/20">
                            {showLogo && <h3 className="text-sm font-black text-cyan-400 tracking-widest print:text-black">▲ APEX LEDGER POS</h3>}
                            <h4 className="text-[11px] font-bold uppercase mt-1 text-gray-100 print:text-black">{activeBusiness.name}</h4>
                            <p className="text-[9px] text-gray-500">Branch: {activeBusiness.branch || 'Central HQ'} <br /> Tel: +254 700 000 000</p>
                          </div>

                          <div className="text-left space-y-1 border-b border-dashed border-brand-border/60 pb-3 text-[10px] print:border-black/20">
                            <p><strong>Invoice:</strong> {lastCompletedSale.invoiceNumber}</p>
                            <p><strong>Date:</strong> {lastCompletedSale.date} {lastCompletedSale.time}</p>
                            <p><strong>Cashier:</strong> {lastCompletedSale.cashierName}</p>
                            <p><strong>Customer:</strong> {lastCompletedSale.customerName}</p>
                            <p><strong>KRA PIN:</strong> {kraPin}</p>
                          </div>

                          {/* Items table in POS format */}
                          <div className="text-left space-y-1.5 py-1 text-[10px]">
                            {lastCompletedSale.items.map((it: any, index: number) => (
                              <div key={index} className="flex justify-between items-start">
                                <div className="pr-4">
                                  <p className="font-bold text-gray-200 print:text-black">{it.productName}</p>
                                  <p className="text-gray-500 text-[9px]">{it.quantity} x KSh {it.priceAtSale.toLocaleString()}</p>
                                </div>
                                <span className="font-bold text-gray-300 print:text-black">KSh {(it.quantity * it.priceAtSale).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>

                          {/* Totals in POS format */}
                          <div className="border-t border-dashed border-brand-border/60 pt-3 text-right space-y-1 text-[10px] print:border-black/20">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>KSh {lastCompletedSale.totalAmount.toLocaleString()}</span>
                            </div>
                            {lastCompletedSale.discount > 0 && (
                              <div className="flex justify-between text-rose-400">
                                <span>Discount:</span>
                                <span>- KSh {lastCompletedSale.discount.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>VAT (16% Inc):</span>
                              <span>KSh {lastCompletedSale.tax.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-black text-cyan-400 pt-1.5 border-t border-dashed border-brand-border/40 print:text-black print:border-black/20">
                              <span>NET TOTAL:</span>
                              <span>KSh {lastCompletedSale.netAmount.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-dashed border-brand-border/60 text-[9px] text-gray-500 space-y-1 text-center print:border-black/20">
                            <p className="italic">{customGreeting}</p>
                            <p className="font-bold">SYSTEM TRANSID: tx_{lastCompletedSale.id}</p>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

        </div>
      )}


      {/* =======================================================
          MODALS & FORM DIALOGS SECTION
          ======================================================= */}

      {/* 1. Record Financial Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-lg shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowEntryModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-md font-bold text-gray-200 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              <span>Record Financial Entry</span>
            </h3>

            {/* Income (Sale) / Expense Switcher Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-gray-950 p-1 rounded-xl border border-brand-border mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setEntryType('sale')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  entryType === 'sale'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20 font-bold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Income (POS Sale)</span>
              </button>
              
              <button
                type="button"
                onClick={() => setEntryType('expense')}
                className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  entryType === 'expense'
                    ? 'bg-rose-950 text-rose-400 border border-rose-500/20 font-bold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Expense (Cash Out)</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFinancialEntrySubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Amount */}
                <div className="space-y-1 font-mono">
                  <label className="text-gray-400 font-sans font-medium block">Monetary Amount (KES / KSh) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 15000"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50 text-sm font-bold"
                  />
                </div>

                {/* Entry Date */}
                <div className="space-y-1 font-mono">
                  <label className="text-gray-400 font-sans font-medium block">Entry Date *</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50 font-bold"
                  />
                </div>

                {/* FIELDS FOR INCOME (SALE) */}
                {entryType === 'sale' && (
                  <>
                    {/* Customer Account selection */}
                    <div className="space-y-1">
                      <label className="text-gray-400 font-medium block">Customer Account Name</label>
                      <select
                        value={manualCustomerId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualCustomerId(val);
                          const matched = customers.find(c => c.id === val);
                          setManualCustomerName(matched ? matched.name : 'Walk-in Customer');
                        }}
                        className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-300 outline-none focus:border-cyan-500/50"
                      >
                        <option value="">Walk-in Customer (General Account)</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                        ))}
                      </select>
                    </div>

                    {/* Linked product from Catalogue to manage inventory */}
                    <div className="space-y-1">
                      <label className="text-gray-400 font-medium block">Linked Catalogue Product *</label>
                      <select
                        required
                        value={manualProductId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualProductId(val);
                          const prod = products.find(p => p.id === val);
                          if (prod) {
                            setManualAmount((prod.sellingPrice * parseInt(manualProductQty || '1')).toString());
                          }
                        }}
                        className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-300 outline-none focus:border-cyan-500/50"
                      >
                        <option value="">-- Select Product catalog --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku} - Stock: {p.quantity})</option>
                        ))}
                      </select>
                    </div>

                    {/* Product quantity */}
                    <div className="space-y-1 font-mono">
                      <label className="text-gray-400 font-sans font-medium block">Sales Product Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={manualProductQty}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualProductQty(val);
                          const prod = products.find(p => p.id === manualProductId);
                          if (prod) {
                            setManualAmount((prod.sellingPrice * (parseInt(val) || 1)).toString());
                          }
                        }}
                        className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50"
                      />
                    </div>

                    {/* Payment channels */}
                    <div className="space-y-1">
                      <label className="text-gray-400 font-medium block">Payment Method Channel</label>
                      <select
                        value={manualPaymentMethod}
                        onChange={(e: any) => setManualPaymentMethod(e.target.value)}
                        className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-300 outline-none focus:border-cyan-500/50"
                      >
                        <option value="Cash">Cash Account</option>
                        <option value="Card">Card</option>
                        <option value="Mobile Money">Mobile Money (M-Pesa)</option>
                        <option value="Credit">Credit Agreement (Debt Ledger)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* FIELDS FOR EXPENSE */}
                {entryType === 'expense' && (
                  <>
                    {/* Expense Category */}
                    <div className="space-y-1">
                      <label className="text-gray-400 font-medium block">Expense Category *</label>
                      <select
                        required
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value)}
                        className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-300 outline-none focus:border-cyan-500/50"
                      >
                        <option value="">-- Choose Category --</option>
                        {distinctCategories.exps.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Expense Description */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-gray-400 font-medium block">Expense Narrative Description *</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Detailed description of cash expense out flow..."
                        value={manualDescription}
                        onChange={(e) => setManualDescription(e.target.value)}
                        className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50 resize-none font-sans"
                      />
                    </div>
                  </>
                )}

              </div>

              <div className="bg-gray-950/45 p-3 rounded-xl border border-brand-border/60 text-gray-500 text-[10.5px] leading-relaxed space-y-1 font-mono">
                <p>Note: Recording a Sale decrements stock levels of catalog item automatically.</p>
                <p>Saving immediately updates cash flow, net profits, expenses, financial statements, charts, and audits.</p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold rounded-xl text-center shadow"
                >
                  Save Entry Docket
                </button>
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 rounded-xl"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 2. Onboard CRM Client Partner Modal */}
      {showOnboardClientModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowOnboardClientModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-md font-bold text-gray-200 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span>Onboard CRM Client Partner</span>
            </h3>

            <form onSubmit={handleOnboardClientSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-gray-400 font-medium block">Full Partner / Corporate Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Safaricom Plaza Branch"
                  value={onboardClientName}
                  onChange={(e) => setOnboardClientName(e.target.value)}
                  className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-medium block">Phone Contact</label>
                <input
                  type="text"
                  placeholder="e.g. +254 712 345 678"
                  value={onboardClientPhone}
                  onChange={(e) => setOnboardClientPhone(e.target.value)}
                  className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-medium block">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. procurement@safaricom.co.ke"
                  value={onboardClientEmail}
                  onChange={(e) => setOnboardClientEmail(e.target.value)}
                  className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 font-medium block">Company Office Location / Address</label>
                <input
                  type="text"
                  placeholder="e.g. Waiyaki Way, Westlands"
                  value={onboardClientCompany}
                  onChange={(e) => setOnboardClientCompany(e.target.value)}
                  className="w-full bg-gray-950/80 border border-brand-border rounded-xl px-3 py-2 text-gray-200 outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold rounded-xl text-center shadow"
                >
                  Onboard Partner Client
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnboardClientModal(false)}
                  className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-400 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modify descriptive properties of sale modal */}
      {showEditSaleModal && editingSale && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowEditSaleModal(false);
                setEditingSale(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-cyan-400" />
              <span>Modify Invoice Properties</span>
            </h3>

            <form onSubmit={handleEditSaleSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1 font-sans">Customer Account / Name</label>
                <input
                  type="text"
                  required
                  value={editSaleCust}
                  onChange={(e) => setEditSaleCust(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Payment Method</label>
                <select
                  value={editSalePay}
                  onChange={(e: any) => setEditSalePay(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30 font-sans"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card Payment</option>
                  <option value="Mobile Money">Mobile Money (M-Pesa)</option>
                  <option value="Credit">Credit Agreement</option>
                </select>
              </div>

              <div className="bg-gray-950/40 p-3 rounded-xl border border-brand-border text-gray-400 text-[10px] space-y-1 font-sans">
                <p>Note: This only alters the descriptive ledger properties of invoice <strong className="text-cyan-400">{editingSale.invoiceNumber}</strong>.</p>
                <p>Stock levels, item logs, and net totals remain secured as processed at checkout.</p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition cursor-pointer"
              >
                Save Descriptive Edits
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modify descriptive properties of expense modal */}
      {showEditExpenseModal && editingExpense && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowEditExpenseModal(false);
                setEditingExpense(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              <span>Modify Expense Docket</span>
            </h3>

            <form onSubmit={handleEditExpenseSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1 font-sans">Category</label>
                <select
                  value={editExpenseCategory}
                  onChange={(e) => setEditExpenseCategory(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30 font-sans"
                >
                  {distinctCategories.exps.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Expense Amount (KES)</label>
                <input
                  type="number"
                  required
                  value={editExpenseAmount}
                  onChange={(e) => setEditExpenseAmount(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-bold"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Narrative Description</label>
                <textarea
                  rows={3}
                  required
                  value={editExpenseDesc}
                  onChange={(e) => setEditExpenseDesc(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition cursor-pointer"
              >
                Save Expense Edits
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
