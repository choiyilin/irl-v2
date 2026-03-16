import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

type ExploreProfile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  city: string | null;
  age: number | null;
};

export default function ExploreScreen() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ExploreProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [matchMessage, setMatchMessage] = useState('');

  const activeProfile = useMemo(() => profiles[currentIndex] ?? null, [currentIndex, profiles]);

  const loadExploreFeed = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const [{ data: allProfiles, error: profilesError }, { data: likedRows, error: likesError }] =
        await Promise.all([
          supabase.from('profiles').select('id, display_name, bio, city, age').neq('id', user.id),
          supabase.from('profile_likes').select('liked_id').eq('liker_id', user.id),
        ]);

      if (profilesError) throw profilesError;
      if (likesError) throw likesError;

      const likedIdSet = new Set((likedRows ?? []).map((row) => row.liked_id as string));
      const filteredProfiles = (allProfiles ?? []).filter(
        (profile) => !likedIdSet.has(profile.id as string),
      ) as ExploreProfile[];

      setProfiles(filteredProfiles);
      setCurrentIndex(0);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load explore feed.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadExploreFeed();
  }, [loadExploreFeed]);

  const goNextProfile = () => {
    setMatchMessage('');
    setCurrentIndex((index) => index + 1);
  };

  const handlePass = () => {
    goNextProfile();
  };

  const handleLike = async () => {
    if (!user || !activeProfile) return;
    setIsSubmitting(true);
    setErrorMessage('');
    setMatchMessage('');

    try {
      const { error: likeError } = await supabase
        .from('profile_likes')
        .insert({ liker_id: user.id, liked_id: activeProfile.id });
      if (likeError) throw likeError;

      const { data: reverseLike, error: reverseLikeError } = await supabase
        .from('profile_likes')
        .select('liker_id')
        .eq('liker_id', activeProfile.id)
        .eq('liked_id', user.id)
        .maybeSingle();
      if (reverseLikeError) throw reverseLikeError;

      if (reverseLike) {
        const userA = user.id < activeProfile.id ? user.id : activeProfile.id;
        const userB = user.id < activeProfile.id ? activeProfile.id : user.id;

        const { error: matchError } = await supabase
          .from('matches')
          .upsert({ user_a: userA, user_b: userB }, { onConflict: 'user_a,user_b' });
        if (matchError) throw matchError;

        setMatchMessage(`It's a match with ${activeProfile.display_name ?? 'this user'}!`);
      }

      goNextProfile();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save like.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore Profiles</Text>
      {matchMessage ? <Text style={styles.matchBanner}>{matchMessage}</Text> : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {activeProfile ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{activeProfile.display_name ?? 'Unnamed profile'}</Text>
            <Text style={styles.metaText}>
              {[activeProfile.age ? `${activeProfile.age}` : null, activeProfile.city]
                .filter(Boolean)
                .join(' • ') || 'Details coming soon'}
            </Text>
            <Text style={styles.cardBody}>{activeProfile.bio ?? 'No bio yet.'}</Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={[styles.actionButton, styles.passButton]} onPress={handlePass}>
              <Text style={styles.actionText}>Pass</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.likeButton, isSubmitting && styles.disabled]}
              onPress={handleLike}
              disabled={isSubmitting}>
              <Text style={styles.actionText}>{isSubmitting ? 'Saving...' : 'Like'}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No more profiles right now</Text>
          <Text style={styles.cardBody}>
            You have reached the end of your current feed. Check back later for new profiles.
          </Text>
          <Pressable style={[styles.actionButton, styles.likeButton]} onPress={loadExploreFeed}>
            <Text style={styles.actionText}>Refresh feed</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    gap: 12,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  metaText: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
  },
  cardBody: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  passButton: {
    backgroundColor: colors.background,
  },
  likeButton: {
    backgroundColor: colors.surface,
  },
  actionText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: '600',
  },
  matchBanner: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  errorText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 13,
  },
  disabled: {
    opacity: 0.6,
  },
});

