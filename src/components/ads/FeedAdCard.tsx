import Image from 'next/image';
import { Megaphone, ExternalLink } from 'lucide-react';
import type { Ad } from '@/types';
import { useCallback, useEffect, useRef } from 'react';

interface FeedAdCardProps {
  ad: Ad;
}

export default function FeedAdCard({ ad }: FeedAdCardProps) {
  const trackedRef = useRef(false);

  // Intersection Observer to track impressions when ad enters viewport
  const adRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || trackedRef.current) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        trackAd('impression');
        trackedRef.current = true;
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    
    observer.observe(node);
  }, []);

  const trackAd = async (type: 'impression' | 'click') => {
    try {
      await fetch(`/api/ads/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: ad.id, type })
      });
    } catch {
      // fail silently
    }
  };

  const handleLinkClick = () => {
    trackAd('click');
    window.open(ad.target_url, '_blank');
  };

  return (
    <article 
      ref={adRef}
      className="bg-card rounded-xl overflow-hidden shadow-sm border border-border/50 hover:border-border transition-colors cursor-pointer relative group flex flex-col sm:flex-row gap-4"
      onClick={handleLinkClick}
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
