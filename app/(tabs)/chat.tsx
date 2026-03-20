import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';
import { playfairCaptionBold, typography } from '@/src/theme/typography';

type ChatListItem = {
  matchId: string;
  partnerName: string;
  avatarUrl: string | null;
  lastMessage: string;
  relativeTime: string;
  hasUnreadIndicator: boolean;
  lastMessageAt: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Unable to load chats.';
}

function ChatListSeparator() {
  return (
    <View style={styles.separatorWrap}>
      <View style={styles.separatorHair} />
      <View style={styles.separatorJewel} />
      <View style={styles.separatorHair} />
    </View>
  );
}

function formatRelativeTime(isoTime: string | null): string {
  if (!isoTime) return '';
  const now = Date.now();
  const then = new Date(isoTime).getTime();
  const diffMs = Math.max(0, now - then);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
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
      const matchIds = matchRows.map((row) => row.id as string);
      if (partnerIds.length === 0) {
        setChats([]);
        return;
      }

      const { data: partnerProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', partnerIds);
      if (profilesError) throw profilesError;

      const { data: profilePhotoRows, error: profilePhotosError } = await supabase
        .from('profile_photos')
        .select('user_id, slot_index, storage_path')
        .in('user_id', partnerIds)
        .order('slot_index', { ascending: true });
      if (profilePhotosError) throw profilePhotosError;

      const { data: roomRows, error: roomError } = await supabase
        .from('chat_rooms')
        .select('id, match_id')
        .in('match_id', matchIds);
      if (roomError) throw roomError;

      const roomIds = (roomRows ?? []).map((room) => room.id as string);
      const roomByMatchId = new Map((roomRows ?? []).map((room) => [room.match_id as string, room.id as string]));

      const latestMessageByRoomId = new Map<
        string,
        { body: string; created_at: string | null; sender_id: string | null }
      >();
      if (roomIds.length > 0) {
        const { data: messageRows, error: messagesError } = await supabase
          .from('chat_messages')
          .select('room_id, body, created_at, sender_id')
          .in('room_id', roomIds)
          .order('created_at', { ascending: false });
        if (messagesError) throw messagesError;

        for (const row of messageRows ?? []) {
          const roomId = row.room_id as string;
          if (!latestMessageByRoomId.has(roomId)) {
            latestMessageByRoomId.set(roomId, {
              body: (row.body as string) ?? '',
              created_at: (row.created_at as string | null) ?? null,
              sender_id: (row.sender_id as string | null) ?? null,
            });
          }
        }
      }

      const profileById = new Map(
        (partnerProfiles ?? []).map((profile) => [
          profile.id as string,
          (profile.display_name as string | null) ?? 'IRL User',
        ]),
      );

      const firstPhotoPathByUserId = new Map<string, string>();
      for (const row of profilePhotoRows ?? []) {
        const userId = row.user_id as string;
        if (!firstPhotoPathByUserId.has(userId)) {
          firstPhotoPathByUserId.set(userId, row.storage_path as string);
        }
      }

      const avatarUrlByUserId = new Map<string, string>();
      await Promise.all(
        Array.from(firstPhotoPathByUserId.entries()).map(async ([partnerId, storagePath]) => {
          const { data, error } = await supabase.storage
            .from('profile-photos')
            .createSignedUrl(storagePath, 60 * 60);
          if (!error && data?.signedUrl) {
            avatarUrlByUserId.set(partnerId, data.signedUrl);
          }
        }),
      );

      const items: ChatListItem[] = matchRows.map((row) => {
        const otherUserId =
          (row.user_a as string) === user.id ? (row.user_b as string) : (row.user_a as string);
        const matchId = row.id as string;
        const roomId = roomByMatchId.get(matchId) ?? null;
        const latestMessage = roomId ? latestMessageByRoomId.get(roomId) : undefined;
        const previewBody = latestMessage?.body?.trim();
        const sentByMe = latestMessage?.sender_id === user.id;
        const lastMessageText = previewBody
          ? `${sentByMe ? 'You: ' : ''}${previewBody}`
          : 'Say hi and start the conversation.';

        return {
          matchId,
          partnerName: profileById.get(otherUserId) ?? 'IRL User',
          avatarUrl: avatarUrlByUserId.get(otherUserId) ?? null,
          lastMessage: lastMessageText,
          relativeTime: formatRelativeTime(latestMessage?.created_at ?? null),
          hasUnreadIndicator: Boolean(latestMessage),
          lastMessageAt: latestMessage?.created_at ?? null,
        };
      });

      const uniqueByChat = new Map<string, ChatListItem>();
      for (const item of items) {
        if (!uniqueByChat.has(item.matchId)) {
          uniqueByChat.set(item.matchId, item);
        }
      }

      setChats(
        Array.from(uniqueByChat.values()).sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bTime - aTime;
        }),
      );
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

    const messagesChannel = supabase
      .channel(`chat-messages-any-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          loadChats();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelForUserA);
      supabase.removeChannel(channelForUserB);
      supabase.removeChannel(messagesChannel);
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
      <Text style={styles.title}>Messages</Text>
      <View style={styles.segmentedRow}>
        <View style={[styles.segmentPill, styles.segmentPillActive]}>
          <Text style={[styles.segmentText, styles.segmentTextActive]}>Matches</Text>
        </View>
        <View style={styles.segmentPill}>
          <Text style={styles.segmentText}>Connections</Text>
        </View>
      </View>
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
        <FlatList
          data={chats}
          keyExtractor={(item) => item.matchId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={styles.chatRow}
              onPress={() => router.push(`/chat/${item.matchId}` as never)}>
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarFallbackText}>
                    {(item.partnerName[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.chatBody}>
                <Text style={styles.chatName} numberOfLines={1}>
                  {item.partnerName}
                </Text>
                <Text style={styles.chatPreview} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>
              <View style={styles.chatMeta}>
                {item.relativeTime ? <Text style={styles.chatTime}>{item.relativeTime}</Text> : null}
                {item.hasUnreadIndicator ? <View style={styles.unreadDot} /> : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    gap: 14,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontFamily: playfairCaptionBold,
    fontSize: 38,
    fontWeight: '400',
    lineHeight: 46,
    marginTop: 2,
  },
  segmentedRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  segmentPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 11,
  },
  segmentPillActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  segmentText: {
    color: colors.tabInactive,
    fontFamily: playfairCaptionBold,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  segmentTextActive: {
    color: colors.text,
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
  listContent: {
    paddingBottom: 100,
  },
  separatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    paddingHorizontal: 2,
  },
  separatorHair: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  separatorJewel: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: colors.brandPink,
    transform: [{ rotate: '45deg' }],
    opacity: 0.85,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  avatarFallback: {
    backgroundColor: '#F4D3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 17,
    fontWeight: '700',
  },
  chatBody: {
    flex: 1,
    gap: 4,
  },
  chatName: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  chatPreview: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  chatMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    minWidth: 52,
  },
  chatTime: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F2A7C0',
  },
  errorText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 13,
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

