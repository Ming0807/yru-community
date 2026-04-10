'use client';

import { useEffect, useState, useCallback } from 'react';

interface AdminStats {
  posts: number;
  users: number;
  comments: number;
  pendingReports: number;
  timestamp: number;
}

export function useAdminStats(pollInterval = 30000) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const text = await res.text();
      if (text.startsWith('data: ')) {
        const data = JSON.parse(text.slice(6));
        setStats(data);
        setConnected(true);
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    
    const interval = setInterval(fetchStats, pollInterval);
    
    return () => clearInterval(interval);
  }, [fetchStats, pollInterval]);

  return { stats, connected, refetch: fetchStats };
}