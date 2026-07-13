import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Procurement, Product, Supplier, UserRole, TradeCategory } from '../types';
import { 
  Plus, Search, Filter, AlertCircle, Edit, Trash2, Check, ArrowRight, 
  Star, Clock, FileText, CheckCircle, ShieldAlert, Archive, RotateCcw, 
  X, Info, HelpCircle, RefreshCw, ChevronDown, Award, Calendar, DollarSign,
  Package, ShoppingBag, Truck, User, Mail, Phone, MapPin, Tag, ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

// Default Suppliers list - cleared of hardcoded items as per dynamic requirements
const DEFAULT_SUPPLIERS: Supplier[] = [];

export function PurchasesModule() {
  const { 
    procurements, 
    products, 
    profiles, 
    activeUser, 
    activeBusiness, 
    addProcurement, 
    updateProcurement, 
    deleteProcurement, 
    updateProduct, 
    addAudit 
  } = useApp();

  // Multi-tenant suppliers state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'suppliers'>('dashboard');

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Modals state
  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);
  const [isPODetailModalOpen, setIsPODetailModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<Procurement | null>(null);

  // Supplier Add/Edit Modals state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Trade Categories state
  const [tradeCategories, setTradeCategories] = useState<TradeCategory[]>([]);
  const [isTradeCategoryModalOpen, setIsTradeCategoryModalOpen] = useState(false);
  const [tradeCategoryForm, setTradeCategoryForm] = useState({ name: '', description: '' });
  const [selectedTradeCategory, setSelectedTradeCategory] = useState<TradeCategory | null>(null);
  
  // Forms state for Supplier
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    category: '',
    productsSupplied: '',
    supplierRating: 5,
    status: 'Active' as 'Active' | 'Inactive' | 'Archived'
  });

  // Forms state for Purchase Order
  const [poForm, setPoForm] = useState({
    supplierName: '',
    productId: '',
    productName: '',
    unitPrice: 0,
    quantity: 1,
    expectedDeliveryDate: '',
    notes: '',
    internalNotes: '',
    supplierContactName: '',
    supplierEmail: '',
    supplierPhone: '',
    paymentTerms: 'COD',
    priorityLevel: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent'
  });

  // Load and isolate suppliers based on active business
  useEffect(() => {
    if (!activeBusiness?.id) return;
    const localKey = `apex_ledger_suppliers_${activeBusiness.id}`;
    const stored = localStorage.getItem(localKey);
    if (stored) {
      const parsed = JSON.parse(stored) as Supplier[];
      // Remove any hardcoded suppliers that might have been saved under older defaults
      const cleaned = parsed.filter(s => s.id !== 'sup_1' && s.id !== 'sup_2' && s.id !== 'sup_3' && s.id !== 'sup_4');
      setSuppliers(cleaned);
      if (parsed.length !== cleaned.length) {
        localStorage.setItem(localKey, JSON.stringify(cleaned));
      }
    } else {
      setSuppliers([]);
    }
  }, [activeBusiness?.id]);

  const saveSuppliers = (updatedSuppliers: Supplier[]) => {
    if (!activeBusiness?.id) return;
    const localKey = `apex_ledger_suppliers_${activeBusiness.id}`;
    localStorage.setItem(localKey, JSON.stringify(updatedSuppliers));
    setSuppliers(updatedSuppliers);
  };

  // Load and isolate trade categories based on active business
  useEffect(() => {
    if (!activeBusiness?.id) return;
    const localKey = `apex_ledger_trade_categories_${activeBusiness.id}`;
    const stored = localStorage.getItem(localKey);
    if (stored) {
      setTradeCategories(JSON.parse(stored));
    } else {
      setTradeCategories([]);
    }
  }, [activeBusiness?.id]);

  const saveTradeCategories = (updatedCats: TradeCategory[]) => {
    if (!activeBusiness?.id) return;
    const localKey = `apex_ledger_trade_categories_${activeBusiness.id}`;
    localStorage.setItem(localKey, JSON.stringify(updatedCats));
    setTradeCategories(updatedCats);
  };

  // ----------------------------------------------------
  // Dynamic Calculations (Filtered by Active Business)
  // ----------------------------------------------------
  const tenantPOs = procurements.filter(p => p.businessId === activeBusiness?.id);

  // Stats calculation
  const totalPurchaseOrders = tenantPOs.length;
  
  const approvedPOs = tenantPOs.filter(p => 
    p.status === 'Approved' || p.status === 'Ordered' || 
    p.status === 'Partially Received' || p.status === 'Fully Received' || p.status === 'Closed'
  ).length;

  const pendingPOs = tenantPOs.filter(p => 
    p.status === 'Pending Approval' || p.status === 'Submitted'
  ).length;

  const receivedPOsCount = tenantPOs.filter(p => 
    p.status === 'Fully Received' || p.status === 'Partially Received'
  ).length;

  const cancelledPOsCount = tenantPOs.filter(p => p.status === 'Cancelled').length;
  const draftPOsCount = tenantPOs.filter(p => p.status === 'Draft' || !p.status).length;

  // Total Procurement Cost (Excluding cancelled & draft)
  const totalProcurementCost = tenantPOs
    .filter(p => p.status !== 'Cancelled' && p.status !== 'Draft')
    .reduce((sum, p) => sum + (p.materialCosts || 0), 0);

  // Outstanding POs (Approved, Ordered, Partially Received but not Closed/Fully Received/Cancelled)
  const outstandingPOs = tenantPOs.filter(p => 
    p.status === 'Approved' || p.status === 'Ordered' || p.status === 'Partially Received'
  ).length;

  const activeSuppliers = suppliers.filter(s => s.status === 'Active');
  const supplierCount = activeSuppliers.length;

  const averagePurchaseCost = totalPurchaseOrders > 0 
    ? totalProcurementCost / (tenantPOs.filter(p => p.status !== 'Draft' && p.status !== 'Cancelled').length || 1)
    : 0;

  // Monthly Spending for current year/month
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "2026-07"
  const monthlySpending = tenantPOs
    .filter(p => p.date.startsWith(currentMonthStr) && p.status !== 'Cancelled' && p.status !== 'Draft')
    .reduce((sum, p) => sum + (p.materialCosts || 0), 0);

  // Total Inventory Purchased (Quantities of all items in received POs)
  const totalInventoryPurchased = tenantPOs
    .filter(p => p.status === 'Fully Received' || p.status === 'Partially Received' || p.status === 'Closed')
    .reduce((total, p) => {
      const itemsQty = p.items?.reduce((s, item) => s + (item.quantity || 0), 0) || 0;
      return total + itemsQty;
    }, 0);

  // Recalculate dynamic statistics for suppliers
  const enrichedSuppliers = suppliers.map(sup => {
    const supPOs = tenantPOs.filter(p => p.supplierName.toLowerCase() === sup.name.toLowerCase());
    const validPOs = supPOs.filter(p => p.status !== 'Cancelled' && p.status !== 'Draft');
    const completedPOs = supPOs.filter(p => p.status === 'Fully Received' || p.status === 'Closed');
    
    const totalOrders = supPOs.length;
    const completedOrders = completedPOs.length;
    const totalSpend = validPOs.reduce((sum, p) => sum + (p.materialCosts || 0), 0);
    
    // Total purchases (quantities of items purchased across all valid POs)
    const totalPurchases = validPOs.reduce((total, p) => {
      const itemsQty = p.items?.reduce((s, item) => s + (item.quantity || 0), 0) || 0;
      return total + itemsQty;
    }, 0);

    const nonDraftPOs = supPOs.filter(p => p.status !== 'Draft');
    const deliveryPerformance = nonDraftPOs.length > 0
      ? Math.round((completedOrders / nonDraftPOs.length) * 100)
      : 100;

    const fulfillmentRate = validPOs.length > 0
      ? Math.round((completedOrders / validPOs.length) * 100)
      : 100;

    // Supplier Rating out of 5, weighted between user rating (40%) and delivery performance (60%)
    const calculatedRating = totalOrders > 0
      ? parseFloat(((sup.supplierRating * 0.4) + ((deliveryPerformance / 100) * 5 * 0.6)).toFixed(1))
      : sup.supplierRating;

    const lastPO = validPOs.length > 0 
      ? [...validPOs].sort((a, b) => b.date.localeCompare(a.date))[0].date 
      : undefined;

    return {
      ...sup,
      totalOrders,
      completedOrders,
      totalSpend,
      totalPurchases,
      deliveryPerformance,
      fulfillmentRate,
      supplierRating: calculatedRating,
      lastPurchaseDate: lastPO
    };
  });

  // Is Admin or Manager check
  const isManagerOrOwner = activeUser?.role === UserRole.ADMIN || activeUser?.role === UserRole.MANAGER;

  // ----------------------------------------------------
  // Supplier Actions
  // ----------------------------------------------------
  const handleOpenAddSupplier = () => {
    setSelectedSupplier(null);
    setSupplierForm({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      category: tradeCategories.length > 0 ? tradeCategories[0].name : '',
      productsSupplied: '',
      supplierRating: 5,
      status: 'Active'
    });
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setSupplierForm({
      name: sup.name,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email,
      address: sup.address,
      category: sup.category,
      productsSupplied: sup.productsSupplied.join(', '),
      supplierRating: sup.supplierRating,
      status: sup.status
    });
    setIsSupplierModalOpen(true);
  };

  // ----------------------------------------------------
  // Trade Category Actions
  // ----------------------------------------------------
  const handleSaveTradeCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagerOrOwner) return;
    if (!tradeCategoryForm.name.trim()) return;

    if (selectedTradeCategory) {
      // Edit
      const updated = tradeCategories.map(tc => tc.id === selectedTradeCategory.id ? {
        ...tc,
        name: tradeCategoryForm.name.trim(),
        description: tradeCategoryForm.description.trim()
      } : tc);
      saveTradeCategories(updated);
      addAudit('Edited Trade Category', selectedTradeCategory.name, tradeCategoryForm.name.trim());
    } else {
      // Add
      const newCat: TradeCategory = {
        id: 'tc_' + Date.now(),
        businessId: activeBusiness.id,
        name: tradeCategoryForm.name.trim(),
        description: tradeCategoryForm.description.trim(),
        createdAt: new Date().toISOString()
      };
      saveTradeCategories([...tradeCategories, newCat]);
      addAudit('Registered Trade Category', 'N/A', tradeCategoryForm.name.trim());
    }

    setTradeCategoryForm({ name: '', description: '' });
    setSelectedTradeCategory(null);
  };

  const handleOpenEditTradeCategory = (tc: TradeCategory) => {
    setSelectedTradeCategory(tc);
    setTradeCategoryForm({
      name: tc.name,
      description: tc.description || ''
    });
  };

  const handleDeleteTradeCategory = (tcId: string, name: string) => {
    if (!isManagerOrOwner) return;
    if (confirm(`Are you sure you want to permanently delete trade category "${name}"? Any suppliers assigned to this category will need to be re-assigned.`)) {
      const filtered = tradeCategories.filter(tc => tc.id !== tcId);
      saveTradeCategories(filtered);
      addAudit('Deleted Trade Category', name, 'DELETED');
      if (selectedTradeCategory?.id === tcId) {
        setSelectedTradeCategory(null);
        setTradeCategoryForm({ name: '', description: '' });
      }
    }
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManagerOrOwner) return;

    if (!supplierForm.category) {
      alert("No trade categories available. Please create one first.");
      return;
    }

    const listProducts = supplierForm.productsSupplied
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (selectedSupplier) {
      // Edit
      const updated = suppliers.map(s => s.id === selectedSupplier.id ? {
        ...s,
        name: supplierForm.name,
        contactPerson: supplierForm.contactPerson,
        phone: supplierForm.phone,
        email: supplierForm.email,
        address: supplierForm.address,
        category: supplierForm.category,
        productsSupplied: listProducts,
        supplierRating: supplierForm.supplierRating,
        status: supplierForm.status
      } : s);
      saveSuppliers(updated);
      addAudit('Edited Supplier Profile', selectedSupplier.name, supplierForm.name);
    } else {
      // Add
      const newSupplier: Supplier = {
        id: 'sup_' + Date.now(),
        businessId: activeBusiness.id,
        name: supplierForm.name,
        contactPerson: supplierForm.contactPerson,
        phone: supplierForm.phone,
        email: supplierForm.email,
        address: supplierForm.address,
        category: supplierForm.category,
        productsSupplied: listProducts,
        totalOrders: 0,
        totalSpend: 0,
        supplierRating: supplierForm.supplierRating,
        status: supplierForm.status
      };
      saveSuppliers([...suppliers, newSupplier]);
      addAudit('Registered Supplier Profile', 'N/A', supplierForm.name);
    }
    setIsSupplierModalOpen(false);
  };

  const handleDeleteSupplier = (supId: string, name: string) => {
    if (!isManagerOrOwner) return;
    if (confirm(`Are you absolutely sure you want to permanently delete supplier "${name}"? This action is irreversible.`)) {
      const filtered = suppliers.filter(s => s.id !== supId);
      saveSuppliers(filtered);
      addAudit('Permanently Deleted Supplier', name, 'DELETED');
    }
  };

  const handleArchiveSupplier = (sup: Supplier) => {
    if (!isManagerOrOwner) return;
    const updatedStatus: Supplier['status'] = sup.status === 'Archived' ? 'Active' : 'Archived';
    const updated = suppliers.map(s => s.id === sup.id ? { ...s, status: updatedStatus } : s);
    saveSuppliers(updated);
    addAudit(updatedStatus === 'Archived' ? 'Archived Supplier' : 'Restored Supplier', sup.name, updatedStatus);
  };

  // ----------------------------------------------------
  // Purchase Order Actions
  // ----------------------------------------------------
  const handleOpenNewPO = () => {
    if (!isManagerOrOwner) {
      alert("Permission Denied: Only Business Owners and Managers are permitted to issue purchase orders.");
      return;
    }

    // Auto-generate next PO number
    const nextNum = `PO-2026-${String(tenantPOs.length + 1).padStart(3, '0')}`;

    setPoForm({
      supplierName: '',
      productId: '',
      productName: '',
      unitPrice: 0,
      quantity: 1,
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      notes: '',
      internalNotes: '',
      supplierContactName: '',
      supplierEmail: '',
      supplierPhone: '',
      paymentTerms: 'COD',
      priorityLevel: 'Medium'
    });
    setIsNewPOModalOpen(true);
  };

  // Handle product selection in Issue PO form
  const handlePOProductChange = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    // Look for supplier in Supplier Directory to auto-fill contact details
    const matchedSupplier = suppliers.find(s => s.name.toLowerCase() === prod.supplier?.toLowerCase());

    setPoForm(prev => ({
      ...prev,
      productId: prodId,
      productName: prod.name,
      unitPrice: prod.costPrice || 0,
      supplierName: prod.supplier || prev.supplierName,
      supplierContactName: matchedSupplier?.contactPerson || '',
      supplierEmail: matchedSupplier?.email || prod.supplierEmail || '',
      supplierPhone: matchedSupplier?.phone || prod.supplierPhone || ''
    }));
  };

  const handlePOSubmit = (isDraft: boolean) => {
    if (!isManagerOrOwner) return;

    if (!poForm.supplierName || !poForm.productName || poForm.quantity <= 0 || poForm.unitPrice < 0) {
      alert("Please fill in all mandatory fields (Supplier, Product Name, Quantity, and Unit Price).");
      return;
    }

    const calculatedCost = poForm.unitPrice * poForm.quantity;
    const nextNum = `PO-2026-${String(tenantPOs.length + 1).padStart(3, '0')}`;

    const newProcurementData = {
      supplierName: poForm.supplierName,
      orderNumber: nextNum,
      materialCosts: calculatedCost,
      notes: poForm.notes,
      deliveryStatus: (isDraft ? 'Pending' : 'Pending') as 'Pending',
      paymentStatus: 'Unpaid' as 'Unpaid',
      items: [
        {
          name: poForm.productName,
          quantity: poForm.quantity,
          unitPrice: poForm.unitPrice
        }
      ],
      // Android spec extended fields
      status: (isDraft ? 'Draft' : 'Submitted') as any,
      expectedDeliveryDate: poForm.expectedDeliveryDate,
      employeeName: activeUser?.name || 'Unknown cashier',
      employeeId: activeUser?.id,
      internalNotes: poForm.internalNotes,
      supplierContactName: poForm.supplierContactName,
      supplierEmail: poForm.supplierEmail,
      supplierPhone: poForm.supplierPhone,
      paymentTerms: poForm.paymentTerms,
      priorityLevel: poForm.priorityLevel,
      productId: poForm.productId
    };

    addProcurement(newProcurementData);
    
    addAudit(
      isDraft ? 'Created Draft Purchase Order' : 'Issued Purchase Order',
      'N/A',
      `${nextNum} - Supplier: ${poForm.supplierName} - Cost: KSh ${calculatedCost.toLocaleString()}`
    );

    setIsNewPOModalOpen(false);
  };

  // Move PO along lifecycle
  const handleUpdatePOStatus = (poId: string, newStatus: Procurement['status']) => {
    if (!isManagerOrOwner) {
      alert("Only Business Owners and Managers can approve or modify purchase order states.");
      return;
    }

    const po = tenantPOs.find(p => p.id === poId);
    if (!po) return;

    const updates: Partial<Procurement> = { status: newStatus };

    // Inventory auto-integration when PO state transitions to Received
    if ((newStatus === 'Fully Received' || newStatus === 'Partially Received') && !po.productId) {
      // If there is no specific product ID linked, try to match by product name in current inventory
      const firstItem = po.items?.[0];
      if (firstItem) {
        const matchedProd = products.find(p => p.name.toLowerCase() === firstItem.name.toLowerCase());
        if (matchedProd) {
          po.productId = matchedProd.id;
        }
      }
    }

    // Perform inventory replenishment
    if ((newStatus === 'Fully Received' || newStatus === 'Partially Received')) {
      const isAlreadyUpdated = (po as any).inventoryUpdated;
      
      if (!isAlreadyUpdated) {
        const firstItem = po.items?.[0];
        const linkedProductId = po.productId || (po as any).productId;

        if (linkedProductId) {
          const prod = products.find(p => p.id === linkedProductId);
          if (prod && firstItem) {
            const addedQty = firstItem.quantity;
            const nextQty = prod.quantity + addedQty;

            // Compute next Stock Status based on Min Stock Alert
            let nextStockStatus: Product['stockStatus'] = 'In Stock';
            if (nextQty <= 0) nextStockStatus = 'Out of Stock';
            else if (nextQty <= prod.minStockAlert) nextStockStatus = 'Low Stock';

            updateProduct(prod.id, { 
              quantity: nextQty,
              stockStatus: nextStockStatus
            });

            (updates as any).inventoryUpdated = true;

            // Audit inventory automatic restock
            addAudit(
              'Auto Inventory replenishment via PO Received',
              `Product: ${prod.name} | Old Qty: ${prod.quantity}`,
              `New Qty: ${nextQty} | Triggered by PO: ${po.orderNumber}`
            );
          }
        }
      }
    }

    // Map custom workflow status to standard legacy deliveryStatus for fallback compat
    if (newStatus === 'Fully Received' || newStatus === 'Closed') {
      updates.deliveryStatus = 'Delivered';
      updates.paymentStatus = 'Paid';
    } else if (newStatus === 'Cancelled') {
      updates.deliveryStatus = 'Cancelled';
    } else if (newStatus === 'Ordered') {
      updates.deliveryStatus = 'Shipped';
    }

    updateProcurement(poId, updates);
    addAudit('Advanced Purchase Order Workflow', `${po.orderNumber} status: ${po.status || 'Draft'}`, `Next Status: ${newStatus}`);

    // Update details modal if active
    if (selectedPO && selectedPO.id === poId) {
      setSelectedPO(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // ----------------------------------------------------
  // Recharts Analytics preparation
  // ----------------------------------------------------
  
  // 1. Monthly spending
  const monthlySpendingData = (() => {
    const monthlyMap: { [key: string]: number } = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
    }

    tenantPOs
      .filter(p => p.status !== 'Cancelled' && p.status !== 'Draft')
      .forEach(p => {
        const key = p.date.substring(0, 7); // YYYY-MM
        if (monthlyMap[key] !== undefined) {
          monthlyMap[key] += p.materialCosts || 0;
        }
      });

    return Object.keys(monthlyMap).map(k => {
      const [yr, mo] = k.split('-');
      const label = `${months[parseInt(mo) - 1]} ${yr.substring(2)}`;
      return { month: label, Spending: monthlyMap[k] };
    });
  })();

  // 2. Spending by Supplier
  const spendingBySupplierData = (() => {
    const supplierMap: { [key: string]: number } = {};
    tenantPOs
      .filter(p => p.status !== 'Cancelled' && p.status !== 'Draft')
      .forEach(p => {
        const sName = p.supplierName || 'Other / Walk-in';
        supplierMap[sName] = (supplierMap[sName] || 0) + (p.materialCosts || 0);
      });

    return Object.keys(supplierMap).map(k => ({
      name: k,
      value: supplierMap[k]
    })).sort((a, b) => b.value - a.value).slice(0, 5); // top 5
  })();

  // 3. Spending by Category
  const spendingByCategoryData = (() => {
    const categoryMap: { [key: string]: number } = {};
    tenantPOs
      .filter(p => p.status !== 'Cancelled' && p.status !== 'Draft')
      .forEach(p => {
        const firstItem = p.items?.[0]?.name || '';
        const linkedProd = products.find(pr => pr.name.toLowerCase() === firstItem.toLowerCase());
        const cat = linkedProd?.category || 'General';
        categoryMap[cat] = (categoryMap[cat] || 0) + (p.materialCosts || 0);
      });

    return Object.keys(categoryMap).map(k => ({
      name: k,
      value: categoryMap[k]
    }));
  })();

  // 4. Purchase Trend count
  const purchaseTrendData = (() => {
    const dailyMap: { [key: string]: number } = {};
    
    // Last 10 days
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = 0;
    }

    tenantPOs.forEach(p => {
      if (dailyMap[p.date] !== undefined) {
        dailyMap[p.date] += 1;
      }
    });

    return Object.keys(dailyMap).map(k => {
      const parts = k.split('-');
      const label = `${parts[1]}/${parts[2]}`;
      return { Date: label, Orders: dailyMap[k] };
    });
  })();

  // 5. Supplier Performance
  const supplierPerformanceData = enrichedSuppliers
    .filter(s => s.status === 'Active')
    .map(s => ({
      name: s.name.substring(0, 15) + (s.name.length > 15 ? '...' : ''),
      Rating: s.supplierRating,
      Orders: s.totalOrders,
      Spend: s.totalSpend
    }))
    .slice(0, 5);

  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

  // ----------------------------------------------------
  // Filtering & Search implementation
  // ----------------------------------------------------
  const filteredPOs = tenantPOs.filter(po => {
    // 1. Search query
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      po.orderNumber.toLowerCase().includes(searchLower) ||
      po.supplierName.toLowerCase().includes(searchLower) ||
      (po.items && po.items.some(item => item.name.toLowerCase().includes(searchLower))) ||
      (po.employeeName && po.employeeName.toLowerCase().includes(searchLower)) ||
      (po.notes && po.notes.toLowerCase().includes(searchLower));

    // 2. Status filter
    const poStatus = po.status || 'Draft';
    const matchesStatus = statusFilter === 'all' || poStatus.toLowerCase() === statusFilter.toLowerCase();

    // 3. Supplier filter
    const matchesSupplier = supplierFilter === 'all' || po.supplierName.toLowerCase() === supplierFilter.toLowerCase();

    // 4. Priority filter
    const poPriority = po.priorityLevel || 'Medium';
    const matchesPriority = priorityFilter === 'all' || poPriority.toLowerCase() === priorityFilter.toLowerCase();

    // 5. Date Range
    const matchesDate = 
      (!dateRange.start || po.date >= dateRange.start) &&
      (!dateRange.end || po.date <= dateRange.end);

    return matchesSearch && matchesStatus && matchesSupplier && matchesPriority && matchesDate;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.orderNumber.localeCompare(a.orderNumber)); // Chronological reverse (latest first)

  // Status badge style helper
  const getStatusBadgeStyle = (status: string = 'Draft') => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-800 text-gray-400 border-gray-700';
      case 'Submitted':
        return 'bg-blue-950/50 text-blue-400 border-blue-800/40';
      case 'Pending Approval':
        return 'bg-amber-950/50 text-amber-400 border-amber-800/40 glow-amber';
      case 'Approved':
        return 'bg-indigo-950/50 text-indigo-400 border-indigo-800/40';
      case 'Ordered':
        return 'bg-cyan-950/50 text-cyan-400 border-cyan-800/40';
      case 'Partially Received':
        return 'bg-orange-950/50 text-orange-400 border-orange-800/40';
      case 'Fully Received':
        return 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40';
      case 'Cancelled':
        return 'bg-rose-950/50 text-rose-400 border-rose-800/40';
      case 'Closed':
        return 'bg-teal-950/50 text-teal-400 border-teal-800/40';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Navigation Tabs & Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-brand-border pb-4">
        <div className="flex bg-gray-950/60 p-1 rounded-xl border border-brand-border">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 shadow-lg glow-cyan'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'orders'
                ? 'bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 shadow-lg glow-cyan'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Purchase Orders
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'suppliers'
                ? 'bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 shadow-lg glow-cyan'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Supplier Directory
          </button>
        </div>

        {isManagerOrOwner && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewPO}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg glow-cyan"
            >
              <Plus className="w-4 h-4" />
              New PO
            </button>
            <button
              onClick={handleOpenAddSupplier}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border border-brand-border hover:border-cyan-500/30 text-gray-200 rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              Add Supplier
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. DASHBOARD & SUMMARY CARDS TAB */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Procurement Summary Cards Grid (Requirement 2 style layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-brand-border">
              <div className="space-y-1">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider font-mono">PO Received</span>
                <h3 className="text-2xl font-bold text-emerald-400 font-mono">{receivedPOsCount}</h3>
                <p className="text-[10px] text-gray-400">Inventory replenished successfully</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-brand-border">
              <div className="space-y-1">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider font-mono">Total Procurement Cost</span>
                <h3 className="text-2xl font-bold text-gray-100 font-mono">
                  {activeBusiness.currency || 'KSh'} {totalProcurementCost.toLocaleString()}
                </h3>
                <p className="text-[10px] text-cyan-400 font-semibold">Active commercial flow</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-cyan-400" />
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-brand-border">
              <div className="space-y-1">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider font-mono">Approved Orders</span>
                <h3 className="text-2xl font-bold text-indigo-400 font-mono">
                  {tenantPOs.filter(p => p.status === 'Approved' || p.status === 'Ordered').length}
                </h3>
                <p className="text-[10px] text-gray-400">Awaiting cargo receipt</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center">
                <Truck className="w-5 h-5 text-indigo-400" />
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex items-center justify-between border-brand-border">
              <div className="space-y-1">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider font-mono">Draft / Pending Approval</span>
                <h3 className="text-2xl font-bold text-amber-400 font-mono">
                  {draftPOsCount + tenantPOs.filter(p => p.status === 'Pending Approval' || p.status === 'Submitted').length}
                </h3>
                <p className="text-[10px] text-amber-500">Requires management signoff</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-950/50 border border-amber-500/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
            </div>

          </div>

          {/* Large Dashboard Comprehensive Stats (Requirement 1 - 10 Core Stats) */}
          <div className="glass-panel p-6 rounded-2xl border-brand-border space-y-4">
            <h3 className="text-sm font-bold text-gray-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              Comprehensive Procurement KPI Matrix
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              
              <div className="bg-gray-950/40 p-4 rounded-xl border border-brand-border">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Total POs</span>
                <span className="text-xl font-bold text-gray-200 font-mono block mt-1">{totalPurchaseOrders}</span>
                <span className="text-[9px] text-gray-500 block">Chronological orders count</span>
              </div>

              <div className="bg-gray-950/40 p-4 rounded-xl border border-brand-border">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Approved Orders</span>
                <span className="text-xl font-bold text-indigo-400 font-mono block mt-1">{approvedPOs}</span>
                <span className="text-[9px] text-gray-500 block">Signed off by management</span>
              </div>

              <div className="bg-gray-950/40 p-4 rounded-xl border border-brand-border">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Pending POs</span>
                <span className="text-xl font-bold text-amber-400 font-mono block mt-1">{pendingPOs}</span>
                <span className="text-[9px] text-amber-500 block">Pending verification</span>
              </div>

              <div className="bg-gray-950/40 p-4 rounded-xl border border-brand-border">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Received POs</span>
                <span className="text-xl font-bold text-emerald-400 font-mono block mt-1">{receivedPOsCount}</span>
                <span className="text-[9px] text-emerald-500 block">Goods accounted in stock</span>
              </div>

              <div className="bg-gray-950/40 p-4 rounded-xl border border-brand-border">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Cancelled POs</span>
                <span className="text-xl font-bold text-rose-500 font-mono block mt-1">{cancelledPOsCount}</span>
                <span className="text-[9px] text-gray-500 block">Invalidated operations</span>
              </div>

              <div className="bg-gray-950/40 p-4 rounded-xl border border-brand-border">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Procurement Value</span>
                <span className="text-lg font-bold text-gray-200 font-mono block mt-1">
                  KSh {totalProcurementCost.toLocaleString()}
                </span>
                <span className="text-[9px] text-cyan-400 block">Excludes drafts & cancels</span>
              </div>

              <div className="bg-gray-950/40 p-4 rounded-xl border border-brand-border">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Monthly Spending</span>
                <span className="text-lg font-bold text-cyan-400 font-mono block mt-1">
                  KSh {monthlySpending.toLocaleString()}
                </span>
                <span className="text-[9px] text-gray-500 block">Spending for current month</span>
              </div>

              <div className="bg-gray-950/40 p-4 rounded-xl border border-brand-border">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Outstanding POs</span>
                <span className="text-xl font-bold text-orange-400 font-mono block mt-1">{outstandingPOs}</span>
                <span className="text-[9px] text-gray-500 block">Active outstanding orders</span>
              </div>

              <div className="bg-gray-950/40 p-4 rounded-xl border border-brand-border">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Active Suppliers</span>
                <span className="text-xl font-bold text-gray-200 font-mono block mt-1">{supplierCount}</span>
                <span className="text-[9px] text-gray-500 block">Active supplier directory</span>
              </div>

              <div className="bg-gray-950/40 p-4 rounded-xl border border-brand-border">
                <span className="text-[10px] text-gray-500 font-mono uppercase block">Avg Purchase Cost</span>
                <span className="text-lg font-bold text-purple-400 font-mono block mt-1">
                  KSh {Math.round(averagePurchaseCost).toLocaleString()}
                </span>
                <span className="text-[9px] text-gray-500 block">Per validated PO issued</span>
              </div>

            </div>
          </div>

          {/* Procurement Analytics Dashboard Charts Grid (Requirement 9) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Monthly Procurement Spending */}
            <div className="glass-panel p-5 rounded-2xl border-brand-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">Monthly Procurement Spending</h4>
                  <p className="text-[10px] text-gray-500">Spend comparison over the past 6 months</p>
                </div>
                <span className="text-[11px] text-cyan-400 font-mono font-bold bg-cyan-950/50 border border-cyan-500/30 px-2.5 py-1 rounded-lg">KSh</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySpendingData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.5} />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} tickLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: '12px' }}
                      labelStyle={{ color: '#9ca3af', fontWeight: 'bold' }}
                      itemStyle={{ color: '#06b6d4' }}
                    />
                    <Bar dataKey="Spending" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Spending by Supplier */}
            <div className="glass-panel p-5 rounded-2xl border-brand-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">Spending by Supplier</h4>
                  <p className="text-[10px] text-gray-500">Distribution of expenditures among top suppliers</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingBySupplierData.length > 0 ? spendingBySupplierData : [{ name: 'No spending', value: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {spendingBySupplierData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {spendingBySupplierData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-950/20 border border-brand-border/40">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-gray-300 truncate font-sans max-w-[110px]">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-gray-200">KSh {item.value.toLocaleString()}</span>
                    </div>
                  ))}
                  {spendingBySupplierData.length === 0 && (
                    <div className="text-center text-xs text-gray-500 py-6">No purchases logged yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Chart 3: Purchase Count Trend */}
            <div className="glass-panel p-5 rounded-2xl border-brand-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">Purchase Order Frequency Trend</h4>
                  <p className="text-[10px] text-gray-500">Daily number of POs issued over last 10 days</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={purchaseTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.5} />
                    <XAxis dataKey="Date" stroke="#9ca3af" fontSize={10} tickLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: '12px' }}
                    />
                    <Area type="monotone" dataKey="Orders" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Spending by Product Category */}
            <div className="glass-panel p-5 rounded-2xl border-brand-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">Expenditure by Material Category</h4>
                  <p className="text-[10px] text-gray-500">Allocation of procurement funds by inventory category</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingByCategoryData.length > 0 ? spendingByCategoryData : [{ name: 'No categories', value: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={85}
                        dataKey="value"
                      >
                        {spendingByCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#1f2937', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {spendingByCategoryData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-950/20 border border-brand-border/40">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[(idx + 3) % COLORS.length] }}></div>
                        <span className="text-gray-300 truncate font-sans max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-gray-200">KSh {item.value.toLocaleString()}</span>
                    </div>
                  ))}
                  {spendingByCategoryData.length === 0 && (
                    <div className="text-center text-xs text-gray-500 py-6">No categorizable materials processed.</div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Supplier Performance and Dynamic Inventory Value Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Dynamic Inventory Procurement stats */}
            <div className="glass-panel p-5 rounded-2xl border-brand-border flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">Procurement Inventory Impact</h4>
                <p className="text-[10px] text-gray-500">Direct integration of goods received into stock</p>
              </div>
              
              <div className="bg-gray-950/40 p-4 rounded-xl border border-brand-border text-center space-y-2">
                <span className="text-[10px] text-gray-400 uppercase font-mono block">Total Stock Units Purchased</span>
                <span className="text-3xl font-extrabold text-emerald-400 font-mono block">{totalInventoryPurchased.toLocaleString()}</span>
                <span className="text-xs text-gray-400 block">Units automatically fed into catalog</span>
              </div>

              <div className="text-center text-xs text-gray-400 italic">
                “Goods marked as Received automatically update available stock counts and asset values in real-time.”
              </div>
            </div>

            {/* Supplier Ratings & Performance */}
            <div className="glass-panel p-5 rounded-2xl border-brand-border lg:col-span-2 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">Supplier Performance Ratings</h4>
                <p className="text-[10px] text-gray-500">Active vendors rated dynamically by delivery performance, fulfillment rates, and outlay history</p>
              </div>

              <div className="space-y-3">
                {enrichedSuppliers.filter(s => s.status === 'Active').length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2.5 border border-dashed border-brand-border/40 rounded-xl bg-gray-950/20">
                    <Truck className="w-8 h-8 text-cyan-500/40 animate-pulse" />
                    <div className="text-xs font-bold text-gray-300 font-mono uppercase tracking-wider">No suppliers registered yet</div>
                    <p className="text-[10px] text-gray-500 max-w-sm leading-relaxed">
                      Register trade vendors and execute purchase orders to dynamically generate spending outlay, delivery metrics, fulfillment scores, and performance ratings.
                    </p>
                  </div>
                ) : (
                  enrichedSuppliers.filter(s => s.status === 'Active').slice(0, 4).map((sup, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-gray-950/30 border border-brand-border gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400 font-mono">
                          {sup.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-200">{sup.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">Rep: {sup.contactPerson} • {sup.category}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-[9px] text-gray-500 block">Total Spend</span>
                          <span className="font-mono font-bold text-gray-300">KSh {sup.totalSpend.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-gray-500 block font-mono">Fulfillment</span>
                          <span className="font-mono font-bold text-emerald-400">{sup.fulfillmentRate}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-gray-500 block font-mono">Delivery</span>
                          <span className="font-mono font-bold text-cyan-400">{sup.deliveryPerformance}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-gray-500 block font-mono">Completed / POs</span>
                          <span className="font-mono font-bold text-gray-300">{sup.completedOrders} / {sup.totalOrders}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 px-2 py-1 rounded-md">
                          <span className="text-xs font-bold text-amber-400 font-mono">{sup.supplierRating}</span>
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. PURCHASE ORDERS DIRECTORY TAB */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          
          {/* Advanced Search & Filtering Bar (Requirement 10) */}
          <div className="glass-panel p-5 rounded-2xl border-brand-border space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search POs by PO number, supplier, material name, employee, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border hover:border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 placeholder-gray-500 outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setSupplierFilter('all');
                    setPriorityFilter('all');
                    setDateRange({ start: '', end: '' });
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs text-gray-400 hover:text-cyan-400 border border-brand-border rounded-xl hover:bg-gray-900 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>

            </div>

            {/* Multi-Filter Rows */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-brand-border/40">
              
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-mono uppercase">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-gray-950/40 border border-brand-border rounded-xl px-2.5 py-2 text-xs text-gray-300 outline-none focus:border-cyan-500/50"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="pending approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="ordered">Ordered</option>
                  <option value="partially received">Partially Received</option>
                  <option value="fully received">Fully Received</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-mono uppercase">Supplier / Vendor</label>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="w-full bg-gray-950/40 border border-brand-border rounded-xl px-2.5 py-2 text-xs text-gray-300 outline-none focus:border-cyan-500/50"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-mono uppercase">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-gray-950/40 border border-brand-border rounded-xl px-2.5 py-2 text-xs text-gray-300 outline-none focus:border-cyan-500/50"
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-mono uppercase">Expected Delivery Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full bg-gray-950/40 border border-brand-border rounded-xl px-1.5 py-1 text-[11px] text-gray-300 outline-none"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full bg-gray-950/40 border border-brand-border rounded-xl px-1.5 py-1 text-[11px] text-gray-300 outline-none"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Chronological List of Purchase Orders (Requirement 3) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 font-mono">
                Showing {filteredPOs.length} Purchase Orders of {totalPurchaseOrders} total
              </span>
              <span className="text-xs text-gray-400">Chronological list (Latest First)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPOs.map((po) => {
                const totalCostVal = po.materialCosts || 0;
                const materialName = po.items?.[0]?.name || 'N/A';
                const materialQty = po.items?.[0]?.quantity || 0;
                const materialUnitPrice = po.items?.[0]?.unitPrice || 0;
                const poStatus = po.status || 'Draft';
                const priority = po.priorityLevel || 'Medium';

                return (
                  <div 
                    key={po.id} 
                    className="glass-panel p-5 rounded-2xl border-brand-border/80 hover:border-cyan-500/20 transition-all flex flex-col justify-between space-y-4 relative group hover:shadow-lg hover:shadow-cyan-500/2"
                  >
                    
                    {/* Upper Line: PO Number & Badge & Priority */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-100 font-mono">{po.orderNumber}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 border rounded font-bold uppercase ${
                            priority === 'Urgent' ? 'bg-red-950/40 text-red-400 border-red-500/20' :
                            priority === 'High' ? 'bg-orange-950/40 text-orange-400 border-orange-500/20' :
                            priority === 'Medium' ? 'bg-blue-950/40 text-blue-400 border-blue-500/20' :
                            'bg-gray-900 text-gray-400 border-gray-800'
                          }`}>
                            {priority}
                          </span>
                        </div>
                        <span className="text-[11px] text-cyan-400 block font-semibold truncate max-w-[200px]">{po.supplierName}</span>
                      </div>
                      
                      {/* Status Badge */}
                      <span className={`text-[10px] px-2 py-1 font-bold border rounded-lg uppercase shrink-0 ${getStatusBadgeStyle(poStatus)}`}>
                        {poStatus}
                      </span>
                    </div>

                    {/* Material detail line */}
                    <div className="bg-gray-950/40 p-3 rounded-xl border border-brand-border/60 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-mono">Product/Material:</span>
                        <span className="text-gray-200 font-bold text-right truncate max-w-[180px]">{materialName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-mono">Quantity:</span>
                        <span className="text-gray-200 font-mono">{materialQty} Units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-mono">Unit Cost:</span>
                        <span className="text-gray-200 font-mono">KSh {materialUnitPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-brand-border/40 pt-1.5 font-bold">
                        <span className="text-gray-300">Total Purchase Cost:</span>
                        <span className="text-cyan-400 font-mono">KSh {totalCostVal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Timestamps & Personnel details */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 border-t border-brand-border/40 pt-2.5">
                      <div>
                        <span className="block font-mono">Date Created:</span>
                        <span className="text-gray-400 font-semibold">{po.date}</span>
                      </div>
                      <div>
                        <span className="block font-mono">Expected Delivery:</span>
                        <span className="text-amber-500 font-semibold">{po.expectedDeliveryDate || 'Not set'}</span>
                      </div>
                      <div className="col-span-2 mt-1">
                        <span className="font-mono">Created By:</span> <span className="text-gray-400 font-semibold">{po.employeeName || 'Unknown personnel'}</span>
                      </div>
                    </div>

                    {/* Interactive Action Workflows (Requirement 7 Status Stepper) */}
                    <div className="border-t border-brand-border/40 pt-3 flex flex-col gap-2">
                      <div className="text-[10px] text-gray-500 uppercase font-mono">Workflow controls (Managers/Owners)</div>
                      
                      <div className="flex flex-wrap items-center gap-1.5">
                        
                        {/* Draft -> Submitted */}
                        {poStatus === 'Draft' && (
                          <button
                            onClick={() => handleUpdatePOStatus(po.id, 'Submitted')}
                            disabled={!isManagerOrOwner}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                              isManagerOrOwner 
                                ? 'bg-blue-950/40 text-blue-400 border-blue-500/20 hover:bg-blue-900/40' 
                                : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                            }`}
                          >
                            Submit PO
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {/* Submitted -> Approved */}
                        {(poStatus === 'Submitted' || poStatus === 'Pending Approval' || poStatus === 'Draft') && (
                          <button
                            onClick={() => handleUpdatePOStatus(po.id, 'Approved')}
                            disabled={!isManagerOrOwner}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                              isManagerOrOwner 
                                ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/20 hover:bg-indigo-900/40' 
                                : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                            }`}
                          >
                            Approve PO
                            <Check className="w-3 h-3" />
                          </button>
                        )}

                        {/* Approved -> Ordered */}
                        {poStatus === 'Approved' && (
                          <button
                            onClick={() => handleUpdatePOStatus(po.id, 'Ordered')}
                            disabled={!isManagerOrOwner}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                              isManagerOrOwner 
                                ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/20 hover:bg-cyan-900/40' 
                                : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                            }`}
                          >
                            Mark Ordered
                            <Truck className="w-3 h-3" />
                          </button>
                        )}

                        {/* Ordered -> Received & Replenish Stock */}
                        {(poStatus === 'Ordered' || poStatus === 'Approved') && (
                          <>
                            <button
                              onClick={() => handleUpdatePOStatus(po.id, 'Partially Received')}
                              disabled={!isManagerOrOwner}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                                isManagerOrOwner 
                                  ? 'bg-orange-950/40 text-orange-400 border-orange-500/20 hover:bg-orange-900/40' 
                                  : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                              }`}
                            >
                              Partially Received
                              <Clock className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleUpdatePOStatus(po.id, 'Fully Received')}
                              disabled={!isManagerOrOwner}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                                isManagerOrOwner 
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20 hover:bg-emerald-900/40 glow-emerald' 
                                  : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                              }`}
                            >
                              Fully Received
                              <CheckCircle className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        {/* Received -> Closed */}
                        {(poStatus === 'Fully Received' || poStatus === 'Partially Received') && (
                          <button
                            onClick={() => handleUpdatePOStatus(po.id, 'Closed')}
                            disabled={!isManagerOrOwner}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                              isManagerOrOwner 
                                ? 'bg-teal-950/40 text-teal-400 border-teal-500/20 hover:bg-teal-900/40' 
                                : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                            }`}
                          >
                            Close Order
                            <CheckCircle className="w-3 h-3" />
                          </button>
                        )}

                        {/* Cancel Option for un-fulfilled */}
                        {poStatus !== 'Cancelled' && poStatus !== 'Closed' && poStatus !== 'Fully Received' && (
                          <button
                            onClick={() => handleUpdatePOStatus(po.id, 'Cancelled')}
                            disabled={!isManagerOrOwner}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                              isManagerOrOwner 
                                ? 'bg-rose-950/40 text-rose-400 border-rose-500/20 hover:bg-rose-900/40' 
                                : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                            }`}
                          >
                            Cancel PO
                            <X className="w-3 h-3" />
                          </button>
                        )}

                        {/* Permanent Delete Option */}
                        {isManagerOrOwner && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you absolutely sure you want to permanently delete purchase order ${po.orderNumber}?\nThis operation is irreversible.`)) {
                                deleteProcurement(po.id);
                                alert(`Purchase order ${po.orderNumber} deleted successfully.`);
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition bg-rose-950/20 text-rose-400 border-rose-500/20 hover:bg-rose-900/40 cursor-pointer"
                            title="Delete Purchase Order Permanently"
                          >
                            Delete PO
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}

                      </div>

                      {/* Modal trigger details */}
                      <button
                        onClick={() => {
                          setSelectedPO(po);
                          setIsPODetailModalOpen(true);
                        }}
                        className="w-full text-center py-2 text-[10px] bg-gray-900 border border-brand-border rounded-lg text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 transition font-mono uppercase"
                      >
                        Inspect Full Metadata details
                      </button>

                    </div>

                  </div>
                );
              })}

              {filteredPOs.length === 0 && (
                <div className="col-span-2 glass-panel p-12 rounded-2xl border-brand-border text-center space-y-4">
                  <AlertCircle className="w-12 h-12 text-gray-500 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-300">No Purchase Orders Found</h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                      No purchase orders match your active query filters. Try clearing some filters or creating a new PO if authorized.
                    </p>
                  </div>
                  {isManagerOrOwner && (
                    <button
                      onClick={handleOpenNewPO}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      Issue First Purchase Order
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. SUPPLIER DIRECTORY TAB (Requirement 6) */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-950/40 p-4 border border-brand-border rounded-xl">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-200 font-mono block">
                Supplier Directory Profile
              </span>
              <span className="text-[10px] text-gray-400 font-mono block">
                Active Suppliers Directory: {enrichedSuppliers.length} suppliers registered
              </span>
            </div>
            
            {isManagerOrOwner && (
              <button
                onClick={() => setIsTradeCategoryModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 border border-brand-border hover:border-cyan-500/30 text-gray-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Tag className="w-4 h-4 text-cyan-400" />
                Manage Trade Categories
              </button>
            )}
          </div>

          {enrichedSuppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 border border-dashed border-brand-border rounded-2xl bg-gray-950/10">
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/20 rounded-2xl text-cyan-400">
                <Truck className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">No suppliers registered yet</div>
              <p className="text-xs text-gray-500 max-w-sm">
                Add trade vendors, manufacturers, and agribusiness distributors. Track procurement contracts, delivery times, and financial outlay.
              </p>
              {isManagerOrOwner && (
                <button
                  onClick={handleOpenAddSupplier}
                  className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg glow-cyan cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Register First Supplier
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrichedSuppliers.map((sup) => (
                <div 
                  key={sup.id} 
                  className={`glass-panel p-5 rounded-2xl border-brand-border flex flex-col justify-between space-y-4 transition ${
                    sup.status === 'Archived' ? 'opacity-65' : ''
                  }`}
                >
                  
                  {/* Header info */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] text-cyan-400 font-semibold font-mono uppercase tracking-wider">{sup.category}</span>
                      <span className={`text-[9px] px-2 py-0.5 font-bold border rounded-lg ${
                        sup.status === 'Active' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' :
                        sup.status === 'Inactive' ? 'bg-amber-950/40 text-amber-400 border-amber-500/20' :
                        'bg-gray-800 text-gray-500 border-gray-700'
                      }`}>
                        {sup.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-100">{sup.name}</h4>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-gray-400 font-mono">Representative:</span>
                      <span className="text-gray-300 font-semibold">{sup.contactPerson}</span>
                    </div>
                  </div>

                  {/* Star rating */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400 mr-1.5">Rating:</span>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${
                          i < Math.round(sup.supplierRating) 
                            ? 'text-amber-400 fill-amber-400' 
                            : 'text-gray-700'
                        }`} 
                      />
                    ))}
                    <span className="text-xs text-gray-400 font-mono ml-1 font-bold">({sup.supplierRating})</span>
                  </div>

                  {/* Products supplied tag pills */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-mono uppercase block">Supplied Cargo Catalogue</span>
                    <div className="flex flex-wrap gap-1">
                      {sup.productsSupplied && sup.productsSupplied.map((prod, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 bg-gray-950/50 border border-brand-border/60 text-gray-400 rounded-md">
                          {prod}
                        </span>
                      ))}
                      {(!sup.productsSupplied || sup.productsSupplied.length === 0) && (
                        <span className="text-[10px] text-gray-500">None specified</span>
                      )}
                    </div>
                  </div>

                  {/* Procurement History Metrics */}
                  <div className="bg-gray-950/40 p-3 rounded-xl border border-brand-border grid grid-cols-2 gap-x-2 gap-y-3 text-[11px]">
                    <div>
                      <span className="text-gray-500 block font-mono">Total POs:</span>
                      <span className="font-bold text-gray-200 font-mono">{sup.totalOrders} orders</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block font-mono">Total Outlay:</span>
                      <span className="font-bold text-cyan-400 font-mono">KSh {sup.totalSpend.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block font-mono">Fulfillment Rate:</span>
                      <span className="font-bold text-emerald-400 font-mono">{sup.fulfillmentRate}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block font-mono">Delivery Performance:</span>
                      <span className="font-bold text-cyan-400 font-mono">{sup.deliveryPerformance}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block font-mono">Completed POs:</span>
                      <span className="font-bold text-gray-300 font-mono">{sup.completedOrders} orders</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block font-mono">Total Purchases:</span>
                      <span className="font-bold text-gray-300 font-mono">{sup.totalPurchases} units</span>
                    </div>
                    <div className="col-span-2 border-t border-brand-border/40 pt-1.5">
                      <span className="text-gray-500 font-mono">Last Purchase:</span> <span className="text-gray-300 font-semibold font-mono">{sup.lastPurchaseDate || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Contact Coordinates */}
                  <div className="space-y-1.5 text-[11px] text-gray-400 border-t border-brand-border/40 pt-2.5">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="font-mono">{sup.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="truncate">{sup.address}</span>
                    </div>
                  </div>

                  {/* Manager Coordinates */}
                  {isManagerOrOwner && (
                    <div className="border-t border-brand-border/40 pt-3 flex items-center justify-between gap-2">
                      
                      <button
                        onClick={() => handleOpenEditSupplier(sup)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-950 border border-brand-border hover:border-cyan-500/30 text-gray-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Edit className="w-3 h-3 text-cyan-400" />
                        Edit
                      </button>

                      <button
                        onClick={() => handleArchiveSupplier(sup)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-950 border border-brand-border hover:border-yellow-500/30 text-gray-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Archive className="w-3 h-3 text-yellow-500" />
                        {sup.status === 'Archived' ? 'Reactivate' : 'Archive'}
                      </button>

                      <button
                        onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/20 border border-rose-900/30 hover:border-rose-500 text-rose-400 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>

                    </div>
                  )}

                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: ISSUE NEW PURCHASE ORDER (Requirement 5) */}
      {/* ------------------------------------------------------------------ */}
      {isNewPOModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border-brand-border shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-gray-100 font-mono uppercase tracking-wider">
                  Issue Corporate Purchase Order
                </h3>
              </div>
              <button 
                onClick={() => setIsNewPOModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-amber-500 bg-amber-950/20 border border-amber-800/30 p-3 rounded-xl flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                PO numbers are auto-generated. Only verified Owners and Managers have signing authority.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Product selection linked to Inventory */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Product Selection (Linked to Inventory)</label>
                <select
                  value={poForm.productId}
                  onChange={(e) => handlePOProductChange(e.target.value)}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                >
                  <option value="">-- Choose Product to auto-fill --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.quantity} {p.unit} | Cost: KSh {p.costPrice})
                    </option>
                  ))}
                </select>
              </div>

              {/* Material Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Product / Material Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fertilizers"
                  value={poForm.productName}
                  onChange={(e) => setPoForm(prev => ({ ...prev, productName: e.target.value }))}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none"
                />
              </div>

              {/* Supplier Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Supplier / Vendor Name *</label>
                <select
                  value={poForm.supplierName}
                  onChange={(e) => {
                    const supName = e.target.value;
                    const matchedSupplier = suppliers.find(s => s.name.toLowerCase() === supName.toLowerCase());
                    setPoForm(prev => ({
                      ...prev,
                      supplierName: supName,
                      supplierContactName: matchedSupplier?.contactPerson || prev.supplierContactName,
                      supplierEmail: matchedSupplier?.email || prev.supplierEmail,
                      supplierPhone: matchedSupplier?.phone || prev.supplierPhone
                    }));
                  }}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                >
                  <option value="">-- Select Registered Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Priority Level</label>
                <select
                  value={poForm.priorityLevel}
                  onChange={(e) => setPoForm(prev => ({ ...prev, priorityLevel: e.target.value as any }))}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              {/* Unit Cost */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Unit Price (KSh) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={poForm.unitPrice || ''}
                  onChange={(e) => setPoForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none font-mono"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={poForm.quantity || ''}
                  onChange={(e) => setPoForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none font-mono"
                />
              </div>

              {/* Expected Delivery Date */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Expected Delivery Date</label>
                <input
                  type="date"
                  value={poForm.expectedDeliveryDate}
                  onChange={(e) => setPoForm(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                />
              </div>

              {/* Payment Terms */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Payment Terms</label>
                <select
                  value={poForm.paymentTerms}
                  onChange={(e) => setPoForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                >
                  <option value="COD">Cash on Delivery (COD)</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Advance">Advance Payment</option>
                </select>
              </div>

              {/* Supplier contact details */}
              <div className="border-t border-brand-border/40 pt-3 md:col-span-2 space-y-3">
                <span className="text-[11px] text-cyan-400 font-mono uppercase block">Supplier Contact Coordinates (Pre-fill / Override)</span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-mono uppercase">Contact Name</label>
                    <input
                      type="text"
                      placeholder="David Mwangi"
                      value={poForm.supplierContactName}
                      onChange={(e) => setPoForm(prev => ({ ...prev, supplierContactName: e.target.value }))}
                      className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-mono uppercase">Contact Email</label>
                    <input
                      type="email"
                      placeholder="info@nairobiagro.co.ke"
                      value={poForm.supplierEmail}
                      onChange={(e) => setPoForm(prev => ({ ...prev, supplierEmail: e.target.value }))}
                      className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-mono uppercase">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+254 722..."
                      value={poForm.supplierPhone}
                      onChange={(e) => setPoForm(prev => ({ ...prev, supplierPhone: e.target.value }))}
                      className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Procurement Notes / Supplier Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Notes to be displayed on purchase orders dispatched to suppliers..."
                  value={poForm.notes}
                  onChange={(e) => setPoForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none"
                />
              </div>

              {/* Internal Notes */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Internal Notes (Auditors & Managers Only)</label>
                <textarea
                  rows={2}
                  placeholder="Confidential notes kept for internal accounting audits..."
                  value={poForm.internalNotes}
                  onChange={(e) => setPoForm(prev => ({ ...prev, internalNotes: e.target.value }))}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none"
                />
              </div>

            </div>

            {/* Total calculation indicator */}
            <div className="bg-gray-950 border border-brand-border p-4 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Estimated Total Outlay:</span>
              <span className="text-xl font-bold text-cyan-400 font-mono">
                KSh {(poForm.unitPrice * poForm.quantity).toLocaleString()}
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border">
              <button
                type="button"
                onClick={() => setIsNewPOModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePOSubmit(true)}
                className="px-4 py-2 bg-gray-900 border border-brand-border text-gray-300 hover:text-white hover:border-gray-600 rounded-xl text-xs font-bold transition"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handlePOSubmit(false)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg glow-cyan"
              >
                Issue Purchase Order
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: SUPPLIER DETAILS CREATION / EDITING */}
      {/* ------------------------------------------------------------------ */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-lg rounded-2xl border-brand-border shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-gray-100 font-mono uppercase tracking-wider">
                  {selectedSupplier ? 'Edit Supplier Profile' : 'Register New Trade Supplier'}
                </h3>
              </div>
              <button 
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Supplier Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nairobi Wholesalers"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-mono uppercase block">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="Representative Name"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-mono uppercase block">Trade Category *</label>
                  {tradeCategories.length === 0 ? (
                    <div className="text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-xl px-3 py-2 leading-relaxed">
                      No trade categories available. Please create one first.
                    </div>
                  ) : (
                    <select
                      value={supplierForm.category}
                      onChange={(e) => setSupplierForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                    >
                      {tradeCategories.map(tc => (
                        <option key={tc.id} value={tc.name}>{tc.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-mono uppercase block">Phone Coordinate *</label>
                  <input
                    type="text"
                    required
                    placeholder="+254 7..."
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-mono uppercase block">Email Coordinate *</label>
                  <input
                    type="email"
                    required
                    placeholder="sales@company.com"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-mono uppercase block">Supplier Rating (1-5 Stars)</label>
                  <select
                    value={supplierForm.supplierRating}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, supplierRating: parseInt(e.target.value) }))}
                    className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                  >
                    <option value="5">5 - Premium Execution Partner</option>
                    <option value="4">4 - High Quality Delivery</option>
                    <option value="3">3 - Standard Operations</option>
                    <option value="2">2 - Occasional Delays</option>
                    <option value="1">1 - Deficient Performance</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-mono uppercase block">Status</label>
                  <select
                    value={supplierForm.status}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">Corporate Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block C, Mombasa Port Road"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase block">
                  Supplied Products Catalogue (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cements, Hybrid Seeds, Plastic Sacks"
                  value={supplierForm.productsSupplied}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, productsSupplied: e.target.value }))}
                  className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg glow-cyan"
                >
                  {selectedSupplier ? 'Save Updates' : 'Add Supplier'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: TRADE CATEGORY CRUD MANAGER */}
      {/* ------------------------------------------------------------------ */}
      {isTradeCategoryModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border-brand-border shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-gray-100 font-mono uppercase tracking-wider">
                  Manage Trade Categories
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsTradeCategoryModalOpen(false);
                  setSelectedTradeCategory(null);
                  setTradeCategoryForm({ name: '', description: '' });
                }}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Side: Categories List */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono">Existing Categories ({tradeCategories.length})</h4>
                
                <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                  {tradeCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-brand-border/40 rounded-xl bg-gray-950/20">
                      <Tag className="w-6 h-6 text-gray-600 mb-2 animate-pulse" />
                      <div className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-wider">No categories created</div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Use the registration workspace to define custom trade verticals.
                      </p>
                    </div>
                  ) : (
                    tradeCategories.map((tc) => (
                      <div 
                        key={tc.id} 
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition ${
                          selectedTradeCategory?.id === tc.id 
                            ? 'bg-cyan-950/30 border-cyan-500/50' 
                            : 'bg-gray-950/20 border-brand-border'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="text-xs font-bold text-gray-200 truncate">{tc.name}</div>
                          {tc.description && (
                            <div className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">
                              {tc.description}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenEditTradeCategory(tc)}
                            className="p-1.5 bg-gray-900 border border-brand-border hover:border-cyan-500/30 text-cyan-400 rounded-lg transition"
                            title="Edit Category"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTradeCategory(tc.id, tc.name)}
                            className="p-1.5 bg-rose-950/20 border border-rose-900/30 hover:border-rose-500 text-rose-400 rounded-lg transition"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Side: Form workspace */}
              <form onSubmit={handleSaveTradeCategory} className="space-y-4 bg-gray-950/30 p-4 border border-brand-border rounded-xl">
                <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
                  {selectedTradeCategory ? 'Modify Category' : 'Register New Category'}
                </h4>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-mono uppercase block">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grain Suppliers"
                    value={tradeCategoryForm.name}
                    onChange={(e) => setTradeCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-mono uppercase block">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details about materials or services under this category"
                    value={tradeCategoryForm.description}
                    onChange={(e) => setTradeCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-gray-950 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {selectedTradeCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTradeCategory(null);
                        setTradeCategoryForm({ name: '', description: '' });
                      }}
                      className="w-full py-2 border border-brand-border hover:bg-gray-800 text-gray-400 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg glow-cyan"
                  >
                    {selectedTradeCategory ? 'Save Updates' : 'Register Category'}
                  </button>
                </div>
              </form>

            </div>

            <div className="flex items-center justify-end pt-3 border-t border-brand-border">
              <button
                type="button"
                onClick={() => {
                  setIsTradeCategoryModalOpen(false);
                  setSelectedTradeCategory(null);
                  setTradeCategoryForm({ name: '', description: '' });
                }}
                className="px-5 py-2 text-xs font-semibold text-gray-300 bg-gray-900 border border-brand-border hover:bg-gray-800 rounded-xl transition"
              >
                Close Manager
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: FULL DETAILED PO METADATA REVIEW */}
      {/* ------------------------------------------------------------------ */}
      {isPODetailModalOpen && selectedPO && (
        <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-xl rounded-2xl border-brand-border shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-gray-100 font-mono uppercase tracking-wider">
                  Review Procurement Order: {selectedPO.orderNumber}
                </h3>
              </div>
              <button 
                onClick={() => setIsPODetailModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper overview */}
            <div className="bg-gray-950 p-4 rounded-xl border border-brand-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 uppercase font-mono">Current Status:</span>
                <span className={`text-[10px] px-2 py-0.5 border font-bold uppercase rounded ${getStatusBadgeStyle(selectedPO.status || 'Draft')}`}>
                  {selectedPO.status || 'Draft'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                  style={{
                    width: selectedPO.status === 'Draft' ? '14%' :
                           selectedPO.status === 'Submitted' ? '28%' :
                           selectedPO.status === 'Pending Approval' ? '42%' :
                           selectedPO.status === 'Approved' ? '56%' :
                           selectedPO.status === 'Ordered' ? '70%' :
                           selectedPO.status === 'Partially Received' ? '84%' :
                           selectedPO.status === 'Fully Received' ? '100%' : '100%'
                  }}
                />
              </div>
            </div>

            {/* General specs */}
            <div className="space-y-3 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-950/20 p-3 rounded-lg border border-brand-border/40">
                  <span className="text-[10px] text-gray-500 font-mono block">Supplier Vendor</span>
                  <span className="font-bold text-gray-200">{selectedPO.supplierName}</span>
                </div>
                <div className="bg-gray-950/20 p-3 rounded-lg border border-brand-border/40">
                  <span className="text-[10px] text-gray-500 font-mono block">Total Expenditures</span>
                  <span className="font-bold text-cyan-400 font-mono">KSh {selectedPO.materialCosts?.toLocaleString() || '0'}</span>
                </div>
                <div className="bg-gray-950/20 p-3 rounded-lg border border-brand-border/40">
                  <span className="text-[10px] text-gray-500 font-mono block">Expected Delivery</span>
                  <span className="font-bold text-gray-200 font-mono">{selectedPO.expectedDeliveryDate || 'N/A'}</span>
                </div>
                <div className="bg-gray-950/20 p-3 rounded-lg border border-brand-border/40">
                  <span className="text-[10px] text-gray-500 font-mono block">Payment Terms</span>
                  <span className="font-bold text-gray-200 font-mono">{(selectedPO as any).paymentTerms || 'COD'}</span>
                </div>
              </div>

              {/* Items detail list */}
              <div className="border border-brand-border rounded-xl overflow-hidden">
                <div className="bg-gray-950 p-2 text-[10px] font-mono text-gray-400 uppercase grid grid-cols-3">
                  <span>Product / Material</span>
                  <span className="text-center">Quantity</span>
                  <span className="text-right font-mono">Unit Price</span>
                </div>
                {selectedPO.items && selectedPO.items.map((item, idx) => (
                  <div key={idx} className="p-3 grid grid-cols-3 text-xs border-t border-brand-border/40 text-gray-300">
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-center">{item.quantity} units</span>
                    <span className="text-right font-mono">KSh {item.unitPrice.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Vendor Coordinates */}
              <div className="p-4 bg-gray-950/30 rounded-xl border border-brand-border/60 space-y-2">
                <span className="text-[10px] text-cyan-400 uppercase font-mono block">Dispatched Vendor Coordinates</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-400">
                  <div>
                    <span className="text-gray-500 block">Contact Name:</span>
                    <span className="text-gray-300">{(selectedPO as any).supplierContactName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Phone Coordinate:</span>
                    <span className="text-gray-300">{(selectedPO as any).supplierPhone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Email Coordinate:</span>
                    <span className="text-gray-300 truncate block">{(selectedPO as any).supplierEmail || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedPO.notes && (
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-mono block">Procurement Instructions / Supplier Notes</span>
                  <p className="bg-gray-950/40 p-2.5 rounded-lg border border-brand-border/40 text-gray-300 leading-relaxed italic">
                    {selectedPO.notes}
                  </p>
                </div>
              )}

              {/* Internal Confidential Notes */}
              {(selectedPO as any).internalNotes && (
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase font-mono block">Confidential Internal Notes</span>
                  <p className="bg-gray-950/40 p-2.5 rounded-lg border border-brand-border/40 text-gray-300 leading-relaxed font-mono">
                    {(selectedPO as any).internalNotes}
                  </p>
                </div>
              )}

              {/* Creation metadata details */}
              <div className="pt-3 border-t border-brand-border flex items-center justify-between text-[11px] text-gray-500 font-mono">
                <span>Dispatched: {selectedPO.date}</span>
                <span>Personnel: {selectedPO.employeeName || 'System'}</span>
              </div>

              {/* Inventory Sync Status */}
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/20 border border-emerald-800/20 p-2 rounded-lg">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>
                  {(selectedPO as any).inventoryUpdated 
                    ? 'Inventory updated automatically. Repleted stock count and asset valuations synced.' 
                    : 'Awaiting transition to Fully/Partially Received status to automatically replenish stock counts.'
                  }
                </span>
              </div>

            </div>

            {/* Footer Close */}
            <div className="flex justify-end pt-3 border-t border-brand-border">
              <button
                onClick={() => setIsPODetailModalOpen(false)}
                className="px-5 py-2.5 bg-gray-900 border border-brand-border text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition"
              >
                Close Metadata Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
