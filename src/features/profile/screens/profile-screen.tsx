import { useRequireUserId } from '@/providers/session';
import { Screen, Text } from '@/ui';

import { useProfile } from '../hooks';

export const ProfileScreen = () => {
  const userId = useRequireUserId();
  const { data, isLoading, isError } = useProfile(userId);

  if (isLoading) {
    return (
      <Screen>
        <Text>Loading…</Text>
      </Screen>
    );
  }
  if (isError || data === undefined) {
    return (
      <Screen>
        <Text>Could not load your profile.</Text>
      </Screen>
    );
  }
  return (
    <Screen>
      <Text variant="heading">{data.display_name}</Text>
      {data.age !== null && (
        <Text variant="title" muted>
          {String(data.age)}
        </Text>
      )}
      {data.bio !== null && <Text>{data.bio}</Text>}
    </Screen>
  );
};
