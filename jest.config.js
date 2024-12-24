module.exports = {
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'setupServer.js',
    'routes/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/__fixtures__/**'
  ],
  forceExit: true,
  testTimeout: 10000
};
  