import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, MessageSquare, Heart, AtSign, Bell, Trash2, ExternalLink } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

const typeConfig: Record<string, { icon: any; color: string; text: string }> = {
  COMMENT: { icon: MessageSquare, color: 'text-blue-500', text: 'แสดงความคิดเห็นในกระทู้' },
  REPLY: { icon: MessageSquare, color: 'text-green-500', text: 'ตอบกลับความคิดเห็นของคุณใน' },
  FOLLOW: { icon: User, color: 'text-purple-500', text: 'เริ่มติดตามคุณ' },
  REACTION: { icon: Heart, color: 'text-red-500', text: 'รีแอคกระทู้ของคุณ' },
  MENTION: { icon: AtSign, color: 'text-[var(--color-yru-pink)]', text: 'กล่าวถึงคุณใน' },
  SYSTEM: { icon: Bell, color: 'text-amber-500', text: '' },
};

const reactionEmojis: Record<string, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  HAHA: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😡',
};

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    is_read: boolean;
    created_at: string;
    metadata?: Record<string, any>;
    actor?: {
      id: string;
      display_name: string;
      avatar_url: string | null;
    };
    post?: {
      id: string;
      title: string;
    };
    comment_id?: string | null;
    post_id?: string | null;
  };
  onMarkAsRead: () => void;
  onDelete: () => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const config = typeConfig[notification.type] || typeConfig.SYSTEM;
  const Icon = config.icon;

  const getLink = () => {
    if (notification.post_id) return `/post/${notification.post_id}`;
    if (notification.actor?.id) return `/profile/${notification.actor.id}`;
    return '/notifications';
  };

  return (
    <div
      className={`group relative flex gap-3 rounded-xl p-3 transition-colors ${
        notification.is_read
          ? 'bg-transparent hover:bg-muted/40'
          : 'bg-muted/60 hover:bg-muted/80'
      }`}
      onClick={onMarkAsRead}
    >
      {!notification.is_read && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[var(--color-yru-pink)]" />
      )}

      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage
          src={notification.actor?.avatar_url ?? undefined}
          alt={notification.actor?.display_name}
        />
        <AvatarFallback className="bg-gradient-to-br from-[var(--color-yru-pink-light)] to-[var(--color-yru-green-light)] text-xs">
          {notification.actor?.display_name?.charAt(0) ?? '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
              <p className="text-sm">
                <Link
                  href={`/profile/${notification.actor?.id}`}
                  className="font-semibold hover:text-[var(--color-yru-pink)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {notification.actor?.display_name ?? 'ผู้ใช้'}
                </Link>
                <span className="text-muted-foreground"> {config.text}</span>
                {notification.type === 'REACTION' && notification.metadata?.reaction_type && (
                  <span className="ml-0.5">
                    {reactionEmojis[notification.metadata.reaction_type] || '👍'}
                  </span>
                )}
              </p>
            </div>

            {notification.post && (
              <Link
                href={getLink()}
                className="mt-0.5 block text-sm font-medium text-[var(--color-yru-pink)] hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {notification.post.title}
              </Link>
            )}

            <span className="mt-0.5 block text-xs text-muted-foreground">
              {timeAgo(notification.created_at)}
            </span>
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {notification.post_id && (
              <Link
                href={getLink()}
                className="p-1.5 rounded-full hover:bg-muted"
                onClick={(e) => e.stopPropagation()}
                title="ดูโพสต์"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
