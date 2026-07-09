import React, { useState, useEffect } from 'react';
import { Product, UserRole, Category } from '../types';
import { X, Package, DollarSign, List, Truck, FileText, Plus, Check, Image, Trash2, HelpCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  onSave: (data: any) => void;
  categories: Category[];
  onAddCategory: (category: string) => void;
  isCategoriesEnabled?: boolean;
  isEmployee?: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  onSave,
  categories,
  onAddCategory,
  isCategoriesEnabled = true,
  isEmployee = false
}) => {
  // Tabs for structured portfolio form
  const [activeFormTab, setActiveFormTab] = useState<'info' | 'pricing' | 'supplier' | 'media'>('info');

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [description, setDescription] = useState('');
  
  // Pricing
  const [costPrice, setCostPrice] = useState(0); // Buying Price
  const [sellingPrice, setSellingPrice] = useState(0);
  const [pricingType, setPricingType] = useState<'Fixed Unit' | 'Measured'>('Fixed Unit');
  const [measuredUnit, setMeasuredUnit] = useState('Kilograms');

  // Stock
  const [quantity, setQuantity] = useState(0);
  const [minStockAlert, setMinStockAlert] = useState(5); // Reorder Level
  const [maxStock, setMaxStock] = useState(100);
  const [unit, setUnit] = useState('Units'); // Fixed Unit type (or custom)
  const [category, setCategory] = useState('');
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [showCustomCatInput, setShowCustomCatInput] = useState(false);

  // Supplier
  const [supplier, setSupplier] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierCompany, setSupplierCompany] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierNotes, setSupplierNotes] = useState('');

  // Status
  const [productStatus, setProductStatus] = useState<'Active' | 'Hidden' | 'Discontinued'>('Active');

  // Images & Documents Simulator
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [documents, setDocuments] = useState<{ name: string; url: string; type: string }[]>([]);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Warranty File');

  // Prepopulate form on open / editingProduct changes
  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name || '');
      setSku(editingProduct.sku || '');
      setBarcode(editingProduct.barcode || '');
      setQrCode(editingProduct.qrCode || '');
      setDescription(editingProduct.description || '');
      setCostPrice(editingProduct.costPrice || 0);
      setSellingPrice(editingProduct.sellingPrice || 0);
      setPricingType(editingProduct.pricingType || 'Fixed Unit');
      
      const measuredUnits = ['Kilograms', 'Grams', 'Litres', 'Millilitres', 'Metres', 'Square Metres', 'Cubic Metres'];
      if (measuredUnits.includes(editingProduct.unit)) {
        setMeasuredUnit(editingProduct.unit);
      } else {
        setUnit(editingProduct.unit || 'Units');
      }
      
      setQuantity(editingProduct.quantity || 0);
      setMinStockAlert(editingProduct.minStockAlert || 5);
      setMaxStock(editingProduct.maxStock || 100);
      setCategory(editingProduct.category || '');
      setSupplier(editingProduct.supplier || '');
      setSupplierPhone(editingProduct.supplierPhone || '');
      setSupplierEmail(editingProduct.supplierEmail || '');
      setSupplierCompany(editingProduct.supplierCompany || '');
      setSupplierAddress(editingProduct.supplierAddress || '');
      setSupplierNotes(editingProduct.supplierNotes || '');
      setProductStatus(editingProduct.productStatus || 'Active');
      setImageUrl(editingProduct.imageUrl || '');
      setImages(editingProduct.images || []);
      setDocuments(editingProduct.documents || []);
    } else {
      // Create fresh auto-generated SKU & Barcode
      setName('');
      setSku('SKU-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.random().toString(36).substring(2, 5).toUpperCase());
      setBarcode('600' + Math.floor(100000000 + Math.random() * 900000000));
      setQrCode('QR-' + Math.floor(10000000 + Math.random() * 90000000));
      setDescription('');
      setCostPrice(0);
      setSellingPrice(0);
      setPricingType('Fixed Unit');
      setMeasuredUnit('Kilograms');
      setQuantity(10);
      setMinStockAlert(5);
      setMaxStock(100);
      setUnit('Units');
      
      const defaultCategory = (isCategoriesEnabled && categories.length > 0)
        ? (categories[0].name || '')
        : '';
      setCategory(defaultCategory);
      setSupplier('');
      setSupplierPhone('');
      setSupplierEmail('');
      setSupplierCompany('');
      setSupplierAddress('');
      setSupplierNotes('');
      setProductStatus('Active');
      setImageUrl('');
      setImages([]);
      setDocuments([]);
    }
    setActiveFormTab('info');
  }, [editingProduct, isOpen, categories]);

  // Pricing calculations
  const expectedProfit = Math.max(0, sellingPrice - costPrice);
  const profitMargin = sellingPrice ? ((expectedProfit / sellingPrice) * 100) : 0;
  const markupPercentage = costPrice ? ((expectedProfit / costPrice) * 100) : 0;

  if (!isOpen) return null;

  const handleCreateCustomCategory = () => {
    if (isEmployee) return;
    if (!newCustomCategory.trim()) return;
    onAddCategory(newCustomCategory.trim());
    setCategory(newCustomCategory.trim());
    setNewCustomCategory('');
    setShowCustomCatInput(false);
  };

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    setImages([...images, imageUrl.trim()]);
    setImageUrl('');
  };

  const handleAddDocument = () => {
    if (!docName.trim()) return;
    const fileExtension = docType === 'Warranty File' ? 'pdf' : (docType === 'Invoice' ? 'docx' : 'xlsx');
    const mockUrl = `/files/${docName.toLowerCase().replace(/\s+/g, '_')}.${fileExtension}`;
    setDocuments([...documents, { name: docName, url: mockUrl, type: docType }]);
    setDocName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) {
      alert('Product Name and SKU are mandatory fields.');
      return;
    }

    const payload = {
      name,
      sku,
      barcode,
      qrCode,
      description,
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      pricingType,
      quantity: Number(quantity),
      minStockAlert: Number(minStockAlert),
      maxStock: Number(maxStock),
      unit: pricingType === 'Measured' ? measuredUnit : unit,
      category,
      supplier,
      supplierPhone,
      supplierEmail,
      supplierCompany,
      supplierAddress,
      supplierNotes,
      productStatus,
      imageUrl: images[0] || '', // primary fallback
      images,
      documents
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-gray-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
      <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl shadow-2xl relative border border-brand-border flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-border/60 pb-3.5 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-100">
                {editingProduct ? 'Modify Product SKU Portfolio' : 'Create Product Portfolio'}
              </h3>
              <p className="text-[11px] text-gray-500">Provide comprehensive catalog details for synchronization</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-900 border border-transparent hover:border-brand-border/60 text-gray-400 hover:text-gray-200 rounded-lg transition"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Tab navigation within form */}
        <div className="flex border-b border-brand-border/40 mb-4 shrink-0 text-[11px] font-mono gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveFormTab('info')}
            className={`px-3 py-2 rounded-t-lg transition flex items-center gap-1.5 ${
              activeFormTab === 'info' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Product Info</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFormTab('pricing')}
            className={`px-3 py-2 rounded-t-lg transition flex items-center gap-1.5 ${
              activeFormTab === 'pricing' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Pricing & Stock</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFormTab('supplier')}
            className={`px-3 py-2 rounded-t-lg transition flex items-center gap-1.5 ${
              activeFormTab === 'supplier' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Supplier Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFormTab('media')}
            className={`px-3 py-2 rounded-t-lg transition flex items-center gap-1.5 ${
              activeFormTab === 'media' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Attachments ({images.length + documents.length})</span>
          </button>
        </div>

        {/* Form Body - scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          
          {/* TAB 1: PRODUCT INFO */}
          {activeFormTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="text-gray-400 block mb-1 font-mono">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sony Wireless headphones Model 45"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-mono">SKU ID (Editable) *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Category</label>
                  {!isCategoriesEnabled ? (
                    <div className="bg-gray-950/40 border border-brand-border/60 rounded-lg p-2.5 text-gray-400 text-xs flex items-center justify-between select-none">
                      <span className="font-mono">Uncategorized</span>
                      <span className="text-[10px] text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/10 font-mono">
                        Categories Inactive
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      {!showCustomCatInput ? (
                        <div className="flex gap-1">
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="flex-1 bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 text-xs font-mono"
                          >
                            {categories.length === 0 ? (
                              <option value="">No categories available</option>
                            ) : (
                              categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))
                            )}
                          </select>
                          {!isEmployee && (
                            <button
                              type="button"
                              onClick={() => setShowCustomCatInput(true)}
                              className="px-3 bg-gray-950 border border-brand-border text-cyan-400 rounded-lg hover:bg-gray-900 transition cursor-pointer flex items-center justify-center"
                              title="Add Custom Category"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Category name"
                            value={newCustomCategory}
                            onChange={(e) => setNewCustomCategory(e.target.value)}
                            className="flex-1 bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleCreateCustomCategory}
                            className="p-2.5 bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-900/40 cursor-pointer flex items-center justify-center"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCustomCatInput(false)}
                            className="p-2.5 bg-gray-950 border border-brand-border text-gray-400 rounded-lg hover:bg-gray-900 cursor-pointer flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Barcode (Optional)</label>
                  <input
                    type="text"
                    placeholder="Scan or type barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-mono">QR Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="Type QR code string"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-gray-400 block mb-1 font-mono">Product Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe specific features, sizing, models, or usage guidelines"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Product Catalog Visibility</label>
                  <select
                    value={productStatus}
                    onChange={(e: any) => setProductStatus(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40"
                  >
                    <option value="Active">Active (In Directory)</option>
                    <option value="Hidden">Hidden (Owner view only)</option>
                    <option value="Discontinued">Discontinued (Archived logs)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRICING & STOCK */}
          {activeFormTab === 'pricing' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Buying & Selling fields */}
                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Buying Price (Cost per Unit - KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Selling Price (Price to Customer - KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>

                {/* Auto Calculated Metrics Box */}
                <div className="col-span-1 sm:col-span-2 p-3 bg-cyan-950/15 border border-brand-border/60 rounded-xl grid grid-cols-3 gap-3 text-center">
                  <div>
                    <span className="text-[9px] text-gray-500 font-mono uppercase block">Expected Unit Profit</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">KSh {expectedProfit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 font-mono uppercase block">Profit Margin</span>
                    <span className="font-mono font-bold text-cyan-400 text-sm">{profitMargin.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 font-mono uppercase block">Markup Ratio</span>
                    <span className="font-mono font-bold text-indigo-400 text-sm">{markupPercentage.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Pricing Type Toggle */}
                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Pricing Type</label>
                  <select
                    value={pricingType}
                    onChange={(e: any) => setPricingType(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40"
                  >
                    <option value="Fixed Unit">Fixed Unit Price</option>
                    <option value="Measured">Measured (Weight/Volume)</option>
                  </select>
                </div>

                {/* Dynamic unit input based on type */}
                {pricingType === 'Measured' ? (
                  <div>
                    <label className="text-gray-400 block mb-1 font-mono">Standard Measurement Unit</label>
                    <select
                      value={measuredUnit}
                      onChange={(e) => setMeasuredUnit(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                    >
                      <option value="Kilograms">Kilograms (kg)</option>
                      <option value="Grams">Grams (g)</option>
                      <option value="Litres">Litres (L)</option>
                      <option value="Millilitres">Millilitres (ml)</option>
                      <option value="Metres">Metres (m)</option>
                      <option value="Square Metres">Square Metres (m²)</option>
                      <option value="Cubic Metres">Cubic Metres (m³)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-gray-400 block mb-1 font-mono">Unit Label (e.g. pcs, pack, box)</label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40"
                    />
                  </div>
                )}

                {/* Quantities */}
                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Opening Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Reorder Level (Min Stock Alert)</label>
                  <input
                    type="number"
                    min="1"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Maximum Warehouse Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={maxStock}
                    onChange={(e) => setMaxStock(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: SUPPLIER INFORMATION */}
          {activeFormTab === 'supplier' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Supplier Name</label>
                  <input
                    type="text"
                    placeholder="Contact Agent Name"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Supplier Company</label>
                  <input
                    type="text"
                    placeholder="Wholesale Co / Brand name"
                    value={supplierCompany}
                    onChange={(e) => setSupplierCompany(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +254 712 345678"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-mono">Email Address</label>
                  <input
                    type="email"
                    placeholder="agent@company.com"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-gray-400 block mb-1 font-mono">Company Address</label>
                  <input
                    type="text"
                    placeholder="Warehouse suite, business park, town location"
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-gray-400 block mb-1 font-mono">Supplier Remarks / Terms</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Net 30 payment terms, 15 days delivery lead time, warranty conditions"
                    value={supplierNotes}
                    onChange={(e) => setSupplierNotes(e.target.value)}
                    className="w-full bg-gray-950/60 border border-brand-border rounded-lg p-2.5 text-gray-200 outline-none focus:border-cyan-500/40"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ATTACHMENTS & MEDIA */}
          {activeFormTab === 'media' && (
            <div className="space-y-4 animate-in fade-in duration-150 text-xs">
              
              {/* Product Images Selector */}
              <div className="p-4 bg-gray-950/40 border border-brand-border/60 rounded-xl space-y-3">
                <span className="font-mono font-semibold text-cyan-400 block">Product Catalog Images</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste Image URL (or simulate photo)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-3 py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-500/30 font-mono font-bold rounded-lg transition"
                  >
                    Add Image
                  </button>
                </div>

                {/* Predefined mock images selector */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-gray-500 block font-mono">Or Quick Attach Predefined Mock Images:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Headphones Black', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300' },
                      { name: 'Office Chair Grey', url: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=300' },
                      { name: 'Mechanical Keyboard', url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300' },
                      { name: 'Bluetooth Speaker', url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300' }
                    ].map(mock => (
                      <button
                        key={mock.name}
                        type="button"
                        onClick={() => {
                          if (!images.includes(mock.url)) {
                            setImages([...images, mock.url]);
                          }
                        }}
                        className="px-2 py-1 bg-gray-900 hover:bg-gray-800 border border-brand-border/50 rounded text-[10px] text-gray-300 font-mono transition flex items-center gap-1"
                      >
                        <Image className="w-3 h-3 text-cyan-400" />
                        <span>{mock.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active images list */}
                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {images.map((img, index) => (
                      <div key={index} className="relative group border border-brand-border/40 rounded-lg overflow-hidden bg-gray-950 h-16">
                        <img src={img} alt="Product preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, i) => i !== index))}
                          className="absolute top-1 right-1 p-0.5 bg-rose-950 border border-rose-500/20 text-rose-400 rounded hover:bg-rose-900 transition"
                          title="Remove Image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Documents Register */}
              <div className="p-4 bg-gray-950/40 border border-brand-border/60 rounded-xl space-y-3">
                <span className="font-mono font-semibold text-indigo-400 block">Product Manuals, Customs & Warranty Documents</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Document Label (e.g. Warranty Cert)"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="col-span-2 bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  />
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="bg-gray-950/60 border border-brand-border rounded-lg p-2 text-gray-200 outline-none focus:border-cyan-500/40 font-mono"
                  >
                    <option value="Warranty File">Warranty Certificate</option>
                    <option value="Invoice">Supplier Invoice</option>
                    <option value="Manual">User Manual (PDF)</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="w-full py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-400 border border-indigo-500/30 font-mono font-bold rounded-lg transition"
                >
                  Link Document File
                </button>

                {/* Linked Documents list */}
                {documents.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="p-2 bg-gray-900/60 border border-brand-border/40 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-400" />
                          <span className="text-gray-200 font-mono font-semibold">{doc.name}</span>
                          <span className="bg-gray-950 text-gray-500 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase">{doc.type}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDocuments(documents.filter((_, i) => i !== idx))}
                          className="text-gray-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </form>

        {/* Footer actions */}
        <div className="border-t border-brand-border/60 pt-3.5 mt-4 shrink-0 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-950 hover:bg-gray-900 border border-brand-border/80 text-gray-400 rounded-lg font-mono font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-500/40 rounded-lg font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-950/20 transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Product SKU</span>
          </button>
        </div>

      </div>
    </div>
  );
};
