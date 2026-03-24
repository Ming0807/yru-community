import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import {
  ArrowLeft,
  Eye,
  Clock,
  User,
  FileText,
  Image as ImageIcon,
  Download,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import VoteButton from '@/components/post/VoteButton';
import BookmarkButton from '@/components/post/BookmarkButton';
import ShareButton from '@/components/post/ShareButton';
import CommentSection from '@/components/post/CommentSection';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { timeAgo, formatFileSize } from '@/lib/utils';
import type { Metadata } from 'next';

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('title, content_text, attachments')
    .eq('id', id)
    .single();

  if (!post) return { title: 'ไม่พบกระทู้' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yru-community.vercel.app';
  const ogImage = post.attachments?.find((a: any) => a.type === 'image')?.url || `${siteUrl}/logo-horizontal.png`;
  const description = post.content_text?.slice(0, 160) || 'พูดคุยแลกเปลี่ยนเรื่องราวในมหาวิทยาลัยราชภัฏยะลา';

  return {
    title: `${post.title} | YRU Community`,
    description,
    openGraph: {
      title: `${post.title} | YRU Community`,
      description,
      url: `${siteUrl}/post/${id}`,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${post.title} | YRU Community`,
      description,
      images: [ogImage],
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Get post with author and category
  const { data: post } = await supabase
    .from('posts')
    .select('*, author:profiles(*), category:categories(*)')
    .eq('id', id)
    .single();

  if (!post) notFound();

  // Increment view count (fire and forget)
  supabase
    .from('posts')
    .update({ view_count: post.view_count + 1 })
    .eq('id', id)
    .then();

  // Check if user voted/bookmarked
  let hasVoted = false;
  let hasBookmarked = false;

  if (authUser) {
    const [voteResult, bookmarkResult] = await Promise.all([
      supabase
        .from('votes')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('post_id', id)
        .single(),
      supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', authUser.id)
        .eq('post_id', id)
        .single(),
    ]);
    hasVoted = !!voteResult.data;
    hasBookmarked = !!bookmarkResult.data;
  }

  // Get comments
  const { data: comments } = await supabase
    .from('comments')
    .select('*, author:profiles(*)')
    .eq('post_id', id)
    .order('created_at', { ascending: true });

  // Get current user profile
  let currentProfile = null;
  if (authUser) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();
    currentProfile = data;
  }

  // Render TipTap content as HTML (simple conversion)
  const renderContent = (content: Record<string, unknown>) => {
    if (!content || !('content' in content)) return '';

    const nodes = (content as { content?: Array<Record<string, unknown>> })
      .content;
    if (!nodes) return '';

    const rawHtml = nodes
      .map((node) => {
        if (node.type === 'paragraph') {
          const textContent = (
            node.content as Array<{ text?: string; marks?: Array<{ type: string }> }>
          )
            ?.map((child) => {
              let text = child.text ?? '';
              if (child.marks) {
                child.marks.forEach((mark) => {
                  if (mark.type === 'bold') text = `<strong>${text}</strong>`;
                  if (mark.type === 'italic') text = `<em>${text}</em>`;
                });
              }
              return text;
            })
            .join('') ?? '';
          return `<p>${textContent || '<br/>'}</p>`;
        }
        if (node.type === 'bulletList') {
          const items = (node.content as Array<Record<string, unknown>>)
            ?.map((item) => {
              const text = (
                (item.content as Array<Record<string, unknown>>)?.[0]
                  ?.content as Array<{ text?: string }>
              )
                ?.map((c) => c.text)
                .join('');
              return `<li>${text}</li>`;
            })
            .join('');
          return `<ul class="list-disc pl-5 space-y-1">${items}</ul>`;
        }
        if (node.type === 'orderedList') {
          const items = (node.content as Array<Record<string, unknown>>)
            ?.map((item) => {
              const text = (
                (item.content as Array<Record<string, unknown>>)?.[0]
                  ?.content as Array<{ text?: string }>
              )
                ?.map((c) => c.text)
                .join('');
              return `<li>${text}</li>`;
            })
            .join('');
          return `<ol class="list-decimal pl-5 space-y-1">${items}</ol>`;
        }
        return '';
      })
      .join('');
      
    return DOMPurify.sanitize(rawHtml);
  };

  const attachments = (post.attachments as Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-3xl pb-24 sm:pb-8">
        {/* Back button */}
        <div className="px-4 py-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-full gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
        </div>

        <article className="px-4 animate-fade-in-up">
          {/* Category & Meta */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            {post.category && (
              <Link href={`/category/${post.category.slug}`}>
                <Badge
                  variant="secondary"
                  className="rounded-full hover:bg-secondary/80 cursor-pointer"
                >
                  {post.category.icon} {post.category.name}
                </Badge>
              </Link>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {timeAgo(post.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {post.view_count + 1}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold leading-tight mb-4">
            {post.title}
          </h1>

import PostOptions from '@/components/post/PostOptions';

// ... (will need to add the import at the top, since I can't easily jump to line 1 and also replace line 227 without multiple commands, I will use multi_replace_file_content)

          {/* Content */}
          <div
            className="prose prose-sm max-w-none text-foreground/90 leading-relaxed mb-6"
            dangerouslySetInnerHTML={{
              __html: renderContent(post.content as Record<string, unknown>),
            }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {post.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-[var(--color-yru-green-light)] text-[var(--color-yru-green-dark)] text-xs px-2.5 py-1"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2 mb-6">
              <p className="text-sm font-medium">ไฟล์แนบ</p>
              <div className="grid gap-2">
                {attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    {att.type === 'image' ? (
                      <ImageIcon className="h-5 w-5 text-[var(--color-yru-pink)] shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-[var(--color-yru-green)] shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(att.size)}
                      </p>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <VoteButton
              postId={post.id}
              initialVoteCount={post.vote_count}
              initialHasVoted={hasVoted}
              userId={authUser?.id}
            />
            <BookmarkButton
              postId={post.id}
              initialBookmarked={hasBookmarked}
              userId={authUser?.id}
            />
            <ShareButton postId={post.id} title={post.title} />
          </div>

          <Separator className="my-6" />

          {/* Comments */}
          <CommentSection
            postId={post.id}
            initialComments={comments ?? []}
            currentUser={currentProfile}
          />
        </article>
      </main>

      <MobileNav />
    </div>
  );
}
