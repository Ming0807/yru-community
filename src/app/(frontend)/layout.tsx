import { UserProvider } from '@/components/UserProvider';
import { PWARegistration } from '@/components/PWARegistration';

/**
 * Frontend Layout
 *
 * This layout wraps all public-facing pages with the UserProvider (client-side auth context).
 *
 * WHY THIS EXISTS:
 * The Admin section (/admin/*) uses Server-Side auth via the Supabase server client.
 * Having UserProvider in the root layout caused a "Navigator Lock Contention" bug where
 * the client-side auth (UserProvider) and server-side auth (admin layout) would race
 * each other for the same browser `navigator.locks`, resulting in "Auth request timeout"
 * errors and frozen UI after navigating between admin and the frontend.
 *
 * By scoping UserProvider ONLY to this group, the Admin section runs completely
 * independently with zero client-side auth overhead. This is the Vercel/Stripe pattern.
 */
export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      {children}
      <PWARegistration />
    </UserProvider>
  );
}
