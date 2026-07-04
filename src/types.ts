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
  status?: 'Active' | 'Suspended';
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
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  category: string;
  imageUrl?: string;
  barcode: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  unit: string;
  supplier: string;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  minStockAlert: number;
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
