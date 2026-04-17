-- =====================================================
-- Fix: Grant permissions for user_segments table
-- =====================================================

-- Grant permissions to authenticated and anon roles so the RLS policies can take effect.
-- Without this, even with a policy, they'll get "permission denied for table".

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_segments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_segments TO service_role;
GRANT SELECT ON TABLE public.user_segments TO anon;
