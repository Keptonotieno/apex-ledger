import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, CornerDownLeft, FileText, Package, Users, DollarSign, 
  CheckSquare, Calendar, MapPin, LayoutGrid, ArrowRight, ArrowUp, ArrowDown,
  Percent, AlertTriangle, Building, Tag, ShoppingBag, Sun, Moon, Clock
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'command' | 'navigation' | 'product' | 'sale' | 'customer' | 'expense' | 'task' | 'event' | 'branch';
  categoryLabel: string;
  icon: React.ComponentType<any>;
  badgeText?: string;
  badgeClass?: string;
  action: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const {
    setActiveView,
    setActiveBranchId,
    setActiveBusiness,
    products,
    sales,
    customers,
    expenses,
    tasks,
    events,
    branches,
    businesses,
    activeBusiness,
    activeUser,
    clockInOut,
    toggleTheme,
    theme
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Quick navigation modules
  const navigationItems = useMemo(() => [
    { name: 'Dashboard Overview', view: 'overview', icon: LayoutGrid, desc: 'Key business stats & metric trends' },
    { name: 'Product Catalog', view: 'inventory', icon: Package, desc: 'In-stock inventory levels, alerts & barcodes' },
    { name: 'Sales & Invoices', view: 'sales', icon: FileText, desc: 'Record sales, handle payments, manage customers' },
    { name: 'Expense Tracker', view: 'expenses', icon: DollarSign, desc: 'Budgeting, claims & business costs' },
    { name: 'Debt & Credit Log', view: 'debts', icon: Percent, desc: 'Track loans, customer balances & repayments' },
    { name: 'Workspaces & Branches', view: 'workspaces', icon: Building, desc: 'Switch business outlets & legal entities' },
    { name: 'Team Workflow & Tasks', view: 'tasks', icon: CheckSquare, desc: 'Assign work, statuses & due dates' },
    { name: 'Calendar Schedule', view: 'calendar', icon: Calendar, desc: 'Upcoming corporate deadlines & meetings' },
    { name: 'Employee Directory', view: 'employees', icon: Users, desc: 'Staff roles, timesheets & logs' },
    { name: 'Security Audit Logs', view: 'audits', icon: AlertTriangle, desc: 'Detailed log of all actions & IP tracking' },
    { name: 'Reports & Analytics', view: 'reports', icon: ArrowRight, desc: 'Financial summaries, margin reports, and CSV downloads' }
  ], []);

  // List of active command operations
  const customCommands = useMemo(() => {
    const list: SearchItem[] = [
      {
        id: 'cmd-add-sale',
        title: 'Add Sale (POS)',
        subtitle: 'Switch directly to POS terminal to draft or checkout a new invoice',
        type: 'command',
        categoryLabel: 'Command Actions',
        icon: ShoppingBag,
        badgeText: 'Action',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        action: () => {
          setActiveView('sales');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('trigger-pos-tab'));
          }, 50);
          onClose();
        }
      },
      {
        id: 'cmd-add-product',
        title: 'Create Product',
        subtitle: 'Define a brand new retail/procurement stock item in the database',
        type: 'command',
        categoryLabel: 'Command Actions',
        icon: Package,
        badgeText: 'Action',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        action: () => {
          setActiveView('inventory');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('trigger-add-product-form'));
          }, 50);
          onClose();
        }
      },
      {
        id: 'cmd-add-client',
        title: 'Register Customer',
        subtitle: 'Create a new customer profile in your workspace directory',
        type: 'command',
        categoryLabel: 'Command Actions',
        icon: Users,
        badgeText: 'Action',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        action: () => {
          setActiveView('clients');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('trigger-add-client-form'));
          }, 50);
          onClose();
        }
      },
      {
        id: 'cmd-add-expense',
        title: 'Record Expense',
        subtitle: 'Log and submit a new financial expense or claim for approval',
        type: 'command',
        categoryLabel: 'Command Actions',
        icon: DollarSign,
        badgeText: 'Action',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        action: () => {
          setActiveView('expenses');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('trigger-add-expense-form'));
          }, 50);
          onClose();
        }
      },
      {
        id: 'cmd-clock-toggle',
        title: 'Attendance Clock In/Out',
        subtitle: 'Clock in or out of your shift to log attendance and timesheet hours',
        type: 'command',
        categoryLabel: 'Command Actions',
        icon: Clock,
        badgeText: 'Status',
        badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        action: () => {
          if (activeUser?.id) {
            clockInOut(activeUser.id);
          }
          onClose();
        }
      },
      {
        id: 'cmd-toggle-theme',
        title: 'Toggle Theme Mode',
        subtitle: `Switch current workspace style to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
        type: 'command',
        categoryLabel: 'Command Actions',
        icon: theme === 'dark' ? Sun : Moon,
        badgeText: 'Theme',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        action: () => {
          toggleTheme();
          onClose();
        }
      }
    ];

    // Dynamically insert workspace switching commands
    businesses.forEach(biz => {
      if (biz.id !== activeBusiness?.id) {
        list.push({
          id: `cmd-switch-biz-${biz.id}`,
          title: `Switch Workspace: ${biz.name}`,
          subtitle: `Instantly move current view to ${biz.name} (${biz.businessType || 'Retail'})`,
          type: 'command',
          categoryLabel: 'Command Actions',
          icon: Building,
          badgeText: 'Workspace',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          action: () => {
            setActiveBusiness(biz.id);
            onClose();
          }
        });
      }
    });

    // Dynamically insert branch switching commands
    branches.forEach(br => {
      list.push({
        id: `cmd-switch-br-${br.id}`,
        title: `Switch Branch: ${br.name}`,
        subtitle: `Set active location context to ${br.name} (${br.location || 'HQ'})`,
        type: 'command',
        categoryLabel: 'Command Actions',
        icon: MapPin,
        badgeText: 'Branch',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        action: () => {
          setActiveBranchId(br.id);
          onClose();
        }
      });
    });

    return list;
  }, [businesses, activeBusiness, branches, theme, clockInOut, activeUser, setActiveBusiness, setActiveBranchId, setActiveView, onClose, toggleTheme]);

  // Sync keyboard shortcuts to toggle modal
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // will be triggered by header but let's allow toggling
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Autofocus input when open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  // Generate and filter search results
  const searchResults = useMemo(() => {
    const norm = query.toLowerCase().trim();
    const itemsList: SearchItem[] = [];

    // Filter and add Command Actions
    const matchedCommands = customCommands.filter(cmd =>
      !norm || cmd.title.toLowerCase().includes(norm) || cmd.subtitle.toLowerCase().includes(norm)
    );

    matchedCommands.forEach(cmd => {
      itemsList.push(cmd);
    });

    // Filter and add Module Navigation
    const matchedNavs = navigationItems.filter(nav => 
      !norm || nav.name.toLowerCase().includes(norm) || nav.desc.toLowerCase().includes(norm)
    );
    
    matchedNavs.slice(0, norm ? 3 : 6).forEach(nav => {
      itemsList.push({
        id: `nav-${nav.view}`,
        title: nav.name,
        subtitle: nav.desc,
        type: 'navigation',
        categoryLabel: 'Go To Page',
        icon: nav.icon,
        badgeText: 'Navigation',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        action: () => {
          setActiveView(nav.view);
          onClose();
        }
      });
    });

    if (!norm) {
      // If query is empty, return only commands and page navigations
      return itemsList;
    }

    // 2. PRODUCTS
    const matchedProducts = products.filter(p => 
      p.name.toLowerCase().includes(norm) || 
      (p.sku && p.sku.toLowerCase().includes(norm)) ||
      (p.barcode && p.barcode.toLowerCase().includes(norm)) ||
      p.category.toLowerCase().includes(norm)
    );

    matchedProducts.slice(0, 5).forEach(p => {
      const currency = activeBusiness?.currency || 'KSh';
      const isLow = p.quantity <= p.minStockAlert;
      const isOut = p.quantity === 0;
      let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      let stockLabel = `${p.quantity} ${p.unit || 'units'} In Stock`;

      if (isOut) {
        badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        stockLabel = 'Out of stock';
      } else if (isLow) {
        badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        stockLabel = `Low stock (${p.quantity} left)`;
      }

      itemsList.push({
        id: `prod-${p.id}`,
        title: p.name,
        subtitle: `SKU: ${p.sku || 'N/A'} • Price: ${currency} ${p.sellingPrice.toLocaleString()} • ${stockLabel}`,
        type: 'product',
        categoryLabel: 'Products',
        icon: Package,
        badgeText: p.category,
        badgeClass: badgeColor,
        action: () => {
          setActiveView('inventory');
          onClose();
        }
      });
    });

    // 3. SALES / INVOICES
    const matchedSales = sales.filter(s => 
      s.invoiceNumber.toLowerCase().includes(norm) ||
      s.customerName.toLowerCase().includes(norm)
    );

    matchedSales.slice(0, 4).forEach(s => {
      const currency = activeBusiness?.currency || 'KSh';
      itemsList.push({
        id: `sale-${s.id}`,
        title: `${s.invoiceNumber} - ${s.customerName}`,
        subtitle: `Amount: ${currency} ${s.netAmount.toLocaleString()} • Paid via ${s.paymentMethod} • ${s.date} ${s.time}`,
        type: 'sale',
        categoryLabel: 'Sales & Invoices',
        icon: ShoppingBag,
        badgeText: 'Completed Sale',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        action: () => {
          setActiveView('sales');
          onClose();
        }
      });
    });

    // 4. CUSTOMERS
    const matchedCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(norm) ||
      (c.phone && c.phone.toLowerCase().includes(norm)) ||
      (c.email && c.email.toLowerCase().includes(norm))
    );

    matchedCustomers.slice(0, 4).forEach(c => {
      const currency = activeBusiness?.currency || 'KSh';
      itemsList.push({
        id: `cust-${c.id}`,
        title: c.name,
        subtitle: `Phone: ${c.phone || 'N/A'} • Email: ${c.email || 'N/A'} • Total Spent: ${currency} ${c.totalSpent.toLocaleString()}`,
        type: 'customer',
        categoryLabel: 'Customers',
        icon: Users,
        badgeText: c.debtAmount > 0 ? `Debt: ${currency} ${c.debtAmount}` : 'Customer',
        badgeClass: c.debtAmount > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        action: () => {
          setActiveView('sales');
          onClose();
        }
      });
    });

    // 5. EXPENSES
    const matchedExpenses = expenses.filter(e => 
      e.category.toLowerCase().includes(norm) ||
      e.description.toLowerCase().includes(norm) ||
      (e.vendorName && e.vendorName.toLowerCase().includes(norm))
    );

    matchedExpenses.slice(0, 4).forEach(e => {
      const currency = activeBusiness?.currency || 'KSh';
      itemsList.push({
        id: `exp-${e.id}`,
        title: `${e.category}: ${e.description}`,
        subtitle: `Vendor: ${e.vendorName || 'N/A'} • Amount: ${currency} ${e.amount.toLocaleString()} • Date: ${e.date}`,
        type: 'expense',
        categoryLabel: 'Expenses',
        icon: DollarSign,
        badgeText: e.status || 'Approved',
        badgeClass: e.status === 'Pending Approval' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        action: () => {
          setActiveView('expenses');
          onClose();
        }
      });
    });

    // 6. TASKS
    const matchedTasks = tasks.filter(t => 
      t.title.toLowerCase().includes(norm) ||
      t.description.toLowerCase().includes(norm) ||
      t.assignedToName.toLowerCase().includes(norm)
    );

    matchedTasks.slice(0, 4).forEach(t => {
      itemsList.push({
        id: `task-${t.id}`,
        title: t.title,
        subtitle: `Assigned to: ${t.assignedToName} • Due: ${t.dueDate} • desc: ${t.description}`,
        type: 'task',
        categoryLabel: 'Tasks',
        icon: CheckSquare,
        badgeText: t.status,
        badgeClass: t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        action: () => {
          setActiveView('tasks');
          onClose();
        }
      });
    });

    // 7. EVENTS
    const matchedEvents = events.filter(ev => 
      ev.title.toLowerCase().includes(norm) ||
      ev.description.toLowerCase().includes(norm)
    );

    matchedEvents.slice(0, 4).forEach(ev => {
      itemsList.push({
        id: `ev-${ev.id}`,
        title: ev.title,
        subtitle: `Type: ${ev.type} • Date: ${ev.date} • Description: ${ev.description}`,
        type: 'event',
        categoryLabel: 'Calendar Events',
        icon: Calendar,
        badgeText: ev.type,
        badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        action: () => {
          setActiveView('calendar');
          onClose();
        }
      });
    });

    // 8. BRANCHES
    const matchedBranches = branches.filter(b => 
      b.name.toLowerCase().includes(norm) ||
      (b.location && b.location.toLowerCase().includes(norm))
    );

    matchedBranches.slice(0, 3).forEach(b => {
      itemsList.push({
        id: `branch-${b.id}`,
        title: b.name,
        subtitle: `Location: ${b.location || 'HQ'} • Status: ${b.status}`,
        type: 'branch',
        categoryLabel: 'Branches & Locations',
        icon: MapPin,
        badgeText: 'Switch Branch',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20 cursor-pointer',
        action: () => {
          setActiveBranchId(b.id);
          setActiveView('workspaces');
          onClose();
        }
      });
    });

    return itemsList;
  }, [query, products, sales, customers, expenses, tasks, events, branches, activeBusiness, navigationItems, customCommands, setActiveView, setActiveBranchId, onClose]);

  // Adjust selectedIndex boundary on results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Handle key navigation within results list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        searchResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected item into view automatically
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm"
          id="search-backdrop"
        />

        {/* Modal Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -8 }}
          transition={{ duration: 0.15 }}
          className="glass-panel max-w-2xl w-full rounded-2xl overflow-hidden flex flex-col max-h-[75vh] shadow-2xl relative border border-brand-border"
          id="global-search-modal"
        >
          {/* Top Bar Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-brand-border bg-gray-950/20 shrink-0">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or run commands (e.g. 'add sale', 'create product', 'switch branch')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-transparent text-gray-100 placeholder:text-gray-600 outline-none w-full text-sm font-sans border-none focus:ring-0"
              id="global-search-input"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[9px] font-mono rounded bg-gray-800 border border-brand-border text-gray-500">ESC</span>
              <button 
                onClick={onClose}
                className="p-1 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-gray-800/40 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results Area */}
          <div 
            ref={resultsContainerRef}
            className="flex-1 overflow-y-auto p-2 space-y-4 max-h-[50vh]"
            id="search-results-scroller"
          >
            {searchResults.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <AlertTriangle className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-300">No results found for &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  Try checking spelling or search for broader categories like "Sales", "Invoices", or individual product names.
                </p>
              </div>
            ) : (
              <div>
                {/* Group heading labels or simply list with category indicators */}
                <div className="px-2.5 py-1.5 text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>{query ? `Search Results (${searchResults.length})` : 'Command Palette & Navigation'}</span>
                  <span className="text-[9px] text-cyan-500 font-normal">Use ↑↓ keys to navigate, ↵ to select</span>
                </div>

                <div className="mt-1 space-y-1">
                  {searchResults.map((item, index) => {
                    const isActive = index === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        data-active={isActive ? "true" : "false"}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={item.action}
                        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition cursor-pointer select-none border border-transparent ${
                          isActive 
                            ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' 
                            : 'text-gray-300 hover:bg-gray-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl border shrink-0 ${
                            isActive 
                              ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400' 
                              : 'bg-gray-950/45 border-brand-border/60 text-gray-400'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold truncate capitalize text-gray-100">
                                {item.title}
                              </span>
                              {item.badgeText && (
                                <span className={`px-2 py-0.5 text-[9px] font-mono font-medium rounded-full border ${item.badgeClass}`}>
                                  {item.badgeText}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[280px] sm:max-w-md md:max-w-xl">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>

                        {isActive && (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-1 rounded-md border border-cyan-500/20 shrink-0 ml-2">
                            <span>Open</span>
                            <CornerDownLeft className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Help Legend Bar */}
          <div className="px-4 py-2 bg-gray-950/40 border-t border-brand-border/80 flex items-center justify-between text-[9px] font-mono text-gray-500 shrink-0">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-gray-600" />
                <ArrowDown className="w-3 h-3 text-gray-600" />
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <span className="px-1 py-0.5 rounded bg-gray-800 border border-brand-border leading-none font-semibold">↵</span>
                Select
              </span>
            </div>
            <span className="hidden sm:inline">Active Workspace: <span className="text-cyan-400 font-bold capitalize">{activeBusiness?.name}</span></span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
