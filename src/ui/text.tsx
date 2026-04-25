import { type ReactNode } from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export type TextVariant = 'body' | 'title' | 'heading' | 'caption';

export type AppTextProps = TextProps &
  Readonly<{
    variant?: TextVariant;
    muted?: boolean;
    children: ReactNode;
  }>;

export const Text = ({ variant = 'body', muted = false, children, style, ...rest }: AppTextProps) => {
  styles.useVariants({ variant, muted });
  return (
    <RNText {...rest} style={[styles.text, style]}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create((theme) => ({
  text: {
    color: theme.colors.text,
    variants: {
      variant: {
        body: theme.typography.body,
        title: theme.typography.title,
        heading: theme.typography.heading,
        caption: theme.typography.caption,
      },
      muted: {
        true: { color: theme.colors.textMuted },
        false: {},
      },
    },
  },
}));
