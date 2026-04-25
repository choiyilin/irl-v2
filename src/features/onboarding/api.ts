import { supabase } from '@/api/supabase/client';
import { wrap } from '@/api/supabase/wrap';
import { type UserId } from '@/lib/brand';
import { type Result } from '@/lib/result';
import { type SupabaseError } from '@/api/supabase/wrap';

export type ProfileDraft = Partial<{
  displayName: string;
  birthdate: string;
  gender: string;
  sexualOrientation: string;
  interestedInSeeing: ReadonlyArray<string>;
  occupation: string;
  education: string;
  city: string;
  hometown: string;
  height: number;
}>;

export const upsertOnboardingDraft = async (
  userId: UserId,
  patch: ProfileDraft,
): Promise<Result<{ id: string }, SupabaseError>> => {
  const row = {
    id: userId,
    display_name: patch.displayName,
    birthdate: patch.birthdate,
    gender: patch.gender,
    sexual_orientation: patch.sexualOrientation,
    interested_in_seeing: patch.interestedInSeeing as string[] | undefined,
    occupation: patch.occupation,
    education: patch.education,
    city: patch.city,
    hometown: patch.hometown,
    height: patch.height,
    onboarding_complete: false,
  };
  return wrap(supabase.from('profiles').upsert(row).select('id').single());
};

export const completeOnboarding = async (
  userId: UserId,
): Promise<Result<{ id: string }, SupabaseError>> =>
  wrap(
    supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', userId)
      .select('id')
      .single(),
  );
