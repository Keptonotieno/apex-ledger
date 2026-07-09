import { useApp } from '../context/AppContext';
import { UserRole, UserProfile, Business, Branch } from '../types';

export interface SessionPermissions {
  /** True if the user has Business Owner (Admin) role */
  isAdmin: boolean;
  /** True if the user has Manager role */
  isManager: boolean;
  /** True if the user has Employee role */
  isEmployee: boolean;
  /** Custom check to verify access to a view or resource with a minimum role requirement */
  hasAccess: (minRole: UserRole, resourceId?: string) => boolean;
  /** Permission to view financial/accounting ledger */
  canViewAccounting: boolean;
  /** Permission to view system-wide audit logs */
  canViewAuditLogs: boolean;
  /** Permission to view business reports and performance statistics */
  canViewReports: boolean;
  /** Permission to manage (add/update/delete) business branches */
  canManageBranches: boolean;
  /** Permission to manage employee profiles */
  canManageEmployees: boolean;
  /** Permission to log and manage expenses */
  canManageExpenses: boolean;
}

export interface SessionContext {
  /** Active user profile or null if not authenticated */
  user: UserProfile | null;
  /** The current business context */
  business: Business | null;
  /** The current branch context */
  branch: Branch | null;
  /** Connection and replication status */
  connectionStatus: 'Connected' | 'Local Syncing';
  /** Login state flag */
  isLoggedIn: boolean;
  /** Active user role or null if not logged in */
  role: UserRole | null;
  /** Currently active workspace business identifier */
  activeBusinessId: string | null;
  /** Currently active workspace branch identifier */
  activeBranchId: string | null;
  /** List of all businesses registered under the workspace/tenant */
  businesses: Business[];
  /** List of branches available within the active business */
  branches: Branch[];
  /** Permissions object mapped to the active session and user role */
  permissions: SessionPermissions;
  /** Securely sign in an owner with email and password, or an employee with ID */
  login: (userId: string, email?: string, password?: string) => Promise<boolean>;
  /** Sign in an employee profile with employee badge/ID number */
  loginWithEmployeeNumber: (employeeNumber: string) => Promise<boolean>;
  /** Log out and clear local cache securely */
  logout: () => Promise<void>;
}

/**
 * Custom React hook that manages the authenticated session, ensuring user state,
 * workspace context, and permissions are persisted and accessible across the application components.
 */
export function useSession(): SessionContext {
  const {
    activeUser,
    activeBusiness,
    activeBranchId,
    businesses,
    branches,
    isLoggedIn,
    connectionStatus,
    login,
    loginWithEmployeeNumber,
    logout,
  } = useApp();

  // Find the active branch object
  const activeBranch = branches.find((b) => b.id === activeBranchId) || null;

  // Cache user roles for easy access
  const isAdmin = activeUser?.role === UserRole.ADMIN;
  const isManager = activeUser?.role === UserRole.MANAGER;
  const isEmployee = activeUser?.role === UserRole.EMPLOYEE;
  const role = activeUser?.role || null;

  // Custom resource-level access checker based on user roles and business rules
  const hasAccess = (itemMinRole: UserRole, resourceId?: string): boolean => {
    // If no business context is loaded, only allow base views
    if (businesses.length === 0) {
      return resourceId === 'overview' || resourceId === 'settings';
    }

    if (isAdmin) return true;

    if (isManager) {
      // Managers can access everything except explicit Owner/Admin tools
      return itemMinRole !== UserRole.ADMIN;
    }

    // Employees hasAccess logic
    if (resourceId === 'expenses') {
      return activeUser?.allowExpenses === true;
    }

    return itemMinRole === UserRole.EMPLOYEE;
  };

  // Compile full permission profiles based on role and delegated options
  const permissions: SessionPermissions = {
    isAdmin,
    isManager,
    isEmployee,
    hasAccess,
    canViewAccounting: isAdmin || isManager,
    canViewAuditLogs: isAdmin || isManager,
    canViewReports: isAdmin || isManager,
    canManageBranches: isAdmin || (isManager && activeBusiness?.allowManagersToManageBranches === true),
    canManageEmployees: isAdmin || isManager,
    canManageExpenses: isAdmin || isManager || activeUser?.allowExpenses === true,
  };

  return {
    user: activeUser || null,
    business: activeBusiness || null,
    branch: activeBranch,
    connectionStatus,
    isLoggedIn,
    role,
    activeBusinessId: activeBusiness?.id || null,
    activeBranchId: activeBranchId || null,
    businesses,
    branches,
    permissions,
    login,
    loginWithEmployeeNumber,
    logout,
  };
}
