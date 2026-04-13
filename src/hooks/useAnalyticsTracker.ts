'use client';

import { useCallback } from 'react';
import { useAnalyticsConsent } from './useTrackingConsent';

interface TrackEventPayload {
  event_type: string;
  event_data?: Record<string, unknown>;
  page_path?: string;
  referrer?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  scroll_depth?: number;
  time_on_page?: number;
  hover_duration?: number;
  post_id?: string;
  category_id?: number;
  ad_id?: string;
  ad_impression_id?: string;
  ad_position?: string;
  ad_visibility?: string;
}

export function useAnalyticsTracker() {
  const { canTrack } = useAnalyticsConsent();

  const trackEvent = useCallback(async (payload: TrackEventPayload) => {
    if (!canTrack) {
      return;
    }

    try {
      const sessionId = getOrCreateSessionId();

      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          session_id: sessionId,
          event_timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Silently fail - analytics is non-critical
    }
  }, [canTrack]);

  return { trackEvent };
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('yru_session_id');
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('yru_session_id', sessionId);
  }
  return sessionId;
}

export function trackPageView(path: string, referrer?: string) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'page_view',
      session_id: sessionId,
      page_path: path,
      referrer: referrer || document.referrer,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      event_timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.indexOf('Firefox') > -1) return 'Firefox';
  if (ua.indexOf('SamsungBrowser') > -1) return 'Samsung Browser';
  if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
  if (ua.indexOf('Edge') > -1) return 'Edge';
  if (ua.indexOf('Edg') > -1) return 'Edge';
  if (ua.indexOf('Chrome') > -1) return 'Chrome';
  if (ua.indexOf('Safari') > -1) return 'Safari';
  return 'Other';
}

function getOS(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.indexOf('Win') > -1) return 'Windows';
  if (ua.indexOf('Mac') > -1) return 'MacOS';
  if (ua.indexOf('Linux') > -1) return 'Linux';
  if (ua.indexOf('Android') > -1) return 'Android';
  if (ua.indexOf('like Mac') > -1) return 'iOS';
  return 'Other';
}

export function trackAdImpression(adId: string, position: string) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'ad_impression',
      session_id: sessionId,
      ad_id: adId,
      ad_position: position,
      event_timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}

export function trackAdClick(adId: string, position: string) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'ad_click',
      session_id: sessionId,
      ad_id: adId,
      ad_position: position,
      event_timestamp: new Date().toISOString(),
    }),
  }).catch(() => {});
}