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

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (retries = 2) => {
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        // Auth error — might be expired session, don't retry
        console.warn('[UserProvider] Auth error:', authError.message);
        setUser(null);
        setLoading(false);
        return;
      }

      if (authUser) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError && retries > 0) {
          // Profile fetch failed — might be transient, retry after short delay
          console.warn('[UserProvider] Profile fetch error, retrying...', profileError.message);
          await new Promise((r) => setTimeout(r, 500));
          return fetchProfile(retries - 1);
        }

        setUser(profile);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('[UserProvider] Unexpected error:', err);
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 500));
        return fetchProfile(retries - 1);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: { user: { id: string } } | null) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(profile);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  return (
    <UserContext.Provider value={{ user, loading, refresh: fetchProfile }}>
      {children}
    </UserContext.Provider>
  );
}
