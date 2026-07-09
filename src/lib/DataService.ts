import { dbManager } from './database';
import { Business, Branch } from '../types';

/**
 * DataService provides a robust, promise-based API client wrapper
 * around our persistent storage layer (dbManager / offline-first SQLite abstraction).
 * It ensures proper asynchronous execution, handles potential errors,
 * and notifies listeners (such as AppContext) of successful transactions to instantly refresh the UI.
 */
export class DataService {
  /**
   * Dispatches custom events to notify AppContext of successful state writes,
   * triggering clean reactive state updates across the entire application immediately.
   */
  private static notifyUI() {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('apex-db-update'));
  }

  // --- BUSINESS CRUD OPERATIONS ---

  /**
   * Fetches all registered businesses asynchronously.
   * @param includeArchived If true, includes archived workspaces.
   */
  public static async getBusinesses(includeArchived: boolean = true): Promise<Business[]> {
    return new Promise((resolve, reject) => {
      try {
        // Slight mock delay to emulate SQL/IndexedDB async query execution
        setTimeout(() => {
          const list = dbManager.getBusinesses(includeArchived);
          resolve(list);
        }, 50);
      } catch (error) {
        console.error('[DataService] Error fetching businesses:', error);
        reject(new Error('Failed to retrieve businesses from persistent storage.'));
      }
    });
  }

  /**
   * Creates a new business tenant workspace and automatically establishes its initial branch.
   */
  public static async createBusiness(params: {
    name: string;
    branch: string;
    currency?: string;
    businessType?: string;
    registrationNumber?: string;
  }): Promise<Business> {
    return new Promise((resolve, reject) => {
      try {
        if (!params.name || !params.name.trim()) {
          return reject(new Error('Business name cannot be empty.'));
        }

        setTimeout(() => {
          dbManager.registerBusiness(
            params.name.trim(),
            params.branch ? params.branch.trim() : 'Main HQ',
            params.currency || 'KSh',
            params.businessType || 'Retail',
            params.registrationNumber
          );

          const activeBiz = dbManager.getCurrentBusiness();
          if (!activeBiz) {
            return reject(new Error('Business was created but active session retrieval failed.'));
          }

          this.notifyUI();
          resolve(activeBiz);
        }, 80);
      } catch (error) {
        console.error('[DataService] Error creating business:', error);
        reject(new Error('Failed to create the corporate business profile.'));
      }
    });
  }

  /**
   * Updates an existing business profile settings.
   */
  public static async updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
    return new Promise((resolve, reject) => {
      try {
        if (!id) {
          return reject(new Error('Business ID is required for update operation.'));
        }

        setTimeout(() => {
          dbManager.updateBusiness(id, updates);
          const all = dbManager.getBusinesses(true);
          const updated = all.find(b => b.id === id);

          if (!updated) {
            return reject(new Error(`Business profile not found after update (ID: ${id})`));
          }

          this.notifyUI();
          resolve(updated);
        }, 80);
      } catch (error) {
        console.error('[DataService] Error updating business settings:', error);
        reject(new Error('An error occurred while saving business profile settings.'));
      }
    });
  }

  /**
   * Permanently deletes a business tenant workspace and cascades deletion across all tables.
   */
  public static async deleteBusiness(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        if (!id) {
          return reject(new Error('Business ID is required for deletion.'));
        }

        setTimeout(() => {
          const allBefore = dbManager.getBusinesses(true);
          const exists = allBefore.some(b => b.id === id);
          if (!exists) {
            return reject(new Error(`Business profile with ID ${id} does not exist.`));
          }

          dbManager.deleteBusiness(id);
          this.notifyUI();
          resolve(true);
        }, 80);
      } catch (error) {
        console.error('[DataService] Error deleting business workspace:', error);
        reject(new Error('An error occurred during secure tenant workspace deletion.'));
      }
    });
  }

  // --- BRANCH CRUD OPERATIONS ---

  /**
   * Fetches all corporate branches for the currently active business workspace.
   */
  public static async getBranches(): Promise<Branch[]> {
    return new Promise((resolve, reject) => {
      try {
        setTimeout(() => {
          const list = dbManager.getBranches();
          resolve(list);
        }, 50);
      } catch (error) {
        console.error('[DataService] Error fetching corporate branches:', error);
        reject(new Error('Failed to retrieve branches from persistent storage.'));
      }
    });
  }

  /**
   * Creates a new branch under the current business context.
   */
  public static async createBranch(params: {
    name: string;
    location?: string;
    status: 'Active' | 'Inactive';
  }): Promise<Branch> {
    return new Promise((resolve, reject) => {
      try {
        if (!params.name || !params.name.trim()) {
          return reject(new Error('Branch designation name cannot be empty.'));
        }

        setTimeout(() => {
          dbManager.addBranch({
            name: params.name.trim(),
            location: params.location ? params.location.trim() : 'Main HQ',
            status: params.status
          });

          const list = dbManager.getBranches();
          // Find the newly registered branch by name designator or locate the latest index
          const created = list.find(b => b.name === params.name.trim()) || list[list.length - 1];

          if (!created) {
            return reject(new Error('Branch registration succeeded but record retrieval failed.'));
          }

          this.notifyUI();
          resolve(created);
        }, 80);
      } catch (error) {
        console.error('[DataService] Error creating corporate branch:', error);
        reject(new Error('An error occurred during branch creation.'));
      }
    });
  }

  /**
   * Updates an existing corporate branch settings.
   */
  public static async updateBranch(id: string, updates: Partial<Branch>): Promise<Branch> {
    return new Promise((resolve, reject) => {
      try {
        if (!id) {
          return reject(new Error('Branch ID is required for update operation.'));
        }

        setTimeout(() => {
          dbManager.updateBranch(id, updates);
          const list = dbManager.getBranches();
          const updated = list.find(b => b.id === id);

          if (!updated) {
            return reject(new Error(`Branch was not found after update (ID: ${id})`));
          }

          this.notifyUI();
          resolve(updated);
        }, 80);
      } catch (error) {
        console.error('[DataService] Error updating corporate branch settings:', error);
        reject(new Error('An error occurred while saving branch settings.'));
      }
    });
  }

  /**
   * Permanently decommissions and deletes a corporate branch.
   */
  public static async deleteBranch(id: string, cascade: boolean = false): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        if (!id) {
          return reject(new Error('Branch ID is required for decommission action.'));
        }

        setTimeout(() => {
          const listBefore = dbManager.getBranches();
          const exists = listBefore.some(b => b.id === id);
          if (!exists) {
            return reject(new Error(`Corporate branch with ID ${id} does not exist.`));
          }

          try {
            dbManager.deleteBranch(id, cascade);
            this.notifyUI();
            resolve(true);
          } catch (err: any) {
            reject(err);
          }
        }, 80);
      } catch (error) {
        console.error('[DataService] Error deleting corporate branch:', error);
        reject(new Error('An error occurred during corporate branch decommissioning.'));
      }
    });
  }
}
