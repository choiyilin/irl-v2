import { PropsWithChildren } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '@/src/theme/colors';

const MAX_PHONE_WIDTH = 430;

export function AppViewport({ children }: PropsWithChildren) {
  const { width, height } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return <View style={styles.nativeContainer}>{children}</View>;
  }

  const frameWidth = Math.min(width, (height * 9) / 16, MAX_PHONE_WIDTH);
  const frameHeight = frameWidth * (16 / 9);

  return (
    <View style={styles.webOuter}>
      <View style={[styles.webInner, { width: frameWidth, height: frameHeight }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
  },
  webOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: 12,
  },
  webInner: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
});

