import { Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

import type { DiscoveryMapProps } from './types';

export function DiscoveryMap({ style }: DiscoveryMapProps): React.JSX.Element {
  return (
    <View
      style={[
        style,
        {
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 18,
          paddingVertical: 20,
          backgroundColor: colors.surface,
          gap: 4,
        },
      ]}>
      <Text
        style={{
          color: colors.text,
          fontFamily: typography.fontFamily,
          fontSize: 16,
          fontWeight: '700',
          textAlign: 'center',
        }}>
        Map preview is available on iOS/Android
      </Text>
      <Text
        style={{
          color: colors.mutedText,
          fontFamily: typography.fontFamily,
          fontSize: 14,
          textAlign: 'center',
        }}>
        You can still browse promotions below.
      </Text>
    </View>
  );
}
