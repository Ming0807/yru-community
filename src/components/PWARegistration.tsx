'use client';

import { useEffect } from 'react';

export function PWARegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let updateInterval: ReturnType<typeof setInterval> | null = null;

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service worker registered:', registration.scope);

          // Check for updates periodically (every 30 minutes)
          updateInterval = setInterval(() => {
            registration.update();
          }, 30 * 60 * 1000);
        })
        .catch((error) => {
          console.warn('[PWA] Service worker registration failed:', error);
        });
    }

    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
    };

    // Listen for app installed
    const installedHandler = () => {};
    if (!isStandalone) {
      window.addEventListener('beforeinstallprompt', handler);
      window.addEventListener('appinstalled', installedHandler);
    }

    return () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  // This component only handles SW registration, no visible UI
  return null;
}
