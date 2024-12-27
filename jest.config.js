module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 30000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    '^cache-manager-redis-store$': '<rootDir>/__mocks__/cache-manager-redis-store.js',
    '^cache-manager$': '<rootDir>/__mocks__/cache-manager.js'
  }
};
  