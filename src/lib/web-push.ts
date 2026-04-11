import webpush from 'web-push';
import { getAdminClient } from './supabase/admin';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = 'mailto:admin@yrucommunity.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushSubscription {
  subscription: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(
  subscriptionJson: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const subscription = JSON.parse(subscriptionJson);
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/notification-icon.png',
          badge: payload.badge || '/icons/badge-icon.png',
          data: payload.data,
        },
      })
    );
    return true;
  } catch (error: any) {
    console.error('[WebPush] Send error:', error?.message || error);
    if (error?.statusCode === 410) {
      return false;
    }
    return false;
  }
}

export async function sendPushToAllUsers(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ sent: number; failed: number }> {
  const supabase = getAdminClient();

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('subscription');

  if (error || !subscriptions) {
    console.error('[WebPush] Failed to fetch subscriptions:', error);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const success = await sendPushNotification(
      sub.subscription as string,
      { title, body, data }
    );
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

export async function insertInAppNotification(
  userId: string,
  title: string,
  message: string,
  link?: string
): Promise<boolean> {
  const supabase = getAdminClient();

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'announcement',
      title,
      message,
      link,
    });

  if (error) {
    console.error('[Notifications] Insert error:', error);
    return false;
  }

  return true;
}

export async function insertNotificationsForAllUsers(
  title: string,
  message: string,
  link?: string
): Promise<number> {
  const supabase = getAdminClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id');

  if (error || !profiles) {
    console.error('[Notifications] Failed to fetch profiles:', error);
    return 0;
  }

  const notifications = profiles.map((profile) => ({
    user_id: profile.id,
    type: 'announcement',
    title,
    message,
    link,
  }));

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (insertError) {
    console.error('[Notifications] Batch insert error:', insertError);
    return 0;
  }

  return profiles.length;
}