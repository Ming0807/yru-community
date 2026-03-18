import Link from 'next/link';
import { ArrowBigUp, MessageCircle, TrendingUp, ExternalLink, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES } from '@/lib/constants';

// Revalidate this component periodically or let Next.js handle it
export const revalidate = 3600; // 1 hour

export default async function RightSidebar() {
  const supabase = await createClient();

  // Fetch top 5 trending posts (most votes/comments in the last 7 days)
  // Since we don't have a complex algorithm yet, we'll sort by vote_count descending
  // ideally we filter by created_at >= now() - interval '7 days'
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: trendingPosts } = await supabase
    .from('posts')
    .select('id, title, vote_count, comment_count, created_at, category_id')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('vote_count', { ascending: false })
    .limit(5);

  return (
    <aside className="hidden lg:block w-[320px] shrink-0 space-y-6 sticky top-20 h-max">
      {/* Trending Block */}
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs">
        <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
          <TrendingUp className="h-4 w-4 text-[var(--color-yru-pink)]" />
          กำลังมาแรงในสัปดาห์นี้
        </h3>

        <div className="space-y-4">
          {trendingPosts && trendingPosts.length > 0 ? (
            trendingPosts.map((post, idx) => {
              const category = CATEGORIES.find((c) => c.slug === CATEGORIES[post.category_id - 1]?.slug) || CATEGORIES[0];
              return (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="group block space-y-1.5"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-bold text-muted-foreground/50 w-4 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium leading-snug group-hover:text-[var(--color-yru-pink)] transition-colors line-clamp-2">
                        {post.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <ArrowBigUp className="h-3 w-3" />
                          {post.vote_count}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MessageCircle className="h-3 w-3" />
                          {post.comment_count}
                        </span>
                        <span>{timeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              ยังไม่มีกระทู้มาแรง
            </p>
          )}
        </div>
      </div>

      {/* Rules & Links Block */}
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-xs text-sm">
        <h3 className="flex items-center gap-2 font-semibold text-foreground mb-3">
          <ShieldCheck className="h-4 w-4 text-[var(--color-yru-green-dark)]" />
          กฎระเบียบชุมชน
        </h3>
        <ul className="space-y-2 text-muted-foreground mb-4 list-disc pl-4 marker:text-muted-foreground/40">
          <li>สุภาพและให้เกียรติผู้อื่นเสมอ</li>
          <li>ห้ามโพสต์เนื้อหาที่ผิดกฎหมาย หรือละเมิดลิขสิทธิ์</li>
          <li>ห้ามสแปม หรือตั้งกระทู้ซ้ำซ้อน</li>
          <li>การซื้อขายให้ระบุรายละเอียดให้ชัดเจน</li>
        </ul>

        <div className="pt-4 border-t border-border/60 space-y-3">
          <a
            href="https://yru.ac.th/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>เว็บไซต์มหาวิทยาลัย</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a
            href="https://eduservice.yru.ac.th/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>กองบริการการศึกษา (ลงทะเบียน)</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Footer Links */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground/70 px-2">
        <Link href="/about" className="hover:underline">เกี่ยวกับเรา</Link>
        <Link href="/privacy" className="hover:underline">นโยบายความเป็นส่วนตัว</Link>
        <Link href="/terms" className="hover:underline">ข้อตกลงการใช้งาน</Link>
        <div className="w-full mt-2">© {new Date().getFullYear()} YRU Community. All rights reserved.</div>
      </div>
    </aside>
  );
}
