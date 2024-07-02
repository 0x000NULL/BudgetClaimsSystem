module.exports = {
    testEnvironment: 'node', // Specifies the testing environment
    setupFilesAfterEnv: ['./jest.setup.js'], // Setup file to configure the testing environment
    moduleNameMapper: {
      '\\.(css|less)$': 'identity-obj-proxy' // Mocks CSS imports
    }
  };