import type { User } from '@supabase/supabase-js';

/**
 * True when the user is allowed into the main app (tabs), not the sign-up wizard.
 * - New flow sets `has_completed_signup_profile` when signup + photos finish.
 * - Older flow only set `has_uploaded_photos` after the standalone photos screen.
 */
export function hasFinishedAppOnboarding(user: User | null | undefined): boolean {
  if (!user) return false;
  const m = user.user_metadata ?? {};
  if (m.has_completed_signup_profile === true) return true;
  if (m.has_uploaded_photos === true) return true;
  return false;
}
