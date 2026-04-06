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
      const registration = await navigator.serviceWorker.ready;
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

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.info('กรุณาอนุญาตการแจ้งเตือน');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY || undefined,
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
      console.error('Subscribe error:', error);
      toast.error('ไม่สามารถเปิดการแจ้งเตือนได้');
    }
  }, [isSupported, supabase]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
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
    }
  }, [supabase]);

  return { isSupported, isSubscribed, loading, subscribe, unsubscribe };
}

export function PushNotificationToggle() {
  const { isSupported, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported || loading) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={isSubscribed ? unsubscribe : subscribe}
      className="gap-2 text-xs"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4 text-green-500" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {isSubscribed ? 'เปิดการแจ้งเตือน' : 'ปิดการแจ้งเตือน'}
    </Button>
  );
}
