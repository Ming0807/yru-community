export interface FraudSignals {
  is_bot: boolean;
  is_rapid_click: boolean;
  is_duplicate_click: boolean;
  is_suspicious_user_agent: boolean;
  fraud_score: number;
  reasons: string[];
}

export interface ClickValidation {
  is_valid: boolean;
  signals: FraudSignals;
  should_count: boolean;
  message: string;
}

const SUSPICIOUS_USER_AGENTS = [
  'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python',
  'httpclient', 'java/', 'libwww', 'lwp', 'fetch', 'go-http',
];

const RAPID_CLICK_THRESHOLD_MS = 1000; // 1 second
const MAX_CLICKS_PER_MINUTE = 10;
const MAX_CLICKS_PER_HOUR = 60;

export function analyzeFraudSignals(
  userAgent: string | null,
  timeToClickMs: number | null,
  clickHistory: { timestamp: number }[]
): FraudSignals {
  const signals: FraudSignals = {
    is_bot: false,
    is_rapid_click: false,
    is_duplicate_click: false,
    is_suspicious_user_agent: false,
    fraud_score: 0,
    reasons: [],
  };

  if (!userAgent) {
    signals.is_bot = true;
    signals.fraud_score += 0.4;
    signals.reasons.push('Missing User-Agent');
  } else {
    const uaLower = userAgent.toLowerCase();
    const isSuspicious = SUSPICIOUS_USER_AGENTS.some(pattern =>
      uaLower.includes(pattern)
    );
    if (isSuspicious) {
      signals.is_suspicious_user_agent = true;
      signals.fraud_score += 0.3;
      signals.reasons.push('Suspicious User-Agent');
    }
  }

  if (timeToClickMs !== null && timeToClickMs < RAPID_CLICK_THRESHOLD_MS) {
    signals.is_rapid_click = true;
    signals.fraud_score += 0.25;
    signals.reasons.push(`Rapid click (${timeToClickMs}ms)`);
  }

  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  const recentClicks = clickHistory.filter(c => c.timestamp > oneMinuteAgo);
  if (recentClicks.length >= MAX_CLICKS_PER_MINUTE) {
    signals.is_duplicate_click = true;
    signals.fraud_score += 0.5;
    signals.reasons.push(`High click frequency (${recentClicks.length}/min)`);
  }

  const hourlyClicks = clickHistory.filter(c => c.timestamp > oneHourAgo);
  if (hourlyClicks.length >= MAX_CLICKS_PER_HOUR) {
    signals.is_duplicate_click = true;
    signals.fraud_score += 0.3;
    signals.reasons.push(`Excessive clicks (${hourlyClicks.length}/hr)`);
  }

  signals.fraud_score = Math.min(1, signals.fraud_score);

  return signals;
}

export function validateClick(
  userAgent: string | null,
  timeToClickMs: number | null,
  clickHistory: { timestamp: number }[] = [],
  customRules?: {
    blockRapidClicks?: boolean;
    blockHighFrequency?: boolean;
    maxFraudScore?: number;
  }
): ClickValidation {
  const rules = {
    blockRapidClicks: true,
    blockHighFrequency: true,
    maxFraudScore: 0.5,
    ...customRules,
  };

  const signals = analyzeFraudSignals(userAgent, timeToClickMs, clickHistory);

  const isValid = !signals.is_bot &&
    !(rules.blockRapidClicks && signals.is_rapid_click) &&
    !(rules.blockHighFrequency && signals.is_duplicate_click) &&
    signals.fraud_score < rules.maxFraudScore;

  const shouldCount = signals.fraud_score < 0.3;

  let message = 'Valid click';
  if (!isValid) {
    if (signals.is_bot) message = 'Rejected: Bot detected';
    else if (signals.is_rapid_click) message = 'Rejected: Rapid click';
    else if (signals.is_duplicate_click) message = 'Rejected: Suspicious frequency';
    else message = 'Rejected: High fraud score';
  } else if (signals.fraud_score > 0) {
    message = `Accepted (warning: ${signals.reasons.join(', ')})`;
  }

  return {
    is_valid: isValid,
    signals,
    should_count: shouldCount,
    message,
  };
}

export function isViewable(
  viewabilityScore: number | null,
  inViewDurationMs: number | null,
  threshold: number = 50,
  minDurationMs: number = 1000
): boolean {
  if (viewabilityScore === null) {
    return false;
  }

  const meetsThreshold = viewabilityScore >= threshold;
  const meetsDuration = inViewDurationMs === null || inViewDurationMs >= minDurationMs;

  return meetsThreshold && meetsDuration;
}

export function filterInvalidImpressions<T extends {
  viewability_score?: number | null;
  in_view_duration_ms?: number | null;
}>(impressions: T[]): T[] {
  return impressions.filter(imp =>
    isViewable(imp.viewability_score ?? null, imp.in_view_duration_ms ?? null)
  );
}

export function calculateCleanCtr(
  impressions: number,
  clicks: number,
  estimatedInvalidClicks: number = 0
): number {
  const validClicks = Math.max(0, clicks - estimatedInvalidClicks);
  const viewableImpressions = impressions; // Should use filtered impressions

  if (viewableImpressions === 0) return 0;
  return (validClicks / viewableImpressions) * 100;
}