import { Platform } from 'react-native';

// Uses Neue Haas on devices where it exists; falls back safely elsewhere.
export const typography = {
  fontFamily:
    Platform.select({
      ios: 'Neue Haas Grotesk Text Pro',
      android: 'sans-serif',
      default: 'system-ui',
    }) ?? 'System',
};

