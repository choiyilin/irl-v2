import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

type MatchListItem = {
  partnerId: string;
  displayName: string;
  age: number | null;
  avatarUrl: string | null;
};

const TAB_BAR_OFFSET = 96;

export default function MatchesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MatchListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMatches = useCallback(async () => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data: matchRows, error: matchError } = await supabase
        .from('matches')
        .select('id, user_a, user_b')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      if (matchError) throw matchError;

      if (!matchRows?.length) {
        setItems([]);
        return;
      }

      const partnerIds = Array.from(
        new Set(
          matchRows.map((row) =>
            (row.user_a as string) === user.id ? (row.user_b as string) : (row.user_a as string),
          ),
        ),
      );

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, age')
        .in('id', partnerIds);
      if (profilesError) throw profilesError;

      const { data: photoRows, error: photosError } = await supabase
        .from('profile_photos')
        .select('user_id, slot_index, storage_path')
        .in('user_id', partnerIds)
        .order('slot_index', { ascending: true });
      if (photosError) throw photosError;

      const pathByUser: Record<string, string> = {};
      for (const row of photoRows ?? []) {
        const uid = row.user_id as string;
        if (!pathByUser[uid]) pathByUser[uid] = row.storage_path as string;
      }

      const urlByUser: Record<string, string> = {};
      await Promise.all(
        partnerIds.map(async (pid) => {
          const path = pathByUser[pid];
          if (!path) return;
          const { data: signed, error: signErr } = await supabase.storage
            .from('profile-photos')
            .createSignedUrl(path, 60 * 60);
          if (!signErr && signed?.signedUrl) urlByUser[pid] = signed.signedUrl;
        }),
      );

      const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

      const next: MatchListItem[] = partnerIds.map((partnerId) => {
        const p = profileById.get(partnerId);
        return {
          partnerId,
          displayName: (p?.display_name as string)?.trim() || 'Member',
          age: (p?.age as number | null) ?? null,
          avatarUrl: urlByUser[partnerId] ?? null,
        };
      });

      setItems(next);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Unable to load matches.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadMatches();
    }, [loadMatches]),
  );

  if (isLoading) {
    return (
      <View style={[styles.center, styles.screen]}>
        <ActivityIndicator color={colors.brandPink} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.partnerId}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + TAB_BAR_OFFSET },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={48} color={colors.mutedText} />
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyBody}>
              When you and someone else like each other, they will show up here. Keep exploring!
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push(`/(tabs)/matches/${item.partnerId}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.displayName}'s profile`}>
            <View style={styles.avatarWrap}>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person-outline" size={28} color={colors.mutedText} />
                </View>
              )}
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.displayName}
                {item.age != null ? `, ${item.age}` : ''}
              </Text>
              <Text style={styles.rowHint}>View profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
          </Pressable>
        )}
      />
    </View>
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexGrow: 1,
  },
  error: {
    marginHorizontal: 16,
    marginTop: 8,
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.92,
  },
  avatarWrap: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  rowHint: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: colors.mutedText,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  emptyBody: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});
