-- =====================================================
-- Phase 64: Security hardening for high-risk RPC/RLS
-- Purpose:
-- - Prevent account deletion RPC from targeting other users.
-- - Move ad counter/frequency RPC execution behind service role only.
-- - Enable RLS on public ad support tables flagged by Supabase advisors.
-- =====================================================

-- -----------------------------------------------------
-- Account deletion RPC: owner/admin guard.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_is_admin BOOLEAN := FALSE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required' USING ERRCODE = '22004';
  END IF;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_actor_id
      AND role = 'admin'
  )
  INTO v_actor_is_admin;

  IF v_actor_id <> p_user_id AND NOT v_actor_is_admin THEN
    RAISE EXCEPTION 'Cannot delete another user account' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles SET
    display_name = 'Deleted user',
    email = 'deleted@yru-community.com',
    faculty = NULL,
    major = NULL,
    avatar_url = NULL,
    bio = NULL,
    role = 'user',
    status = 'banned',
    experience_points = 0,
    level = 1,
    updated_at = now()
  WHERE id = p_user_id;

  DELETE FROM public.push_subscriptions WHERE user_id = p_user_id;
  DELETE FROM public.follows WHERE follower_id = p_user_id OR following_id = p_user_id;
  DELETE FROM public.bookmarks WHERE user_id = p_user_id;
  DELETE FROM public.votes WHERE user_id = p_user_id;
  DELETE FROM public.post_reactions WHERE user_id = p_user_id;
  DELETE FROM public.comment_votes WHERE user_id = p_user_id;

  UPDATE public.posts SET
    is_anonymous = true,
    title = 'Deleted post',
    content_text = '',
    content = '{}'::jsonb,
    tags = ARRAY[]::text[],
    attachments = '[]'::jsonb,
    deleted_at = now(),
    deleted_by = v_actor_id,
    delete_reason = 'account_deleted'
  WHERE author_id = p_user_id;

  UPDATE public.comments SET
    is_anonymous = true,
    content = 'Deleted comment',
    is_deleted = true,
    updated_at = now()
  WHERE author_id = p_user_id;

  DELETE FROM public.notifications WHERE user_id = p_user_id OR actor_id = p_user_id;
  DELETE FROM public.messages WHERE sender_id = p_user_id OR receiver_id = p_user_id;
  DELETE FROM public.reports WHERE reporter_id = p_user_id;
  DELETE FROM public.audit_logs WHERE admin_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;

-- -----------------------------------------------------
-- Ad aggregate RPCs: only server/service role may execute.
-- Public clients must use /api/ads/track.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_ad_impressions(ad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ads
  SET impressions = COALESCE(impressions, 0) + 1
  WHERE id = ad_id
    AND is_active = true
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ad is not active or does not exist' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_ad_clicks(ad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ads
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id = ad_id
    AND is_active = true
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ad is not active or does not exist' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ad_impressions(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_ad_clicks(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ad_impressions(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_ad_clicks(UUID) TO service_role;

-- Frequency capping is now used server-side only.
REVOKE ALL ON FUNCTION public.check_ad_frequency_cap(UUID, VARCHAR, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_ad_frequency(UUID, VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ad_frequency_cap(UUID, VARCHAR, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_ad_frequency(UUID, VARCHAR) TO service_role;

-- -----------------------------------------------------
-- RLS gaps reported by Supabase advisors.
-- -----------------------------------------------------
ALTER TABLE IF EXISTS public.ad_frequency_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ad_viewability_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage ad frequency cache" ON public.ad_frequency_cache;
CREATE POLICY "Admins can manage ad frequency cache"
  ON public.ad_frequency_cache
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage ad viewability settings" ON public.ad_viewability_settings;
CREATE POLICY "Admins can manage ad viewability settings"
  ON public.ad_viewability_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
