import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Tag, ShoppingBag, AlertTriangle, CheckCircle, TrendingUp, DollarSign } from 'lucide-react';
import { Sale, Product } from '../../types';

interface ProductPerformanceProps {
  sales: Sale[];
  products: Product[];
  formatKSh: (amount: number) => string;
}

export const ProductPerformanceSection: React.FC<ProductPerformanceProps> = ({
  sales,
  products,
  formatKSh
}) => {
  const [viewTab, setViewTab] = useState<'top' | 'slow'>('top');

  // Compute metrics for every single product
  const productMetrics = useMemo(() => {
    // Group sales items
    const salesGroup: Record<string, { qty: number; rev: number; profit: number }> = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const pId = item.productId;
        const qty = item.quantity;
        const itemRev = item.quantity * item.priceAtSale;
        const itemCost = item.quantity * (item.costPriceAtSale || 0);
        const itemProfit = itemRev - itemCost;

        if (!salesGroup[pId]) {
          salesGroup[pId] = { qty: 0, rev: 0, profit: 0 };
        }
        salesGroup[pId].qty += qty;
        salesGroup[pId].rev += itemRev;
        salesGroup[pId].profit += itemProfit;
      });
    });

    // Merge with master catalog to ensure we detect products with ZERO sales (slow-moving)
    return products.map(p => {
      const salesData = salesGroup[p.id] || { qty: 0, rev: 0, profit: 0 };
      // Real profit margin
      const margin = salesData.rev > 0 ? (salesData.profit / salesData.rev) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku || 'N/A',
        category: p.category,
        stock: p.quantity,
        unit: p.unit || 'Units',
        cost: p.costPrice,
        price: p.sellingPrice,
        qtySold: salesData.qty,
        revenue: salesData.rev,
        profit: salesData.profit,
        margin: margin
      };
    });
  }, [sales, products]);

  // Split into Top and Slow
  const { topProducts, slowProducts, aggregates } = useMemo(() => {
    // Sort for top (highest qty sold descending)
    const sortedByQty = [...productMetrics].sort((a, b) => b.qtySold - a.qtySold);
    const top = sortedByQty.filter(p => p.qtySold > 0).slice(0, 10);

    // Slow moving - either 0 sales, or sorted ascending by qty sold
    const slow = [...productMetrics].sort((a, b) => {
      // Prioritize 0 sales first, then lowest quantities sold, then lowest stock value
      if (a.qtySold !== b.qtySold) {
        return a.qtySold - b.qtySold;
      }
      return b.stock - a.stock; // If both have 0 sales, rank the one with higher trapped capital first
    });

    // Aggregates
    const totalQtySold = productMetrics.reduce((acc, p) => acc + p.qtySold, 0);
    const totalProductProfit = productMetrics.reduce((acc, p) => acc + p.profit, 0);
    const bestSeller = top[0] || null;

    const trappedCapital = productMetrics
      .filter(p => p.qtySold === 0)
      .reduce((acc, p) => acc + p.cost * p.stock, 0);

    return {
      topProducts: top,
      slowProducts: slow.slice(0, 10),
      aggregates: {
        totalQtySold,
        totalProductProfit,
        bestSeller,
        trappedCapital,
        totalCatalog: productMetrics.length
      }
    };
  }, [productMetrics]);

  // Chart data for Top Selling
  const topChartData = useMemo(() => {
    return topProducts.slice(0, 5).map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 12) + '...' : p.name,
      'Units Sold': p.qtySold,
      Revenue: p.revenue / 100 // Scale for visual balance
    }));
  }, [topProducts]);

  return (
    <div className="space-y-6">
      {/* Product KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-brand-border/60 bg-gray-950/25 border-b border-brand-border">
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">BEST SELLING PRODUCT</span>
          <span className="text-lg font-bold text-cyan-400 mt-1 block truncate">
            {aggregates.bestSeller ? aggregates.bestSeller.name : 'N/A'}
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Sold: {aggregates.bestSeller ? aggregates.bestSeller.qtySold : 0} units
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">TOTAL DISPATCHED INVENTORY</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">
            {aggregates.totalQtySold} Units
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Sales volume checkout count
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">PRODUCT GROSS PROFIT</span>
          <span className="text-xl font-bold text-gray-200 mt-1 block">
            {formatKSh(aggregates.totalProductProfit)}
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Direct inventory markup earnings
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">SLOW-MOVING CAPITAL TRAPPED</span>
          <span className="text-xl font-bold text-rose-400 mt-1 block">
            {formatKSh(aggregates.trappedCapital)}
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Cost value of zero-sale inventory
          </span>
        </div>
      </div>

      {/* Selector and Main Dashboard Body */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h4 className="text-xs font-semibold text-gray-200 font-sans">Product Catalog Performance Analysis</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Highlighting high-velocity lines and identifying low-performing stock items.</p>
          </div>

          {/* Tab selector */}
          <div className="flex items-center gap-1.5 bg-gray-950 p-1 rounded-xl border border-brand-border/60">
            <button
              onClick={() => setViewTab('top')}
              className={`px-3 py-1.5 rounded-lg font-mono text-[10px] transition cursor-pointer flex items-center gap-1.5 ${
                viewTab === 'top' 
                  ? 'bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20' 
                  : 'text-gray-400 hover:text-gray-200 border border-transparent'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Top-Selling</span>
            </button>
            <button
              onClick={() => setViewTab('slow')}
              className={`px-3 py-1.5 rounded-lg font-mono text-[10px] transition cursor-pointer flex items-center gap-1.5 ${
                viewTab === 'slow' 
                  ? 'bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20' 
                  : 'text-gray-400 hover:text-gray-200 border border-transparent'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Slow-Moving</span>
            </button>
          </div>
        </div>

        {/* Charts & Listings split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recharts section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="h-[260px] w-full bg-gray-950/20 p-2 rounded-xl border border-brand-border/40">
              {topChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={topChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} className="font-mono" />
                    <YAxis stroke="#6b7280" fontSize={10} className="font-mono" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                    <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                    <Bar name="Units Sold" dataKey="Units Sold" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar name="Revenue (x100 KSh)" dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 font-mono text-center">
                  <ShoppingBag className="w-8 h-8 text-gray-600 mb-2" />
                  No direct sales records available for charting.
                </div>
              )}
            </div>

            <div className="p-3.5 bg-gray-950/40 rounded-xl border border-brand-border/60 text-[10px] text-gray-400 font-mono flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                {viewTab === 'top' 
                  ? 'Showing high frequency sales items. Adjust supplier purchase orders to matches demand pace.' 
                  : 'Identify these stagnant items. Consider run clearance promotions, bundled packages, or markup discount.'}
              </span>
            </div>
          </div>

          {/* Grid listing side */}
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {viewTab === 'top' ? (
              topProducts.length === 0 ? (
                <div className="p-10 text-center text-gray-500 font-mono">No top-performing products logged.</div>
              ) : (
                topProducts.map((p, index) => (
                  <div key={p.id} className="p-3 bg-gray-950/40 border border-brand-border/50 rounded-xl flex items-center justify-between font-mono">
                    <div className="space-y-0.5 truncate max-w-[140px]">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[10px] text-cyan-400 font-bold">#{index+1}</span>
                        <span className="text-gray-200 font-bold truncate font-sans">{p.name}</span>
                      </div>
                      <span className="text-[9px] text-gray-500 font-semibold">{p.sku} | {p.category}</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="text-cyan-400 font-bold text-xs">{p.qtySold} sold</div>
                      <div className="text-[9px] text-gray-400 font-semibold">{formatKSh(p.revenue)}</div>
                    </div>
                  </div>
                ))
              )
            ) : (
              slowProducts.length === 0 ? (
                <div className="p-10 text-center text-gray-500 font-mono">No slow-moving items logged.</div>
              ) : (
                slowProducts.map((p) => (
                  <div key={p.id} className="p-3 bg-gray-950/40 border border-brand-border/50 rounded-xl flex items-center justify-between font-mono">
                    <div className="space-y-0.5 truncate max-w-[140px]">
                      <div className="text-xs text-gray-200 font-bold truncate font-sans">{p.name}</div>
                      <span className="text-[9px] text-gray-500 font-semibold">Stock: {p.stock} {p.unit} trapped</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="text-amber-400 font-bold text-xs">{p.qtySold} sold</div>
                      <div className="text-[9px] text-gray-400 font-semibold">Cap: {formatKSh(p.stock * p.cost)}</div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
