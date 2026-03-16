import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

type ChatListItem = {
  roomId: string;
  partnerName: string;
};

export default function ChatScreen() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadChats = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data: myMemberships, error: membershipError } = await supabase
        .from('chat_room_members')
        .select('room_id')
        .eq('user_id', user.id);
      if (membershipError) throw membershipError;

      const roomIds = (myMemberships ?? []).map((row) => row.room_id as string);
      if (roomIds.length === 0) {
        setChats([]);
        return;
      }

      const { data: otherMembers, error: otherMembersError } = await supabase
        .from('chat_room_members')
        .select('room_id, user_id')
        .in('room_id', roomIds)
        .neq('user_id', user.id);
      if (otherMembersError) throw otherMembersError;

      const partnerIds = Array.from(new Set((otherMembers ?? []).map((row) => row.user_id as string)));
      const { data: partnerProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', partnerIds);
      if (profilesError) throw profilesError;

      const profileById = new Map(
        (partnerProfiles ?? []).map((profile) => [
          profile.id as string,
          (profile.display_name as string | null) ?? 'IRL User',
        ]),
      );

      const items: ChatListItem[] = (otherMembers ?? []).map((member) => ({
        roomId: member.room_id as string,
        partnerName: profileById.get(member.user_id as string) ?? 'IRL User',
      }));

      setChats(items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load chats.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Chat</Text>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {chats.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No chats yet</Text>
          <Text style={styles.cardBody}>
            When two users like each other, a chat is created automatically and listed here.
          </Text>
        </View>
      ) : (
        chats.map((chat) => (
          <View key={chat.roomId} style={styles.card}>
            <Text style={styles.cardTitle}>{chat.partnerName}</Text>
            <Text style={styles.cardBody}>Room ID: {chat.roomId}</Text>
          </View>
        ))
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
  errorText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 13,
  },
});

