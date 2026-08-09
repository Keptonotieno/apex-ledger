import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [swUpdateAvailable, setSwUpdateAvailable] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Detect standalone mode (already installed as PWA)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    // Detect iOS devices for specific installation guidance
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice && !isStandalone);

    // Online/Offline status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capture PWA Install Prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      console.log('[PWA Hook] captured beforeinstallprompt event.');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('[PWA Hook] Apex Ledger successfully installed as a mobile/desktop app!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setSwRegistration(reg);
          console.log('[PWA Hook] Service Worker registered with scope:', reg.scope);

          // Check if there is already a worker waiting to activate
          if (reg.waiting && navigator.serviceWorker.controller) {
            setSwUpdateAvailable(true);
            console.log('[PWA Hook] Service worker is waiting to activate.');
          }

          // Pre-warm API cache when active controller is ready
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'PREWARM_API_CACHE',
              urls: ['/api/auth/me', '/api/health']
            });
          }

          // Check for service worker updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setSwUpdateAvailable(true);
                  console.log('[PWA Hook] New version of Apex Ledger PWA is available!');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA Hook] Service Worker registration failed:', err);
        });

      // Automatically reload when the new Service Worker takes control
      let refreshing = false;
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          console.log('[PWA Hook] Controller changed. Reloading page...');
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA Hook] User accepted the PWA installation');
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      } else {
        console.log('[PWA Hook] User dismissed the PWA installation prompt');
        return false;
      }
    } catch (error) {
      console.error('[PWA Hook] Error invoking install prompt:', error);
      return false;
    }
  }, [deferredPrompt]);

  const updateServiceWorker = useCallback(() => {
    console.log('[PWA Hook] Triggering Service Worker update and page refresh...');

    if (swRegistration) {
      if (swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else if (swRegistration.installing) {
        swRegistration.installing.postMessage({ type: 'SKIP_WAITING' });
      }
      swRegistration.update().catch(() => {});
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }

    // Fallback page reload to guarantee page refreshes immediately
    setTimeout(() => {
      window.location.reload();
    }, 250);
  }, [swRegistration]);

  const prewarmCache = useCallback((urls?: string[]) => {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PREWARM_API_CACHE',
        urls: urls || ['/api/auth/me', '/api/health']
      });
    }
  }, []);

  return {
    isInstallable,
    isInstalled,
    isOnline,
    swUpdateAvailable,
    isIOS,
    installApp,
    updateServiceWorker,
    prewarmCache
  };
}
