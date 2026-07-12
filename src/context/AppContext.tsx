import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserProfile, Business, Product, Sale, 
  Customer, DebtRecord, Expense, Procurement, 
  CalendarEvent, Task, TimeLog, AuditLog, Notification, UserRole, Branch,
  Budget, Invoice, BankTransaction, Reconciliation, Category
} from '../types';
import { dbManager } from '../lib/database';
import { DataService } from '../lib/DataService';
import { SessionManager } from '../utils/SessionManager';

interface AppContextType {
  activeView: string;
  setActiveView: (view: string) => void;
  activeBusiness: Business;
  setActiveBusiness: (id: string) => void;
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  activeUser: UserProfile;
  setActiveUser: (id: string) => void;
  
  // Data lists
  businesses: Business[];
  allBusinesses: Business[];
  profiles: UserProfile[];
  products: Product[];
  customers: Customer[];
  debts: DebtRecord[];
  sales: Sale[];
  expenses: Expense[];
  procurements: Procurement[];
  tasks: Task[];
  events: CalendarEvent[];
  timelogs: TimeLog[];
  notifications: Notification[];
  audits: AuditLog[];
  branches: Branch[];
  budgets: Budget[];
  invoices: Invoice[];
  bankTransactions: BankTransaction[];
  reconciliations: Reconciliation[];
  categories: Category[];
  isCategoriesEnabled: boolean;
  setCategoriesEnabled: (enabled: boolean) => void;

