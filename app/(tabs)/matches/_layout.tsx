import { Stack } from 'expo-router';

import { IrlExploreMatchingHeaderWithBack } from '@/src/components/IrlMark';
import { colors } from '@/src/theme/colors';

export default function MatchesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: colors.exploreCanvas,
          paddingHorizontal: 0,
        },
        contentStyle: { backgroundColor: colors.exploreCanvas },
      }}>
      <Stack.Screen
        name="index"
        options={{
          header: (props) => (
            <IrlExploreMatchingHeaderWithBack
              safeTopFromNav={props.insets?.top}
              backBehavior="explore"
            />
          ),
        }}
      />
      <Stack.Screen
        name="[userId]"
        options={{
          header: (props) => (
            <IrlExploreMatchingHeaderWithBack safeTopFromNav={props.insets?.top} />
          ),
        }}
      />
    </Stack>
  );
}
