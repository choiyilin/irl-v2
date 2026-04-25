import { router } from 'expo-router';
import { FlatList, Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useRequireUserId } from '@/providers/session';
import { Screen, Text } from '@/ui';
import { matchId, roomId } from '@/lib/brand';

import { useMatches, useOpenChatRoom } from '../hooks';

export const MatchesScreen = () => {
  const viewer = useRequireUserId();
  const { data, isLoading } = useMatches(viewer);
  const open = useOpenChatRoom();

  if (isLoading) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="heading">Matches</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            style={styles.row}
            onPress={async () => {
              const room = await open.mutateAsync(matchId(item.id));
              router.push({ pathname: '/chat/[roomId]', params: { roomId: roomId(room) } });
            }}
          >
            <Text variant="title">Match</Text>
            <Text muted variant="caption">
              {item.created_at}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create((theme) => ({
  row: {
    paddingVertical: theme.space.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
}));
