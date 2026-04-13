export interface AdCampaign {
  id: string;
  campaign_name: string;
  advertiser_name: string | null;
  advertiser_contact: string | null;
  package_id: string;
  pricing_model: 'fixed' | 'cpm' | 'cpc';
  final_price: number | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
  target_faculties: string[];
  target_interests: string[];
  target_categories: number[];
  target_years: number[];
  target_genders: string[];
  budget: number | null;
  daily_budget: number | null;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  package?: AdPackage;
  approved_by_profile?: {
    id: string;
    display_name: string;
  };
}

export type CampaignStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface AdPackage {
  id: string;
  name: string;
  description: string | null;
  tier: 'bronze' | 'silver' | 'gold' | 'custom';
  base_price: number;
  min_duration_days: number;
  max_duration_days: number;
  features: string[];
  targeting_included: string[];
  color: string;
  icon: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at?: string;
}

export interface AdCampaignFormData {
  campaign_name: string;
  advertiser_name: string;
  advertiser_contact: string;
  package_id: string;
  pricing_model: 'fixed' | 'cpm' | 'cpc';
  final_price: number;
  notes: string;
  start_date: string;
  end_date: string;
  target_faculties: string[];
  target_interests: string[];
  target_years: number[];
  target_genders: string[];
  budget: number;
  daily_budget: number;
  status: CampaignStatus;
}

export const CAMPAIGN_STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; bg: string }> = {
  pending_approval: { label: 'รออนุมัติ', color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  approved: { label: 'อนุมัติแล้ว', color: 'text-blue-600', bg: 'bg-blue-500/10' },
  rejected: { label: 'ปฏิเสธ', color: 'text-red-600', bg: 'bg-red-500/10' },
  active: { label: 'กำลังแสดง', color: 'text-green-600', bg: 'bg-green-500/10' },
  paused: { label: 'หยุดชั่วคราว', color: 'text-gray-600', bg: 'bg-gray-500/10' },
  completed: { label: 'เสร็จสิ้น', color: 'text-purple-600', bg: 'bg-purple-500/10' },
  cancelled: { label: 'ยกเลิก', color: 'text-red-600', bg: 'bg-red-500/10' },
};

export const AVAILABLE_INTERESTS = [
  'ติวเตอร์',
  'หอพัก',
  'ร้านอาหาร',
  'อุปกรณ์การเรียน',
  'กีฬา',
  'ท่องเที่ยว',
  'สุขภาพ',
  'เทคโนโลยี',
] as const;

export const AVAILABLE_YEARS = [1, 2, 3, 4, 5] as const;

export const DEFAULT_CAMPAIGN_FORM: AdCampaignFormData = {
  campaign_name: '',
  advertiser_name: '',
  advertiser_contact: '',
  package_id: '',
  pricing_model: 'fixed',
  final_price: 0,
  notes: '',
  start_date: '',
  end_date: '',
  target_faculties: [],
  target_interests: [],
  target_years: [],
  target_genders: [],
  budget: 0,
  daily_budget: 0,
  status: 'pending_approval',
};