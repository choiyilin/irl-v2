import { Link } from 'expo-router';

import { Screen, Text } from '@/ui';

export default function NotFound() {
  return (
    <Screen>
      <Text variant="heading">Not found</Text>
      <Link href="/">
        <Text>Go home</Text>
      </Link>
    </Screen>
  );
}
