import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  UserProfile, Business, Product, Sale, 
  Customer, DebtRecord, Expense, Procurement, 
  CalendarEvent, Task, TimeLog, AuditLog, Notification, UserRole, Branch
} from '../types';
import { dbManager } from '../lib/database';

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

  // Database Actions
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
  registerBusiness: (name: string, branch: string, currency?: string, businessType?: string, registrationNumber?: string) => void;
  updateBusiness: (id: string, updates: Partial<Business>) => void;
  deleteBusiness: (id: string) => void;
  registerTenant: (ownerName: string, businessName: string, email: string, password: string) => Promise<boolean>;
  addEmployee: (profile: Omit<UserProfile, 'id' | 'businessId' | 'onlineStatus'>) => void;
  updateEmployee: (userId: string, updates: Partial<UserProfile>) => void;
  removeEmployee: (userId: string) => void;
  addBranch: (branch: { name: string; location?: string; status: 'Active' | 'Inactive'; managerId?: string; managerName?: string }) => void;
  updateBranch: (branchId: string, updates: Partial<Branch>) => void;
  deleteBranch: (branchId: string) => void;
  markNotificationsRead: () => void;
  connectionStatus: 'Connected' | 'Local Syncing';
  isLoggedIn: boolean;
  login: (userId: string, email?: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<string>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Local Syncing'>('Local Syncing');

  // Trigger state refresh on any action
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Sync across tabs instantly using storage events
  useEffect(() => {
    const handleStorageChange = () => {
      triggerRefresh();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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

    // Action wrappers
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
    registerBusiness: (name, branch, currency, businessType, registrationNumber) => {
      dbManager.registerBusiness(name, branch, currency, businessType, registrationNumber);
      triggerRefresh();
    },
    updateBusiness: (id, updates) => {
      dbManager.updateBusiness(id, updates);
      triggerRefresh();
    },
    deleteBusiness: (id) => {
      dbManager.deleteBusiness(id);
      triggerRefresh();
    },
    registerTenant: async (ownerName, businessName, email, password) => {
      const success = await dbManager.registerTenant(ownerName, businessName, email, password);
      triggerRefresh();
      return success;
    },
    addEmployee: (profile) => {
      dbManager.addEmployee(profile);
      triggerRefresh();
    },
    updateEmployee: (userId, updates) => {
      dbManager.updateEmployee(userId, updates);
      triggerRefresh();
    },
    removeEmployee: (userId) => {
      dbManager.removeEmployee(userId);
      triggerRefresh();
    },
    addBranch: (branch) => {
      dbManager.addBranch(branch);
      triggerRefresh();
    },
    updateBranch: (branchId, updates) => {
      dbManager.updateBranch(branchId, updates);
      triggerRefresh();
    },
    deleteBranch: (branchId) => {
      dbManager.deleteBranch(branchId);
      triggerRefresh();
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
    logout: async () => {
      await dbManager.logout();
      setActiveView('overview');
      triggerRefresh();
      window.location.replace('/');
    }
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
