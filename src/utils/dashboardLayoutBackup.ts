import { db, doc, getDoc, setDoc, isFirebaseConfigured } from '../lib/firebase';
import { auth } from '../lib/firebase';

export interface DashboardLayoutState {
  sidebarCollapsed: boolean;
  activeModule: string;
  scrollPosition: number;
  updatedAt: string;
  userId: string;
  businessId?: string;
  deviceLabel?: string;
  autoSyncEnabled?: boolean;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.warn('[DashboardLayoutBackup] Firestore Notice:', JSON.stringify(errInfo));
}

export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Desktop Browser';
  const ua = navigator.userAgent;
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac Workstation';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/iPhone|iPad/.test(ua)) return 'iOS Device';
  if (/Android/.test(ua)) return 'Android Device';
  if (/Linux/.test(ua)) return 'Linux Terminal';
  return 'Web Workspace';
}

const LOCAL_STORAGE_KEY_PREFIX = 'apex_ledger_layout_';

export function getLocalLayoutBackup(userId: string): DashboardLayoutState | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local layout state:', e);
  }
  return null;
}

export function saveLocalLayoutBackup(userId: string, state: DashboardLayoutState) {
  if (!userId) return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(state));
    window.dispatchEvent(new Event('apex-layout-updated'));
  } catch (e) {
    console.error('Error writing local layout state:', e);
  }
}

/**
 * Saves dashboard layout to Firestore and local storage.
 */
export async function backupLayoutToFirestore(
  userId: string,
  layout: { sidebarCollapsed: boolean; activeModule: string; scrollPosition: number; businessId?: string },
  autoSyncEnabled: boolean = true
): Promise<{ success: boolean; data?: DashboardLayoutState; message?: string }> {
  if (!userId) {
    return { success: false, message: 'User ID is missing.' };
  }

  const payload: DashboardLayoutState = {
    sidebarCollapsed: layout.sidebarCollapsed,
    activeModule: layout.activeModule,
    scrollPosition: Math.max(0, Math.round(layout.scrollPosition || 0)),
    updatedAt: new Date().toISOString(),
    userId,
    businessId: layout.businessId || 'default',
    deviceLabel: getDeviceLabel(),
    autoSyncEnabled
  };

  // Always save locally first for instant response
  saveLocalLayoutBackup(userId, payload);

  if (!isFirebaseConfigured || !db) {
    return { success: true, data: payload, message: 'Saved to local workspace cache.' };
  }

  const docPath = `dashboard_layouts/${userId}`;
  try {
    const docRef = doc(db, 'dashboard_layouts', userId);
    await setDoc(docRef, payload, { merge: true });
    return { success: true, data: payload, message: 'Dashboard layout backed up to Firestore cloud.' };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
    return { success: true, data: payload, message: 'Cached locally (Firestore offline/sync pending).' };
  }
}

/**
 * Fetches dashboard layout from Firestore or local storage fallback.
 */
export async function fetchLayoutFromFirestore(userId: string): Promise<DashboardLayoutState | null> {
  if (!userId) return null;

  const localState = getLocalLayoutBackup(userId);

  if (!isFirebaseConfigured || !db) {
    return localState;
  }

  const docPath = `dashboard_layouts/${userId}`;
  try {
    const docRef = doc(db, 'dashboard_layouts', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const remoteData = snap.data() as DashboardLayoutState;
      // If remote timestamp is newer or local is missing, use remote data
      if (!localState || (remoteData.updatedAt && new Date(remoteData.updatedAt) >= new Date(localState.updatedAt || 0))) {
        saveLocalLayoutBackup(userId, remoteData);
        return remoteData;
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, docPath);
  }

  return localState;
}
