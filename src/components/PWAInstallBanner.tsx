import React, { useState } from 'react';
import { Smartphone, Download, WifiOff, X, Share2, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isOnline, swUpdateAvailable, isIOS, installApp, updateServiceWorker } = usePWA();
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    try {
      updateServiceWorker();
    } catch (err) {
      console.warn('Direct SW update warning:', err);
    }
    setTimeout(() => {
      window.location.reload();
    }, 200);
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    const success = await installApp();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 5000);
    }
  };

  return (
    <>
      {/* Offline Status Toast Indicator */}
      {!isOnline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-950/90 border border-amber-500/40 text-amber-200 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-semibold animate-bounce">
          <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Offline Mode Active — Local Vault Synced</span>
        </div>
      )}

      {/* SW Update Notification Banner */}
      {swUpdateAvailable && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-cyan-950/95 border border-cyan-500/40 text-cyan-100 p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">App Update Ready</h4>
              <p className="text-[11px] text-cyan-300">A new version of Apex Ledger is available.</p>
            </div>
          </div>
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-gray-950 font-extrabold rounded-lg text-xs transition cursor-pointer shadow-md flex items-center gap-1.5 shrink-0"
          >
            {isRefreshing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      )}

      {/* PWA Successful Installation Toast */}
      {installSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950/95 border border-emerald-500/40 text-emerald-100 p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <div>
            <h4 className="text-xs font-bold text-white">Apex Ledger Installed!</h4>
            <p className="text-[11px] text-emerald-300">You can now launch Apex Ledger directly from your Home Screen.</p>
          </div>
        </div>
      )}

      {/* PWA Install Banner for Mobile & Desktop Web Browsers */}
      {(isInstallable || isIOS) && !isInstalled && !dismissed && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-gray-900/95 border border-amber-500/30 p-4 rounded-2xl shadow-2xl backdrop-blur-xl text-gray-100 space-y-3 transition-all duration-300 animate-fadeIn">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/icon.svg"
                  alt="Apex Ledger PWA"
                  className="w-12 h-12 rounded-xl border border-amber-500/30 shadow-md object-cover bg-gray-950"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-white tracking-wide">Install Apex Ledger App</h4>
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-mono rounded font-semibold border border-amber-500/30">PWA</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                  {isIOS ? 'Install on iPhone/iPad for full offline access & native feel.' : 'Install on device home screen for fast offline mobile access.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-500 hover:text-gray-300 p-1 rounded-lg transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-900/30 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIOS ? 'How to Install on iOS' : 'Install App'}</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Installation Steps Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative animate-slide-up">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Install on iOS Safari</h3>
                <p className="text-xs text-gray-400">Follow 2 quick steps to add to home screen:</p>
              </div>
            </div>

            <div className="space-y-3 bg-gray-950 p-4 rounded-2xl border border-gray-800 text-xs text-gray-300">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  Tap the <strong className="text-white inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-cyan-400 inline" /> Share</strong> icon in your Safari browser bottom toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  Scroll down the action menu and select <strong className="text-amber-300">"Add to Home Screen"</strong>.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-amber-500 text-gray-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition cursor-pointer"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
