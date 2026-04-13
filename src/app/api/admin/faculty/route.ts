import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireModerator } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireModerator();
    if ('error' in auth) return auth.error;

    const supabase = auth.supabase;

    const [
      facultyUsersResult,
      facultyPostsResult,
      facultyAdsResult,
      totalUsersResult,
    ] = await Promise.all([
      getFacultyUsers(supabase),
      getFacultyPosts(supabase),
      getFacultyAdStats(supabase),
      getTotalUsers(supabase),
    ]);

    const faculties = mergeFacultyData(
      facultyUsersResult,
      facultyPostsResult,
      facultyAdsResult
    );

    const mostActiveFaculty = faculties.reduce(
      (max, f) => (f.activeUsers > max.activeUsers ? f : max),
      faculties[0] || { faculty: '-', activeUsers: 0 }
    ).faculty;

    const topConvertingFaculty = faculties.reduce(
      (max, f) => (f.adClicks > max.adClicks ? f : max),
      faculties[0] || { faculty: '-', adClicks: 0 }
    ).faculty;

    const result = {
      totalFaculties: faculties.length,
      totalUsers: totalUsersResult,
      mostActiveFaculty,
      topConvertingFaculty,
      faculties,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Faculty Analytics] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function getFacultyUsers(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from('profiles')
    .select('faculty, created_at, updated_at')
    .not('faculty', 'is', null);

  if (error) {
    console.error('[Faculty] Users error:', error);
    return [];
  }

  const facultyMap = new Map<string, { total: number; active: number }>();

  (data || []).forEach((p) => {
    const faculty = p.faculty as string;
    const existing = facultyMap.get(faculty) || { total: 0, active: 0 };
    existing.total += 1;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (new Date(p.updated_at) >= thirtyDaysAgo) {
      existing.active += 1;
    }
    facultyMap.set(faculty, existing);
  });

  return Array.from(facultyMap.entries()).map(([faculty, stats]) => ({
    faculty,
    userCount: stats.total,
    activeUsers: stats.active,
  }));
}

async function getFacultyPosts(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      author:profiles!author_id (
        faculty
      )
    `);

  if (error) {
    console.error('[Faculty] Posts error:', error);
    return [];
  }

  const facultyMap = new Map<string, number>();

  (data || []).forEach((p) => {
    const faculty = (p.author as { faculty?: string } | null)?.faculty;
    if (faculty) {
      facultyMap.set(faculty, (facultyMap.get(faculty) || 0) + 1);
    }
  });

  return Array.from(facultyMap.entries()).map(([faculty, count]) => ({
    faculty,
    postCount: count,
  }));
}

async function getFacultyAdStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: campaigns } = await supabase
    .from('ad_campaigns')
    .select(`
      target_faculties,
      final_price,
      status,
      package:ad_packages (
        tier
      )
    `)
    .in('status', ['active', 'approved', 'completed']);

  const { data: ads } = await supabase
    .from('ads')
    .select('impressions, clicks, position');

  const facultyAdMap = new Map<string, {
    impressions: number;
    clicks: number;
    revenue: number;
    campaigns: Set<string>;
    tiers: Set<string>;
  }>();

  (campaigns || []).forEach((c) => {
    const targetFaculties = c.target_faculties as string[] || [];
    const revenue = Number(c.final_price || 0);
    const tier = (c.package as { tier?: string } | null)?.tier || 'unknown';

    targetFaculties.forEach((faculty) => {
      const existing = facultyAdMap.get(faculty) || {
        impressions: 0,
        clicks: 0,
        revenue: 0,
        campaigns: new Set(),
        tiers: new Set(),
      };
      existing.revenue += revenue / (targetFaculties.length || 1);
      existing.campaigns.add(c.id);
      existing.tiers.add(tier);
      facultyAdMap.set(faculty, existing);
    });
  });

  (ads || []).forEach((ad) => {
    facultyAdMap.forEach((existing) => {
      existing.impressions += ad.impressions || 0;
      existing.clicks += ad.clicks || 0;
    });
  });

  return Array.from(facultyAdMap.entries()).map(([faculty, stats]) => ({
    faculty,
    impressions: stats.impressions,
    clicks: stats.clicks,
    revenue: stats.revenue,
    campaignCount: stats.campaigns.size,
    topTier: Array.from(stats.tiers)[0] || '-',
  }));
}

async function getTotalUsers(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[Faculty] Total users error:', error);
    return 0;
  }

  return count || 0;
}

function mergeFacultyData(
  users: Array<{ faculty: string; userCount: number; activeUsers: number }>,
  posts: Array<{ faculty: string; postCount: number }>,
  ads: Array<{ faculty: string; impressions: number; clicks: number; revenue: number }>
) {
  const facultyMap = new Map<string, FacultyStats>();

  users.forEach((u) => {
    facultyMap.set(u.faculty, {
      faculty: u.faculty,
      userCount: u.userCount,
      activeUsers: u.activeUsers,
      postCount: 0,
      engagementRate: 0,
      adImpressions: 0,
      adClicks: 0,
      adRevenue: 0,
      topInterests: [],
    });
  });

  posts.forEach((p) => {
    const existing = facultyMap.get(p.faculty);
    if (existing) {
      existing.postCount = p.postCount;
      existing.engagementRate = p.postCount / existing.userCount * 100;
    }
  });

  ads.forEach((a) => {
    const existing = facultyMap.get(a.faculty);
    if (existing) {
      existing.adImpressions = a.impressions;
      existing.adClicks = a.clicks;
      existing.adRevenue = a.revenue;
    }
  });

  return Array.from(facultyMap.values())
    .sort((a, b) => b.activeUsers - a.activeUsers);
}