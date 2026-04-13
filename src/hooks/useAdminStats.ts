'use client';

import { useEffect, useState, useRef } from 'react';

interface AdminStats {
  posts: number;
  users: number;
  comments: number;
  pendingReports: number;
  timestamp: number;
}

interface UseAdminStatsOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export function useAdminStats(options: UseAdminStatsOptions = {}) {
  const { enabled = true, refreshInterval = 30000 } = options;
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(enabled);
  const refreshIntervalRef = useRef(refreshInterval);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    refreshIntervalRef.current = refreshInterval;
  }, [refreshInterval]);

  useEffect(() => {
    if (!enabled) return;

    const connect = () => {
      if (!enabledRef.current) return;

      try {
        const eventSource = new EventSource('/api/admin/stats');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as AdminStats;
            setStats(data);
          } catch (e) {
            console.error('[useAdminStats] Parse error:', e);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource.close();
          eventSourceRef.current = null;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (enabledRef.current) {
              connect();
            }
          }, refreshIntervalRef.current);
        };
      } catch (e) {
        setError(e as Error);
      }
    };

    const disconnect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
    };

    connect();
    return () => disconnect();
  }, [enabled]);

  return {
    stats,
    error,
    isConnected,
    refresh: () => {},
  };
}