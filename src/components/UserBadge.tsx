'use client';

import { Sparkles, Award, Star, Crown, Flame } from 'lucide-react';

// Badge level configuration
export const BADGE_CONFIG = [
  {
    level: 1,
    name: 'น้องใหม่',
    nameEn: 'Newcomer',
    minExp: 0,
    color: 'bg-muted text-muted-foreground',
    borderColor: 'border-border/50',
    icon: Sparkles,
    gradient: 'from-slate-400 to-slate-500',
  },
  {
    level: 2,
    name: 'สมาชิกคล่อง',
    nameEn: 'Active',
    minExp: 30,
    color: 'bg-(--color-yru-green)/15 text-(--color-yru-green-dark)',
    borderColor: 'border-(--color-yru-green)/30',
    icon: Star,
    gradient: 'from-(--color-yru-green) to-(--color-yru-green-dark)',
  },
  {
    level: 3,
    name: 'รุ่นพี่',
    nameEn: 'Senior',
    minExp: 100,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500/30',
    icon: Award,
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    level: 4,
    name: 'ผู้เชี่ยวชาญ',
    nameEn: 'Expert',
    minExp: 200,
    color: 'bg-(--color-yru-pink)/15 text-(--color-yru-pink-dark)',
    borderColor: 'border-(--color-yru-pink)/30',
    icon: Crown,
    gradient: 'from-(--color-yru-pink) to-(--color-yru-pink-dark)',
  },
  {
    level: 5,
    name: 'ตำนาน',
    nameEn: 'Legend',
    minExp: 500,
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-500/30',
    icon: Flame,
    gradient: 'from-amber-500 to-orange-500',
  },
] as const;

export function getBadgeForLevel(level: number) {
  return BADGE_CONFIG.find(b => b.level === level) ?? BADGE_CONFIG[0];
}

export function getBadgeForExp(exp: number) {
  const sorted = [...BADGE_CONFIG].sort((a, b) => b.minExp - a.minExp);
  return sorted.find(b => exp >= b.minExp) ?? BADGE_CONFIG[0];
}

interface UserBadgeProps {
  level?: number;
  exp?: number;
  size?: 'xs' | 'sm' | 'md';
  showName?: boolean;
}

export default function UserBadge({ level = 1, exp, size = 'xs', showName = false }: UserBadgeProps) {
  const badge = exp !== undefined ? getBadgeForExp(exp) : getBadgeForLevel(level);
  const Icon = badge.icon;

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0 h-4 gap-0.5',
    sm: 'text-[11px] px-2 py-0.5 h-5 gap-1',
    md: 'text-xs px-2.5 py-1 h-6 gap-1',
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold border transition-all ${badge.color} ${badge.borderColor} ${sizeClasses[size]} badge-shimmer`}
      title={`${badge.name} (${badge.nameEn}) — ${exp ?? '?'} EXP`}
    >
      <Icon className={iconSizes[size]} />
      {showName && <span>{badge.name}</span>}
    </span>
  );
}

// Progress bar towards next level
interface ExpProgressProps {
  exp: number;
  level: number;
}

export function ExpProgress({ exp, level }: ExpProgressProps) {
  const currentBadge = getBadgeForLevel(level);
  const nextBadge = BADGE_CONFIG.find(b => b.level === level + 1);
  
  if (!nextBadge) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Flame className="h-3.5 w-3.5 text-amber-500" />
        <span>Max Level! ({exp} EXP)</span>
      </div>
    );
  }

  const progress = ((exp - currentBadge.minExp) / (nextBadge.minExp - currentBadge.minExp)) * 100;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="font-medium">{currentBadge.name}</span>
        <span>{exp} / {nextBadge.minExp} EXP</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div 
          className={`h-full rounded-full bg-linear-to-r ${currentBadge.gradient} transition-all duration-500`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground/70 text-right">
        อีก {nextBadge.minExp - exp} EXP ถึง {nextBadge.name}
      </div>
    </div>
  );
}
