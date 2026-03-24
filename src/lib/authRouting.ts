import type { User } from '@supabase/supabase-js';

import { supabase } from '@/src/lib/supabase';

/**
 * True when the user is allowed into the main app (tabs), not the sign-up wizard.
 * - New flow sets `has_completed_signup_profile` when signup + photos finish.
 * - Older flow only set `has_uploaded_photos` after the standalone photos screen.
 */
export function hasFinishedAppOnboarding(user: User | null | undefined): boolean {
  if (!user) return false;
  const m = user.user_metadata ?? {};
  // New onboarding flow completion is explicitly tracked.
  // We intentionally do NOT treat `has_uploaded_photos` as "complete" because
  // users must not enter the app until they finish the full profile setup wizard.
  return m.has_completed_signup_profile === true;
}

export type LegacyOnboardingSignals = {
  /** User may enter tabs (established account without auth metadata flags). */
  canEnterMainApp: boolean;
  /** DB has profile_photos — we can safely backfill `has_uploaded_photos` on the JWT. */
  hasProfilePhotos: boolean;
};

/**
 * Accounts created before metadata flags existed may have data in `profiles` / `profile_photos`
 * but still lack `user_metadata.has_*`. Used after sign-in so they skip the sign-up wizard.
 */
export async function fetchLegacyOnboardingSignals(userId: string): Promise<LegacyOnboardingSignals> {
  const [photosRes, profileRes] = await Promise.all([
    supabase.from('profile_photos').select('id').eq('user_id', userId).limit(1),
    supabase.from('profiles').select('age, city, bio').eq('id', userId).maybeSingle(),
  ]);

  if (photosRes.error) {
    console.warn('Legacy onboarding: profile_photos check failed:', photosRes.error.message);
  }
  if (profileRes.error) {
    console.warn('Legacy onboarding: profiles check failed:', profileRes.error.message);
  }

  const hasProfilePhotos = (photosRes.data?.length ?? 0) > 0;
  const p = profileRes.data;
  const profileLooksFilled =
    p != null &&
    (p.age != null ||
      (typeof p.city === 'string' && p.city.trim().length > 0) ||
      (typeof p.bio === 'string' && p.bio.trim().length > 0));

  return {
    // Legacy accounts may not have the new metadata flags.
    // To satisfy "never enter tabs with an incomplete profile", we require both:
    // - at least one profile photo, and
    // - some additional profile content that indicates onboarding was finished.
    canEnterMainApp: hasProfilePhotos && profileLooksFilled,
    hasProfilePhotos,
  };
}
