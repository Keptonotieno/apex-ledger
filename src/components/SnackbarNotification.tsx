import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, X } from 'lucide-react';

interface ToastMessage {
  id: string;
  message: string;
  timestamp: Date;
}

export function SnackbarNotification() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleSystemError = (event: Event) => {
      const customEvent = event as CustomEvent;
      const originalMsg = String(customEvent.detail?.message || '');
      
      // Filter out raw SQL or Postgres / database connection strings/errors to make them absolutely non-technical
      let friendlyMessage = originalMsg;
      if (
        originalMsg.includes('SQLITE_') || 
        originalMsg.includes('sqlite3') || 
        originalMsg.includes('select ') || 
        originalMsg.includes('insert ') || 
        originalMsg.includes('update ') || 
        originalMsg.includes('delete ') || 
        originalMsg.includes('database') ||
        originalMsg.includes('constraint failed') ||
        originalMsg.includes('postgres') ||
        originalMsg.includes('connection')
      ) {
        friendlyMessage = 'A secure database validation error occurred. For safety, the operation was aborted.';
      }
      
      // If it contains "Server error", make it sound humble and professional
      if (friendlyMessage.toLowerCase().includes('server error')) {
        friendlyMessage = 'An unexpected system anomaly was encountered. Our administrator has been notified.';
      }

      const newToast: ToastMessage = {
        id: Math.random().toString(36).substring(2, 9),
        message: friendlyMessage,
        timestamp: new Date()
      };

      setToasts(prev => [...prev, newToast]);

      // Auto-remove after 6 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 6000);
    };

    window.addEventListener('system-api-error', handleSystemError);
    return () => {
      window.removeEventListener('system-api-error', handleSystemError);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] max-w-sm w-full pointer-events-none flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            id={`snackbar-${toast.id}`}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="pointer-events-auto bg-[#181d2c]/95 border-l-4 border-rose-500 text-gray-200 p-4 rounded-lg shadow-xl flex items-start gap-3 backdrop-blur-md border border-brand-border"
          >
            <div className="text-rose-500 shrink-0 mt-0.5">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold mb-1">
                Security & Ledger Alert
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed font-sans font-medium">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-500 hover:text-gray-300 transition-colors shrink-0 p-0.5 rounded-md hover:bg-gray-800"
              aria-label="Dismiss Alert"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
