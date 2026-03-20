import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IrlExploreOverviewHeader } from '@/src/components/IrlMark';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

type ExploreProfile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  city: string | null;
  age: number | null;
};

type DetailRowConfig = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const PLACEHOLDER_ROWS: DetailRowConfig[] = [
  { key: 'work', icon: 'briefcase-outline' },
  { key: 'school', icon: 'school-outline' },
  { key: 'neighborhood', icon: 'location-outline' },
  { key: 'hometown', icon: 'home-outline' },
  { key: 'height', icon: 'resize-outline' },
  { key: 'faith', icon: 'sparkles-outline' },
];

export default function ExploreScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [matchCount, setMatchCount] = useState(0);
  const [profiles, setProfiles] = useState<ExploreProfile[]>([]);
  const [photoPathByUserId, setPhotoPathByUserId] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [matchMessage, setMatchMessage] = useState('');
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string | null>(null);

  const activeProfile = useMemo(() => profiles[currentIndex] ?? null, [currentIndex, profiles]);

  const loadExploreFeed = useCallback(async () => {
    if (!userId) {
      setProfiles([]);
      setPhotoPathByUserId({});
      setCurrentIndex(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const [{ data: allProfiles, error: profilesError }, { data: likedRows, error: likesError }] =
        await Promise.all([
          supabase.from('profiles').select('id, display_name, bio, city, age').neq('id', userId),
          supabase.from('profile_likes').select('liked_id').eq('liker_id', userId),
        ]);

      if (profilesError) throw profilesError;
      if (likesError) throw likesError;

      const likedIdSet = new Set((likedRows ?? []).map((row) => row.liked_id as string));
      const filteredProfiles = (allProfiles ?? []).filter(
        (profile) =>
          profile.id !== userId &&
          !likedIdSet.has(profile.id as string),
      ) as ExploreProfile[];

      setProfiles(filteredProfiles);
      setCurrentIndex(0);

      const ids = filteredProfiles.map((p) => p.id);
      if (ids.length === 0) {
        setPhotoPathByUserId({});
        return;
      }

      const { data: photoRows, error: photosError } = await supabase
        .from('profile_photos')
        .select('user_id, slot_index, storage_path')
        .in('user_id', ids)
        .order('slot_index', { ascending: true });

      if (photosError) throw photosError;

      const pathMap: Record<string, string> = {};
      for (const row of photoRows ?? []) {
        const uid = row.user_id as string;
        if (!pathMap[uid]) {
          pathMap[uid] = row.storage_path as string;
        }
      }
      setPhotoPathByUserId(pathMap);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load explore feed.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadExploreFeed();
  }, [loadExploreFeed]);

  const loadMatchCount = useCallback(async () => {
    if (!userId) {
      setMatchCount(0);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('id')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);
      if (error) throw error;
      setMatchCount(data?.length ?? 0);
    } catch {
      setMatchCount(0);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadMatchCount();
    }, [loadMatchCount]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      header: (props: { insets?: { top: number } }) => (
        <IrlExploreOverviewHeader
          safeTopFromNav={props.insets?.top}
          matchCount={matchCount}
          onMatchesPress={() => router.push('/(tabs)/matches')}
        />
      ),
    });
  }, [navigation, matchCount, router]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!activeProfile) {
        setPrimaryImageUrl(null);
        return;
      }
      const path = photoPathByUserId[activeProfile.id];
      if (!path) {
        setPrimaryImageUrl(null);
        return;
      }
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(path, 60 * 60);
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setPrimaryImageUrl(null);
        return;
      }
      setPrimaryImageUrl(data.signedUrl);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id, photoPathByUserId]);

  const goNextProfile = () => {
    setMatchMessage('');
    setCurrentIndex((index) => index + 1);
  };

  const handlePass = () => {
    goNextProfile();
  };

  const handleLike = async () => {
    if (!userId || !activeProfile) return;
    setIsSubmitting(true);
    setErrorMessage('');
    setMatchMessage('');

    try {
      const { error: likeError } = await supabase
        .from('profile_likes')
        .insert({ liker_id: userId, liked_id: activeProfile.id });
      if (likeError) throw likeError;

      const { data: reverseLike, error: reverseLikeError } = await supabase
        .from('profile_likes')
        .select('liker_id')
        .eq('liker_id', activeProfile.id)
        .eq('liked_id', userId)
        .maybeSingle();
      if (reverseLikeError) throw reverseLikeError;

      if (reverseLike) {
        const userA = userId < activeProfile.id ? userId : activeProfile.id;
        const userB = userId < activeProfile.id ? activeProfile.id : userId;

        const { data: matchRow, error: matchError } = await supabase
          .from('matches')
          .upsert({ user_a: userA, user_b: userB }, { onConflict: 'user_a,user_b' })
          .select('id')
          .single();
        if (matchError) throw matchError;
        if (!matchRow?.id) throw new Error('Unable to create or find match.');

        setMatchMessage(`It's a match with ${activeProfile.display_name ?? 'this user'}!`);
        void loadMatchCount();
      }

      goNextProfile();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save like.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = activeProfile?.display_name?.trim() || 'Member';
  const ageLabel = activeProfile?.age != null ? `${activeProfile.age}` : '—';

  /** Space so actions sit above the floating tab bar + home indicator */
  const scrollBottomInset = Math.max(insets.bottom, 16) + 96;

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.brandPink} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {matchMessage ? <Text style={styles.matchBanner}>{matchMessage}</Text> : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {activeProfile ? (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <View style={styles.photoBlock}>
                {primaryImageUrl ? (
                  <Image source={{ uri: primaryImageUrl }} style={styles.heroImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.heroImage, styles.heroPlaceholder]}>
                    <Ionicons name="person-outline" size={64} color={colors.mutedText} />
                  </View>
                )}
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.nameAge} numberOfLines={1}>
                  {displayName}, {ageLabel}
                </Text>
              </View>

              <View style={styles.detailsList}>
                {PLACEHOLDER_ROWS.map((row, index) => (
                  <View
                    key={row.key}
                    style={[styles.detailRow, index > 0 ? styles.detailRowBorder : null]}>
                    <Ionicons name={row.icon} size={20} color={colors.mutedText} style={styles.detailIcon} />
                    <Text style={styles.detailPlaceholder}> </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.actionSection, { paddingBottom: scrollBottomInset }]}>
              <View style={styles.actionRow}>
                <View style={styles.actionItem}>
                  <Pressable
                    style={({ pressed }) => [styles.passButton, pressed && styles.actionPressed]}
                    onPress={handlePass}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel="Pass">
                    <Ionicons name="close" size={32} color="#5C5C66" />
                  </Pressable>
                  <Text style={styles.actionCaption}>Pass</Text>
                </View>
                <Pressable
                  style={styles.actionItem}
                  onPress={handleLike}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Like">
                  {({ pressed }) => {
                    const active = pressed || isSubmitting;
                    return (
                      <>
                        <View
                          style={[
                            styles.likeButton,
                            active && styles.likeButtonHighlighted,
                            pressed && !isSubmitting && styles.likeButtonPressScale,
                            isSubmitting && styles.disabled,
                          ]}>
                          {isSubmitting ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <Ionicons
                              name={pressed ? 'heart' : 'heart-outline'}
                              size={32}
                              color={pressed ? '#FFFFFF' : colors.brandPink}
                            />
                          )}
                        </View>
                        <Text style={[styles.actionCaption, active && styles.actionCaptionLike]}>Like</Text>
                      </>
                    );
                  }}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </>
      ) : (
        <View style={styles.emptyWrap}>
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>No more profiles right now</Text>
            <Text style={styles.emptyBody}>
              You have reached the end of your current feed. Check back later for new profiles.
            </Text>
            <Pressable style={styles.refreshBtn} onPress={loadExploreFeed}>
              <Text style={styles.refreshBtnText}>Refresh feed</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.exploreCanvas,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  photoBlock: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 0.72,
    backgroundColor: '#F0F0F0',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    marginBottom: 8,
  },
  nameAge: {
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  detailsList: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  detailRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detailIcon: {
    width: 28,
  },
  detailPlaceholder: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    color: colors.mutedText,
  },
  actionSection: {
    marginTop: 8,
    paddingTop: 20,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 44,
  },
  actionItem: {
    alignItems: 'center',
    gap: 10,
  },
  passButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E2E8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  likeButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.brandPink,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  likeButtonHighlighted: {
    backgroundColor: colors.brandPink,
    borderColor: colors.brandPink,
    shadowColor: colors.brandPink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  likeButtonPressScale: {
    transform: [{ scale: 0.94 }],
  },
  actionCaption: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedText,
    letterSpacing: 0.2,
  },
  actionCaptionLike: {
    color: colors.brandPink,
  },
  actionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.94 }],
  },
  disabled: {
    opacity: 0.65,
  },
  matchBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    overflow: 'hidden',
  },
  errorText: {
    marginHorizontal: 16,
    marginBottom: 8,
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 13,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    color: colors.mutedText,
    marginBottom: 16,
    lineHeight: 22,
  },
  refreshBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandPink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
    fontWeight: '700',
    fontSize: 15,
  },
});
