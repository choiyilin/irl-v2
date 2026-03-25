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
  gender?: string | null;
  occupation?: string | null;
  education?: string | null;
  hometown?: string | null;
  height?: string | null;
  show_occupation?: boolean | null;
  show_education?: boolean | null;
  show_city?: boolean | null;
  show_hometown?: boolean | null;
  show_height?: boolean | null;
};

type DetailRowConfig = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
};

const PHOTO_SLOT_COUNT = 6;

function emptyPhotoSlots(): (string | null)[] {
  return Array.from({ length: PHOTO_SLOT_COUNT }, () => null);
}

export default function ExploreScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [matchCount, setMatchCount] = useState(0);
  const [profiles, setProfiles] = useState<ExploreProfile[]>([]);
  const [photoPathsByUserId, setPhotoPathsByUserId] = useState<Record<string, (string | null)[]>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [matchMessage, setMatchMessage] = useState('');
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<(string | null)[]>(() => emptyPhotoSlots());

  const interestedInSeeingRaw =
    typeof user?.user_metadata?.interested_in_seeing === 'string'
      ? (user.user_metadata.interested_in_seeing as string)
      : '';

  const allowedTargetGenders = useMemo<string[] | null>(() => {
    const selections = interestedInSeeingRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (selections.length === 0 || selections.includes('Everyone')) return null;

    const allowed = new Set<string>();
    if (selections.includes('Women')) allowed.add('Woman');
    if (selections.includes('Men')) allowed.add('Man');
    if (selections.includes('Non-binary people')) {
      allowed.add('Non-binary');
      allowed.add('Prefer to self-describe');
    }

    return allowed.size === 0 ? null : Array.from(allowed);
  }, [interestedInSeeingRaw]);

  const activeProfile = useMemo(() => profiles[currentIndex] ?? null, [currentIndex, profiles]);

  /** Stable primitive dep so the signed-URL effect tracks path changes without fragile object identity. */
  const activeUserPhotoPathsKey = useMemo(() => {
    const id = activeProfile?.id;
    if (!id) return '';
    const row = photoPathsByUserId[id];
    if (!row) return id;
    return `${id}:${row.map((p) => (p == null ? '' : p)).join('|')}`;
  }, [activeProfile?.id, photoPathsByUserId]);

  const loadExploreFeed = useCallback(async () => {
    if (!userId) {
      setProfiles([]);
      setPhotoPathsByUserId({});
      setCurrentIndex(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data: likedRows, error: likesError } = await supabase
        .from('profile_likes')
        .select('liked_id')
        .eq('liker_id', userId);
      if (likesError) throw likesError;

      let allProfiles: ExploreProfile[] = [];
      if (allowedTargetGenders) {
        const { data: genderProfiles, error: genderProfilesError } = await supabase
          .from('profiles')
          .select(
            'id, display_name, bio, city, age, gender, occupation, education, hometown, height, show_occupation, show_education, show_city, show_hometown, show_height',
          )
          .neq('id', userId)
          .in('gender', allowedTargetGenders);

        if (genderProfilesError) {
          // If the migration hasn't been applied yet (missing columns), fall back
          // so Explore still works (but won’t be preference-filtered).
          const { data: fallbackProfiles, error: fallbackError } = await supabase
            .from('profiles')
            .select(
              'id, display_name, bio, city, age, occupation, education, hometown, height, show_occupation, show_education, show_city, show_hometown, show_height',
            )
            .neq('id', userId);
          if (fallbackError) throw fallbackError;
          allProfiles = (fallbackProfiles ?? []) as ExploreProfile[];
        } else {
          allProfiles = (genderProfiles ?? []) as ExploreProfile[];
        }
      } else {
        const { data: baseProfiles, error: baseProfilesError } = await supabase
          .from('profiles')
          .select(
            'id, display_name, bio, city, age, occupation, education, hometown, height, show_occupation, show_education, show_city, show_hometown, show_height',
          )
          .neq('id', userId);
        if (baseProfilesError) throw baseProfilesError;
        allProfiles = (baseProfiles ?? []) as ExploreProfile[];
      }

      const likedIdSet = new Set((likedRows ?? []).map((row) => row.liked_id as string));
      const filteredProfiles = allProfiles.filter(
        (profile) => !likedIdSet.has(profile.id as string),
      );

      setProfiles(filteredProfiles);
      setCurrentIndex(0);

      const ids = filteredProfiles.map((p) => p.id);
      if (ids.length === 0) {
        setPhotoPathsByUserId({});
        return;
      }

      const { data: photoRows, error: photosError } = await supabase
        .from('profile_photos')
        .select('user_id, storage_path, slot_index')
        .in('user_id', ids)
        .gte('slot_index', 1)
        .lte('slot_index', PHOTO_SLOT_COUNT);

      if (photosError) throw photosError;

      const pathMap: Record<string, (string | null)[]> = {};
      for (const id of ids) {
        pathMap[id] = emptyPhotoSlots();
      }
      for (const row of photoRows ?? []) {
        const uid = row.user_id as string;
        const slot = (row.slot_index as number) - 1;
        if (slot < 0 || slot >= PHOTO_SLOT_COUNT) continue;
        if (!pathMap[uid]) pathMap[uid] = emptyPhotoSlots();
        pathMap[uid][slot] = row.storage_path as string;
      }
      setPhotoPathsByUserId(pathMap);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load explore feed.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, allowedTargetGenders]);

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
        setSignedPhotoUrls(emptyPhotoSlots());
        return;
      }
      const paths = photoPathsByUserId[activeProfile.id] ?? emptyPhotoSlots();
      const withIndex = paths
        .map((p, index) => (p ? { path: p, index } : null))
        .filter((x): x is { path: string; index: number } => x !== null);
      if (withIndex.length === 0) {
        setSignedPhotoUrls(emptyPhotoSlots());
        return;
      }
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .createSignedUrls(
          withIndex.map((x) => x.path),
          60 * 60,
        );
      if (cancelled) return;
      const next = emptyPhotoSlots();
      if (error || !data) {
        setSignedPhotoUrls(next);
        return;
      }
      withIndex.forEach((item, i) => {
        const row = data[i];
        if (row?.signedUrl && !row.error) {
          next[item.index] = row.signedUrl;
        }
      });
      setSignedPhotoUrls(next);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id, activeUserPhotoPathsKey]);

  const heroPhotoUri = signedPhotoUrls[0] ?? null;
  const secondaryPhotoUrlsForCard = signedPhotoUrls.slice(1, PHOTO_SLOT_COUNT);

  const goNextProfile = () => {
    setMatchMessage('');
    setCurrentIndex((index) => index + 1);
  };

  const handlePass = () => {
    goNextProfile();
  };

  const handleLike = async (photoSlot: number) => {
    if (!userId || !activeProfile) return;
    setIsSubmitting(true);
    setErrorMessage('');
    setMatchMessage('');

    try {
      const { error: likeError } = await supabase
        .from('profile_likes')
        .upsert(
          {
            liker_id: userId,
            liked_id: activeProfile.id,
            liked_photo_slot: photoSlot,
          },
          { onConflict: 'liker_id,liked_id' },
        );
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
  const detailRows = useMemo<DetailRowConfig[]>(() => {
    if (!activeProfile) return [];
    const rows: DetailRowConfig[] = [];

    if (activeProfile.show_occupation !== false && activeProfile.occupation?.trim()) {
      rows.push({ key: 'work', icon: 'briefcase-outline', value: activeProfile.occupation.trim() });
    }
    if (activeProfile.show_education !== false && activeProfile.education?.trim()) {
      rows.push({ key: 'school', icon: 'school-outline', value: activeProfile.education.trim() });
    }
    if (activeProfile.show_city !== false && activeProfile.city?.trim()) {
      rows.push({ key: 'city', icon: 'location-outline', value: activeProfile.city.trim() });
    }
    if (activeProfile.show_hometown !== false && activeProfile.hometown?.trim()) {
      rows.push({ key: 'hometown', icon: 'home-outline', value: activeProfile.hometown.trim() });
    }
    if (activeProfile.show_height !== false && activeProfile.height?.trim()) {
      rows.push({ key: 'height', icon: 'resize-outline', value: activeProfile.height.trim() });
    }

    return rows;
  }, [activeProfile]);

  /** Keep content clear of tab bar + floating pass button. */
  const floatingPassBottom = Math.max(insets.bottom, 16) + 72;
  const scrollBottomPadding = floatingPassBottom + 92;

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
            contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <View style={styles.photoBlock}>
                {heroPhotoUri ? (
                  <Image source={{ uri: heroPhotoUri }} style={styles.heroImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.heroImage, styles.heroPlaceholder]}>
                    <Ionicons name="person-outline" size={64} color={colors.mutedText} />
                  </View>
                )}
                <View style={styles.photoActionsOverlay}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.likeOverlayButton,
                      pressed && !isSubmitting && styles.likeButtonPressScale,
                      isSubmitting && styles.disabled,
                    ]}
                    onPress={() => void handleLike(1)}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel="Like photo 1">
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Ionicons name="heart-outline" size={28} color={colors.brandPink} />
                    )}
                  </Pressable>
                </View>
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.nameAge} numberOfLines={1}>
                  {displayName}, {ageLabel}
                </Text>
              </View>

              <View style={styles.detailsList}>
                {detailRows.map((row, index) => (
                  <View
                    key={row.key}
                    style={[styles.detailRow, index > 0 ? styles.detailRowBorder : null]}>
                    <Ionicons name={row.icon} size={20} color={colors.mutedText} style={styles.detailIcon} />
                    <Text style={styles.detailValue}>{row.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.morePhotosSection}>
                <View style={styles.morePhotosStack}>
                  {secondaryPhotoUrlsForCard.map((uri, i) => (
                    <View key={`slot-${i + 2}`} style={styles.morePhotoStackItem}>
                      {uri ? (
                        <Image source={{ uri }} style={styles.heroImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.heroImage, styles.heroPlaceholder]}>
                          <Ionicons name="image-outline" size={48} color={colors.mutedText} />
                        </View>
                      )}
                      <View style={styles.secondaryPhotoLikeWrap}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.likeOverlayButton,
                            pressed && !isSubmitting && styles.likeButtonPressScale,
                            isSubmitting && styles.disabled,
                          ]}
                          onPress={() => void handleLike(i + 2)}
                          disabled={isSubmitting}
                          accessibilityRole="button"
                          accessibilityLabel={`Like photo ${i + 2}`}>
                          {isSubmitting ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <Ionicons name="heart-outline" size={26} color={colors.brandPink} />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
          <View style={[styles.floatingPassWrap, { bottom: floatingPassBottom }]}>
            <Pressable
              style={({ pressed }) => [styles.passOverlayButton, pressed && styles.actionPressed]}
              onPress={handlePass}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Pass profile">
              <Ionicons name="close" size={28} color="#5C5C66" />
            </Pressable>
          </View>
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
  detailValue: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    color: colors.text,
  },
  morePhotosSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  morePhotosStack: {
    flexDirection: 'column',
    gap: 16,
  },
  morePhotoStackItem: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  photoActionsOverlay: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  floatingPassWrap: {
    position: 'absolute',
    left: 16,
  },
  passOverlayButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
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
  likeOverlayButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7E7ED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  secondaryPhotoLikeWrap: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  likeButtonPressScale: {
    transform: [{ scale: 0.94 }],
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
