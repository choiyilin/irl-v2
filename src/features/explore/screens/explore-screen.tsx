import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useRequireUserId } from '@/providers/session';
import { Screen, Text } from '@/ui';
import { userId } from '@/lib/brand';

import { useExploreFeed, useLike } from '../hooks';

export const ExploreScreen = () => {
  const viewerId = useRequireUserId();
  const { data, fetchNextPage, hasNextPage, isLoading } = useExploreFeed(viewerId, []);
  const like = useLike(viewerId, []);

  if (isLoading) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }
  const all = (data?.pages ?? []).flatMap((p) => p.rows);
  const top = all[0];
  if (top === undefined) {
    if (hasNextPage) {
      void fetchNextPage();
    }
    return (
      <Screen>
        <Text>No more profiles right now. Check back later!</Text>
      </Screen>
    );
  }
  return (
    <Screen>
      <View style={styles.card}>
        <Text variant="heading">{top.display_name}</Text>
        {top.age !== null && (
          <Text variant="title" muted>
            {String(top.age)}
          </Text>
        )}
        {top.bio !== null && <Text>{top.bio}</Text>}
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pass"
          style={styles.pass}
          onPress={() => like.mutate({ likedId: userId(top.id) })}
        >
          <Text>Pass</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Like"
          style={styles.like}
          onPress={() => like.mutate({ likedId: userId(top.id) })}
        >
          <Text style={styles.likeLabel}>Like</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create((theme) => ({
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.space.xl,
    marginVertical: theme.space.lg,
  },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: theme.space.lg },
  pass: {
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  like: {
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.brand,
  },
  likeLabel: { color: theme.colors.textOnBrand, fontWeight: '600' },
}));
