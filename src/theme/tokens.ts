import { StyleSheet } from 'react-native-unistyles';

const lightColors = {
  background: '#ffffff',
  surface: '#f7f7f7',
  surfaceMuted: '#eeeeee',
  text: '#0a0a0a',
  textMuted: '#666666',
  textOnBrand: '#ffffff',
  border: '#dddddd',
  brand: '#ff3a6e',
  brandMuted: '#ffd5e1',
  success: '#1aa260',
  danger: '#d92d20',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

const darkColors: typeof lightColors = {
  background: '#0a0a0a',
  surface: '#141414',
  surfaceMuted: '#1f1f1f',
  text: '#fafafa',
  textMuted: '#a0a0a0',
  textOnBrand: '#ffffff',
  border: '#2a2a2a',
  brand: '#ff5c89',
  brandMuted: '#3a1c25',
  success: '#34c77a',
  danger: '#f87171',
  overlay: 'rgba(0,0,0,0.7)',
};

const sharedTheme = {
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 },
  typography: {
    body: { fontSize: 15, lineHeight: 22 },
    title: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
    heading: { fontSize: 28, lineHeight: 32, fontWeight: '700' as const },
    caption: { fontSize: 13, lineHeight: 18 },
  },
} as const;

export const lightTheme = { colors: lightColors, ...sharedTheme } as const;
export const darkTheme = { colors: darkColors, ...sharedTheme } as const;

export type AppTheme = typeof lightTheme;

export const breakpoints = { xs: 0, sm: 360, md: 414, lg: 768 } as const;

type AppThemes = { light: AppTheme; dark: AppTheme };
type AppBreakpoints = typeof breakpoints;

declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesThemes extends AppThemes {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  themes: { light: lightTheme, dark: darkTheme },
  breakpoints,
  settings: { adaptiveThemes: true },
});
