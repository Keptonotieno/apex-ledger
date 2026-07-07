import { createClient } from '@supabase/supabase-js';
import { 
  UserRole, UserProfile, Business, Product, Sale, SaleItem,
  Customer, DebtRecord, Expense, Procurement, 
  CalendarEvent, Task, TimeLog, AuditLog, Notification, Branch,
  Budget, Invoice, BankTransaction, Reconciliation, Category
} from '../types';

// Supabase client lazy initialization
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Clear seed tables to ensure pristine multi-tenancy with no demo data on first login
const DEFAULT_BUSINESSES: Business[] = [
  {
    id: 'b1',
    name: 'Apex Retail Group',
    ownerId: 'u1',
    branch: 'Westlands Branch',
    currency: 'KSh'
  }
];
const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'br1',
    businessId: 'b1',
    name: 'Westlands Branch',
    location: 'Nairobi',
    status: 'Active'
  },
  {
    id: 'br2',
    businessId: 'b1',
    name: 'Mombasa Port Vault',
    location: 'Mombasa',
    status: 'Active'
  }
];
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_1', businessId: 'b1', name: 'Electronics', description: 'Computing devices, smartphones, and accessories' },
  { id: 'cat_2', businessId: 'b1', name: 'Furniture', description: 'Ergonomic desks, seating, and office fixtures' },
  { id: 'cat_3', businessId: 'b1', name: 'Accessories', description: 'Peripherals, cables, chargers, and small attachments' },
  { id: 'cat_4', businessId: 'b1', name: 'Merchandise', description: 'Branded clothing, stationary, and promotional materials' },
  { id: 'cat_5', businessId: 'b1', name: 'Beverages', description: 'Sodas, mineral water, tea bags, and coffee blends' },
  { id: 'cat_6', businessId: 'b1', name: 'Services', description: 'Contracted consultancy, maintenance, and expert services' },
  { id: 'cat_7', businessId: 'b1', name: 'SaaS Licensing', description: 'Software subscriptions, API tokens, and licenses' }
];
const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'u1',
    name: 'Sarah Manager',
    email: 'sarah@apex.com',
    role: UserRole.MANAGER,
    businessId: 'b1',
    branch: 'Westlands Branch',
    onlineStatus: 'offline',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'
  },
  {
    id: 'u2',
    name: 'John Employee',
    email: 'john@apex.com',
    role: UserRole.EMPLOYEE,
    businessId: 'b1',
    branch: 'Westlands Branch',
    onlineStatus: 'offline',
    status: 'Active',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
  }
];
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p1',
    businessId: 'b1',
    name: 'Wireless Bluetooth Headphones',
    category: 'Electronics',
    barcode: '880912345678',
    sku: 'EL-HP-01',
    costPrice: 2500,
    sellingPrice: 4500,
    quantity: 45,
    unit: 'pcs',
    supplier: 'Sony East Africa',
    stockStatus: 'In Stock',
    minStockAlert: 10
  },
  {
    id: 'p2',
    businessId: 'b1',
    name: 'Mechanical Gaming Keyboard',
    category: 'Electronics',
    barcode: '880912345679',
    sku: 'EL-KB-02',
    costPrice: 4000,
    sellingPrice: 7500,
    quantity: 25,
    unit: 'pcs',
    supplier: 'Logitech Distributors',
    stockStatus: 'In Stock',
    minStockAlert: 5
  },
  {
    id: 'p3',
    businessId: 'b1',
    name: 'Ergonomic Office Chair',
    category: 'Furniture',
    barcode: '880912345680',
    sku: 'FN-OC-03',
    costPrice: 8000,
    sellingPrice: 15000,
    quantity: 8,
    unit: 'pcs',
    supplier: 'Office Depot Ke',
    stockStatus: 'In Stock',
    minStockAlert: 3
  }
];
const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    businessId: 'b1',
    name: 'Alina Kaveza',
    phone: '0712345678',
    email: 'alina@gmail.com',
    address: 'Kilimani, Nairobi',
    purchaseHistoryCount: 12,
    totalSpent: 54000,
    debtAmount: 0
  },
  {
    id: 'c2',
    businessId: 'b1',
    name: 'Davis Mugendi',
    phone: '0722345678',
    email: 'davis@outlook.com',
    address: 'Kileleshwa, Nairobi',
    purchaseHistoryCount: 5,
    totalSpent: 22500,
    debtAmount: 4500
  }
];
const DEFAULT_DEBTS: DebtRecord[] = [
  {
    id: 'd1',
    businessId: 'b1',
    customerId: 'c2',
    customerName: 'Davis Mugendi',
    type: 'Customer Debt',
    outstandingAmount: 4500,
    paidAmount: 0,
    remainingBalance: 4500,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Unpaid',
    paymentHistory: []
  }
];
const DEFAULT_SALES: Sale[] = [
  {
    id: 's1',
    invoiceNumber: 'INV-2026-0001',
    businessId: 'b1',
    items: [
      {
        productId: 'p1',
        productName: 'Wireless Bluetooth Headphones',
        quantity: 2,
        priceAtSale: 4500,
        costPriceAtSale: 2500
      }
    ],
    totalAmount: 9000,
    discount: 0,
    tax: 1440,
    netAmount: 9000,
    customerName: 'Alina Kaveza',
    customerId: 'c1',
    date: new Date().toISOString().split('T')[0],
    time: '14:35',
    cashierName: 'Sarah Manager',
    cashierRole: UserRole.MANAGER,
    paymentMethod: 'Mobile Money'
  },
  {
    id: 's2',
    invoiceNumber: 'INV-2026-0002',
    businessId: 'b1',
    items: [
      {
        productId: 'p2',
        productName: 'Mechanical Gaming Keyboard',
        quantity: 1,
        priceAtSale: 7500,
        costPriceAtSale: 4000
      }
    ],
    totalAmount: 7500,
    discount: 500,
    tax: 1120,
    netAmount: 7000,
    customerName: 'Walk-in Customer',
    date: new Date().toISOString().split('T')[0],
    time: '16:10',
    cashierName: 'John Employee',
    cashierRole: UserRole.EMPLOYEE,
    paymentMethod: 'Cash'
  }
];
const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 'e1',
    businessId: 'b1',
    category: 'Rent',
    description: 'Monthly office rent payment',
    amount: 12000,
    date: new Date().toISOString().split('T')[0],
    recordedBy: 'Sarah Manager',
    role: UserRole.MANAGER
  },
  {
    id: 'e2',
    businessId: 'b1',
    category: 'Utilities',
    description: 'Electricity & Water bills',
    amount: 3500,
    date: new Date().toISOString().split('T')[0],
    recordedBy: 'Sarah Manager',
    role: UserRole.MANAGER
  }
];
const DEFAULT_PROCUREMENTS: Procurement[] = [];
const DEFAULT_TASKS: Task[] = [];
const DEFAULT_EVENTS: CalendarEvent[] = [];
const DEFAULT_TIMELOGS: TimeLog[] = [];
const DEFAULT_NOTIFICATIONS: Notification[] = [];
const DEFAULT_AUDITS: AuditLog[] = [];

