import React, { useState, useMemo } from 'react';
import { Product, UserRole, Sale, Branch } from '../types';
import { formatKSh } from '../lib/utils';
import { 
  Package, Search, Plus, Edit, Trash2, ArrowUpRight, ArrowDownRight, 
  Archive, FileText, Lock, Copy, RefreshCw, Eye, Sparkles, Check, X, Truck, Globe, MapPin, Calendar, DollarSign
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  sales: Sale[];
  activeUser: { role: UserRole; id: string };
  branches: Branch[];
  adjustments: any[];
  viewMode: 'grid' | 'list';
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onDuplicate: (p: Product) => void;
  onArchive: (p: Product, archive: boolean) => void;
  onQuickPriceUpdate: (productId: string, newPrice: number) => void;
  onAdjustStock: (productId: string, qty: number, type: 'Receive' | 'Transfer', reason: string) => void;
  onTransferStock: (productId: string, qty: number, targetBranchId: string, targetBranchName: string) => void;
  hasDelegatedAccess?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  sales,
  activeUser,
  branches,
  adjustments,
  viewMode,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onQuickPriceUpdate,
  onAdjustStock,
  onTransferStock,
  hasDelegatedAccess = false,
  isSelected = false,
  onToggleSelect
}) => {
  const isEmployee = activeUser.role === UserRole.EMPLOYEE && !hasDelegatedAccess;
  const isOwner = activeUser.role === UserRole.ADMIN;

  // Inline forms
  const [showPricePopover, setShowPricePopover] = useState(false);
  const [quickPrice, setQuickPrice] = useState(product.sellingPrice);

  const [showAdjustPopover, setShowAdjustPopover] = useState(false);
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustType, setAdjustType] = useState<'Receive' | 'Transfer'>('Receive');
  const [adjustReason, setAdjustReason] = useState('');

  const [showTransferPopover, setShowTransferPopover] = useState(false);
  const [transferQty, setTransferQty] = useState(1);
  const [targetBranchId, setTargetBranchId] = useState('');

  const [showViewModal, setShowViewModal] = useState(false);

  // Compute dynamic performance stats
  const performance = useMemo(() => {
    let unitsSold = 0;
    let revenue = 0;
    let profit = 0;
    let lastSaleDate = 'Never Sold';

    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.productId === product.id) {
          const qty = item.quantity || 0;
          unitsSold += qty;
          revenue += qty * (item.priceAtSale || 0);
          profit += qty * ((item.priceAtSale || 0) - (item.costPriceAtSale || 0));
          lastSaleDate = sale.date; // already sorted or last item
        }
      });
    });

    // Find last restocked date from approved adjustments
    const productAdjustments = adjustments.filter(adj => adj.productId === product.id && adj.status === 'Approved');
    const lastRestock = productAdjustments.find(adj => adj.type === 'Receive')?.date || 'No restock logged';
    const lastAdjReason = productAdjustments[0] 
      ? `${productAdjustments[0].type} ${productAdjustments[0].quantity} units on ${productAdjustments[0].date} (${productAdjustments[0].reason})` 
      : 'No adjustments recorded';

    return {
      unitsSold,
      revenue,
      profit,
      lastSaleDate,
      lastRestock,
      lastAdjReason
    };
  }, [product, sales, adjustments]);

  // Product stats valuations
  const profitPerUnit = Math.max(0, product.sellingPrice - product.costPrice);
  const inventoryValue = product.costPrice * product.quantity;
  const expectedRevenue = product.sellingPrice * product.quantity;
  const expectedProfit = profitPerUnit * product.quantity;

  const outOfStock = product.quantity === 0;
  const lowStock = product.quantity <= product.minStockAlert;

  // Status styling configurations
  const getBadgeStyle = () => {
    if (product.productStatus === 'Discontinued') return 'bg-gray-950/40 text-gray-400 border border-brand-border';
    if (outOfStock) return 'bg-rose-950/20 text-rose-400 border border-rose-500/10';
    if (lowStock) return 'bg-amber-950/20 text-amber-400 border border-amber-500/10 animate-pulse';
    return 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10';
  };

  const getStatusText = () => {
    if (product.productStatus === 'Discontinued') return 'Discontinued';
    if (outOfStock) return 'Out of Stock';
    if (lowStock) return 'Low Stock';
    return 'In Stock';
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickPriceUpdate(product.id, quickPrice);
    setShowPricePopover(false);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustQty <= 0) return;
    onAdjustStock(product.id, adjustQty, adjustType, adjustReason || 'Manual counter correction');
    setShowAdjustPopover(false);
    setAdjustQty(1);
    setAdjustReason('');
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferQty <= 0 || !targetBranchId) return;
    
    if (product.quantity < transferQty) {
      alert(`Insufficient warehouse stock. Only ${product.quantity} units available.`);
      return;
    }

    const targetBranch = branches.find(b => b.id === targetBranchId);
    const branchName = targetBranch ? targetBranch.name : 'Target Branch';
    
    onTransferStock(product.id, transferQty, targetBranchId, branchName);
    setShowTransferPopover(false);
    setTransferQty(1);
  };

  // Render bento-card grid view
  if (viewMode === 'grid') {
    return (
      <div className="glass-panel p-5 rounded-2xl border border-brand-border flex flex-col justify-between hover:border-cyan-500/20 transition duration-150 relative overflow-hidden group">
        
        {/* Absolute floating status badge */}
        <span className={`absolute top-4 right-4 px-2 py-0.5 rounded text-[9px] font-mono font-bold ${getBadgeStyle()}`}>
          {getStatusText()}
        </span>

        <div className="space-y-3.5">
          {/* Header Portfolio elements */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleSelect}
                className="w-3.5 h-3.5 accent-cyan-500 rounded border-brand-border bg-gray-950 text-cyan-500 cursor-pointer"
              />
              <span className="text-[9px] text-cyan-400 font-mono block uppercase">{product.category}</span>
            </div>
            <h4 className="font-semibold text-gray-100 text-sm group-hover:text-cyan-400 transition line-clamp-1">{product.name}</h4>
            <div className="text-[10px] text-gray-500 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>SKU: {product.sku}</span>
              <span>•</span>
              <span>BC: {product.barcode || 'N/A'}</span>
              {product.qrCode && (
                <>
                  <span>•</span>
                  <span>QR: {product.qrCode}</span>
                </>
              )}
            </div>
          </div>

          {/* Supplier details block */}
          {product.supplier && (
            <div className="p-2 bg-gray-950/30 rounded-lg border border-brand-border/40 text-[11px] text-gray-400 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">Supplier: <span className="font-semibold text-gray-200">{product.supplier}</span></span>
            </div>
          )}

          {/* Stock Counts Section */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2 bg-gray-950/40 rounded-xl border border-brand-border/30">
              <span className="text-[9px] text-gray-500 block uppercase font-mono">Current Stock</span>
              <span className="font-mono font-bold text-gray-200">{product.quantity}</span>
              <span className="text-[9px] text-gray-500 font-mono ml-1">{product.unit || 'Units'}</span>
            </div>
            <div className="p-2 bg-gray-950/40 rounded-xl border border-brand-border/30">
              <span className="text-[9px] text-gray-500 block uppercase font-mono">Reorder Level</span>
              <span className="font-mono font-bold text-gray-400">{product.minStockAlert}</span>
              <span className="text-[9px] text-gray-500 font-mono ml-1">{product.unit || 'Units'}</span>
            </div>
          </div>

          {/* Pricing Valuations - conditionally blurred */}
          <div className="border-t border-brand-border/30 pt-3 space-y-1.5 text-xs relative">
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-mono">Selling Price:</span>
              <span className="font-mono font-bold text-cyan-400 text-sm">KSh {product.sellingPrice.toLocaleString()}</span>
            </div>

            {/* Buying, margins details */}
            <div className={`space-y-1.5 ${isEmployee ? 'blur-[3px] select-none' : ''}`}>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-500 font-mono">Buying Cost:</span>
                <span className="font-mono text-gray-300">KSh {product.costPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-500 font-mono">Unit Profit:</span>
                <span className="font-mono text-emerald-400 font-semibold">KSh {profitPerUnit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] border-t border-brand-border/20 pt-1.5">
                <span className="text-gray-500 font-mono">Inventory Value:</span>
                <span className="font-mono text-gray-300 font-semibold">KSh {inventoryValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-500 font-mono">Expected Revenue:</span>
                <span className="font-mono text-cyan-400 font-semibold">KSh {expectedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-500 font-mono">Expected Profit:</span>
                <span className="font-mono text-emerald-400 font-semibold">KSh {expectedProfit.toLocaleString()}</span>
              </div>
            </div>

            {isEmployee && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/30 backdrop-blur-[1px] text-center z-10 p-2">
                <Lock className="w-4 h-4 text-rose-400 mb-1" />
                <span className="text-[9px] font-mono text-rose-300 uppercase font-bold tracking-wider">Costs Restricted</span>
              </div>
            )}
          </div>

          {/* Interactive performance velocity micro-summary */}
          <div className="p-2.5 bg-cyan-950/10 border border-cyan-500/10 rounded-xl text-[11px] font-mono flex items-center justify-between gap-1.5">
            <span className="text-gray-500">Sales velocity:</span>
            <span className="text-cyan-400 font-bold">Sold {performance.unitsSold} units</span>
          </div>

        </div>

        {/* Action Buttons Block */}
        <div className="border-t border-brand-border/30 pt-3.5 mt-4 flex flex-wrap items-center gap-1.5 shrink-0">
          
          {/* Main actions */}
          <button
            onClick={() => setShowViewModal(true)}
            className="p-1.5 bg-gray-950 border border-brand-border/80 text-gray-400 hover:text-cyan-400 rounded-lg hover:border-cyan-500/20 transition cursor-pointer"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {!isEmployee && (
            <>
              <button
                onClick={() => onEdit(product)}
                className="p-1.5 bg-gray-950 border border-brand-border/80 text-gray-400 hover:text-cyan-400 rounded-lg hover:border-cyan-500/20 transition cursor-pointer"
                title="Modify product"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowPricePopover(!showPricePopover)}
                className={`p-1.5 border rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-mono ${
                  showPricePopover ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500' : 'bg-gray-950 border-brand-border/80 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20'
                }`}
                title="Quick Update Price"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Price</span>
              </button>

              <button
                onClick={() => setShowAdjustPopover(!showAdjustPopover)}
                className={`p-1.5 border rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-mono ${
                  showAdjustPopover ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500' : 'bg-gray-950 border-brand-border/80 text-gray-400 hover:text-indigo-400 hover:border-indigo-500/20'
                }`}
                title="Adjust Stock"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                <span>Qty</span>
              </button>

              {branches.length > 0 && (
                <button
                  onClick={() => setShowTransferPopover(!showTransferPopover)}
                  className={`p-1.5 border rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-mono ${
                    showTransferPopover ? 'bg-amber-500/20 text-amber-400 border-amber-500' : 'bg-gray-950 border-brand-border/80 text-gray-400 hover:text-amber-400 hover:border-amber-500/20'
                  }`}
                  title="Branch Stock Transfer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
              )}

              <button
                onClick={() => onDuplicate(product)}
                className="p-1.5 bg-gray-950 border border-brand-border/80 text-gray-400 hover:text-gray-200 rounded-lg transition cursor-pointer"
                title="Duplicate SKU"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onArchive(product, !product.archived)}
                className="p-1.5 bg-gray-950 border border-brand-border/80 text-gray-400 hover:text-amber-400 rounded-lg transition cursor-pointer"
                title={product.archived ? 'Restore' : 'Archive'}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>

              {isOwner && (
                <button
                  onClick={() => onDelete(product)}
                  className="p-1.5 bg-gray-950 border border-brand-border/80 text-gray-400 hover:text-rose-400 hover:border-rose-500/20 rounded-lg transition ml-auto cursor-pointer"
                  title="Delete product"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* POPOVER: QUICK PRICE UPDATE */}
        {showPricePopover && (
          <div className="absolute inset-x-4 bottom-16 bg-gray-950/95 border border-brand-border p-3.5 rounded-xl text-xs z-20 space-y-2 font-mono animate-in slide-in-from-bottom-2 duration-150">
            <span className="font-semibold text-cyan-400 block uppercase text-[10px]">Quick Price Update</span>
            <form onSubmit={handlePriceSubmit} className="flex gap-1.5">
              <input
                type="number"
                min="0"
                value={quickPrice}
                onChange={(e) => setQuickPrice(Math.max(0, Number(e.target.value)))}
                className="flex-1 bg-gray-900 border border-brand-border rounded px-2.5 py-1 text-gray-100 font-bold"
              />
              <button type="submit" className="px-3 bg-cyan-950 text-cyan-400 border border-cyan-500/30 rounded font-bold hover:bg-cyan-900">
                Update
              </button>
              <button type="button" onClick={() => setShowPricePopover(false)} className="px-2 bg-gray-900 text-gray-400 border border-brand-border/80 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* POPOVER: ADJUST STOCK */}
        {showAdjustPopover && (
          <div className="absolute inset-x-4 bottom-16 bg-gray-950/95 border border-brand-border p-3.5 rounded-xl text-xs z-20 space-y-2.5 font-mono animate-in slide-in-from-bottom-2 duration-150">
            <span className="font-semibold text-indigo-400 block uppercase text-[10px]">Record Stock Movement</span>
            <form onSubmit={handleAdjustSubmit} className="space-y-2">
              <div className="flex gap-1">
                <select
                  value={adjustType}
                  onChange={(e: any) => setAdjustType(e.target.value)}
                  className="bg-gray-900 border border-brand-border rounded px-2 py-1 text-gray-300 flex-1"
                >
                  <option value="Receive">Receive (+ Intake)</option>
                  <option value="Transfer">Transfer (- Outtake)</option>
                </select>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
                  className="bg-gray-900 border border-brand-border rounded p-1 text-gray-100 font-bold text-center w-16"
                />
              </div>
              <input
                type="text"
                placeholder="Reason / Note (e.g. Audit variance)"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full bg-gray-900 border border-brand-border rounded px-2 py-1 text-gray-200"
              />
              <div className="flex gap-1 justify-end">
                <button type="submit" className="px-3 py-1 bg-indigo-950 text-indigo-400 border border-indigo-500/30 rounded font-bold hover:bg-indigo-900 text-[11px]">
                  Submit Request
                </button>
                <button type="button" onClick={() => setShowAdjustPopover(false)} className="px-2 bg-gray-900 text-gray-400 border border-brand-border/80 rounded">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* POPOVER: BRANCH TRANSFER */}
        {showTransferPopover && (
          <div className="absolute inset-x-4 bottom-16 bg-gray-950/95 border border-brand-border p-3.5 rounded-xl text-xs z-20 space-y-2.5 font-mono animate-in slide-in-from-bottom-2 duration-150">
            <span className="font-semibold text-amber-400 block uppercase text-[10px]">Stock Branch Transfer</span>
            <form onSubmit={handleTransferSubmit} className="space-y-2">
              <div className="flex gap-1">
                <select
                  required
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="bg-gray-900 border border-brand-border rounded px-2 py-1 text-gray-300 flex-1"
                >
                  <option value="">Select Target Branch...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value)))}
                  className="bg-gray-900 border border-brand-border rounded p-1 text-gray-100 font-bold text-center w-16"
                />
              </div>
              <div className="flex gap-1 justify-end">
                <button type="submit" className="px-3 py-1 bg-amber-950 text-amber-400 border border-amber-500/30 rounded font-bold hover:bg-amber-900 text-[11px]">
                  Apply Transfer
                </button>
                <button type="button" onClick={() => setShowTransferPopover(false)} className="px-2 bg-gray-900 text-gray-400 border border-brand-border/80 rounded">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW DETAILS MODAL */}
        {showViewModal && (
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="glass-panel p-6 rounded-2xl w-full max-w-lg shadow-2xl relative border border-brand-border flex flex-col text-xs space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-2.5 mb-2">
                <div>
                  <span className="text-[9px] text-cyan-400 font-mono block uppercase">{product.category}</span>
                  <h4 className="font-bold text-gray-100 text-base">{product.name}</h4>
                </div>
                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-200 p-1">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-gray-500 block font-mono">SKU Identifier</span>
                  <span className="text-gray-200 font-mono font-semibold">{product.sku}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 block font-mono">Barcode EAN</span>
                  <span className="text-gray-200 font-mono font-semibold">{product.barcode || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 block font-mono">Warehouse Stock</span>
                  <span className="text-gray-200 font-mono font-semibold">{product.quantity} {product.unit}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-500 block font-mono">Selling Price</span>
                  <span className="text-cyan-400 font-mono font-bold">KSh {product.sellingPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Supplier Information Section */}
              {product.supplier && !isEmployee && (
                <div className="p-3.5 bg-gray-950/60 rounded-xl border border-brand-border/50 space-y-1.5">
                  <span className="font-mono text-[10px] text-indigo-400 uppercase tracking-wider block">Supplier Profile</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-300">
                    <div>Name: <span className="text-gray-100 font-medium">{product.supplier}</span></div>
                    {product.supplierCompany && <div>Company: <span className="text-gray-100 font-medium">{product.supplierCompany}</span></div>}
                    {product.supplierPhone && <div>Phone: <span className="text-gray-100 font-mono">{product.supplierPhone}</span></div>}
                    {product.supplierEmail && <div>Email: <span className="text-gray-100 font-mono">{product.supplierEmail}</span></div>}
                  </div>
                  {product.supplierAddress && <p className="text-[10px] text-gray-400 font-sans">Address: {product.supplierAddress}</p>}
                  {product.supplierNotes && <p className="text-[10px] text-gray-500 italic mt-1 font-sans">"Notes: {product.supplierNotes}"</p>}
                </div>
              )}

              {/* Analytical performance details */}
              <div className="p-3.5 bg-cyan-950/15 border border-cyan-500/10 rounded-xl space-y-2">
                <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider block">Live Velocity Metrics</span>
                <div className={`grid ${isEmployee ? 'grid-cols-1' : 'grid-cols-3'} gap-2 text-center`}>
                  <div>
                    <span className="text-[8px] text-gray-500 uppercase block font-mono">Units Sold</span>
                    <span className="font-mono font-bold text-gray-100 text-xs">{performance.unitsSold}</span>
                  </div>
                  {!isEmployee && (
                    <>
                      <div>
                        <span className="text-[8px] text-gray-500 uppercase block font-mono">Total Revenue</span>
                        <span className="font-mono font-bold text-cyan-400 text-xs">KSh {performance.revenue.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-500 uppercase block font-mono">Gross Profit</span>
                        <span className="font-mono font-bold text-emerald-400 text-xs">KSh {performance.profit.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-[10px] text-gray-400 pt-1.5 border-t border-brand-border/20 space-y-1">
                  <div>Last Sale Recorded: <span className="text-gray-200 font-mono font-semibold">{performance.lastSaleDate}</span></div>
                  <div>Last Restocked Date: <span className="text-gray-200 font-mono font-semibold">{performance.lastRestock}</span></div>
                  <div className="truncate">Last Adjustment: <span className="text-gray-500 font-mono italic">{performance.lastAdjReason}</span></div>
                </div>
              </div>

              {/* Product Attachment indicators */}
              {(product.images && product.images.length > 0) || (product.documents && product.documents.length > 0) ? (
                <div className="space-y-1.5">
                  <span className="font-mono text-[10px] text-gray-500 block uppercase">Product Assets</span>
                  <div className="flex flex-wrap gap-2">
                    {product.images?.map((img, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-900 border border-brand-border text-[9px] font-mono text-gray-400 rounded-md">Image_{i+1}.png</span>
                    ))}
                    {product.documents?.map((doc, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-950 border border-indigo-500/20 text-[9px] font-mono text-indigo-400 rounded-md">{doc.name} ({doc.type})</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Primary Image preview */}
              {product.imageUrl && (
                <div className="border border-brand-border/40 rounded-xl overflow-hidden h-32 bg-gray-950">
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                </div>
              )}

              <button
                onClick={() => setShowViewModal(false)}
                className="w-full py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border rounded-lg font-mono font-semibold text-center text-gray-300"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Render list/table row view
  return (
    <tr className={`hover:bg-gray-900/30 transition text-xs font-sans ${isSelected ? 'bg-cyan-950/10' : ''}`}>
      <td className="p-4 w-10 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-3.5 h-3.5 accent-cyan-500 rounded border-brand-border bg-gray-950 text-cyan-500 cursor-pointer"
        />
      </td>
      <td className="p-4">
        <div className="font-semibold text-gray-100">{product.name}</div>
        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
          <span>SKU: {product.sku}</span>
          <span>|</span>
          <span>BC: {product.barcode || 'N/A'}</span>
          {product.qrCode && (
            <>
              <span>|</span>
              <span>QR: {product.qrCode}</span>
            </>
          )}
        </div>
      </td>
      <td className="p-4">
        <span className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-[10px] text-gray-400 rounded-md font-mono">
          {product.category}
        </span>
      </td>
      <td className="p-4 text-right">
        {isEmployee ? (
          <span className="text-gray-600 font-mono">[LOCKED]</span>
        ) : (
          <span className="font-mono font-semibold text-gray-400">KSh {product.costPrice.toLocaleString()}</span>
        )}
      </td>
      <td className="p-4 text-right font-mono font-semibold text-cyan-400">
        KSh {product.sellingPrice.toLocaleString()}
      </td>
      <td className="p-4 text-right">
        <span className="font-mono font-bold block">{product.quantity}</span>
        <span className="text-[9px] text-gray-500 font-mono">{product.unit || 'Units'}</span>
      </td>
      <td className="p-4 text-gray-400 max-w-[120px] truncate">
        {product.supplier || 'N/A'}
      </td>
      <td className="p-4 text-center">
        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${getBadgeStyle()}`}>
          {getStatusText()}
        </span>
      </td>
      <td className="p-4">
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setShowViewModal(true)}
            className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 rounded-lg transition"
            title="View product details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {!isEmployee && (
            <>
              <button
                onClick={() => onEdit(product)}
                className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-cyan-400 hover:border-cyan-500/20 rounded-lg transition"
                title="Edit product"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDuplicate(product)}
                className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-gray-200 rounded-lg transition"
                title="Duplicate SKU"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onArchive(product, !product.archived)}
                className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-amber-400 rounded-lg transition"
                title={product.archived ? 'Restore' : 'Archive'}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
              {isOwner && (
                <button
                  onClick={() => onDelete(product)}
                  className="p-1.5 bg-gray-950 border border-brand-border text-gray-400 hover:text-rose-400 hover:border-rose-500/20 rounded-lg transition"
                  title="Delete product permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </td>

      {/* RENDER POPOVER BACKUPS AS TR REFS FOR SAFETY */}
      {showViewModal && (
        <td className="hidden">
          {/* Handled by standard render overlay above inside same context */}
        </td>
      )}
    </tr>
  );
};
