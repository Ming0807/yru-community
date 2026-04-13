import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
// ✅ เปลี่ยนมาใช้ sanitize-html แทน isomorphic-dompurify
import sanitizeHtml from 'sanitize-html'; 
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import TipTapLink from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Youtube from '@tiptap/extension-youtube';
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
import PostContent from '@/components/post/PostContent';
import CommentSection from '@/components/post/CommentSection';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import PostOptions from '@/components/post/PostOptions';
import ReactionButton from '@/components/post/ReactionButton';
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
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(id, display_name, avatar_url, faculty, role), category:categories!posts_category_id_fkey(id, name, slug, icon)')
    .eq('id', id)
    .single();

  if (postError || !post) {
    console.error('[PostPage] Error fetching post:', postError);
    notFound();
  }

  // Increment view count (fire and forget)
  supabase
    .from('posts')
    .update({ view_count: post.view_count + 1 })
    .eq('id', id)
    .then();

  // Check if user voted/bookmarked/reacted (run in parallel for performance)
  let hasVoted = false;
  let hasBookmarked = false;
  let initialReactionCounts: { type: string; count: number }[] = [];

  // Always fetch reaction counts (server-side = instant, no client loading state)
  const { data: reactionRows } = await supabase
    .from('post_reactions')
    .select('reaction_type')
    .eq('post_id', id);

  if (reactionRows) {
    const aggregated = reactionRows.reduce((acc: Record<string, number>, curr: any) => {
      acc[curr.reaction_type] = (acc[curr.reaction_type] || 0) + 1;
      return acc;
    }, {});
    initialReactionCounts = Object.entries(aggregated).map(([type, count]) => ({ type, count }));
  }

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
    .select('*, author:profiles!comments_author_id_fkey(*)')
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

  const editorExtensions = [
    StarterKit.configure({
      link: false,
      underline: false,
    }),
    TipTapLink.configure({
      HTMLAttributes: {
        class: 'text-(--color-yru-pink) underline cursor-pointer',
      },
    }),
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    TextStyle,
    Color,
    Youtube.configure({
      HTMLAttributes: {
        class: 'w-full aspect-video rounded-lg mt-4 mb-4',
      },
    }),
  ];

  // Render TipTap content as HTML safely
  const renderContent = (content: Record<string, unknown>) => {
    if (!content || !('content' in content)) return '';
    try {
      const rawHtml = generateHTML(content, editorExtensions);
      
      // ✅ ใช้ sanitize-html และตั้งค่าอนุญาต tag/attribute ที่จำเป็นสำหรับ Tiptap
      return sanitizeHtml(rawHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          'iframe', 'img', 'u', 's', 'h1', 'h2', 'h3'
        ]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          '*': ['style', 'class'],
          'iframe': ['src', 'width', 'height', 'allowfullscreen', 'frameborder', 'allow'],
          'a': ['href', 'target', 'rel']
        }
      });
    } catch (e) {
      console.error('Error generating HTML from formatting', e);
      return '';
    }
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

          {/* Title & Options */}
          <div className="flex justify-between items-start gap-4 mb-4">
            <h1 className="text-2xl font-bold leading-tight">
              {post.title}
            </h1>
            <PostOptions 
              postId={post.id} 
              authorId={post.author?.id ?? ''} 
              currentUserId={authUser?.id}
              isAdmin={currentProfile?.role === 'admin'}
              isPinned={post.is_pinned}
            />
          </div>

          {/* Content */}
          <PostContent html={renderContent(post.content as Record<string, unknown>)} />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {post.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-(--color-yru-green-light) text-(--color-yru-green-dark) text-xs px-2.5 py-1"
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
            <ReactionButton postId={post.id} userId={authUser?.id} initialCounts={initialReactionCounts} />
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