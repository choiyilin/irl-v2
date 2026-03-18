import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

type ProfilePhotoRow = {
  slot_index: number;
  storage_path: string;
};

const PROFILE_PHOTOS_BUCKET = 'profile-photos';

export default function ExploreScreen() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ExploreProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activePhotoUrls, setActivePhotoUrls] = useState<string[]>([]);
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

  useEffect(() => {
    const loadActiveProfilePhotos = async () => {
      if (!activeProfile?.id) {
        setActivePhotoUrls([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profile_photos')
          .select('slot_index, storage_path')
          .eq('user_id', activeProfile.id)
          .order('slot_index', { ascending: true });
        if (error) throw error;

        const signedUrls = await Promise.all(
          ((data ?? []) as ProfilePhotoRow[]).map(async (photo) => {
            const { data: signedData, error: signedError } = await supabase.storage
              .from(PROFILE_PHOTOS_BUCKET)
              .createSignedUrl(photo.storage_path, 60 * 60);

            if (signedError || !signedData?.signedUrl) {
              return null;
            }

            return signedData.signedUrl;
          }),
        );

        setActivePhotoUrls(signedUrls.filter((url): url is string => Boolean(url)));
      } catch {
        setActivePhotoUrls([]);
      }
    };

    loadActiveProfilePhotos();
  }, [activeProfile?.id]);

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

        const { data: matchRow, error: matchError } = await supabase
          .from('matches')
          .upsert({ user_a: userA, user_b: userB }, { onConflict: 'user_a,user_b' })
          .select('id')
          .single();
        if (matchError) throw matchError;
        if (!matchRow?.id) throw new Error('Unable to create or find match.');

        setMatchMessage(
          `It's a match with ${activeProfile.display_name ?? 'this user'}! See them in Chats.`,
        );
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

  const mainPhotoUrl = activePhotoUrls[0] ?? null;
  const additionalPhotoUrls = activePhotoUrls.slice(1);

  return (
    <View style={styles.container}>
      {matchMessage ? <Text style={styles.matchBanner}>{matchMessage}</Text> : null}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {activeProfile ? (
        <>
          <View style={styles.mainPhotoCard}>
            {mainPhotoUrl ? (
              <Image source={{ uri: mainPhotoUrl }} style={styles.mainPhoto} />
            ) : (
              <View style={[styles.mainPhoto, styles.photoPlaceholder]}>
                <Text style={styles.photoPlaceholderText}>No profile photo yet</Text>
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.profileName}>
              {activeProfile.display_name ?? 'Unnamed profile'}
              {activeProfile.age ? `, ${activeProfile.age}` : ''}
            </Text>
            {activeProfile.city ? <Text style={styles.profileMeta}>Location: {activeProfile.city}</Text> : null}
            {activeProfile.bio ? <Text style={styles.profileBio}>{activeProfile.bio}</Text> : null}
          </View>

          <View style={styles.gallerySection}>
            <Text style={styles.galleryTitle}>More photos</Text>
            {additionalPhotoUrls.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryRow}>
                {additionalPhotoUrls.map((photoUrl, index) => (
                  <Image
                    key={`${photoUrl}-${index}`}
                    source={{ uri: photoUrl }}
                    style={styles.galleryPhoto}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.galleryEmpty}>No additional photos yet.</Text>
            )}
          </View>

          <View style={styles.actionRow}>
            <Pressable style={[styles.actionButton, styles.passButton]} onPress={handlePass} disabled={isSubmitting}>
              <Text style={styles.actionText}>Skip</Text>
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
        <View style={styles.infoCard}>
          <Text style={styles.profileName}>No more profiles right now</Text>
          <Text style={styles.profileBio}>
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
  mainPhotoCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F6F6F6',
  },
  mainPhoto: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  profileName: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 32,
    fontWeight: '700',
  },
  profileMeta: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 18,
  },
  profileBio: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    lineHeight: 22,
  },
  gallerySection: {
    gap: 8,
  },
  galleryTitle: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: '700',
  },
  galleryRow: {
    gap: 10,
  },
  galleryPhoto: {
    width: 110,
    height: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  galleryEmpty: {
    color: colors.mutedText,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
  },
  passButton: {
    backgroundColor: '#FFFFFF',
  },
  likeButton: {
    backgroundColor: '#F4D3E0',
  },
  actionText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: '700',
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

