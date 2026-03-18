// ==========================================
// YRU Community - Constants & Configuration
// ==========================================

// คณะทั้ง 5 คณะของ มรย.
export const FACULTIES = [
  'คณะครุศาสตร์',
  'คณะมนุษยศาสตร์และสังคมศาสตร์',
  'คณะวิทยาศาสตร์เทคโนโลยีและการเกษตร',
  'คณะวิทยาการจัดการ',
  'คณะสาธารณสุขศาสตร์และสหเวชศาสตร์',
] as const;

export type Faculty = typeof FACULTIES[number];

// หมวดหมู่กระทู้
export const CATEGORIES = [
  { slug: 'general', name: 'ห้องรวม', icon: '💬' },
  { slug: 'academic', name: 'ห้องเรียน/สอบ', icon: '📚' },
  { slug: 'marketplace', name: 'ห้องซื้อขาย', icon: '🛒' },
  { slug: 'housing', name: 'หอพัก/รูมเมท', icon: '🏠' },
  { slug: 'edu', name: 'คณะครุศาสตร์', icon: '🎓' },
  { slug: 'human', name: 'คณะมนุษยศาสตร์ฯ', icon: '📖' },
  { slug: 'sci', name: 'คณะวิทย์เทคโนฯ', icon: '🔬' },
  { slug: 'mgmt', name: 'คณะวิทยาการจัดการ', icon: '💼' },
  { slug: 'health', name: 'คณะสาธารณสุขฯ', icon: '🏥' },
] as const;

// เหตุผลในการรายงาน
export const REPORT_REASONS = [
  'สแปม / โฆษณา',
  'เนื้อหาไม่เหมาะสม',
  'คุกคาม / กลั่นแกล้ง',
  'ข้อมูลเท็จ / หลอกลวง',
  'ละเมิดลิขสิทธิ์',
  'อื่นๆ',
] as const;

// ขีดจำกัดการอัปโหลด
export const UPLOAD_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,   // 5MB
  MAX_PDF_SIZE: 10 * 1024 * 1024,    // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_PDF_TYPES: ['application/pdf'],
} as const;

// Pagination
export const POSTS_PER_PAGE = 20;

// YRU email domain
export const YRU_EMAIL_DOMAIN = '@yru.ac.th';

// App info
export const APP_NAME = 'YRU Community';
export const APP_DESCRIPTION = 'ศูนย์กลางชุมชนนักศึกษา มหาวิทยาลัยราชภัฏยะลา';
