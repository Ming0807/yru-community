'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { Search, X, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';

const RECENT_SEARCHES_KEY = 'yru_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(RECENT_SEARCHES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === 'undefined') return;
  const recent = getRecentSearches();
  const filtered = recent.filter((q) => q !== query);
  const updated = [query, ...filtered].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

function removeRecentSearch(query: string) {
  if (typeof window === 'undefined') return;
  const recent = getRecentSearches().filter((q) => q !== query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
}

function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; title: string; created_at: string; is_anonymous: boolean; author: { display_name: string; avatar_url: string | null } | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const searchTerm = `%${query.trim()}%`;
      
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, author_id, title, created_at, is_anonymous')
        .or(`title.ilike.${searchTerm},content_text.ilike.${searchTerm}`)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        console.error('Search error:', error);
        setSuggestions([]);
        setLoading(false);
        return;
      }

      if (!posts || posts.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const authorIds = [...new Set(posts.map((p: { author_id: string }) => p.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', authorIds);

      const profileMap = new Map((profiles || []).map((p: { id: string; display_name: string; avatar_url: string | null }) => [p.id, p]));
      
      const suggestionsWithAuthor = posts.map((post: { id: string; author_id: string; title: string; created_at: string; is_anonymous: boolean }) => ({
        ...post,
        author: profileMap.get(post.author_id) || null
      }));
      
      setSuggestions(suggestionsWithAuthor);
      setLoading(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      saveRecentSearch(trimmed);
      setRecent(getRecentSearches());
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      setIsOpen(false);
    }
  };

  const handleSelect = (title: string) => {
    saveRecentSearch(title);
    setRecent(getRecentSearches());
    router.push(`/search?q=${encodeURIComponent(title)}`);
    setQuery(title);
    setIsOpen(false);
  };

  const handleClearRecent = (q: string) => {
    removeRecentSearch(q);
    setRecent(getRecentSearches());
  };

  const showDropdown = isOpen && (suggestions.length > 0 || loading || (recent.length > 0 && !query.trim()));

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="ค้นหากระทู้, ชีทสรุป, รีวิว..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-4 h-10 rounded-full bg-muted/50 border-transparent focus:border-border focus:bg-background transition-colors"
        />
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border bg-card shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto">
          {recent.length > 0 && !query.trim() && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> ค้นหาล่าสุด
                </span>
              </div>
              {recent.map((r) => (
                <div
                  key={r}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/60 cursor-pointer group"
                  onClick={() => handleSelect(r)}
                >
                  <span className="text-sm truncate flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    {r}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClearRecent(r); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {query.trim() && (
            <div className="p-2">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <div className="flex items-center gap-1.5 px-3 py-1.5">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">ผลลัพธ์</span>
                  </div>
                  {suggestions.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-lg px-3 py-2 hover:bg-muted/60 cursor-pointer"
                      onClick={() => handleSelect(post.title)}
                    >
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {post.is_anonymous ? 'ไม่ระบุตัวตน' : post.author?.display_name} · {timeAgo(post.created_at)}
                      </p>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  ไม่พบผลลัพธ์
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchBar() {
  return (
    <SearchInput />
  );
}
