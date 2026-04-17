export interface DeviceInfo {
  fingerprint: string;
  user_agent: string;
  platform: string;
  language: string;
  timezone: string;
  screen_resolution: string;
  color_depth: number;
  device_memory: number | null;
  hardware_concurrency: number | null;
}

export interface DeviceLink {
  device_id: string;
  user_id: string;
  linked_at: string;
  is_primary: boolean;
}

const DEVICE_STORAGE_KEY = 'yru_device_id';

export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return '';

  const components: string[] = [];

  components.push(navigator.userAgent);
  components.push(navigator.platform || 'unknown');
  components.push(navigator.language);
  components.push(String(screen.width) + 'x' + screen.height);
  components.push(String(screen.colorDepth || 0));
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown');

  const navObj = navigator as unknown as { deviceMemory?: number; hardwareConcurrency?: number };
  if (navObj.deviceMemory) {
    components.push(String(navObj.deviceMemory));
  }

  if (navObj.hardwareConcurrency) {
    components.push(String(navigator.hardwareConcurrency));
  }

  const fingerprint = components.join('|');

  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return 'd_' + Math.abs(hash).toString(16).padStart(16, '0');
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);

  if (!deviceId) {
    deviceId = generateDeviceFingerprint();
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  }

  return deviceId;
}

export function getDeviceInfo(): DeviceInfo | null {
  if (typeof window === 'undefined') return null;

  const nav = navigator as unknown as {
    userAgent: string;
    platform?: string;
    language: string;
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };

  return {
    fingerprint: getOrCreateDeviceId(),
    user_agent: nav.userAgent,
    platform: nav.platform || 'unknown',
    language: nav.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    screen_resolution: `${screen.width}x${screen.height}`,
    color_depth: screen.colorDepth || 0,
    device_memory: nav.deviceMemory || null,
    hardware_concurrency: nav.hardwareConcurrency || null,
  };
}

export interface CrossDeviceMatch {
  confidence: number;
  matching_factors: string[];
}

export function calculateMatchConfidence(
  device1: DeviceInfo,
  device2: DeviceInfo
): CrossDeviceMatch {
  const matchingFactors: string[] = [];
  let score = 0;
  let maxScore = 0;

  maxScore += 30;
  if (device1.platform === device2.platform) {
    score += 30;
    matchingFactors.push('platform');
  }

  maxScore += 20;
  if (device1.timezone === device2.timezone) {
    score += 20;
    matchingFactors.push('timezone');
  }

  maxScore += 15;
  if (device1.language === device2.language) {
    score += 15;
    matchingFactors.push('language');
  }

  maxScore += 20;
  if (device1.screen_resolution === device2.screen_resolution) {
    score += 20;
    matchingFactors.push('screen_resolution');
  }

  maxScore += 15;
  if (device1.color_depth === device2.color_depth) {
    score += 15;
    matchingFactors.push('color_depth');
  }

  const confidence = maxScore > 0 ? (score / maxScore) * 100 : 0;

  return {
    confidence: Math.round(confidence * 100) / 100,
    matching_factors: matchingFactors,
  };
}

export function isLikelySameUser(device1: DeviceInfo, device2: DeviceInfo): boolean {
  const match = calculateMatchConfidence(device1, device2);
  return match.confidence >= 70;
}