export const features = {
  pushNotifications: true,
  chatTypingIndicators: true,
  chatReadReceipts: true,
  multiCity: false,
  geolocation: false,
  blockReportUnmatch: false,
  appleSignIn: false,
  phoneOtp: false,
  photoVerification: false,
  discoverySearchAndFilter: false,
} as const;

export type FeatureFlag = keyof typeof features;
