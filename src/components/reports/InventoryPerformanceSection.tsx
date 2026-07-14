import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Layers, AlertTriangle, CheckCircle, TrendingUp, DollarSign, ArrowDownUp } from 'lucide-react';
import { Product } from '../../types';

interface InventoryPerformanceProps {
  products: Product[];
  formatKSh: (amount: number) => string;
}

interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  type: 'Receive' | 'Transfer' | 'Audit Adjustment';
  quantity: number;
  reason: string;
  requestedBy: string;
  requestedRole: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
}

export const InventoryPerformanceSection: React.FC<InventoryPerformanceProps> = ({
  products,
  formatKSh
}) => {
  // Load and isolate stock adjustments belonging to this business's products
  const stockAdjustments = useMemo(() => {
    const raw = localStorage.getItem('stock_adjustments');
    if (!raw) return [];
    try {
      const parsed: StockAdjustment[] = JSON.parse(raw);
      // Filter strictly by the current tenant's active products
      const activeProductIds = new Set(products.map(p => p.id));
      return parsed.filter(adj => activeProductIds.has(adj.productId));
    } catch (err) {
      console.error('Failed to parse stock adjustments', err);
      return [];
    }
  }, [products]);

  // Valuation metrics
  const metrics = useMemo(() => {
    let totalProducts = products.length;
    let wholesaleValue = 0;
    let retailValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
      wholesaleValue += p.costPrice * p.quantity;
      retailValue += p.sellingPrice * p.quantity;
      
      const minAlert = p.minStockAlert !== undefined ? p.minStockAlert : 10;
      if (p.quantity === 0) {
        outOfStockCount += 1;
      } else if (p.quantity <= minAlert) {
        lowStockCount += 1;
      }
    });

    const adequateCount = totalProducts - lowStockCount - outOfStockCount;
    const marginPct = retailValue > 0 ? ((retailValue - wholesaleValue) / retailValue) * 100 : 0;

    return {
      totalProducts,
      wholesaleValue,
      retailValue,
      lowStockCount,
      outOfStockCount,
      adequateCount,
      marginPct
    };
  }, [products]);

  // Pie chart data
  const chartData = useMemo(() => {
    return [
      { name: 'Adequate Stock', value: metrics.adequateCount, color: '#10b981' },
      { name: 'Low Stock Alert', value: metrics.lowStockCount, color: '#f59e0b' },
      { name: 'Out of Stock', value: metrics.outOfStockCount, color: '#f43f5e' }
    ].filter(d => d.value > 0);
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* KPI block row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-brand-border/60 bg-gray-950/25 border-b border-brand-border">
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">WHOLESALE CAPITAL VALUE</span>
          <span className="text-xl font-bold text-cyan-400 mt-1 block">
            {formatKSh(metrics.wholesaleValue)}
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Capital assets tied in inventory
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">ESTIMATED RETAIL MARGINS</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">
            {formatKSh(metrics.retailValue)}
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Potential margin profit: {metrics.marginPct.toFixed(1)}%
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">LOW STOCK LINES ALERT</span>
          <span className="text-xl font-bold text-amber-500 mt-1 block">
            {metrics.lowStockCount} Products
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Items near stock replenishment triggers
          </span>
        </div>
        <div className="p-5 font-mono">
          <span className="text-[9px] text-gray-500 uppercase tracking-wider block">OUT-OF-STOCK DEFICITS</span>
          <span className="text-xl font-bold text-rose-500 mt-1 block">
            {metrics.outOfStockCount} Products
          </span>
          <span className="text-[10px] text-gray-400 block mt-1">
            Zero current stock levels count
          </span>
        </div>
      </div>

      {/* Main split display */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Breakdown Piechart */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-200 font-sans">Warehouse Stock Health Distribution</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Summary of catalog lines categorized by stock quantity levels.</p>
          </div>

          <div className="h-[250px] w-full bg-gray-950/20 p-2 rounded-xl border border-brand-border/40 flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500 font-mono text-center">
                <Layers className="w-8 h-8 text-gray-600 mb-2" />
                No inventory listings recorded for stock health plotting.
              </div>
            )}
          </div>
        </div>

        {/* Low and out of stock lists */}
        <div className="space-y-4 font-mono text-xs">
          <div>
            <h4 className="text-xs font-semibold text-gray-200 font-sans">Critical Replenishment Alerts</h4>
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">Priority purchase requirements based on low/out inventory.</p>
          </div>

          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
            {products
              .filter(p => p.quantity <= (p.minStockAlert !== undefined ? p.minStockAlert : 10))
              .slice(0, 5)
              .map((product) => (
                <div key={product.id} className="p-3 bg-gray-950/40 border border-brand-border/50 rounded-xl flex items-center justify-between font-mono text-[11px]">
                  <div className="truncate max-w-[150px]">
                    <div className="text-xs text-gray-200 font-bold truncate font-sans">{product.name}</div>
                    <span className="text-[9px] text-gray-500 font-semibold">{product.sku} | {product.category}</span>
                  </div>
                  <div className="text-right">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      product.quantity === 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {product.quantity === 0 ? 'OUT OF STOCK' : `${product.quantity} left`}
                    </span>
                  </div>
                </div>
              ))}

            {products.filter(p => p.quantity <= (p.minStockAlert !== undefined ? p.minStockAlert : 10)).length === 0 && (
              <div className="p-8 text-center text-gray-500 border border-brand-border border-dashed rounded-xl">
                <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                All inventory lines have adequate stock levels!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Adjustments and Movements Ledger */}
      <div className="p-6 pt-0 font-mono text-[11px]">
        <div className="flex items-center gap-2 mb-3">
          <ArrowDownUp className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-semibold text-gray-200 font-sans">Inventory Movement & Audit Adjustments Log</h4>
        </div>

        <div className="border border-brand-border rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse text-gray-300">
            <thead>
              <tr className="bg-gray-950 text-gray-400 border-b border-brand-border text-[9px] uppercase tracking-wider">
                <th className="p-4">Timestamp Date</th>
                <th className="p-4">Product Name</th>
                <th className="p-4 text-center">Movement Type</th>
                <th className="p-4 text-center">Quantity Delta</th>
                <th className="p-4">Reason Description</th>
                <th className="p-4 text-right">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60">
              {stockAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-gray-500 font-mono">No stock movements or adjustments cataloged inside this business workspace.</td>
                </tr>
              ) : (
                stockAdjustments.map(adj => (
                  <tr key={adj.id} className="hover:bg-gray-900/35 transition">
                    <td className="p-4 whitespace-nowrap text-gray-400">{adj.date}</td>
                    <td className="p-4 font-bold text-gray-200 font-sans">{adj.productName}</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-950 border border-brand-border text-gray-400">
                        {adj.type}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-cyan-400">{adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}</td>
                    <td className="p-4 text-gray-400 truncate max-w-[200px] font-sans">{adj.reason}</td>
                    <td className="p-4 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        adj.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        adj.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {adj.status}
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
  );
};
