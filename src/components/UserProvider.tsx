'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { Profile } from '@/types';

interface UserContextType {
  user: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function useUser() {
  return useContext(UserContext);
}

// ─── Profile Cache Helpers ──────────────────────────────────────────────────
// We cache the user profile in sessionStorage so it can be displayed instantly
// on page load / bfcache restore, before the async DB fetch completes.
// sessionStorage is cleared when the browser tab closes (safer than localStorage).

function getCachedProfile(userId: string): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`yru_profile_${userId}`);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function setCachedProfile(profile: Profile) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`yru_profile_${profile.id}`, JSON.stringify(profile));
  } catch {
    // sessionStorage might be full or unavailable (private mode edge cases)
  }
}

function clearProfileCache() {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(sessionStorage).filter((k) => k.startsWith('yru_profile_'));
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}
// ────────────────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      const cached = getCachedProfile(authUser.id);
      if (cached) {
        setUser(cached);
        setLoading(false);
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
        
      if (profile) {
        setUser(profile);
        setCachedProfile(profile);
      } else if (!cached) {
        setUser(null);
      }
    } catch (err) {
      console.error('[UserProvider] Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    let subscription: { unsubscribe: () => void } | null = null;

    async function initAuth() {
      try {
        // 1. Fetch session explicitly so SSR cookies are read
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user ?? null;

        if (!authUser) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        } else {
          // Show cached profile instantly
          const cached = getCachedProfile(authUser.id);
          if (cached && mounted) {
            setUser(cached);
            setLoading(false);
          }

          // Fetch fresh profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (mounted) {
            if (profile) {
              setUser(profile);
              setCachedProfile(profile);
            } else if (!cached) {
              setUser(null);
            }
            setLoading(false);
          }
        }

        if (!mounted) return;

        // 2. Subscribe to auth changes AFTER initial session is loaded
        // This prevents navigator.locks contention between getSession and onAuthStateChange
        const { data } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, currentSession: Session | null) => {
          if (event === 'INITIAL_SESSION') return; // Already handled manually

          if (event === 'SIGNED_OUT' || !currentSession?.user) {
            setUser(null);
            setLoading(false);
            clearProfileCache();
            return;
          }

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentSession.user.id)
                .maybeSingle();
                
              if (profile) {
                setUser(profile);
                setCachedProfile(profile);
              } else {
                setUser(null);
              }
            } catch (err) {
              console.error(`[UserProvider] Profile fetch error (${event}):`, err);
            } finally {
              setLoading(false);
            }
          }
        });
        subscription = data.subscription;
      } catch (err) {
        console.error('[UserProvider] Auth initialization error:', err);
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // ── bfcache restore handler ─────────────────────────────────────────────
  // When the user presses the browser Back button, the browser may restore
  // the page from bfcache (a frozen snapshot). The auth state in that snapshot
  // may be stale. We listen for the `pageshow` event and re-sync if needed.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page was restored from bfcache — re-fetch to sync auth state
        fetchProfile();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [fetchProfile]);

  return (
    <UserContext.Provider value={{ user, loading, refresh: fetchProfile }}>
      {children}
    </UserContext.Provider>
  );
}
