import React, { useMemo } from 'react';
import { Product, Sale, UserRole, Task } from '../types';
import { formatKSh } from '../lib/utils';
import { 
  TrendingUp, TrendingDown, Layers, AlertCircle, ShoppingBag, 
  CheckCircle, ShieldAlert, ArrowUpRight, ArrowDownRight, 
  Activity, Sparkles, ClipboardList, Zap, Info
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';

interface InventoryDashboardStatsProps {
  products: Product[];
  sales: Sale[];
  activeUser: { role: UserRole; id: string };
  adjustments: any[];
  onTabChange?: (tab: 'Catalog' | 'Movements' | 'Procurements' | 'Intelligence' | 'Bulk') => void;
  hasDelegatedAccess?: boolean;
}

export const InventoryDashboardStats: React.FC<InventoryDashboardStatsProps> = ({
  products,
  sales,
  activeUser,
  adjustments,
  onTabChange,
  hasDelegatedAccess = false
}) => {
  const isEmployee = activeUser.role === UserRole.EMPLOYEE && !hasDelegatedAccess;

  // Compute dynamic stats
  const stats = useMemo(() => {
    const activeProducts = products.filter(p => !p.archived);
    
    let totalCost = 0;
    let totalSelling = 0;
    let totalQty = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    
    const categoriesSet = new Set<string>();

    activeProducts.forEach(p => {
      totalCost += (p.costPrice || 0) * (p.quantity || 0);
      totalSelling += (p.sellingPrice || 0) * (p.quantity || 0);
      totalQty += p.quantity || 0;
      categoriesSet.add(p.category);

      if (p.quantity === 0) {
        outOfStockCount++;
      } else if (p.quantity <= (p.minStockAlert || 5)) {
        lowStockCount++;
      }
    });

    const expectedProfit = totalSelling - totalCost;

    // COGS & Sales analysis
    let cogs = 0;
    let revenue = 0;
    const itemSalesCount: { [key: string]: { qty: number; rev: number; profit: number } } = {};

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const itemQty = item.quantity || 0;
        const itemPrice = item.priceAtSale || 0;
        const itemCost = item.costPriceAtSale || 0;

        cogs += itemCost * itemQty;
        revenue += itemPrice * itemQty;

        if (!itemSalesCount[item.productId]) {
          itemSalesCount[item.productId] = { qty: 0, rev: 0, profit: 0 };
        }
        itemSalesCount[item.productId].qty += itemQty;
        itemSalesCount[item.productId].rev += itemPrice * itemQty;
        itemSalesCount[item.productId].profit += (itemPrice - itemCost) * itemQty;
      });
    });

    // Turnover: COGS / Average Inventory (estimated as current cost value or 1 if 0)
    const averageInventory = totalCost || 1;
    const turnoverRatio = cogs / averageInventory;

    // Best Sellers & Slow Sellers
    const sortedBySales = activeProducts.map(p => {
      const soldInfo = itemSalesCount[p.id] || { qty: 0, rev: 0, profit: 0 };
      return {
        ...p,
        unitsSold: soldInfo.qty,
        revenueGenerated: soldInfo.rev,
        grossProfit: soldInfo.profit
      };
    }).sort((a, b) => b.unitsSold - a.unitsSold);

    const bestSellers = sortedBySales.filter(p => p.unitsSold > 0).slice(0, 5);
    const slowMovers = sortedBySales.filter(p => p.unitsSold === 0 && p.quantity > 0).slice(0, 5);

    // Most Profitable
    const sortedByProfit = [...activeProducts].sort((a, b) => {
      const marginA = a.sellingPrice ? ((a.sellingPrice - a.costPrice) / a.sellingPrice) : 0;
      const marginB = b.sellingPrice ? ((b.sellingPrice - b.costPrice) / b.sellingPrice) : 0;
      return marginB - marginA;
    }).slice(0, 5);

    // Restock Recommendations
    const recommendations = activeProducts
      .filter(p => p.quantity <= (p.minStockAlert || 5))
      .map(p => {
        const reorderLevel = p.minStockAlert || 5;
        const maxStock = p.maxStock || (reorderLevel * 3);
        const recommendQty = Math.max(reorderLevel * 2, maxStock - p.quantity);
        return {
          ...p,
          recommendQty,
          estimatedCost: recommendQty * p.costPrice
        };
      });

    // Unusual stock movements (adjustments with high qty or reasons like discrepancy, write-off)
    const unusualMovements = adjustments.filter(adj => {
      const reasonLower = (adj.reason || '').toLowerCase();
      const isUnusualReason = reasonLower.includes('theft') || 
                              reasonLower.includes('loss') || 
                              reasonLower.includes('discrepancy') || 
                              reasonLower.includes('spoilage') || 
                              reasonLower.includes('damaged') ||
                              reasonLower.includes('write-off');
      return isUnusualReason || adj.quantity > 20;
    }).slice(0, 5);

    // Category distribution for chart
    const categoryDist: { [key: string]: number } = {};
    activeProducts.forEach(p => {
      categoryDist[p.category] = (categoryDist[p.category] || 0) + (p.quantity * p.costPrice);
    });
    const categoryDistData = Object.keys(categoryDist).map(cat => ({
      name: cat,
      value: categoryDist[cat]
    }));

    return {
      totalCost,
      totalSelling,
      totalQty,
      expectedProfit,
      lowStockCount,
      outOfStockCount,
      activeCategories: categoriesSet.size,
      turnoverRatio,
      bestSellers,
      slowMovers,
      sortedByProfit,
      recommendations,
      unusualMovements,
      categoryDistData,
      cogs,
      revenue
    };
  }, [products, sales, adjustments]);

  const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];

  return (
    <div className="space-y-6">
      {/* Dynamic Key Indicators Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Stock */}
        <div className="glass-panel p-4 rounded-xl border border-brand-border/60 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-mono block uppercase">Total Stock Quantity</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-gray-100">{stats.totalQty.toLocaleString()}</span>
              <span className="text-[10px] text-gray-400">units</span>
            </div>
            <span className="text-[9px] text-cyan-400 font-mono block">In active warehouse</span>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Inventory Value (Cost) */}
        <div className="glass-panel p-4 rounded-xl border border-brand-border/60 flex items-center justify-between relative overflow-hidden">
          {isEmployee && (
            <div className="absolute inset-0 bg-gray-950/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-2 text-center">
              <ShieldAlert className="w-4 h-4 text-rose-400 mb-1" />
              <span className="text-[9px] font-mono text-gray-400 uppercase">Restricted (Cost Price)</span>
            </div>
          )}
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-mono block uppercase">Inventory Value (Cost)</span>
            <span className="text-lg font-bold font-mono text-gray-100">{formatKSh(stats.totalCost)}</span>
            <span className="text-[9px] text-gray-400 block">Total expected purchase outlay</span>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Expected Gross Profit */}
        <div className="glass-panel p-4 rounded-xl border border-brand-border/60 flex items-center justify-between relative overflow-hidden">
          {isEmployee && (
            <div className="absolute inset-0 bg-gray-950/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-2 text-center">
              <ShieldAlert className="w-4 h-4 text-rose-400 mb-1" />
              <span className="text-[9px] font-mono text-gray-400 uppercase">Restricted (Profit margins)</span>
            </div>
          )}
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-mono block uppercase">Expected Gross Profit</span>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold font-mono text-emerald-400">{formatKSh(stats.expectedProfit)}</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-[9px] text-gray-400 block">
              Avg Margin: <span className="text-emerald-400 font-bold">
                {stats.totalSelling ? Math.round((stats.expectedProfit / stats.totalSelling) * 100) : 0}%
              </span>
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Alerts Tracker */}
        <div className="glass-panel p-4 rounded-xl border border-brand-border/60 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-500 font-mono block uppercase">Stock Alert Status</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-rose-400">{stats.outOfStockCount}</span>
              <span className="text-xs text-gray-400">Out</span>
              <span className="text-xl font-bold font-mono text-amber-400 ml-2">{stats.lowStockCount}</span>
              <span className="text-xs text-gray-400">Low</span>
            </div>
            <span className="text-[9px] text-gray-500 block">Needs immediate replenishment</span>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Intelligence & Recommendations Section (Hidden for raw Employees if they don't have task-delegated privilege, otherwise full details!) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Restock recommendations & intelligence indicators */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-brand-border/60">
            <div className="flex items-center justify-between border-b border-brand-border/40 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Restocking Recommendations</span>
                </h3>
                <p className="text-[11px] text-gray-500">Based on minimum reorder levels and safety stock requirements</p>
              </div>
              <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                {stats.recommendations.length} Items Recommended
              </span>
            </div>

            <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
              {stats.recommendations.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs">
                  ✨ All product inventory counts are above active safety reorder levels!
                </div>
              ) : (
                stats.recommendations.map((p) => (
                  <div key={p.id} className="p-3 bg-gray-950/40 rounded-xl border border-brand-border/40 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-gray-200 block">{p.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        SKU: {p.sku} • Current: <span className="text-rose-400 font-bold">{p.quantity} {p.unit}</span> (Min alert: {p.minStockAlert})
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="block font-mono font-bold text-cyan-400 text-xs">Order +{p.recommendQty} {p.unit}</span>
                      {!isEmployee && (
                        <span className="text-[10px] text-gray-500 font-mono">Est Cost: KSh {p.estimatedCost.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dynamic Category Allocation & Unusual Stock Activity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Top Profit Driver Brands */}
            <div className="glass-panel p-4 rounded-xl border border-brand-border/60">
              <span className="text-[10px] text-gray-500 font-mono block uppercase mb-3">Top Gross Profit Generators</span>
              <div className="space-y-3">
                {stats.sortedByProfit.slice(0, 4).map((p, index) => {
                  const profitMargin = p.sellingPrice ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0;
                  return (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-500/10 text-emerald-400 font-bold rounded flex items-center justify-center text-[10px]">
                          #{index + 1}
                        </span>
                        <span className="text-gray-300 font-medium truncate max-w-[120px]">{p.name}</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">+{profitMargin}% Margin</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unusual Movements Alert */}
            <div className="glass-panel p-4 rounded-xl border border-brand-border/60">
              <span className="text-[10px] text-gray-500 font-mono block uppercase mb-3">Unusual Activity Logs</span>
              <div className="space-y-2.5 max-h-[160px] overflow-y-auto">
                {stats.unusualMovements.length === 0 ? (
                  <p className="text-gray-500 text-center py-6 text-[11px]">No abnormal stock losses or audits logged.</p>
                ) : (
                  stats.unusualMovements.map((m) => (
                    <div key={m.id} className="text-[11px] border-b border-brand-border/30 pb-2 last:border-0">
                      <div className="flex justify-between">
                        <span className="text-gray-200 font-semibold truncate max-w-[120px]">{m.productName}</span>
                        <span className="text-rose-400 font-mono font-bold">Qty: {m.quantity}</span>
                      </div>
                      <p className="text-gray-500 italic mt-0.5 font-sans">"{m.reason}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right: Charts & Velocity metrics */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="glass-panel p-5 rounded-2xl border border-brand-border/60">
            <span className="text-[10px] text-gray-500 font-mono block uppercase mb-4">Stock Value Share by Category</span>
            {isEmployee ? (
              <div className="h-44 flex flex-col items-center justify-center text-center">
                <ShieldAlert className="w-6 h-6 text-rose-400 mb-2" />
                <span className="text-xs text-gray-400 font-semibold">Cost Valuation Access Restricted</span>
                <p className="text-[10px] text-gray-500 mt-1 max-w-[200px]">Only Business Owners can visualize inventory capital structures.</p>
              </div>
            ) : stats.categoryDistData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-gray-500 text-xs">No active category valuation available.</div>
            ) : (
              <div className="h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryDistData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.categoryDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`KSh ${Number(value).toLocaleString()}`, 'Valuation']} 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Legend panel */}
                <div className="w-1/2 space-y-1 text-[10px] overflow-y-auto max-h-[160px] pl-3">
                  {stats.categoryDistData.map((d, index) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-gray-400 truncate">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Velocity Indicators (Best vs Slow Movers) */}
          <div className="glass-panel p-4 rounded-xl border border-brand-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-mono block uppercase">Warehouse Turnover Speed</span>
              {!isEmployee && (
                <span className="text-emerald-400 text-xs font-mono font-bold">Ratio: {stats.turnoverRatio.toFixed(2)}x</span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <span className="text-emerald-400 font-semibold block border-b border-emerald-500/10 pb-1 mb-2">🚀 High Velocity</span>
                <div className="space-y-2">
                  {stats.bestSellers.slice(0, 3).map(p => (
                    <div key={p.id}>
                      <span className="text-gray-300 font-medium truncate block max-w-[120px]">{p.name}</span>
                      <span className="text-[9px] text-gray-500 font-mono">Sold {p.unitsSold} units</span>
                    </div>
                  ))}
                  {stats.bestSellers.length === 0 && (
                    <span className="text-gray-500 text-[10px]">No sales recorded yet.</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-amber-400 font-semibold block border-b border-amber-500/10 pb-1 mb-2">🐌 Slow-Moving</span>
                <div className="space-y-2">
                  {stats.slowMovers.slice(0, 3).map(p => (
                    <div key={p.id}>
                      <span className="text-gray-300 font-medium truncate block max-w-[120px]">{p.name}</span>
                      <span className="text-[9px] text-gray-500 font-mono">Stock: {p.quantity} {p.unit}</span>
                    </div>
                  ))}
                  {stats.slowMovers.length === 0 && (
                    <span className="text-gray-500 text-[10px]">All stocks are moving!</span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
