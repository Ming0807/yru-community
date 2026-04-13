'use client';

import { useCookieConsent } from './useCookieConsent';

/**
 * Hook to check if analytics tracking is allowed
 * Use this before sending any analytics events
 */
export function useAnalyticsConsent() {
  const { preferences, hasConsent } = useCookieConsent();
  return {
    canTrack: preferences.analytics,
    hasUserConsented: hasConsent,
  };
}

/**
 * Hook to check if marketing/ad tracking is allowed
 * Use this before serving personalized ads
 */
export function useMarketingConsent() {
  const { preferences, hasConsent } = useCookieConsent();
  return {
    canServeAds: preferences.marketing,
    canTrackConversion: preferences.marketing,
    hasUserConsented: hasConsent,
  };
}

/**
 * Example usage in a tracking function:
 *
 * ```typescript
 * import { useAnalyticsConsent } from '@/hooks/useTrackingConsent';
 *
 * function trackPageView(page: string) {
 *   const { canTrack } = useAnalyticsConsent();
 *
 *   if (!canTrack) {
 *     console.log('[Analytics] Consent not granted, skipping');
 *     return;
 *   }
 *
 *   // Send to analytics service
 *   analytics.trackPageView(page);
 * }
 * ```
 *
 * Example usage in ad serving:
 *
 * ```typescript
 * import { useMarketingConsent } from '@/hooks/useTrackingConsent';
 *
 * function AdComponent() {
 *   const { canServeAds } = useMarketingConsent();
 *
 *   if (!canServeAds) {
 *     return <PublicServiceAd />; // Non-targeted ad
 *   }
 *
 *   return <TargetedAd />; // Faculty-targeted ad
 * }
 * ```
 */

/**
 * For integration with TanStack Query or other data fetching:
 *
 * Create a wrapper that checks consent before fetching:
 *
 * ```typescript
 * function useAnalyticsQuery(options: QueryOptions) {
 *   const { canTrack } = useAnalyticsConsent();
 *
 *   return useQuery({
 *     ...options,
 *     enabled: options.enabled && canTrack,
 *   });
 * }
 * ```
 */

/**
 * For cookie-based third-party scripts (Google Analytics, etc.):
 *
 * Load scripts only when consent is given:
 *
 * ```typescript
 * useEffect(() => {
 *   if (!preferences.analytics) return;
 *
 *   // Load analytics script
 *   const script = document.createElement('script');
 *   script.src = 'https://analytics.example.com/script.js';
 *   script.async = true;
 *   document.head.appendChild(script);
 *
 *   return () => {
 *     document.head.removeChild(script);
 *   };
 * }, [preferences.analytics]);
 * ```
 */