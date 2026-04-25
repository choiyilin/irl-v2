// Global Jest setup. Currently kept lean — RNTL auto-imports its matchers when used.
// Silence Reanimated logs in tests (dev-only).
jest.mock('react-native-reanimated', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-reanimated/mock'),
);
