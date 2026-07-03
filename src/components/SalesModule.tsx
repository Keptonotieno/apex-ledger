import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Customer } from '../types';
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, 
  User, CreditCard, Check, Ticket, Receipt, X, Printer
} from 'lucide-react';

export const SalesModule: React.FC = () => {
  const { 
    products, 
    customers, 
    addCustomer, 
    recordSale,
    activeUser,
    activeBusiness,
    branches
  } = useApp();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Basket State
  const [basket, setBasket] = useState<{ product: Product; quantity: number }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerNameInput, setCustomerNameInput] = useState('Walk-in Customer');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Mobile Money' | 'Credit'>('Cash');

  // Modal receipt states
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null);
  
  // Custom print-friendly receipt states
  const [receiptTemplate, setReceiptTemplate] = useState<'pos' | 'a4'>('a4');
  const [kraPin, setKraPin] = useState('P051234567X');
  const [vatNo, setVatNo] = useState('01234567A');
  const [includeTerms, setIncludeTerms] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [customGreeting, setCustomGreeting] = useState('Thank you for shopping with us! Welcome back.');
  const [showLogo, setShowLogo] = useState(true);

  // New customer creation state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Categories extraction
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtering products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.barcode.includes(searchTerm);
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      // Check stock max limit
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

  // Calculations
  const subtotal = basket.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);
  const tax = Math.round(subtotal * 0.16); // 16% standard VAT
  const total = subtotal - discount + tax;

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
    // Clear forms
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
    
    // For credit claims, must select a registered customer
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
        // Reset POS state
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
      
      {/* Products Browsing Grid (7/12 width) */}
      <div className="lg:col-span-7 space-y-4">
        
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
            {categories.map((cat) => (
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
          {filteredProducts.map((p) => {
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
          })}
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
                <div className="font-bold text-gray-300">Quick Register Client</div>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-1.5 bg-gray-900 border border-brand-border rounded text-gray-200 outline-none focus:border-cyan-500/30"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full p-1.5 bg-gray-900 border border-brand-border rounded text-gray-200 outline-none focus:border-cyan-500/30 font-mono"
                />
                <div className="flex gap-1.5">
                  <button 
                    type="submit"
                    className="flex-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-500/30 rounded py-1 font-mono font-bold"
                  >
                    Save
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAddCustomer(false)}
                    className="flex-1 bg-gray-900 hover:bg-gray-850 text-gray-400 border border-brand-border rounded py-1"
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
          <div className="max-h-56 overflow-y-auto space-y-2 mb-4">
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
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs text-gray-200 font-bold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 text-gray-400 hover:text-cyan-400 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button 
                      onClick={() => removeFromBasket(item.product.id)}
                      className="p-1 text-rose-500 hover:bg-rose-950/20 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
              <option value="Mobile Money">Mobile Money</option>
              <option value="Credit">Credit (Debt Tab)</option>
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
            <div className="flex justify-between text-sm font-bold text-cyan-400 pt-1">
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

        {/* Modal Invoice Receipt View with download / print triggers to fulfill PDF simulation */}
        {showReceipt && lastCompletedSale && (() => {
          const custInfo = lastCompletedSale.customerId 
            ? customers.find(c => c.id === lastCompletedSale.customerId)
            : null;
            
          return (
            <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto print:static print:bg-white print:text-black print:p-0 print:m-0 print:overflow-visible">
              <div className="glass-panel p-6 rounded-2xl w-full max-w-4xl shadow-2xl relative border border-brand-border animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto md:overflow-visible print:bg-white print:text-black print:border-none print:shadow-none print:p-0 print:m-0 print:max-h-none print:overflow-visible print:w-full">
                
                {/* Left Panel: Customized options, hidden on print */}
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

                {/* Right Panel: Live Document Preview, styles completely adapt on print */}
                <div className="flex-1 md:max-h-[75vh] md:overflow-y-auto pr-1 print:overflow-visible print:max-h-none print:p-0 print:m-0 print:w-full print:bg-white print:text-black">
                  
                  {/* Outer wrap matching template sizing */}
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
                              {branches.find(b => b.status === 'Active')?.location || 'Central Plaza, Mombasa Rd'} <br />
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

                        {/* Customer & Transaction Metadata Grid */}
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
                              <p className="text-[10px] text-gray-500 print:text-gray-500 italic mt-0.5">Regular retail over-the-counter transaction</p>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] font-mono text-cyan-400 font-bold block mb-1">Invoice Details:</span>
                            <p className="text-[10px] text-gray-400 print:text-gray-600 space-y-1">
                              <span>Date Generated: <strong className="text-gray-200 print:text-black">{lastCompletedSale.date}</strong></span> <br />
                              <span>Time Generated: <strong className="text-gray-200 print:text-black">{lastCompletedSale.time}</strong></span> <br />
                              <span>Cashier Name: <strong className="text-gray-200 print:text-black capitalize">{lastCompletedSale.cashierName}</strong></span> <br />
                              <span>Payment Status: <strong className="text-emerald-400 font-mono font-bold">{lastCompletedSale.paymentMethod === 'Credit' ? 'UNPAID LEDGER' : 'PAID / SECURED'}</strong></span>
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

                        {/* Totals and Terms section */}
                        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
                          <div className="flex-1 max-w-xs text-[10px] text-gray-400 print:text-gray-600 space-y-1 bg-gray-950/15 p-3 rounded-xl border border-brand-border/30 print:border-black/10 print:bg-transparent">
                            <span className="font-bold text-cyan-400/80 block mb-1">Standard Declarations:</span>
                            <p className="leading-relaxed">
                              {customGreeting} <br />
                              Prices include standard 16% VAT rate where applicable. This is a secure system invoice synchronized to Supabase Cloud Storage.
                            </p>
                          </div>

                          <div className="w-full sm:w-64 space-y-1.5 text-xs">
                            <div className="flex justify-between text-gray-400 print:text-gray-600 font-mono text-[11px]">
                              <span>Gross Base Subtotal:</span>
                              <span className="font-bold">KSh {lastCompletedSale.totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-400 print:text-gray-600 font-mono text-[11px]">
                              <span>Discount Approved:</span>
                              <span className="text-rose-400 font-bold">- KSh {lastCompletedSale.discount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-400 print:text-gray-600 font-mono text-[11px]">
                              <span>KRA 16% VAT Tax Portion:</span>
                              <span className="font-bold">KSh {lastCompletedSale.tax.toLocaleString()}</span>
                            </div>
                            <div className="h-[1px] bg-brand-border/60 print:bg-black/10 my-1" />
                            <div className="flex justify-between text-cyan-400 print:text-black font-black font-mono text-sm pt-0.5">
                              <span>Net Payable Total:</span>
                              <span>KSh {lastCompletedSale.netAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[11px] pt-1.5 border-t border-brand-border/40 print:border-black/10">
                              <span className="text-gray-400 print:text-gray-600">Settled via:</span>
                              <span className="font-bold text-cyan-400 print:text-black font-mono">{lastCompletedSale.paymentMethod.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Terms and Signature Footer */}
                        <div className="border-t border-brand-border/60 pt-4 mt-6 print:border-black/20">
                          {includeTerms && (
                            <div className="text-[9px] text-gray-500 print:text-gray-500 leading-relaxed text-center italic mb-4">
                              Terms & Conditions: Interest rate of 2% monthly will be levied on credit statements not settled past 30 days. High Court of Kenya handles disputes. All payments should be sent directly to Paybill: 400400, Account: {activeBusiness.name}.
                            </div>
                          )}

                          {includeSignature && (
                            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-dashed border-brand-border/40 print:border-black/10">
                              <div className="text-center">
                                <div className="h-8 border-b border-brand-border/40 print:border-black/20 mx-auto w-32" />
                                <span className="text-[9px] text-gray-500 block mt-1">Cashier Signature</span>
                                <span className="text-[8px] font-mono text-gray-600 uppercase">Cashier ID: {lastCompletedSale.cashierName.substring(0,3)}/2026</span>
                              </div>
                              <div className="text-center">
                                <div className="h-8 border-b border-brand-border/40 print:border-black/20 mx-auto w-32" />
                                <span className="text-[9px] text-gray-500 block mt-1">Authorized Audit Stamp</span>
                                <span className="text-[8px] font-mono text-gray-600 uppercase">Apex Ledger Verified Secure</span>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                    {/* POS 80mm Slip Format */}
                    {receiptTemplate === 'pos' && (
                      <div className="space-y-4 font-mono text-gray-300 print:text-black print:bg-white print:w-full">
                        
                        {/* Compact Header */}
                        <div className="text-center space-y-1 pb-2 border-b border-dashed border-brand-border print:border-black/20">
                          <h3 className="font-bold text-base text-cyan-400 print:text-black">{activeBusiness.name.toUpperCase()}</h3>
                          <p className="text-[9px] text-gray-400 print:text-gray-600">
                            BRANCH: {activeBusiness.branch || 'NAIROBI'} <br />
                            KRA PIN: {kraPin} | TEL: +254700000000
                          </p>
                          <p className="text-[10px] font-bold text-gray-200 print:text-black tracking-widest mt-1">POS TRANSACTION SLIP</p>
                        </div>

                        {/* Compact Metadata */}
                        <div className="space-y-1 text-[10px] text-gray-400 print:text-gray-600">
                          <div className="flex justify-between">
                            <span>Slip Number:</span>
                            <span className="text-gray-200 print:text-black font-bold">{lastCompletedSale.invoiceNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Date/Time:</span>
                            <span>{lastCompletedSale.date} {lastCompletedSale.time}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cashier:</span>
                            <span className="capitalize">{lastCompletedSale.cashierName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Customer:</span>
                            <span className="capitalize font-bold">{lastCompletedSale.customerName}</span>
                          </div>
                        </div>

                        <div className="border-b border-dashed border-brand-border print:border-black/20" />

                        {/* Simple itemized lists */}
                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex justify-between text-gray-500 font-bold">
                            <span>Item Name [Qty]</span>
                            <span>Total (KSh)</span>
                          </div>
                          {lastCompletedSale.items.map((it: any, index: number) => (
                            <div key={index} className="flex justify-between text-gray-200 print:text-black">
                              <span>{it.productName} [{it.quantity}]</span>
                              <span>{(it.quantity * it.priceAtSale).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <div className="border-b border-dashed border-brand-border print:border-black/20" />

                        {/* Slip totals */}
                        <div className="space-y-1 text-[10px] text-right">
                          <div className="flex justify-between text-gray-400 print:text-gray-600">
                            <span>Subtotal:</span>
                            <span>KSh {lastCompletedSale.totalAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-gray-400 print:text-gray-600">
                            <span>Discount:</span>
                            <span>- KSh {lastCompletedSale.discount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-gray-400 print:text-gray-600">
                            <span>VAT portion (16%):</span>
                            <span>KSh {lastCompletedSale.tax.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-cyan-400 print:text-black font-black text-xs pt-1 border-t border-dashed border-brand-border/40 print:border-black/15">
                            <span>NET PAYABLE:</span>
                            <span>KSh {lastCompletedSale.netAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pt-1 font-bold">
                            <span>PAY VIA:</span>
                            <span className="text-cyan-400 print:text-black">{lastCompletedSale.paymentMethod.toUpperCase()}</span>
                          </div>
                        </div>

                        {/* Slip footer */}
                        <div className="text-center text-[9px] text-gray-500 print:text-gray-500 pt-3 border-t border-dashed border-brand-border/40 print:border-black/20 space-y-1 leading-tight">
                          <p>{customGreeting}</p>
                          <p className="font-bold uppercase tracking-wider text-[8px]">System secure: Apex Ledger Vault</p>
                          <p>© 2026 Kenyan Enterprise Standard POS</p>
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

    </div>
  );
};
