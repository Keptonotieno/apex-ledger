import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatKSh } from '../lib/utils';
import { 
  ClipboardList, Search, FileText, Printer, CheckCircle,
  TrendingUp, Calendar, ChevronRight, ShoppingCart, User, Edit, Trash2, X
} from 'lucide-react';

export const SalesOrdersFeed: React.FC = () => {
  const { sales, activeBusiness, updateSale, deleteSale } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [selectedSale, setSelectedSale] = useState<any>(sales[0] || null);

  // Edit and Delete states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<any | null>(null);

  // Edit fields
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<any>('');

  const handleOpenEditSale = (sale: any) => {
    setEditingSale(sale);
    setEditCustomerName(sale.customerName);
    setEditPaymentMethod(sale.paymentMethod);
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    updateSale(editingSale.id, {
      customerName: editCustomerName,
      paymentMethod: editPaymentMethod
    });

    if (selectedSale?.id === editingSale.id) {
      setSelectedSale({
        ...selectedSale,
        customerName: editCustomerName,
        paymentMethod: editPaymentMethod
      });
    }

    setShowEditModal(false);
    setEditingSale(null);
  };

  const handleDeleteSale = (sale: any) => {
    setSaleToDelete(sale);
    setShowDeleteModal(true);
  };

  const confirmDeleteSale = () => {
    if (!saleToDelete) return;
    deleteSale(saleToDelete.id);
    
    if (selectedSale?.id === saleToDelete.id) {
      setSelectedSale(null);
    }
    
    setShowDeleteModal(false);
    setSaleToDelete(null);
  };

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.cashierName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPayment = paymentFilter === 'All' || s.paymentMethod === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  const handlePrintReceipt = () => {
    alert(`Initiating secure local network print for Invoice: ${selectedSale?.invoiceNumber}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Action Header */}
      <div className="glass-panel p-6 rounded-2xl border-t-2 border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
            Live Sales Orders & Audit Feed
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real-time feed of point-of-sale registers. Track receipt print states and payments method channels.
          </p>
        </div>

        <div className="text-right bg-gray-950/40 px-4 py-2 rounded-xl border border-brand-border">
          <p className="text-[9px] text-gray-500 font-mono">TOTAL ORDERS TODAY</p>
          <p className="text-sm font-bold text-cyan-400 font-mono">{sales.length} Registers</p>
        </div>
      </div>

      {/* Main feed list vs Detail receipt docket split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Filter and Feed Listing */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Filters Bar */}
          <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 bg-gray-950/50 border border-brand-border rounded-xl px-3 py-1.5 text-xs">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search orders by invoice, cashier, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-gray-300 w-full"
              />
            </div>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-gray-950/80 border border-brand-border text-xs rounded-xl px-3 py-1.5 text-gray-300 outline-none hover:border-cyan-500/30 transition"
            >
              <option value="All">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Credit">Credit</option>
            </select>
          </div>

          {/* List panel */}
          <div className="glass-panel p-4 rounded-2xl h-[470px] overflow-y-auto space-y-2.5 pr-1">
            {filteredSales.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <ShoppingCart className="w-10 h-10 text-gray-800 animate-pulse" />
                <p className="text-xs font-semibold text-gray-400 mt-2">No matching transactions</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Please check your filters and query.</p>
              </div>
            ) : (
              filteredSales.map((sale) => (
                <button
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition ${
                    selectedSale?.id === sale.id 
                      ? 'bg-cyan-950/20 border-cyan-500/40' 
                      : 'bg-gray-950/35 border-brand-border hover:border-brand-border/80'
                  }`}
                >
                  <div className="space-y-1.5 overflow-hidden pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-200 font-mono">{sale.invoiceNumber}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-gray-900 text-gray-400 rounded border border-brand-border font-mono uppercase">
                        {sale.paymentMethod}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <User className="w-3 h-3 text-cyan-400" />
                      <span className="capitalize">{sale.customerName}</span>
                      <span className="text-gray-600">•</span>
                      <span>By {sale.cashierName}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold font-mono text-cyan-400">
                      {formatKSh(sale.netAmount)}
                    </p>
                    <p className="text-[9px] text-gray-500 font-mono mt-0.5">{sale.date} {sale.time}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Interactive POS Invoice Receipt dockets */}
        <div className="lg:col-span-5">
          {selectedSale ? (
            <div className="glass-panel p-6 rounded-2xl h-[548px] flex flex-col justify-between">
              
              {/* Receipt Body Frame */}
              <div className="space-y-4">
                <div className="border-b border-brand-border/60 pb-3 text-center">
                  <h3 className="text-sm font-extrabold text-cyan-400 font-sans tracking-wide">APEX LEDGER SYSTEM RECEIPT</h3>
                  <p className="text-[9px] text-gray-500 font-mono mt-0.5">SECURED CORPORATE INVOICING DOCKET</p>
                </div>

                {/* Metadata block */}
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 bg-gray-950/45 p-3 rounded-xl border border-brand-border/60 text-[10px] font-mono text-gray-400">
                  <div>
                    <span className="text-gray-600">INVOICE NO:</span>
                    <p className="text-gray-300 font-bold">{selectedSale.invoiceNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">TIMESTAMP:</span>
                    <p className="text-gray-300">{selectedSale.date} {selectedSale.time}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">CLIENT NAME:</span>
                    <p className="text-gray-300 capitalize truncate">{selectedSale.customerName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">OPERATING BRANCH:</span>
                    <p className="text-gray-300">{activeBusiness.branch || 'Main HQ'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">APPROVED BY:</span>
                    <p className="text-cyan-400 capitalize truncate">{selectedSale.cashierName} ({selectedSale.cashierRole})</p>
                  </div>
                  <div>
                    <span className="text-gray-600">PAY METHOD:</span>
                    <p className="text-emerald-400 font-bold">{selectedSale.paymentMethod}</p>
                  </div>
                </div>

                {/* Items sold table dockets */}
                <div className="space-y-2.5">
                  <p className="text-[10px] text-gray-500 font-mono border-b border-brand-border/40 pb-1.5 uppercase">TRANSACTION DETAILS</p>
                  <div className="max-h-36 overflow-y-auto space-y-2 font-mono text-[10px] pr-1">
                    {selectedSale.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start border-b border-gray-950/40 pb-1.5">
                        <div className="overflow-hidden pr-2">
                          <p className="text-gray-200 font-bold truncate">{item.productName}</p>
                          <p className="text-gray-500 text-[9px]">{item.quantity} x {formatKSh(item.priceAtSale)}</p>
                        </div>
                        <span className="text-gray-200 font-bold shrink-0">
                          {formatKSh(item.quantity * item.priceAtSale)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial aggregates */}
                <div className="space-y-1 text-xs border-t border-brand-border/60 pt-3">
                  <div className="flex justify-between text-gray-500 text-[11px] font-mono">
                    <span>Subtotal:</span>
                    <span>{formatKSh(selectedSale.totalAmount)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-rose-400 text-[11px] font-mono">
                      <span>Discount deduction:</span>
                      <span>-{formatKSh(selectedSale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500 text-[11px] font-mono">
                    <span>V.A.T Tax estimation (16%):</span>
                    <span>{formatKSh(selectedSale.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-100 font-mono text-sm border-t border-dashed border-brand-border/60 pt-2.5 mt-2">
                    <span className="text-cyan-400">NET RECEIVED:</span>
                    <span className="text-cyan-400">{formatKSh(selectedSale.netAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Action and print footer */}
              <div className="space-y-3.5">
                <div className="flex gap-2">
                  <button
                    onClick={handlePrintReceipt}
                    className="flex-1 py-2.5 bg-cyan-400 hover:bg-cyan-500 text-gray-950 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    onClick={() => handleOpenEditSale(selectedSale)}
                    className="p-2.5 bg-gray-950 border border-brand-border hover:text-cyan-400 hover:border-cyan-500/20 rounded-xl transition cursor-pointer"
                    title="Edit Sale Record"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSale(selectedSale)}
                    className="p-2.5 bg-gray-950 border border-brand-border hover:text-rose-400 hover:border-rose-500/20 rounded-xl transition cursor-pointer"
                    title="Delete & Void Transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-center text-[9px] text-gray-500 font-mono flex items-center justify-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  CRYPTOGRAPHIC TRANSACTION TOKEN ID: tx_{selectedSale.id}
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl h-[548px] flex flex-col items-center justify-center text-center border-dashed">
              <ClipboardList className="w-12 h-12 text-gray-800 animate-pulse" />
              <p className="text-xs font-semibold text-gray-400 mt-2">No transaction selected</p>
              <p className="text-[10px] text-gray-500 max-w-[190px] mt-1">
                Select an active POS register to view the fully printable receipt breakdown.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Edit Sale Modal */}
      {showEditModal && editingSale && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowEditModal(false);
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

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-gray-400 block mb-1 font-sans">Customer Account / Name</label>
                <input
                  type="text"
                  required
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/30 font-sans font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-sans">Payment Method</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-300 outline-none focus:border-cyan-500/30"
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
                Save Invoice Descriptive Edits
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Void Sale Modal */}
      {showDeleteModal && saleToDelete && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md shadow-2xl relative border border-rose-500/30 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowDeleteModal(false);
                setSaleToDelete(null);
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
                  Void & Delete Sale Transaction?
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Are you sure you want to void and permanently delete this transaction from the corporate sales register? This will subtract the received net cash from business accounts and analytics.
                </p>
                <div className="bg-gray-950/50 p-3 rounded-xl border border-brand-border/60 text-left space-y-1.5 mt-2 font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">INVOICE NO:</span>
                    <span className="text-gray-300 font-medium">{saleToDelete.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">CUSTOMER:</span>
                    <span className="text-cyan-400 font-medium capitalize">{saleToDelete.customerName}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">NET SALES REVENUE:</span>
                    <span className="text-rose-400 font-bold">{formatKSh(saleToDelete.netAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">PROCESSED DATE:</span>
                    <span className="text-gray-400">{saleToDelete.date} {saleToDelete.time}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSaleToDelete(null);
                  }}
                  className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-300 font-medium rounded-xl text-xs transition cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSale}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl text-xs transition shadow-lg shadow-rose-950/30 cursor-pointer font-sans"
                >
                  Void & Delete Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
