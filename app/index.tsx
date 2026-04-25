import { Redirect } from 'expo-router';

import { useSession } from '@/providers/session';
import { Screen, Text } from '@/ui';

export default function Index() {
  const session = useSession();
  if (session.status === 'loading') {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }
  if (session.status === 'unauthenticated') {
    return <Redirect href="/(auth)/sign-in" />;
  }
  return <Redirect href="/(tabs)/explore" />;
}
