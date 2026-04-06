'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type AdminActionResult = {
  success: boolean;
  error?: string;
};

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Forbidden');
  return { supabase, userId: user.id };
}

async function logAdminAction(
  action: string,
  details: { target_type?: string; target_id?: string; extra?: Record<string, any> } = {}
) {
  try {
    const { userId } = await requireAdmin();
    const supabase = await createClient();
    await supabase.rpc('log_admin_action', {
      p_admin_id: userId,
      p_action: action,
      p_target_type: details.target_type || null,
      p_target_id: details.target_id || null,
      p_details: details.extra || {},
    });
  } catch (e) {
    console.error('[Audit] Failed to log:', e);
  }
}

export async function adminUpdateUser(
  userId: string,
  updates: { role?: string; status?: string }
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    // Audit logging
    if (updates.role === 'admin') {
      await logAdminAction('PROMOTE_ADMIN', { target_type: 'user', target_id: userId });
    } else if (updates.role === 'user') {
      await logAdminAction('DEMOTE_ADMIN', { target_type: 'user', target_id: userId });
    } else if (updates.status === 'banned') {
      await logAdminAction('BAN_USER', { target_type: 'user', target_id: userId });
    } else if (updates.status === 'suspended') {
      await logAdminAction('SUSPEND_USER', { target_type: 'user', target_id: userId });
    } else if (updates.status === 'active') {
      await logAdminAction('ACTIVATE_USER', { target_type: 'user', target_id: userId });
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function adminSoftDeletePost(postId: string): Promise<AdminActionResult> {
  try {
    const { supabase, userId } = await requireAdmin();

    const { error } = await supabase
      .from('posts')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', postId);

    if (error) throw error;

    await logAdminAction('DELETE_POST', { target_type: 'post', target_id: postId });
    revalidatePath('/admin/content');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function adminResolveReport(reportId: string): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('reports')
      .update({ status: 'resolved' })
      .eq('id', reportId);

    if (error) throw error;

    await logAdminAction('RESOLVE_REPORT', { target_type: 'report', target_id: reportId });
    revalidatePath('/admin/reports');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function adminDeleteReportContent(report: {
  id: string;
  post_id: string | null;
  comment_id: string | null;
}): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    if (report.post_id) {
      const { error } = await supabase
        .from('posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', report.post_id);
      if (error) throw error;

      await logAdminAction('DELETE_POST', {
        target_type: 'post',
        target_id: report.post_id,
        extra: { reason: 'reported_content', report_id: report.id },
      });
    } else if (report.comment_id) {
      const { error } = await supabase.from('comments').delete().eq('id', report.comment_id);
      if (error) throw error;

      await logAdminAction('DELETE_COMMENT', {
        target_type: 'comment',
        target_id: report.comment_id,
        extra: { reason: 'reported_content', report_id: report.id },
      });
    }

    await supabase
      .from('reports')
      .update({ status: 'resolved' })
      .eq('id', report.id);

    await logAdminAction('DELETE_REPORT_CONTENT', {
      target_type: 'report',
      target_id: report.id,
    });

    revalidatePath('/admin/reports');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function adminSaveCategory(
  data: { id?: number; name: string; slug: string; description: string; icon: string; sort_order: number }
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    if (data.id) {
      const { error } = await supabase
        .from('categories')
        .update(data)
        .eq('id', data.id);
      if (error) throw error;

      await logAdminAction('UPDATE_CATEGORY', {
        target_type: 'category',
        target_id: String(data.id),
      });
    } else {
      const { error } = await supabase.from('categories').insert([data]);
      if (error) throw error;

      await logAdminAction('CREATE_CATEGORY', {
        target_type: 'category',
        extra: { name: data.name },
      });
    }

    revalidatePath('/admin/categories');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function adminDeleteCategory(id: number): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;

    await logAdminAction('DELETE_CATEGORY', {
      target_type: 'category',
      target_id: String(id),
    });

    revalidatePath('/admin/categories');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function adminSaveAd(
  data: {
    id?: string;
    campaign_name: string;
    image_url: string;
    target_url: string;
    position: 'feed' | 'sidebar';
    revenue: number;
    is_active: boolean;
    target_tags: string[];
    target_categories: number[];
    start_date?: string;
    end_date?: string;
  }
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    if (data.id) {
      const { error } = await supabase.from('ads').update(data).eq('id', data.id);
      if (error) throw error;

      await logAdminAction('UPDATE_AD', {
        target_type: 'ad',
        target_id: data.id,
      });
    } else {
      const { error } = await supabase.from('ads').insert([data]);
      if (error) throw error;

      await logAdminAction('CREATE_AD', {
        target_type: 'ad',
        extra: { campaign_name: data.campaign_name },
      });
    }

    revalidatePath('/admin/ads');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function adminToggleAd(adId: string, isActive: boolean): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('ads')
      .update({ is_active: isActive })
      .eq('id', adId);

    if (error) throw error;

    await logAdminAction('TOGGLE_AD', {
      target_type: 'ad',
      target_id: adId,
      extra: { is_active: isActive },
    });

    revalidatePath('/admin/ads');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function adminDeleteAd(adId: string): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from('ads').delete().eq('id', adId);
    if (error) throw error;

    await logAdminAction('DELETE_AD', { target_type: 'ad', target_id: adId });
    revalidatePath('/admin/ads');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
