export interface CampaignSchedule {
  schedule_type: 'continuous' | 'scheduled' | 'dayparting';
  schedule_time_start: string | null;
  schedule_time_end: string | null;
  schedule_days: number[];
  timezone: string;
  start_date: string | null;
  end_date: string | null;
}

export interface ScheduleCheckResult {
  is_active: boolean;
  reason: string;
  next_transition?: {
    type: 'start' | 'end';
    time: Date;
  };
}

const DAYPARTING_DEFAULT_START = '09:00';
const DAYPARTING_DEFAULT_END = '21:00';
const DEFAULT_TIMEZONE = 'Asia/Bangkok';

export function isWithinDateRange(schedule: CampaignSchedule): boolean {
  const now = new Date();

  if (schedule.start_date) {
    const startDate = new Date(schedule.start_date);
    if (now < startDate) {
      return false;
    }
  }

  if (schedule.end_date) {
    const endDate = new Date(schedule.end_date);
    if (now > endDate) {
      return false;
    }
  }

  return true;
}

export function isWithinDayparting(schedule: CampaignSchedule): boolean {
  if (schedule.schedule_type !== 'dayparting' && schedule.schedule_type !== 'scheduled') {
    return true;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentTimeStr = now.toTimeString().slice(0, 5);

  const days = schedule.schedule_days || [0, 1, 2, 3, 4, 5, 6];
  if (!days.includes(currentDay)) {
    return false;
  }

  const startTime = schedule.schedule_time_start || DAYPARTING_DEFAULT_START;
  const endTime = schedule.schedule_time_end || DAYPARTING_DEFAULT_END;

  if (currentTimeStr < startTime || currentTimeStr >= endTime) {
    return false;
  }

  return true;
}

export function isCampaignActive(schedule: CampaignSchedule): ScheduleCheckResult {
  if (!isWithinDateRange(schedule)) {
    return { is_active: false, reason: 'Outside date range' };
  }

  if (!isWithinDayparting(schedule)) {
    return { is_active: false, reason: 'Outside dayparting hours' };
  }

  return { is_active: true, reason: 'Active' };
}

export function getNextScheduleTransition(schedule: CampaignSchedule): ScheduleCheckResult['next_transition'] {
  if (schedule.schedule_type === 'continuous') {
    if (schedule.end_date) {
      return {
        type: 'end',
        time: new Date(schedule.end_date),
      };
    }
    return undefined;
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentTimeStr = now.toTimeString().slice(0, 5);

  const days = schedule.schedule_days || [0, 1, 2, 3, 4, 5, 6];
  const startTime = schedule.schedule_time_start || DAYPARTING_DEFAULT_START;
  const endTime = schedule.schedule_time_end || DAYPARTING_DEFAULT_END;

  if (schedule.schedule_type === 'dayparting' || schedule.schedule_type === 'scheduled') {
    if (currentTimeStr < startTime) {
      return {
        type: 'start',
        time: new Date(`${now.toDateString()} ${startTime}`),
      };
    }

    if (currentTimeStr >= endTime) {
      const todayIndex = days.indexOf(currentDay);
      const nextDayIndex = (todayIndex + 1) % 7;
      const nextDay = days[nextDayIndex];

      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + (nextDayIndex - todayIndex + (nextDayIndex <= todayIndex ? 7 : 0)));

      return {
        type: 'start',
        time: new Date(`${nextDate.toDateString()} ${startTime}`),
      };
    }
  }

  if (schedule.end_date) {
    const endDate = new Date(schedule.end_date);
    if (now < endDate) {
      return {
        type: 'end',
        time: endDate,
      };
    }
  }

  return undefined;
}

export function checkCampaignSchedule(schedule: CampaignSchedule): ScheduleCheckResult {
  const isActive = isCampaignActive(schedule);
  if (!isActive.is_active) {
    return isActive as ScheduleCheckResult;
  }

  const nextTransition = getNextScheduleTransition(schedule);

  return {
    is_active: true,
    reason: 'Campaign is running',
    next_transition: nextTransition,
  };
}

export function formatScheduleDescription(schedule: CampaignSchedule): string {
  if (schedule.schedule_type === 'continuous') {
    if (schedule.start_date && schedule.end_date) {
      return `${formatDate(schedule.start_date)} - ${formatDate(schedule.end_date)}`;
    }
    return 'ไม่มีกำหนดสิ้นสุด';
  }

  if (schedule.schedule_type === 'scheduled' || schedule.schedule_type === 'dayparting') {
    const days = schedule.schedule_days || [];
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const daysStr = days.length === 7
      ? 'ทุกวัน'
      : days.length === 0
        ? 'ไม่กำหนดวัน'
        : days.map(d => dayNames[d]).join(', ');

    const startTime = schedule.schedule_time_start || DAYPARTING_DEFAULT_START;
    const endTime = schedule.schedule_time_end || DAYPARTING_DEFAULT_END;

    return `${daysStr}, ${startTime} - ${endTime} น.`;
  }

  return 'ไม่กำหนด';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isAdEligibleForServing(campaign: CampaignSchedule & { status: string }): boolean {
  if (campaign.status !== 'active' && campaign.status !== 'approved') {
    return false;
  }

  return isCampaignActive(campaign).is_active;
}