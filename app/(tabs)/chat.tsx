import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

type ChatListItem = {
  chatId: string;
  partnerName: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Unable to load chats.';
}

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadChats = useCallback(async () => {
    if (!user) {
      setChats([]);
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
      if (!matchRows || matchRows.length === 0) {
        setChats([]);
        return;
      }

      const partnerIds = Array.from(
        new Set(
          matchRows.map((row) =>
            (row.user_a as string) === user.id ? (row.user_b as string) : (row.user_a as string),
          ),
        ),
      );
      if (partnerIds.length === 0) {
        setChats([]);
        return;
      }

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

      const items: ChatListItem[] = matchRows.map((row) => {
        const otherUserId =
          (row.user_a as string) === user.id ? (row.user_b as string) : (row.user_a as string);
        return {
          chatId: row.id as string,
          partnerName: profileById.get(otherUserId) ?? 'IRL User',
        };
      });

      const uniqueByChat = new Map<string, ChatListItem>();
      for (const item of items) {
        if (!uniqueByChat.has(item.chatId)) {
          uniqueByChat.set(item.chatId, item);
        }
      }

      setChats(Array.from(uniqueByChat.values()));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useFocusEffect(
    useCallback(() => {
      loadChats();
      return undefined;
    }, [loadChats]),
  );

  useEffect(() => {
    if (!user) return;

    const channelForUserA = supabase
      .channel(`matches-user-a-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `user_a=eq.${user.id}`,
        },
        () => {
          loadChats();
        },
      )
      .subscribe();

    const channelForUserB = supabase
      .channel(`matches-user-b-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `user_b=eq.${user.id}`,
        },
        () => {
          loadChats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelForUserA);
      supabase.removeChannel(channelForUserB);
    };
  }, [loadChats, user]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {chats.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No chats yet</Text>
          <Text style={styles.cardBody}>
            When two users like each other, a chat is created automatically and listed here.
          </Text>
          <Pressable style={styles.refreshButton} onPress={loadChats}>
            <Text style={styles.refreshButtonText}>Refresh chats</Text>
          </Pressable>
        </View>
      ) : (
        chats.map((chat) => (
          <Pressable
            key={chat.chatId}
            style={styles.card}
            onPress={() => router.push(`/chat/${chat.chatId}` as never)}>
            <Text style={styles.cardTitle}>{chat.partnerName}</Text>
            <Text style={styles.cardBody}>Match ID: {chat.chatId}</Text>
            <Text style={styles.openText}>Open chat</Text>
          </Pressable>
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
  openText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  refreshButton: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 42,
  },
  refreshButtonText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
  },
});

