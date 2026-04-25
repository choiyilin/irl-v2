/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/', '/.maestro/'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|@react-navigation/.*|@unimodules/.*|sentry-expo|native-base|react-native-svg|react-native-unistyles|@supabase|posthog-react-native|lucide-react-native)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/test/**',
    '!src/**/index.ts',
    '!src/api/supabase/types.generated.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  coverageReporters: ['text-summary', 'lcov', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/.expo/'],
  testEnvironment: 'node',
};
