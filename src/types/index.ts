// ==========================================
// YRU Community - Type Definitions
// ==========================================

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  faculty: string | null;
  major: string | null;
  avatar_url: string | null;
  role?: 'admin' | 'user';
  status?: 'active' | 'suspended' | 'banned';
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface Post {
  id: string;
  author_id: string;
  category_id: number;
  title: string;
  content: Record<string, unknown>; // TipTap JSON
  content_text: string;
  is_anonymous: boolean;
  tags: string[];
  vote_count: number;
  comment_count: number;
  view_count: number;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
  // Joined fields
  author?: Profile;
  category?: Category;
  user_has_voted?: boolean;
  user_has_bookmarked?: boolean;
}

export interface Attachment {
  url: string;
  name: string;
  type: 'image' | 'pdf';
  size: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  // Joined
  author?: Profile;
  // Client-side grouped
  replies?: Comment[];
}

export interface Vote {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'COMMENT' | 'REPLY';
  post_id: string;
  comment_id: string;
  is_read: boolean;
  created_at: string;
  // Joined
  actor?: Profile;
  post?: { title: string };
  comment?: { content: string };
}

// Sort & Filter
export type SortOption = 'latest' | 'top' | 'unanswered';

export interface PostFilters {
  category?: string;
  sort?: SortOption;
  search?: string;
  page?: number;
}

export interface Ad {
  id: string;
  campaign_name: string;
  image_url: string;
  target_url: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  impressions: number;
  clicks: number;
  position: 'feed' | 'sidebar';
  revenue: number;
  target_tags?: string[];
  target_categories?: number[];
  created_at: string;
}
