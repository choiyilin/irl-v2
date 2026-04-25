import { useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useRequireUserId } from '@/providers/session';
import { Button, Screen, Text } from '@/ui';
import { type RoomId } from '@/lib/brand';

import { useChatMessages, useSendMessage } from '../hooks';

export type ChatRoomScreenProps = Readonly<{
  roomId: RoomId;
  partnerName: string;
}>;

export const ChatRoomScreen = ({ roomId, partnerName }: ChatRoomScreenProps) => {
  const sender = useRequireUserId();
  const { data, fetchNextPage, hasNextPage, isLoading } = useChatMessages(roomId);
  const send = useSendMessage(roomId, sender);
  const [draft, setDraft] = useState('');

  const messages = (data?.pages ?? []).flatMap((p) => p.rows);

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Text variant="title">{partnerName}</Text>
      {isLoading ? (
        <Text>Loading…</Text>
      ) : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={(m) => m.id}
          onEndReached={() => {
            if (hasNextPage) {
              void fetchNextPage();
            }
          }}
          renderItem={({ item }) => (
            <View
              style={[styles.bubble, item.sender_id === sender ? styles.mine : styles.theirs]}
            >
              <Text>{item.body}</Text>
            </View>
          )}
        />
      )}
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Message"
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
          placeholder="Message…"
        />
        <Button
          label="Send"
          disabled={draft.trim().length === 0 || send.isPending}
          onPress={() => {
            const body = draft.trim();
            if (body.length === 0) {
              return;
            }
            setDraft('');
            send.mutate(body);
          }}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create((theme) => ({
  bubble: {
    padding: theme.space.md,
    marginVertical: theme.space.xs,
    borderRadius: theme.radius.lg,
    maxWidth: '80%',
  },
  mine: {
    backgroundColor: theme.colors.brand,
    alignSelf: 'flex-end',
  },
  theirs: {
    backgroundColor: theme.colors.surfaceMuted,
    alignSelf: 'flex-start',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.space.sm,
    gap: theme.space.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    color: theme.colors.text,
  },
}));
