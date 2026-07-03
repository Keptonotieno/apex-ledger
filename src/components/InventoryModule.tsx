import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, Product, Procurement } from '../types';
import { formatKSh } from '../lib/utils';
import { 
  Package, Search, Plus, Edit, Trash2, ShieldAlert,
  ArrowDownCircle, Lock, X, Check, Filter, Truck, ArrowUpRight, 
  ArrowDownRight, RefreshCw, ClipboardCheck, ClipboardList, AlertCircle
} from 'lucide-react';

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
    deleteProcurement
  } = useApp();

  const [activeTab, setActiveTab] = useState<'Catalog' | 'Movements' | 'Procurements'>('Catalog');
  
  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('All');

  // Form states for Add / Edit Product SKU
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Custom high-fidelity delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Product Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Electronics');
  const [formBarcode, setFormBarcode] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formSellingPrice, setFormSellingPrice] = useState(0);
  const [formQuantity, setFormQuantity] = useState(0);
  const [formUnit, setFormUnit] = useState('Units');
  const [formSupplier, setFormSupplier] = useState('');
  const [formMinStockAlert, setFormMinStockAlert] = useState(5);

  // Stock Adjustments State (Receive / Transfer / Approve)
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjProductId, setAdjProductId] = useState('');
  const [adjType, setAdjType] = useState<'Receive' | 'Transfer'>('Receive');
  const [adjQuantity, setAdjQuantity] = useState(1);
  const [adjReason, setAdjReason] = useState('');

  // Procurement Form State
  const [showProcurementModal, setShowProcurementModal] = useState(false);
  const [procSupplier, setProcSupplier] = useState('');
  const [procNotes, setProcNotes] = useState('');
  const [procMaterialCosts, setProcMaterialCosts] = useState(0);
  const [procPayStatus, setProcPayStatus] = useState<'Unpaid' | 'Paid' | 'Partially Paid'>('Paid');
  const [procDelStatus, setProcDelStatus] = useState<'Pending' | 'Shipped' | 'Delivered'>('Delivered');
  const [procItems, setProcItems] = useState<{ name: string; quantity: number; unitPrice: number }[]>([]);
  
  // Procurement item row inputs
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  // Edit and Delete states for Procurements
  const [showEditProcModal, setShowEditProcModal] = useState(false);
  const [editingProc, setEditingProc] = useState<Procurement | null>(null);
  const [showDeleteProcModal, setShowDeleteProcModal] = useState(false);
  const [procToDelete, setProcToDelete] = useState<Procurement | null>(null);

  // Edit fields for Procurement
  const [editProcSupplier, setEditProcSupplier] = useState('');
  const [editProcNotes, setEditProcNotes] = useState('');
  const [editProcMaterialCosts, setEditProcMaterialCosts] = useState(0);
  const [editProcPayStatus, setEditProcPayStatus] = useState<'Unpaid' | 'Paid' | 'Partially Paid'>('Paid');
  const [editProcDelStatus, setEditProcDelStatus] = useState<'Pending' | 'Shipped' | 'Delivered'>('Delivered');

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

    setShowEditProcModal(false);
    setEditingProc(null);
  };

  const handleDeleteProc = (proc: Procurement) => {
    setProcToDelete(proc);
    setShowDeleteProcModal(true);
  };

  const confirmDeleteProc = () => {
    if (!procToDelete) return;
    deleteProcurement(procToDelete.id);
    setShowDeleteProcModal(false);
    setProcToDelete(null);
  };

  const isEmployee = activeUser.role === UserRole.EMPLOYEE;
  const isAuthorizedManager = activeUser.role === UserRole.ADMIN || activeUser.role === UserRole.MANAGER;

  // Load stock adjustments on boot
  useEffect(() => {
    const saved = localStorage.getItem('stock_adjustments');
    if (saved) {
      setAdjustments(JSON.parse(saved));
    } else {
      const initial: StockAdjustment[] = [
        {
          id: 'adj_1',
          productId: 'p1',
          productName: 'High Performance LED Monitor',
          type: 'Receive',
          quantity: 10,
          reason: 'Consignment shipment arrived from TechSource',
          requestedBy: 'sarah manager',
          requestedRole: UserRole.MANAGER,
          status: 'Approved',
          date: '2026-06-30'
        },
        {
          id: 'adj_2',
          productId: 'p2',
          productName: 'Ergonomic Office Chair',
          type: 'Transfer',
          quantity: 2,
          reason: 'Defective unit return to ComfortSeat Co',
          requestedBy: 'john employee',
          requestedRole: UserRole.EMPLOYEE,
          status: 'Pending',
          date: '2026-07-02'
        }
      ];
      setAdjustments(initial);
      localStorage.setItem('stock_adjustments', JSON.stringify(initial));
    }
  }, []);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesStock = stockFilter === 'All' || p.stockStatus === stockFilter;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleOpenAddProduct = () => {
    if (isEmployee) return;
    setEditingProduct(null);
    setFormName('');
    setFormCategory('Electronics');
    setFormBarcode('600' + Math.floor(100000000 + Math.random() * 900000000));
    setFormSku('SKU-' + Math.floor(1000 + Math.random() * 9000));
    setFormCostPrice(0);
    setFormSellingPrice(0);
    setFormQuantity(10);
    setFormUnit('Units');
    setFormSupplier('');
    setFormMinStockAlert(5);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    if (isEmployee) return;
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormBarcode(p.barcode);
    setFormSku(p.sku);
    setFormCostPrice(p.costPrice);
    setFormSellingPrice(p.sellingPrice);
    setFormQuantity(p.quantity);
    setFormUnit(p.unit);
    setFormSupplier(p.supplier);
    setFormMinStockAlert(p.minStockAlert);
    setShowProductModal(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmployee) return;

    const data = {
      name: formName,
      category: formCategory,
      barcode: formBarcode,
      sku: formSku,
      costPrice: Number(formCostPrice),
      sellingPrice: Number(formSellingPrice),
      quantity: Number(formQuantity),
      unit: formUnit,
      supplier: formSupplier,
      minStockAlert: Number(formMinStockAlert)
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, data);
      alert(`SKU "${formName}" successfully updated!`);
    } else {
      addProduct(data);
      alert(`SKU "${formName}" successfully registered in catalog!`);
    }
    setShowProductModal(false);
  };

  const handleDeleteProduct = (p: Product) => {
    if (isEmployee) {
      alert('Access Denied: Only Business Owners or Managers can delete catalog products.');
      return;
    }
    setProductToDelete(p);
    setShowDeleteModal(true);
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;
    try {
      deleteProduct(productToDelete.id);
      alert(`Product "${productToDelete.name}" deleted successfully.`);
    } catch (err: any) {
      alert(err.message || 'Error occurred while deleting product.');
    } finally {
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  // Submit Receive/Transfer request
  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProductId || adjQuantity <= 0) return;

    const targetProd = products.find(p => p.id === adjProductId);
    if (!targetProd) return;

    // Build model
    const newAdj: StockAdjustment = {
      id: 'adj_' + Date.now(),
      productId: adjProductId,
      productName: targetProd.name,
      type: adjType,
      quantity: adjQuantity,
      reason: adjReason || 'General inventory balancing',
      requestedBy: activeUser.name,
      requestedRole: activeUser.role,
      status: isAuthorizedManager ? 'Approved' : 'Pending',
      date: new Date().toISOString().split('T')[0]
    };

    const nextAdjustments = [newAdj, ...adjustments];
    setAdjustments(nextAdjustments);
    localStorage.setItem('stock_adjustments', JSON.stringify(nextAdjustments));

    // If Admin/Manager, apply instantly
    if (isAuthorizedManager) {
      let finalQty = targetProd.quantity;
      if (adjType === 'Receive') {
        finalQty += adjQuantity;
      } else {
        finalQty = Math.max(0, finalQty - adjQuantity);
      }
      updateProduct(adjProductId, { quantity: finalQty });
      alert(`Stock adjustment of ${adjQuantity} applied immediately to catalog!`);
    } else {
      alert(`Adjustment requested. Pending authorization by an Admin or Manager.`);
    }

    // Reset fields
    setAdjProductId('');
    setAdjQuantity(1);
    setAdjReason('');
    setShowAdjustmentModal(false);
  };

  // Stock Movement Approvals
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
    } else if (adj.type === 'Transfer') {
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
    alert(`Adjustment approved. Product quantity adjusted to ${nextQty}.`);
  };

  const handleRejectAdjustment = (adj: StockAdjustment) => {
    if (!isAuthorizedManager) {
      alert('Action Restricted: Only Managers or Admins can reject stock changes.');
      return;
    }

    const updated = adjustments.map(a => a.id === adj.id ? { ...a, status: 'Rejected' as const } : a);
    setAdjustments(updated);
    localStorage.setItem('stock_adjustments', JSON.stringify(updated));
    alert('Stock adjustment request rejected.');
  };

  // Procurements Section
  const handleAddProcItem = () => {
    if (!newItemName || newItemQty <= 0) return;
    setProcItems([...procItems, { name: newItemName, quantity: newItemQty, unitPrice: newItemPrice }]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const handleRemoveProcItem = (index: number) => {
    setProcItems(procItems.filter((_, i) => i !== index));
  };

  const handleProcurementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procSupplier) return;

    const calculatedTotal = procItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const finalCost = procMaterialCosts > 0 ? procMaterialCosts : calculatedTotal;

    const orderNumber = `PR-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    addProcurement({
      supplierName: procSupplier,
      orderNumber,
      materialCosts: finalCost,
      notes: procNotes || 'Standard catalog stock replenishment',
      deliveryStatus: procDelStatus,
      paymentStatus: procPayStatus,
      items: procItems.length > 0 ? procItems : [{ name: 'Bulk Replenishment Items', quantity: 1, unitPrice: finalCost }]
    });

    alert(`Procurement order ${orderNumber} registered successfully!`);
    setShowProcurementModal(false);
    setProcSupplier('');
    setProcNotes('');
    setProcMaterialCosts(0);
    setProcItems([]);
  };

  return (
    <div className="space-y-4">
      
      {/* Navigation tabs for Inventory module */}
      <div className="flex border-b border-brand-border/60 pb-1 gap-2">
        <button
          onClick={() => setActiveTab('Catalog')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition ${
            activeTab === 'Catalog' 
              ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product Catalog</span>
        </button>
        <button
          onClick={() => setActiveTab('Movements')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition ${
            activeTab === 'Movements' 
              ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Stock Receive & Transfer</span>
          {adjustments.filter(a => a.status === 'Pending').length > 0 && (
            <span className="bg-amber-500 text-gray-950 font-sans font-bold text-[9px] px-1.5 py-0.5 rounded-full shrink-0">
              {adjustments.filter(a => a.status === 'Pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('Procurements')}
          className={`px-4 py-2 text-xs font-mono font-bold rounded-t-lg flex items-center gap-1.5 transition ${
            activeTab === 'Procurements' 
              ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Procurement Orders</span>
        </button>
      </div>

      {/* 1. CATALOG TAB */}
      {activeTab === 'Catalog' && (
        <div className="space-y-4 animate-in fade-in duration-200">
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
                </select>
              </div>
            </div>

            <div>
              {isEmployee ? (
                <div className="flex items-center gap-2 bg-rose-950/30 border border-rose-500/20 px-3.5 py-1.5 rounded-lg text-xs text-rose-300 font-mono">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Read-Only Viewer</span>
                </div>
              ) : (
                <button
                  onClick={handleOpenAddProduct}
                  className="px-4 py-2 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg transition duration-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product SKU</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs rounded-lg transition shrink-0 ${
                  selectedCategory === cat 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 font-bold' 
                    : 'bg-gray-950/30 text-gray-400 border border-transparent hover:text-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-brand-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-950/80 border-b border-brand-border text-gray-400 font-mono text-[10px] tracking-wider uppercase">
                  <tr>
                    <th className="p-4">SKU / Item Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Cost Price</th>
                    <th className="p-4 text-right">Selling Price</th>
                    <th className="p-4 text-right">Qty / Unit</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4 text-center">Status</th>
                    {!isEmployee && <th className="p-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40 text-gray-200 font-sans">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={isEmployee ? 7 : 8} className="p-8 text-center text-gray-500">
                        No items in catalog matching this search.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const outOfStock = p.quantity === 0;
                      const lowStock = p.quantity <= p.minStockAlert;

                      return (
                        <tr key={p.id} className="hover:bg-gray-900/30 transition">
                          <td className="p-4">
                            <div className="font-semibold text-gray-100">{p.name}</div>
                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>SKU: {p.sku}</span>
                              <span>|</span>
                              <span>BC: {p.barcode}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-[10px] text-gray-400 rounded-md">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono font-semibold text-gray-400">
                            KSh {p.costPrice.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-mono font-semibold text-cyan-400">
                            KSh {p.sellingPrice.toLocaleString()}
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-mono font-bold block">{p.quantity}</span>
                            <span className="text-[10px] text-gray-500">{p.unit}</span>
                          </td>
                          <td className="p-4 text-gray-400">
                            {p.supplier}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              outOfStock 
                                ? 'bg-rose-950/20 text-rose-400 border border-rose-500/10' 
                                : lowStock 
                                  ? 'bg-amber-950/20 text-amber-400 border border-amber-500/10 animate-pulse' 
                                  : 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10'
                            }`}>
                              {p.stockStatus}
                            </span>
                          </td>
                          {!isEmployee && (
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditProduct(p)}
                                  className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 rounded-lg transition"
                                  title="Edit product"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p)}
                                  className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-rose-400 hover:border-rose-500/20 rounded-lg transition"
                                  title="Delete SKU"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. STOCK MOVEMENTS & APPROVALS TAB */}
      {activeTab === 'Movements' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="glass-panel p-5 rounded-xl border border-brand-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-200">Stock Adjustment & Receipt</h3>
              <p className="text-xs text-gray-500">Record inventory intakes, branch transfers, or log stock updates</p>
            </div>
            
            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="px-4 py-2 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Record Stock Movement</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Pending Approvals (Active Verification Panel) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="glass-panel p-4 rounded-xl bg-gray-950/20 border border-brand-border">
                <div className="flex items-center justify-between border-b border-brand-border/60 pb-3 mb-4">
                  <h4 className="text-xs font-bold text-gray-200 font-mono uppercase tracking-wider flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-cyan-400" />
                    <span>Pending Inventory Approvals</span>
                  </h4>
                  <span className="bg-amber-950/40 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                    {adjustments.filter(a => a.status === 'Pending').length} Pending Requests
                  </span>
                </div>

                <div className="space-y-3.5 max-h-[450px] overflow-y-auto">
                  {adjustments.filter(a => a.status === 'Pending').length === 0 ? (
                    <div className="p-8 text-center text-gray-500 font-sans text-xs">
                      No pending stock movements require review. Everything is up to date!
                    </div>
                  ) : (
                    adjustments.filter(a => a.status === 'Pending').map((adj) => (
                      <div key={adj.id} className="p-4 bg-gray-950/60 rounded-xl border border-brand-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-cyan-500/20">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                              adj.type === 'Receive' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/10' : 'bg-amber-950/30 text-amber-400 border border-amber-500/10'
                            }`}>
                              {adj.type}
                            </span>
                            <span className="font-bold text-gray-200 font-sans">{adj.productName}</span>
                          </div>
                          
                          <p className="text-gray-400 text-xs">
                            Quantity Change: <span className="font-bold text-cyan-400 font-mono">{adj.quantity} units</span>
                          </p>
                          <p className="text-[10px] text-gray-500 italic">"Reason: {adj.reason}"</p>
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
                                className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleRejectAdjustment(adj)}
                                className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-[10px] text-gray-400 font-mono">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Manager review pending</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Historical Stock Logs */}
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
                    <p className="text-gray-500 text-center py-6 text-xs">No historical stock movements recorded.</p>
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

      {/* 3. PROCUREMENTS TAB */}
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
                <span>Read-Only Viewer</span>
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

          {/* Procurements Directory */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {procurements.length === 0 ? (
              <div className="col-span-full glass-panel p-10 text-center text-gray-500 text-xs font-sans">
                No procurement invoices have been recorded yet in this corporate tenant.
              </div>
            ) : (
              procurements.map((proc) => (
                <div key={proc.id} className="glass-panel p-5 rounded-xl border border-brand-border flex flex-col justify-between space-y-4 hover:border-cyan-500/20 transition">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-gray-400 font-bold font-mono text-cyan-400">{proc.orderNumber}</span>
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
                      <p className="text-[11px] text-gray-400 mt-2 line-clamp-2">"{proc.notes}"</p>
                    )}

                    {/* Nested Items Expandable Indicator */}
                    <div className="mt-4 border-t border-brand-border/40 pt-3.5 space-y-2">
                      <span className="text-[9px] text-gray-500 font-bold font-mono block uppercase">Items in Shipment</span>
                      {proc.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-mono text-gray-400">
                          <span>{item.name} (x{item.quantity})</span>
                          <span>KSh {item.unitPrice.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-brand-border/40 pt-3.5 mt-auto">
                    <div>
                      <span className="text-[9px] text-gray-500 font-mono block">Material Costs</span>
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

      {/* MODAL: ADD / EDIT PRODUCT */}
      {showProductModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-lg shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowProductModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-cyan-400" />
              <span>{editingProduct ? 'Modify Product SKU Details' : 'Register New Product SKU'}</span>
            </h3>

            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 font-sans">
                <div className="col-span-2">
                  <label className="text-gray-400 block mb-1">Product Description / Label</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Barcode</label>
                  <input
                    type="text"
                    required
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Cost Price (KSh)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(Number(e.target.value))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Selling Price (KSh)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Stock Unit type</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Min Alert Qty</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formMinStockAlert}
                    onChange={(e) => setFormMinStockAlert(Number(e.target.value))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Product Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                  >
                    <option>Electronics</option>
                    <option>Furniture</option>
                    <option>Accessories</option>
                    <option>Services</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-gray-400 block mb-1">Wholesale Supplier</label>
                  <input
                    type="text"
                    required
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center transition"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-brand-border font-sans rounded-xl text-center transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK ADJUSTMENT */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowAdjustmentModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-cyan-400" />
              <span>Record Inventory Stock Movement</span>
            </h3>

            <form onSubmit={handleAdjustmentSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1 font-sans">Select Catalog Item</label>
                <select
                  value={adjProductId}
                  required
                  onChange={(e) => setAdjProductId(e.target.value)}
                  className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Qty: {p.quantity})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 font-sans">
                <div>
                  <label className="text-gray-400 block mb-1">Movement Type</label>
                  <select
                    value={adjType}
                    onChange={(e: any) => setAdjType(e.target.value)}
                    className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30"
                  >
                    <option value="Receive">Receive Stock (+)</option>
                    <option value="Transfer">Transfer Stock (-)</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Adjustment Qty</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={adjQuantity}
                    onChange={(e) => setAdjQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-gray-950 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Balancing Explanation / Remarks</label>
                <textarea
                  required
                  rows={3}
                  value={adjReason}
                  placeholder="e.g., Courier dispatch delivered, audit adjustment, damaged, etc."
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition"
              >
                {isAuthorizedManager ? 'Apply Adjustment Instantly' : 'Submit Adjustment Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PROCUREMENT ORDER */}
      {showProcurementModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-lg shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200 font-sans">
            <button 
              onClick={() => setShowProcurementModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-400" />
              <span>Record Procurement Shipment Invoice</span>
            </h3>

            <form onSubmit={handleProcurementSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 font-sans">
                <div>
                  <label className="text-gray-400 block mb-1">Wholesale Supplier</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell Wholesale Inc."
                    value={procSupplier}
                    onChange={(e) => setProcSupplier(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Optional Flat Costs Override (KSh)</label>
                  <input
                    type="number"
                    value={procMaterialCosts || ''}
                    placeholder="Leave blank for auto-calculate"
                    onChange={(e) => setProcMaterialCosts(Number(e.target.value))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Invoice Payment Status</label>
                  <select
                    value={procPayStatus}
                    onChange={(e: any) => setProcPayStatus(e.target.value)}
                    className="w-full bg-gray-950 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                  >
                    <option value="Paid">Paid (Full Settlement)</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid">Unpaid (Awaiting Payment)</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Delivery Status</label>
                  <select
                    value={procDelStatus}
                    onChange={(e: any) => setProcDelStatus(e.target.value)}
                    className="w-full bg-gray-950 border border-brand-border rounded-lg p-2 text-gray-300 outline-none focus:border-cyan-500/30"
                  >
                    <option value="Delivered">Delivered (Intake Complete)</option>
                    <option value="Shipped">In-Transit / Shipped</option>
                    <option value="Pending">Awaiting Shipment / Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Shipment Ledger Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Replenishment of core LCD SKU monitor batches."
                  value={procNotes}
                  onChange={(e) => setProcNotes(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-sans"
                />
              </div>

              {/* Dynamic Items List builder */}
              <div className="border-t border-brand-border/40 pt-3 font-sans">
                <span className="text-[10px] text-cyan-400 font-mono font-bold block mb-2 uppercase">Items inside this Order</span>
                
                <div className="grid grid-cols-12 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Item Name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="col-span-6 bg-gray-950 border border-brand-border rounded p-1 text-[11px] text-gray-200"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(Math.max(1, Number(e.target.value)))}
                    className="col-span-2 bg-gray-950 border border-brand-border rounded p-1 text-[11px] text-gray-200 text-center"
                  />
                  <input
                    type="number"
                    placeholder="Unit KSh"
                    value={newItemPrice || ''}
                    onChange={(e) => setNewItemPrice(Number(e.target.value))}
                    className="col-span-3 bg-gray-950 border border-brand-border rounded p-1 text-[11px] text-gray-200 text-right"
                  />
                  <button
                    type="button"
                    onClick={handleAddProcItem}
                    className="col-span-1 bg-cyan-950 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-900 rounded flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Display added item chips */}
                <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                  {procItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-950/40 p-1.5 rounded border border-brand-border/40 text-[11px]">
                      <span className="text-gray-300">{item.name} <strong className="text-cyan-400 font-mono">x{item.quantity}</strong></span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-400">KSh {(item.quantity * item.unitPrice).toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProcItem(idx)}
                          className="text-rose-500 hover:text-rose-400 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition"
              >
                Record Procurement Invoice
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Procurement Modal */}
      {showEditProcModal && editingProc && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowEditProcModal(false);
                setEditingProc(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-400" />
              <span>Modify Procurement Invoice</span>
            </h3>

            <form onSubmit={handleEditProcSubmit} className="space-y-4 text-xs font-mono font-sans">
              <div>
                <label className="text-gray-400 block mb-1 font-sans">Wholesale Supplier</label>
                <input
                  type="text"
                  required
                  value={editProcSupplier}
                  onChange={(e) => setEditProcSupplier(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1 font-sans">Material Costs (KSh)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editProcMaterialCosts}
                    onChange={(e) => setEditProcMaterialCosts(Number(e.target.value))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-sans">Payment Status</label>
                  <select
                    value={editProcPayStatus}
                    onChange={(e: any) => setEditProcPayStatus(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30 font-sans"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Delivery Status</label>
                <select
                  value={editProcDelStatus}
                  onChange={(e: any) => setEditProcDelStatus(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30 font-sans"
                >
                  <option value="Delivered">Delivered</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Shipment Ledger Notes</label>
                <textarea
                  value={editProcNotes}
                  onChange={(e) => setEditProcNotes(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 h-16 font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold font-sans rounded-xl text-center shadow-lg transition cursor-pointer"
              >
                Save Procurement Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Procurement Modal */}
      {showDeleteProcModal && procToDelete && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-rose-500/30 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowDeleteProcModal(false);
                setProcToDelete(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-200">
                  Delete Procurement Record?
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Are you sure you want to permanently delete this procurement shipment from the business accounts ledger? This action cannot be undone.
                </p>
                <div className="bg-gray-950/50 p-3 rounded-xl border border-brand-border/60 text-left space-y-1.5 mt-2 font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">ORDER NO:</span>
                    <span className="text-gray-300 font-medium">{procToDelete.orderNumber}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">SUPPLIER:</span>
                    <span className="text-gray-300 font-medium">{procToDelete.supplierName}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">MATERIAL COSTS:</span>
                    <span className="text-rose-400 font-bold">{formatKSh(procToDelete.materialCosts)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">ORDER DATE:</span>
                    <span className="text-gray-400">{procToDelete.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteProcModal(false);
                    setProcToDelete(null);
                  }}
                  className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 font-medium rounded-xl text-xs transition cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProc}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl text-xs transition shadow-lg shadow-rose-950/30 cursor-pointer font-sans"
                >
                  Delete Procurement Shipment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation Modal */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-rose-500/30 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowDeleteModal(false);
                setProductToDelete(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Trash2 className="w-5 h-5" />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-gray-200">
                  Permanently Delete SKU Product?
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Are you sure you want to permanently delete this product from the enterprise catalog? This action will archive historical pricing structures and is irreversible.
                </p>
                <div className="bg-gray-950/50 p-3 rounded-xl border border-brand-border/60 text-left space-y-1.5 mt-2 font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">PRODUCT NAME:</span>
                    <span className="text-gray-300 font-medium">{productToDelete.name}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">SKU / BARCODE:</span>
                    <span className="text-gray-300 font-medium">{productToDelete.sku} ({productToDelete.barcode || 'N/A'})</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">CURRENT STOCK:</span>
                    <span className="text-cyan-400 font-bold">{productToDelete.quantity} {productToDelete.unit}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">UNIT COST / RETAIL:</span>
                    <span className="text-emerald-400 font-mono">{formatKSh(productToDelete.costPrice)} / {formatKSh(productToDelete.sellingPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProductToDelete(null);
                  }}
                  className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 font-medium rounded-xl text-xs transition cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProduct}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl text-xs transition shadow-lg shadow-rose-950/30 cursor-pointer font-sans"
                >
                  Delete SKU Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
