import { createClient } from '@/lib/supabase/client';

export type AdminAction =
  | 'DELETE_POST'
  | 'DELETE_COMMENT'
  | 'BAN_USER'
  | 'SUSPEND_USER'
  | 'ACTIVATE_USER'
  | 'PROMOTE_ADMIN'
  | 'DEMOTE_ADMIN'
  | 'RESOLVE_REPORT'
  | 'DELETE_REPORT_CONTENT'
  | 'TOGGLE_AD'
  | 'CREATE_AD'
  | 'UPDATE_AD'
  | 'DELETE_AD'
  | 'CREATE_CATEGORY'
  | 'UPDATE_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'UPDATE_PROFILE';

export async function logAdminAction(
  action: AdminAction,
  details: {
    target_type?: string;
    target_id?: string;
    reason?: string;
    extra?: Record<string, any>;
  } = {}
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.rpc('log_admin_action', {
      p_admin_id: user.id,
      p_action: action,
      p_target_type: details.target_type || null,
      p_target_id: details.target_id || null,
      p_details: details.extra || {},
    });
  } catch (error) {
    console.error('[Audit] Failed to log admin action:', error);
  }
}
