import { Image } from 'expo-image';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { type SignedUrl } from '@/lib/brand';

import { Text } from './text';

export type AvatarSize = 'sm' | 'md' | 'lg';

export type AvatarProps = Readonly<{
  url: SignedUrl | null;
  fallbackInitial: string;
  size?: AvatarSize;
}>;

export const Avatar = ({ url, fallbackInitial, size = 'md' }: AvatarProps) => {
  styles.useVariants({ size });
  if (url === null) {
    return (
      <View style={styles.placeholder}>
        <Text variant="title" style={styles.initial}>{fallbackInitial.toUpperCase()}</Text>
      </View>
    );
  }
  return <Image source={url} style={styles.image} contentFit="cover" />;
};

const styles = StyleSheet.create((theme) => ({
  image: {
    backgroundColor: theme.colors.surfaceMuted,
    variants: {
      size: {
        sm: { width: 36, height: 36, borderRadius: theme.radius.pill },
        md: { width: 56, height: 56, borderRadius: theme.radius.pill },
        lg: { width: 96, height: 96, borderRadius: theme.radius.pill },
      },
    },
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brandMuted,
    variants: {
      size: {
        sm: { width: 36, height: 36, borderRadius: theme.radius.pill },
        md: { width: 56, height: 56, borderRadius: theme.radius.pill },
        lg: { width: 96, height: 96, borderRadius: theme.radius.pill },
      },
    },
  },
  initial: { color: theme.colors.brand },
}));
