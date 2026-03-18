import Link from 'next/link';
import { MessageCircle, ArrowBigUp, Eye, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/utils';
import { CATEGORIES } from '@/lib/constants';
import type { Post } from '@/types';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const category = CATEGORIES.find(
    (c) => c.slug === post.category?.slug
  ) ?? post.category;

  return (
    <Link href={`/post/${post.id}`} className="block group">
      <article className="rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:border-[var(--color-yru-pink)]/30 hover:shadow-md hover:shadow-[var(--color-yru-pink)]/5 animate-fade-in-up">
        {/* Top row: Category + Anonymous + Time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {category && (
            <Badge
              variant="secondary"
              className="rounded-full text-[11px] px-2 py-0 h-5 font-normal"
            >
              {typeof category === 'object' && 'icon' in category && category.icon}{' '}
              {typeof category === 'object' && 'name' in category ? category.name : ''}
            </Badge>
          )}

          {post.is_anonymous && (
            <Badge
              variant="outline"
              className="rounded-full text-[11px] px-2 py-0 h-5 font-normal border-muted-foreground/30"
            >
              👤 ไม่ระบุตัวตน
            </Badge>
          )}

          <span className="ml-auto flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(post.created_at)}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base leading-snug group-hover:text-[var(--color-yru-pink)] transition-colors line-clamp-2">
          {post.title}
        </h3>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md bg-[var(--color-yru-green-light)] text-[var(--color-yru-green-dark)] text-[11px] px-1.5 py-0.5"
              >
                #{tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-[11px] text-muted-foreground">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bottom stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
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
    </Link>
  );
}
