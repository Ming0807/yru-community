export interface FacultyStats {
  faculty: string;
  userCount: number;
  activeUsers: number;
  postCount: number;
  engagementRate: number;
  adImpressions: number;
  adClicks: number;
  adRevenue: number;
  topInterests: string[];
}

export interface FacultyOverview {
  totalFaculties: number;
  totalUsers: number;
  mostActiveFaculty: string;
  topConvertingFaculty: string;
  faculties: FacultyStats[];
}

export interface FacultyAdPerformance {
  faculty: string;
  tier: string;
  campaigns: number;
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
}

export interface InterestBreakdown {
  interest: string;
  count: number;
  percentage: number;
}