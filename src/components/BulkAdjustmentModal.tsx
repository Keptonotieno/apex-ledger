import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { formatKSh } from '../lib/utils';
import { X, Sparkles, Check, ChevronRight, ArrowUpRight, ArrowDownRight, AlertTriangle, List } from 'lucide-react';

interface BulkAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: string[];
  onApplyAdjustment: (updates: { id: string; price: number; type: 'Selling' | 'Buying' }[]) => void;
}

export const BulkAdjustmentModal: React.FC<BulkAdjustmentModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  onApplyAdjustment
}) => {
  // Settings
  const [targetCategory, setTargetCategory] = useState('All');
  const [targetField, setTargetField] = useState<'Selling' | 'Buying'>('Selling');
  const [adjustmentType, setAdjustmentType] = useState<'Increase' | 'Decrease'>('Increase');
  const [adjustmentMode, setAdjustmentMode] = useState<'Percentage' | 'Fixed'>('Percentage');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0);

  // Filter out archived products for bulk adjustments
  const activeProducts = useMemo(() => {
    return products.filter(p => !p.archived);
  }, [products]);

  // Compute live preview of affected products
  const previewData = useMemo(() => {
    const list = targetCategory === 'All' 
      ? activeProducts 
      : activeProducts.filter(p => p.category === targetCategory);

    const results = list.map(p => {
      const currentPrice = targetField === 'Selling' ? p.sellingPrice : p.costPrice;
      let diff = 0;
      
      if (adjustmentMode === 'Percentage') {
        diff = currentPrice * (adjustmentValue / 100);
      } else {
        diff = adjustmentValue;
      }

      let newPrice = currentPrice;
      if (adjustmentType === 'Increase') {
        newPrice = currentPrice + diff;
      } else {
        newPrice = Math.max(0, currentPrice - diff);
      }

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        currentPrice,
        newPrice,
        difference: newPrice - currentPrice
      };
    });

    return results;
  }, [activeProducts, targetCategory, targetField, adjustmentType, adjustmentMode, adjustmentValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (previewData.length === 0) {
      alert('No products will be affected by this bulk pricing change.');
      return;
    }
    if (adjustmentValue <= 0) {
      alert('Please specify an adjustment value greater than 0.');
      return;
    }

    const updates = previewData.map(item => ({
      id: item.id,
      price: Math.round(item.newPrice),
      type: targetField
    }));

    onApplyAdjustment(updates);
    alert(`Successfully adjusted pricing for ${previewData.length} products!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl shadow-2xl relative border border-brand-border flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-border/60 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-100">Enterprise Bulk Pricing tool</h3>
              <p className="text-[11px] text-gray-500 font-mono">Adjust catalogs dynamically across commercial categories</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-900 border border-transparent hover:border-brand-border/60 text-gray-400 hover:text-gray-200 rounded-lg transition"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Configurations Area */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-950/40 p-4 rounded-xl border border-brand-border/40 text-xs shrink-0 mb-4">
          
          <div>
            <label className="text-gray-500 block mb-1 font-mono uppercase text-[9px]">Target Category</label>
            <select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="w-full bg-gray-950 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30"
            >
              <option value="All">All Products</option>
              {categories.filter(c => c !== 'All').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-500 block mb-1 font-mono uppercase text-[9px]">Target Price Field</label>
            <select
              value={targetField}
              onChange={(e: any) => setTargetField(e.target.value)}
              className="w-full bg-gray-950 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
            >
              <option value="Selling">Selling Price</option>
              <option value="Buying">Buying Price</option>
            </select>
          </div>

          <div>
            <label className="text-gray-500 block mb-1 font-mono uppercase text-[9px]">Adjustment Direction</label>
            <select
              value={adjustmentType}
              onChange={(e: any) => setAdjustmentType(e.target.value)}
              className="w-full bg-gray-950 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
            >
              <option value="Increase">Increase Price</option>
              <option value="Decrease">Decrease Price</option>
            </select>
          </div>

          <div>
            <label className="text-gray-500 block mb-1 font-mono uppercase text-[9px]">Adjustment Method</label>
            <select
              value={adjustmentMode}
              onChange={(e: any) => setAdjustmentMode(e.target.value)}
              className="w-full bg-gray-950 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
            >
              <option value="Percentage">Percentage (%)</option>
              <option value="Fixed">Fixed Amount (KES)</option>
            </select>
          </div>

          <div className="col-span-2 sm:col-span-4 mt-2 border-t border-brand-border/30 pt-3 flex items-center justify-between gap-4">
            <span className="text-gray-400 font-mono">Value rate to adjust by:</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.1"
                step="any"
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(Math.max(0, Number(e.target.value)))}
                className="bg-gray-950 border border-brand-border rounded-lg p-2 text-gray-100 text-right font-mono font-bold w-24 outline-none focus:border-cyan-500/30"
              />
              <span className="text-gray-400 font-mono font-bold text-xs">
                {adjustmentMode === 'Percentage' ? '%' : 'KES'}
              </span>
            </div>
          </div>

        </div>

        {/* Affected summary and detailed preview table */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-3">
          
          <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/15 p-2.5 rounded-lg text-xs font-mono">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
              <span>Confirm bulk updates before application</span>
            </div>
            <span className="text-gray-300 font-mono font-bold">{previewData.length} SKUs affected</span>
          </div>

          {/* Table Container */}
          <div className="flex-1 border border-brand-border rounded-xl overflow-hidden bg-gray-950/20 text-xs">
            <div className="overflow-y-auto max-h-[250px]">
              <table className="w-full text-left">
                <thead className="bg-gray-950/90 sticky top-0 border-b border-brand-border text-[9px] font-mono uppercase text-gray-500 tracking-wider">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-right">Current Price</th>
                    <th className="p-3 text-right">New Price</th>
                    <th className="p-3 text-center">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30 text-gray-300">
                  {previewData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-500 font-mono italic">
                        No active catalog products match selected criteria.
                      </td>
                    </tr>
                  ) : (
                    previewData.map(item => (
                      <tr key={item.id} className="hover:bg-gray-900/20 transition font-sans">
                        <td className="p-3">
                          <span className="font-semibold text-gray-200 block truncate max-w-[180px]">{item.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{item.sku}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-medium text-gray-400">
                          KSh {item.currentPrice.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-cyan-400">
                          KSh {Math.round(item.newPrice).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold inline-flex items-center gap-0.5 ${
                            item.difference >= 0 ? 'bg-emerald-950/30 text-emerald-400' : 'bg-rose-950/30 text-rose-400'
                          }`}>
                            {item.difference >= 0 ? '+' : ''}{Math.round(item.difference).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="border-t border-brand-border/60 pt-3.5 mt-4 shrink-0 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-950 hover:bg-gray-900 border border-brand-border/80 text-gray-400 rounded-lg font-mono font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={previewData.length === 0 || adjustmentValue <= 0}
            className="px-5 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 border border-amber-500/30 rounded-lg font-mono font-bold flex items-center gap-1.5 shadow-lg transition"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Apply Price adjustments</span>
          </button>
        </div>

      </div>
    </div>
  );
};
