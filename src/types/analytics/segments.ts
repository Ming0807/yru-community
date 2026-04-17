// =====================================================
// Analytics Types - Segments, Cohorts, Attribution
// =====================================================

// User Segment Types
export type SegmentType = 
  | 'activity' 
  | 'engagement' 
  | 'faculty' 
  | 'interest' 
  | 'device' 
  | 'time' 
  | 'content';

export type ActivityLevel = 'active_30d' | 'active_7d' | 'active_1d' | 'dormant' | 'new';
export type EngagementLevel = 'high' | 'medium' | 'low' | 'ghost';

export interface SegmentValue {
  level?: ActivityLevel | EngagementLevel | string;
  score?: number;
  days_since_active?: number;
  posts?: number;
  comments?: number;
  reactions?: number;
  faculty?: string;
  major?: string;
  [key: string]: unknown;
}

export interface UserSegment {
  id: string;
  user_id: string;
  segment_type: SegmentType;
  segment_value: SegmentValue;
  confidence: number;
  computed_at: string;
  expires_at: string | null;
}

export interface SegmentSummary {
  segment_type: SegmentType;
  segment_level: string;
  user_count: number;
  percentage: number;
}

// Cohort Analysis Types
export interface CohortDataPoint {
  cohort_name: string;
  cohort_date: string;
  initial_users: number;
  retention: number[]; // Week 0, Week 1, Week 2, etc.
}

export interface CohortMetrics {
  cohort_name: string;
  cohort_date: string;
  size: number;
  retention: number[]; // Week 0, Week 1, Week 2, etc.
  avg_retention: number;
  // Legacy fields for compatibility
  week_0?: number; // 100% baseline
  week_1?: number;
  week_2?: number;
  week_3?: number;
  week_4?: number;
}

export interface CohortAnalysis {
  cohort_type: 'weekly' | 'monthly' | 'daily';
  start_date: string;
  end_date: string;
  data: CohortMetrics[];
  summary: {
    total_cohorts: number;
    avg_week_1_retention: number;
    avg_week_4_retention: number;
    best_cohort: string;
    worst_cohort: string;
  };
}

// Funnel Analysis Types
export type FunnelStage = 'impression' | 'click' | 'landing' | 'action' | 'conversion';

export interface FunnelStep {
  stage: FunnelStage;
  step_name: string;
  count: number;
  unique_count: number;
  dropoff_count: number;
  dropoff_rate: number;
  conversion_rate: number; // from top of funnel
}

export interface FunnelData {
  campaign_id?: string;
  campaign_name?: string;
  date_range: {
    start: string;
    end: string;
  };
  steps: FunnelStep[];
  summary: {
    total_impressions: number;
    total_clicks: number;
    total_landings: number;
    total_actions: number;
    total_conversions: number;
    overall_ctr: number;
    overall_conversion_rate: number;
    avg_dropoff_stage: FunnelStage | null;
  };
}

export interface FunnelComparison {
  current: FunnelData;
  previous: FunnelData;
  changes: {
    stage: FunnelStage;
    count_change: number;
    rate_change: number;
  }[];
}

// Attribution Types
export type AttributionModel = 'last_click' | 'first_click' | 'linear' | 'time_decay' | 'data_driven';

export interface AttributionTouchpoint {
  ad_id: string;
  campaign_id: string;
  campaign_name: string;
  touchpoint_type: FunnelStage;
  timestamp: string;
  weight: number; // Attribution weight for this touchpoint
  conversion_value?: number;
}

export interface AttributionResult {
  user_id: string;
  conversion_id: string;
  conversion_type: string;
  conversion_value: number;
  model: AttributionModel;
  touchpoints: AttributionTouchpoint[];
  attributed_conversions: {
    ad_id: string;
    campaign_id: string;
    credit: number; // Percentage credit assigned
  }[];
}

export interface AttributionSummary {
  model: AttributionModel;
  date_range: {
    start: string;
    end: string;
  };
  total_conversions: number;
  total_conversion_value: number;
  by_campaign: {
    campaign_id: string;
    campaign_name: string;
    conversions: number;
    conversion_value: number;
    credit: number;
  }[];
  by_ad: {
    ad_id: string;
    ad_title: string;
    conversions: number;
    conversion_value: number;
    credit: number;
  }[];
}

// Targeting Rules Types
export type RuleOperator = 
  | 'eq' 
  | 'ne' 
  | 'in' 
  | 'not_in' 
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte' 
  | 'between' 
  | 'contains' 
  | 'starts_with' 
  | 'ends_with' 
  | 'exists' 
  | 'not_exists';

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: unknown;
  weight?: number;
}

export type RuleAction = 
  | { action: 'adjust_bid'; value: number }
  | { action: 'set_frequency_cap'; value: number }
  | { action: 'add_label'; value: string }
  | { action: 'exclude'; value: boolean };

export interface TargetingRule {
  id: string;
  name: string;
  description: string | null;
  conditions: RuleCondition[];
  actions: RuleAction[];
  target_campaign_ids: string[] | null;
  target_ad_ids: string[] | null;
  excluded_user_ids: string[] | null;
  priority: number;
  is_active: boolean;
  is_system: boolean;
  traffic_allocation: number;
  variant: 'control' | 'variant_a' | 'variant_b';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_evaluated_at: string | null;
}

export interface RuleEvaluationResult {
  matched: boolean;
  score: number;
  conditions_matched: number;
  conditions_total: number;
  details: {
    field: string;
    operator: string;
    expected: unknown;
    actual: unknown;
    matched: boolean;
    weight: number;
  }[];
}

export interface RuleMatchResult {
  rule_id: string;
  rule_name: string;
  match_score: number;
  priority: number;
  actions: RuleAction[];
}

export interface TargetingResult {
  bid_adjustment: number;
  frequency_cap: number | null;
  targeting_labels: string[];
  rules_matched: number;
}

// Interest Types
export interface UserInterest {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  interest_score: number;
  interaction_count: number;
  positive_interactions: number;
  negative_interactions: number;
  last_interaction_at: string;
  first_interaction_at: string;
  decay_factor: number;
  computed_at: string;
}

export interface InterestSummary {
  category_id: string;
  category_name: string;
  total_users: number;
  avg_interest_score: number;
  total_interactions: number;
  high_interest_users: number;
  medium_interest_users: number;
  low_interest_users: number;
}

export interface SimilarUser {
  user_id: string;
  similarity_score: number;
  shared_interests: {
    category_id: string;
    score: number;
  }[];
}

// API Response Types
export interface SegmentsApiResponse {
  segments: SegmentSummary[];
  total_users: number;
  computed_at: string;
}

export interface CohortsApiResponse extends CohortAnalysis {}

export interface FunnelApiResponse extends FunnelData {}

export interface AttributionApiResponse extends AttributionSummary {}

export interface RulesApiResponse {
  rules: TargetingRule[];
  total: number;
}

export interface InterestsApiResponse {
  interests: UserInterest[];
  top_categories: InterestSummary[];
  total: number;
}