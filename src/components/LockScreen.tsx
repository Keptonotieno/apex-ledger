import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { dbManager } from '../lib/database';
import { Lock, Unlock, LogOut, ShieldAlert, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface LockScreenProps {
  activeUser: UserProfile | null;
  logout: (isTimeout?: boolean) => Promise<void>;
  onUnlock: () => void;
}

export function LockScreen({ activeUser, logout, onUnlock }: LockScreenProps) {
  const [credential, setCredential] = useState('');
  const [showCredential, setShowCredential] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!activeUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-dark text-gray-100 font-sans">
        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isEmployee = activeUser.role === UserRole.EMPLOYEE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential.trim()) {
      setError(isEmployee ? 'Employee ID is required.' : 'Password is required.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      if (isEmployee) {
        // Authenticate employee with employee number
        const success = await dbManager.loginWithEmployeeNumber(credential.trim());
        if (success) {
          onUnlock();
        } else {
          setError('Invalid Employee ID. Please try again.');
        }
      } else {
        // Authenticate owner/admin/manager with password
        const success = await dbManager.login(activeUser.id, activeUser.email, credential);
        if (success) {
          onUnlock();
        } else {
          setError('Incorrect password. Please try again.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
        id="lock-screen-container"
      >
        <div className="glass-panel border border-brand-border/80 rounded-3xl p-8 bg-[#131722]/90 shadow-2xl relative">
          
          {/* Lock Icon Emblem */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-xl shadow-cyan-500/20">
              <div className="h-full w-full rounded-full bg-[#0d0f14] flex items-center justify-center text-cyan-400">
                <Lock className="h-8 w-8 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight" id="lock-screen-title">
              Session Locked
            </h2>
            <p className="text-xs font-mono text-cyan-400 mt-1 uppercase tracking-widest">
              Security Protocol Active
            </p>
          </div>

          {/* User Profile Info Card */}
          <div className="mt-8 flex flex-col items-center p-4 bg-[#1b2030]/50 border border-brand-border/40 rounded-2xl mb-6">
            {activeUser.avatarUrl ? (
              <img
                src={activeUser.avatarUrl}
                alt={activeUser.name}
                className="h-16 w-16 rounded-full border-2 border-cyan-500/50 object-cover shadow-md mb-3"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-16 w-16 rounded-full border-2 border-cyan-500/50 bg-[#0d0f14] flex items-center justify-center text-cyan-400 text-xl font-bold mb-3">
                {activeUser.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-white">{activeUser.name}</span>
            <span className="text-xs text-gray-400 mt-0.5">{activeUser.role}</span>
            {!isEmployee && (
              <span className="text-[10px] text-cyan-400/70 font-mono mt-1">{activeUser.email}</span>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5"
              id="lock-screen-error"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Unlock Form */}
          <form onSubmit={handleSubmit} className="space-y-4" id="lock-screen-form">
            <div>
              <label htmlFor="unlock-credential" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                {isEmployee ? 'Employee ID / Badge Number' : 'Enter Password'}
              </label>
              
              <div className="relative">
                <input
                  id="unlock-credential"
                  type={isEmployee ? (showCredential ? 'text' : 'password') : (showCredential ? 'text' : 'password')}
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  disabled={isLoading}
                  placeholder={isEmployee ? 'e.g., EMP-101' : '••••••••'}
                  autoFocus
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl bg-[#0d0f14]/80 border border-brand-border focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-white placeholder-gray-600 text-sm font-mono tracking-wide transition-all outline-none"
                />
                
                <button
                  type="button"
                  id="toggle-credential-visibility"
                  onClick={() => setShowCredential(!showCredential)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-cyan-400 transition-colors"
                >
                  {showCredential ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="unlock-submit-btn"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold uppercase tracking-widest text-white hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-lg shadow-cyan-500/20 transition-all duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  Unlock Session
                </>
              )}
            </button>
          </form>

          {/* Switch Account Option */}
          <div className="mt-8 pt-6 border-t border-brand-border/40 text-center">
            <button
              id="lock-screen-logout-btn"
              onClick={async () => {
                setIsLoading(true);
                try {
                  await logout(false);
                } catch (e) {
                  console.error('Logout error during locked screen:', e);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 hover:text-red-400 transition-all duration-200 uppercase tracking-wider"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out or Switch Account
            </button>
          </div>

        </div>

        {/* Footer info line */}
        <div className="text-center mt-6 text-[10px] text-gray-600 font-mono flex flex-col items-center justify-center gap-1">
          <span>APEX LEDGER SECURITY HUB</span>
          <span className="text-cyan-500/60">ACTIVE LEDGER INTEGRITY GUARANTEED</span>
        </div>
      </motion.div>
    </div>
  );
}
