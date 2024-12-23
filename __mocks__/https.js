module.exports = {
    createServer: jest.fn((options, app) => ({
        listen: jest.fn((port, callback) => callback())
    }))
}; 