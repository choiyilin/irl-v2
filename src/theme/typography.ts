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

/** Loaded via root layout — Playfair Display italic (regular weight) */
export const playfairCaption = 'PlayfairDisplay_400Regular_Italic';

/** Playfair Display bold italic — titles / segment labels on Messages tab */
export const playfairCaptionBold = 'PlayfairDisplay_700Bold_Italic';

