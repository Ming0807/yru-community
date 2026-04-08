'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Helper: wait for service worker with a timeout.
 * navigator.serviceWorker.ready never rejects — it hangs forever if no SW is registered.
 * This wrapper adds a configurable timeout to prevent infinite loading states.
 */
async function waitForServiceWorker(timeoutMs = 5000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      setLoading(false);
      return;
    }

    setIsSupported(true);
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await waitForServiceWorker(5000);
      if (!registration) {
        // Service worker not available or timed out — still show the button
        setIsSubscribed(false);
        setLoading(false);
        return;
      }
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast.error('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน');
      return;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.info('กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าเบราว์เซอร์');
        return;
      }

      const registration = await waitForServiceWorker(5000);
      if (!registration) {
        toast.error('Service Worker ยังไม่พร้อม กรุณารีเฟรชหน้าแล้วลองใหม่');
        return;
      }

      // If no VAPID key, subscribe without applicationServerKey (browser default)
      const subscribeOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
      };
      if (!VAPID_PUBLIC_KEY) {
        toast.error('ระบบแจ้งเตือนยังไม่ได้ตั้งค่า VAPID Key (ติดต่อผู้ดูแลระบบ)');
        setLoading(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save subscription to server
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          subscription: JSON.stringify(subscription),
        });
      }

      setIsSubscribed(true);
      toast.success('เปิดการแจ้งเตือนแล้ว');
    } catch (error: any) {
      console.error('[Push] Subscribe error:', error);
      if (error?.name === 'NotAllowedError') {
        toast.error('การแจ้งเตือนถูกบล็อก กรุณาเปิดในการตั้งค่าเบราว์เซอร์');
      } else {
        toast.error('ไม่สามารถเปิดการแจ้งเตือนได้');
      }
    } finally {
      setLoading(false);
    }
  }, [isSupported, supabase]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await waitForServiceWorker(5000);
      if (!registration) {
        toast.error('Service Worker ยังไม่พร้อม');
        return;
      }

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id);
        }
      }

      setIsSubscribed(false);
      toast.success('ปิดการแจ้งเตือนแล้ว');
    } catch {
      toast.error('ไม่สามารถปิดการแจ้งเตือนได้');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return { isSupported, isSubscribed, loading, subscribe, unsubscribe };
}

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="gap-2 text-xs"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4 text-green-500" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {isSubscribed ? 'ปิดการแจ้งเตือน' : 'เปิดการแจ้งเตือน'}
    </Button>
  );
}
