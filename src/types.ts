export enum UserRole {
  ADMIN = 'Business Owner (Admin)',
  MANAGER = 'Manager',
  EMPLOYEE = 'Employee'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessId: string;
  avatarUrl?: string;
  onlineStatus: 'online' | 'offline';
  branch?: string;
  status?: 'Active' | 'Suspended' | 'Archived' | 'Deleted';
  phone?: string;
  badgeNumber?: string;
  dateJoined?: string;
  lastLogin?: string;
  createdBy?: string;
  allowExpenses?: boolean;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  logoUrl?: string;
  branch?: string;
  currency: string;
  businessType?: string;
  registrationNumber?: string;
  status?: 'Active' | 'Inactive';
  createdAt?: string;
  lastActivity?: string;
  archived?: boolean;
  allowManagersToManageBranches?: boolean;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  category: string;
  imageUrl?: string;
  barcode: string;
  sku: string;
  costPrice: number; // Buying Price
  sellingPrice: number;
  quantity: number;
  unit: string; // unit type
  supplier: string;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  minStockAlert: number; // Reorder Level
  qrCode?: string;
  description?: string;
  pricingType?: 'Fixed Unit' | 'Measured';
  maxStock?: number;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierCompany?: string;
  supplierAddress?: string;
  supplierNotes?: string;
  productStatus?: 'Active' | 'Hidden' | 'Discontinued';
  images?: string[];
  documents?: { name: string; url: string; type: string }[];
  archived?: boolean;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtSale: number;
  costPriceAtSale: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  businessId: string;
  items: SaleItem[];
  totalAmount: number;
  discount: number;
  tax: number;
  netAmount: number;
  customerName: string;
  customerId?: string;
  date: string;
  time: string;
  cashierName: string;
  cashierRole: UserRole;
  paymentMethod: 'Cash' | 'Card' | 'Mobile Money' | 'Credit';
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  purchaseHistoryCount: number;
  totalSpent: number;
  debtAmount: number;
  workspaceId?: string;
  branchId?: string;
  workspace_id?: string;
  business_id?: string;
  branch_id?: string;
  archived?: boolean;
}

export interface DebtRecord {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  type: 'Customer Debt' | 'Borrowed Credit' | 'Company Credit' | 'Individual Credit';
  outstandingAmount: number;
  paidAmount: number;
  remainingBalance: number;
  dueDate: string;
  status: 'Unpaid' | 'Partially Paid' | 'Paid';
  paymentHistory: {
    date: string;
    amount: number;
    paymentMethod: string;
  }[];
}

export interface Expense {
  id: string;
  businessId: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  recordedBy: string;
  role: UserRole;
  vendorName?: string;
  department?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  invoiceNumber?: string;
  taxAmount?: number;
  taxInclusive?: boolean;
  project?: string;
  employeeResponsible?: string;
  approvalRequired?: boolean;
  status?: 'Draft' | 'Submitted' | 'Pending Approval' | 'Approved' | 'Rejected';
  approvalHistory?: { approverName: string; approverRole: string; action: string; date: string; comment?: string }[];
  receiptUrl?: string;
  branch?: string;
  notes?: string;
  attachments?: { name: string; url: string; size: string }[];
  recurring?: { isRecurring: boolean; frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly'; status: 'Active' | 'Paused' };
}

export interface Procurement {
  id: string;
  businessId: string;
  supplierName: string;
  orderNumber: string;
  materialCosts: number;
  notes?: string;
  deliveryStatus: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Unpaid' | 'Paid' | 'Partially Paid';
  date: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  // Extended fields for full Android Purchase Order Feature Parity
  status?: 'Draft' | 'Submitted' | 'Pending Approval' | 'Approved' | 'Ordered' | 'Partially Received' | 'Fully Received' | 'Cancelled' | 'Closed';
  expectedDeliveryDate?: string;
  employeeName?: string;
  employeeId?: string;
  internalNotes?: string;
  supplierContactName?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  paymentTerms?: string;
  priorityLevel?: 'Low' | 'Medium' | 'High' | 'Urgent';
  productId?: string;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  productsSupplied: string[];
  totalOrders: number;
  totalSpend: number;
  lastPurchaseDate?: string;
  supplierRating: number;
  status: 'Active' | 'Inactive' | 'Archived';
}

export interface CalendarEvent {
  id: string;
  businessId: string;
  title: string;
  type: 'Meeting' | 'Deadline' | 'Announcement' | 'Business Event';
  date: string;
  description: string;
  createdBy: string;
}

export interface Task {
  id: string;
  businessId: string;
  title: string;
  description: string;
  dueDate: string;
  assignedToName: string;
  assignedToId: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  createdBy: string;
}

export interface TimeLog {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  role: UserRole;
  clockIn: string;
  clockOut?: string;
  workHours?: number;
  date: string;
  status: 'Present' | 'Clocked Out';
}

export interface AuditLog {
  id: string;
  businessId: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  action: string;
  oldValue?: string;
  newValue?: string;
  date: string;
  time: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
}

export interface Notification {
  id: string;
  businessId: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'success';
  date: string;
  read: boolean;
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  location?: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
  managerId?: string;
  managerName?: string;
}

export interface Budget {
  id: string;
  businessId: string;
  category: string;
  spendingLimit: number;
  amountSpent: number;
  remainingBalance: number;
  percentageUsed: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Invoice {
  id: string;
  businessId: string;
  invoiceNumber: string;
  customerName: string;
  billingAmount: number;
  lineItemDescription: string;
  dueDateOffset: number;
  dueDate: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface BankTransaction {
  id: string;
  businessId: string;
  amount: number;
  date: string;
  reference: string;
  source: string;
  description: string;
  categorySuggestion: string;
  status: 'Pending' | 'Reconciled' | 'Ignored';
  reconciliationId?: string;
  reconciledAt?: string;
}

export interface Reconciliation {
  id: string;
  businessId: string;
  amount: number;
  paymentReference: string;
  category: string;
  status: 'Reconciled';
  timestamp: string;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  createdAt?: string;
  workspaceId?: string;
  branchId?: string;
  workspace_id?: string;
  business_id?: string;
  branch_id?: string;
}

export interface TradeCategory {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Department {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  createdAt?: string;
}

