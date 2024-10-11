module.exports = {
    testEnvironment: 'node',
    setupFiles: ['dotenv/config'],
    setupFilesAfterEnv: ['./jest.setup.js'],
    coverageDirectory: 'coverage',
    testPathIgnorePatterns: ['/node_modules/', '/cypress/', '/.vs', '/.vscode'],
    coveragePathIgnorePatterns: ['/node_modules/', '/cypress/', '/.vs', '/.vscode'],
    verbose: true
  };
  