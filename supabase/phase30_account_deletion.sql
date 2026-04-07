-- ==========================================
-- Phase 30: Account Deletion
-- ==========================================

-- Function to soft-delete a user account (anonymize data)
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Anonymize profile
  UPDATE profiles SET
    display_name = 'ผู้ใช้ที่ถูกลบ',
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

  -- Delete user's push subscriptions
  DELETE FROM push_subscriptions WHERE user_id = p_user_id;

  -- Delete user's follows
  DELETE FROM follows WHERE follower_id = p_user_id OR following_id = p_user_id;

  -- Delete user's bookmarks
  DELETE FROM bookmarks WHERE user_id = p_user_id;

  -- Delete user's votes on posts
  DELETE FROM votes WHERE user_id = p_user_id;

  -- Delete user's post reactions
  DELETE FROM post_reactions WHERE user_id = p_user_id;

  -- Delete user's comment votes
  DELETE FROM comment_votes WHERE user_id = p_user_id;

  -- Anonymize user's posts (set to anonymous)
  UPDATE posts SET
    is_anonymous = true,
    title = 'โพสต์ที่ถูกลบ',
    content_text = NULL,
    content = '{}',
    tags = '{}',
    attachments = '[]',
    deleted_at = now()
  WHERE author_id = p_user_id;

  -- Anonymize user's comments
  UPDATE comments SET
    is_anonymous = true,
    content = 'ความคิดเห็นที่ถูกลบ'
  WHERE author_id = p_user_id;

  -- Delete user's notifications
  DELETE FROM notifications WHERE user_id = p_user_id OR actor_id = p_user_id;

  -- Delete user's messages
  DELETE FROM messages WHERE sender_id = p_user_id OR receiver_id = p_user_id;

  -- Delete user's reports
  DELETE FROM reports WHERE reporter_id = p_user_id;

  -- Delete user's audit logs
  DELETE FROM audit_logs WHERE admin_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
