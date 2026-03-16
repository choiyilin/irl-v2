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

export default function MatchChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
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
    setMessages((data ?? []) as ChatMessage[]);
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

  useEffect(() => {
    if (!roomId) return;

    const timer = setInterval(() => {
      loadMessages().catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to sync messages.');
      });
    }, 2000);

    return () => {
      clearInterval(timer);
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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.push('/(tabs)/chat')}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Match Chat</Text>
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
  );
}

const styles = StyleSheet.create({
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
  title: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 24,
    fontWeight: '700',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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

