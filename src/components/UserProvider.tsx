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

    // ── Step 1: Fast session check (reads from browser cookie, ~0ms) ──────
    const { data: { session } } = await supabase.auth.getSession();
    const authUser = session?.user ?? null;

    if (!authUser) {
      // Definitely not logged in — unblock the UI immediately, no spinner.
      setUser(null);
      setLoading(false);
      return;
    }

    // ── Step 2: Show cached profile instantly (zero flash) ─────────────────
    const cached = getCachedProfile(authUser.id);
    if (cached) {
      setUser(cached);
      setLoading(false); // UI unblocked from cache — user sees profile right away
    }

    // ── Step 3: Fetch fresh profile from DB in background ──────────────────
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        setUser(profile);
        setCachedProfile(profile); // update cache with latest data
      } else if (!cached) {
        setUser(null); // no profile and no cache → show login
      }
    } catch (err) {
      console.error('[UserProvider] Profile fetch error:', err);
      // Keep the cached version if available rather than flashing login
    } finally {
      setLoading(false); // ensure UI is always unblocked
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // INITIAL_SESSION fires on first mount and is handled entirely
        // by fetchProfile() above. We must NOT call setLoading(false) here
        // because fetchProfile() may still be mid-fetch, and unblocking
        // early would flash the login button while user === null.
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setLoading(false);
          clearProfileCache();
          return;
        }

        if (event === 'SIGNED_IN') {
          // After login redirect: check cache first for instant display,
          // THEN fetch fresh profile, and only unblock loading after we
          // have the user data — this eliminates the login button flash.
          const cached = getCachedProfile(session.user.id);
          if (cached) {
            setUser(cached);
            setLoading(false);
          }
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            setUser(profile);
            setCachedProfile(profile);
          }
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          // Silent background token refresh — update profile without
          // touching the loading state (UI should already be stable).
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            setUser(profile);
            setCachedProfile(profile);
          }
        }
      }
    );

    // ── bfcache restore handler ─────────────────────────────────────────────
    // When the user presses the browser Back button, the browser may restore
    // the page from bfcache (a frozen snapshot). The auth state in that snapshot
    // may be stale. We listen for the `pageshow` event and re-sync if needed.
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page was restored from bfcache — re-fetch to sync auth state
        fetchProfile();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [fetchProfile]);

  return (
    <UserContext.Provider value={{ user, loading, refresh: fetchProfile }}>
      {children}
    </UserContext.Provider>
  );
}
