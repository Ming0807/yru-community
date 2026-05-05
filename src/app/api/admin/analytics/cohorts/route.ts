import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const adminClient = getAdminClient();
    const { searchParams } = new URL(request.url);

    const cohortType = searchParams.get('type') || 'weekly'; // weekly, monthly, daily
    const weeks = parseInt(searchParams.get('weeks') || '8', 10);
    const compare = searchParams.get('compare') === 'true';

// Calculate date range
  const endDate = new Date();
  const startDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);

  // Optimized: Single query to get all user cohort assignments and post counts
  // Using window functions to avoid N+1 queries
  const { data: cohortUsers, error } = await adminClient
    .from('profiles')
    .select(`
      id,
      created_at
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching cohorts:', error);
    return NextResponse.json({ error: 'Failed to fetch cohorts' }, { status: 500 });
  }

  // Get all post activity in one query
  const { data: allPostActivity } = await adminClient
    .from('posts')
    .select('author_id, created_at');

  // Group users by cohort
  const cohortMap: Record<string, {
    date: string;
    users: string[];
    weeklyActivity: number[];
  }> = {};

  for (const user of cohortUsers || []) {
    const createdDate = new Date(user.created_at);
    let cohortKey: string;

    if (cohortType === 'daily') {
      cohortKey = createdDate.toISOString().split('T')[0];
    } else if (cohortType === 'monthly') {
      cohortKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
    } else {
      // Weekly - get the start of the week (Monday)
      const dayOfWeek = createdDate.getDay();
      const weekStart = new Date(createdDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      cohortKey = weekStart.toISOString().split('T')[0];
    }

    if (!cohortMap[cohortKey]) {
      cohortMap[cohortKey] = { date: cohortKey, users: [], weeklyActivity: Array(weeks).fill(0) };
    }
    cohortMap[cohortKey].users.push(user.id);
  }

  // Count active users per week per cohort using JS (still much faster than N+1 queries)
  const weekStarts = Object.keys(cohortMap).sort();

  for (const weekStart of weekStarts) {
    const cohort = cohortMap[weekStart];
    const cohortStart = new Date(weekStart);
    const cohortUserIds = new Set(cohort.users);

    for (let w = 0; w < weeks; w++) {
      const weekStartDate = new Date(cohortStart.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const weekEndDate = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Count unique users who posted in this week (from pre-fetched data)
      const activeUsersInWeek = new Set(
        (allPostActivity || [])
          .filter(p => {
            const postDate = new Date(p.created_at);
            return cohortUserIds.has(p.author_id) &&
                   postDate >= weekStartDate &&
                   postDate < weekEndDate;
          })
          .map(p => p.author_id)
      );

      cohort.weeklyActivity[w] = activeUsersInWeek.size;
    }
  }

    // Format cohort data for response
    const retentionData = weekStarts.map(weekStart => {
      const cohort = cohortMap[weekStart];
      const initialUsers = cohort.users.length;
      
      // Calculate retention percentages
      const retention = cohort.weeklyActivity.map((activity, i) => {
        if (i === 0) return 100; // Week 0 is always 100%
        return initialUsers > 0 ? Math.round((activity / initialUsers) * 10000) / 100 : 0;
      });

      const avgRetention = retention.slice(1).reduce((a, b) => a + b, 0) / Math.max(retention.length - 1, 1);

      return {
        cohort_name: formatCohortName(weekStart, cohortType),
        cohort_date: weekStart,
        size: initialUsers,
        retention,
        avg_retention: Math.round(avgRetention * 100) / 100,
      };
    });

// Calculate summary statistics
  const summary = {
    total_cohorts: retentionData.length,
    avg_week_1_retention: retentionData.length > 0
      ? Math.round(retentionData.reduce((sum, c) => sum + (c.retention[1] || 0), 0) / retentionData.length * 100) / 100
      : 0,
    avg_week_4_retention: retentionData.length > 0
      ? Math.round(retentionData.reduce((sum, c) => sum + (c.retention[4] || c.retention[c.retention.length - 1] || 0), 0) / retentionData.length * 100) / 100
      : 0,
    best_cohort: retentionData.length > 0
      ? retentionData.reduce((best, c) => c.avg_retention > best.avg_retention ? c : best, retentionData[0]).cohort_name
      : null,
    worst_cohort: retentionData.length > 0
      ? retentionData.reduce((worst, c) => c.avg_retention < worst.avg_retention ? c : worst, retentionData[0]).cohort_name
      : null,
  };

  const response: Record<string, unknown> = {
    cohort_type: cohortType,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    data: retentionData,
    summary,
  };

  if (compare) {
    const prevEndDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    const prevStartDate = new Date(prevEndDate.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);

    const { data: prevUsers } = await adminClient
      .from('profiles')
      .select('id, created_at')
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString())
      .order('created_at', { ascending: true });

    const prevCohortMap: Record<string, { users: string[]; weeklyActivity: number[] }> = {};

    for (const u of prevUsers || []) {
      const createdDate = new Date(u.created_at);
      let cohortKey: string;
      if (cohortType === 'daily') {
        cohortKey = createdDate.toISOString().split('T')[0];
      } else if (cohortType === 'monthly') {
        cohortKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
      } else {
        const dayOfWeek = createdDate.getDay();
        const weekStart = new Date(createdDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        cohortKey = weekStart.toISOString().split('T')[0];
      }
      if (!prevCohortMap[cohortKey]) {
        prevCohortMap[cohortKey] = { users: [], weeklyActivity: Array(weeks).fill(0) };
      }
      prevCohortMap[cohortKey].users.push(u.id);
    }

    for (const weekStart of Object.keys(prevCohortMap)) {
      const cohort = prevCohortMap[weekStart];
      const cohortStart = new Date(weekStart);
      const cohortUserIds = new Set(cohort.users);

      for (let w = 0; w < weeks; w++) {
        const weekStartDate = new Date(cohortStart.getTime() + w * 7 * 24 * 60 * 60 * 1000);
        const weekEndDate = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        const activeUsersInWeek = new Set(
          (allPostActivity || [])
            .filter(p => {
              const postDate = new Date(p.created_at);
              return cohortUserIds.has(p.author_id) &&
                postDate >= weekStartDate &&
                postDate < weekEndDate;
            })
            .map(p => p.author_id)
        );
        cohort.weeklyActivity[w] = activeUsersInWeek.size;
      }
    }

    const prevCohortList = Object.keys(prevCohortMap).map(weekStart => {
      const cohort = prevCohortMap[weekStart];
      const initialUsers = cohort.users.length;
      const retention = cohort.weeklyActivity.map((activity, i) => {
        if (i === 0) return 100;
        return initialUsers > 0 ? Math.round((activity / initialUsers) * 10000) / 100 : 0;
      });
      return { cohort_date: weekStart, size: initialUsers, retention };
    });

    const prevSummary = {
      total_cohorts: prevCohortList.length,
      avg_week_1_retention: prevCohortList.length > 0
        ? Math.round(prevCohortList.reduce((sum, c) => sum + (c.retention[1] || 0), 0) / prevCohortList.length * 100) / 100
        : 0,
      avg_week_4_retention: prevCohortList.length > 0
        ? Math.round(prevCohortList.reduce((sum, c) => sum + (c.retention[4] || c.retention[c.retention.length - 1] || 0), 0) / prevCohortList.length * 100) / 100
        : 0,
    };

    const changes = {
      avg_week_1_retention_change: summary.avg_week_1_retention - prevSummary.avg_week_1_retention,
      avg_week_4_retention_change: summary.avg_week_4_retention - prevSummary.avg_week_4_retention,
    };

    response.previous_period = {
      start_date: prevStartDate.toISOString(),
      end_date: prevEndDate.toISOString(),
      data: prevCohortList,
      summary: prevSummary,
    };
    response.comparison = {
      changes,
    };
  }

  return NextResponse.json(response);
  } catch (error) {
    console.error('Cohorts API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatCohortName(dateStr: string, type: string): string {
  const date = new Date(dateStr);
  if (type === 'daily') {
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  } else if (type === 'monthly') {
    return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  } else {
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 6);
    return `${date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
  }
}
