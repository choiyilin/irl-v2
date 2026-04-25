/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'pnpm',
  reporters: ['progress', 'clear-text', 'html'],
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
    enableFindRelatedTests: true,
  },
  coverageAnalysis: 'perTest',
  mutate: ['src/features/**/hooks/**/*.ts', 'src/lib/**/*.ts', '!src/**/*.test.ts'],
  thresholds: { high: 95, low: 85, break: 85 },
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  timeoutMS: 60_000,
};
