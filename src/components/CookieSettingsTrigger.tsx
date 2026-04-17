'use client';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import Link from 'next/link';

export function CookieSettingsTrigger() {
  const { openSettings } = useCookieConsent();

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        openSettings();
      }}
      className="hover:underline text-xs text-muted-foreground/70 hover:text-muted-foreground"
    >
      ตั้งค่าคุกกี้
    </button>
  );
}