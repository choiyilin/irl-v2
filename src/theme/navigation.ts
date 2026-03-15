import { DefaultTheme, Theme } from '@react-navigation/native';

import { colors } from '@/src/theme/colors';

export const irlNavigationTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.text,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.surface,
  },
};

