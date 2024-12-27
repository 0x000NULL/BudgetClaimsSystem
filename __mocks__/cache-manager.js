module.exports = {
    caching: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(true),
        del: jest.fn().mockResolvedValue(true),
        store: {
            name: 'memory'
        }
    })
}; 