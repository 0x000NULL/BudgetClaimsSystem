module.exports = {
    testEnvironment: 'node',
    setupFiles: ['dotenv/config'],
    setupFilesAfterEnv: ['./jest.setup.js'],
    globalSetup: './__tests__/setup.js',
    globalTeardown: './__tests__/teardown.js',
    coverageDirectory: 'coverage',
    testPathIgnorePatterns: ['/node_modules/', '/cypress/'],
    coveragePathIgnorePatterns: ['/node_modules/', '/cypress/'],
    verbose: true
  };
  