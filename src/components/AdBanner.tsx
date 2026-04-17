'use client';

import { useState, useEffect, useRef } from 'react';
import { Megaphone, ExternalLink } from 'lucide-react';
import { useMarketingConsent } from '@/hooks/useTrackingConsent';

interface BannerAd {
  id: string;
  campaign_name: string;
  image_url: string;
  target_url: string;
  position: string;
}

interface AdBannerProps {
  position?: 'header' | 'footer' | 'inline';
}

export default function AdBanner({ position = 'inline' }: AdBannerProps) {
  const [ad, setAd] = useState<BannerAd | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const trackedRef = useRef(false);
  const { canTrackConversion } = useMarketingConsent();

  useEffect(() => {
    const fetchBannerAd = async () => {
      try {
        const res = await fetch(`/api/ads/banner?position=${position}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ad) {
            setAd(data.ad);
          }
        }
      } catch {
        // silently fail - banner is non-critical
      } finally {
        setIsLoading(false);
      }
    };

    fetchBannerAd();
  }, [position]);

  const trackImpression = async () => {
    if (!ad || !canTrackConversion || trackedRef.current) return;
    trackedRef.current = true;

    try {
      await fetch('/api/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.id, type: 'impression' }),
      });
    } catch {
      // non-critical
    }
  };

  const trackClick = async () => {
    if (!ad || !canTrackConversion) return;

    try {
      await fetch('/api/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.id, type: 'click' }),
      });
      window.open(ad.target_url, '_blank');
    } catch {
      window.open(ad.target_url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className={`ad-banner-placeholder rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 animate-pulse ${position === 'header' ? 'h-16' : 'h-20'}`}>
        <div className="flex items-center justify-center h-full">
          <span className="text-xs text-muted-foreground/40">กำลังโหลด...</span>
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className={`rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 text-center ${position === 'header' ? 'h-16' : 'h-20'}`}>
        <p className="text-xs text-muted-foreground/60 flex items-center justify-center gap-1 h-full">
          <Megaphone className="h-3 w-3" />
          พื้นที่โฆษณา • ติดต่อลงโฆษณา
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-border/40 bg-card overflow-hidden cursor-pointer group hover:border-[var(--color-yru-pink)]/40 transition-all duration-200"
      onClick={trackClick}
    >
      <div className="flex items-center gap-3 p-2">
        <div className="w-16 h-12 rounded-lg bg-muted overflow-hidden shrink-0 relative">
          {ad.image_url ? (
            <img
              src={ad.image_url}
              alt={ad.campaign_name}
              className="w-full h-full object-cover"
              onLoad={trackImpression}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--color-yru-pink)]/10">
              <Megaphone className="h-5 w-5 text-[var(--color-yru-pink)]" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--color-yru-pink)] font-semibold uppercase tracking-wide truncate">
            {ad.campaign_name}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            Sponsored
          </p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-[var(--color-yru-pink)] shrink-0" />
      </div>
    </div>
  );
}