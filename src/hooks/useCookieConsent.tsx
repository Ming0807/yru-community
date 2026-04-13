'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing';

export interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsentContextValue {
  preferences: ConsentPreferences;
  hasConsent: boolean;
  isBannerVisible: boolean;
  isModalOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (prefs: ConsentPreferences) => void;
  openSettings: () => void;
  closeSettings: () => void;
  resetConsent: () => void;
}

const defaultPreferences: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

const STORAGE_KEY = 'yru_consent';
const CONSENT_EXPIRY_DAYS = 365;

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function getStoredConsent(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.expires && Date.now() > parsed.expires) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.preferences;
  } catch {
    return null;
  }
}

function saveConsent(preferences: ConsentPreferences): void {
  const data = {
    preferences,
    expires: Date.now() + CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function hasUserMadeChoice(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ConsentPreferences>(defaultPreferences);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const stored = getStoredConsent();
    const newBannerVisible = !stored;
    const newPreferences = stored || defaultPreferences;

    requestAnimationFrame(() => {
      setPreferences(newPreferences);
      setIsBannerVisible(newBannerVisible);
      setIsInitialized(true);
    });
  }, []);

  const acceptAll = useCallback(() => {
    const newPrefs: ConsentPreferences = { necessary: true, analytics: true, marketing: true };
    setPreferences(newPrefs);
    saveConsent(newPrefs);
    setIsBannerVisible(false);
  }, []);

  const rejectAll = useCallback(() => {
    const newPrefs: ConsentPreferences = { necessary: true, analytics: false, marketing: false };
    setPreferences(newPrefs);
    saveConsent(newPrefs);
    setIsBannerVisible(false);
  }, []);

  const savePreferences = useCallback((prefs: ConsentPreferences) => {
    const newPrefs = { ...prefs, necessary: true };
    setPreferences(newPrefs);
    saveConsent(newPrefs);
    setIsModalOpen(false);
    setIsBannerVisible(false);
  }, []);

  const openSettings = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPreferences(defaultPreferences);
    setIsBannerVisible(true);
    setIsModalOpen(false);
  }, []);

  const hasConsent = preferences.analytics || preferences.marketing;

  return (
    <CookieConsentContext.Provider
      value={{
        preferences,
        hasConsent,
        isBannerVisible: isInitialized && isBannerVisible,
        isModalOpen,
        acceptAll,
        rejectAll,
        savePreferences,
        openSettings,
        closeSettings,
        resetConsent,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return context;
}