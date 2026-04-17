'use client';

import Image from 'next/image';
import { Megaphone, ExternalLink } from 'lucide-react';
import type { Ad } from '@/types';
import { useCallback, useRef, useState, useEffect } from 'react';
import { useMarketingConsent } from '@/hooks/useTrackingConsent';

interface FeedAdCardProps {
  ad: Ad;
  onCapped?: () => void;
}

interface ViewabilityState {
  viewable: boolean;
  viewStartTime: number | null;
  totalViewTime: number;
  viewabilityScore: number;
}

export default function FeedAdCard({ ad, onCapped }: FeedAdCardProps) {
  const trackedRef = useRef(false);
  const impressionTrackedRef = useRef(false);
  const viewabilityRef = useRef<ViewabilityState>({
    viewable: false,
    viewStartTime: null,
    totalViewTime: 0,
    viewabilityScore: 0,
  });
  const [isCapped, setIsCapped] = useState(false);
  const { canTrackConversion } = useMarketingConsent();
  const adRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || impressionTrackedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          viewabilityRef.current.viewStartTime = Date.now();
          viewabilityRef.current.viewable = true;
        } else {
          if (viewabilityRef.current.viewStartTime) {
            viewabilityRef.current.totalViewTime += Date.now() - viewabilityRef.current.viewStartTime;
            viewabilityRef.current.viewStartTime = null;
          }
          viewabilityRef.current.viewable = false;
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canTrackConversion || !ad.id) return;

    const checkFrequency = async () => {
      try {
        const res = await fetch(`/api/ads/track?ad_id=${ad.id}&user_id=anonymous`, {
          method: 'GET',
        });
        const data = await res.json();
        if (data.capped) {
          setIsCapped(true);
          onCapped?.();
        }
      } catch {
        // frequency check failed, show ad anyway
      }
    };

    checkFrequency();
  }, [ad.id, canTrackConversion, onCapped]);

  const sendViewabilityData = useCallback(() => {
    if (viewabilityRef.current.viewStartTime) {
      viewabilityRef.current.totalViewTime += Date.now() - viewabilityRef.current.viewStartTime;
      viewabilityRef.current.viewStartTime = null;
    }

    const totalTime = viewabilityRef.current.totalViewTime;
    const viewable = viewabilityRef.current.viewable;
    const inViewDurationMs = totalTime;
    const viewabilityScore = totalTime >= 1000 ? 100 : (totalTime / 10);

    if (totalTime > 0 || viewable) {
      const body = {
        adId: ad.id,
        type: 'impression',
        viewable: totalTime >= 1000,
        viewability_score: Math.min(100, viewabilityScore),
        in_view_duration_ms: inViewDurationMs,
      };

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/ads/track', JSON.stringify(body));
      } else {
        fetch('/api/ads/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => {});
      }
    }
  }, [ad.id]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendViewabilityData();
      }
    };

    const handleBeforeUnload = () => {
      sendViewabilityData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendViewabilityData();
    };
  }, [sendViewabilityData]);

  const trackAd = useCallback(async (type: 'impression' | 'click') => {
    if (!canTrackConversion || trackedRef.current) return;
    trackedRef.current = true;

    const body: Record<string, unknown> = { adId: ad.id, type };

    if (type === 'click') {
      const totalTime = viewabilityRef.current.totalViewTime;
      if (viewabilityRef.current.viewStartTime) {
        viewabilityRef.current.totalViewTime += Date.now() - viewabilityRef.current.viewStartTime;
      }
      body.viewable = totalTime >= 1000;
      body.viewability_score = totalTime >= 1000 ? 100 : (totalTime / 10);
      body.in_view_duration_ms = totalTime;
    }

try {
    if (type === 'click') {
      const response = await fetch('/api/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      sendViewabilityData();
      if (response.ok) {
        window.open(ad.target_url, '_blank');
      }
    } else {
        fetch('/api/ads/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => {});
        impressionTrackedRef.current = true;
      }
    } catch {
      trackedRef.current = false;
    }
  }, [ad.id, ad.target_url, canTrackConversion, sendViewabilityData]);

  if (isCapped) {
    return null;
  }

  return (
    <article
      ref={adRef}
      className="bg-card rounded-2xl overflow-hidden border border-border/40 transition-all duration-300 hover:-translate-y-[2px] hover:border-[var(--color-yru-pink)]/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer relative group flex flex-col sm:flex-row gap-4"
      onClick={() => trackAd('click')}
    >
      <div className="w-full sm:w-1/3 h-40 sm:h-auto bg-muted flex items-center justify-center overflow-hidden shrink-0 border-r border-border/30 relative">
        <Image
          src={ad.image_url}
          alt={ad.campaign_name}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
          <Megaphone className="h-3 w-3" /> Sponsored
        </div>
      </div>

      <div className="p-4 sm:pl-0 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-xs text-[var(--color-yru-pink)] font-semibold mb-1 uppercase tracking-wide">Promoted</div>
          <h3 className="text-base font-semibold mb-1 leading-tight text-foreground group-hover:text-[var(--color-yru-pink)] transition-colors">
            {ad.campaign_name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            กดเพื่อดูรายละเอียดโปรโมชั่นและข้อเสนอพิเศษจากสปอนเซอร์ได้เลย!
          </p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 group-hover:text-foreground transition-colors">
            <ExternalLink className="h-3 w-3" /> Visit Website
          </span>
        </div>
      </div>
    </article>
  );
}