const DEFAULT_BUDGETS: Budget[] = [
  {
    id: 'bgt1',
    businessId: 'b1',
    category: 'Utilities',
    spendingLimit: 10000,
    amountSpent: 3500,
    remainingBalance: 6500,
    percentageUsed: 35,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bgt2',
    businessId: 'b1',
    category: 'Rent',
    spendingLimit: 15000,
    amountSpent: 12000,
    remainingBalance: 3000,
    percentageUsed: 80,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bgt3',
    businessId: 'b1',
    category: 'Marketing',
    spendingLimit: 5000,
    amountSpent: 0,
    remainingBalance: 5000,
    percentageUsed: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bgt4',
    businessId: 'b1',
    category: 'Payroll',
    spendingLimit: 50000,
    amountSpent: 0,
    remainingBalance: 50000,
    percentageUsed: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bgt5',
    businessId: 'b1',
    category: 'Supplies',
    spendingLimit: 20000,
    amountSpent: 0,
    remainingBalance: 20000,
    percentageUsed: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_INVOICES: Invoice[] = [
  {
    id: 'inv1',
    businessId: 'b1',
    invoiceNumber: 'INV-2026-001',
    customerName: 'Davis Mugendi',
    billingAmount: 15000,
    lineItemDescription: 'Professional Advisory Services',
    dueDateOffset: 15,
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Sent',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'inv2',
    businessId: 'b1',
    invoiceNumber: 'INV-2026-002',
    customerName: 'Alina Kaveza',
    billingAmount: 9000,
    lineItemDescription: 'Bulk Retail Products Delivery',
    dueDateOffset: 7,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Paid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'inv3',
    businessId: 'b1',
    invoiceNumber: 'INV-2026-003',
    customerName: 'Walk-in Customer',
    billingAmount: 4500,
    lineItemDescription: 'Retail Hardware Accessories',
    dueDateOffset: 1,
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Overdue',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_BANK_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'bt1',
    businessId: 'b1',
    amount: 15000,
    date: new Date().toISOString().split('T')[0],
    reference: 'TXN-81928',
    source: 'M-Pesa',
    description: 'Davis Mugendi Invoice Pay',
    categorySuggestion: 'Revenue',
    status: 'Pending'
  },
  {
    id: 'bt2',
    businessId: 'b1',
    amount: -3500,
    date: new Date().toISOString().split('T')[0],
    reference: 'TXN-92182',
    source: 'Equity Bank',
    description: 'Kenya Power Bill Payment',
    categorySuggestion: 'Utilities',
    status: 'Pending'
  },
  {
    id: 'bt3',
    businessId: 'b1',
    amount: -12000,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: 'TXN-12839',
    source: 'Stripe',
    description: 'Rent Payout',
    categorySuggestion: 'Rent',
    status: 'Reconciled',
    reconciliationId: 'rec1',
    reconciledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_RECONCILIATIONS: Reconciliation[] = [
  {
    id: 'rec1',
    businessId: 'b1',
    amount: 12000,
    paymentReference: 'TXN-12839',
    category: 'Rent',
    status: 'Reconciled',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Helper to load or initialize from localStorage
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(`apex_ledger_${key}`);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(`Error loading ${key}`, e);
  }
  return defaultValue;
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`apex_ledger_${key}`, JSON.stringify(value));
    // Trigger window storage event for instant multi-tab sync
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error(`Error saving ${key}`, e);
  }
}

// Helper to map snake_case to camelCase
function keysToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToCamel(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      result[camelKey] = keysToCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

// Helper to map camelCase to snake_case
function keysToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToSnake(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = keysToSnake(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

// Global state controller
class ApexDatabaseManager {
  private activeBusinessId: string = localStorage.getItem('apex_ledger_active_business_id') || '';
  private activeUserId: string = localStorage.getItem('apex_ledger_active_user_id') || '';
  private activeBranchId: string = localStorage.getItem('apex_ledger_active_branch_id') || 'all';
  private realtimeChannel: any = null;

  constructor() {
    this.initDatabase();
    if (isSupabaseConfigured && supabase) {
      this.syncFromSupabase().then(() => {
        this.subscribeRealtime();
      });
    }
  }

  async syncFromSupabase() {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: bData, error: bErr } = await supabase.from('businesses').select('*');
      if (!bErr && bData && bData.length > 0) setLocalItem('businesses', keysToCamel(bData));

      const { data: pData, error: pErr } = await supabase.from('profiles').select('*');
      if (!pErr && pData && pData.length > 0) setLocalItem('profiles', keysToCamel(pData));

      const { data: prodData, error: prodErr } = await supabase.from('products').select('*');
      if (!prodErr && prodData && prodData.length > 0) setLocalItem('products', keysToCamel(prodData));

      const { data: sData, error: sErr } = await supabase.from('sales').select('*');
      if (!sErr && sData && sData.length > 0) setLocalItem('sales', keysToCamel(sData));

      const tables = [
        { localKey: 'customers', dbName: 'customers' },
        { localKey: 'debts', dbName: 'debts' },
        { localKey: 'expenses', dbName: 'expenses' },
        { localKey: 'procurements', dbName: 'procurements' },
        { localKey: 'tasks', dbName: 'tasks' },
        { localKey: 'events', dbName: 'events' },
        { localKey: 'timelogs', dbName: 'timelogs' },
        { localKey: 'notifications', dbName: 'notifications' },
        { localKey: 'audits', dbName: 'audits' },
        { localKey: 'branches', dbName: 'branches' }
      ];

      for (const t of tables) {
        try {
          const { data, error } = await supabase.from(t.dbName).select('*');
          if (!error && data && data.length > 0) {
            setLocalItem(t.localKey, keysToCamel(data));
          }
        } catch (e) {
          // Gracefully catch missing tables or network errors
        }
      }
    } catch (err) {
      console.error('Error in syncFromSupabase:', err);
    }
  }

  async syncRowToSupabase(dbName: string, row: any, action: 'upsert' | 'delete') {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      // Create schema table map overrides if needed, or defaults to the same name
      const snakeRow = keysToSnake(row);
      if (action === 'delete') {
        await supabase.from(dbName).delete().eq('id', row.id);
      } else {
        await supabase.from(dbName).upsert(snakeRow);
      }
    } catch (err) {
      console.error(`Supabase sync failed for table ${dbName}:`, err);
    }
  }

  subscribeRealtime() {
    if (!isSupabaseConfigured || !supabase) return;
    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (e) {
        // Ignore
      }
    }
    this.realtimeChannel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
        console.log('Postgres real-time change received:', payload);
        await this.syncFromSupabase();
        window.dispatchEvent(new Event('storage'));
      })
      .subscribe();
  }

  isLoggedIn(): boolean {
    if (!this.activeUserId) return false;
    const allProfiles = getLocalItem<UserProfile[]>('profiles', DEFAULT_PROFILES);
    return allProfiles.some(p => p.id === this.activeUserId);
  }

  async login(userId: string, email?: string, password?: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase && email && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const sessionToken = data.session?.access_token || '';
        if (sessionToken) {
          localStorage.setItem('apex_ledger_session_token', sessionToken);
        }

        // Pull fresh data from Supabase first
        await this.syncFromSupabase();

        // Match profile by email
        const profiles = this.getProfiles();
        const found = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
        if (found) {
          this.activeUserId = found.id;
          localStorage.setItem('apex_ledger_active_user_id', found.id);
          this.addAudit('Logged In (Supabase)', 'N/A', `${found.name} (${found.role})`);
          this.subscribeRealtime();
          window.dispatchEvent(new Event('storage'));
          return true;
        } else {
          // Provision a fallback profile for successfully authenticated Supabase user
          const newProfile: UserProfile = {
            id: data.user.id,
            name: data.user.user_metadata?.full_name || email.split('@')[0],
            email: email,
            role: UserRole.ADMIN,
            businessId: this.activeBusinessId,
            onlineStatus: 'online',
            branch: '',
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'
          };
          const currentProfiles = this.getProfiles();
          currentProfiles.push(newProfile);
          setLocalItem('profiles', currentProfiles);
          await this.syncRowToSupabase('profiles', newProfile, 'upsert');

          this.activeUserId = newProfile.id;
          localStorage.setItem('apex_ledger_active_user_id', newProfile.id);
          this.subscribeRealtime();
          window.dispatchEvent(new Event('storage'));
          return true;
        }
      } catch (err) {
        console.error('Supabase Login Error:', err);
        throw err;
      }
    }

    // Fallback/Demo profile login
    const profiles = this.getProfiles();
    const found = profiles.find(p => p.id === userId);
    if (found) {
      this.activeUserId = found.id;
      localStorage.setItem('apex_ledger_active_user_id', found.id);
      this.addAudit('Logged In', 'N/A', `${found.name} (${found.role})`);
      window.dispatchEvent(new Event('storage'));
      return true;
    }
    return false;
  }

  async logout() {
    const user = this.getCurrentUser();
    
    // Invalidate Supabase authentication session if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase SignOut Error:', err);
      }
    }

    // Capture dynamic client-side IP if available, else fallback
    let clientIp = '197.232.1.84';
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      if (data && data.ip) {
        clientIp = data.ip;
      }
    } catch (e) {
      // ignore
    }

    // Record the logout event in the Audit Log WITH user, role, device, IP, and timestamp
    this.addAudit('Logged Out', `${user.name} (${user.role})`, 'N/A', clientIp);

    // Clear session-specific fields, tokens, and active session
    this.activeUserId = '';
    localStorage.removeItem('apex_ledger_active_user_id');
    localStorage.removeItem('apex_ledger_session_token');
    
    // Clear session storage to comply with tokens / session requirements
    sessionStorage.clear();

    // Notify other tabs
    window.dispatchEvent(new Event('storage'));
  }

  private initDatabase() {
    // Legacy cleanup to make sure 'Apex Ledger Enterprise' and 'Apex Retail Branch 1' are completely removed
    const existingBizStr = localStorage.getItem('apex_ledger_businesses');
    if (existingBizStr) {
      try {
        const list = JSON.parse(existingBizStr) as Business[];
        const filtered = list.filter(b => 
          b.name !== 'Apex Ledger Enterprise' && 
          b.name !== 'Apex Retail Branch 1' &&
          b.id !== 'b2'
        );
        if (filtered.length !== list.length) {
          if (filtered.length === 0) {
            localStorage.setItem('apex_ledger_businesses', JSON.stringify(DEFAULT_BUSINESSES));
            this.activeBusinessId = '';
            localStorage.removeItem('apex_ledger_active_business_id');
          } else {
            localStorage.setItem('apex_ledger_businesses', JSON.stringify(filtered));
            const hasActive = filtered.some(b => b.id === this.activeBusinessId);
            if (!hasActive) {
              this.activeBusinessId = filtered[0].id;
              localStorage.setItem('apex_ledger_active_business_id', filtered[0].id);
            }
          }
        }
      } catch (e) {
        // Safe fallback
      }
    }

    if (!localStorage.getItem('apex_ledger_businesses')) {
      setLocalItem('businesses', DEFAULT_BUSINESSES);
      setLocalItem('profiles', DEFAULT_PROFILES);
      setLocalItem('products', DEFAULT_PRODUCTS);
      setLocalItem('customers', DEFAULT_CUSTOMERS);
      setLocalItem('debts', DEFAULT_DEBTS);
      setLocalItem('sales', DEFAULT_SALES);
      setLocalItem('expenses', DEFAULT_EXPENSES);
      setLocalItem('procurements', DEFAULT_PROCUREMENTS);
      setLocalItem('tasks', DEFAULT_TASKS);
      setLocalItem('events', DEFAULT_EVENTS);
      setLocalItem('timelogs', DEFAULT_TIMELOGS);
      setLocalItem('notifications', DEFAULT_NOTIFICATIONS);
      setLocalItem('audits', DEFAULT_AUDITS);
      setLocalItem('branches', DEFAULT_BRANCHES);
      setLocalItem('budgets', DEFAULT_BUDGETS);
      setLocalItem('invoices', DEFAULT_INVOICES);
      setLocalItem('bank_transactions', DEFAULT_BANK_TRANSACTIONS);
      setLocalItem('reconciliations', DEFAULT_RECONCILIATIONS);
    } else if (!localStorage.getItem('apex_ledger_branches')) {
      setLocalItem('branches', DEFAULT_BRANCHES);
    }

    if (!localStorage.getItem('apex_ledger_budgets')) {
      setLocalItem('budgets', DEFAULT_BUDGETS);
    }
    if (!localStorage.getItem('apex_ledger_invoices')) {
      setLocalItem('invoices', DEFAULT_INVOICES);
    }
    if (!localStorage.getItem('apex_ledger_bank_transactions')) {
      setLocalItem('bank_transactions', DEFAULT_BANK_TRANSACTIONS);
    }
    if (!localStorage.getItem('apex_ledger_reconciliations')) {
      setLocalItem('reconciliations', DEFAULT_RECONCILIATIONS);
    }

  }

  // Set active context
  setActiveBusiness(id: string) {
    this.activeBusinessId = id;
    localStorage.setItem('apex_ledger_active_business_id', id);
    this.activeBranchId = 'all';
    localStorage.setItem('apex_ledger_active_branch_id', 'all');

    // Sync active user profile with the new business context so they appear in listings and remain associated with active business
    if (this.activeUserId) {
      const allProfiles = getLocalItem<UserProfile[]>('profiles', DEFAULT_PROFILES);
      const idx = allProfiles.findIndex(p => p.id === this.activeUserId);
      if (idx !== -1) {
        allProfiles[idx].businessId = id;
        allProfiles[idx].branch = ''; // Reset branch when switching business
        setLocalItem('profiles', allProfiles);
        this.syncRowToSupabase('profiles', allProfiles[idx], 'upsert');
      }
    }

    window.dispatchEvent(new Event('storage'));
  }

  getActiveBusinessId() {
    return this.activeBusinessId;
  }

  setActiveBranchId(id: string) {
    this.activeBranchId = id;
    localStorage.setItem('apex_ledger_active_branch_id', id);
    window.dispatchEvent(new Event('storage'));
  }

  getActiveBranchId() {
    return this.activeBranchId;
  }

  getCurrentBranchName(): string {
    if (this.activeBranchId === 'all') return 'Main HQ';
    const branches = this.getBranches();
    const current = branches.find(b => b.id === this.activeBranchId);
    return current ? current.name : 'Main HQ';
  }

  setActiveUser(id: string) {
    this.activeUserId = id;
    localStorage.setItem('apex_ledger_active_user_id', id);
    const profiles = this.getProfiles();
    const updated = profiles.map(p => ({
      ...p,
      onlineStatus: p.id === id ? ('online' as const) : p.onlineStatus
    }));
    setLocalItem('profiles', updated);
  }

  getActiveUserId() {
    return this.activeUserId;
  }

  // Core Data Getters (Filtered by Active Business for Multi-tenant Isolation!)
  getBusinesses(includeArchived: boolean = false): Business[] {
    const list = getLocalItem<Business[]>('businesses', DEFAULT_BUSINESSES);
    if (includeArchived) return list;
    return list.filter(b => !b.archived);
  }

  getCurrentBusiness(): Business {
    const list = this.getBusinesses(true);
    return list.find(b => b.id === this.activeBusinessId) || list.find(b => !b.archived) || list[0] || {
      id: '',
      name: 'Corporate Workspace',
      ownerId: '',
      branch: '',
      currency: 'KSh'
    };
  }

  getProfiles(): UserProfile[] {
    const all = getLocalItem<UserProfile[]>('profiles', DEFAULT_PROFILES);
    const filtered = all.filter(u => u.businessId === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      // Find active branch name
      const bName = this.getCurrentBranchName();
      return filtered.filter(u => u.branch === bName || (u as any).branchId === this.activeBranchId);
    }
    return filtered;
  }

  getCurrentUser(): UserProfile {
    const list = getLocalItem<UserProfile[]>('profiles', DEFAULT_PROFILES);
    return list.find(u => u.id === this.activeUserId) || list[0] || {
      id: '',
      name: 'System User',
      email: '',
      role: UserRole.EMPLOYEE,
      businessId: '',
      onlineStatus: 'offline',
      branch: ''
    };
  }

  getProducts(): Product[] {
    const all = getLocalItem<Product[]>('products', DEFAULT_PRODUCTS);
    const filtered = all.filter(p => p.businessId === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      return filtered.filter(p => (p as any).branchId === this.activeBranchId || (p as any).branch === this.getCurrentBranchName());
    }
    return filtered;
  }

  getCustomers(): Customer[] {
    const all = getLocalItem<Customer[]>('customers', DEFAULT_CUSTOMERS);
    const filtered = all.filter(c => c.businessId === this.activeBusinessId || c.business_id === this.activeBusinessId || c.workspaceId === this.activeBusinessId || c.workspace_id === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      return filtered.filter(c => c.branchId === this.activeBranchId || c.branch_id === this.activeBranchId || (c as any).branch === this.getCurrentBranchName());
    }
    return filtered;
  }

  getDebts(): DebtRecord[] {
    const all = getLocalItem<DebtRecord[]>('debts', DEFAULT_DEBTS);
    const filtered = all.filter(d => d.businessId === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      return filtered.filter(d => (d as any).branchId === this.activeBranchId || (d as any).branch === this.getCurrentBranchName());
    }
    return filtered;
  }

  getSales(): Sale[] {
    const all = getLocalItem<Sale[]>('sales', DEFAULT_SALES);
    const filtered = all.filter(s => s.businessId === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      return filtered.filter(s => (s as any).branchId === this.activeBranchId || (s as any).branch === this.getCurrentBranchName());
    }
    return filtered;
  }

  getExpenses(): Expense[] {
    const all = getLocalItem<Expense[]>('expenses', DEFAULT_EXPENSES);
    const filtered = all.filter(e => e.businessId === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      return filtered.filter(e => (e as any).branchId === this.activeBranchId || (e as any).branch === this.getCurrentBranchName());
    }
    return filtered;
  }

  getBudgets(): Budget[] {
    const all = getLocalItem<Budget[]>('budgets', DEFAULT_BUDGETS);
    return all.filter(b => b.businessId === this.activeBusinessId);
  }

  getInvoices(): Invoice[] {
    const all = getLocalItem<Invoice[]>('invoices', DEFAULT_INVOICES);
    return all.filter(i => i.businessId === this.activeBusinessId && !i.deletedAt);
  }

  getBankTransactions(): BankTransaction[] {
    const all = getLocalItem<BankTransaction[]>('bank_transactions', DEFAULT_BANK_TRANSACTIONS);
    return all.filter(b => b.businessId === this.activeBusinessId);
  }

  getReconciliations(): Reconciliation[] {
    const all = getLocalItem<Reconciliation[]>('reconciliations', DEFAULT_RECONCILIATIONS);
    return all.filter(r => r.businessId === this.activeBusinessId);
  }

  getProcurements(): Procurement[] {
    const all = getLocalItem<Procurement[]>('procurements', DEFAULT_PROCUREMENTS);
    const filtered = all.filter(p => p.businessId === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      return filtered.filter(p => (p as any).branchId === this.activeBranchId || (p as any).branch === this.getCurrentBranchName());
    }
    return filtered;
  }

  getTasks(): Task[] {
    const all = getLocalItem<Task[]>('tasks', DEFAULT_TASKS);
    const filtered = all.filter(t => t.businessId === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      return filtered.filter(t => (t as any).branchId === this.activeBranchId || (t as any).branch === this.getCurrentBranchName());
    }
    return filtered;
  }

  getEvents(): CalendarEvent[] {
    const all = getLocalItem<CalendarEvent[]>('events', DEFAULT_EVENTS);
    const filtered = all.filter(e => e.businessId === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      return filtered.filter(e => (e as any).branchId === this.activeBranchId || (e as any).branch === this.getCurrentBranchName());
    }
    return filtered;
  }

  getTimeLogs(): TimeLog[] {
    const all = getLocalItem<TimeLog[]>('timelogs', DEFAULT_TIMELOGS);
    const filtered = all.filter(l => l.businessId === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      return filtered.filter(l => (l as any).branchId === this.activeBranchId || (l as any).branch === this.getCurrentBranchName());
    }
    return filtered;
  }

  getNotifications(): Notification[] {
    const all = getLocalItem<Notification[]>('notifications', DEFAULT_NOTIFICATIONS);
    const filtered = all.filter(n => n.businessId === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      return filtered.filter(n => (n as any).branchId === this.activeBranchId || (n as any).branch === this.getCurrentBranchName());
    }
    return filtered;
  }

  getAudits(): AuditLog[] {
    const all = getLocalItem<AuditLog[]>('audits', DEFAULT_AUDITS);
    const filtered = all.filter(a => a.businessId === this.activeBusinessId);
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      return filtered.filter(a => (a as any).branchId === this.activeBranchId || (a as any).branch === this.getCurrentBranchName());
    }
    return filtered;
  }

  getBranches(): Branch[] {
    const all = getLocalItem<Branch[]>('branches', DEFAULT_BRANCHES);
    return all.filter(b => b.businessId === this.activeBusinessId);
  }

  getCategories(): Category[] {
    const all = getLocalItem<Category[]>('categories', []);
    
    // Filter by business / workspace synonyms
    let filtered = all.filter(c => 
      c.businessId === this.activeBusinessId || 
      (c as any).business_id === this.activeBusinessId ||
      c.workspaceId === this.activeBusinessId ||
      (c as any).workspace_id === this.activeBusinessId
    );

    const isSeeded = getLocalItem<boolean>(`categories_seeded_${this.activeBusinessId}`, false);
    if (filtered.length === 0 && !isSeeded) {
      const seeded = DEFAULT_CATEGORIES.map(c => ({
        ...c,
        id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        businessId: this.activeBusinessId,
        workspaceId: this.activeBusinessId,
        branchId: this.activeBranchId || 'all',
        workspace_id: this.activeBusinessId,
        business_id: this.activeBusinessId,
        branch_id: this.activeBranchId || 'all'
      }));
      const updatedAll = [...all, ...seeded];
      setLocalItem('categories', updatedAll);
      setLocalItem(`categories_seeded_${this.activeBusinessId}`, true);
      filtered = seeded;
    }

    // Branch isolation
    if (this.activeBranchId && this.activeBranchId !== 'all') {
      filtered = filtered.filter(c => {
        const bId = c.branchId || (c as any).branch_id;
        return bId === this.activeBranchId || !bId || bId === 'all';
      });
    }

    return filtered;
  }

  isCategoriesEnabled(): boolean {
    const val = localStorage.getItem(`categories_enabled_${this.activeBusinessId}`);
    return val !== 'false'; // Enabled by default
  }

  setCategoriesEnabled(enabled: boolean) {
    localStorage.setItem(`categories_enabled_${this.activeBusinessId}`, enabled ? 'true' : 'false');
    this.addAudit('Updated Categories Settings', enabled ? 'DISABLED' : 'ENABLED', enabled ? 'ENABLED' : 'DISABLED');
    this.addNotification('Categories Toggle Updated', `Product categories are now ${enabled ? 'enabled' : 'disabled'} for this business.`, 'info');
  }

  // State modification Mutators
  // Every mutation registers audit logs & handles notifications and state constraints
  addBranch(branch: { name: string; location?: string; status: 'Active' | 'Inactive' }) {
    const all = getLocalItem<Branch[]>('branches', DEFAULT_BRANCHES);
    const newBranch: Branch = {
      ...branch,
      id: 'br_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      createdAt: new Date().toISOString()
    };
    all.push(newBranch);
    setLocalItem('branches', all);
    this.addAudit('Created Corporate Branch', 'N/A', `${newBranch.name} (${newBranch.location || 'No Location'})`);
    this.syncRowToSupabase('branches', newBranch, 'upsert');
    this.addNotification('Branch Registered', `New corporate branch "${newBranch.name}" has been established successfully.`, 'success');
  }

  updateBranch(branchId: string, updates: Partial<Branch>) {
    const all = getLocalItem<Branch[]>('branches', DEFAULT_BRANCHES);
    const index = all.findIndex(b => b.id === branchId);
    if (index !== -1) {
      const oldBranch = all[index];
      const updated = { ...oldBranch, ...updates };
      all[index] = updated;
      setLocalItem('branches', all);
      this.addAudit('Updated Corporate Branch', `${oldBranch.name} (${oldBranch.location || 'N/A'})`, `${updated.name} (${updated.location || 'N/A'})`);
      this.syncRowToSupabase('branches', updated, 'upsert');
    }
  }

  deleteBranch(branchId: string) {
    const all = getLocalItem<Branch[]>('branches', DEFAULT_BRANCHES);
    const branchToRemove = all.find(b => b.id === branchId);
    if (branchToRemove) {
      const filtered = all.filter(b => b.id !== branchId);
      setLocalItem('branches', filtered);
      this.addAudit('Shut Down Corporate Branch', branchToRemove.name, 'DECOMMISSIONED');
      this.syncRowToSupabase('branches', branchToRemove, 'delete');
    }
  }

  addCategory(category: Omit<Category, 'id' | 'businessId'>) {
    const all = getLocalItem<Category[]>('categories', []);
    const newCat: Category = {
      ...category,
      id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      workspaceId: this.activeBusinessId,
      branchId: this.activeBranchId || 'all',
      workspace_id: this.activeBusinessId,
      business_id: this.activeBusinessId,
      branch_id: this.activeBranchId || 'all',
      createdAt: new Date().toISOString()
    };
    all.push(newCat);
    setLocalItem('categories', all);
    this.addAudit('Created Category', 'N/A', `${newCat.name}`);
    this.syncRowToSupabase('categories', newCat, 'upsert');
    this.addNotification('Category Created', `New product category "${newCat.name}" created successfully.`, 'success');
  }

  updateCategory(categoryId: string, updates: Partial<Category>) {
    const all = getLocalItem<Category[]>('categories', []);
    const idx = all.findIndex(c => c.id === categoryId);
    if (idx !== -1) {
      const oldVal = { ...all[idx] };
      const updated = { ...all[idx], ...updates };
      all[idx] = updated;
      setLocalItem('categories', all);
      
      // Referential Update: if category name changed, update products using this old name!
      if (updates.name && oldVal.name !== updates.name) {
        const products = getLocalItem<Product[]>('products', DEFAULT_PRODUCTS);
        let updatedCount = 0;
        const updatedProducts = products.map(p => {
          if (p.businessId === this.activeBusinessId && p.category.toLowerCase() === oldVal.name.toLowerCase()) {
            updatedCount++;
            const updatedProd = { ...p, category: updates.name! };
            this.syncRowToSupabase('products', updatedProd, 'upsert');
            return updatedProd;
          }
          return p;
        });
        if (updatedCount > 0) {
          setLocalItem('products', updatedProducts);
          this.addNotification('Products Categorization Synced', `Auto-migrated category name to "${updates.name}" for ${updatedCount} products.`, 'info');
        }
      }

      this.addAudit('Updated Category', oldVal.name, updated.name);
      this.syncRowToSupabase('categories', updated, 'upsert');
    }
  }

  deleteCategory(categoryId: string, reassignToCategoryName?: string) {
    const all = getLocalItem<Category[]>('categories', []);
    const target = all.find(c => c.id === categoryId);
    if (target) {
      // Enforce ownership check
      if (target.businessId !== this.activeBusinessId && (target as any).business_id !== this.activeBusinessId) {
        throw new Error("Access Denied: You do not own this category.");
      }

      // Referential Integrity Check: verify if any products are in this category
      const products = getLocalItem<Product[]>('products', DEFAULT_PRODUCTS);
      const affectedProducts = products.filter(p => p.businessId === this.activeBusinessId && p.category.toLowerCase() === target.name.toLowerCase());
      
      if (affectedProducts.length > 0) {
        if (!reassignToCategoryName) {
          throw new Error(`Cannot delete category "${target.name}" because there are active products cataloged under it.`);
        }
        
        // Reassign affected products
        const updatedProducts = products.map(p => {
          if (p.businessId === this.activeBusinessId && p.category.toLowerCase() === target.name.toLowerCase()) {
            const updated = { ...p, category: reassignToCategoryName };
            this.syncRowToSupabase('products', updated, 'upsert');
            return updated;
          }
          return p;
        });
        setLocalItem('products', updatedProducts);
        this.addNotification('Products Reassigned', `Reassigned ${affectedProducts.length} products to "${reassignToCategoryName}".`, 'info');
      }

      const filtered = all.filter(c => c.id !== categoryId);
      setLocalItem('categories', filtered);
      this.addAudit('Deleted Category', target.name, 'N/A');
      this.syncRowToSupabase('categories', target, 'delete');
      this.addNotification('Category Deleted', `Successfully deleted category "${target.name}".`, 'info');
    }
  }

  addProduct(product: Omit<Product, 'id' | 'businessId' | 'stockStatus'>) {
    const all = getLocalItem<Product[]>('products', DEFAULT_PRODUCTS);
    const newProduct: Product = {
      ...product,
      id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      stockStatus: product.quantity === 0 ? 'Out of Stock' : (product.quantity <= product.minStockAlert ? 'Low Stock' : 'In Stock')
    };

    all.push(newProduct);
    setLocalItem('products', all);
    this.addAudit('Added Product', `N/A`, `${newProduct.name} (Qty: ${newProduct.quantity}, Price: ${newProduct.sellingPrice})`);

    this.syncRowToSupabase('products', newProduct, 'upsert');

    if (newProduct.stockStatus === 'Low Stock' || newProduct.stockStatus === 'Out of Stock') {
      this.addNotification(`Stock Alert: ${newProduct.name}`, `${newProduct.name} is ${newProduct.stockStatus.toLowerCase()} (${newProduct.quantity} left)`, 'alert');
    }
  }

  updateProduct(productId: string, updates: Partial<Product>) {
    const all = getLocalItem<Product[]>('products', DEFAULT_PRODUCTS);
    const index = all.findIndex(p => p.id === productId);
    if (index === -1) return;

    const oldVal = { ...all[index] };
    const updated = { ...all[index], ...updates };
    
    // Auto status recalculation
    if (updated.quantity !== undefined || updated.minStockAlert !== undefined) {
      updated.stockStatus = updated.quantity === 0 
        ? 'Out of Stock' 
        : (updated.quantity <= updated.minStockAlert ? 'Low Stock' : 'In Stock');
    }

    all[index] = updated;
    setLocalItem('products', all);
    
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.addRevertBackup(auditId, 'products', 'update', oldVal);
    this.addAudit('Updated Product', `${oldVal.name} - Price: ${oldVal.sellingPrice}, Qty: ${oldVal.quantity}`, `${updated.name} - Price: ${updated.sellingPrice}, Qty: ${updated.quantity}`, undefined, auditId);

    this.syncRowToSupabase('products', updated, 'upsert');

    if (updated.stockStatus === 'Low Stock' && oldVal.stockStatus !== 'Low Stock') {
      this.addNotification(`Low Stock: ${updated.name}`, `${updated.name} has reached low stock threshold.`, 'alert');
    }
  }

  deleteProduct(productId: string) {
    const all = getLocalItem<Product[]>('products', DEFAULT_PRODUCTS);
    const target = all.find(p => p.id === productId);
    if (!target) return;

    const updated = all.filter(p => p.id !== productId);
    setLocalItem('products', updated);
    
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.addRevertBackup(auditId, 'products', 'delete', target);
    this.addAudit('Deleted Product', target.name, 'N/A', undefined, auditId);

    this.syncRowToSupabase('products', target, 'delete');
  }

  recordSale(saleData: {
    customerName: string;
    customerId?: string;
    items: { productId: string; quantity: number }[];
    discount: number;
    paymentMethod: Sale['paymentMethod'];
  }) {
    const products = getLocalItem<Product[]>('products', DEFAULT_PRODUCTS);
    const sales = getLocalItem<Sale[]>('sales', DEFAULT_SALES);
    const customers = getLocalItem<Customer[]>('customers', DEFAULT_CUSTOMERS);

    let totalAmount = 0;
    const saleItems: SaleItem[] = [];

    // Process each product, decrement inventory
    for (const item of saleData.items) {
      const prodIndex = products.findIndex(p => p.id === item.productId && p.businessId === this.activeBusinessId);
      if (prodIndex === -1) continue;

      const p = products[prodIndex];
      if (p.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${p.name}`);
      }

      p.quantity -= item.quantity;
      p.stockStatus = p.quantity === 0 
        ? 'Out of Stock' 
        : (p.quantity <= p.minStockAlert ? 'Low Stock' : 'In Stock');

      totalAmount += p.sellingPrice * item.quantity;
      saleItems.push({
        productId: p.id,
        productName: p.name,
        quantity: item.quantity,
        priceAtSale: p.sellingPrice,
        costPriceAtSale: p.costPrice
      });

      if (p.stockStatus === 'Low Stock') {
        this.addNotification(`Low Stock Alert`, `${p.name} has fallen to low stock level (${p.quantity} left)`, 'alert');
      }
    }

    const tax = Math.round(totalAmount * 0.16); // 16% VAT standard
    const netAmount = totalAmount - saleData.discount + tax;

    const user = this.getCurrentUser();
    const invoiceNumber = `INV-2026-${String(sales.length + 1).padStart(3, '0')}`;
    const now = new Date();

    const newSale: Sale = {
      id: 'sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      invoiceNumber,
      businessId: this.activeBusinessId,
      items: saleItems,
      totalAmount,
      discount: saleData.discount,
      tax,
      netAmount,
      customerName: saleData.customerName,
      customerId: saleData.customerId,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      cashierName: user.name,
      cashierRole: user.role,
      paymentMethod: saleData.paymentMethod
    };

    sales.push(newSale);
    setLocalItem('sales', sales);
    setLocalItem('products', products);

    // Sync to Supabase
    this.syncRowToSupabase('sales', newSale, 'upsert');
    for (const item of saleItems) {
      this.syncRowToSupabase('sale_items', {
        id: 'sale_item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        saleId: newSale.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        priceAtSale: item.priceAtSale,
        costPriceAtSale: item.costPriceAtSale
      }, 'upsert');
    }
    for (const item of saleData.items) {
      const p = products.find(prod => prod.id === item.productId && prod.businessId === this.activeBusinessId);
      if (p) {
        this.syncRowToSupabase('products', p, 'upsert');
      }
    }

    // Update client spend history if regular customer
    if (saleData.customerId) {
      const custIndex = customers.findIndex(c => c.id === saleData.customerId);
      if (custIndex !== -1) {
        customers[custIndex].purchaseHistoryCount += 1;
        customers[custIndex].totalSpent += netAmount;
        let createdDebt: DebtRecord | undefined;
        if (saleData.paymentMethod === 'Credit') {
          customers[custIndex].debtAmount += netAmount;
          
          // Also generate Debt Record
          const debts = getLocalItem<DebtRecord[]>('debts', DEFAULT_DEBTS);
          const newDebt: DebtRecord = {
            id: 'debt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            businessId: this.activeBusinessId,
            customerId: saleData.customerId,
            customerName: saleData.customerName,
            type: 'Customer Debt',
            outstandingAmount: netAmount,
            paidAmount: 0,
            remainingBalance: netAmount,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days due
            status: 'Unpaid',
            paymentHistory: []
          };
          debts.push(newDebt);
          setLocalItem('debts', debts);
          createdDebt = newDebt;
          this.addNotification(`New Debt Created`, `${saleData.customerName} owes ${newDebt.remainingBalance} KSh. Due ${newDebt.dueDate}`, 'info');
        }
        setLocalItem('customers', customers);

        // Sync customer and debt
        this.syncRowToSupabase('customers', customers[custIndex], 'upsert');
        if (createdDebt) {
          this.syncRowToSupabase('debts', createdDebt, 'upsert');
        }
      }
    }

    this.addAudit('Recorded Sale', 'N/A', `${invoiceNumber} - Net Amount: ${netAmount} (${saleData.paymentMethod})`);
    this.addNotification(`Sale Recorded`, `${invoiceNumber} created successfully for KSh ${netAmount}`, 'success');

    return newSale;
  }

  addCustomer(customer: Omit<Customer, 'id' | 'businessId' | 'purchaseHistoryCount' | 'totalSpent' | 'debtAmount'>) {
    const all = getLocalItem<Customer[]>('customers', DEFAULT_CUSTOMERS);
    const newCust: Customer = {
      ...customer,
      id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      business_id: this.activeBusinessId,
      workspaceId: this.activeBusinessId,
      workspace_id: this.activeBusinessId,
      branchId: this.activeBranchId || 'all',
      branch_id: this.activeBranchId || 'all',
      purchaseHistoryCount: 0,
      totalSpent: 0,
      debtAmount: 0,
      archived: false
    };
    all.push(newCust);
    setLocalItem('customers', all);
    this.addAudit('Added Customer', 'N/A', newCust.name);

    this.syncRowToSupabase('customers', newCust, 'upsert');
  }

  updateCustomer(customerId: string, updates: Partial<Customer>) {
    const all = getLocalItem<Customer[]>('customers', DEFAULT_CUSTOMERS);
    const index = all.findIndex(c => c.id === customerId);
    if (index !== -1) {
      const oldVal = { ...all[index] };
      all[index] = { ...all[index], ...updates };
      setLocalItem('customers', all);
      this.addAudit('Updated Customer', `${oldVal.name} - Phone: ${oldVal.phone}`, `${all[index].name} - Phone: ${all[index].phone}`);
      this.syncRowToSupabase('customers', all[index], 'upsert');
    }
  }

  deleteCustomer(customerId: string) {
    const all = getLocalItem<Customer[]>('customers', DEFAULT_CUSTOMERS);
    const target = all.find(c => c.id === customerId);
    if (target) {
      const updated = all.filter(c => c.id !== customerId);
      setLocalItem('customers', updated);
      this.addAudit('Deleted Customer', target.name, 'N/A');
      this.syncRowToSupabase('customers', target, 'delete');
    }
  }

  addExpense(expense: Omit<Expense, 'id' | 'businessId' | 'recordedBy' | 'role'>) {
    const all = getLocalItem<Expense[]>('expenses', DEFAULT_EXPENSES);
    const user = this.getCurrentUser();
    const newExp: Expense = {
      ...expense,
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      recordedBy: user.name,
      role: user.role
    };
    all.push(newExp);
    setLocalItem('expenses', all);
    this.addAudit('Recorded Expense', 'N/A', `${newExp.category}: ${newExp.amount} (${newExp.description})`);
    
    this.syncRowToSupabase('expenses', newExp, 'upsert');

    // Auto-update budget spending when expense is logged
    const budgets = getLocalItem<Budget[]>('budgets', DEFAULT_BUDGETS);
    const bIdx = budgets.findIndex(b => b.businessId === this.activeBusinessId && b.category.toLowerCase() === newExp.category.toLowerCase());
    if (bIdx !== -1) {
      budgets[bIdx].amountSpent += newExp.amount;
      budgets[bIdx].remainingBalance = budgets[bIdx].spendingLimit - budgets[bIdx].amountSpent;
      budgets[bIdx].percentageUsed = budgets[bIdx].spendingLimit > 0 
        ? Math.round((budgets[bIdx].amountSpent / budgets[bIdx].spendingLimit) * 100) 
        : 0;
      budgets[bIdx].updatedAt = new Date().toISOString();
      setLocalItem('budgets', budgets);
      this.syncRowToSupabase('budgets', budgets[bIdx], 'upsert');

      if (budgets[bIdx].amountSpent > budgets[bIdx].spendingLimit) {
        this.addNotification('Budget Exceeded', `Warning: Budget limit of KSh ${budgets[bIdx].spendingLimit} exceeded for category ${budgets[bIdx].category}!`, 'alert');
      }
    }

    // Send notifications for larger expenses
    if (newExp.amount >= 15000) {
      this.addNotification(`Significant Expense`, `Expense of KSh ${newExp.amount} logged under ${newExp.category} by ${user.name}`, 'info');
    }
  }

  addBudget(budget: Omit<Budget, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) {
    const all = getLocalItem<Budget[]>('budgets', DEFAULT_BUDGETS);
    const newBudget: Budget = {
      ...budget,
      id: 'bgt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    all.push(newBudget);
    setLocalItem('budgets', all);
    this.addAudit('Created Budget', 'N/A', `${newBudget.category}: Limit ${newBudget.spendingLimit}`);
    this.syncRowToSupabase('budgets', newBudget, 'upsert');
  }

  updateBudget(budgetId: string, updates: Partial<Budget>) {
    const all = getLocalItem<Budget[]>('budgets', DEFAULT_BUDGETS);
    const idx = all.findIndex(b => b.id === budgetId);
    if (idx !== -1) {
      const oldVal = { ...all[idx] };
      all[idx] = { 
        ...all[idx], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      
      // Re-calculate remaining balance and percentage used
      all[idx].remainingBalance = all[idx].spendingLimit - all[idx].amountSpent;
      all[idx].percentageUsed = all[idx].spendingLimit > 0 
        ? Math.round((all[idx].amountSpent / all[idx].spendingLimit) * 100) 
        : 0;

      setLocalItem('budgets', all);
      this.addAudit('Updated Budget', `Limit: ${oldVal.spendingLimit}`, `Limit: ${all[idx].spendingLimit}`);
      this.syncRowToSupabase('budgets', all[idx], 'upsert');
    }
  }

  deleteBudget(budgetId: string) {
    const all = getLocalItem<Budget[]>('budgets', DEFAULT_BUDGETS);
    const target = all.find(b => b.id === budgetId);
    if (target) {
      const updated = all.filter(b => b.id !== budgetId);
      setLocalItem('budgets', updated);
      this.addAudit('Deleted Budget', `${target.category}: Limit ${target.spendingLimit}`, 'N/A');
      this.syncRowToSupabase('budgets', target, 'delete');
    }
  }

  addInvoice(invoice: Omit<Invoice, 'id' | 'businessId' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>) {
    const all = getLocalItem<Invoice[]>('invoices', DEFAULT_INVOICES);
    const businessInvoices = all.filter(i => i.businessId === this.activeBusinessId);
    let nextNum = 1;
    if (businessInvoices.length > 0) {
      const numbers = businessInvoices
        .map(i => {
          const match = i.invoiceNumber.match(/INV-\d+-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      if (numbers.length > 0) {
        nextNum = Math.max(...numbers) + 1;
      }
    }
    const currentYear = new Date().getFullYear();
    const invoiceNumber = `INV-${currentYear}-${String(nextNum).padStart(3, '0')}`;

    const newInvoice: Invoice = {
      ...invoice,
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      invoiceNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    all.push(newInvoice);
    setLocalItem('invoices', all);
    this.addAudit('Created Invoice', 'N/A', `${invoiceNumber}: Customer: ${newInvoice.customerName}, Amount: ${newInvoice.billingAmount}`);
    this.syncRowToSupabase('invoices', newInvoice, 'upsert');

    this.addNotification('Invoice Sent', `Invoice ${invoiceNumber} for ${newInvoice.customerName} of KSh ${newInvoice.billingAmount} has been generated.`, 'success');
    return newInvoice;
  }

  updateInvoice(invoiceId: string, updates: Partial<Invoice>) {
    const all = getLocalItem<Invoice[]>('invoices', DEFAULT_INVOICES);
    const idx = all.findIndex(i => i.id === invoiceId);
    if (idx !== -1) {
      const oldVal = { ...all[idx] };
      all[idx] = { 
        ...all[idx], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      setLocalItem('invoices', all);
      this.addAudit('Updated Invoice', `${oldVal.invoiceNumber} Status: ${oldVal.status}`, `${all[idx].invoiceNumber} Status: ${all[idx].status}`);
      this.syncRowToSupabase('invoices', all[idx], 'upsert');

      if (updates.status === 'Paid' && oldVal.status !== 'Paid') {
        this.addNotification('Invoice Paid', `Invoice ${all[idx].invoiceNumber} for ${all[idx].customerName} of KSh ${all[idx].billingAmount} was marked as Paid.`, 'success');
        this.addAudit('Invoice Fully Paid', `${all[idx].invoiceNumber}`, `KSh ${all[idx].billingAmount}`);
      }
    }
  }

  deleteInvoice(invoiceId: string) {
    const all = getLocalItem<Invoice[]>('invoices', DEFAULT_INVOICES);
    const idx = all.findIndex(i => i.id === invoiceId);
    if (idx !== -1) {
      const target = all[idx];
      all[idx].deletedAt = new Date().toISOString();
      setLocalItem('invoices', all);
      this.addAudit('Deleted Invoice', target.invoiceNumber, 'N/A');
      this.syncRowToSupabase('invoices', target, 'upsert');
    }
  }

  updateBankTransaction(btId: string, updates: Partial<BankTransaction>) {
    const all = getLocalItem<BankTransaction[]>('bank_transactions', DEFAULT_BANK_TRANSACTIONS);
    const idx = all.findIndex(b => b.id === btId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      setLocalItem('bank_transactions', all);
      this.syncRowToSupabase('bank_transactions', all[idx], 'upsert');
    }
  }

  addReconciliation(rec: Omit<Reconciliation, 'id' | 'businessId' | 'timestamp'>) {
    const all = getLocalItem<Reconciliation[]>('reconciliations', DEFAULT_RECONCILIATIONS);
    const newRec: Reconciliation = {
      ...rec,
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      timestamp: new Date().toISOString()
    };
    all.push(newRec);
    setLocalItem('reconciliations', all);
    this.addAudit('Reconciled Bank Transaction', 'N/A', `Ref: ${newRec.paymentReference}, Category: ${newRec.category}, Amount: ${newRec.amount}`);
    this.syncRowToSupabase('reconciliations', newRec, 'upsert');
    this.addNotification('Transaction Reconciled', `Reconciliation completed for reference ${newRec.paymentReference} (KSh ${newRec.amount}).`, 'success');
  }

  syncBankTransactions() {
    const bts = getLocalItem<BankTransaction[]>('bank_transactions', DEFAULT_BANK_TRANSACTIONS);
    const currentBusinessId = this.activeBusinessId;

    const sources = ['M-Pesa', 'Stripe', 'Equity Bank', 'Co-op Bank'];
    const descriptions = [
      'Lipa Na M-Pesa Customer Pay',
      'Stripe Transfer USD Payout',
      'Direct Wire Rent Payout',
      'Utility Bill Water & Sewerage'
    ];
    const categorySuggestions = ['Revenue', 'Revenue', 'Rent', 'Utilities'];
    const amounts = [4500, 8500, -12000, -2500];

    const newBts: BankTransaction[] = [];
    for (let i = 0; i < 3; i++) {
      const source = sources[Math.floor(Math.random() * sources.length)];
      const idx = Math.floor(Math.random() * descriptions.length);
      const description = descriptions[idx];
      const categorySuggestion = categorySuggestions[idx];
      const amount = amounts[idx] + (Math.random() > 0.5 ? 500 : -200);

      const newBt: BankTransaction = {
        id: 'bt_sync_' + Date.now() + '_' + i,
        businessId: currentBusinessId,
        amount,
        date: new Date().toISOString().split('T')[0],
        reference: 'TXN-' + Math.floor(10000 + Math.random() * 90000),
        source,
        description,
        categorySuggestion,
        status: 'Pending'
      };
      bts.push(newBt);
      newBts.push(newBt);
      this.syncRowToSupabase('bank_transactions', newBt, 'upsert');
    }
    setLocalItem('bank_transactions', bts);
    this.addNotification('Sync Completed', `Successfully synchronized with payment APIs. 3 new transactions available.`, 'success');
    this.addAudit('Synchronized Bank Transactions', 'N/A', 'Fetched 3 pending transaction records from bank APIs');
    return newBts;
  }

  addDebtPayment(debtId: string, amount: number, paymentMethod: string) {
    const debts = getLocalItem<DebtRecord[]>('debts', DEFAULT_DEBTS);
    const index = debts.findIndex(d => d.id === debtId);
    if (index === -1) return;

    const d = debts[index];
    const oldBalance = d.remainingBalance;
    d.paidAmount += amount;
    d.remainingBalance = d.outstandingAmount - d.paidAmount;
    d.status = d.remainingBalance <= 0 ? 'Paid' : 'Partially Paid';
    d.paymentHistory.push({
      date: new Date().toISOString().split('T')[0],
      amount,
      paymentMethod
    });

    debts[index] = d;
    setLocalItem('debts', debts);

    // Update customer table debt index
    const customers = getLocalItem<Customer[]>('customers', DEFAULT_CUSTOMERS);
    const custIndex = customers.findIndex(c => c.id === d.customerId);
    if (custIndex !== -1) {
      customers[custIndex].debtAmount = Math.max(0, customers[custIndex].debtAmount - amount);
      setLocalItem('customers', customers);
      this.syncRowToSupabase('customers', customers[custIndex], 'upsert');
    }

    this.syncRowToSupabase('debts', d, 'upsert');

    this.addAudit('Paid Debt Part', `Outstanding: ${oldBalance}`, `Remaining: ${d.remainingBalance}`);
    this.addNotification(`Debt Payment`, `KSh ${amount} received for ${d.customerName}'s outstanding credit.`, 'success');
  }

  addProcurement(proc: Omit<Procurement, 'id' | 'businessId' | 'date'>) {
    const all = getLocalItem<Procurement[]>('procurements', DEFAULT_PROCUREMENTS);
    const newProc: Procurement = {
      ...proc,
      id: 'proc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      date: new Date().toISOString().split('T')[0]
    };
    all.push(newProc);
    setLocalItem('procurements', all);
    this.addAudit('Registered Procurement', 'N/A', `${newProc.orderNumber} - Supplier: ${newProc.supplierName}`);

    this.syncRowToSupabase('procurements', newProc, 'upsert');
  }

  addTask(task: Omit<Task, 'id' | 'businessId' | 'status' | 'createdBy'>) {
    const all = getLocalItem<Task[]>('tasks', DEFAULT_TASKS);
    const user = this.getCurrentUser();
    const newTask: Task = {
      ...task,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      status: 'Pending',
      createdBy: user.name
    };
    all.push(newTask);
    setLocalItem('tasks', all);
    this.addAudit('Created Task', 'N/A', `${newTask.title} (Assigned to: ${newTask.assignedToName})`);
    this.addNotification(`Task Assigned`, `New task: "${newTask.title}" assigned to ${newTask.assignedToName}`, 'info');

    this.syncRowToSupabase('tasks', newTask, 'upsert');
  }

  updateTaskStatus(taskId: string, status: Task['status']) {
    const all = getLocalItem<Task[]>('tasks', DEFAULT_TASKS);
    const index = all.findIndex(t => t.id === taskId);
    if (index === -1) return;

    const oldStatus = all[index].status;
    all[index].status = status;
    setLocalItem('tasks', all);

    this.syncRowToSupabase('tasks', all[index], 'upsert');

    this.addAudit('Updated Task Status', oldStatus, status);
    this.addNotification(`Task Updated`, `Task "${all[index].title}" is now ${status}`, 'success');
  }

  addEvent(event: Omit<CalendarEvent, 'id' | 'businessId' | 'createdBy'>) {
    const all = getLocalItem<CalendarEvent[]>('events', DEFAULT_EVENTS);
    const user = this.getCurrentUser();
    const newEvent: CalendarEvent = {
      ...event,
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      createdBy: user.name
    };
    all.push(newEvent);
    setLocalItem('events', all);
    this.addAudit('Created Calendar Event', 'N/A', newEvent.title);
    this.addNotification(`New Event Calendar`, `"${newEvent.title}" scheduled for ${newEvent.date}`, 'info');

    this.syncRowToSupabase('events', newEvent, 'upsert');
  }

  deleteEvent(eventId: string) {
    const all = getLocalItem<CalendarEvent[]>('events', DEFAULT_EVENTS);
    const target = all.find(e => e.id === eventId);
    if (!target) return;

    const updated = all.filter(e => e.id !== eventId);
    setLocalItem('events', updated);
    this.addAudit('Deleted Calendar Event', target.title, 'N/A');

    this.syncRowToSupabase('events', target, 'delete');
  }

  clockInOut(userId: string) {
    const all = getLocalItem<TimeLog[]>('timelogs', DEFAULT_TIMELOGS);
    const user = this.getProfiles().find(p => p.id === userId);
    if (!user) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const activeLogIndex = all.findIndex(l => l.userId === userId && l.businessId === this.activeBusinessId && !l.clockOut && l.date === todayStr);

    if (activeLogIndex !== -1) {
      // Clock Out
      const log = all[activeLogIndex];
      log.clockOut = new Date().toISOString();
      const diffMs = new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime();
      log.workHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // decimal hours
      log.status = 'Clocked Out';
      all[activeLogIndex] = log;
      
      setLocalItem('timelogs', all);
      this.addAudit('Clocked Out', 'N/A', `${user.name} - Hours: ${log.workHours}`);
      this.addNotification(`Clock Out Successful`, `${user.name} clocked out. Worked: ${log.workHours} hrs`, 'success');

      this.syncRowToSupabase('timelogs', log, 'upsert');
    } else {
      // Clock In
      const newLog: TimeLog = {
        id: 'tl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        businessId: this.activeBusinessId,
        userId: user.id,
        userName: user.name,
        role: user.role,
        clockIn: new Date().toISOString(),
        date: todayStr,
        status: 'Present'
      };
      all.push(newLog);
      setLocalItem('timelogs', all);
      this.addAudit('Clocked In', 'N/A', `${user.name}`);
      this.addNotification(`Clock In Successful`, `${user.name} has clocked in.`, 'success');

      this.syncRowToSupabase('timelogs', newLog, 'upsert');
    }
  }

  addAudit(action: string, oldValue: string, newValue: string, customIp?: string, customAuditId?: string) {
    const all = getLocalItem<AuditLog[]>('audits', DEFAULT_AUDITS);
    const user = this.getCurrentUser();
    const now = new Date();
    
    // Dynamically detect browser and device from navigator
    const userAgent = navigator.userAgent || '';
    let browser = 'Chrome';
    if (userAgent.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) browser = 'Safari';
    else if (userAgent.indexOf('Edge') > -1) browser = 'Edge';
    else if (userAgent.indexOf('Trident') > -1) browser = 'Internet Explorer';
    
    let device = 'Desktop Web Client';
    if (/Mobi|Android/i.test(userAgent)) {
      device = 'Mobile Web Client';
    } else if (/iPad|Tablet/i.test(userAgent)) {
      device = 'Tablet Web Client';
    } else if (/Macintosh/i.test(userAgent)) {
      device = 'MacBook Pro / macOS';
    } else if (/Windows/i.test(userAgent)) {
      device = 'Windows PC';
    } else if (/Linux/i.test(userAgent)) {
      device = 'Linux Desktop';
    }

    const newLog: AuditLog = {
      id: customAuditId || 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      userEmail: user ? user.email : 'Unknown',
      userName: user ? user.name : 'Unknown',
      role: user ? user.role : UserRole.EMPLOYEE,
      action,
      oldValue,
      newValue,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      ipAddress: customIp || '197.232.1.84',
      device: device,
      browser: browser
    };

    all.unshift(newLog); // latest on top
    setLocalItem('audits', all);

    this.syncRowToSupabase('audits', newLog, 'upsert');
  }

  addNotification(title: string, message: string, type: Notification['type'] = 'info') {
    const all = getLocalItem<Notification[]>('notifications', DEFAULT_NOTIFICATIONS);
    const newNotification: Notification = {
      id: 'not_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      title,
      message,
      type,
      date: new Date().toISOString().split('T')[0],
      read: false
    };

    all.unshift(newNotification);
    setLocalItem('notifications', all);

    this.syncRowToSupabase('notifications', newNotification, 'upsert');
  }

  markNotificationsRead() {
    const all = getLocalItem<Notification[]>('notifications', DEFAULT_NOTIFICATIONS);
    const updated = all.map(n => n.businessId === this.activeBusinessId ? { ...n, read: true } : n);
    setLocalItem('notifications', updated);

    for (const n of updated) {
      if (n.businessId === this.activeBusinessId) {
        this.syncRowToSupabase('notifications', n, 'upsert');
      }
    }
  }

  registerBusiness(name: string, branch: string, currency: string = 'KSh', businessType: string = 'Retail', registrationNumber?: string) {
    const all = getLocalItem<Business[]>('businesses', DEFAULT_BUSINESSES);
    const newBizId = 'b_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const generatedRegNum = registrationNumber || 'APX-' + Math.floor(Math.random() * 900000 + 100000);
    const newBiz: Business = {
      id: newBizId,
      name,
      ownerId: this.activeUserId,
      branch,
      currency,
      businessType,
      registrationNumber: generatedRegNum,
      status: 'Active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      archived: false
    };
    all.push(newBiz);
    setLocalItem('businesses', all);

    this.syncRowToSupabase('businesses', newBiz, 'upsert');

    // Automatically create a corresponding branch entry in the branches table
    if (branch) {
      const branchAll = getLocalItem<Branch[]>('branches', DEFAULT_BRANCHES);
      const newBranch: Branch = {
        id: 'br_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        businessId: newBizId,
        name: branch,
        location: 'Main HQ',
        status: 'Active',
        createdAt: new Date().toISOString()
      };
      branchAll.push(newBranch);
      setLocalItem('branches', branchAll);
      this.syncRowToSupabase('branches', newBranch, 'upsert');
    }

    this.addAudit('Registered New Tenant Workspace', 'N/A', `${name} - ${branch} (${currency})`);
    this.setActiveBusiness(newBizId);
  }

  updateBusiness(id: string, updates: Partial<Business>) {
    const all = getLocalItem<Business[]>('businesses', DEFAULT_BUSINESSES);
    const index = all.findIndex(b => b.id === id);
    if (index !== -1) {
      const oldBiz = all[index];
      const updated = { 
        ...oldBiz, 
        ...updates,
        lastActivity: new Date().toISOString()
      };
      all[index] = updated;
      setLocalItem('businesses', all);
      this.addAudit('Updated Business Settings', oldBiz.name, updated.name);
      this.syncRowToSupabase('businesses', updated, 'upsert');
    }
  }

  deleteBusiness(id: string) {
    const all = getLocalItem<Business[]>('businesses', DEFAULT_BUSINESSES);
    const bizToRemove = all.find(b => b.id === id);
    if (bizToRemove) {
      const filtered = all.filter(b => b.id !== id);
      setLocalItem('businesses', filtered);
      this.addAudit('Deleted Business permanently', bizToRemove.name, 'DELETED');
      this.syncRowToSupabase('businesses', bizToRemove, 'delete');

      // Cascading deletion for all entities belonging to this business ID
      const tables = ['branches', 'products', 'customers', 'debts', 'sales', 'expenses', 'procurements', 'tasks', 'events', 'timelogs', 'notifications', 'audits', 'profiles'];
      tables.forEach(table => {
        const data = getLocalItem<any[]>(table, []);
        const remaining = data.filter(item => item.businessId !== id);
        setLocalItem(table, remaining);
      });

      // Pick another active business if the deleted one was current active
      if (this.activeBusinessId === id) {
        const remainingBiz = filtered.filter(b => !b.archived);
        if (remainingBiz.length > 0) {
          this.setActiveBusiness(remainingBiz[0].id);
        } else {
          this.activeBusinessId = '';
          localStorage.removeItem('apex_ledger_active_business_id');
        }
      }
    }
  }

  async registerTenant(ownerName: string, businessName: string, email: string, password: string): Promise<boolean> {
    let finalUserId = 'u_owner_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    let finalBusinessId = 'b_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: ownerName
            }
          }
        });
        if (error) throw error;
        if (data.user) {
          finalUserId = data.user.id;
        }
      } catch (err) {
        console.error('Supabase Sign Up Error:', err);
        throw err;
      }
    }

    // Create the business tenant
    const businesses = getLocalItem<Business[]>('businesses', DEFAULT_BUSINESSES);
    const newBiz: Business = {
      id: finalBusinessId,
      name: businessName,
      ownerId: finalUserId,
      branch: '',
      currency: 'KSh'
    };
    businesses.push(newBiz);
    setLocalItem('businesses', businesses);
    await this.syncRowToSupabase('businesses', newBiz, 'upsert');

    // Create the owner user profile
    const profiles = getLocalItem<UserProfile[]>('profiles', DEFAULT_PROFILES);
    const newProfile: UserProfile = {
      id: finalUserId,
      name: ownerName,
      email,
      role: UserRole.ADMIN, // "Owner / Admin"
      businessId: finalBusinessId,
      onlineStatus: 'online',
      branch: '',
      avatarUrl: undefined, // Blank by default
      status: 'Active'
    };
    profiles.push(newProfile);
    setLocalItem('profiles', profiles);
    await this.syncRowToSupabase('profiles', newProfile, 'upsert');

    // Set active workspace & user session
    this.activeUserId = finalUserId;
    this.activeBusinessId = finalBusinessId;
    localStorage.setItem('apex_ledger_active_user_id', finalUserId);
    localStorage.setItem('apex_ledger_active_business_id', finalBusinessId);

    // Add Audit Logs
    this.addAudit('Registered New Tenant Workspace', 'N/A', `${businessName}`);
    this.addAudit('Created User Profile', 'N/A', `${ownerName} (Owner / Admin)`);
    this.addAudit('Logged In (New Tenant)', 'N/A', `${ownerName} (Owner / Admin)`);

    this.subscribeRealtime();
    window.dispatchEvent(new Event('storage'));
    return true;
  }

  addEmployee(profile: Omit<UserProfile, 'id' | 'businessId' | 'onlineStatus'>) {
    const all = getLocalItem<UserProfile[]>('profiles', DEFAULT_PROFILES);
    const newProfile: UserProfile = {
      ...profile,
      id: 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      businessId: this.activeBusinessId,
      onlineStatus: 'offline',
      status: 'Active'
    };
    all.push(newProfile);
    setLocalItem('profiles', all);

    this.syncRowToSupabase('profiles', newProfile, 'upsert');

    this.addAudit('Created User Profile', 'N/A', `${profile.name} (${profile.role})`);
  }

  updateEmployee(userId: string, updates: Partial<UserProfile>) {
    const all = getLocalItem<UserProfile[]>('profiles', DEFAULT_PROFILES);
    const index = all.findIndex(p => p.id === userId);
    if (index === -1) return;
    const oldVal = { ...all[index] };
    all[index] = { ...all[index], ...updates };
    setLocalItem('profiles', all);

    this.syncRowToSupabase('profiles', all[index], 'upsert');

    this.addAudit('Updated User Profile', `${oldVal.name} (${oldVal.role})`, `${all[index].name} (${all[index].role}, Status: ${all[index].status})`);
  }

  removeEmployee(userId: string) {
    const all = getLocalItem<UserProfile[]>('profiles', DEFAULT_PROFILES);
    const target = all.find(p => p.id === userId);
    if (!target) {
      throw new Error("Employee profile not found.");
    }

    // Safety Rules validation:
    const admins = all.filter(p => p.role === UserRole.ADMIN);
    if (userId === this.activeUserId) {
      throw new Error("This account cannot be deleted."); // Cannot delete currently logged-in Admin
    }
    if (target.role === UserRole.ADMIN && admins.length <= 1) {
      throw new Error("This account cannot be deleted."); // Cannot delete the last remaining Admin
    }
    if (userId === 'u1') {
      throw new Error("This account cannot be deleted."); // System owner account / protected system accounts
    }

    try {
      // 1. Remove profile from the tenant profiles database
      const updatedProfiles = all.filter(p => p.id !== userId);

      // 2. Cascade delete: Purge employee attendance records (timelogs)
      const timelogsAll = getLocalItem<TimeLog[]>('timelogs', DEFAULT_TIMELOGS);
      const updatedTimelogs = timelogsAll.filter(t => t.userId !== userId);

      // 3. Cascade update: Safely archive employee task records and mark them unassigned
      const tasksAll = getLocalItem<Task[]>('tasks', DEFAULT_TASKS);
      const updatedTasks = tasksAll.map(t => {
        if (t.assignedToId === userId) {
          return {
            ...t,
            assignedToId: 'unassigned',
            assignedToName: 'Archived User / Unassigned',
            status: 'Pending' as const
          };
        }
        return t;
      });

      // Save all datasets atomically in the local database
      setLocalItem('profiles', updatedProfiles);
      setLocalItem('timelogs', updatedTimelogs);
      setLocalItem('tasks', updatedTasks);

      this.syncRowToSupabase('profiles', target, 'delete');
      if (isSupabaseConfigured && supabase) {
        supabase.from('timelogs').delete().eq('user_id', userId);
      }

      // 4. Create a high-fidelity audit log containing all required metadata
      const oldValueDetail = `ID: ${target.id} | Name: ${target.name} | Email: ${target.email} | Role: ${target.role}`;
      const newValueDetail = `Deleted by Admin ID: ${this.activeUserId} | Corporate purge complete.`;
      this.addAudit('Permanently Deleted Employee', oldValueDetail, newValueDetail);

      // 5. Send Real-Time alert notification to the corporate feed
      this.addNotification(
        'Employee Deletion Alert',
        `The profile for ${target.name} has been permanently offboarded from the business tenant.`,
        'alert'
      );

      // Dispatch local storage event for instant multi-tab and active session synchronization
      window.dispatchEvent(new Event('storage'));
    } catch (error: any) {
      console.error('Error in removeEmployee transaction:', error);
      throw new Error(error?.message || 'Database transaction failed during deletion.');
    }
  }

  updateExpense(expenseId: string, updates: Partial<Expense>) {
    const all = getLocalItem<Expense[]>('expenses', DEFAULT_EXPENSES);
    const idx = all.findIndex(e => e.id === expenseId);
    if (idx === -1) return;
    const oldVal = { ...all[idx] };
    const updated = { ...oldVal, ...updates };
    all[idx] = updated;
    setLocalItem('expenses', all);
    
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.addRevertBackup(auditId, 'expenses', 'update', oldVal);
    this.addAudit('Updated Expense', `${oldVal.category}: ${oldVal.amount}`, `${updated.category}: ${updated.amount}`, undefined, auditId);

    this.syncRowToSupabase('expenses', updated, 'upsert');

    window.dispatchEvent(new Event('storage'));
  }

  deleteExpense(expenseId: string) {
    const all = getLocalItem<Expense[]>('expenses', DEFAULT_EXPENSES);
    const target = all.find(e => e.id === expenseId);
    if (!target) return;
    const updated = all.filter(e => e.id !== expenseId);
    setLocalItem('expenses', updated);
    
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.addRevertBackup(auditId, 'expenses', 'delete', target);
    this.addAudit('Deleted Expense', `${target.category}: ${target.amount}`, 'N/A', undefined, auditId);

    this.syncRowToSupabase('expenses', target, 'delete');

    window.dispatchEvent(new Event('storage'));
  }

  updateSale(saleId: string, updates: Partial<Sale>) {
    const all = getLocalItem<Sale[]>('sales', DEFAULT_SALES);
    const idx = all.findIndex(s => s.id === saleId);
    if (idx === -1) return;
    const oldVal = { ...all[idx] };
    const updated = { ...oldVal, ...updates };
    all[idx] = updated;
    setLocalItem('sales', all);
    
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.addRevertBackup(auditId, 'sales', 'update', oldVal);
    this.addAudit('Updated Sale', `${oldVal.invoiceNumber}`, `${updated.invoiceNumber}`, undefined, auditId);

    this.syncRowToSupabase('sales', updated, 'upsert');

    window.dispatchEvent(new Event('storage'));
  }

  deleteSale(saleId: string) {
    const all = getLocalItem<Sale[]>('sales', DEFAULT_SALES);
    const target = all.find(s => s.id === saleId);
    if (!target) return;
    const updated = all.filter(s => s.id !== saleId);
    setLocalItem('sales', updated);
    
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.addRevertBackup(auditId, 'sales', 'delete', target);
    this.addAudit('Deleted Sale', `${target.invoiceNumber}`, 'N/A', undefined, auditId);

    this.syncRowToSupabase('sales', target, 'delete');

    window.dispatchEvent(new Event('storage'));
  }

  updateDebt(debtId: string, updates: Partial<DebtRecord>) {
    const all = getLocalItem<DebtRecord[]>('debts', DEFAULT_DEBTS);
    const idx = all.findIndex(d => d.id === debtId);
    if (idx === -1) return;
    const oldVal = { ...all[idx] };
    const updated = { ...oldVal, ...updates };
    all[idx] = updated;
    setLocalItem('debts', all);
    
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.addRevertBackup(auditId, 'debts', 'update', oldVal);
    this.addAudit('Updated Debt Record', `${oldVal.customerName}: ${oldVal.outstandingAmount}`, `${updated.customerName}: ${updated.outstandingAmount}`, undefined, auditId);

    this.syncRowToSupabase('debts', updated, 'upsert');

    window.dispatchEvent(new Event('storage'));
  }

  deleteDebt(debtId: string) {
    const all = getLocalItem<DebtRecord[]>('debts', DEFAULT_DEBTS);
    const target = all.find(d => d.id === debtId);
    if (!target) return;
    const updated = all.filter(d => d.id !== debtId);
    setLocalItem('debts', updated);
    
    const auditId = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.addRevertBackup(auditId, 'debts', 'delete', target);
    this.addAudit('Deleted Debt Record', `${target.customerName}: ${target.outstandingAmount}`, 'N/A', undefined, auditId);

    this.syncRowToSupabase('debts', target, 'delete');

    window.dispatchEvent(new Event('storage'));
  }

  updateTask(taskId: string, updates: Partial<Task>) {
    const all = getLocalItem<Task[]>('tasks', DEFAULT_TASKS);
    const idx = all.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const oldVal = all[idx];
    const updated = { ...oldVal, ...updates };
    all[idx] = updated;
    setLocalItem('tasks', all);
    this.addAudit('Updated Task', `${oldVal.title}`, `${updated.title}`);

    this.syncRowToSupabase('tasks', updated, 'upsert');

    window.dispatchEvent(new Event('storage'));
  }

  deleteTask(taskId: string) {
    const all = getLocalItem<Task[]>('tasks', DEFAULT_TASKS);
    const target = all.find(t => t.id === taskId);
    if (!target) return;
    const updated = all.filter(t => t.id !== taskId);
    setLocalItem('tasks', updated);
    this.addAudit('Deleted Task', `${target.title}`, 'N/A');

    this.syncRowToSupabase('tasks', target, 'delete');

    window.dispatchEvent(new Event('storage'));
  }

  updateProcurement(procId: string, updates: Partial<Procurement>) {
    const all = getLocalItem<Procurement[]>('procurements', DEFAULT_PROCUREMENTS);
    const idx = all.findIndex(p => p.id === procId);
    if (idx === -1) return;
    const oldVal = all[idx];
    const updated = { ...oldVal, ...updates };
    all[idx] = updated;
    setLocalItem('procurements', all);
    this.addAudit('Updated Procurement', `${oldVal.orderNumber}`, `${updated.orderNumber}`);

    this.syncRowToSupabase('procurements', updated, 'upsert');

    window.dispatchEvent(new Event('storage'));
  }

  deleteProcurement(procId: string) {
    const all = getLocalItem<Procurement[]>('procurements', DEFAULT_PROCUREMENTS);
    const target = all.find(p => p.id === procId);
    if (!target) return;
    const updated = all.filter(p => p.id !== procId);
    setLocalItem('procurements', updated);
    this.addAudit('Deleted Procurement', `${target.orderNumber}`, 'N/A');

    this.syncRowToSupabase('procurements', target, 'delete');

    window.dispatchEvent(new Event('storage'));
  }

  updateEvent(eventId: string, updates: Partial<CalendarEvent>) {
    const all = getLocalItem<CalendarEvent[]>('events', DEFAULT_EVENTS);
    const idx = all.findIndex(e => e.id === eventId);
    if (idx === -1) return;
    const oldVal = all[idx];
    const updated = { ...oldVal, ...updates };
    all[idx] = updated;
    setLocalItem('events', all);
    this.addAudit('Updated Calendar Event', `${oldVal.title}`, `${updated.title}`);

    this.syncRowToSupabase('events', updated, 'upsert');

    window.dispatchEvent(new Event('storage'));
  }

  getRevertBackups(): any[] {
    return getLocalItem<any[]>('revert_backups', []);
  }

  addRevertBackup(auditId: string, table: string, actionType: 'insert' | 'update' | 'delete', data: any) {
    const all = this.getRevertBackups();
    all.push({ id: auditId, table, actionType, data });
    setLocalItem('revert_backups', all);
  }

  revertAction(auditId: string): boolean {
    const backups = this.getRevertBackups();
    const idx = backups.findIndex(b => b.id === auditId);
    if (idx === -1) return false;

    const backup = backups[idx];
    const { table, actionType, data } = backup;

    try {
      if (table === 'products') {
        const list = getLocalItem<Product[]>('products', DEFAULT_PRODUCTS);
        if (actionType === 'delete') {
          list.push(data);
          setLocalItem('products', list);
          this.syncRowToSupabase('products', data, 'upsert');
          this.addAudit('Reverted Action: Restored Deleted Product', 'N/A', data.name);
        } else if (actionType === 'update') {
          const itemIdx = list.findIndex(item => item.id === data.id);
          if (itemIdx !== -1) {
            const current = list[itemIdx];
            list[itemIdx] = data;
            setLocalItem('products', list);
            this.syncRowToSupabase('products', data, 'upsert');
            this.addAudit('Reverted Action: Restored Product Price/Details', `${current.name} (Selling: ${current.sellingPrice})`, `${data.name} (Selling: ${data.sellingPrice})`);
          }
        }
      } else if (table === 'expenses') {
        const list = getLocalItem<Expense[]>('expenses', DEFAULT_EXPENSES);
        if (actionType === 'delete') {
          list.push(data);
          setLocalItem('expenses', list);
          this.syncRowToSupabase('expenses', data, 'upsert');
          this.addAudit('Reverted Action: Restored Deleted Expense', 'N/A', `${data.category}: ${data.amount}`);
        } else if (actionType === 'update') {
          const itemIdx = list.findIndex(item => item.id === data.id);
          if (itemIdx !== -1) {
            const current = list[itemIdx];
            list[itemIdx] = data;
            setLocalItem('expenses', list);
            this.syncRowToSupabase('expenses', data, 'upsert');
            this.addAudit('Reverted Action: Restored Expense Details', `${current.category}: ${current.amount}`, `${data.category}: ${data.amount}`);
          }
        }
      } else if (table === 'sales') {
        const list = getLocalItem<Sale[]>('sales', DEFAULT_SALES);
        if (actionType === 'delete') {
          list.push(data);
          setLocalItem('sales', list);
          this.syncRowToSupabase('sales', data, 'upsert');
          this.addAudit('Reverted Action: Restored Deleted Sale', 'N/A', data.invoiceNumber);
        } else if (actionType === 'update') {
          const itemIdx = list.findIndex(item => item.id === data.id);
          if (itemIdx !== -1) {
            const current = list[itemIdx];
            list[itemIdx] = data;
            setLocalItem('sales', list);
            this.syncRowToSupabase('sales', data, 'upsert');
            this.addAudit('Reverted Action: Restored Sale Details', current.invoiceNumber, data.invoiceNumber);
          }
        }
      } else if (table === 'debts') {
        const list = getLocalItem<DebtRecord[]>('debts', DEFAULT_DEBTS);
        if (actionType === 'delete') {
          list.push(data);
          setLocalItem('debts', list);
          this.syncRowToSupabase('debts', data, 'upsert');
          this.addAudit('Reverted Action: Restored Deleted Debt Record', 'N/A', `${data.customerName}: ${data.outstandingAmount}`);
        } else if (actionType === 'update') {
          const itemIdx = list.findIndex(item => item.id === data.id);
          if (itemIdx !== -1) {
            const current = list[itemIdx];
            list[itemIdx] = data;
            setLocalItem('debts', list);
            this.syncRowToSupabase('debts', data, 'upsert');
            this.addAudit('Reverted Action: Restored Debt Details', `${current.customerName}: ${current.remainingBalance}`, `${data.customerName}: ${data.remainingBalance}`);
          }
        }
      } else if (table === 'branches') {
        const list = getLocalItem<Branch[]>('branches', DEFAULT_BRANCHES);
        if (actionType === 'delete') {
          list.push(data);
          setLocalItem('branches', list);
          this.syncRowToSupabase('branches', data, 'upsert');
          this.addAudit('Reverted Action: Restored Decommissioned Branch', 'N/A', data.name);
        } else if (actionType === 'update') {
          const itemIdx = list.findIndex(item => item.id === data.id);
          if (itemIdx !== -1) {
            const current = list[itemIdx];
            list[itemIdx] = data;
            setLocalItem('branches', list);
            this.syncRowToSupabase('branches', data, 'upsert');
            this.addAudit('Reverted Action: Restored Branch Details', current.name, data.name);
          }
        }
      }

      // Remove this backup
      backups.splice(idx, 1);
      setLocalItem('revert_backups', backups);
      window.dispatchEvent(new Event('storage'));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}

export const dbManager = new ApexDatabaseManager();

// Supabase DB Schema generation & RLS Documentation helper for the UI setup modal
export const SQL_SCHEMA = `-- APEX LEDGER - COMPLETE POSTGRESQL SCHEMAS (SUPABASE-READY)
-- Ensure this script is executed in the Supabase SQL Editor.

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create User Roles Enum
CREATE TYPE user_role_type AS ENUM ('Business Owner (Admin)', 'Manager', 'Employee');
CREATE TYPE stock_status_type AS ENUM ('In Stock', 'Low Stock', 'Out of Stock');
CREATE TYPE delivery_status_type AS ENUM ('Pending', 'Shipped', 'Delivered', 'Cancelled');
CREATE TYPE payment_status_type AS ENUM ('Unpaid', 'Paid', 'Partially Paid');
CREATE TYPE event_type AS ENUM ('Meeting', 'Deadline', 'Announcement', 'Business Event');
CREATE TYPE task_status_type AS ENUM ('Pending', 'In Progress', 'Completed');

-- 3. Businesses Table (Tenants)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL,
  branch VARCHAR(255),
  currency VARCHAR(10) DEFAULT 'KSh',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. User Profiles Table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role user_role_type NOT NULL DEFAULT 'Employee',
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  branch VARCHAR(255),
  avatar_url TEXT,
  online_status VARCHAR(20) DEFAULT 'offline',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  barcode VARCHAR(100),
  sku VARCHAR(100),
  cost_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  selling_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'Units',
  supplier VARCHAR(255),
  stock_status stock_status_type DEFAULT 'In Stock',
  min_stock_alert INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Sales Table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL,
  discount NUMERIC(15,2) DEFAULT 0.00,
  tax NUMERIC(15,2) DEFAULT 0.00,
  net_amount NUMERIC(15,2) NOT NULL,
  customer_name VARCHAR(255) DEFAULT 'Walk-in Customer',
  customer_id UUID,
  date DATE DEFAULT CURRENT_DATE,
  time TIME DEFAULT CURRENT_TIME,
  cashier_name VARCHAR(255) NOT NULL,
  cashier_role user_role_type NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Sales Items Table (Normalized relationship)
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  price_at_sale NUMERIC(15,2) NOT NULL,
  cost_price_at_sale NUMERIC(15,2) NOT NULL
);

-- 8. Row Level Security Policies (RLS)
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- 9. Tenant Isolation Policies
CREATE POLICY tenant_isolation_businesses ON businesses
  FOR ALL USING (id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY tenant_isolation_profiles ON profiles
  FOR ALL USING (business_id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY tenant_isolation_products ON products
  FOR ALL USING (business_id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY tenant_isolation_sales ON sales
  FOR ALL USING (business_id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  ));

-- 10. Branches Table
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_branches ON branches
  FOR ALL USING (business_id IN (
    SELECT business_id FROM profiles WHERE id = auth.uid()
  ));
`;
