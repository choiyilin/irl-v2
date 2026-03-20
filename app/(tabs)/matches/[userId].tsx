import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

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

const TAB_BAR_OFFSET = 96;

export default function MatchProfileScreen() {
  const params = useLocalSearchParams<{ userId: string | string[] }>();
  const partnerId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = user?.id;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!me || !partnerId || partnerId === me) {
      setErrorMessage('Invalid profile.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data: matchRows, error: matchError } = await supabase
        .from('matches')
        .select('user_a, user_b')
        .or(`user_a.eq.${me},user_b.eq.${me}`);
      if (matchError) throw matchError;

      const hasMatch = (matchRows ?? []).some(
        (row) =>
          (row.user_a === me && row.user_b === partnerId) ||
          (row.user_a === partnerId && row.user_b === me),
      );

      if (!hasMatch) {
        setErrorMessage('You can only view profiles of people you have matched with.');
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, age, bio, city')
        .eq('id', partnerId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) {
        setErrorMessage('Profile not found.');
        setIsLoading(false);
        return;
      }

      setDisplayName((profile.display_name as string)?.trim() || 'Member');
      setAge((profile.age as number | null) ?? null);
      setBio((profile.bio as string | null) ?? null);
      setCity((profile.city as string | null) ?? null);

      const { data: photoRows, error: photoError } = await supabase
        .from('profile_photos')
        .select('storage_path, slot_index')
        .eq('user_id', partnerId)
        .order('slot_index', { ascending: true })
        .limit(1);
      if (photoError) throw photoError;

      const path = photoRows?.[0]?.storage_path as string | undefined;
      if (path) {
        const { data: signed, error: signErr } = await supabase.storage
          .from('profile-photos')
          .createSignedUrl(path, 60 * 60);
        if (!signErr && signed?.signedUrl) setPhotoUrl(signed.signedUrl);
        else setPhotoUrl(null);
      } else {
        setPhotoUrl(null);
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Unable to load profile.');
    } finally {
      setIsLoading(false);
    }
  }, [me, partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <View style={[styles.center, styles.screen]}>
        <ActivityIndicator color={colors.brandPink} size="large" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={[styles.screen, styles.center, styles.padded]}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Text style={styles.backLink} onPress={() => router.back()}>
          Go back
        </Text>
      </View>
    );
  }

  const ageLabel = age != null ? `${age}` : '—';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(insets.bottom, 16) + TAB_BAR_OFFSET },
      ]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.photoBlock}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="person-outline" size={64} color={colors.mutedText} />
            </View>
          )}
        </View>

        <Text style={styles.nameAge} numberOfLines={2}>
          {displayName}, {ageLabel}
        </Text>

        {(city || bio) && (
          <View style={styles.metaBlock}>
            {city ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={colors.mutedText} />
                <Text style={styles.metaLine}>{city}</Text>
              </View>
            ) : null}
            {bio ? <Text style={styles.bio}>{bio}</Text> : null}
          </View>
        )}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.exploreCanvas,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  padded: {
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  nameAge: {
    fontFamily: typography.fontFamily,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  metaBlock: {
    marginBottom: 12,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLine: {
    flex: 1,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    color: colors.mutedText,
  },
  bio: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
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
  errorText: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  backLink: {
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: colors.brandPink,
  },
});