  // Database Actions
  addCategory: (category: Omit<Category, 'id' | 'businessId'>) => void;
  updateCategory: (categoryId: string, updates: Partial<Category>) => void;
  deleteCategory: (categoryId: string, reassignToCategoryName?: string) => void;
  addBudget: (budget: Omit<Budget, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) => void;
  updateBudget: (budgetId: string, updates: Partial<Budget>) => void;
  deleteBudget: (budgetId: string) => void;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'businessId' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>) => Invoice | undefined;
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (invoiceId: string) => void;
  updateBankTransaction: (btId: string, updates: Partial<BankTransaction>) => void;
  addReconciliation: (rec: Omit<Reconciliation, 'id' | 'businessId' | 'timestamp'>) => void;
  syncBankTransactions: () => void;
  addProduct: (product: Omit<Product, 'id' | 'businessId' | 'stockStatus'>) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  recordSale: (saleData: {
    customerName: string;
    customerId?: string;
    items: { productId: string; quantity: number }[];
    discount: number;
    paymentMethod: Sale['paymentMethod'];
  }) => Sale | undefined;
  addCustomer: (customer: Omit<Customer, 'id' | 'businessId' | 'purchaseHistoryCount' | 'totalSpent' | 'debtAmount'>) => void;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => void;
  deleteCustomer: (customerId: string) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'businessId' | 'recordedBy' | 'role'>) => void;
  updateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  deleteExpense: (expenseId: string) => void;
  updateSale: (saleId: string, updates: Partial<Sale>) => void;
  deleteSale: (saleId: string) => void;
  addDebtPayment: (debtId: string, amount: number, paymentMethod: string) => void;
  updateDebt: (debtId: string, updates: Partial<DebtRecord>) => void;
  deleteDebt: (debtId: string) => void;
  addProcurement: (proc: Omit<Procurement, 'id' | 'businessId' | 'date'>) => void;
  updateProcurement: (procId: string, updates: Partial<Procurement>) => void;
  deleteProcurement: (procId: string) => void;
  addTask: (task: Omit<Task, 'id' | 'businessId' | 'status' | 'createdBy'>) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'businessId' | 'createdBy'>) => void;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (eventId: string) => void;
  clockInOut: (userId: string) => void;
  addAudit: (action: string, oldValue: string, newValue: string) => void;
  registerBusiness: (name: string, branch: string, currency?: string, businessType?: string, registrationNumber?: string) => Promise<Business>;
  updateBusiness: (id: string, updates: Partial<Business>) => Promise<Business>;
  deleteBusiness: (id: string) => Promise<boolean>;
  registerTenant: (ownerName: string, businessName: string, email: string, password: string) => Promise<boolean>;
  addEmployee: (profile: Omit<UserProfile, 'id' | 'businessId' | 'onlineStatus'>) => Promise<UserProfile>;
  updateEmployee: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  removeEmployee: (userId: string) => Promise<void>;
  addBranch: (branch: { name: string; location?: string; status: 'Active' | 'Inactive'; managerId?: string; managerName?: string }) => Promise<Branch>;
  updateBranch: (branchId: string, updates: Partial<Branch>) => Promise<Branch>;
  deleteBranch: (branchId: string, cascade?: boolean) => Promise<boolean>;
  revertAction: (auditId: string) => boolean;
  markNotificationsRead: () => void;
  connectionStatus: 'Connected' | 'Local Syncing';
  isLoggedIn: boolean;
  isRestoringSession: boolean;
  login: (userId: string, email?: string, password?: string) => Promise<boolean>;
  loginWithEmployeeNumber: (employeeNumber: string) => Promise<boolean>;
  logout: (isTimeout?: boolean) => Promise<void>;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<string>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Local Syncing'>('Local Syncing');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(() => {
    return SessionManager.hasToken();
  });

  // Automatically restore session on application mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = SessionManager.getToken();
      if (!token) {
        setIsRestoringSession(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            // Restore identifiers on local database manager
            dbManager.setActiveUser(data.user.id);
            dbManager.setActiveBusiness(data.businessId);
            
            // Load fresh workspace from SQLite backend
            const workspaceRes = await fetch('/api/workspace/load');
            if (workspaceRes.ok) {
              const wsData = await workspaceRes.json();
              if (wsData.success && wsData.workspace) {
                dbManager.writeWorkspaceToLocalStorage(wsData.workspace);
              }
            }
          } else {
            // Token is invalid/expired
            dbManager.clearLocalWorkspace();
          }
        } else {
          // Server rejected session
          dbManager.clearLocalWorkspace();
        }
      } catch (err) {
        console.error('Session restoration failed:', err);
      } finally {
        setIsRestoringSession(false);
        triggerRefresh();
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Trigger state refresh on any action
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Sync across tabs instantly using storage events and custom db updates
  useEffect(() => {
    const handleStorageChange = () => {
      triggerRefresh();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('apex-db-update', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('apex-db-update', handleStorageChange);
    };
  }, []);

  // Simple connection simulation - detects Supabase or stays in highly polished local offline-first sync
  useEffect(() => {
    const checkConnection = () => {
      // If we had a real backend, we'd ping it. In our UI, we highlight this state elegantly
      setConnectionStatus((import.meta as any).env.VITE_SUPABASE_URL ? 'Connected' : 'Local Syncing');
    };
    checkConnection();
  }, [refreshTrigger]);

  const activeBusiness = dbManager.getCurrentBusiness();
  const activeUser = dbManager.getCurrentUser();

  const contextValue: AppContextType = {
    activeView,
    setActiveView,
    activeBusiness,
    setActiveBusiness: (id: string) => {
      dbManager.setActiveBusiness(id);
      triggerRefresh();
    },
    activeBranchId: dbManager.getActiveBranchId(),
    setActiveBranchId: (id: string) => {
      dbManager.setActiveBranchId(id);
      triggerRefresh();
    },
    activeUser,
    setActiveUser: (id: string) => {
      dbManager.setActiveUser(id);
      triggerRefresh();
    },
    connectionStatus,

    // Retrieve live filtered lists from the DB manager
    businesses: dbManager.getBusinesses(false),
    allBusinesses: dbManager.getBusinesses(true),
    profiles: dbManager.getProfiles(),
    products: dbManager.getProducts(),
    customers: dbManager.getCustomers(),
    debts: dbManager.getDebts(),
    sales: dbManager.getSales(),
    expenses: dbManager.getExpenses(),
    procurements: dbManager.getProcurements(),
    tasks: dbManager.getTasks(),
    events: dbManager.getEvents(),
    timelogs: dbManager.getTimeLogs(),
    notifications: dbManager.getNotifications(),
    audits: dbManager.getAudits(),
    branches: dbManager.getBranches(),
    budgets: dbManager.getBudgets(),
    invoices: dbManager.getInvoices(),
    bankTransactions: dbManager.getBankTransactions(),
    reconciliations: dbManager.getReconciliations(),
    categories: dbManager.getCategories(),
    isCategoriesEnabled: dbManager.isCategoriesEnabled(),
    setCategoriesEnabled: (enabled) => {
      dbManager.setCategoriesEnabled(enabled);
      triggerRefresh();
    },

    // Action wrappers
    addCategory: (category) => {
      dbManager.addCategory(category);
      triggerRefresh();
    },
    updateCategory: (categoryId, updates) => {
      dbManager.updateCategory(categoryId, updates);
      triggerRefresh();
    },
    deleteCategory: (categoryId, reassignToCategoryName) => {
      dbManager.deleteCategory(categoryId, reassignToCategoryName);
      triggerRefresh();
    },
    addProduct: (product) => {
      dbManager.addProduct(product);
      triggerRefresh();
    },
    updateProduct: (productId, updates) => {
      dbManager.updateProduct(productId, updates);
      triggerRefresh();
    },
    deleteProduct: (productId) => {
      dbManager.deleteProduct(productId);
      triggerRefresh();
    },
    recordSale: (saleData) => {
      const res = dbManager.recordSale(saleData);
      triggerRefresh();
      return res;
    },
    addCustomer: (customer) => {
      dbManager.addCustomer(customer);
      triggerRefresh();
    },
    updateCustomer: (customerId, updates) => {
      dbManager.updateCustomer(customerId, updates);
      triggerRefresh();
    },
    deleteCustomer: (customerId) => {
      dbManager.deleteCustomer(customerId);
      triggerRefresh();
    },
    addExpense: (expense) => {
      dbManager.addExpense(expense);
      triggerRefresh();
    },
    updateExpense: (expenseId, updates) => {
      dbManager.updateExpense(expenseId, updates);
      triggerRefresh();
    },
    deleteExpense: (expenseId) => {
      dbManager.deleteExpense(expenseId);
      triggerRefresh();
    },
    updateSale: (saleId, updates) => {
      dbManager.updateSale(saleId, updates);
      triggerRefresh();
    },
    deleteSale: (saleId) => {
      dbManager.deleteSale(saleId);
      triggerRefresh();
    },
    addDebtPayment: (debtId, amount, paymentMethod) => {
      dbManager.addDebtPayment(debtId, amount, paymentMethod);
      triggerRefresh();
    },
    updateDebt: (debtId, updates) => {
      dbManager.updateDebt(debtId, updates);
      triggerRefresh();
    },
    deleteDebt: (debtId) => {
      dbManager.deleteDebt(debtId);
      triggerRefresh();
    },
    addProcurement: (proc) => {
      dbManager.addProcurement(proc);
      triggerRefresh();
    },
    updateProcurement: (procId, updates) => {
      dbManager.updateProcurement(procId, updates);
      triggerRefresh();
    },
    deleteProcurement: (procId) => {
      dbManager.deleteProcurement(procId);
      triggerRefresh();
    },
    addTask: (task) => {
      dbManager.addTask(task);
      triggerRefresh();
    },
    updateTaskStatus: (taskId, status) => {
      dbManager.updateTaskStatus(taskId, status);
      triggerRefresh();
    },
    updateTask: (taskId, updates) => {
      dbManager.updateTask(taskId, updates);
      triggerRefresh();
    },
    deleteTask: (taskId) => {
      dbManager.deleteTask(taskId);
      triggerRefresh();
    },
    addEvent: (event) => {
      dbManager.addEvent(event);
      triggerRefresh();
    },
    updateEvent: (eventId, updates) => {
      dbManager.updateEvent(eventId, updates);
      triggerRefresh();
    },
    deleteEvent: (eventId) => {
      dbManager.deleteEvent(eventId);
      triggerRefresh();
    },
    clockInOut: (userId) => {
      dbManager.clockInOut(userId);
      triggerRefresh();
    },
    addAudit: (action, oldValue, newValue) => {
      dbManager.addAudit(action, oldValue, newValue);
      triggerRefresh();
    },
    registerBusiness: async (name, branch, currency, businessType, registrationNumber) => {
      const res = await DataService.createBusiness({ name, branch, currency, businessType, registrationNumber });
      triggerRefresh();
      return res;
    },
    updateBusiness: async (id, updates) => {
      const res = await DataService.updateBusiness(id, updates);
      triggerRefresh();
      return res;
    },
    deleteBusiness: async (id) => {
      const res = await DataService.deleteBusiness(id);
      triggerRefresh();
      return res;
    },
    registerTenant: async (ownerName, businessName, email, password) => {
      const success = await dbManager.registerTenant(ownerName, businessName, email, password);
      triggerRefresh();
      return success;
    },
    addEmployee: async (profile) => {
      const res = await dbManager.addEmployee(profile);
      triggerRefresh();
      return res;
    },
    updateEmployee: async (userId, updates) => {
      await dbManager.updateEmployee(userId, updates);
      triggerRefresh();
    },
    removeEmployee: async (userId) => {
      await dbManager.removeEmployee(userId);
      triggerRefresh();
    },
    addBranch: async (branch) => {
      const res = await DataService.createBranch({
        name: branch.name,
        location: branch.location,
        status: branch.status as 'Active' | 'Inactive'
      });
      triggerRefresh();
      return res;
    },
    updateBranch: async (branchId, updates) => {
      const res = await DataService.updateBranch(branchId, updates);
      triggerRefresh();
      return res;
    },
    deleteBranch: async (branchId, cascade = false) => {
      const res = await DataService.deleteBranch(branchId, cascade);
      triggerRefresh();
      return res;
    },
    revertAction: (auditId) => {
      const res = dbManager.revertAction(auditId);
      triggerRefresh();
      return res;
    },
    markNotificationsRead: () => {
      dbManager.markNotificationsRead();
      triggerRefresh();
    },
    isLoggedIn: dbManager.isLoggedIn(),
    login: async (userId, email, password) => {
      const success = await dbManager.login(userId, email, password);
      triggerRefresh();
      return success;
    },
    loginWithEmployeeNumber: async (employeeNumber) => {
      const success = await dbManager.loginWithEmployeeNumber(employeeNumber);
      triggerRefresh();
      return success;
    },
    logout: async (isTimeout = false) => {
      await dbManager.logout(isTimeout);
      setActiveView('overview');
      triggerRefresh();
      window.location.replace('/');
    },
    addBudget: (budget) => {
      dbManager.addBudget(budget);
      triggerRefresh();
    },
    updateBudget: (budgetId, updates) => {
      dbManager.updateBudget(budgetId, updates);
      triggerRefresh();
    },
    deleteBudget: (budgetId) => {
      dbManager.deleteBudget(budgetId);
      triggerRefresh();
    },
    addInvoice: (invoice) => {
      const res = dbManager.addInvoice(invoice);
      triggerRefresh();
      return res;
    },
    updateInvoice: (invoiceId, updates) => {
      dbManager.updateInvoice(invoiceId, updates);
      triggerRefresh();
    },
    deleteInvoice: (invoiceId) => {
      dbManager.deleteInvoice(invoiceId);
      triggerRefresh();
    },
    updateBankTransaction: (btId, updates) => {
      dbManager.updateBankTransaction(btId, updates);
      triggerRefresh();
    },
    addReconciliation: (rec) => {
      dbManager.addReconciliation(rec);
      triggerRefresh();
    },
    syncBankTransactions: () => {
      dbManager.syncBankTransactions();
      triggerRefresh();
    },
    isRestoringSession,
    theme,
    toggleTheme
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
