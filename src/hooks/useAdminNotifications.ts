'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface AdminNotificationState {
  isConnected: boolean;
  budgetAlerts: any[];
  campaignUpdates: any[];
  adPerformance: any[];
  conversions: number;
}

const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useAdminNotifications() {
  const [state, setState] = useState<AdminNotificationState>({
    isConnected: false,
    budgetAlerts: [],
    campaignUpdates: [],
    adPerformance: [],
    conversions: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/admin/notifications/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected to admin notifications');
      setState(prev => ({ ...prev, isConnected: true }));
      reconnectAttempts.current = 0;
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      setState(prev => ({ ...prev, isConnected: false }));
      eventSource.close();

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++;
        console.log(`[SSE] Reconnecting... attempt ${reconnectAttempts.current}`);
        reconnectTimeoutRef.current = setTimeout(connectRef.current, RECONNECT_DELAY);
      }
    };

    eventSource.addEventListener('connected', (event) => {
      console.log('[SSE] Received connected event:', event.data);
    });

    eventSource.addEventListener('budget_alert', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Budget alert:', data);
        setState(prev => ({
          ...prev,
          budgetAlerts: data.alerts || [],
        }));
      } catch (err) {
        console.error('[SSE] Parse error for budget_alert:', err);
      }
    });

    eventSource.addEventListener('campaign_update', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Campaign update:', data);
        setState(prev => ({
          ...prev,
          campaignUpdates: data.campaigns || [],
        }));
      } catch (err) {
        console.error('[SSE] Parse error for campaign_update:', err);
      }
    });

    eventSource.addEventListener('ad_performance', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Ad performance:', data);
        setState(prev => ({
          ...prev,
          adPerformance: data.top_ads || [],
        }));
      } catch (err) {
        console.error('[SSE] Parse error for ad_performance:', err);
      }
    });

    eventSource.addEventListener('conversion', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Conversion:', data);
        setState(prev => ({
          ...prev,
          conversions: data.count || 0,
        }));
      } catch (err) {
        console.error('[SSE] Parse error for conversion:', err);
      }
    });
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const refresh = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    connect();
  }, [connect, disconnect]);

  return {
    ...state,
    refresh,
    connect,
    disconnect,
  };
}