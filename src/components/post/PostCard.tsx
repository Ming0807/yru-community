'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, ArrowBigUp, Eye, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/utils';
import { CATEGORIES } from '@/lib/constants';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const category = CATEGORIES.find(
    (c) => c.slug === post.category?.slug
  ) ?? post.category;

  const handleNavigate = () => {
    router.push(`/post/${post.id}`);
  };

  return (
    <article 
      onClick={handleNavigate}
      className="cursor-pointer rounded-2xl border border-border/40 bg-card p-5 transition-all duration-300 hover:-translate-y-[2px] hover:border-[var(--color-yru-pink)]/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-fade-in-up group block"
    >
      {/* Top row: Author / Category / Time */}
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground mb-3">
        {post.is_anonymous ? (
          <div className="flex items-center gap-1.5 font-medium text-foreground py-0.5">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">👤</div>
            <span>ไม่ระบุตัวตน</span>
          </div>
        ) : post.author ? (
          <div className="flex items-center gap-1.5 font-medium text-foreground py-0.5">
            {post.author.avatar_url ? (
              <img src={post.author.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover border border-border/50" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)] flex items-center justify-center text-[10px] font-bold">
                {post.author.display_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span>{post.author.display_name || 'สมาชิก'}</span>
          </div>
        ) : null}

        <span className="text-muted-foreground/30">•</span>

        {category && (
          <Badge
            variant="secondary"
            className="rounded-full text-[10px] px-2 py-0 h-4.5 font-medium bg-muted/50 hover:bg-muted text-muted-foreground border-none"
          >
            {typeof category === 'object' && 'icon' in category && <span className="mr-1">{category.icon}</span>}
            {typeof category === 'object' && 'name' in category ? category.name : ''}
          </Badge>
        )}

        <span className="ml-auto flex items-center gap-1.5 opacity-70">
          <Clock className="h-3 w-3" />
          {timeAgo(post.created_at)}
        </span>
      </div>

      {/* Title and Thumbnail */}
      <div className="flex gap-4 items-start mt-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg leading-snug text-card-foreground group-hover:text-[var(--color-yru-pink)] transition-colors line-clamp-2">
            {post.title}
          </h3>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {post.tags.slice(0, 3).map((tag) => (
                <Link
                  key={tag}
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center rounded-md bg-[var(--color-yru-green)]/10 text-[var(--color-yru-green-dark)] text-[11px] px-2 py-0.5 hover:bg-[var(--color-yru-green)] hover:text-white transition-all font-medium"
                  title={`ค้นหา #${tag}`}
                >
                  #{tag}
                </Link>
              ))}
              {post.tags.length > 3 && (
                <span className="text-[11px] text-muted-foreground font-medium px-1 flex items-center">
                  +{post.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Thumbnail */}
        {post.attachments && post.attachments.some(a => a.type === 'image') && (
          <div className="shrink-0 group-hover:opacity-90 transition-opacity">
            <img
              src={post.attachments.find(a => a.type === 'image')?.url}
              alt=""
              className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-border/60 shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Bottom stats */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1">
            <ArrowBigUp className="h-4 w-4" />
            {post.vote_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {post.comment_count}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Eye className="h-3.5 w-3.5" />
            {post.view_count}
          </span>
        </div>
      </article>
  );
}
