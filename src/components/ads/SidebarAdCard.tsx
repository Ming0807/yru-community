"use client";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { Ad } from "@/types";
import { useCallback, useRef } from "react";

interface SidebarAdCardProps {
  ad: Ad;
}

export default function SidebarAdCard({ ad }: SidebarAdCardProps) {
  const trackedRef = useRef(false);

  const adRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || trackedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          trackAd("impression");
          trackedRef.current = true;
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(node);
  }, []);

  const trackAd = async (type: "impression" | "click") => {
    try {
      await fetch(`/api/ads/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId: ad.id, type }),
      });
    } catch {
      // fail silently
    }
  };

  const handleLinkClick = () => {
    trackAd("click");
    window.open(ad.target_url, "_blank");
  };

  return (
    <div 
      ref={adRef}
      className="relative rounded-2xl overflow-hidden border border-border/40 bg-card group cursor-pointer transition-all duration-300 hover:-translate-y-[2px] hover:border-[var(--color-yru-pink)]/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      onClick={handleLinkClick}
    >
      <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm text-white text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm">
        Sponsored
      </div>

      <div className="w-full aspect-[4/3] bg-muted relative border-b border-border/30">
        <Image
          src={ad.image_url}
          alt={ad.campaign_name}
          fill
          sizes="(max-width: 1024px) 100vw, 300px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
          <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow-md">
            {ad.campaign_name}
          </h3>
        </div>
      </div>

      <div className="p-3 bg-card flex items-center justify-between group-hover:bg-muted/30 transition-colors">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Promoted Content
        </span>
        <span className="text-sm font-bold text-[var(--color-yru-pink)] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          ดูรายละเอียด <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
