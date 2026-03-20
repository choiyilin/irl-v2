import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function areMessagesEqual(current: ChatMessage[], next: ChatMessage[]) {
  if (current.length !== next.length) {
    return false;
  }

  return current.every((message, index) => {
    const candidate = next[index];
    return (
      message.id === candidate.id &&
      message.sender_id === candidate.sender_id &&
      message.body === candidate.body &&
      message.created_at === candidate.created_at
    );
  });
}

export default function MatchChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const matchId = useMemo(
    () => (Array.isArray(params.matchId) ? params.matchId[0] : params.matchId),
    [params.matchId],
  );

  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMessages = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, sender_id, body, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const nextMessages = (data ?? []) as ChatMessage[];
    setMessages((currentMessages) =>
      areMessagesEqual(currentMessages, nextMessages) ? currentMessages : nextMessages,
    );
  }, [roomId]);

  useEffect(() => {
    const init = async () => {
      if (!user || !matchId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const { data, error } = await supabase.rpc('get_or_create_match_chat', {
          p_match_id: matchId,
        });
        if (error) throw error;
        if (!data) throw new Error('Unable to create chat room.');
        setRoomId(data as string);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to open chat.');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [matchId, user]);

  useEffect(() => {
    loadMessages().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load messages.');
    });
  }, [loadMessages]);

  useEffect(() => {
    if (!roomId) return;

    const messageChannel = supabase
      .channel(`chat-messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          loadMessages().catch((error) => {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to sync messages.');
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [loadMessages, roomId]);

  const sendMessage = async () => {
    if (!roomId || !user || !draft.trim()) return;

    setIsSending(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        body: draft.trim(),
      });
      if (error) throw error;

      setDraft('');
      await loadMessages();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send message.');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        style={styles.container}>
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <Pressable
              style={({ pressed }) => [styles.backPill, pressed && styles.backPillPressed]}
              onPress={() => router.push('/(tabs)/chat')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Back to messages">
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.title} numberOfLines={1}>
              Match Chat
            </Text>
            <View style={styles.headerTitleSpacer} />
          </View>
          <View style={styles.headerDivider} />
        </View>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const mine = item.sender_id === user?.id;
            return (
              <View style={[styles.messageBubble, mine ? styles.mine : styles.theirs]}>
                <Text style={styles.messageText}>{item.body}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Say hi.</Text>}
        />
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Type a message"
            placeholderTextColor={colors.mutedText}
            value={draft}
            onChangeText={setDraft}
            style={styles.input}
          />
          <Pressable style={[styles.sendButton, isSending && styles.disabled]} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>{isSending ? '...' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    gap: 10,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: {
    marginBottom: 4,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  backPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  backPillPressed: {
    opacity: 0.72,
    backgroundColor: 'rgba(0, 0, 0, 0.09)',
  },
  headerTitleSpacer: {
    width: 44,
    height: 44,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerDivider: {
    marginTop: 12,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    opacity: 0.85,
  },
  errorText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 13,
  },
  listContent: {
    gap: 8,
    paddingVertical: 8,
  },
  messageBubble: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surface,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
  },
  messageText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  emptyText: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    minHeight: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButtonText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});

