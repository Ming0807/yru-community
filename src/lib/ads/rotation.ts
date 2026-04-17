export type RotationType = 'even' | 'weighted' | 'sequential' | 'random';

export interface RotatableAd {
  id: string;
  campaign_id: string;
  campaign_name: string;
  image_url: string;
  target_url: string;
  position: string;
  is_active: boolean;
  weight?: number;
  rotation_index?: number;
  impressions: number;
  clicks: number;
  created_at: string;
}

export interface RotationResult {
  selectedAd: RotatableAd | null;
  rotation_type: RotationType;
  total_candidates: number;
  message: string;
}

const STORAGE_KEY = 'yru_ad_rotation';

interface RotationState {
  sequential_index: number;
  last_rotation: string;
}

function getRotationState(position: string): RotationState {
  if (typeof window === 'undefined') {
    return { sequential_index: 0, last_rotation: '' };
  }
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${position}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      const today = new Date().toDateString();
      if (parsed.last_rotation !== today) {
        return { sequential_index: 0, last_rotation: today };
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return { sequential_index: 0, last_rotation: new Date().toDateString() };
}

function saveRotationState(position: string, state: RotationState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY}_${position}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function evenRotation(ads: RotatableAd[]): RotationResult {
  const activeAds = ads.filter(ad => ad.is_active);

  if (activeAds.length === 0) {
    return {
      selectedAd: null,
      rotation_type: 'even',
      total_candidates: 0,
      message: 'No active ads available',
    };
  }

  // Round-robin: select based on current index
  const state = getRotationState(activeAds[0]?.position || 'default');
  const selectedIndex = state.sequential_index % activeAds.length;
  const selectedAd = { ...activeAds[selectedIndex], rotation_index: selectedIndex };

  // Update state
  state.sequential_index = (state.sequential_index + 1) % activeAds.length;
  saveRotationState(activeAds[0].position, state);

  return {
    selectedAd,
    rotation_type: 'even',
    total_candidates: activeAds.length,
    message: `Selected ad at index ${selectedIndex} of ${activeAds.length}`,
  };
}

export function weightedRotation(ads: RotatableAd[]): RotationResult {
  const activeAds = ads.filter(ad => ad.is_active && (ad.weight === undefined || ad.weight > 0));

  if (activeAds.length === 0) {
    return {
      selectedAd: null,
      rotation_type: 'weighted',
      total_candidates: 0,
      message: 'No active ads with weight > 0',
    };
  }

  // Calculate total weight
  const totalWeight = activeAds.reduce((sum, ad) => sum + (ad.weight || 1), 0);

  // Random selection based on weight
  let random = Math.random() * totalWeight;
  let selectedAd: RotatableAd | null = null;

  for (const ad of activeAds) {
    random -= (ad.weight || 1);
    if (random <= 0) {
      selectedAd = ad;
      break;
    }
  }

  // Fallback to last ad if none selected (due to floating point issues)
  if (!selectedAd) {
    selectedAd = activeAds[activeAds.length - 1];
  }

  return {
    selectedAd,
    rotation_type: 'weighted',
    total_candidates: activeAds.length,
    message: `Selected ad with weight ${selectedAd.weight || 1} of total ${totalWeight}`,
  };
}

export function sequentialRotation(ads: RotatableAd[]): RotationResult {
  return evenRotation(ads);
}

export function randomRotation(ads: RotatableAd[]): RotationResult {
  const activeAds = ads.filter(ad => ad.is_active);

  if (activeAds.length === 0) {
    return {
      selectedAd: null,
      rotation_type: 'random',
      total_candidates: 0,
      message: 'No active ads available',
    };
  }

  const randomIndex = Math.floor(Math.random() * activeAds.length);
  const selectedAd = { ...activeAds[randomIndex], rotation_index: randomIndex };

  return {
    selectedAd,
    rotation_type: 'random',
    total_candidates: activeAds.length,
    message: `Randomly selected ad at index ${randomIndex}`,
  };
}

export function selectAd(
  ads: RotatableAd[],
  rotationType: RotationType = 'even'
): RotationResult {
  switch (rotationType) {
    case 'weighted':
      return weightedRotation(ads);
    case 'sequential':
      return sequentialRotation(ads);
    case 'random':
      return randomRotation(ads);
    case 'even':
    default:
      return evenRotation(ads);
  }
}

export function getAdRotationMetrics(ads: RotatableAd[]) {
  const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);

  return ads.map(ad => ({
    id: ad.id,
    campaign_name: ad.campaign_name,
    impressions: ad.impressions,
    clicks: ad.clicks,
    ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
    impression_share: totalImpressions > 0 ? (ad.impressions / totalImpressions) * 100 : 0,
    click_share: totalClicks > 0 ? (ad.clicks / totalClicks) * 100 : 0,
  }));
}