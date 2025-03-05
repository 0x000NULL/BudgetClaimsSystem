/**
 * @fileoverview Jest configuration for testing Budget Claims System
 */

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  verbose: true,
  testTimeout: 10000,
  moduleFileExtensions: ['js', 'json'],
  restoreMocks: true,
  clearMocks: true,
  resetMocks: true,
  forceExit: true
};
  