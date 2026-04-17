'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAnalyticsConsent } from './useTrackingConsent';
import { usePathname } from 'next/navigation';

interface TrackEventPayload {
  event_id?: string;
  event_type: string;
  event_data?: Record<string, unknown>;
  session_id?: string;
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
  event_timestamp?: string;
}

const EVENT_QUEUE: TrackEventPayload[] = [];
const FLUSH_INTERVAL = 5000;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('yru_session_id');
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('yru_session_id', sessionId);
  }
  return sessionId;
}

function generateEventId(): string {
  return `e_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
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

async function flushEventQueue() {
  if (EVENT_QUEUE.length === 0) return;

  const eventsToSend = [...EVENT_QUEUE];
  EVENT_QUEUE.length = 0;

  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: eventsToSend, batch: true }),
    });
  } catch {
    EVENT_QUEUE.push(...eventsToSend);
  }
}

function startFlushTimer() {
  if (typeof window === 'undefined') return;
  const existingTimer = (window as unknown as { __analyticsFlushTimer?: ReturnType<typeof setInterval> }).__analyticsFlushTimer;
  if (existingTimer) return;

  const timer = setInterval(flushEventQueue, FLUSH_INTERVAL);
  (window as unknown as { __analyticsFlushTimer: typeof timer }).__analyticsFlushTimer = timer;

  window.addEventListener('beforeunload', () => {
    flushEventQueue();
    clearInterval(timer);
  });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEventQueue();
    }
  });
}

export function useAnalyticsTracker() {
  const { canTrack } = useAnalyticsConsent();

  const trackEvent = useCallback((payload: TrackEventPayload) => {
    if (!canTrack || typeof window === 'undefined') {
      return;
    }

    const sessionId = getOrCreateSessionId();
    const eventId = generateEventId();

    EVENT_QUEUE.push({
      ...payload,
      event_id: eventId,
      session_id: sessionId,
      event_timestamp: new Date().toISOString(),
    });

    startFlushTimer();
  }, [canTrack]);

  return { trackEvent, flushQueue: flushEventQueue };
}

export function usePageViewTracker() {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const scrollDepthsTracked = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!pathname) return;

    const timeOnPage = Math.floor((Date.now() - startTimeRef.current) / 1000);

    if (previousPathRef.current && previousPathRef.current !== pathname) {
      const sessionId = getOrCreateSessionId();

      EVENT_QUEUE.push({
        event_id: generateEventId(),
        event_type: 'page_view_end',
        page_path: previousPathRef.current,
        time_on_page: timeOnPage,
        session_id: sessionId,
        event_timestamp: new Date().toISOString(),
      });

      EVENT_QUEUE.push({
        event_id: generateEventId(),
        event_type: 'page_view',
        page_path: pathname,
        referrer: previousPathRef.current,
        device_type: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        session_id: sessionId,
        event_timestamp: new Date().toISOString(),
      });

      startFlushTimer();
    }

    previousPathRef.current = pathname;
    startTimeRef.current = Date.now();
    scrollDepthsTracked.current.clear();
  }, [pathname]);

  const trackScrollDepth = useCallback((depth: number) => {
    if (typeof window === 'undefined') return;
    const milestones = [25, 50, 75, 100];
    const reachedMilestone = milestones.find(m => depth >= m && !scrollDepthsTracked.current.has(m));

    if (reachedMilestone) {
      scrollDepthsTracked.current.add(reachedMilestone);
      const sessionId = getOrCreateSessionId();
      EVENT_QUEUE.push({
        event_id: generateEventId(),
        event_type: 'scroll_depth',
        scroll_depth: reachedMilestone,
        page_path: pathname || window.location.pathname,
        session_id: sessionId,
        event_timestamp: new Date().toISOString(),
      });
      startFlushTimer();
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
      trackScrollDepth(scrollPercent);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackScrollDepth]);
}

export function trackPageView(path: string, referrer?: string) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();

  EVENT_QUEUE.push({
    event_id: generateEventId(),
    event_type: 'page_view',
    session_id: sessionId,
    page_path: path,
    referrer: referrer || document.referrer,
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    event_timestamp: new Date().toISOString(),
  });

  startFlushTimer();
}

export function trackAdImpression(adId: string, position: string) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();

  EVENT_QUEUE.push({
    event_id: generateEventId(),
    event_type: 'ad_impression',
    session_id: sessionId,
    ad_id: adId,
    ad_position: position,
    event_timestamp: new Date().toISOString(),
  });

  startFlushTimer();
}

export function trackAdClick(adId: string, position: string) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();

  EVENT_QUEUE.push({
    event_id: generateEventId(),
    event_type: 'ad_click',
    session_id: sessionId,
    ad_id: adId,
    ad_position: position,
    event_timestamp: new Date().toISOString(),
  });

  startFlushTimer();
}

export async function linkSessionToUser(userId: string) {
  if (typeof window === 'undefined') return;

  const sessionId = sessionStorage.getItem('yru_session_id');
  if (!sessionId) return;

  try {
    await fetch('/api/analytics/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, user_id: userId }),
    });
  } catch (err) {
    console.warn('[Analytics] Session link failed:', err);
  }
}

export function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('yru_session_id');
}

export function trackFormSubmit(formId: string, formName: string, formType?: string) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();

  EVENT_QUEUE.push({
    event_id: generateEventId(),
    event_type: 'form_submit',
    session_id: sessionId,
    page_path: window.location.pathname,
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    event_data: { form_id: formId, form_name: formName, form_type: formType },
    event_timestamp: new Date().toISOString(),
  });

  startFlushTimer();
}

export function trackVideoView(
  videoId: string,
  videoTitle: string,
  durationWatched: number,
  totalDuration: number
) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();
  const progressPercent = totalDuration > 0 ? Math.round((durationWatched / totalDuration) * 100) : 0;

  EVENT_QUEUE.push({
    event_id: generateEventId(),
    event_type: 'video_view',
    session_id: sessionId,
    page_path: window.location.pathname,
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    event_data: {
      video_id: videoId,
      video_title: videoTitle,
      duration_watched: durationWatched,
      total_duration: totalDuration,
      progress_percent: progressPercent
    },
    event_timestamp: new Date().toISOString(),
  });

  startFlushTimer();
}

export function trackShare(contentType: string, contentId: string, shareMethod: string) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();

  EVENT_QUEUE.push({
    event_id: generateEventId(),
    event_type: 'share',
    session_id: sessionId,
    page_path: window.location.pathname,
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    event_data: { content_type: contentType, content_id: contentId, share_method: shareMethod },
    event_timestamp: new Date().toISOString(),
  });

  startFlushTimer();
}

export function trackDownload(fileId: string, fileName: string, fileType: string, fileSize?: number) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();

  EVENT_QUEUE.push({
    event_id: generateEventId(),
    event_type: 'download',
    session_id: sessionId,
    page_path: window.location.pathname,
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    event_data: { file_id: fileId, file_name: fileName, file_type: fileType, file_size: fileSize },
    event_timestamp: new Date().toISOString(),
  });

  startFlushTimer();
}

export function trackSearch(searchQuery: string, resultsCount?: number) {
  if (typeof window === 'undefined') return;

  const sessionId = getOrCreateSessionId();

  EVENT_QUEUE.push({
    event_id: generateEventId(),
    event_type: 'search',
    session_id: sessionId,
    page_path: window.location.pathname,
    device_type: getDeviceType(),
    browser: getBrowser(),
    os: getOS(),
    event_data: { search_query: searchQuery, results_count: resultsCount },
    event_timestamp: new Date().toISOString(),
  });

  startFlushTimer();
}