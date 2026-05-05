-- =====================================================
-- Phase 65: Fix user segment/interest schema drift
-- Purpose:
-- - Align segment functions with current schema:
--   profiles, posts.author_id, comments.author_id, post_reactions.
-- - Remove references to legacy users/posts.user_id/comments.user_id/reactions.
-- =====================================================

CREATE OR REPLACE FUNCTION public.compute_user_activity_segment(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_post_count INTEGER := 0;
  v_last_post_at TIMESTAMPTZ;
  v_account_age INTERVAL;
  v_result JSONB;
BEGIN
  SELECT
    COUNT(*)::INTEGER,
    MAX(created_at)
  INTO v_post_count, v_last_post_at
  FROM public.posts
  WHERE author_id = p_user_id
    AND is_draft = false
    AND deleted_at IS NULL;

  SELECT NOW() - created_at
  INTO v_account_age
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_account_age IS NULL THEN
    RETURN jsonb_build_object('level', 'ghost', 'score', 0, 'days_since_active', NULL);
  END IF;

  IF v_post_count = 0 THEN
    IF v_account_age < INTERVAL '7 days' THEN
      v_result := jsonb_build_object('level', 'new', 'score', 100, 'days_since_active', 0);
    ELSE
      v_result := jsonb_build_object('level', 'dormant', 'score', 0, 'days_since_active', EXTRACT(DAY FROM v_account_age)::INTEGER);
    END IF;
  ELSIF v_last_post_at < NOW() - INTERVAL '30 days' THEN
    v_result := jsonb_build_object('level', 'dormant', 'score', 10, 'days_since_active', EXTRACT(DAY FROM (NOW() - v_last_post_at))::INTEGER);
  ELSIF v_last_post_at < NOW() - INTERVAL '7 days' THEN
    v_result := jsonb_build_object('level', 'active_7d', 'score', 50, 'days_since_active', EXTRACT(DAY FROM (NOW() - v_last_post_at))::INTEGER);
  ELSIF v_last_post_at < NOW() - INTERVAL '1 day' THEN
    v_result := jsonb_build_object('level', 'active_1d', 'score', 75, 'days_since_active', EXTRACT(DAY FROM (NOW() - v_last_post_at))::INTEGER);
  ELSE
    v_result := jsonb_build_object('level', 'active_30d', 'score', 100, 'days_since_active', 0);
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_user_engagement_segment(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_post_count INTEGER := 0;
  v_comment_count INTEGER := 0;
  v_reaction_count INTEGER := 0;
  v_engagement_score DECIMAL;
  v_level VARCHAR(20);
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_post_count
  FROM public.posts
  WHERE author_id = p_user_id
    AND created_at > NOW() - INTERVAL '30 days'
    AND is_draft = false
    AND deleted_at IS NULL;

  SELECT COUNT(*)::INTEGER
  INTO v_comment_count
  FROM public.comments
  WHERE author_id = p_user_id
    AND created_at > NOW() - INTERVAL '30 days'
    AND COALESCE(is_deleted, false) = false;

  SELECT COUNT(*)::INTEGER
  INTO v_reaction_count
  FROM public.post_reactions
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '30 days';

  v_engagement_score := (v_post_count * 3 + v_comment_count * 2 + v_reaction_count)::DECIMAL;

  IF v_engagement_score > 50 THEN
    v_level := 'high';
  ELSIF v_engagement_score > 10 THEN
    v_level := 'medium';
  ELSIF v_engagement_score > 0 THEN
    v_level := 'low';
  ELSE
    v_level := 'ghost';
  END IF;

  RETURN jsonb_build_object(
    'level', v_level,
    'score', v_engagement_score,
    'posts', v_post_count,
    'comments', v_comment_count,
    'reactions', v_reaction_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_segments(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.user_segments (user_id, segment_type, segment_value, computed_at, expires_at)
  VALUES (p_user_id, 'activity', public.compute_user_activity_segment(p_user_id), NOW(), NOW() + INTERVAL '1 hour')
  ON CONFLICT (user_id, segment_type)
  DO UPDATE SET
    segment_value = EXCLUDED.segment_value,
    computed_at = NOW(),
    expires_at = EXCLUDED.expires_at;

  INSERT INTO public.user_segments (user_id, segment_type, segment_value, computed_at, expires_at)
  VALUES (p_user_id, 'engagement', public.compute_user_engagement_segment(p_user_id), NOW(), NOW() + INTERVAL '1 hour')
  ON CONFLICT (user_id, segment_type)
  DO UPDATE SET
    segment_value = EXCLUDED.segment_value,
    computed_at = NOW(),
    expires_at = EXCLUDED.expires_at;

  INSERT INTO public.user_segments (user_id, segment_type, segment_value, computed_at, expires_at)
  SELECT
    p.id,
    'faculty',
    jsonb_build_object(
      'faculty', COALESCE(p.faculty, 'unknown'),
      'major', COALESCE(p.major, 'unknown')
    ),
    NOW(),
    NULL
  FROM public.profiles p
  WHERE p.id = p_user_id
  ON CONFLICT (user_id, segment_type)
  DO UPDATE SET
    segment_value = EXCLUDED.segment_value,
    computed_at = NOW(),
    expires_at = EXCLUDED.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_update_user_segments()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN
    PERFORM public.update_user_segments(NEW.author_id);
  ELSIF TG_TABLE_NAME = 'comments' THEN
    PERFORM public.update_user_segments(NEW.author_id);
  ELSIF TG_TABLE_NAME = 'post_reactions' THEN
    PERFORM public.update_user_segments(NEW.user_id);
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    PERFORM public.update_user_segments(NEW.id);
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.batch_compute_user_segments()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_user_id UUID;
BEGIN
  FOR v_user_id IN SELECT id FROM public.profiles LOOP
    PERFORM public.update_user_segments(v_user_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_user_interests(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_category_id INTEGER;
  v_authored_count INTEGER;
  v_reaction_count INTEGER;
  v_comment_count INTEGER;
BEGIN
  FOR v_category_id IN
    SELECT DISTINCT category_id
    FROM (
      SELECT p.category_id
      FROM public.posts p
      WHERE p.author_id = p_user_id

      UNION

      SELECT p.category_id
      FROM public.post_reactions pr
      JOIN public.posts p ON p.id = pr.post_id
      WHERE pr.user_id = p_user_id

      UNION

      SELECT p.category_id
      FROM public.comments c
      JOIN public.posts p ON p.id = c.post_id
      WHERE c.author_id = p_user_id
    ) categories
    WHERE category_id IS NOT NULL
  LOOP
    SELECT COUNT(*)::INTEGER
    INTO v_authored_count
    FROM public.posts
    WHERE author_id = p_user_id
      AND category_id = v_category_id
      AND is_draft = false
      AND deleted_at IS NULL;

    SELECT COUNT(*)::INTEGER
    INTO v_reaction_count
    FROM public.post_reactions pr
    JOIN public.posts p ON p.id = pr.post_id
    WHERE pr.user_id = p_user_id
      AND p.category_id = v_category_id;

    SELECT COUNT(*)::INTEGER
    INTO v_comment_count
    FROM public.comments c
    JOIN public.posts p ON p.id = c.post_id
    WHERE c.author_id = p_user_id
      AND p.category_id = v_category_id
      AND COALESCE(c.is_deleted, false) = false;

    IF v_authored_count > 0 THEN
      PERFORM public.update_user_interest(p_user_id, v_category_id, 'view', v_authored_count::DECIMAL);
    END IF;

    IF v_reaction_count > 0 THEN
      PERFORM public.update_user_interest(p_user_id, v_category_id, 'like', v_reaction_count::DECIMAL);
    END IF;

    IF v_comment_count > 0 THEN
      PERFORM public.update_user_interest(p_user_id, v_category_id, 'comment', v_comment_count::DECIMAL);
    END IF;
  END LOOP;
END;
$$;
