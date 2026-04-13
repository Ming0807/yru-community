export interface BudgetPacing {
  campaignId: string;
  campaignName: string;
  dailyBudget: number | null;
  totalBudget: number | null;
  dailySpent: number;
  totalSpent: number;
  dailyImpressions: number;
  totalImpressions: number;
  dailyClicks: number;
  totalClicks: number;
  dailyPacing: number;
  totalPacing: number;
  status: 'on_track' | 'over_pacing' | 'under_pacing' | 'exhausted';
  startDate: string | null;
  endDate: string | null;
}

export interface BudgetOverview {
  totalDailyBudget: number;
  totalDailySpent: number;
  totalMonthlyBudget: number;
  totalMonthlySpent: number;
  campaignsOnTrack: number;
  campaignsOverBudget: number;
  campaignsExhausted: number;
}

export interface BudgetAlert {
  campaignId: string;
  campaignName: string;
  type: 'daily_exhausted' | 'over_budget' | 'low_pacing';
  message: string;
  severity: 'warning' | 'critical';
  suggestedAction: string;
}