export interface Stat {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface ActivityItem {
  id: string;
  type: 'post' | 'comment' | 'user' | 'report';
  title: string;
  user: string;
  time: string;
  status?: 'pending' | 'resolved';
}

export interface OverviewData {
  stats: Stat[];
  activityData: { name: string; posts: number; comments: number }[];
  categoryData: { name: string; value: number }[];
  recentActivity: ActivityItem[];
  pendingReports: number;
}