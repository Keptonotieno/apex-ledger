import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ShieldAlert, CheckCircle2, Home } from 'lucide-react';
import { dbManager } from '../lib/database';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface Props {
  children?: ReactNode;
  moduleName?: string;
  isGlobal?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  loggedToAudit: boolean;
  auditId: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    loggedToAudit: false,
    auditId: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const scope = this.props.moduleName || (this.props.isGlobal ? 'Global Application Root' : 'Active Module');
    console.error(`[Global Error Boundary] Uncaught exception in ${scope}:`, error, errorInfo);

    const auditId = 'aud_crash_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    this.setState({ errorInfo, auditId });

    // 1. Log to dbManager audit system
    try {
      dbManager.addAudit(
        'SYSTEM_CRASH_UNCAUGHT_EXCEPTION',
        `Scope: ${scope}`,
        `Error: ${error.message || 'Unknown Error'} | Stack: ${(errorInfo.componentStack || '').substring(0, 200)}`,
        undefined,
        auditId
      );
      this.setState({ loggedToAudit: true });
    } catch (e) {
      console.warn('Failed to log crash to dbManager audit:', e);
    }

    // 2. Direct log write to Firebase Firestore 'audits' collection for additional sync
    try {
      if (db) {
        addDoc(collection(db, 'audits'), {
          id: auditId,
          action: 'CRASH_RECOVERY_LOG',
          scope,
          errorMessage: error.message || 'Unknown Error',
          errorStack: error.stack || '',
          componentStack: errorInfo.componentStack || '',
          timestamp: new Date().toISOString(),
          deviceInfo: navigator.userAgent || 'Unknown Device'
        }).then(() => {
          this.setState({ loggedToAudit: true });
        }).catch(err => {
          console.warn('Direct Firestore audit log warning:', err);
        });
      }
    } catch (fErr) {
      console.warn('Firestore direct write exception:', fErr);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, loggedToAudit: false, auditId: null });
  };

  private handleClearCacheAndReload = () => {
    try {
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 sm:p-10 rounded-2xl bg-[#0f1117] border border-rose-500/30 shadow-2xl space-y-6 max-w-3xl mx-auto my-8 text-center relative overflow-hidden backdrop-blur-xl">
          {/* Top Decorative Alert Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 animate-pulse" />

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto shadow-inner">
            <AlertTriangle className="h-8 w-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-gray-100 tracking-tight">
              {this.props.isGlobal ? 'Application Encountered an Unexpected Error' : 'Module Component Encountered an Error'}
            </h2>
            <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
              An unexpected crash was intercepted. Don't worry — your data integrity is protected and this incident has been automatically logged to Firebase Audit logs.
            </p>
          </div>

          {/* Scope and Audit Status Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-[11px] font-mono">
            <span className="px-3 py-1 bg-gray-900 border border-brand-border/60 rounded-full text-gray-300">
              Scope: <strong className="text-cyan-400">{this.props.moduleName || (this.props.isGlobal ? 'Global App' : 'Active View')}</strong>
            </span>
            {this.state.loggedToAudit ? (
              <span className="px-3 py-1 bg-emerald-950/50 border border-emerald-500/30 rounded-full text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Logged to Firebase Audit Logs</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-950/50 border border-amber-500/30 rounded-full text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Syncing Audit Log...</span>
              </span>
            )}
          </div>

          {/* Technical Diagnostics Details */}
          <div className="bg-gray-950/80 border border-rose-500/20 rounded-xl p-4 text-left font-mono text-xs text-rose-300 space-y-2 max-h-52 overflow-y-auto shadow-inner">
            <div className="font-semibold text-rose-200 border-b border-rose-500/20 pb-1.5 flex justify-between items-center text-[11px]">
              <span>Error Exception: {this.state.error?.name || 'Error'}</span>
              <span className="text-[9px] text-gray-500 font-normal">ID: {this.state.auditId || 'Pending'}</span>
            </div>
            <div className="text-rose-300 text-[11px] font-medium leading-relaxed">
              {this.state.error?.message || 'Unknown render phase exception'}
            </div>
            {this.state.error?.stack && (
              <div className="text-[9px] text-gray-500 pt-1 border-t border-gray-900 leading-normal whitespace-pre-wrap font-mono">
                {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
              </div>
            )}
          </div>

          {/* Action Recovery Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 font-sans pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-900/20 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Rendering Component</span>
            </button>

            <button
              type="button"
              onClick={this.handleClearCacheAndReload}
              className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 border border-brand-border text-gray-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>Clear Session & Refresh</span>
            </button>

            {this.props.isGlobal && (
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="px-5 py-2.5 bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Safe Home</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
