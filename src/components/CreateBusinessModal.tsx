import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, X, Globe, Sparkles, Coins, MapPin } from 'lucide-react';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, initialBranch: string, currency: string) => void;
}

export const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [initialBranch, setInitialBranch] = useState('');
  const [currency, setCurrency] = useState('KSh');
  const [industry, setIndustry] = useState('Retail');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !initialBranch.trim()) return;
    onSubmit(name.trim(), initialBranch.trim(), currency);
    setName('');
    setInitialBranch('');
    setCurrency('KSh');
    setIndustry('Retail');
    onClose();
  };

  const currencyOptions = [
    { code: 'KSh', label: 'Kenyan Shilling (KSh)', symbol: 'KSh' },
    { code: 'USD', label: 'US Dollar ($)', symbol: '$' },
    { code: 'EUR', label: 'Euro (€)', symbol: '€' },
    { code: 'GBP', label: 'British Pound (£)', symbol: '£' },
    { code: 'UGX', label: 'Ugandan Shilling (USh)', symbol: 'USh' },
    { code: 'TZS', label: 'Tanzanian Shilling (TSh)', symbol: 'TSh' },
  ];

  const industryOptions = [
    { value: 'Retail', label: '🛍️ General Retail & POS' },
    { value: 'Electronics', label: '⚡ Electronics & IT' },
    { value: 'Pharmacy', label: '💊 Pharmacy & Medical' },
    { value: 'Wholesale', label: '📦 Wholesale & Warehousing' },
    { value: 'FoodAndBeverage', label: '☕ Food, Beverages & Dining' },
    { value: 'Services', label: '🔧 Professional Services' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-cyan-500/10 shadow-2xl relative my-8"
        id="create-business-modal-container"
      >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 bg-gray-900/50 hover:bg-gray-900 p-1.5 rounded-xl border border-brand-border/60 transition cursor-pointer"
          aria-label="Close modal"
          id="close-biz-modal-btn"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-xl bg-cyan-950/40 border border-cyan-500/35 flex items-center justify-center shrink-0 glow-cyan">
            <Building2 className="w-5.5 h-5.5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
              Create New Business Workspace
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Initialize a pristine, isolated corporate entity with fresh database ledger tables.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          
          {/* Business / Company Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">
              Business / Company Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Acme Kenya Limited"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-900/80 border border-brand-border focus:border-cyan-500/50 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-gray-100 outline-none transition"
                id="new-biz-name-input"
              />
              <Building2 className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* Initial Principal Branch */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">
              Initial Principal Branch / Head Office
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Westlands HQ"
                value={initialBranch}
                onChange={(e) => setInitialBranch(e.target.value)}
                className="w-full bg-gray-900/80 border border-brand-border focus:border-cyan-500/50 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-gray-100 outline-none transition"
                id="new-biz-branch-input"
              />
              <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            </div>
            <p className="text-[10px] text-gray-500 font-mono">
              Creates your first active commercial portal entry instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preferred Base Currency */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">
                Primary Ledger Currency
              </label>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-gray-900/80 border border-brand-border focus:border-cyan-500/50 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-gray-100 outline-none transition appearance-none cursor-pointer"
                  id="new-biz-currency-select"
                >
                  {currencyOptions.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Coins className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <span className="text-[10px]">▼</span>
                </div>
              </div>
            </div>

            {/* Industry Classification */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">
                Industry Category
              </label>
              <div className="relative">
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-gray-900/80 border border-brand-border focus:border-cyan-500/50 rounded-xl pl-3 pr-8 py-2.5 text-xs text-gray-100 outline-none transition appearance-none cursor-pointer"
                  id="new-biz-industry-select"
                >
                  {industryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <span className="text-[10px]">▼</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Info Card */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-500/10 rounded-xl flex gap-2.5 text-[11px] leading-relaxed text-cyan-300/80">
            <Sparkles className="w-4.5 h-4.5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-cyan-200">Prisinte Multi-Tenancy Enabled</span>
              <p className="mt-0.5 text-gray-400">
                This workspace will be registered with a clean slate. No demo products, transactions, or client accounts from your other workspaces will bleed into this isolated profile.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border/60 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-900/80 hover:bg-gray-800 border border-brand-border text-gray-400 hover:text-gray-200 rounded-xl transition cursor-pointer"
              id="cancel-biz-modal-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 transition cursor-pointer flex items-center gap-1.5"
              id="submit-biz-modal-btn"
            >
              <Globe className="w-4 h-4" />
              <span>Initialize Workspace</span>
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
