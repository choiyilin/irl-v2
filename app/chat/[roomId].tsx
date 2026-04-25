import { useLocalSearchParams } from 'expo-router';

import { ChatRoomScreen } from '@/features/chat';
import { roomId as toRoomId } from '@/lib/brand';
import { Screen, Text } from '@/ui';

export default function ChatRoomRoute() {
  const params = useLocalSearchParams<{ roomId: string }>();
  if (params.roomId === undefined) {
    return (
      <Screen>
        <Text>Missing room.</Text>
      </Screen>
    );
  }
  // Partner name resolution lives in features/matches; pass placeholder until that hook is wired.
  return <ChatRoomScreen roomId={toRoomId(params.roomId)} partnerName="Match" />;
}
