import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, Product, Procurement, Branch } from '../types';
import { formatKSh } from '../lib/utils';
import { 
  Package, Search, Plus, Edit, Trash2, ShieldAlert,
  ArrowDownCircle, Lock, X, Check, Filter, Truck, ArrowUpRight, 
  ArrowDownRight, RefreshCw, ClipboardCheck, ClipboardList, AlertCircle,
  LayoutGrid, List as ListIcon, Sparkles, TrendingUp
} from 'lucide-react';
import { InventoryDashboardStats } from './InventoryDashboardStats';
import { ProductModal } from './ProductModal';
import { BulkAdjustmentModal } from './BulkAdjustmentModal';
import { ProductCard } from './ProductCard';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  type: 'Receive' | 'Transfer' | 'Audit Adjustment';
  quantity: number;
  reason: string;
  requestedBy: string;
  requestedRole: UserRole;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
}

export const InventoryModule: React.FC = () => {
  const { 
    products, 
    procurements,
    activeUser, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    addProcurement,
    updateProcurement,
    deleteProcurement,
    sales,
    branches,
    tasks
  } = useApp();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'Catalog' | 'Movements' | 'Procurements' | 'Intelligence' | 'Bulk'>('Catalog');

  // Integrated performance monitor hook
  usePerformanceMonitor('InventoryModule', {
    deps: [products.length, procurements.length, activeTab]
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Archived'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'qty-asc' | 'qty-desc' | 'profit'>('name');

  // Modals visibility
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    const handleTriggerAddProduct = () => {
      setEditingProduct(null);
      setShowProductModal(true);
    };
    window.addEventListener('trigger-add-product-form', handleTriggerAddProduct);
    return () => {
      window.removeEventListener('trigger-add-product-form', handleTriggerAddProduct);
    };
  }, []);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Stock adjustments
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);

  // Procurement Form fields
  const [showProcurementModal, setShowProcurementModal] = useState(false);
  const [procSupplier, setProcSupplier] = useState('');
  const [procNotes, setProcNotes] = useState('');
  const [procMaterialCosts, setProcMaterialCosts] = useState(0);
  const [procPayStatus, setProcPayStatus] = useState<'Unpaid' | 'Paid' | 'Partially Paid'>('Paid');
  const [procDelStatus, setProcDelStatus] = useState<'Pending' | 'Shipped' | 'Delivered'>('Delivered');
  const [procItems, setProcItems] = useState<{ name: string; quantity: number; unitPrice: number }[]>([]);
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  // Edit/Delete Procurement
  const [showEditProcModal, setShowEditProcModal] = useState(false);
  const [editingProc, setEditingProc] = useState<Procurement | null>(null);
  const [showDeleteProcModal, setShowDeleteProcModal] = useState(false);
  const [procToDelete, setProcToDelete] = useState<Procurement | null>(null);

  const [editProcSupplier, setEditProcSupplier] = useState('');
  const [editProcNotes, setEditProcNotes] = useState('');
  const [editProcMaterialCosts, setEditProcMaterialCosts] = useState(0);
  const [editProcPayStatus, setEditProcPayStatus] = useState<'Unpaid' | 'Paid' | 'Partially Paid'>('Paid');
  const [editProcDelStatus, setEditProcDelStatus] = useState<'Pending' | 'Shipped' | 'Delivered'>('Delivered');

  // Retrieve category objects from AppContext
  const { 
    categories: dbCategories, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    isCategoriesEnabled,
    setCategoriesEnabled
  } = useApp();

  // Local state for Category CRUD Manager
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [catError, setCatError] = useState('');
  const [catSuccess, setCatSuccess] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<any | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('Uncategorized');

  // Category list, merging predefined ones with custom ones in products list
  const categories = useMemo(() => {
    if (!isCategoriesEnabled) {
      return ['All', 'Uncategorized'];
    }
    const list = dbCategories.map(c => c.name);
    if (!list.includes('Uncategorized')) {
      list.push('Uncategorized');
    }
    return ['All', ...list];
  }, [dbCategories, isCategoriesEnabled]);

  // Task Delegation Override Logic
  const assignedInventoryTask = useMemo(() => {
    if (!tasks || !activeUser) return undefined;
    return tasks.find(t => 
      t.assignedToId === activeUser.id && 
      t.status !== 'Completed' && 
      (t.title.toLowerCase().includes('inventory') || 
       t.title.toLowerCase().includes('stock') || 
       t.title.toLowerCase().includes('price') || 
       t.title.toLowerCase().includes('supplier') || 
       t.title.toLowerCase().includes('audit'))
    );
  }, [tasks, activeUser]);

  const hasDelegatedAccess = assignedInventoryTask !== undefined;
  const isEmployee = activeUser.role === UserRole.EMPLOYEE && !hasDelegatedAccess;
  const isAuthorizedManager = activeUser.role === UserRole.ADMIN || activeUser.role === UserRole.MANAGER || hasDelegatedAccess;

  // Load stock adjustments on load and filter by products belonging to the active business
  useEffect(() => {
    const saved = localStorage.getItem('stock_adjustments');
    let loaded: StockAdjustment[] = [];
    if (saved) {
      try {
        loaded = JSON.parse(saved);
      } catch (err) {
        console.error(err);
      }
    }
    // Filter to only include products belonging to the current business to ensure perfect tenant isolation
    const productIds = new Set(products.map(p => p.id));
    const filtered = loaded.filter(adj => productIds.has(adj.productId));
    setAdjustments(filtered);
  }, [products]);

  // Restrict employee from remaining on intelligence or procurement tab
  useEffect(() => {
    if (isEmployee && (activeTab === 'Intelligence' || activeTab === 'Procurements' || activeTab === 'Bulk')) {
      setActiveTab('Catalog');
    }
  }, [isEmployee, activeTab]);

  // Filter & sort products for catalog
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search matches
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (p.supplier && p.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Category matches
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      
      // Stock Alert filter
      let matchesStock = true;
      if (stockFilter === 'Archived') {
        matchesStock = p.archived === true;
      } else {
        // Hide archived records by default for standard filters
        if (p.archived) return false;

        if (stockFilter === 'In Stock') {
          matchesStock = p.quantity > 0;
        } else if (stockFilter === 'Low Stock') {
          matchesStock = p.quantity > 0 && p.quantity <= (p.minStockAlert || 5);
        } else if (stockFilter === 'Out of Stock') {
          matchesStock = p.quantity === 0;
        }
      }

      return matchesSearch && matchesCategory && matchesStock;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
      if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
      if (sortBy === 'qty-asc') return a.quantity - b.quantity;
      if (sortBy === 'qty-desc') return b.quantity - a.quantity;
      if (sortBy === 'profit') {
        const profitA = a.sellingPrice - a.costPrice;
        const profitB = b.sellingPrice - b.costPrice;
        return profitB - profitA;
      }
      return 0;
    });
  }, [products, searchTerm, selectedCategory, stockFilter, sortBy]);

  // ADD CATEGORY INLINE IN PORTFOLIO MODAL
  const handleAddCategory = (newCat: string) => {
    // Automatically register the custom category to the global database if it doesn't already exist
    const trimmedCat = newCat.trim();
    if (trimmedCat) {
      const exists = dbCategories.some(c => c.name.toLowerCase() === trimmedCat.toLowerCase());
      if (!exists) {
        try {
          addCategory({ name: trimmedCat, description: 'Added inline during product registration.' });
        } catch (err) {
          console.error('Failed to auto-register inline category:', err);
        }
      }
    }
    setSelectedCategory(trimmedCat);
  };

  // OPEN PRODUCT CREATOR MODAL
  const handleOpenAddProduct = () => {
    if (isEmployee) return;
    setEditingProduct(null);
    setShowProductModal(true);
  };

  // OPEN PRODUCT MODIFIER MODAL
  const handleOpenEditProduct = (p: Product) => {
    if (isEmployee) return;
    setEditingProduct(p);
    setShowProductModal(true);
  };

  // SAVE PRODUCT IN CATALOG PORTFOLIO
  const handleProductSave = (data: any) => {
    if (isEmployee) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, data);
      alert(`Product portfolio for "${data.name}" updated successfully.`);
    } else {
      addProduct(data);
      alert(`Product portfolio for "${data.name}" registered successfully.`);
    }
    setShowProductModal(false);
    setEditingProduct(null);
  };

  // DUPLICATE PRODUCT SKU PORTFOLIO
  const handleDuplicateProduct = (p: Product) => {
    if (isEmployee) return;
    const cloned = {
      ...p,
      name: `${p.name} (Copy)`,
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}-CLONE`,
      barcode: '600' + Math.floor(100000000 + Math.random() * 900000000),
      qrCode: p.qrCode ? `${p.qrCode}-COPY` : '',
      quantity: 1 // reset stock on clone
    };
    // omit properties managed by engine
    const { id, businessId, stockStatus, ...payload } = cloned as any;
    addProduct(payload);
    alert(`SKU "${p.name}" duplicated successfully under target code "${cloned.sku}"`);
  };

  // ARCHIVE OR RESTORE CATALOG PRODUCT
  const handleArchiveProduct = (p: Product, archive: boolean) => {
    if (isEmployee) return;
    updateProduct(p.id, { archived: archive });
    alert(`Product SKU "${p.name}" ${archive ? 'archived' : 'restored'} successfully.`);
  };

  // QUICK SELLING PRICE ADJUSTMENT POPOVER
  const handleQuickPriceUpdate = (productId: string, newPrice: number) => {
    if (isEmployee) return;
    updateProduct(productId, { sellingPrice: newPrice });
    alert('Selling Price updated instantly.');
  };

  // SUBMIT STOCK INTAKE / OUTTAKE MOVEMENT REQUESTS
  const handleAdjustStock = (productId: string, qty: number, type: 'Receive' | 'Transfer', reason: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const newMovement: StockAdjustment = {
      id: 'adj_' + Date.now(),
      productId,
      productName: prod.name,
      type,
      quantity: qty,
      reason,
      requestedBy: activeUser.name || 'System Operator',
      requestedRole: activeUser.role,
      status: isAuthorizedManager ? 'Approved' : 'Pending',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    // If active operator is manager or owner, apply stock value directly!
    if (isAuthorizedManager) {
      let finalQty = prod.quantity;
      if (type === 'Receive') {
        finalQty += qty;
      } else {
        finalQty = Math.max(0, finalQty - qty);
      }
      updateProduct(productId, { quantity: finalQty });
      newMovement.status = 'Approved';
      alert(`Intake update applied instantly. Stock count is now ${finalQty}.`);
    } else {
      alert(`Request logged. Pending authorization by an Admin or Manager.`);
    }

    const updated = [newMovement, ...adjustments];
    setAdjustments(updated);
    localStorage.setItem('stock_adjustments', JSON.stringify(updated));
  };

  // STOCK TRANSFER BETWEEN ENTERPRISE BRANCHES
  const handleTransferStockBranches = (productId: string, qty: number, targetId: string, targetName: string) => {
    if (isEmployee) return;
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    // Deduct from current warehouse stock
    const nextQty = Math.max(0, prod.quantity - qty);
    updateProduct(productId, { quantity: nextQty });

    // Record adjustment log
    const newMovement: StockAdjustment = {
      id: 'adj_tr_' + Date.now(),
      productId,
      productName: prod.name,
      type: 'Transfer',
      quantity: qty,
      reason: `Inter-branch stock transfer to: ${targetName}`,
      requestedBy: activeUser.name || 'System Administrator',
      requestedRole: activeUser.role,
      status: 'Approved',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const updated = [newMovement, ...adjustments];
    setAdjustments(updated);
    localStorage.setItem('stock_adjustments', JSON.stringify(updated));
    alert(`Transferred ${qty} ${prod.unit} of "${prod.name}" to branch ${targetName} instantly!`);
  };

  // APPROVE STOCK MOVEMENT REQUESTS
  const handleApproveAdjustment = (adj: StockAdjustment) => {
    if (!isAuthorizedManager) {
      alert('Action Restricted: Only Managers or Admins can approve stock changes.');
      return;
    }

    const prod = products.find(p => p.id === adj.productId);
    if (!prod) {
      alert('Target catalog product no longer exists.');
      return;
    }

    let nextQty = prod.quantity;
    if (adj.type === 'Receive') {
      nextQty += adj.quantity;
    } else {
      if (prod.quantity < adj.quantity) {
        alert(`Insufficient stock. "${prod.name}" only has ${prod.quantity} units left.`);
        return;
      }
      nextQty -= adj.quantity;
    }

    updateProduct(adj.productId, { quantity: nextQty });

    const updated = adjustments.map(a => a.id === adj.id ? { ...a, status: 'Approved' as const } : a);
    setAdjustments(updated);
    localStorage.setItem('stock_adjustments', JSON.stringify(updated));
    alert(`Adjustment approved. Product quantity updated to ${nextQty}.`);
  };

  // REJECT STOCK MOVEMENT REQUESTS
  const handleRejectAdjustment = (adj: StockAdjustment) => {
    if (!isAuthorizedManager) {
      alert('Action Restricted: Only Managers or Admins can reject stock changes.');
      return;
    }

    const updated = adjustments.map(a => a.id === adj.id ? { ...a, status: 'Rejected' as const } : a);
    setAdjustments(updated);
    localStorage.setItem('stock_adjustments', JSON.stringify(updated));
    alert(`Adjustment request rejected.`);
  };

  // ENTERPRISE BATCH APPLY BULK PRICES
  const handleApplyBulkAdjustments = (updates: { id: string; price: number; type: 'Selling' | 'Buying' }[]) => {
    if (isEmployee) return;

    updates.forEach(item => {
      const fieldToUpdate = item.type === 'Selling' ? { sellingPrice: item.price } : { costPrice: item.price };
      updateProduct(item.id, fieldToUpdate);
    });
  };

  // PROCUREMENT RECORDING SUBMIT
  const handleAddProcurementItem = () => {
    if (!newItemName.trim() || newItemQty <= 0 || newItemPrice <= 0) return;
    setProcItems([...procItems, { name: newItemName.trim(), quantity: newItemQty, unitPrice: newItemPrice }]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const handleProcurementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procSupplier.trim()) {
      alert('Please specify a supplier name.');
      return;
    }
    if (procItems.length === 0) {
      alert('Please add at least one item to the procurement order.');
      return;
    }

    const payload = {
      supplierName: procSupplier.trim(),
      notes: procNotes.trim(),
      materialCosts: Number(procMaterialCosts) || procItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0),
      paymentStatus: procPayStatus,
      deliveryStatus: procDelStatus,
      items: procItems,
      date: new Date().toISOString().split('T')[0]
    };

    addProcurement(payload);
    alert('Procurement Invoice recorded successfully.');

    // Reset fields
    setProcSupplier('');
    setProcNotes('');
    setProcMaterialCosts(0);
    setProcItems([]);
    setShowProcurementModal(false);
  };

  // EDIT PROCUREMENT ACTIONS
  const handleOpenEditProc = (proc: Procurement) => {
    setEditingProc(proc);
    setEditProcSupplier(proc.supplierName);
    setEditProcNotes(proc.notes || '');
    setEditProcMaterialCosts(proc.materialCosts);
    setEditProcPayStatus(proc.paymentStatus);
    setEditProcDelStatus(proc.deliveryStatus);
    setShowEditProcModal(true);
  };

  const handleEditProcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProc) return;

    updateProcurement(editingProc.id, {
      supplierName: editProcSupplier,
      notes: editProcNotes,
      materialCosts: Number(editProcMaterialCosts),
      paymentStatus: editProcPayStatus,
      deliveryStatus: editProcDelStatus
    });

    alert('Procurement Invoice details updated.');
    setShowEditProcModal(false);
    setEditingProc(null);
  };

  // DELETE PROCUREMENT INVOICE
  const handleDeleteProc = (proc: Procurement) => {
    setProcToDelete(proc);
    setShowDeleteProcModal(true);
  };

  const confirmDeleteProc = () => {
    if (!procToDelete) return;
    deleteProcurement(procToDelete.id);
    alert('Procurement invoice deleted successfully.');
    setShowDeleteProcModal(false);
    setProcToDelete(null);
  };

  const handleDeleteProduct = (p: Product) => {
    if (confirm(`Are you absolutely sure you want to permanently delete product "${p.name}"?\nThis action is irreversible and will remove all stock records.`)) {
      try {
        deleteProduct(p.id);
        alert(`Product "${p.name}" was successfully deleted.`);
      } catch (err: any) {
        alert(err.message || 'Deletion failed.');
      }
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Delegated Permission Banner if active */}
      {activeUser.role === UserRole.EMPLOYEE && hasDelegatedAccess && (
        <div className="bg-cyan-950/20 border border-cyan-500/30 p-3.5 rounded-xl flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-500/15 rounded-lg text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-cyan-400 font-mono block">Delegated Management Privilege Active</span>
              <span className="text-gray-400">
                Assigned task: <span className="text-gray-200 font-semibold">"{assignedInventoryTask.title}"</span> grants you temporary permission to manage inventory and view cost margins.
              </span>
            </div>
          </div>
          <span className="bg-cyan-500 text-gray-950 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0">Delegated Access</span>
        </div>
      )}

      {/* Primary tabs navigation bar */}
      <div className="flex border-b border-brand-border/60 pb-1 gap-1.5 overflow-x-auto text-xs shrink-0 select-none">
        
        <button
          onClick={() => setActiveTab('Catalog')}
          className={`px-4 py-2 font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'Catalog' 
              ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product Catalog</span>
        </button>

        {!isEmployee && (
          <button
            onClick={() => setActiveTab('Intelligence')}
            className={`px-4 py-2 font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'Intelligence' 
                ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>Inventory Intelligence</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('Movements')}
          className={`px-4 py-2 font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'Movements' 
              ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Stock Adjustments & Transfers</span>
          {adjustments.filter(a => a.status === 'Pending').length > 0 && (
            <span className="bg-amber-500 text-gray-950 font-sans font-bold text-[9px] px-1.5 py-0.5 rounded-full shrink-0">
              {adjustments.filter(a => a.status === 'Pending').length}
            </span>
          )}
        </button>

        {!isEmployee && (
          <button
            onClick={() => setActiveTab('Procurements')}
            className={`px-4 py-2 font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'Procurements' 
                ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Procurement Invoices</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('Categories' as any)}
          className={`px-4 py-2 font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
            activeTab === ('Categories' as any) 
              ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Product Categories</span>
        </button>

        {!isEmployee && (
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 font-mono font-bold rounded-t-lg text-amber-400 hover:text-amber-300 transition whitespace-nowrap ml-auto flex items-center gap-1.5 border border-transparent hover:border-amber-500/20 bg-amber-500/5 rounded-lg cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Bulk Price Adjust</span>
          </button>
        )}

      </div>

      {/* 1. PRODUCT CATALOG TAB */}
      {activeTab === 'Catalog' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Top Quick-Glance metrics (small dashboard panel) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-950/20 p-3.5 rounded-xl border border-brand-border/60">
            <div className="text-xs">
              <span className="text-[10px] text-gray-500 font-mono block uppercase">Catalog SKUs</span>
              <span className="font-mono font-bold text-gray-200 text-sm">{products.filter(p => !p.archived).length} registered</span>
            </div>
            <div className="text-xs">
              <span className="text-[10px] text-gray-500 font-mono block uppercase">Warehouse Items</span>
              <span className="font-mono font-bold text-cyan-400 text-sm">
                {products.filter(p => !p.archived).reduce((acc, curr) => acc + curr.quantity, 0).toLocaleString()} units
              </span>
            </div>
            <div className="text-xs">
              <span className="text-[10px] text-gray-500 font-mono block uppercase">Low / Out Alerts</span>
              <span className="font-mono font-bold text-rose-400 text-sm">
                {products.filter(p => !p.archived && p.quantity === 0).length} out • {products.filter(p => !p.archived && p.quantity > 0 && p.quantity <= p.minStockAlert).length} low
              </span>
            </div>
            <div className="text-xs">
              <span className="text-[10px] text-gray-500 font-mono block uppercase">Active categories</span>
              <span className="font-mono font-bold text-gray-300 text-sm">{categories.length - 1} domains</span>
            </div>
          </div>

          {/* Directory Filters & Search */}
          <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-brand-border">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter products, scan barcodes, search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-950/60 border border-brand-border rounded-lg text-xs text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                />
              </div>

              {/* Advanced stock levels dropdown & sorters */}
              <div className="flex gap-2">
                <select
                  value={stockFilter}
                  onChange={(e: any) => setStockFilter(e.target.value)}
                  className="bg-gray-950/60 border border-brand-border rounded-lg text-xs px-3 py-1.5 text-gray-300 outline-none focus:border-cyan-500/30 font-mono"
                >
                  <option value="All">All Stocks</option>
                  <option value="In Stock">In Stock Only</option>
                  <option value="Low Stock">Low Stock Alert</option>
                  <option value="Out of Stock">Out of Stock</option>
                  <option value="Archived">Archived Records</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-gray-950/60 border border-brand-border rounded-lg text-xs px-3 py-1.5 text-gray-300 outline-none focus:border-cyan-500/30 font-mono"
                >
                  <option value="name">Sort by: Name (A-Z)</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="qty-asc">Stock: Low to High</option>
                  <option value="qty-desc">Stock: High to Low</option>
                  <option value="profit">Unit Profit Margin</option>
                </select>
              </div>
            </div>

            {/* Desktop toggle view mode + Add button */}
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-950 border border-brand-border rounded-lg p-0.5 text-gray-400">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition ${viewMode === 'grid' ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'hover:text-gray-200'}`}
                  title="Card Grid Mode"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'hover:text-gray-200'}`}
                  title="Enterprise List Mode"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>

              {isEmployee ? (
                <div className="flex items-center gap-1.5 bg-rose-950/20 border border-rose-500/20 px-3.5 py-1.5 rounded-lg text-xs text-rose-300 font-mono">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Viewer only</span>
                </div>
              ) : (
                <button
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg transition duration-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register SKU</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick horizontal categories selectors */}
          {isCategoriesEnabled && dbCategories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs select-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg transition shrink-0 border cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 font-bold font-mono' 
                      : 'bg-gray-950/30 text-gray-400 border-transparent hover:text-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Main layout container (Card grid vs. Table row) */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-16 text-center text-gray-500 text-xs font-mono">
                  No registered active product portfolios match search parameters.
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    sales={sales || []}
                    activeUser={activeUser}
                    branches={branches || []}
                    adjustments={adjustments}
                    viewMode="grid"
                    onEdit={handleOpenEditProduct}
                    onDelete={handleDeleteProduct}
                    onDuplicate={handleDuplicateProduct}
                    onArchive={handleArchiveProduct}
                    onQuickPriceUpdate={handleQuickPriceUpdate}
                    onAdjustStock={handleAdjustStock}
                    onTransferStock={handleTransferStockBranches}
                    hasDelegatedAccess={hasDelegatedAccess}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl overflow-hidden border border-brand-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950/80 border-b border-brand-border text-gray-500 font-mono text-[9px] tracking-wider uppercase">
                    <tr>
                      <th className="p-4">SKU Portfolio / Item</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 text-right">Cost Price</th>
                      <th className="p-4 text-right">Selling Price</th>
                      <th className="p-4 text-right">Warehouse Stock</th>
                      <th className="p-4">Supplier</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40 text-gray-200 font-sans">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-gray-500 font-mono">
                          No items match chosen search specifications.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          sales={sales || []}
                          activeUser={activeUser}
                          branches={branches || []}
                          adjustments={adjustments}
                          viewMode="list"
                          onEdit={handleOpenEditProduct}
                          onDelete={handleDeleteProduct}
                          onDuplicate={handleDuplicateProduct}
                          onArchive={handleArchiveProduct}
                          onQuickPriceUpdate={handleQuickPriceUpdate}
                          onAdjustStock={handleAdjustStock}
                          onTransferStock={handleTransferStockBranches}
                          hasDelegatedAccess={hasDelegatedAccess}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. INVENTORY INTELLIGENCE TAB */}
      {activeTab === 'Intelligence' && (
        <div className="animate-in fade-in duration-200">
          <InventoryDashboardStats
            products={products}
            sales={sales || []}
            activeUser={activeUser}
            adjustments={adjustments}
            onTabChange={(tab) => setActiveTab(tab)}
            hasDelegatedAccess={hasDelegatedAccess}
          />
        </div>
      )}

      {/* 3. STOCK ADJUSTMENTS & MOVEMENTS TAB */}
      {activeTab === 'Movements' && (
        <div className="space-y-4 animate-in fade-in duration-200 text-xs">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Pending stock adjustments list */}
            <div className="lg:col-span-7 space-y-4">
              <div className="glass-panel p-4 rounded-xl border border-brand-border">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3 mb-4">
                  <h4 className="text-xs font-bold text-gray-200 font-mono uppercase tracking-wider flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-cyan-400" />
                    <span>Pending Intake Authorization</span>
                  </h4>
                  <span className="bg-amber-500/10 text-amber-400 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                    {adjustments.filter(a => a.status === 'Pending').length} Pending Requests
                  </span>
                </div>

                <div className="space-y-3">
                  {adjustments.filter(a => a.status === 'Pending').length === 0 ? (
                    <div className="py-12 text-center text-gray-500 font-sans text-xs">
                      ✨ Great! All pending warehouse adjustments have been approved.
                    </div>
                  ) : (
                    adjustments.filter(a => a.status === 'Pending').map((adj) => (
                      <div key={adj.id} className="p-4 bg-gray-950/40 border border-brand-border/60 rounded-xl flex items-center justify-between gap-4 animate-in fade-in duration-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                              adj.type === 'Receive' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/10' : 'bg-amber-950/30 text-amber-400 border border-amber-500/10'
                            }`}>
                              {adj.type}
                            </span>
                            <span className="font-bold text-gray-200 font-sans text-xs">{adj.productName}</span>
                          </div>
                          
                          <p className="text-gray-400 text-xs">
                            Quantity Change: <span className="font-bold text-cyan-400 font-mono">{adj.quantity} units</span>
                          </p>
                          <p className="text-[10px] text-gray-500 italic">"Reason: {adj.reason || 'Variance correction'}"</p>
                          <div className="text-[9px] text-gray-500 font-mono mt-2">
                            <span>Requested by: </span>
                            <span className="text-gray-400 capitalize">{adj.requestedBy} ({adj.requestedRole})</span>
                            <span className="mx-1">•</span>
                            <span>{adj.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isAuthorizedManager ? (
                            <>
                              <button
                                onClick={() => handleApproveAdjustment(adj)}
                                className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleRejectAdjustment(adj)}
                                className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-[10px] text-gray-400 font-mono">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Pending Manager Audit</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Processed historical logs */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-panel p-4 rounded-xl bg-gray-950/20 border border-brand-border">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3 mb-4">
                  <h4 className="text-xs font-bold text-gray-200 font-mono uppercase tracking-wider flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-cyan-400" />
                    <span>Processed Movements Log</span>
                  </h4>
                </div>

                <div className="space-y-2.5 max-h-[450px] overflow-y-auto scrollbar-thin">
                  {adjustments.filter(a => a.status !== 'Pending').length === 0 ? (
                    <p className="text-gray-500 text-center py-6 text-xs font-mono">No historical stock movements logged.</p>
                  ) : (
                    adjustments.filter(a => a.status !== 'Pending').map((adj) => (
                      <div key={adj.id} className="p-3 bg-gray-950/30 rounded-lg border border-brand-border/40 flex items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-200 capitalize">{adj.productName}</span>
                            <span className={`text-[9px] px-1 rounded-sm font-mono font-semibold ${
                              adj.type === 'Receive' ? 'bg-emerald-950/10 text-emerald-400' : 'bg-amber-950/10 text-amber-400'
                            }`}>
                              {adj.type === 'Receive' ? '+' : '-'}{adj.quantity}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500">{adj.date} • by {adj.requestedBy}</p>
                          {adj.reason && <p className="text-[9px] text-gray-500 italic">"{adj.reason}"</p>}
                        </div>
                        
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          adj.status === 'Approved' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10' : 'bg-rose-950/20 text-rose-400 border border-rose-500/10'
                        }`}>
                          {adj.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 4. PROCUREMENT ORDERS REGISTER TAB */}
      {activeTab === 'Procurements' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          <div className="glass-panel p-5 rounded-xl border border-brand-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-200">Procurement & Bulk Intake Register</h3>
              <p className="text-xs text-gray-500">Record wholesale shipments, supplier invoices, and track delivery statuses</p>
            </div>
            
            {isEmployee ? (
              <div className="flex items-center gap-2 bg-rose-950/30 border border-rose-500/20 px-3.5 py-1.5 rounded-lg text-xs text-rose-300 font-mono">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Viewer only</span>
              </div>
            ) : (
              <button
                onClick={() => setShowProcurementModal(true)}
                className="px-4 py-2 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Procurement Order</span>
              </button>
            )}
          </div>

          {/* Procurements Invoices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {procurements.length === 0 ? (
              <div className="col-span-full glass-panel p-10 text-center text-gray-500 text-xs font-mono italic">
                No procurement invoices have been recorded yet in this corporate tenant.
              </div>
            ) : (
              procurements.map((proc) => (
                <div key={proc.id} className="glass-panel p-5 rounded-xl border border-brand-border flex flex-col justify-between space-y-4 hover:border-cyan-500/20 transition text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold font-mono text-cyan-400">{proc.orderNumber}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          proc.deliveryStatus === 'Delivered' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/10' : 'bg-amber-950/30 text-amber-400 border border-amber-500/10'
                        }`}>
                          {proc.deliveryStatus}
                        </span>
                        {!isEmployee && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditProc(proc)}
                              className="p-1 bg-gray-950 border border-brand-border/60 hover:text-cyan-400 hover:border-cyan-500/20 rounded transition cursor-pointer"
                              title="Edit Procurement Info"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteProc(proc)}
                              className="p-1 bg-gray-950 border border-brand-border/60 hover:text-rose-400 hover:border-rose-500/20 rounded transition cursor-pointer"
                              title="Delete Procurement Record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h4 className="font-semibold text-gray-100">{proc.supplierName}</h4>
                    <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{proc.date}</span>
                    
                    {proc.notes && (
                      <p className="text-[11px] text-gray-400 mt-2 line-clamp-2 italic">"{proc.notes}"</p>
                    )}

                    {/* Shipments nested items list */}
                    <div className="mt-4 border-t border-brand-border/40 pt-3.5 space-y-2">
                      <span className="text-[9px] text-gray-500 font-bold font-mono block uppercase">Items in Shipment</span>
                      {proc.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between font-mono text-gray-400">
                          <span>{item.name} (x{item.quantity})</span>
                          <span>KSh {item.unitPrice.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-brand-border/40 pt-3.5 mt-auto">
                    <div>
                      <span className="text-[9px] text-gray-500 font-mono block">Invoice Valuation</span>
                      <span className="font-mono font-bold text-gray-200">KSh {proc.materialCosts.toLocaleString()}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                      proc.paymentStatus === 'Paid' ? 'bg-emerald-950/20 text-emerald-400' : 'bg-rose-950/20 text-rose-400'
                    }`}>
                      {proc.paymentStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* 5. PRODUCT CATEGORIES TAB */}
      {activeTab === ('Categories' as any) && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          <div className="glass-panel p-5 rounded-xl border border-brand-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-200">Product Categories Manager</h3>
              <p className="text-xs text-gray-500">Create, view, update, and delete product categorization structures safely with referential integrity protection</p>
            </div>
            
            {!isEmployee && (
              <div className="flex items-center gap-2.5 bg-gray-950/40 p-2.5 rounded-lg border border-brand-border/60 shrink-0 select-none">
                <span className="text-xs font-mono text-gray-400">Enable Product Categories</span>
                <button
                  type="button"
                  onClick={() => {
                    setCategoriesEnabled(!isCategoriesEnabled);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer outline-none ${
                    isCategoriesEnabled ? 'bg-cyan-500' : 'bg-gray-800'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform left-1 ${
                      isCategoriesEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {!isCategoriesEnabled ? (
            <div className="glass-panel p-8 text-center rounded-xl border border-brand-border/60 space-y-4">
              <ClipboardList className="w-12 h-12 text-cyan-500/40 mx-auto" />
              <h4 className="text-sm font-bold text-gray-200">Product Categorization is Off</h4>
              <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
                Small businesses or traders with few products can add, manage, and sell products seamlessly without creating any categories. 
                All products are automatically cataloged as <strong className="text-cyan-400">"Uncategorized"</strong> and displayed without category filters.
              </p>
              {!isEmployee ? (
                <button
                  type="button"
                  onClick={() => setCategoriesEnabled(true)}
                  className="px-4 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 rounded-lg transition font-mono font-bold text-xs cursor-pointer"
                >
                  Enable Product Categories
                </button>
              ) : (
                <p className="text-[10px] text-gray-500 font-mono italic">
                  Product categories are currently disabled by the business owner or manager.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Category addition form */}
              <div className="glass-panel p-5 rounded-xl border border-brand-border flex flex-col gap-3.5 h-fit text-xs">
                <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider block">
                  {editingCatId ? 'Update Category' : 'Register New Category'}
                </span>

                {catError && (
                  <div className="bg-rose-950/20 border border-rose-500/20 p-2.5 rounded-lg text-rose-400 font-mono text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{catError}</span>
                  </div>
                )}

                {catSuccess && (
                  <div className="bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg text-emerald-400 font-mono text-[11px] flex items-center gap-1.5 animate-pulse">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{catSuccess}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Category Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Fresh Produce, Software"
                    value={editingCatId ? editCatName : newCatName}
                    onChange={(e) => {
                      setCatError('');
                      setCatSuccess('');
                      if (editingCatId) {
                        setEditCatName(e.target.value);
                      } else {
                        setNewCatName(e.target.value);
                      }
                    }}
                    disabled={isEmployee}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Description / Notes</label>
                  <textarea
                    placeholder="Summarize domains covered by this category..."
                    rows={4}
                    value={editingCatId ? editCatDesc : newCatDesc}
                    onChange={(e) => {
                      setCatError('');
                      setCatSuccess('');
                      if (editingCatId) {
                        setEditCatDesc(e.target.value);
                      } else {
                        setNewCatDesc(e.target.value);
                      }
                    }}
                    disabled={isEmployee}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono text-xs"
                  />
                </div>

                {isEmployee ? (
                  <div className="flex items-center gap-1.5 bg-rose-950/20 border border-rose-500/10 p-2.5 rounded-lg text-rose-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Operator role restricts category write operations.</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {editingCatId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(null);
                          setEditCatName('');
                          setEditCatDesc('');
                          setCatError('');
                          setCatSuccess('');
                        }}
                        className="flex-1 py-2 bg-gray-950 hover:bg-gray-900 border border-brand-border text-gray-400 rounded-lg transition font-mono font-bold"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const nameToSave = editingCatId ? editCatName.trim() : newCatName.trim();
                        const descToSave = editingCatId ? editCatDesc.trim() : newCatDesc.trim();

                        if (!nameToSave) {
                          setCatError('Category name is required.');
                          return;
                        }

                        // Check duplicates
                        const lowerName = nameToSave.toLowerCase();
                        const duplicate = dbCategories.some(c => c.id !== editingCatId && c.name.toLowerCase() === lowerName);
                        if (duplicate) {
                          setCatError(`A category named "${nameToSave}" already exists.`);
                          return;
                        }

                        try {
                          if (editingCatId) {
                            updateCategory(editingCatId, { name: nameToSave, description: descToSave });
                            setCatSuccess('Category updated successfully.');
                            setEditingCatId(null);
                            setEditCatName('');
                            setEditCatDesc('');
                          } else {
                            addCategory({ name: nameToSave, description: descToSave });
                            setCatSuccess(`Category "${nameToSave}" registered successfully.`);
                            setNewCatName('');
                            setNewCatDesc('');
                          }
                        } catch (err: any) {
                          setCatError(err.message || 'Operation failed.');
                        }
                      }}
                      className="flex-1 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-400 rounded-lg transition font-mono font-bold"
                    >
                      {editingCatId ? 'Save Changes' : 'Create Category'}
                    </button>
                  </div>
                )}
              </div>

              {/* Category list panel */}
              <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-brand-border flex flex-col gap-3.5 min-h-[400px]">
                <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider block">
                  Active Categories Catalog ({dbCategories.length})
                </span>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {dbCategories.map((cat) => {
                    const mappedProducts = products.filter(p => !p.archived && p.category.toLowerCase() === cat.name.toLowerCase());
                    const activeStockCount = mappedProducts.reduce((acc, curr) => acc + curr.quantity, 0);

                    return (
                      <div
                        key={cat.id}
                        className="p-4 bg-gray-950/40 border border-brand-border hover:border-cyan-500/20 rounded-xl flex items-center justify-between gap-4 transition text-xs"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-200">{cat.name}</span>
                            <span className="bg-cyan-500/10 text-cyan-400 font-mono text-[9px] px-1.5 py-0.5 rounded border border-cyan-500/5">
                              {mappedProducts.length} items ({activeStockCount} units)
                            </span>
                          </div>
                          {cat.description ? (
                            <p className="text-gray-400 text-[11px] leading-relaxed italic">"{cat.description}"</p>
                          ) : (
                            <p className="text-gray-500 text-[10px] italic">No description provided.</p>
                          )}
                        </div>

                        {!isEmployee && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setCatError('');
                                setCatSuccess('');
                                setEditingCatId(cat.id);
                                setEditCatName(cat.name);
                                setEditCatDesc(cat.description || '');
                              }}
                              className="p-2 bg-gray-950 border border-brand-border/60 hover:text-cyan-400 hover:border-cyan-500/20 rounded-lg transition cursor-pointer"
                              title="Edit Category Name & Notes"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setCatError('');
                                setCatSuccess('');
                                setDeletingCategory(cat);
                                setReassignTarget('Uncategorized');
                              }}
                              className="p-2 bg-gray-950 border border-brand-border/60 hover:text-rose-400 hover:border-rose-500/20 rounded-lg transition cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* PORTFOLIO CREATION / EDITION MODAL */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        editingProduct={editingProduct}
        onSave={handleProductSave}
        categories={dbCategories}
        onAddCategory={handleAddCategory}
        isCategoriesEnabled={isCategoriesEnabled}
        isEmployee={isEmployee}
      />

      {/* BULK PRICING ADJUSTMENT MODAL */}
      <BulkAdjustmentModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        products={products}
        categories={categories}
        onApplyAdjustment={handleApplyBulkAdjustments}
      />

      {/* CUSTOM CATEGORY DELETION & REASSIGNMENT MODAL */}
      {deletingCategory && (() => {
        const assignedProducts = products.filter(p => !p.archived && p.category.toLowerCase() === deletingCategory.name.toLowerCase());
        const hasProducts = assignedProducts.length > 0;

        return (
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200 text-xs">
              <button onClick={() => setDeletingCategory(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400 shrink-0" />
                <span>Delete Product Category</span>
              </h3>

              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  Are you sure you want to permanently delete the category <strong className="text-cyan-400">"{deletingCategory.name}"</strong>? This action cannot be undone.
                </p>

                {hasProducts ? (
                  <div className="bg-rose-950/20 border border-rose-500/20 p-3.5 rounded-xl space-y-3">
                    <p className="text-rose-400 font-medium font-mono text-[11px]">
                      ⚠️ Warning: There are {assignedProducts.length} active products assigned to this category.
                    </p>
                    <label className="text-gray-400 block font-mono">Select how to handle these products before deletion:</label>
                    <select
                      value={reassignTarget}
                      onChange={(e) => setReassignTarget(e.target.value)}
                      className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 text-xs"
                    >
                      <option value="Uncategorized">Move to default "Uncategorized" group</option>
                      {dbCategories
                        .filter(c => c.id !== deletingCategory.id)
                        .map(c => (
                          <option key={c.id} value={c.name}>
                            Move to category "{c.name}"
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-gray-400 italic font-mono text-[10px]">No active products are currently assigned to this category.</p>
                )}

                <div className="flex gap-2 font-mono">
                  <button
                    type="button"
                    onClick={() => setDeletingCategory(null)}
                    className="flex-1 py-2.5 bg-gray-950 border border-brand-border text-gray-400 rounded-lg hover:bg-gray-900 transition font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const target = hasProducts ? reassignTarget : undefined;
                        deleteCategory(deletingCategory.id, target);
                        setCatSuccess(`Successfully deleted category "${deletingCategory.name}".`);
                        setDeletingCategory(null);
                      } catch (err: any) {
                        setCatError(err.message || 'Deletion failed.');
                        setDeletingCategory(null);
                      }
                    }}
                    className="flex-1 py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/30 text-rose-400 rounded-lg transition font-bold cursor-pointer"
                  >
                    Confirm Deletion
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: ADD NEW PROCUREMENT */}
      {showProcurementModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-lg shadow-2xl relative border border-brand-border max-h-[90vh] overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowProcurementModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2 shrink-0">
              <Truck className="w-5 h-5 text-cyan-400" />
              <span>Record Wholesale Procurement Invoice</span>
            </h3>

            <form onSubmit={handleProcurementSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 font-mono">
              <div className="space-y-3 font-sans">
                <div>
                  <label className="text-gray-400 block mb-1">Wholesale Supplier Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Wholesale Distributors"
                    value={procSupplier}
                    onChange={(e) => setProcSupplier(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Remarks / Purchase Memo</label>
                  <input
                    type="text"
                    placeholder="e.g. Q3 safety reserve stock batch"
                    value={procNotes}
                    onChange={(e) => setProcNotes(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 font-sans">
                  <div>
                    <label className="text-gray-400 block mb-1">Payment Status</label>
                    <select
                      value={procPayStatus}
                      onChange={(e: any) => setProcPayStatus(e.target.value)}
                      className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partially Paid">Partially Paid</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Shipping Status</label>
                    <select
                      value={procDelStatus}
                      onChange={(e: any) => setProcDelStatus(e.target.value)}
                      className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                    >
                      <option value="Delivered">Delivered</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                {/* Sub-form to add nesting items */}
                <div className="p-3.5 bg-gray-950/50 rounded-xl border border-brand-border/60 space-y-2.5">
                  <span className="font-mono text-cyan-400 block font-semibold">Items in Order</span>
                  
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Item SKU Label / Name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="w-full bg-gray-950 border border-brand-border rounded p-2 text-gray-100 font-sans"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-gray-950 border border-brand-border rounded p-2 text-gray-100 text-center font-mono font-bold"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        placeholder="Cost per unit (KES)"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-gray-950 border border-brand-border rounded p-2 text-gray-100 text-right font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddProcurementItem}
                      className="px-3 bg-cyan-950 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900 rounded font-bold font-mono text-center flex items-center justify-center cursor-pointer"
                    >
                      Add Item
                    </button>
                  </div>

                  {/* Registered nested items log */}
                  {procItems.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-brand-border/30 max-h-[140px] overflow-y-auto">
                      {procItems.map((itm, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-mono text-gray-300">
                          <span>{itm.name} (x{itm.quantity})</span>
                          <div className="flex gap-2">
                            <span>KSh {(itm.quantity * itm.unitPrice).toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => setProcItems(procItems.filter((_, i) => i !== idx))}
                              className="text-rose-400 font-sans px-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Overridable Custom Valuation */}
                <div>
                  <label className="text-gray-400 block mb-1">Invoice Outlay Total (KES)</label>
                  <input
                    type="number"
                    value={procMaterialCosts || procItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0)}
                    onChange={(e) => setProcMaterialCosts(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 font-mono outline-none focus:border-cyan-500/30"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">Leave as calculated or type total custom cost.</span>
                </div>

              </div>

              <div className="flex justify-end gap-2 shrink-0 border-t border-brand-border/40 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowProcurementModal(false)}
                  className="px-4 py-2 bg-gray-950 hover:bg-gray-900 border border-brand-border text-gray-400 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-950 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900 rounded-lg transition font-mono font-bold"
                >
                  Confirm Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PROCUREMENT DETAILS */}
      {showEditProcModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-lg shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowEditProcModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-400" />
              <span>Modify Procurement Order</span>
            </h3>

            <form onSubmit={handleEditProcSubmit} className="space-y-4 text-xs font-mono">
              <div className="space-y-3 font-sans">
                <div>
                  <label className="text-gray-400 block mb-1">Supplier Name</label>
                  <input
                    type="text"
                    required
                    value={editProcSupplier}
                    onChange={(e) => setEditProcSupplier(e.target.value)}
                    className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Purchase Memo / Notes</label>
                  <input
                    type="text"
                    value={editProcNotes}
                    onChange={(e) => setEditProcNotes(e.target.value)}
                    className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 block mb-1">Payment Status</label>
                    <select
                      value={editProcPayStatus}
                      onChange={(e: any) => setEditProcPayStatus(e.target.value)}
                      className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partially Paid">Partially Paid</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Shipping Status</label>
                    <select
                      value={editProcDelStatus}
                      onChange={(e: any) => setEditProcDelStatus(e.target.value)}
                      className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30"
                    >
                      <option value="Delivered">Delivered</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Outlay Price Total (KES)</label>
                  <input
                    type="number"
                    value={editProcMaterialCosts}
                    onChange={(e) => setEditProcMaterialCosts(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 font-mono outline-none focus:border-cyan-500/30"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditProcModal(false)}
                  className="px-4 py-2 bg-gray-950 hover:bg-gray-900 border border-brand-border text-gray-400 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-950 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-900 rounded-lg transition font-mono font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PROCUREMENT */}
      {showDeleteProcModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-sm shadow-2xl relative border border-brand-border text-xs space-y-4 animate-in fade-in duration-150">
            <div className="text-center space-y-2">
              <span className="text-rose-400 font-mono font-bold block uppercase tracking-wider">Authorize Invoice Removal</span>
              <p className="text-gray-300">
                Are you sure you want to permanently delete procurement order <span className="font-mono text-cyan-400 font-bold">{procToDelete?.orderNumber}</span>?
              </p>
              <p className="text-[10px] text-gray-500 italic">This cannot be undone and will affect historical financial aggregates.</p>
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setShowDeleteProcModal(false)}
                className="px-4 py-2 bg-gray-950 hover:bg-gray-900 border border-brand-border text-gray-400 rounded-lg font-mono"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProc}
                className="px-4 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-400 rounded-lg font-mono font-bold"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
