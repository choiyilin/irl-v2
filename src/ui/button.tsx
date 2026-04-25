import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = Readonly<{
  label: string;
  onPress: PressableProps['onPress'];
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}>;

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
}: ButtonProps) => {
  styles.useVariants({ variant, disabled: disabled || loading });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={styles.button}
    >
      {loading ? <ActivityIndicator /> : <Text variant="body" style={styles.label}>{label}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create((theme) => ({
  button: {
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    variants: {
      variant: {
        primary: { backgroundColor: theme.colors.brand },
        secondary: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
        ghost: { backgroundColor: 'transparent' },
        danger: { backgroundColor: theme.colors.danger },
      },
      disabled: {
        true: { opacity: 0.5 },
        false: { opacity: 1 },
      },
    },
  },
  label: {
    fontWeight: '600',
    variants: {
      variant: {
        primary: { color: theme.colors.textOnBrand },
        secondary: { color: theme.colors.text },
        ghost: { color: theme.colors.brand },
        danger: { color: theme.colors.textOnBrand },
      },
      disabled: { true: {}, false: {} },
    },
  },
}));
